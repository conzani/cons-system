import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { error, json, redirect, type Handle } from '@sveltejs/kit';
import { getUserById } from '$lib/auth';
import { clearSessionCookie, SESSION_COOKIE, verifySessionToken } from '$lib/server/session';
import { requiredPermissionForApi, requiredPermissionForPage } from '$lib/server/access';

const PUBLIC_PATHS = new Set(['/login', '/favicon.ico', '/robots.txt']);
const ASSET_EXTENSION = /\.(?:[a-z0-9]{2,8})$/i;

function isStaticAsset(pathname: string): boolean {
	return (
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/static/') ||
		ASSET_EXTENSION.test(pathname)
	);
}

function isSameOrigin(request: Request, url: URL): boolean {
	const origin = request.headers.get('origin');
	// Requests without an Origin header (server-to-server, curl) are allowed;
	// browsers always send it for state-changing requests.
	if (!origin) return true;
	try {
		return new URL(origin).host === url.host;
	} catch {
		return false;
	}
}

const authenticate: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const userId = verifySessionToken(token);
		if (userId) {
			const user = await getUserById(userId);
			if (user) {
				event.locals.user = user;
			} else {
				// Account deleted, disabled, or no longer exists.
				clearSessionCookie(event.cookies);
			}
		} else {
			// Tampered, legacy, or expired cookie.
			clearSessionCookie(event.cookies);
		}
	}

	const { pathname } = event.url;
	const method = event.request.method;

	if (pathname.startsWith('/api/')) {
		// Every API call requires a valid session.
		if (!event.locals.user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		if (method !== 'GET' && method !== 'HEAD' && !isSameOrigin(event.request, event.url)) {
			return json({ error: 'Cross-origin request blocked' }, { status: 403 });
		}

		const permission = requiredPermissionForApi(pathname, method);
		if (permission && !event.locals.user.permissions.includes(permission)) {
			return json({ error: `Missing permission: ${permission}` }, { status: 403 });
		}
	} else if (!isStaticAsset(pathname)) {
		if (pathname === '/login' && event.locals.user) {
			redirect(303, '/dashboard');
		}

		if (!event.locals.user && !PUBLIC_PATHS.has(pathname)) {
			const target = pathname + event.url.search;
			redirect(303, `/login?redirectTo=${encodeURIComponent(target)}`);
		}

		if (event.locals.user) {
			const permission = requiredPermissionForPage(pathname);
			if (permission && !event.locals.user.permissions.includes(permission)) {
				error(403, `You do not have permission to view this page (${permission}).`);
			}
		}
	}

	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

	if (process.env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};

export const handle: Handle = sequence(Sentry.sentryHandle(), authenticate);
export const handleError = Sentry.handleErrorWithSentry();

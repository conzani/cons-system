import { getUserById } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = event.cookies.get('session');

	if (session) {
		try {
			const userId = parseInt(session);
			if (!isNaN(userId)) {
				const user = await getUserById(userId);
				if (user) {
					event.locals.user = user;
				}
			}
		} catch (e) {
			// Invalid session, clear it
			event.cookies.delete('session', { path: '/' });
		}
	}

	// Protect routes that require authentication
	const protectedRoutes = ['/dashboard', '/tenders', '/projects', '/sites', '/engineering', '/procurement', '/inventory', '/equipment', '/hr', '/finance', '/quality', '/hse', '/documents', '/reports', '/administration', '/security'];
	
	const isProtectedRoute = protectedRoutes.some(route => event.url.pathname.startsWith(route));

	if (isProtectedRoute && !event.locals.user) {
		return new Response('Redirecting to login...', {
			status: 302,
			headers: { location: '/login' }
		});
	}

	// Redirect logged-in users away from login page
	if (event.url.pathname === '/login' && event.locals.user) {
		return new Response('Redirecting to dashboard...', {
			status: 302,
			headers: { location: '/dashboard' }
		});
	}

	return resolve(event);
};

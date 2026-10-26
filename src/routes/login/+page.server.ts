import { authenticateUser } from '$lib/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { setSessionCookie } from '$lib/server/session';
import { clearLoginRateLimit, loginRateLimit, recordLoginFailure } from '$lib/server/rate-limit';

const DEFAULT_REDIRECT = '/dashboard';

function safeRedirect(target: string | null): string {
	if (!target) return DEFAULT_REDIRECT;
	// Only allow local absolute paths; blocks //evil.example and https://evil.example
	if (!target.startsWith('/') || target.startsWith('//')) return DEFAULT_REDIRECT;
	return target;
}

export const load: PageServerLoad = async ({ url }) => {
	return { redirectTo: safeRedirect(url.searchParams.get('redirectTo')) };
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const fromForm = data.get('redirectTo');
		const redirectTo = safeRedirect(
			url.searchParams.get('redirectTo') ?? (typeof fromForm === 'string' ? fromForm : null)
		);

		if (!email || !password) {
			return fail(400, { email, missing: true, redirectTo });
		}

		let address = 'unknown';
		try {
			address = getClientAddress();
		} catch {
			// getClientAddress is unavailable on some adapters; keep a shared bucket.
		}

		const rateKey = `${address}:${email.toLowerCase()}`;
		const limit = loginRateLimit(rateKey);
		if (!limit.allowed) {
			return fail(429, {
				email,
				rateLimited: true,
				retryAfterSeconds: limit.retryAfterSeconds,
				redirectTo
			});
		}

		const user = await authenticateUser(email, password);

		if (!user) {
			recordLoginFailure(rateKey);
			return fail(400, { email, invalid: true, redirectTo });
		}

		clearLoginRateLimit(rateKey);
		setSessionCookie(cookies, user.id);
		redirect(303, redirectTo);
	}
};

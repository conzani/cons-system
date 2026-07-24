import { authenticateUser } from '$lib/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, { email, missing: true });
		}

		const user = await authenticateUser(email, password);

		if (!user) {
			return fail(400, { email, invalid: true });
		}

		cookies.set('session', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		redirect(302, '/dashboard');
	}
};

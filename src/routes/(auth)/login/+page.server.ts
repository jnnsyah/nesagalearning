import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loginSchema } from '$lib/validators';
import { AuthGatekeeper, type UserRole } from '$lib/server/auth/gatekeeper';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const targetPath = AuthGatekeeper.getRoleDefaultPath(locals.user.role as UserRole);
		throw redirect(302, targetPath);
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const rememberMe = formData.get('rememberMe') === 'on';

		const validation = loginSchema.safeParse({ username, password, rememberMe });
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			return fail(400, {
				username,
				error: errors.username?.[0] || errors.password?.[0] || 'Input tidak valid'
			});
		}

		try {
			const userAgent = request.headers.get('user-agent');
			const { user, cookie } = await AuthGatekeeper.login(
				username,
				password,
				userAgent,
				rememberMe
			);

			// Always set cookie path to '/' so it's accessible across all role routes
			cookies.set(cookie.name, cookie.value, {
				path: '/',
				...cookie.attributes
			});

			const targetPath = AuthGatekeeper.getRoleDefaultPath(user.role as UserRole);
			throw redirect(302, targetPath);
		} catch (err: any) {
			if (err?.status === 302 || err?.location) throw err;
			return fail(400, {
				username,
				error: err.message || 'Login gagal'
			});
		}
	}
};

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loginSchema } from '$lib/validators';
import { loginWithUsernamePassword } from '$lib/server/services/auth.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		switch (locals.user.role) {
			case 'admin':
				throw redirect(302, '/admin');
			case 'guru':
				throw redirect(302, '/guru');
			case 'mentor':
				throw redirect(302, '/mentor');
			case 'siswa':
			default:
				throw redirect(302, '/siswa');
		}
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
			const { user, cookie } = await loginWithUsernamePassword(
				username,
				password,
				userAgent,
				rememberMe
			);

			cookies.set(cookie.name, cookie.value, {
				path: '.',
				...cookie.attributes
			});

			let targetPath = '/siswa';
			if (user.role === 'admin') targetPath = '/admin';
			else if (user.role === 'guru') targetPath = '/guru';
			else if (user.role === 'mentor') targetPath = '/mentor';

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

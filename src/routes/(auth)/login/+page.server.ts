import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loginSchema } from '$lib/validators';
import { AuthGatekeeper, type UserRole } from '$lib/server/auth/gatekeeper';
import { AuditLogService } from '$lib/server/services/audit-log.service';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirectTo');
		const targetPath =
			redirectTo && redirectTo.startsWith('/')
				? redirectTo
				: AuthGatekeeper.getRoleDefaultPath(locals.user.role as UserRole);
		throw redirect(302, targetPath);
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const rememberMe = formData.get('rememberMe') === 'on';
		const redirectToParam = url.searchParams.get('redirectTo') || formData.get('redirectTo')?.toString();

		const validation = loginSchema.safeParse({ username, password, rememberMe });
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
			await AuditLogService.logAction({
				actorId: null,
				action: 'LOGIN_FAILED',
				entityType: 'user',
				entityId: null,
				newValues: {
					username,
					reason: 'Input form username/password tidak valid',
					attemptedAt: new Date().toISOString()
				},
				ipAddress
			});
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

			const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
			await AuditLogService.logAction({
				actorId: Number(user.id),
				action: 'LOGIN',
				entityType: 'user',
				entityId: Number(user.id),
				newValues: {
					username: user.username,
					fullName: user.fullName,
					role: user.role
				},
				ipAddress
			});

			const targetPath =
				redirectToParam && redirectToParam.startsWith('/')
					? redirectToParam
					: AuthGatekeeper.getRoleDefaultPath(user.role as UserRole);

			throw redirect(302, targetPath);
		} catch (err: any) {
			if (err?.status === 302 || err?.location) throw err;

			const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
			await AuditLogService.logAction({
				actorId: null,
				action: 'LOGIN_FAILED',
				entityType: 'user',
				entityId: null,
				newValues: {
					username,
					reason: err.message || 'Username atau password salah',
					attemptedAt: new Date().toISOString()
				},
				ipAddress
			});

			return fail(400, {
				username,
				error: err.message || 'Login gagal'
			});
		}
	}
};

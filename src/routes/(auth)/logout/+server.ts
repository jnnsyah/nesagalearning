import { redirect, type RequestHandler } from '@sveltejs/kit';
import { AuthGatekeeper } from '$lib/server/auth/gatekeeper';
import { AuditLogService } from '$lib/server/services/audit-log.service';

export const GET: RequestHandler = async ({ locals, cookies, request }) => {
	if (locals.session && locals.user) {
		const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
		await AuditLogService.logAction({
			actorId: Number(locals.user.id),
			action: 'LOGOUT',
			entityType: 'user',
			entityId: Number(locals.user.id),
			newValues: { username: locals.user.username },
			ipAddress
		});
		const blankCookie = await AuthGatekeeper.logout(locals.session.id);
		cookies.set(blankCookie.name, blankCookie.value, {
			path: '/',
			...blankCookie.attributes
		});
	}
	throw redirect(302, '/login');
};

export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	if (locals.session && locals.user) {
		const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
		await AuditLogService.logAction({
			actorId: Number(locals.user.id),
			action: 'LOGOUT',
			entityType: 'user',
			entityId: Number(locals.user.id),
			newValues: { username: locals.user.username },
			ipAddress
		});
		const blankCookie = await AuthGatekeeper.logout(locals.session.id);
		cookies.set(blankCookie.name, blankCookie.value, {
			path: '/',
			...blankCookie.attributes
		});
	}
	throw redirect(302, '/login');
};

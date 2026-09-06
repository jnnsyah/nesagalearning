import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UserSessionService } from '$lib/server/services/user-session.service';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Akses ditolak.');
	}

	const userId = Number(params.id);
	if (!userId || userId <= 0) {
		throw error(400, 'ID User tidak valid.');
	}

	const sessions = await UserSessionService.getUserActiveSessions(userId);
	return json({
		success: true,
		userId,
		sessions
	});
};

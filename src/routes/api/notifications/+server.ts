import { json, type RequestHandler } from '@sveltejs/kit';
import { NotificationService } from '$lib/server/services/notification.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await NotificationService.getUserNotifications(Number(locals.user.id), 20);
		return json({
			success: true,
			items: result.items,
			unreadCount: result.unreadCount
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal memuat notifikasi' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const userId = Number(locals.user.id);

		if (body.action === 'mark_all_read') {
			const count = await NotificationService.markAllAsRead(userId);
			return json({ success: true, count });
		}

		if (body.id) {
			const success = await NotificationService.markAsRead(Number(body.id), userId);
			return json({ success });
		}

		return json({ error: 'Payload tidak valid' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Gagal memperbarui status notifikasi' }, { status: 500 });
	}
};

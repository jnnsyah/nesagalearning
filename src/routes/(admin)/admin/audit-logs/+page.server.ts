import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { AuditLogService } from '$lib/server/services/audit-log.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '15')));
	const search = url.searchParams.get('search') || '';
	const role = url.searchParams.get('role') || 'all';
	const action = url.searchParams.get('action') || 'all';
	const dateFrom = url.searchParams.get('dateFrom') || '';
	const dateTo = url.searchParams.get('dateTo') || '';

	const [auditLogsData, distinctActions] = await Promise.all([
		AuditLogService.getPaginatedAuditLogs({
			page,
			limit,
			search,
			role,
			action,
			dateFrom,
			dateTo
		}),
		AuditLogService.getDistinctActions()
	]);

	return {
		auditLogsData,
		distinctActions,
		filters: {
			page,
			limit,
			search,
			role,
			action,
			dateFrom,
			dateTo
		}
	};
};

export const actions: Actions = {
	purgeLogs: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const days = Number(formData.get('days') || '90');

			if (isNaN(days) || days < 7) {
				return fail(400, {
					success: false,
					message: 'Retensi pembersihan minimal 7 hari.'
				});
			}

			const res = await AuditLogService.purgeOldLogs(days, Number(locals.user.id));
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return {
				success: true,
				message: res.message
			};
		} catch (err: any) {
			console.error('[purgeLogs Action Error]:', err);
			return fail(500, {
				success: false,
				message: 'Terjadi kesalahan saat membersihkan log.'
			});
		}
	}
};

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

	const auditLogsData = await AuditLogService.getPaginatedAuditLogs({
		page,
		limit,
		search,
		role,
		action,
		dateFrom,
		dateTo
	});

	return {
		auditLogsData,
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

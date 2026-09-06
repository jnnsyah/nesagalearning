import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuditLogService } from '$lib/server/services/audit-log.service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(401, 'Akses ditolak.');
	}

	const search = url.searchParams.get('search') || '';
	const role = url.searchParams.get('role') || 'all';
	const action = url.searchParams.get('action') || 'all';
	const dateFrom = url.searchParams.get('dateFrom') || '';
	const dateTo = url.searchParams.get('dateTo') || '';
	const format = (url.searchParams.get('format') || 'csv').toLowerCase();

	const logs = await AuditLogService.getExportLogs({
		search,
		role,
		action,
		dateFrom,
		dateTo
	});

	// Audit the export action
	await AuditLogService.logAction({
		actorId: Number(locals.user.id),
		action: 'EXPORT_AUDIT_LOGS',
		entityType: 'system',
		newValues: {
			format,
			exportedRecordsCount: logs.length,
			filters: { search, role, action, dateFrom, dateTo }
		}
	});

	const timestamp = new Date().toISOString().slice(0, 10);

	if (format === 'json') {
		const jsonString = JSON.stringify(logs, null, 2);
		return new Response(jsonString, {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="audit_logs_${timestamp}.json"`
			}
		});
	}

	// CSV formatting
	const csvHeaders = ['ID', 'Waktu', 'Nama Aktor', 'Username', 'Peran', 'Jenis Aksi', 'Tipe Entitas', 'Label Entitas', 'Alamat IP', 'Old Values', 'New Values'];
	const escapeCsv = (str: any) => {
		if (str === null || str === undefined) return '""';
		const val = typeof str === 'object' ? JSON.stringify(str) : String(str);
		return `"${val.replace(/"/g, '""')}"`;
	};

	const csvRows = [
		csvHeaders.join(','),
		...logs.map((log) =>
			[
				log.id,
				log.createdAt ? new Date(log.createdAt).toISOString() : '',
				escapeCsv(log.actorName),
				escapeCsv(log.actorUsername),
				escapeCsv(log.actorRole),
				escapeCsv(log.action),
				escapeCsv(log.entityType),
				escapeCsv(log.entityLabel),
				escapeCsv(log.ipAddress || '127.0.0.1'),
				escapeCsv(log.oldValues),
				escapeCsv(log.newValues)
			].join(',')
		)
	];

	return new Response(csvRows.join('\n'), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="audit_logs_${timestamp}.csv"`
		}
	});
};

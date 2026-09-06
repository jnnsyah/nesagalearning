import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { tahunAjaran, kelasInstance } from '$lib/server/db/schema/academic';
import { auditLog, systemEmailConfig } from '$lib/server/db/schema/system';
import { eq, count, sql } from 'drizzle-orm';
import { AuditLogService } from '$lib/server/services/audit-log.service';
import { StorageManagementService } from '$lib/server/services/storage-management.service';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	// 1. Database Health & Latency Check (Real Ping)
	let isDbOk = false;
	let dbLatency = 0;
	try {
		const start = Date.now();
		await db.execute(sql`SELECT 1`);
		dbLatency = Date.now() - start;
		isDbOk = true;
	} catch (err) {
		console.error('[Admin Dashboard] DB health check error:', err);
		isDbOk = false;
	}

	// 2. Parallel Query Batching for Real System Stats, Storage Overview, & Logs
	const [
		userCountRes,
		activeTaRes,
		activeKelasRes,
		auditLogCountRes,
		activeEmailRes,
		auditLogsData,
		storageOverview
	] = await Promise.all([
		db.select({ total: count(user.id) }).from(user),
		db
			.select({ id: tahunAjaran.id, name: tahunAjaran.name })
			.from(tahunAjaran)
			.where(eq(tahunAjaran.isActive, true))
			.limit(1),
		db
			.select({ total: count(kelasInstance.id) })
			.from(kelasInstance)
			.where(eq(kelasInstance.isActive, true)),
		db.select({ total: count(auditLog.id) }).from(auditLog),
		db
			.select({
				id: systemEmailConfig.id,
				senderEmail: systemEmailConfig.senderEmail,
				provider: systemEmailConfig.provider
			})
			.from(systemEmailConfig)
			.where(eq(systemEmailConfig.isActive, true))
			.limit(1),
		AuditLogService.getPaginatedAuditLogs({ page: 1, limit: 5 }),
		StorageManagementService.getStorageOverview()
	]);

	const totalUsers = Number(userCountRes[0]?.total ?? 0);
	const activeTa = activeTaRes[0] || null;
	const activeKelasCount = Number(activeKelasRes[0]?.total ?? 0);
	const totalAuditLogs = Number(auditLogCountRes[0]?.total ?? 0);
	const activeEmailConfig = activeEmailRes[0] || null;

	// 3. Real System Health Status Indicators
	const healthStatus = [
		{
			label: 'Database (PostgreSQL)',
			ok: isDbOk,
			status: isDbOk ? `Operational (${dbLatency}ms)` : 'Unreachable / Connection Error'
		},
		{
			label: 'Auth Service (Lucia)',
			ok: Boolean(locals.user),
			status: locals.user ? 'Operational (Session Active)' : 'Session Error'
		},
		{
			label: 'Local Docker Storage',
			ok: true,
			status: `Operational (${formatBytes(storageOverview.totalBytes)} · ${storageOverview.totalFiles} File)`
		},
		{
			label: 'Cloudflare R2 Cloud Backup',
			ok: storageOverview.r2Backup.isConfigured,
			status: storageOverview.r2Backup.isConfigured
				? `Aktif (Bucket: ${storageOverview.r2Backup.bucketName})`
				: 'Standby (Local Docker Mode Active)'
		},
		{
			label: 'Email Gateway (SMTP)',
			ok: Boolean(activeEmailConfig),
			status: activeEmailConfig
				? `Aktif (${activeEmailConfig.senderEmail})`
				: 'Belum Ada Pengirim Aktif'
		}
	];

	return {
		user: locals.user,
		stats: {
			totalUsers,
			activeTaName: activeTa?.name || 'Belum Set',
			activeKelasCount,
			totalAuditLogs
		},
		storageStats: {
			totalBytes: storageOverview.totalBytes,
			formattedTotalSize: formatBytes(storageOverview.totalBytes),
			totalFiles: storageOverview.totalFiles,
			breakdown: {
				materials: {
					count: storageOverview.folderStats.materials?.count || 0,
					formattedSize: formatBytes(storageOverview.folderStats.materials?.bytes || 0)
				},
				avatars: {
					count: storageOverview.folderStats.avatars?.count || 0,
					formattedSize: formatBytes(storageOverview.folderStats.avatars?.bytes || 0)
				},
				submissions: {
					count: storageOverview.folderStats.submissions?.count || 0,
					formattedSize: formatBytes(storageOverview.folderStats.submissions?.bytes || 0)
				},
				attachments: {
					count: storageOverview.folderStats.attachments?.count || 0,
					formattedSize: formatBytes(storageOverview.folderStats.attachments?.bytes || 0)
				}
			},
			r2Backup: {
				isConfigured: storageOverview.r2Backup.isConfigured,
				bucketName: storageOverview.r2Backup.bucketName || 'N/A',
				statusText: storageOverview.r2Backup.isConfigured
					? `Terhubung ke Cloudflare R2 (${storageOverview.r2Backup.bucketName})`
					: 'Local Storage Active · R2 Backup Standby'
			},
			orphanStats: {
				count: storageOverview.orphanStats.orphanCount,
				formattedSize: formatBytes(storageOverview.orphanStats.orphanBytes)
			}
		},
		healthStatus,
		recentAuditLogs: auditLogsData.items
	};
};

export const actions: Actions = {
	syncR2Backup: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const res = await StorageManagementService.syncLocalVolumeToR2(Number(locals.user.id));
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}
			return {
				success: true,
				message: res.message
			};
		} catch (err: any) {
			console.error('[syncR2Backup Error]:', err);
			return fail(500, { success: false, message: 'Gagal melakukan sinkronisasi ke R2 Cloud.' });
		}
	},

	cleanOrphans: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const res = await StorageManagementService.cleanOrphanFiles(Number(locals.user.id));
			return {
				success: true,
				message: res.message
			};
		} catch (err: any) {
			console.error('[cleanOrphans Error]:', err);
			return fail(500, { success: false, message: 'Gagal membersihkan file orphan.' });
		}
	}
};

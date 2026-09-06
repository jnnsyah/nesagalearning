import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { tahunAjaran, kelasInstance } from '$lib/server/db/schema/academic';
import { auditLog, systemEmailConfig } from '$lib/server/db/schema/system';
import { eq, count, sql } from 'drizzle-orm';
import { AuditLogService } from '$lib/server/services/audit-log.service';
import { UserSessionService } from '$lib/server/services/user-session.service';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

function calculateFolderStats(dirPath: string): { totalBytes: number; fileCount: number } {
	let totalBytes = 0;
	let fileCount = 0;

	if (!fs.existsSync(dirPath)) return { totalBytes: 0, fileCount: 0 };

	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				const sub = calculateFolderStats(fullPath);
				totalBytes += sub.totalBytes;
				fileCount += sub.fileCount;
			} else if (entry.isFile()) {
				const stat = fs.statSync(fullPath);
				totalBytes += stat.size;
				fileCount++;
			}
		}
	} catch (e) {
		console.error('Error calculating folder stats:', e);
	}

	return { totalBytes, fileCount };
}

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

	// 2. Parallel Query Batching for Real System Stats, Logs, & Security Alerts
	const [
		userCountRes,
		activeTaRes,
		activeKelasRes,
		auditLogCountRes,
		activeEmailRes,
		auditLogsData,
		securityAlerts
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
		UserSessionService.getSecurityAlertsSummary()
	]);

	const totalUsers = Number(userCountRes[0]?.total ?? 0);
	const activeTa = activeTaRes[0] || null;
	const activeKelasCount = Number(activeKelasRes[0]?.total ?? 0);
	const totalAuditLogs = Number(auditLogCountRes[0]?.total ?? 0);
	const activeEmailConfig = activeEmailRes[0] || null;

	// 3. Local Docker Storage Volume Statistics
	const uploadDirCandidates = [
		process.env.UPLOADS_DIR || '/app/uploads',
		path.join(process.cwd(), 'uploads'),
		path.join(process.cwd(), 'static', 'uploads')
	];

	const folderBreakdown: Record<string, { bytes: number; count: number }> = {
		materials: { bytes: 0, count: 0 },
		avatars: { bytes: 0, count: 0 },
		submissions: { bytes: 0, count: 0 },
		attachments: { bytes: 0, count: 0 }
	};

	let totalStorageBytes = 0;
	let totalStorageFiles = 0;

	// Calculate usage across active directories
	for (const baseDir of uploadDirCandidates) {
		if (fs.existsSync(baseDir)) {
			const stats = calculateFolderStats(baseDir);
			totalStorageBytes += stats.totalBytes;
			totalStorageFiles += stats.fileCount;

			for (const subFolder of ['materials', 'avatars', 'submissions', 'attachments']) {
				const subPath = path.join(baseDir, subFolder);
				if (fs.existsSync(subPath)) {
					const subStats = calculateFolderStats(subPath);
					folderBreakdown[subFolder].bytes += subStats.totalBytes;
					folderBreakdown[subFolder].count += subStats.fileCount;
				}
			}
			break; // Avoid double counting if paths resolve to same folder
		}
	}

	// 4. Cloudflare R2 Cloud Backup Status
	const r2AccountId = env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
	const r2BucketName = env.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
	const hasR2Config = Boolean(
		r2AccountId &&
			(env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
			r2BucketName
	);

	// 5. Real System Health Status Indicators
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
			status: `Operational (${formatBytes(totalStorageBytes)} · ${totalStorageFiles} File)`
		},
		{
			label: 'Cloudflare R2 Cloud Backup',
			ok: hasR2Config,
			status: hasR2Config
				? `Aktif (Bucket: ${r2BucketName})`
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
			totalBytes: totalStorageBytes,
			formattedTotalSize: formatBytes(totalStorageBytes),
			totalFiles: totalStorageFiles,
			breakdown: {
				materials: {
					count: folderBreakdown.materials.count,
					formattedSize: formatBytes(folderBreakdown.materials.bytes)
				},
				avatars: {
					count: folderBreakdown.avatars.count,
					formattedSize: formatBytes(folderBreakdown.avatars.bytes)
				},
				submissions: {
					count: folderBreakdown.submissions.count,
					formattedSize: formatBytes(folderBreakdown.submissions.bytes)
				},
				attachments: {
					count: folderBreakdown.attachments.count,
					formattedSize: formatBytes(folderBreakdown.attachments.bytes)
				}
			},
			r2Backup: {
				isConfigured: hasR2Config,
				bucketName: r2BucketName || 'N/A',
				statusText: hasR2Config
					? `Terhubung ke Cloudflare R2 (${r2BucketName})`
					: 'Local Storage Active · R2 Backup Standby'
			}
		},
		healthStatus,
		recentAuditLogs: auditLogsData.items,
		securityAlerts
	};
};

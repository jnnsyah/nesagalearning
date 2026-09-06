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
import os from 'os';

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

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (days > 0) return `${days}h ${hours}j ${minutes}m`;
	if (hours > 0) return `${hours}j ${minutes}m`;
	return `${minutes}m`;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	// 1. Database Health, Metadata & Latency Check (Real Ping)
	let isDbOk = false;
	let dbLatency = 0;
	let dbVersion = 'PostgreSQL';
	let dbSize = 'N/A';
	let activeDbConns = 0;
	let maxDbConns = 100;
	let activeSessionsCount = 0;
	let audit24hCount = 0;

	try {
		const start = Date.now();
		const res = await db.execute(sql`
			SELECT 
				version() as pg_version,
				pg_size_pretty(pg_database_size(current_database())) as db_size,
				(SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) as active_conns,
				current_setting('max_connections')::int as max_conns,
				(SELECT count(*)::int FROM "session" WHERE expires_at > NOW()) as active_sessions,
				(SELECT count(*)::int FROM audit_log WHERE created_at >= NOW() - INTERVAL '24 hours') as audit_24h_count
		`);
		dbLatency = Date.now() - start;
		isDbOk = true;

		const row = Array.isArray(res) ? res[0] : (res as any)?.rows?.[0];
		if (row) {
			const fullVer = String(row.pg_version || '');
			const match = fullVer.match(/PostgreSQL\s+[\d\.]+/i);
			dbVersion = match ? match[0] : 'PostgreSQL';
			dbSize = String(row.db_size || 'N/A');
			activeDbConns = Number(row.active_conns || 1);
			maxDbConns = Number(row.max_conns || 100);
			activeSessionsCount = Number(row.active_sessions || 0);
			audit24hCount = Number(row.audit_24h_count || 0);
		}
	} catch (err) {
		console.error('[Admin Dashboard] DB health check error:', err);
		isDbOk = false;
	}

	const memoryUsage = process.memoryUsage();
	const totalSystemMem = os.totalmem();
	const freeSystemMem = os.freemem();
	const usedSystemMem = totalSystemMem - freeSystemMem;
	const systemMemPercent = Math.round((usedSystemMem / totalSystemMem) * 100);

	const heapUsed = memoryUsage.heapUsed;
	const heapTotal = memoryUsage.heapTotal;
	const heapPercent = Math.round((heapUsed / heapTotal) * 100);

	const cpus = os.cpus();
	const cpuCount = cpus ? cpus.length : 1;
	const loadAvg1m = os.loadavg ? os.loadavg()[0].toFixed(2) : '0.00';

	// Real Server Harddisk Filesystem Capacity Stats
	let diskTotalBytes = 0;
	let diskUsedBytes = 0;
	let diskPercent = 0;
	try {
		if (typeof fs.statfsSync === 'function') {
			const stats = fs.statfsSync(process.cwd());
			const total = Number(stats.blocks) * Number(stats.bsize);
			const free = Number(stats.bavail) * Number(stats.bsize);
			diskTotalBytes = total;
			diskUsedBytes = total - free;
			diskPercent = total > 0 ? Math.round((diskUsedBytes / total) * 100) : 0;
		}
	} catch (e) {
		console.error('[Admin Dashboard] Disk stat error:', e);
	}

	const serverRuntime = {
		nodeVersion: process.version,
		platform: `${process.platform} (${process.arch})`,
		uptime: formatUptime(process.uptime()),
		hostUptime: formatUptime(os.uptime()),
		heapUsedFormatted: formatBytes(heapUsed),
		heapTotalFormatted: formatBytes(heapTotal),
		heapPercent,
		rssFormatted: formatBytes(memoryUsage.rss),
		systemMemUsedFormatted: formatBytes(usedSystemMem),
		systemMemTotalFormatted: formatBytes(totalSystemMem),
		systemMemPercent,
		diskUsedFormatted: formatBytes(diskUsedBytes),
		diskTotalFormatted: formatBytes(diskTotalBytes),
		diskPercent,
		cpuCount,
		loadAvg1m,
		activeSessionsCount,
		env: process.env.NODE_ENV || 'development'
	};

	const dbRuntime = {
		ok: isDbOk,
		version: dbVersion,
		size: dbSize,
		activeConnections: activeDbConns,
		maxConnections: maxDbConns,
		connPercent: Math.round((activeDbConns / maxDbConns) * 100),
		latencyMs: dbLatency,
		audit24hCount
	};

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
	const scannedRealPaths = new Set<string>();

	// Calculate usage across active directories (deduplicating identical real paths)
	for (const baseDir of uploadDirCandidates) {
		if (fs.existsSync(baseDir)) {
			let realPath = baseDir;
			try {
				realPath = fs.realpathSync(baseDir);
			} catch {
				// fallback to baseDir if realpath fails
			}

			if (scannedRealPaths.has(realPath)) continue;
			scannedRealPaths.add(realPath);

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
			diskUsedFormatted: formatBytes(diskUsedBytes),
			diskTotalFormatted: formatBytes(diskTotalBytes),
			diskPercent,
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
		serverRuntime,
		dbRuntime,
		recentAuditLogs: auditLogsData.items,
		securityAlerts
	};
};

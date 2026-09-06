import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { tahunAjaran, kelasInstance } from '$lib/server/db/schema/academic';
import { auditLog, systemEmailConfig } from '$lib/server/db/schema/system';
import { eq, count, sql } from 'drizzle-orm';
import { AuditLogService } from '$lib/server/services/audit-log.service';
import { env } from '$env/dynamic/private';

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

	// 2. Parallel Query Batching for Real System Stats & Logs
	const [
		userCountRes,
		activeTaRes,
		activeKelasRes,
		auditLogCountRes,
		activeEmailRes,
		auditLogsData
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
		AuditLogService.getPaginatedAuditLogs({ page: 1, limit: 5 })
	]);

	const totalUsers = Number(userCountRes[0]?.total ?? 0);
	const activeTa = activeTaRes[0] || null;
	const activeKelasCount = Number(activeKelasRes[0]?.total ?? 0);
	const totalAuditLogs = Number(auditLogCountRes[0]?.total ?? 0);
	const activeEmailConfig = activeEmailRes[0] || null;

	// 3. Storage Health Check from Dynamic Server Environment
	const hasStorageConfig = Boolean(
		env.SUPABASE_URL ||
			process.env.PUBLIC_SUPABASE_URL ||
			process.env.SUPABASE_URL
	);

	// 4. Real System Health Status Indicators
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
			label: 'File Storage (Supabase)',
			ok: hasStorageConfig,
			status: hasStorageConfig ? 'Operational' : 'Key Belum Set'
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
		healthStatus,
		recentAuditLogs: auditLogsData.items
	};
};

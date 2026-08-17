import { db } from '../db';
import { auditLog } from '../db/schema/system';
import { user as userTable } from '../db/schema/auth';
import { eq, and, sql, count, desc, gte, lte, ilike, or, inArray } from 'drizzle-orm';

export interface AuditLogItem {
	id: number;
	actorId: number | null;
	actorName: string;
	actorUsername: string;
	actorRole: string;
	actorAvatarUrl: string | null;
	action: string;
	entityType: string;
	entityId: number | null;
	entityLabel: string;
	oldValues: any;
	newValues: any;
	ipAddress: string | null;
	createdAt: Date;
}

export interface PaginatedAuditLogs {
	items: AuditLogItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	stats: {
		totalLogsCount: number;
		todayLogsCount: number;
		securityAlertsCount: number;
		adminActionsCount: number;
	};
}

function deriveEntityLabel(
	entityType: string,
	entityId: number | null,
	oldValues: any,
	newValues: any,
	targetUserMap?: Map<number, { fullName: string; username: string }>
): string {
	// 1. If target is user & found in targetUserMap
	if (entityType === 'user' && entityId && targetUserMap?.has(entityId)) {
		const targetUser = targetUserMap.get(entityId)!;
		return `${targetUser.fullName} (@${targetUser.username})`;
	}

	// 2. Extract from values payload if present
	const vals = { ...oldValues, ...newValues };

	if (vals.targetFullName || vals.targetUsername) {
		const name = vals.targetFullName || vals.targetUsername;
		const handle = vals.targetUsername ? ` (@${vals.targetUsername})` : '';
		return `User: ${name}${handle}`;
	}

	if (vals.fullName || vals.username) {
		const name = vals.fullName || vals.username;
		const handle = vals.username ? ` (@${vals.username})` : '';
		return `User: ${name}${handle}`;
	}

	if (vals.name) {
		return `${vals.name}`;
	}

	if (vals.title) {
		return `${vals.title}`;
	}

	if (vals.code) {
		return `Kode: ${vals.code}`;
	}

	if (vals.studentName || vals.sessionTitle) {
		const student = vals.studentName || '';
		const session = vals.sessionTitle ? ` - ${vals.sessionTitle}` : '';
		return `Presensi: ${student}${session}`;
	}

	if (vals.description && typeof vals.description === 'string' && vals.description.length < 40) {
		return `${vals.description}`;
	}

	// Fallback
	return `${entityType.toUpperCase()}${entityId ? ` #${entityId}` : ''}`;
}

export const AuditLogService = {
	/**
	 * Log a system or user action into audit_log
	 */
	async logAction(data: {
		actorId?: number | null;
		action: string;
		entityType: string;
		entityId?: number | null;
		oldValues?: any;
		newValues?: any;
		ipAddress?: string | null;
	}): Promise<void> {
		try {
			await db.insert(auditLog).values({
				actorId: data.actorId || null,
				action: data.action.trim(),
				entityType: data.entityType.trim(),
				entityId: data.entityId || null,
				oldValues: data.oldValues || null,
				newValues: data.newValues || null,
				ipAddress: data.ipAddress || null,
				createdAt: new Date()
			});
		} catch (error) {
			console.error('[AuditLogService.logAction error]:', error);
		}
	},

	/**
	 * Seed initial audit logs if table is empty
	 */
	async seedInitialLogsIfEmpty(): Promise<void> {
		try {
			const [existing] = await db.select({ total: count(auditLog.id) }).from(auditLog);
			if (Number(existing?.total ?? 0) > 0) return;

			// Fetch an admin user for initial log seed
			const [adminUser] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.role, 'admin'))
				.limit(1);

			const actorId = adminUser?.id || null;

			const sampleLogs = [
				{
					actorId,
					action: 'DATABASE_SEED',
					entityType: 'system',
					entityId: null,
					newValues: { status: 'success', environment: 'development' },
					ipAddress: '127.0.0.1',
					createdAt: new Date(Date.now() - 3600000 * 24 * 3)
				},
				{
					actorId,
					action: 'CREATE_USER',
					entityType: 'user',
					entityId: 2,
					newValues: { username: 'guru1', fullName: 'Guru Supervisi', role: 'guru' },
					ipAddress: '192.168.1.10',
					createdAt: new Date(Date.now() - 3600000 * 24 * 2)
				},
				{
					actorId,
					action: 'UPDATE_MASTER_DATA',
					entityType: 'room',
					entityId: 1,
					newValues: { name: 'Lab TKJ 1', description: 'Laboratorium Utama Networking' },
					ipAddress: '192.168.1.10',
					createdAt: new Date(Date.now() - 3600000 * 24 * 1)
				},
				{
					actorId,
					action: 'RESET_PASSWORD',
					entityType: 'user',
					entityId: 4,
					oldValues: { passwordChanged: false },
					newValues: { passwordChanged: true, resetBy: 'admin' },
					ipAddress: '192.168.1.10',
					createdAt: new Date(Date.now() - 3600000 * 12)
				},
				{
					actorId,
					action: 'MANUAL_ATTENDANCE_EDIT',
					entityType: 'attendance',
					entityId: 10,
					newValues: { reason: 'Sakit dengan Surat Dokter', status: 'excused' },
					ipAddress: '192.168.1.15',
					createdAt: new Date(Date.now() - 3600000 * 2)
				}
			];

			for (const logItem of sampleLogs) {
				await db.insert(auditLog).values(logItem);
			}
		} catch (e) {
			console.error('[seedInitialLogsIfEmpty error]:', e);
		}
	},

	/**
	 * Get paginated and filtered audit logs
	 */
	async getPaginatedAuditLogs(params: {
		page?: number;
		limit?: number;
		search?: string;
		role?: string;
		action?: string;
		dateFrom?: string;
		dateTo?: string;
	}): Promise<PaginatedAuditLogs> {
		await this.seedInitialLogsIfEmpty();

		const safePage = Math.max(1, params.page || 1);
		const safeLimit = Math.min(100, Math.max(1, params.limit || 15));
		const offset = (safePage - 1) * safeLimit;

		// Build WHERE conditions
		const conditions = [];

		if (params.role && params.role !== 'all') {
			conditions.push(eq(userTable.role, params.role));
		}

		if (params.action && params.action !== 'all') {
			conditions.push(eq(auditLog.action, params.action));
		}

		if (params.search && params.search.trim() !== '') {
			const term = `%${params.search.trim()}%`;
			conditions.push(
				or(
					ilike(userTable.fullName, term),
					ilike(userTable.username, term),
					ilike(auditLog.action, term),
					ilike(auditLog.entityType, term)
				)
			);
		}

		if (params.dateFrom) {
			const dFrom = new Date(params.dateFrom);
			dFrom.setHours(0, 0, 0, 0);
			conditions.push(gte(auditLog.createdAt, dFrom));
		}

		if (params.dateTo) {
			const dTo = new Date(params.dateTo);
			dTo.setHours(23, 59, 59, 999);
			conditions.push(lte(auditLog.createdAt, dTo));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// 1. Total matching count
		const [countRes] = await db
			.select({ total: count(auditLog.id) })
			.from(auditLog)
			.leftJoin(userTable, eq(auditLog.actorId, userTable.id))
			.where(whereClause);

		const total = Number(countRes?.total ?? 0);
		const totalPages = Math.ceil(total / safeLimit) || 1;

		// 2. Fetch paginated records
		const records = await db
			.select({
				id: auditLog.id,
				actorId: auditLog.actorId,
				actorName: userTable.fullName,
				actorUsername: userTable.username,
				actorRole: userTable.role,
				actorAvatarUrl: userTable.avatarUrl,
				action: auditLog.action,
				entityType: auditLog.entityType,
				entityId: auditLog.entityId,
				oldValues: auditLog.oldValues,
				newValues: auditLog.newValues,
				ipAddress: auditLog.ipAddress,
				createdAt: auditLog.createdAt
			})
			.from(auditLog)
			.leftJoin(userTable, eq(auditLog.actorId, userTable.id))
			.where(whereClause)
			.orderBy(desc(auditLog.createdAt))
			.limit(safeLimit)
			.offset(offset);

		// Batch lookup for target user entities
		const targetUserIds = records
			.filter((r) => r.entityType === 'user' && r.entityId)
			.map((r) => r.entityId as number);

		const targetUserMap = new Map<number, { fullName: string; username: string }>();
		if (targetUserIds.length > 0) {
			const targetUsers = await db
				.select({ id: userTable.id, fullName: userTable.fullName, username: userTable.username })
				.from(userTable)
				.where(inArray(userTable.id, targetUserIds));
			for (const tu of targetUsers) {
				targetUserMap.set(tu.id, { fullName: tu.fullName, username: tu.username });
			}
		}

		const items: AuditLogItem[] = records.map((r) => ({
			id: r.id,
			actorId: r.actorId,
			actorName: r.actorName || (r.actorId ? 'Pengguna Dihapus' : 'Sistem Otomatis'),
			actorUsername: r.actorUsername || 'system',
			actorRole: r.actorRole || 'system',
			actorAvatarUrl: r.actorAvatarUrl || null,
			action: r.action,
			entityType: r.entityType,
			entityId: r.entityId,
			entityLabel: deriveEntityLabel(r.entityType, r.entityId, r.oldValues, r.newValues, targetUserMap),
			oldValues: r.oldValues,
			newValues: r.newValues,
			ipAddress: r.ipAddress,
			createdAt: r.createdAt
		}));

		// 3. Compute summary statistics
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const [totalLogsRes] = await db.select({ total: count(auditLog.id) }).from(auditLog);
		const [todayLogsRes] = await db
			.select({ total: count(auditLog.id) })
			.from(auditLog)
			.where(gte(auditLog.createdAt, startOfToday));

		const [securityAlertsRes] = await db
			.select({ total: count(auditLog.id) })
			.from(auditLog)
			.where(sql`${auditLog.action} IN ('LOGIN_FAILED', 'RESET_PASSWORD', 'DELETE_MATERIAL', 'UNAUTHORIZED_ACCESS')`);

		const [adminActionsRes] = await db
			.select({ total: count(auditLog.id) })
			.from(auditLog)
			.leftJoin(userTable, eq(auditLog.actorId, userTable.id))
			.where(eq(userTable.role, 'admin'));

		return {
			items,
			total,
			page: safePage,
			limit: safeLimit,
			totalPages,
			stats: {
				totalLogsCount: Number(totalLogsRes?.total ?? 0),
				todayLogsCount: Number(todayLogsRes?.total ?? 0),
				securityAlertsCount: Number(securityAlertsRes?.total ?? 0),
				adminActionsCount: Number(adminActionsRes?.total ?? 0)
			}
		};
	}
};

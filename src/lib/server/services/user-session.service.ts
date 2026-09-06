import { db } from '../db';
import { session as sessionTable, user as userTable } from '../db/schema/auth';
import { auditLog } from '../db/schema/system';
import { eq, and, sql, desc, gte, count, inArray } from 'drizzle-orm';
import { lucia } from '../auth/lucia';
import { AuditLogService } from './audit-log.service';

export interface UserSessionItem {
	id: string;
	userId: number;
	userFullName: string;
	username: string;
	userRole: string;
	userAvatarUrl: string | null;
	uaIsMobile: boolean;
	rememberMe: boolean;
	createdAt: Date;
	expiresAt: Date;
	isExpired: boolean;
}

export interface SecurityAlertsSummary {
	failedLogins24hCount: number;
	distinctFailedIPsCount: number;
	flaggedIPs: Array<{
		ipAddress: string;
		failedCount: number;
		lastAttempt: Date;
	}>;
}

export const UserSessionService = {
	/**
	 * Fetch active login sessions for a specific user ID
	 */
	async getUserActiveSessions(userId: number): Promise<UserSessionItem[]> {
		try {
			const now = new Date();
			const records = await db
				.select({
					id: sessionTable.id,
					userId: sessionTable.userId,
					userFullName: userTable.fullName,
					username: userTable.username,
					userRole: userTable.role,
					userAvatarUrl: userTable.avatarUrl,
					uaIsMobile: sessionTable.uaIsMobile,
					rememberMe: sessionTable.rememberMe,
					createdAt: sessionTable.createdAt,
					expiresAt: sessionTable.expiresAt
				})
				.from(sessionTable)
				.innerJoin(userTable, eq(sessionTable.userId, userTable.id))
				.where(and(eq(sessionTable.userId, userId), gte(sessionTable.expiresAt, now)))
				.orderBy(desc(sessionTable.createdAt));

			return records.map((r) => ({
				id: r.id,
				userId: r.userId,
				userFullName: r.userFullName,
				username: r.username,
				userRole: r.userRole,
				userAvatarUrl: r.userAvatarUrl,
				uaIsMobile: r.uaIsMobile,
				rememberMe: r.rememberMe,
				createdAt: r.createdAt,
				expiresAt: r.expiresAt,
				isExpired: r.expiresAt < now
			}));
		} catch (error) {
			console.error('[UserSessionService.getUserActiveSessions error]:', error);
			return [];
		}
	},

	/**
	 * Map active session counts for a list of user IDs
	 */
	async getActiveSessionCountsMap(userIds: number[]): Promise<Map<number, number>> {
		const sessionMap = new Map<number, number>();
		if (!userIds || userIds.length === 0) return sessionMap;

		try {
			const now = new Date();
			const results = await db
				.select({
					userId: sessionTable.userId,
					sessionCount: count(sessionTable.id)
				})
				.from(sessionTable)
				.where(and(inArray(sessionTable.userId, userIds), gte(sessionTable.expiresAt, now)))
				.groupBy(sessionTable.userId);

			for (const r of results) {
				sessionMap.set(r.userId, Number(r.sessionCount || 0));
			}
		} catch (error) {
			console.error('[UserSessionService.getActiveSessionCountsMap error]:', error);
		}

		return sessionMap;
	},

	/**
	 * Revoke (invalidate) a single session token
	 */
	async revokeSession(sessionId: string, actorId: number): Promise<{ success: boolean; message: string }> {
		try {
			const [sessionRecord] = await db
				.select({
					userId: sessionTable.userId,
					username: userTable.username,
					fullName: userTable.fullName
				})
				.from(sessionTable)
				.innerJoin(userTable, eq(sessionTable.userId, userTable.id))
				.where(eq(sessionTable.id, sessionId))
				.limit(1);

			await lucia.invalidateSession(sessionId);

			if (sessionRecord) {
				await AuditLogService.logAction({
					actorId,
					action: 'REVOKE_USER_SESSION',
					entityType: 'user',
					entityId: sessionRecord.userId,
					newValues: {
						sessionIdTruncated: `${sessionId.substring(0, 10)}...`,
						targetUsername: sessionRecord.username,
						targetFullName: sessionRecord.fullName
					}
				});
			}

			return {
				success: true,
				message: 'Sesi pengguna berhasil dicabut (force logout).'
			};
		} catch (error) {
			console.error('[UserSessionService.revokeSession error]:', error);
			return {
				success: false,
				message: 'Gagal mencabut sesi pengguna.'
			};
		}
	},

	/**
	 * Revoke (invalidate) all active sessions for a target user ID
	 */
	async revokeAllUserSessions(userId: number, actorId: number): Promise<{ success: boolean; message: string }> {
		try {
			const [targetUser] = await db
				.select({ id: userTable.id, username: userTable.username, fullName: userTable.fullName })
				.from(userTable)
				.where(eq(userTable.id, userId))
				.limit(1);

			if (!targetUser) {
				return { success: false, message: 'User tidak ditemukan.' };
			}

			await lucia.invalidateUserSessions(String(userId));

			await AuditLogService.logAction({
				actorId,
				action: 'REVOKE_ALL_USER_SESSIONS',
				entityType: 'user',
				entityId: userId,
				newValues: {
					targetUsername: targetUser.username,
					targetFullName: targetUser.fullName
				}
			});

			return {
				success: true,
				message: `Seluruh sesi aktif untuk ${targetUser.fullName} (@${targetUser.username}) telah berhasil dicabut.`
			};
		} catch (error) {
			console.error('[UserSessionService.revokeAllUserSessions error]:', error);
			return {
				success: false,
				message: 'Gagal mencabut seluruh sesi pengguna.'
			};
		}
	},

	/**
	 * Get security alerts & brute-force monitoring data in last 24 hours
	 */
	async getSecurityAlertsSummary(): Promise<SecurityAlertsSummary> {
		try {
			const past24h = new Date(Date.now() - 24 * 3600 * 1000);

			const [failedRes] = await db
				.select({ total: count(auditLog.id) })
				.from(auditLog)
				.where(and(eq(auditLog.action, 'LOGIN_FAILED'), gte(auditLog.createdAt, past24h)));

			const failedLogins24hCount = Number(failedRes?.total ?? 0);

			const flaggedIPsRaw = await db
				.select({
					ipAddress: auditLog.ipAddress,
					failedCount: count(auditLog.id),
					lastAttempt: sql<Date>`MAX(${auditLog.createdAt})`
				})
				.from(auditLog)
				.where(and(eq(auditLog.action, 'LOGIN_FAILED'), gte(auditLog.createdAt, past24h)))
				.groupBy(auditLog.ipAddress)
				.orderBy(desc(count(auditLog.id)))
				.limit(10);

			const flaggedIPs = flaggedIPsRaw.map((r) => ({
				ipAddress: r.ipAddress || '127.0.0.1',
				failedCount: Number(r.failedCount || 0),
				lastAttempt: new Date(r.lastAttempt)
			}));

			return {
				failedLogins24hCount,
				distinctFailedIPsCount: flaggedIPs.length,
				flaggedIPs
			};
		} catch (error) {
			console.error('[UserSessionService.getSecurityAlertsSummary error]:', error);
			return {
				failedLogins24hCount: 0,
				distinctFailedIPsCount: 0,
				flaggedIPs: []
			};
		}
	}
};

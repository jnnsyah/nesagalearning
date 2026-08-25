import { db } from '../db';
import { pointLog, streakCounter } from '../db/schema/gamification';
import { attendance, pertemuan } from '../db/schema/session';
import { tahunAjaran } from '../db/schema/academic';
import { eq, and, asc, inArray, sum } from 'drizzle-orm';
import { calculateStreak, STREAK_MILESTONES } from './streak.service';
import { BadgeEvaluatorService } from './badge-evaluator.service';

export class PointsService {
	/**
	 * Helper to get active Periode ID
	 */
	static async getActivePeriodeId(): Promise<number | null> {
		const activePeriode = await db
			.select({ id: tahunAjaran.id })
			.from(tahunAjaran)
			.where(eq(tahunAjaran.isActive, true))
			.limit(1);
		return activePeriode.length > 0 ? activePeriode[0].id : null;
	}

	/**
	 * Dual-Track EXP stats: Lifetime EXP vs Seasonal Periode EXP
	 */
	static async getUserExpStats(userId: number, periodeIdInput?: number): Promise<{ lifetimeExp: number; seasonalExp: number }> {
		const currentPeriodeId = periodeIdInput ?? (await PointsService.getActivePeriodeId());

		const logs = await db
			.select({
				amount: pointLog.amount,
				periodeId: pointLog.periodeId
			})
			.from(pointLog)
			.where(eq(pointLog.userId, userId));

		const lifetimeExp = logs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
		const seasonalExp = currentPeriodeId
			? logs.filter((l) => l.periodeId === currentPeriodeId).reduce((acc, curr) => acc + (curr.amount || 0), 0)
			: lifetimeExp;

		return { lifetimeExp, seasonalExp };
	}

	/**
	 * Default base points for attendance
	 */
	static WEEKDAY_ATTENDANCE_POINTS = 100;
	static WEEKEND_ATTENDANCE_POINTS = 150; // +50% weekend bonus

	/**
	 * Award points for attendance and update the user's streak counter & streak milestones
	 */
	static async awardAttendancePoints(
		userId: number,
		kelasInstanceId: number,
		pertemuanId: number,
		isWeekend: boolean
	): Promise<{ pointsAwarded: number; currentStreak: number; milestoneBonusAwarded: number }> {
		const pointsAmount = isWeekend
			? PointsService.WEEKEND_ATTENDANCE_POINTS
			: PointsService.WEEKDAY_ATTENDANCE_POINTS;
		const source = isWeekend ? 'attendance_weekend' : 'attendance_weekday';
		const activePeriodeId = await PointsService.getActivePeriodeId();

		// 1. Log attendance base points (Idempotent: check if already logged)
		const existingPointLogs = await db
			.select({ id: pointLog.id })
			.from(pointLog)
			.where(
				and(
					eq(pointLog.userId, userId),
					eq(pointLog.kelasInstanceId, kelasInstanceId),
					inArray(pointLog.source, ['attendance_weekday', 'attendance_weekend']),
					eq(pointLog.referenceId, pertemuanId)
				)
			)
			.limit(1);

		if (existingPointLogs.length === 0) {
			await db.insert(pointLog).values({
				userId,
				kelasInstanceId,
				periodeId: activePeriodeId,
				source,
				amount: pointsAmount,
				referenceId: pertemuanId,
				referenceType: 'pertemuan',
				description: isWeekend
					? 'Presensi Hadir Sesi Weekend (+50% Bonus Poin)'
					: 'Presensi Hadir Sesi Weekday'
			});
		}

		// 2. Recalculate user streak in this kelasInstance
		const userAttendanceHistory = await db
			.select({
				status: attendance.status,
				sessionDate: pertemuan.sessionDate,
				recordedAt: attendance.recordedAt
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(attendance.userId, userId), eq(pertemuan.kelasInstanceId, kelasInstanceId)))
			.orderBy(asc(pertemuan.sessionDate), asc(attendance.recordedAt));

		const newStreak = calculateStreak(userAttendanceHistory);

		// 3. Get existing streak record
		const existingStreakRecords = await db
			.select()
			.from(streakCounter)
			.where(and(eq(streakCounter.userId, userId), eq(streakCounter.kelasInstanceId, kelasInstanceId)))
			.limit(1);

		let maxStreak = newStreak;
		if (existingStreakRecords.length > 0) {
			maxStreak = Math.max(existingStreakRecords[0].maxStreak, newStreak);
			await db
				.update(streakCounter)
				.set({
					currentStreak: newStreak,
					maxStreak,
					lastAttendedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(streakCounter.id, existingStreakRecords[0].id));
		} else {
			await db.insert(streakCounter).values({
				userId,
				kelasInstanceId,
				currentStreak: newStreak,
				maxStreak,
				lastAttendedAt: new Date()
			});
		}

		// 4. Check & award milestone bonuses if achieved
		let milestoneBonusAwarded = 0;
		const milestone = STREAK_MILESTONES.find((m) => m.streak === newStreak);

		if (milestone) {
			// Check if already claimed for this milestone
			const existingMilestoneLogs = await db
				.select({ id: pointLog.id })
				.from(pointLog)
				.where(
					and(
						eq(pointLog.userId, userId),
						eq(pointLog.kelasInstanceId, kelasInstanceId),
						eq(pointLog.source, 'streak_milestone'),
						eq(pointLog.referenceId, milestone.streak)
					)
				)
				.limit(1);

			if (existingMilestoneLogs.length === 0) {
				milestoneBonusAwarded = milestone.bonusPoints;
				await db.insert(pointLog).values({
					userId,
					kelasInstanceId,
					periodeId: activePeriodeId,
					source: 'streak_milestone',
					amount: milestone.bonusPoints,
					referenceId: milestone.streak,
					referenceType: 'streak',
					description: `Bonus Streak ${milestone.streak} Pertemuan Beruntun (+${milestone.bonusPoints} Poin)`
				});
			}
		}

		await BadgeEvaluatorService.evaluateAndAwardBadges(userId);

		return {
			pointsAwarded: pointsAmount,
			currentStreak: newStreak,
			milestoneBonusAwarded
		};
	}

	/**
	 * Recalculate streak when an excused / manual non-hadir status is recorded
	 */
	static async updateStreakForStatus(
		userId: number,
		kelasInstanceId: number
	): Promise<number> {
		const userAttendanceHistory = await db
			.select({
				status: attendance.status,
				sessionDate: pertemuan.sessionDate,
				recordedAt: attendance.recordedAt
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(attendance.userId, userId), eq(pertemuan.kelasInstanceId, kelasInstanceId)))
			.orderBy(asc(pertemuan.sessionDate), asc(attendance.recordedAt));

		const newStreak = calculateStreak(userAttendanceHistory);

		const existingStreakRecords = await db
			.select()
			.from(streakCounter)
			.where(and(eq(streakCounter.userId, userId), eq(streakCounter.kelasInstanceId, kelasInstanceId)))
			.limit(1);

		if (existingStreakRecords.length > 0) {
			await db
				.update(streakCounter)
				.set({
					currentStreak: newStreak,
					updatedAt: new Date()
				})
				.where(eq(streakCounter.id, existingStreakRecords[0].id));
		} else {
			await db.insert(streakCounter).values({
				userId,
				kelasInstanceId,
				currentStreak: newStreak,
				maxStreak: newStreak
			});
		}

		return newStreak;
	}

	/**
	 * Award points for approved task submission
	 */
	static async awardTaskPoints(
		userId: number,
		kelasInstanceId: number | null | undefined,
		taskId: number,
		taskSize: string = 'sedang'
	): Promise<number> {
		if (!userId || !kelasInstanceId || !taskId) {
			console.warn(
				`[PointsService] Missing parameters for awardTaskPoints: userId=${userId}, kelasInstanceId=${kelasInstanceId}, taskId=${taskId}`
			);
			return 0;
		}

		let amount = 100;
		let source = 'task_sedang';
		if (taskSize === 'kecil') {
			amount = 50;
			source = 'task_kecil';
		} else if (taskSize === 'besar') {
			amount = 200;
			source = 'task_besar';
		}

		const taskSources = ['task_kecil', 'task_sedang', 'task_besar', 'task_approved'];

		// Check if task points already awarded (idempotent)
		const existingLogs = await db
			.select({
				id: pointLog.id,
				amount: pointLog.amount
			})
			.from(pointLog)
			.where(
				and(
					eq(pointLog.userId, userId),
					eq(pointLog.kelasInstanceId, kelasInstanceId),
					inArray(pointLog.source, taskSources),
					eq(pointLog.referenceId, taskId)
				)
			)
			.limit(1);

		if (existingLogs.length > 0) {
			return existingLogs[0].amount;
		}

		const activePeriodeId = await PointsService.getActivePeriodeId();

		await db.insert(pointLog).values({
			userId,
			kelasInstanceId,
			periodeId: activePeriodeId,
			source,
			amount,
			referenceId: taskId,
			referenceType: 'task',
			description: `Tugas Disetujui (${taskSize.toUpperCase()}) (+${amount} Poin)`
		});

		return amount;
	}
}


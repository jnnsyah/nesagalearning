import { db } from '../db';
import { user as userTable } from '../db/schema/auth';
import { pointLog, streakCounter, badge, badgeType } from '../db/schema/gamification';
import { submission } from '../db/schema/task';
import { attendance } from '../db/schema/session';
import { eq, and, sum, count } from 'drizzle-orm';

export interface AwardedBadgeResult {
	id: number;
	name: string;
	description: string | null;
	iconUrl: string | null;
	triggerType: string;
	triggerThreshold: number;
	earnedAt: Date;
}

export const BadgeEvaluatorService = {
	/**
	 * Evaluates all badge triggers for a user and auto-awards any eligible unearned badges.
	 */
	async evaluateAndAwardBadges(userId: number): Promise<AwardedBadgeResult[]> {
		try {
			// 1. Get existing badges earned by user
			const existingBadges = await db
				.select({ badgeTypeId: badge.badgeTypeId })
				.from(badge)
				.where(eq(badge.userId, userId));
			const earnedTypeIds = new Set(existingBadges.map((b) => b.badgeTypeId));

			// 2. Fetch all available badge types
			const allBadgeTypes = await db.select().from(badgeType);
			const unearnedBadgeTypes = allBadgeTypes.filter((bt) => !earnedTypeIds.has(bt.id));

			if (unearnedBadgeTypes.length === 0) {
				return [];
			}

			// 3. Compute user stats for evaluation
			// Total Points
			const [pointsRes] = await db
				.select({ total: sum(pointLog.amount) })
				.from(pointLog)
				.where(eq(pointLog.userId, userId));
			const totalPoints = Number(pointsRes?.total ?? 0);

			// Max Streak / Current Streak
			const streaks = await db
				.select({ maxStreak: streakCounter.maxStreak, currentStreak: streakCounter.currentStreak })
				.from(streakCounter)
				.where(eq(streakCounter.userId, userId));
			let maxStreak = 0;
			for (const s of streaks) {
				if (s.maxStreak > maxStreak) maxStreak = s.maxStreak;
				if (s.currentStreak > maxStreak) maxStreak = s.currentStreak;
			}

			// Attendance Count
			const [attendanceRes] = await db
				.select({ total: count(attendance.id) })
				.from(attendance)
				.where(and(eq(attendance.userId, userId), eq(attendance.status, 'hadir')));
			const attendanceCount = Number(attendanceRes?.total ?? 0);

			// Approved Tasks Count
			const [tasksRes] = await db
				.select({ total: count(submission.id) })
				.from(submission)
				.where(and(eq(submission.userId, userId), eq(submission.status, 'approved')));
			const approvedTasksCount = Number(tasksRes?.total ?? 0);

			const newlyAwardedBadges: AwardedBadgeResult[] = [];

			// 4. Evaluate each unearned badge type
			for (const bt of unearnedBadgeTypes) {
				let isEligible = false;

				switch (bt.triggerType) {
					case 'streak_milestone':
						if (bt.triggerThreshold > 0 && maxStreak >= bt.triggerThreshold) {
							isEligible = true;
						}
						break;
					case 'total_points':
						if (bt.triggerThreshold > 0 && totalPoints >= bt.triggerThreshold) {
							isEligible = true;
						}
						break;
					case 'attendance_count':
						if (bt.triggerThreshold > 0 && attendanceCount >= bt.triggerThreshold) {
							isEligible = true;
						}
						break;
					case 'tasks_approved':
						if (bt.triggerThreshold > 0 && approvedTasksCount >= bt.triggerThreshold) {
							isEligible = true;
						}
						break;
					default:
						// manual_award -> not auto-awarded
						isEligible = false;
						break;
				}

				if (isEligible) {
					const [newBadge] = await db
						.insert(badge)
						.values({
							userId,
							badgeTypeId: bt.id,
							earnedAt: new Date()
						})
						.onConflictDoNothing()
						.returning();

					if (newBadge) {
						newlyAwardedBadges.push({
							id: bt.id,
							name: bt.name,
							description: bt.description,
							iconUrl: bt.iconUrl,
							triggerType: bt.triggerType,
							triggerThreshold: bt.triggerThreshold,
							earnedAt: newBadge.earnedAt
						});
					}
				}
			}

			return newlyAwardedBadges;
		} catch (error) {
			console.error('[BadgeEvaluatorService.evaluateAndAwardBadges error]:', error);
			return [];
		}
	}
};

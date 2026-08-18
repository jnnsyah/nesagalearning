import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { badgeType, badge, pointLog } from '$lib/server/db/schema/gamification';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { user } from '$lib/server/db/schema/auth';
import { eq, and, desc, sum } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = Number(locals.user.id);

	// 1. Fetch student active class membership
	const [membership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	const kelasInstanceId = membership?.kelasInstanceId;

	// 2. Fetch all badge types available in system
	const allBadgeTypes = await db
		.select({
			id: badgeType.id,
			name: badgeType.name,
			description: badgeType.description,
			iconUrl: badgeType.iconUrl,
			criteria: badgeType.criteria,
			triggerType: badgeType.triggerType,
			triggerThreshold: badgeType.triggerThreshold
		})
		.from(badgeType)
		.orderBy(badgeType.id);

	// 3. Fetch badges earned by current student
	const userEarnedBadges = await db
		.select({
			id: badge.id,
			badgeTypeId: badge.badgeTypeId,
			earnedAt: badge.earnedAt
		})
		.from(badge)
		.where(eq(badge.userId, userId));

	const earnedMap = new Map(userEarnedBadges.map((b) => [b.badgeTypeId, b.earnedAt]));

	const badgeGallery = allBadgeTypes.map((bt) => {
		const earnedAt = earnedMap.get(bt.id);
		return {
			...bt,
			isUnlocked: !!earnedAt,
			earnedAt: earnedAt || null
		};
	});

	// 4. Fetch class leaderboard
	let leaderboard: Array<{
		rank: number;
		userId: number;
		fullName: string;
		avatarUrl: string | null;
		totalPoints: number;
		isCurrentUser: boolean;
	}> = [];

	let userRank = 0;
	let userTotalPoints = 0;

	if (kelasInstanceId) {
		const pointSums = await db
			.select({
				userId: pointLog.userId,
				fullName: user.fullName,
				avatarUrl: user.avatarUrl,
				totalPoints: sum(pointLog.amount)
			})
			.from(pointLog)
			.innerJoin(user, eq(pointLog.userId, user.id))
			.where(eq(pointLog.kelasInstanceId, kelasInstanceId))
			.groupBy(pointLog.userId, user.fullName, user.avatarUrl)
			.orderBy(desc(sum(pointLog.amount)));

		leaderboard = pointSums.map((row, idx) => {
			const pts = Number(row.totalPoints) || 0;
			const isCurrent = row.userId === userId;
			if (isCurrent) {
				userRank = idx + 1;
				userTotalPoints = pts;
			}
			return {
				rank: idx + 1,
				userId: row.userId,
				fullName: row.fullName,
				avatarUrl: row.avatarUrl,
				totalPoints: pts,
				isCurrentUser: isCurrent
			};
		});
	}

	return {
		user: locals.user,
		membership,
		badgeGallery,
		leaderboard,
		userRank,
		userTotalPoints,
		earnedBadgesCount: userEarnedBadges.length,
		totalBadgesCount: allBadgeTypes.length
	};
};

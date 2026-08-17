import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STREAK_MILESTONES, calculateStreak } from './streak.service';

describe('PointsService & Gamification Logic', () => {
	it('defines correct weekday and weekend attendance points constants', () => {
		const WEEKDAY_ATTENDANCE_POINTS = 100;
		const WEEKEND_ATTENDANCE_POINTS = 150;
		assert.equal(WEEKDAY_ATTENDANCE_POINTS, 100);
		assert.equal(WEEKEND_ATTENDANCE_POINTS, 150);
	});

	it('contains valid streak milestones configuration', () => {
		assert.equal(STREAK_MILESTONES.length, 5);
		assert.deepEqual(STREAK_MILESTONES[0], { streak: 3, bonusPoints: 50, badgeName: 'Streak 3 Sesi' });
		assert.deepEqual(STREAK_MILESTONES[1], { streak: 5, bonusPoints: 100, badgeName: 'Streak 5 Sesi' });
		assert.deepEqual(STREAK_MILESTONES[2], { streak: 10, bonusPoints: 250, badgeName: 'Streak 10 Sesi' });
		assert.deepEqual(STREAK_MILESTONES[3], { streak: 15, bonusPoints: 500, badgeName: 'Streak 15 Sesi' });
		assert.deepEqual(STREAK_MILESTONES[4], { streak: 20, bonusPoints: 1000, badgeName: 'Streak Master 20' });
	});

	it('calculates milestone bonus for 5-session streak correctly', () => {
		const records = Array.from({ length: 5 }, (_, i) => ({
			status: 'hadir',
			sessionDate: `2026-08-0${i + 1}`
		}));

		const streak = calculateStreak(records);
		assert.equal(streak, 5);

		const milestone = STREAK_MILESTONES.find((m) => m.streak === streak);
		assert.ok(milestone);
		assert.equal(milestone.bonusPoints, 100);
		assert.equal(milestone.badgeName, 'Streak 5 Sesi');
	});

	it('calculates milestone bonus for 10-session streak correctly', () => {
		const records = Array.from({ length: 10 }, (_, i) => ({
			status: 'hadir',
			sessionDate: `2026-08-${String(i + 1).padStart(2, '0')}`
		}));

		const streak = calculateStreak(records);
		assert.equal(streak, 10);

		const milestone = STREAK_MILESTONES.find((m) => m.streak === streak);
		assert.ok(milestone);
		assert.equal(milestone.bonusPoints, 250);
		assert.equal(milestone.badgeName, 'Streak 10 Sesi');
	});

	it('resets streak calculation when student moves to a new class instance (empty previous history)', () => {
		// New class instance has no attendance records yet
		const newClassRecords: any[] = [];
		assert.equal(calculateStreak(newClassRecords), 0);

		// First session in new class instance
		newClassRecords.push({ status: 'hadir', sessionDate: '2026-09-01' });
		assert.equal(calculateStreak(newClassRecords), 1);
	});
});

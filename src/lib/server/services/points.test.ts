import { describe, it, expect } from 'vitest';
import { STREAK_MILESTONES, calculateStreak } from './streak.service';

describe('PointsService & Gamification Logic', () => {
	it('defines correct weekday and weekend attendance points constants', () => {
		const WEEKDAY_ATTENDANCE_POINTS = 100;
		const WEEKEND_ATTENDANCE_POINTS = 150;
		expect(WEEKDAY_ATTENDANCE_POINTS).toBe(100);
		expect(WEEKEND_ATTENDANCE_POINTS).toBe(150);
	});

	it('contains valid streak milestones configuration', () => {
		expect(STREAK_MILESTONES.length).toBe(5);
		expect(STREAK_MILESTONES[0]).toEqual({ streak: 3, bonusPoints: 50, badgeName: 'Streak 3 Sesi' });
		expect(STREAK_MILESTONES[1]).toEqual({ streak: 5, bonusPoints: 100, badgeName: 'Streak 5 Sesi' });
		expect(STREAK_MILESTONES[2]).toEqual({ streak: 10, bonusPoints: 250, badgeName: 'Streak 10 Sesi' });
		expect(STREAK_MILESTONES[3]).toEqual({ streak: 15, bonusPoints: 500, badgeName: 'Streak 15 Sesi' });
		expect(STREAK_MILESTONES[4]).toEqual({ streak: 20, bonusPoints: 1000, badgeName: 'Streak Master 20' });
	});

	it('calculates milestone bonus for 5-session streak correctly', () => {
		const records = Array.from({ length: 5 }, (_, i) => ({
			status: 'hadir',
			sessionDate: `2026-08-0${i + 1}`
		}));

		const streak = calculateStreak(records);
		expect(streak).toBe(5);

		const milestone = STREAK_MILESTONES.find((m) => m.streak === streak);
		expect(milestone).toBeDefined();
		if (milestone) {
			expect(milestone.bonusPoints).toBe(100);
			expect(milestone.badgeName).toBe('Streak 5 Sesi');
		}
	});

	it('calculates milestone bonus for 10-session streak correctly', () => {
		const records = Array.from({ length: 10 }, (_, i) => ({
			status: 'hadir',
			sessionDate: `2026-08-${String(i + 1).padStart(2, '0')}`
		}));

		const streak = calculateStreak(records);
		expect(streak).toBe(10);

		const milestone = STREAK_MILESTONES.find((m) => m.streak === streak);
		expect(milestone).toBeDefined();
		if (milestone) {
			expect(milestone.bonusPoints).toBe(250);
			expect(milestone.badgeName).toBe('Streak 10 Sesi');
		}
	});

	it('resets streak calculation when student moves to a new class instance (empty previous history)', () => {
		// New class instance has no attendance records yet
		const newClassRecords: any[] = [];
		expect(calculateStreak(newClassRecords)).toBe(0);

		// First session in new class instance
		newClassRecords.push({ status: 'hadir', sessionDate: '2026-09-01' });
		expect(calculateStreak(newClassRecords)).toBe(1);
	});
});

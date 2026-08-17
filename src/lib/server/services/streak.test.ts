import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak } from './streak.service';

describe('calculateStreak', () => {
	it('returns 0 for empty attendance records', () => {
		assert.equal(calculateStreak([]), 0);
	});

	it('increases streak normally for consecutive hadir on weekdays', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-03' },
			{ status: 'hadir', sessionDate: '2026-08-04' },
			{ status: 'hadir', sessionDate: '2026-08-05' }
		];
		assert.equal(calculateStreak(records), 3);
	});

	it('calculates chronologically when mixing weekday and weekend sessions', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-07' }, // Friday
			{ status: 'hadir', sessionDate: '2026-08-08' }, // Saturday (weekend)
			{ status: 'hadir', sessionDate: '2026-08-10' }  // Monday
		];
		assert.equal(calculateStreak(records), 3);
	});

	it('breaks streak and resets to 0 when student is absent (absen)', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-03' },
			{ status: 'hadir', sessionDate: '2026-08-04' },
			{ status: 'absen', sessionDate: '2026-08-05' }
		];
		assert.equal(calculateStreak(records), 0);
	});

	it('breaks streak when student has excused (excused) in the middle', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-03' },
			{ status: 'hadir', sessionDate: '2026-08-04' },
			{ status: 'excused', sessionDate: '2026-08-05' }
		];
		assert.equal(calculateStreak(records), 0);
	});

	it('resets streak on excused then builds new streak upon next hadir', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-01' },
			{ status: 'hadir', sessionDate: '2026-08-02' },
			{ status: 'excused', sessionDate: '2026-08-03' }, // streak resets to 0
			{ status: 'hadir', sessionDate: '2026-08-04' },   // streak = 1
			{ status: 'hadir', sessionDate: '2026-08-05' }    // streak = 2
		];
		assert.equal(calculateStreak(records), 2);
	});

	it('handles new student joining mid-term starting from their first attendance', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-15' },
			{ status: 'hadir', sessionDate: '2026-08-16' }
		];
		assert.equal(calculateStreak(records), 2);
	});

	it('handles two sessions on the same day correctly', () => {
		const records = [
			{ status: 'hadir', sessionDate: '2026-08-10 08:00' },
			{ status: 'hadir', sessionDate: '2026-08-10 13:00' },
			{ status: 'hadir', sessionDate: '2026-08-11 08:00' }
		];
		assert.equal(calculateStreak(records), 3);
	});
});

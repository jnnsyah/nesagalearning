export interface AttendanceRecordForStreak {
	status: 'hadir' | 'excused' | 'absen' | string;
	sessionDate?: string | Date;
	recordedAt?: Date | string;
}

/**
 * Pure function to calculate current attendance streak from a chronologically sorted list of attendance records.
 *
 * Rules:
 * - 'hadir': increments active streak (+1)
 * - 'excused': BREAKS streak (resets current streak to 0). Note: Excused absences preserve sub-phase completion,
 *   but DO NOT preserve attendance streaks per PRD & Architecture specs.
 * - 'absen' or any other status: BREAKS streak (resets current streak to 0).
 */
export function calculateStreak(records: AttendanceRecordForStreak[]): number {
	if (!records || records.length === 0) {
		return 0;
	}

	let currentStreak = 0;

	for (const record of records) {
		if (record.status === 'hadir') {
			currentStreak += 1;
		} else {
			// Both 'excused' and 'absen' break the consecutive attendance streak
			currentStreak = 0;
		}
	}

	return currentStreak;
}

export const STREAK_MILESTONES = [
	{ streak: 3, bonusPoints: 50, badgeName: 'Streak 3 Sesi' },
	{ streak: 5, bonusPoints: 100, badgeName: 'Streak 5 Sesi' },
	{ streak: 10, bonusPoints: 250, badgeName: 'Streak 10 Sesi' },
	{ streak: 15, bonusPoints: 500, badgeName: 'Streak 15 Sesi' },
	{ streak: 20, bonusPoints: 1000, badgeName: 'Streak Master 20' }
] as const;

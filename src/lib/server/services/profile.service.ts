import { db } from '../db';
import { user as userTable } from '../db/schema/auth';
import {
	keanggotaan,
	kelasInstance,
	tahunAjaran,
	mentorAssignment
} from '../db/schema/academic';
import { curriculumTrack } from '../db/schema/curriculum';
import { pointLog, streakCounter, badge, badgeType } from '../db/schema/gamification';
import { task, submission } from '../db/schema/task';
import { attendance, pertemuan } from '../db/schema/session';
import { avatar as avatarTable } from '../db/schema/system';
import { eq, and, sum, count, sql, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { PointsService } from './points.service';
import { BadgeEvaluatorService } from './badge-evaluator.service';

export interface PointLogItem {
	id: number;
	source: string;
	amount: number;
	referenceId: number | null;
	referenceType: string | null;
	description: string | null;
	createdAt: Date;
}

export interface PaginatedPointLogs {
	items: PointLogItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface ProfileUserStats {
	role: 'admin' | 'guru' | 'mentor' | 'siswa' | string;

	// Siswa Stats
	totalPoints?: number;
	currentStreak?: number;
	maxStreak?: number;
	earnedBadges?: { id: number; name: string; description: string | null; iconUrl: string | null; earnedAt: Date }[];
	kelasName?: string;
	tahunAjaranName?: string;
	trackName?: string;
	submissionsCount?: number;
	approvedSubmissionsCount?: number;
	attendanceCount?: number;

	// Mentor Stats
	assignedClasses?: { id: number; name: string; tahunAjaran: string; track: string; studentCount: number }[];
	totalStudentsCount?: number;
	totalMeetingsConducted?: number;
	reviewedSubmissionsCount?: number;

	// Guru Stats
	monitoredClassesCount?: number;
	monitoredStudentsCount?: number;
	activeTracksCount?: number;
	totalSessionsHeld?: number;

	// Admin Stats
	totalUsersCount?: number;
	roleBreakdown?: Record<string, number>;
	activeTahunAjaranName?: string;
	totalActiveClasses?: number;
	activeSessionsCount?: number;
}

export interface ProfileData {
	user: {
		id: number;
		username: string;
		email: string | null;
		fullName: string;
		role: string;
		avatarUrl: string | null;
		isActive: boolean;
		createdAt: Date;
		nisn: string | null;
	};
	stats: ProfileUserStats;
	pointLogs?: PaginatedPointLogs;
	availableAvatars?: { id: number; name: string; imageUrl: string }[];
}

export const ProfileService = {
	/**
	 * Auto-sync missing point logs for approved task submissions
	 */
	async syncApprovedTaskPoints(userId: number): Promise<void> {
		try {
			const approvedSubmissions = await db
				.select({
					id: submission.id,
					taskId: submission.taskId,
					taskSize: task.taskSize,
					kelasInstanceId: pertemuan.kelasInstanceId
				})
				.from(submission)
				.innerJoin(task, eq(submission.taskId, task.id))
				.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
				.where(and(eq(submission.userId, userId), eq(submission.status, 'approved')));

			for (const sub of approvedSubmissions) {
				let kelasId = sub.kelasInstanceId;
				if (!kelasId) {
					const [member] = await db
						.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
						.from(keanggotaan)
						.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));
					if (member) kelasId = member.kelasInstanceId;
				}

				if (kelasId) {
					const taskSize = sub.taskSize || 'sedang';
					await PointsService.awardTaskPoints(userId, kelasId, sub.taskId, taskSize);
				}
			}
		} catch (err) {
			console.error('Failed to sync approved task points for user:', userId, err);
		}
	},

	/**
	 * Fetches user profile data & role-specific stats
	 */
	async getUserProfileData(userId: number, pointLogPage: number = 1, pointLogLimit: number = 10): Promise<ProfileData | null> {
		const [userRecord] = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				email: userTable.email,
				fullName: userTable.fullName,
				role: userTable.role,
				avatarUrl: userTable.avatarUrl,
				isActive: userTable.isActive,
				createdAt: userTable.createdAt,
				nisn: userTable.nisn
			})
			.from(userTable)
			.where(eq(userTable.id, userId));

		if (!userRecord) return null;

		const role = userRecord.role;
		const stats: ProfileUserStats = { role };
		let pointLogsData: PaginatedPointLogs | undefined = undefined;

		if (role === 'siswa') {
			// 0. Auto-sync missing point logs & evaluate badge triggers
			await this.syncApprovedTaskPoints(userId);
			await BadgeEvaluatorService.evaluateAndAwardBadges(userId);
			// 1. Class membership details
			const [membership] = await db
				.select({
					kelasName: kelasInstance.name,
					tahunAjaranName: tahunAjaran.name,
					trackName: curriculumTrack.title
				})
				.from(keanggotaan)
				.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
				.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
				.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
				.where(eq(keanggotaan.userId, userId));

			if (membership) {
				stats.kelasName = membership.kelasName;
				stats.tahunAjaranName = membership.tahunAjaranName;
				stats.trackName = membership.trackName;
			}

			// 2. Points sum
			const [pointsRes] = await db
				.select({ total: sum(pointLog.amount) })
				.from(pointLog)
				.where(eq(pointLog.userId, userId));

			stats.totalPoints = pointsRes?.total ? Number(pointsRes.total) : 0;

			// 3. Streak
			const [streakRes] = await db
				.select({
					currentStreak: streakCounter.currentStreak,
					maxStreak: streakCounter.maxStreak
				})
				.from(streakCounter)
				.where(eq(streakCounter.userId, userId));

			stats.currentStreak = streakRes?.currentStreak ?? 0;
			stats.maxStreak = streakRes?.maxStreak ?? 0;

			// 4. Badges
			const userBadges = await db
				.select({
					id: badge.id,
					name: badgeType.name,
					description: badgeType.description,
					iconUrl: badgeType.iconUrl,
					earnedAt: badge.earnedAt
				})
				.from(badge)
				.innerJoin(badgeType, eq(badge.badgeTypeId, badgeType.id))
				.where(eq(badge.userId, userId));

			stats.earnedBadges = userBadges;

			// 5. Submissions count
			const [subTotalRes] = await db
				.select({ total: count(submission.id) })
				.from(submission)
				.where(eq(submission.userId, userId));

			const [subApprovedRes] = await db
				.select({ total: count(submission.id) })
				.from(submission)
				.where(sql`${submission.userId} = ${userId} AND ${submission.status} = 'approved'`);

			stats.submissionsCount = Number(subTotalRes?.total ?? 0);
			stats.approvedSubmissionsCount = Number(subApprovedRes?.total ?? 0);

			// 6. Attendance count
			const [attendRes] = await db
				.select({ total: count(attendance.id) })
				.from(attendance)
				.where(eq(attendance.userId, userId));

			stats.attendanceCount = Number(attendRes?.total ?? 0);

			// 7. Paginated Point Logs for large data safety
			pointLogsData = await this.getPaginatedPointLogs(userId, pointLogPage, pointLogLimit);
		} else if (role === 'mentor') {
			// Assigned classes
			const assignments = await db
				.select({
					classId: kelasInstance.id,
					className: kelasInstance.name,
					tahunAjaran: tahunAjaran.name,
					track: curriculumTrack.title
				})
				.from(mentorAssignment)
				.innerJoin(kelasInstance, eq(mentorAssignment.kelasInstanceId, kelasInstance.id))
				.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
				.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
				.where(eq(mentorAssignment.userId, userId));

			let totalStudents = 0;
			let totalMeetings = 0;

			const classList = [];
			for (const cls of assignments) {
				const [studentCountRes] = await db
					.select({ total: count(keanggotaan.id) })
					.from(keanggotaan)
					.where(sql`${keanggotaan.kelasInstanceId} = ${cls.classId} AND ${keanggotaan.status} = 'aktif'`);

				const [meetingCountRes] = await db
					.select({ total: count(pertemuan.id) })
					.from(pertemuan)
					.where(eq(pertemuan.kelasInstanceId, cls.classId));

				const countS = Number(studentCountRes?.total ?? 0);
				const countM = Number(meetingCountRes?.total ?? 0);

				totalStudents += countS;
				totalMeetings += countM;

				classList.push({
					id: cls.classId,
					name: cls.className,
					tahunAjaran: cls.tahunAjaran,
					track: cls.track,
					studentCount: countS
				});
			}

			stats.assignedClasses = classList;
			stats.totalStudentsCount = totalStudents;
			stats.totalMeetingsConducted = totalMeetings;

			// Submissions reviewed
			const [reviewedRes] = await db
				.select({ total: count(submission.id) })
				.from(submission)
				.where(eq(submission.reviewedBy, userId));

			stats.reviewedSubmissionsCount = Number(reviewedRes?.total ?? 0);
		} else if (role === 'guru') {
			// 1. Monitored classes (active)
			const [classesRes] = await db
				.select({ total: count(kelasInstance.id) })
				.from(kelasInstance)
				.where(eq(kelasInstance.isActive, true));

			stats.monitoredClassesCount = Number(classesRes?.total ?? 0);

			// 2. Monitored students (active)
			const [studentsRes] = await db
				.select({ total: count(keanggotaan.id) })
				.from(keanggotaan)
				.where(eq(keanggotaan.status, 'aktif'));

			stats.monitoredStudentsCount = Number(studentsRes?.total ?? 0);

			// 3. Tracks
			const [tracksRes] = await db
				.select({ total: count(curriculumTrack.id) })
				.from(curriculumTrack);

			stats.activeTracksCount = Number(tracksRes?.total ?? 0);

			// 4. Sessions
			const [sessionsRes] = await db.select({ total: count(pertemuan.id) }).from(pertemuan);

			stats.totalSessionsHeld = Number(sessionsRes?.total ?? 0);
		} else if (role === 'admin') {
			// 1. Total users
			const [usersRes] = await db.select({ total: count(userTable.id) }).from(userTable);
			stats.totalUsersCount = Number(usersRes?.total ?? 0);

			// 2. Role breakdown
			const roleCounts = await db
				.select({
					role: userTable.role,
					total: count(userTable.id)
				})
				.from(userTable)
				.groupBy(userTable.role);

			const breakdown: Record<string, number> = {};
			for (const rc of roleCounts) {
				breakdown[rc.role] = Number(rc.total);
			}
			stats.roleBreakdown = breakdown;

			// 3. Active Tahun Ajaran
			const [taRes] = await db
				.select({ name: tahunAjaran.name })
				.from(tahunAjaran)
				.where(eq(tahunAjaran.isActive, true));

			stats.activeTahunAjaranName = taRes?.name ?? 'Belum ada TA aktif';

			// 4. Active classes
			const [classesRes] = await db
				.select({ total: count(kelasInstance.id) })
				.from(kelasInstance)
				.where(eq(kelasInstance.isActive, true));

			stats.totalActiveClasses = Number(classesRes?.total ?? 0);

			// 5. Total meetings
			const [sessionsRes] = await db.select({ total: count(pertemuan.id) }).from(pertemuan);
			stats.activeSessionsCount = Number(sessionsRes?.total ?? 0);
		}

		let availableAvatars: { id: number; name: string; imageUrl: string }[] = [];
		try {
			availableAvatars = await db
				.select({ id: avatarTable.id, name: avatarTable.name, imageUrl: avatarTable.imageUrl })
				.from(avatarTable)
				.orderBy(desc(avatarTable.createdAt));
		} catch (e) {
			console.error('[getUserProfileData avatar query error]:', e);
		}

		return {
			user: userRecord,
			stats,
			pointLogs: pointLogsData,
			availableAvatars
		};
	},

	/**
	 * Paginated query for point logs history, handling large data out-of-the-box
	 */
	async getPaginatedPointLogs(
		userId: number,
		page: number = 1,
		limit: number = 10
	): Promise<PaginatedPointLogs> {
		const safePage = Math.max(1, page);
		const safeLimit = Math.min(50, Math.max(1, limit));
		const offset = (safePage - 1) * safeLimit;

		const [countResult] = await db
			.select({ total: count(pointLog.id) })
			.from(pointLog)
			.where(eq(pointLog.userId, userId));

		const total = Number(countResult?.total ?? 0);
		const totalPages = Math.ceil(total / safeLimit) || 1;

		const items = await db
			.select({
				id: pointLog.id,
				source: pointLog.source,
				amount: pointLog.amount,
				referenceId: pointLog.referenceId,
				referenceType: pointLog.referenceType,
				description: pointLog.description,
				createdAt: pointLog.createdAt
			})
			.from(pointLog)
			.where(eq(pointLog.userId, userId))
			.orderBy(sql`${pointLog.createdAt} DESC`)
			.limit(safeLimit)
			.offset(offset);

		return {
			items,
			total,
			page: safePage,
			limit: safeLimit,
			totalPages
		};
	},

	/**
	 * Updates profile details (Full Name, Email, Avatar URL)
	 */
	async updateProfileInfo(
		userId: number,
		input: { fullName: string; email?: string | null; avatarUrl?: string | null }
	): Promise<{ success: boolean; message?: string }> {
		const [existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.id, userId));

		if (!existing) {
			return { success: false, message: 'User tidak ditemukan' };
		}

		// Check if email already used by another user
		if (input.email && input.email.trim() !== '') {
			const [emailCheck] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.email, input.email.trim()));

			if (emailCheck && emailCheck.id !== userId) {
				return { success: false, message: 'Email sudah digunakan oleh akun lain' };
			}
		}

		await db
			.update(userTable)
			.set({
				fullName: input.fullName.trim(),
				email: input.email && input.email.trim() !== '' ? input.email.trim() : null,
				avatarUrl: input.avatarUrl !== undefined ? (input.avatarUrl && input.avatarUrl.trim() !== '' ? input.avatarUrl.trim() : null) : undefined,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId));

		return { success: true, message: 'Profil berhasil diperbarui' };
	},

	/**
	 * Updates user password with current password verification
	 */
	async updatePassword(
		userId: number,
		input: { currentPassword: string; newPassword: string }
	): Promise<{ success: boolean; message?: string }> {
		const [userRecord] = await db
			.select({
				id: userTable.id,
				passwordHash: userTable.passwordHash
			})
			.from(userTable)
			.where(eq(userTable.id, userId));

		if (!userRecord) {
			return { success: false, message: 'User tidak ditemukan' };
		}

		const isMatch = await bcrypt.compare(input.currentPassword, userRecord.passwordHash);
		if (!isMatch) {
			return { success: false, message: 'Password saat ini tidak sesuai' };
		}

		const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

		await db
			.update(userTable)
			.set({
				passwordHash: newPasswordHash,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId));

		return { success: true, message: 'Password berhasil diperbarui' };
	}
};

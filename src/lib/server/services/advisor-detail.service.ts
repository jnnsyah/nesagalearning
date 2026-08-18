import { db } from '$lib/server/db';
import {
	user,
	keanggotaan,
	kelasInstance,
	tahunAjaran,
	tingkat,
	pertemuan,
	attendance,
	task,
	submission,
	streakCounter,
	pointLog,
	advisorNote
} from '$lib/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { evaluateStudentHealth } from './class-health.service';

export interface AdvisorStudentDetail {
	student: {
		id: number;
		fullName: string;
		username: string;
		avatarUrl: string | null;
		kelasId: number;
		kelasName: string;
		tahunAjaranName: string;
		tingkatName: string;
		membershipStatus: string;
	};
	summary: {
		totalSessions: number;
		attendedCount: number;
		attendanceRate: number;
		totalTasks: number;
		approvedTasksCount: number;
		taskCompletionRate: number;
		currentStreak: number;
		maxStreak: number;
		totalPoints: number;
		riskLevel: 'SEHAT' | 'WASPADA' | 'KRITIS';
		alertReasons: string[];
	};
	notes: Array<{
		id: number;
		note: string;
		category: string;
		createdAt: Date;
		advisorId: number;
		advisorName: string;
		advisorAvatar: string | null;
	}>;
	attendanceLogs: Array<{
		id: number;
		sessionTitle: string;
		sessionDate: string;
		status: string;
		method: string;
		manualReason: string | null;
		recordedAt: Date;
	}>;
	submissionLogs: Array<{
		id: number;
		taskTitle: string;
		link: string;
		status: string;
		feedback: string | null;
		submittedAt: Date;
		reviewedAt: Date | null;
	}>;
}

export const AdvisorDetailService = {
	/**
	 * Get comprehensive student detail data for Advisor view
	 */
	async getStudentDetail(studentId: number): Promise<AdvisorStudentDetail | null> {
		// 1. Get student profile & membership
		const [studentData] = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				avatarUrl: user.avatarUrl,
				kelasId: keanggotaan.kelasInstanceId,
				kelasName: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name,
				membershipStatus: keanggotaan.status
			})
			.from(user)
			.innerJoin(keanggotaan, eq(keanggotaan.userId, user.id))
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(user.id, studentId))
			.limit(1);

		if (!studentData) {
			return null;
		}

		const kelasId = studentData.kelasId;

		// 2. Attendance Stats & History
		const sessions = await db
			.select({ id: pertemuan.id })
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, kelasId));

		const totalSessions = sessions.length;

		const attendanceRecords = await db
			.select({
				id: attendance.id,
				sessionTitle: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				status: attendance.status,
				method: attendance.method,
				manualReason: attendance.manualReason,
				recordedAt: attendance.recordedAt
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(attendance.userId, studentId), eq(pertemuan.kelasInstanceId, kelasId)))
			.orderBy(desc(attendance.recordedAt));

		const attendedCount = attendanceRecords.filter((a) => a.status === 'hadir').length;
		const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

		// 3. Task Stats & History
		const classTasks = await db
			.select({ id: task.id })
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(eq(pertemuan.kelasInstanceId, kelasId));

		const totalTasks = classTasks.length;

		const userSubmissions = await db
			.select({
				id: submission.id,
				taskTitle: task.title,
				link: submission.link,
				status: submission.status,
				feedback: submission.feedback,
				submittedAt: submission.submittedAt,
				reviewedAt: submission.reviewedAt
			})
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(and(eq(submission.userId, studentId), eq(pertemuan.kelasInstanceId, kelasId)))
			.orderBy(desc(submission.submittedAt));

		const approvedTasksCount = userSubmissions.filter((s) => s.status === 'approved').length;
		const taskCompletionRate = totalTasks > 0 ? Math.round((approvedTasksCount / totalTasks) * 100) : 100;

		// 4. Gamification Streak & Points
		const [streak] = await db
			.select({
				currentStreak: streakCounter.currentStreak,
				maxStreak: streakCounter.maxStreak
			})
			.from(streakCounter)
			.where(and(eq(streakCounter.userId, studentId), eq(streakCounter.kelasInstanceId, kelasId)))
			.limit(1);

		const [pointSum] = await db
			.select({
				total: sql<number>`COALESCE(SUM(${pointLog.amount}), 0)`
			})
			.from(pointLog)
			.where(and(eq(pointLog.userId, studentId), eq(pointLog.kelasInstanceId, kelasId)));

		const currentStreak = streak?.currentStreak ?? 0;
		const maxStreak = streak?.maxStreak ?? 0;
		const totalPoints = Number(pointSum?.total ?? 0);

		// 5. Derive Composite Health & Risk Level
		const { riskLevel, alertReasons } = evaluateStudentHealth({
			totalSessions,
			attendanceRate,
			totalTasks,
			taskCompletionRate,
			currentStreak
		});

		// 6. Advisor Notes History
		const notesData = await db
			.select({
				id: advisorNote.id,
				note: advisorNote.note,
				category: advisorNote.category,
				createdAt: advisorNote.createdAt,
				advisorId: advisorNote.advisorId,
				advisorName: user.fullName,
				advisorAvatar: user.avatarUrl
			})
			.from(advisorNote)
			.innerJoin(user, eq(advisorNote.advisorId, user.id))
			.where(eq(advisorNote.studentId, studentId))
			.orderBy(desc(advisorNote.createdAt));

		return {
			student: {
				id: studentData.id,
				fullName: studentData.fullName,
				username: studentData.username,
				avatarUrl: studentData.avatarUrl,
				kelasId: studentData.kelasId,
				kelasName: studentData.kelasName,
				tahunAjaranName: studentData.tahunAjaranName,
				tingkatName: studentData.tingkatName,
				membershipStatus: studentData.membershipStatus
			},
			summary: {
				totalSessions,
				attendedCount,
				attendanceRate,
				totalTasks,
				approvedTasksCount,
				taskCompletionRate,
				currentStreak,
				maxStreak,
				totalPoints,
				riskLevel,
				alertReasons
			},
			notes: notesData,
			attendanceLogs: attendanceRecords,
			submissionLogs: userSubmissions
		};
	},

	/**
	 * Create a new intervention note for a student
	 */
	async addAdvisorNote(params: {
		studentId: number;
		advisorId: number;
		note: string;
		category: string;
	}) {
		const [created] = await db
			.insert(advisorNote)
			.values({
				studentId: params.studentId,
				advisorId: params.advisorId,
				note: params.note.trim(),
				category: params.category || 'intervensi'
			})
			.returning();

		return created;
	}
};

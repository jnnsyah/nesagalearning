import { db } from '../db';
import { subPhase, phase, curriculumTrack } from '../db/schema/curriculum';
import { pertemuan, attendance } from '../db/schema/session';
import { task, submission } from '../db/schema/task';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '../db/schema/academic';
import { pointLog } from '../db/schema/gamification';
import { eq, and, inArray, asc, ne, sum } from 'drizzle-orm';

export interface SubPhaseProgressStatus {
	subPhaseId: number;
	subPhaseTitle: string;
	phaseId: number;
	isCompleted: boolean;
	totalSessions: number;
	completedSessions: number;
}

export interface PhaseProgressSummary {
	phaseId: number;
	phaseTitle: string;
	totalSubPhases: number;
	completedSubPhases: number;
	progressPercentage: number;
}

export interface HistoricalClassProgress {
	kelasInstanceId: number;
	kelasName: string;
	tahunAjaranName: string;
	tingkatName: string;
	trackTitle: string;
	status: string;
	joinedAt: Date;
	totalPointsEarned: number;
	attendanceSummary: {
		hadir: number;
		excused: number;
		total: number;
	};
	phaseProgress: PhaseProgressSummary[];
}

export class ProgressService {
	/**
	 * Check if a specific SubPhase is completed for a student in a specific kelasInstance
	 */
	static async checkSubPhaseCompletion(
		userId: number,
		subPhaseId: number,
		kelasInstanceId: number
	): Promise<boolean> {
		// 1. Get all sessions for this subPhase in the specified kelasInstance
		const sessions = await db
			.select({
				id: pertemuan.id
			})
			.from(pertemuan)
			.where(
				and(
					eq(pertemuan.subPhaseId, subPhaseId),
					eq(pertemuan.kelasInstanceId, kelasInstanceId)
				)
			);

		if (sessions.length === 0) {
			return false; // No sessions configured for this subPhase yet
		}

		const sessionIds = sessions.map((s) => s.id);

		// 2. Fetch all attendances for the student in these sessions
		const attendances = await db
			.select({
				pertemuanId: attendance.pertemuanId,
				status: attendance.status
			})
			.from(attendance)
			.where(
				and(
					eq(attendance.userId, userId),
					inArray(attendance.pertemuanId, sessionIds)
				)
			);

		const validAttendanceMap = new Map<number, boolean>();
		for (const att of attendances) {
			if (att.status === 'hadir' || att.status === 'excused') {
				validAttendanceMap.set(att.pertemuanId, true);
			}
		}

		// 3. Fetch all tasks linked to these sessions
		const tasks = await db
			.select({
				id: task.id,
				pertemuanId: task.pertemuanId
			})
			.from(task)
			.where(inArray(task.pertemuanId, sessionIds));

		// 4. Fetch submissions for these tasks for this student
		let approvedTaskMap = new Map<number, boolean>();
		if (tasks.length > 0) {
			const taskIds = tasks.map((t) => t.id);
			const approvedSubmissions = await db
				.select({
					taskId: submission.taskId,
					status: submission.status
				})
				.from(submission)
				.where(
					and(
						eq(submission.userId, userId),
						inArray(submission.taskId, taskIds),
						eq(submission.status, 'approved')
					)
				);

			for (const sub of approvedSubmissions) {
				approvedTaskMap.set(sub.taskId, true);
			}
		}

		// 5. Evaluate completion criteria for each session:
		// - Must have valid attendance (hadir or excused)
		// - If session has a task, task submission status must be approved
		for (const s of sessions) {
			const hasValidAttendance = validAttendanceMap.get(s.id) ?? false;
			if (!hasValidAttendance) {
				return false;
			}

			const sessionTask = tasks.find((t) => t.pertemuanId === s.id);
			if (sessionTask) {
				const isTaskApproved = approvedTaskMap.get(sessionTask.id) ?? false;
				if (!isTaskApproved) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Get progress summary for all phases in a curriculum track for a student
	 */
	static async getStudentPhaseProgress(
		userId: number,
		kelasInstanceId: number
	): Promise<PhaseProgressSummary[]> {
		// 1. Get curriculumTrackId from kelasInstance
		const [kelas] = await db
			.select({ curriculumTrackId: kelasInstance.curriculumTrackId })
			.from(kelasInstance)
			.where(eq(kelasInstance.id, kelasInstanceId));

		if (!kelas || !kelas.curriculumTrackId) {
			return [];
		}

		// 2. Get phases for curriculum track
		const phasesList = await db
			.select({ id: phase.id, title: phase.title })
			.from(phase)
			.where(eq(phase.curriculumTrackId, kelas.curriculumTrackId))
			.orderBy(asc(phase.sortOrder));

		const summary: PhaseProgressSummary[] = [];

		for (const p of phasesList) {
			const subPhasesList = await db
				.select({ id: subPhase.id })
				.from(subPhase)
				.where(eq(subPhase.phaseId, p.id))
				.orderBy(asc(subPhase.sortOrder));

			let completedCount = 0;
			for (const sp of subPhasesList) {
				const isCompleted = await ProgressService.checkSubPhaseCompletion(
					userId,
					sp.id,
					kelasInstanceId
				);
				if (isCompleted) {
					completedCount++;
				}
			}

			const totalSubPhases = subPhasesList.length;
			const progressPercentage =
				totalSubPhases > 0 ? Math.round((completedCount / totalSubPhases) * 100) : 0;

			summary.push({
				phaseId: p.id,
				phaseTitle: p.title,
				totalSubPhases,
				completedSubPhases: completedCount,
				progressPercentage
			});
		}

		return summary;
	}

	/**
	 * Get read-only historical progress for a student across past grade levels (naik/tinggal/keluar)
	 */
	static async getStudentHistoricalProgress(userId: number): Promise<HistoricalClassProgress[]> {
		const pastMemberships = await db
			.select({
				kelasInstanceId: keanggotaan.kelasInstanceId,
				status: keanggotaan.status,
				joinedAt: keanggotaan.joinedAt,
				kelasName: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name,
				trackTitle: curriculumTrack.title
			})
			.from(keanggotaan)
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.where(and(eq(keanggotaan.userId, userId), ne(keanggotaan.status, 'aktif')))
			.orderBy(asc(tahunAjaran.startedAt));

		const results: HistoricalClassProgress[] = [];

		for (const mem of pastMemberships) {
			const phaseProgress = await ProgressService.getStudentPhaseProgress(
				userId,
				mem.kelasInstanceId
			);

			const [pointsRes] = await db
				.select({ total: sum(pointLog.amount) })
				.from(pointLog)
				.where(
					and(
						eq(pointLog.userId, userId),
						eq(pointLog.kelasInstanceId, mem.kelasInstanceId)
					)
				);

			const totalPointsEarned = pointsRes?.total ? Number(pointsRes.total) : 0;

			const attendances = await db
				.select({
					status: attendance.status
				})
				.from(attendance)
				.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
				.where(
					and(
						eq(attendance.userId, userId),
						eq(pertemuan.kelasInstanceId, mem.kelasInstanceId)
					)
				);

			let hadirCount = 0;
			let excusedCount = 0;
			for (const att of attendances) {
				if (att.status === 'hadir') hadirCount++;
				if (att.status === 'excused') excusedCount++;
			}

			results.push({
				kelasInstanceId: mem.kelasInstanceId,
				kelasName: mem.kelasName,
				tahunAjaranName: mem.tahunAjaranName,
				tingkatName: mem.tingkatName,
				trackTitle: mem.trackTitle,
				status: mem.status,
				joinedAt: mem.joinedAt,
				totalPointsEarned,
				attendanceSummary: {
					hadir: hadirCount,
					excused: excusedCount,
					total: attendances.length
				},
				phaseProgress
			});
		}

		return results;
	}
}

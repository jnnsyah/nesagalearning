import { db } from '../db';
import { subPhase, phase } from '../db/schema/curriculum';
import { pertemuan, attendance } from '../db/schema/session';
import { task, submission } from '../db/schema/task';
import { keanggotaan } from '../db/schema/academic';
import { eq, and, inArray } from 'drizzle-orm';

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
		// Get all phases & subPhases for the kelasInstance's curriculum track
		const membership = await db.query.keanggotaan.findFirst({
			where: and(eq(keanggotaan.userId, userId), eq(keanggotaan.kelasInstanceId, kelasInstanceId)),
			with: {
				kelasInstance: {
					with: {
						curriculumTrack: {
							with: {
								phases: {
									with: {
										subPhases: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!membership || !membership.kelasInstance?.curriculumTrack) {
			return [];
		}

		const phases = membership.kelasInstance.curriculumTrack.phases ?? [];
		const summary: PhaseProgressSummary[] = [];

		for (const p of phases) {
			const subPhasesList = p.subPhases ?? [];
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
}

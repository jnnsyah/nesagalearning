import { db } from '../db';
import { task, submission } from '../db/schema/task';
import { pertemuan } from '../db/schema/session';
import { user } from '../db/schema/auth';
import { subPhase, phase } from '../db/schema/curriculum';
import { keanggotaan, kelasInstance } from '../db/schema/academic';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { PointsService } from './points.service';
import { ProgressService } from './progress.service';

export interface SubmitTaskParams {
	userId: number;
	taskId: number;
	link: string;
}

export interface ReviewSubmissionParams {
	reviewerId: number;
	submissionId: number;
	status: 'approved' | 'revisi';
	feedback?: string;
}

export class SubmissionService {
	/**
	 * Student submits or re-submits a task URL
	 */
	static async submitTask(params: SubmitTaskParams) {
		const { userId, taskId, link } = params;

		// 1. Fetch task and its pertemuan details using direct SQL join
		const [taskRecord] = await db
			.select({
				id: task.id,
				pertemuanId: task.pertemuanId,
				kelasInstanceId: pertemuan.kelasInstanceId
			})
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(eq(task.id, taskId));

		if (!taskRecord) {
			throw new Error('Tugas tidak ditemukan.');
		}

		const kelasInstanceId = taskRecord.kelasInstanceId;

		// 2. Check user membership in this kelasInstance
		const [membership] = await db
			.select({
				id: keanggotaan.id
			})
			.from(keanggotaan)
			.where(
				and(
					eq(keanggotaan.userId, userId),
					eq(keanggotaan.kelasInstanceId, kelasInstanceId)
				)
			);

		if (!membership) {
			throw new Error('Anda tidak terdaftar di kelas untuk tugas ini.');
		}

		// 3. Check existing submission
		const [existingSubmission] = await db
			.select({
				id: submission.id,
				status: submission.status
			})
			.from(submission)
			.where(and(eq(submission.taskId, taskId), eq(submission.userId, userId)));

		if (existingSubmission) {
			if (existingSubmission.status === 'approved') {
				throw new Error('Tugas sudah disetujui, tidak dapat diubah lagi.');
			}

			// Re-submit (update link, reset status to pending)
			const [updated] = await db
				.update(submission)
				.set({
					link,
					status: 'pending',
					submittedAt: new Date(),
					feedback: null // Clear previous revision feedback on resubmission
				})
				.where(eq(submission.id, existingSubmission.id))
				.returning();

			return updated;
		}

		// Create new submission
		const [created] = await db
			.insert(submission)
			.values({
				taskId,
				userId,
				link,
				status: 'pending',
				submittedAt: new Date()
			})
			.returning();

		return created;
	}

	/**
	 * Mentor reviews a student task submission (Approve or Request Revision)
	 */
	static async reviewSubmission(params: ReviewSubmissionParams) {
		const { reviewerId, submissionId, status, feedback } = params;

		// 1. Fetch submission with task & session info using direct SQL join
		const [subRecord] = await db
			.select({
				id: submission.id,
				userId: submission.userId,
				taskId: submission.taskId,
				taskSize: task.taskSize,
				kelasInstanceId: pertemuan.kelasInstanceId,
				subPhaseId: pertemuan.subPhaseId,
				currentStatus: submission.status
			})
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(eq(submission.id, submissionId));

		if (!subRecord) {
			throw new Error('Submission tugas tidak ditemukan.');
		}

		if (subRecord.currentStatus === status && status === 'approved') {
			// Ensure points & progress check are awarded even if already approved
			let kelasInstanceId = subRecord.kelasInstanceId;
			if (!kelasInstanceId) {
				const [membership] = await db
					.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
					.from(keanggotaan)
					.where(
						and(eq(keanggotaan.userId, subRecord.userId), eq(keanggotaan.status, 'aktif'))
					);
				if (membership) kelasInstanceId = membership.kelasInstanceId;
			}
			if (kelasInstanceId) {
				const taskSize = subRecord.taskSize || 'sedang';
				await PointsService.awardTaskPoints(
					subRecord.userId,
					kelasInstanceId,
					subRecord.taskId,
					taskSize
				);
			}
			return subRecord;
		}

		// 2. Update submission record
		const [updated] = await db
			.update(submission)
			.set({
				status,
				feedback: feedback || null,
				reviewedAt: new Date(),
				reviewedBy: reviewerId
			})
			.where(eq(submission.id, submissionId))
			.returning();

		// 3. If approved, trigger points award & progress check safely
		if (status === 'approved') {
			let kelasInstanceId = subRecord.kelasInstanceId;

			// Fallback: If kelasInstanceId is missing on session, look up student's active class membership
			if (!kelasInstanceId) {
				const [membership] = await db
					.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
					.from(keanggotaan)
					.where(
						and(eq(keanggotaan.userId, subRecord.userId), eq(keanggotaan.status, 'aktif'))
					);
				if (membership) {
					kelasInstanceId = membership.kelasInstanceId;
				}
			}

			if (kelasInstanceId) {
				try {
					const taskSize = subRecord.taskSize || 'sedang';
					await PointsService.awardTaskPoints(
						subRecord.userId,
						kelasInstanceId,
						subRecord.taskId,
						taskSize
					);

					if (subRecord.subPhaseId) {
						await ProgressService.checkSubPhaseCompletion(
							subRecord.userId,
							subRecord.subPhaseId,
							kelasInstanceId
						);
					}
				} catch (err) {
					console.error('Failed to process task points/progress during review:', err);
				}
			}
		}

		// 4. Send in-app notification to student
		try {
			const { NotificationService } = await import('./notification.service');
			const title = status === 'approved' ? 'Tugas Disetujui! 🎉' : 'Permintaan Revisi Tugas 📝';
			const message = feedback
				? `Catatan Mentor: "${feedback}"`
				: (status === 'approved' ? 'Tugas Anda telah diverifikasi dan poin berhasil ditambahkan.' : 'Mohon periksa kembali dan kumpulkan ulang submisi tugas Anda.');

			await NotificationService.sendNotification({
				userId: subRecord.userId,
				type: 'submission_reviewed',
				title,
				message,
				referenceId: subRecord.id,
				referenceType: 'submission'
			});
		} catch (notifErr) {
			console.warn('Failed to send submission notification:', notifErr);
		}

		return updated;
	}

	/**
	 * Student cancels / withdraws a pending or revisi task submission
	 */
	static async cancelSubmission(userId: number, submissionId: number) {
		const [subRecord] = await db
			.select({
				id: submission.id,
				userId: submission.userId,
				status: submission.status
			})
			.from(submission)
			.where(and(eq(submission.id, submissionId), eq(submission.userId, userId)));

		if (!subRecord) {
			throw new Error('Submisi tugas tidak ditemukan.');
		}

		if (subRecord.status === 'approved') {
			throw new Error('Tugas yang sudah disetujui tidak dapat dibatalkan.');
		}

		const [deleted] = await db
			.delete(submission)
			.where(eq(submission.id, submissionId))
			.returning();

		return deleted;
	}

	/**
	 * Get meeting sessions that have tasks attached along with submission statistics summary
	 */
	static async getMeetingTasksSummary(kelasInstanceId?: number) {
		const tasks = await db
			.select({
				taskId: task.id,
				taskTitle: task.title,
				taskDescription: task.description,
				taskSize: task.taskSize,
				pertemuanId: pertemuan.id,
				pertemuanTitle: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				activityType: pertemuan.activityType,
				subPhaseTitle: subPhase.title,
				phaseTitle: phase.title,
				kelasName: kelasInstance.name
			})
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.leftJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.leftJoin(phase, eq(subPhase.phaseId, phase.id))
			.leftJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.where(
				kelasInstanceId ? eq(pertemuan.kelasInstanceId, kelasInstanceId) : undefined
			)
			.orderBy(desc(pertemuan.sessionDate));

		if (tasks.length === 0) return [];

		const taskIds = tasks.map((t) => t.taskId);
		const subs = await db
			.select({
				id: submission.id,
				taskId: submission.taskId,
				status: submission.status
			})
			.from(submission)
			.where(inArray(submission.taskId, taskIds));

		const statsMap = new Map<number, { total: number; pending: number; approved: number; revisi: number }>();
		for (const s of subs) {
			if (!statsMap.has(s.taskId)) {
				statsMap.set(s.taskId, { total: 0, pending: 0, approved: 0, revisi: 0 });
			}
			const st = statsMap.get(s.taskId)!;
			st.total += 1;
			if (s.status === 'pending') st.pending += 1;
			if (s.status === 'approved') st.approved += 1;
			if (s.status === 'revisi') st.revisi += 1;
		}

		return tasks.map((t) => {
			const st = statsMap.get(t.taskId) || { total: 0, pending: 0, approved: 0, revisi: 0 };
			return {
				...t,
				stats: st
			};
		});
	}

	/**
	 * Get list of pending submissions for mentor review
	 */
	static async getPendingSubmissions(kelasInstanceId?: number) {
		const list = await db
			.select({
				id: submission.id,
				taskId: submission.taskId,
				userId: submission.userId,
				studentName: user.fullName,
				studentUsername: user.username,
				taskTitle: task.title,
				taskSize: task.taskSize,
				pertemuanTitle: pertemuan.title,
				pertemuanId: pertemuan.id,
				sessionDate: pertemuan.sessionDate,
				activityType: pertemuan.activityType,
				subPhaseTitle: subPhase.title,
				phaseTitle: phase.title,
				kelasName: kelasInstance.name,
				link: submission.link,
				status: submission.status,
				feedback: submission.feedback,
				submittedAt: submission.submittedAt,
				reviewedAt: submission.reviewedAt
			})
			.from(submission)
			.innerJoin(user, eq(submission.userId, user.id))
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.leftJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.leftJoin(phase, eq(subPhase.phaseId, phase.id))
			.leftJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.where(
				kelasInstanceId
					? and(eq(submission.status, 'pending'), eq(pertemuan.kelasInstanceId, kelasInstanceId))
					: eq(submission.status, 'pending')
			)
			.orderBy(asc(submission.submittedAt));

		return list;
	}

	/**
	 * Get all submissions (all statuses) for mentor review dashboard
	 */
	static async getAllSubmissions(kelasInstanceId?: number) {
		const list = await db
			.select({
				id: submission.id,
				taskId: submission.taskId,
				userId: submission.userId,
				studentName: user.fullName,
				studentUsername: user.username,
				taskTitle: task.title,
				taskSize: task.taskSize,
				pertemuanTitle: pertemuan.title,
				pertemuanId: pertemuan.id,
				sessionDate: pertemuan.sessionDate,
				activityType: pertemuan.activityType,
				subPhaseTitle: subPhase.title,
				phaseTitle: phase.title,
				kelasName: kelasInstance.name,
				link: submission.link,
				status: submission.status,
				feedback: submission.feedback,
				submittedAt: submission.submittedAt,
				reviewedAt: submission.reviewedAt
			})
			.from(submission)
			.innerJoin(user, eq(submission.userId, user.id))
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.leftJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.leftJoin(phase, eq(subPhase.phaseId, phase.id))
			.leftJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.where(
				kelasInstanceId ? eq(pertemuan.kelasInstanceId, kelasInstanceId) : undefined
			)
			.orderBy(desc(submission.submittedAt));

		return list;
	}

	/**
	 * Get student's task submissions
	 */
	static async getStudentSubmissions(userId: number) {
		const list = await db
			.select({
				id: submission.id,
				taskId: submission.taskId,
				taskTitle: task.title,
				taskDescription: task.description,
				taskSize: task.taskSize,
				pertemuanTitle: pertemuan.title,
				pertemuanId: pertemuan.id,
				sessionDate: pertemuan.sessionDate,
				subPhaseTitle: subPhase.title,
				phaseTitle: phase.title,
				link: submission.link,
				status: submission.status,
				feedback: submission.feedback,
				submittedAt: submission.submittedAt,
				reviewedAt: submission.reviewedAt
			})
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.leftJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.leftJoin(phase, eq(subPhase.phaseId, phase.id))
			.where(eq(submission.userId, userId))
			.orderBy(desc(submission.submittedAt));

		return list;
	}

	/**
	 * Get tasks for student with their submission status
	 */
	static async getStudentTasksWithStatus(userId: number, kelasInstanceId: number) {
		// 1. Get all tasks in student's class
		const tasks = await db
			.select({
				taskId: task.id,
				taskTitle: task.title,
				taskDescription: task.description,
				taskSize: task.taskSize,
				pertemuanId: pertemuan.id,
				pertemuanTitle: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				activityType: pertemuan.activityType,
				subPhaseTitle: subPhase.title,
				phaseTitle: phase.title
			})
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.leftJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.leftJoin(phase, eq(subPhase.phaseId, phase.id))
			.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
			.orderBy(desc(pertemuan.sessionDate));

		if (tasks.length === 0) return [];

		// 2. Get student's submissions
		const taskIds = tasks.map((t) => t.taskId);
		const userSubmissions = await db
			.select({
				id: submission.id,
				taskId: submission.taskId,
				link: submission.link,
				status: submission.status,
				feedback: submission.feedback,
				submittedAt: submission.submittedAt,
				reviewedAt: submission.reviewedAt
			})
			.from(submission)
			.where(and(eq(submission.userId, userId), inArray(submission.taskId, taskIds)));

		const submissionMap = new Map(userSubmissions.map((s) => [s.taskId, s]));

		return tasks.map((t) => {
			const sub = submissionMap.get(t.taskId);
			return {
				...t,
				submission: sub || null
			};
		});
	}
}

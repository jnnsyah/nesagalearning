import { db } from '../db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '../db/schema/academic';
import { pertemuan, attendance } from '../db/schema/session';
import { curriculumTrack, phase, subPhase } from '../db/schema/curriculum';
import { task, submission } from '../db/schema/task';
import { streakCounter, pointLog } from '../db/schema/gamification';
import { eq, and, desc, asc, inArray, sum } from 'drizzle-orm';
import { ProgressService } from './progress.service';

export interface StudentMembershipArchiveOption {
	id: number;
	kelasInstanceId: number;
	status: 'aktif' | 'naik' | 'tinggal' | 'keluar' | string;
	joinedAt: Date;
	kelasName: string;
	tahunAjaranId: number;
	tahunAjaranName: string;
	tingkatName: string;
	curriculumTrackId: number;
	trackTitle: string;
}

export interface ArchiveAttendanceLog {
	session: {
		id: number;
		title: string;
		activityType: string;
		sessionDate: Date | string | null;
		startTime: string | null;
		endTime: string | null;
		location: string | null;
		isWeekend: boolean;
	};
	attendance: {
		id: number;
		method: string;
		status: string;
		manualReason: string | null;
		recordedAt: Date | string;
	} | null;
	status: 'hadir' | 'excused' | 'absen';
}

export interface ArchiveTaskItem {
	taskId: number;
	taskTitle: string;
	taskDescription: string | null;
	taskSize: string;
	sessionTitle: string;
	sessionDate: Date | string | null;
	submission: {
		id: number;
		link: string;
		status: 'pending' | 'approved' | 'revisi' | string;
		feedback: string | null;
		submittedAt: Date | string;
		reviewedAt: Date | string | null;
	} | null;
}

export class StudentArchiveService {
	/**
	 * Get all memberships of a student (active + historical)
	 */
	static async getStudentMemberships(userId: number): Promise<StudentMembershipArchiveOption[]> {
		return db
			.select({
				id: keanggotaan.id,
				kelasInstanceId: keanggotaan.kelasInstanceId,
				status: keanggotaan.status,
				joinedAt: keanggotaan.joinedAt,
				kelasName: kelasInstance.name,
				tahunAjaranId: tahunAjaran.id,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name,
				curriculumTrackId: kelasInstance.curriculumTrackId,
				trackTitle: curriculumTrack.title
			})
			.from(keanggotaan)
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.where(eq(keanggotaan.userId, userId))
			.orderBy(desc(tahunAjaran.startedAt), desc(keanggotaan.joinedAt));
	}

	/**
	 * Get complete archive data for a specific class membership
	 */
	static async getArchiveDataForClass(
		userId: number,
		kelasInstanceId: number
	) {
		// 1. Fetch class info
		const [kelas] = await db
			.select({
				id: kelasInstance.id,
				kelasName: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name,
				trackTitle: curriculumTrack.title,
				curriculumTrackId: kelasInstance.curriculumTrackId
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.where(eq(kelasInstance.id, kelasInstanceId))
			.limit(1);

		if (!kelas) {
			return null;
		}

		// 2. Fetch Sessions & Attendance
		const sessions = await db
			.select({
				id: pertemuan.id,
				title: pertemuan.title,
				activityType: pertemuan.activityType,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				endTime: pertemuan.endTime,
				location: pertemuan.location,
				isWeekend: pertemuan.isWeekend
			})
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
			.orderBy(desc(pertemuan.sessionDate), desc(pertemuan.startTime));

		const sessionIds = sessions.map((s) => s.id);

		let attendanceRecords: {
			id: number;
			pertemuanId: number;
			method: string;
			status: string;
			manualReason: string | null;
			recordedAt: Date;
		}[] = [];

		if (sessionIds.length > 0) {
			attendanceRecords = await db
				.select({
					id: attendance.id,
					pertemuanId: attendance.pertemuanId,
					method: attendance.method,
					status: attendance.status,
					manualReason: attendance.manualReason,
					recordedAt: attendance.recordedAt
				})
				.from(attendance)
				.where(
					and(
						eq(attendance.userId, userId),
						inArray(attendance.pertemuanId, sessionIds)
					)
				);
		}

		const attMap = new Map(attendanceRecords.map((a) => [a.pertemuanId, a]));

		let totalHadir = 0;
		let totalExcused = 0;

		const attendanceLogs: ArchiveAttendanceLog[] = sessions.map((s) => {
			const att = attMap.get(s.id);
			let status: 'hadir' | 'excused' | 'absen' = 'absen';
			if (att) {
				status = att.status === 'hadir' ? 'hadir' : 'excused';
				if (status === 'hadir') totalHadir++;
				if (status === 'excused') totalExcused++;
			}
			return {
				session: s,
				attendance: att || null,
				status
			};
		});

		const totalSessions = sessions.length;
		const attendancePercentage =
			totalSessions > 0 ? Math.round(((totalHadir + totalExcused) / totalSessions) * 100) : 0;

		// Fetch streak info for this class
		const [streakRecord] = await db
			.select({
				currentStreak: streakCounter.currentStreak,
				maxStreak: streakCounter.maxStreak,
				lastAttendedAt: streakCounter.lastAttendedAt
			})
			.from(streakCounter)
			.where(
				and(
					eq(streakCounter.userId, userId),
					eq(streakCounter.kelasInstanceId, kelasInstanceId)
				)
			);

		// 3. Fetch Curriculum Track Phase Progress
		const phaseProgress = await ProgressService.getStudentPhaseProgress(userId, kelasInstanceId);

		// Also fetch phases & subphases details for full track view
		const phases = await db
			.select({
				id: phase.id,
				title: phase.title,
				description: phase.description,
				sortOrder: phase.sortOrder
			})
			.from(phase)
			.where(eq(phase.curriculumTrackId, kelas.curriculumTrackId))
			.orderBy(asc(phase.sortOrder));

		const phaseDetails = [];
		for (const p of phases) {
			const subPhases = await db
				.select({
					id: subPhase.id,
					title: subPhase.title,
					description: subPhase.description,
					sortOrder: subPhase.sortOrder
				})
				.from(subPhase)
				.where(eq(subPhase.phaseId, p.id))
				.orderBy(asc(subPhase.sortOrder));

			const subPhaseStatusList = [];
			for (const sp of subPhases) {
				const isCompleted = await ProgressService.checkSubPhaseCompletion(
					userId,
					sp.id,
					kelasInstanceId
				);
				subPhaseStatusList.push({
					...sp,
					isCompleted
				});
			}

			phaseDetails.push({
				...p,
				subPhases: subPhaseStatusList
			});
		}

		// 4. Fetch Tasks & Submissions
		let tasks: ArchiveTaskItem[] = [];
		if (sessionIds.length > 0) {
			const rawTasks = await db
				.select({
					taskId: task.id,
					taskTitle: task.title,
					taskDescription: task.description,
					taskSize: task.taskSize,
					sessionTitle: pertemuan.title,
					sessionDate: pertemuan.sessionDate
				})
				.from(task)
				.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
				.where(inArray(task.pertemuanId, sessionIds))
				.orderBy(desc(pertemuan.sessionDate));

			const taskIds = rawTasks.map((t) => t.taskId);

			let submissionsList: {
				id: number;
				taskId: number;
				link: string;
				status: string;
				feedback: string | null;
				submittedAt: Date;
				reviewedAt: Date | null;
			}[] = [];

			if (taskIds.length > 0) {
				submissionsList = await db
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
					.where(
						and(
							eq(submission.userId, userId),
							inArray(submission.taskId, taskIds)
						)
					);
			}

			const subMap = new Map(submissionsList.map((s) => [s.taskId, s]));

			tasks = rawTasks.map((t) => ({
				...t,
				submission: subMap.get(t.taskId) || null
			}));
		}

		// Fetch total points earned in this class
		const [pointsRes] = await db
			.select({ total: sum(pointLog.amount) })
			.from(pointLog)
			.where(
				and(
					eq(pointLog.userId, userId),
					eq(pointLog.kelasInstanceId, kelasInstanceId)
				)
			);
		const totalPointsEarned = pointsRes?.total ? Number(pointsRes.total) : 0;

		return {
			kelas,
			attendanceStats: {
				totalSessions,
				totalHadir,
				totalExcused,
				attendancePercentage,
				streakInfo: streakRecord || { currentStreak: 0, maxStreak: 0, lastAttendedAt: null }
			},
			attendanceLogs,
			phaseProgress,
			phaseDetails,
			tasks,
			totalPointsEarned
		};
	}
}

import { db } from '$lib/server/db';
import {
	tahunAjaran,
	kelasInstance,
	tingkat,
	keanggotaan,
	pertemuan,
	attendance,
	user,
	mentorAssignment,
	pointLog,
	curriculumTrack,
	phase,
	subPhase,
	task,
	submission,
	quiz,
	quizAttempt
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, count, like, or, sql } from 'drizzle-orm';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface MentorClassOption {
	id: number;
	name: string;
	tingkatName: string;
	tahunAjaranId: number;
	targetAngkatan: number | null;
}

export interface StudentRosterItem {
	userId: number;
	username: string;
	nisn: string | null;
	fullName: string;
	avatarUrl: string | null;
	angkatan: number | null;
	rombelLabel: string | null;
	targetAngkatan: number | null;
	kelasId: number;
	kelasName: string;
	tingkatName: string;
	totalHadir: number;
	totalExcused: number;
	totalAlpha: number;
	totalSessionsCount: number;
	attendanceRate: number; // 0 - 100%
	overallProgress: number; // 0 - 100%
	hasAnyStarted: boolean;
	totalPoints: number;
	riskStatus: 'normal' | 'warning' | 'critical';
}

export interface StudentSubPhaseDetail {
	id: number;
	title: string;
	sortOrder: number;
	totalSessionsCount: number;
	attendedSessionsCount: number;
	totalTasksCount: number;
	approvedTasksCount: number;
	hasQuiz: boolean;
	quizPassed: boolean;
	isStarted: boolean;
	completionRate: number;
}

export interface StudentPhaseDetail {
	id: number;
	phaseCode: string;
	title: string;
	sortOrder: number;
	hasStartedSubPhases: boolean;
	completionRate: number;
	subPhases: StudentSubPhaseDetail[];
}

export interface StudentProgressDetail {
	student: {
		userId: number;
		fullName: string;
		username: string;
		nisn: string | null;
		avatarUrl: string | null;
		kelasName: string;
		totalPoints: number;
		attendanceRate: number;
		overallProgress: number;
		hasAnyStarted: boolean;
	};
	phases: StudentPhaseDetail[];
}

export interface StudentSessionAttendanceLog {
	sessionId: number;
	sessionTitle: string;
	sessionDate: string;
	startTime: string;
	activityType: string;
	status: 'hadir' | 'excused' | 'alpha';
	method: 'qr' | 'manual' | null;
	manualReason: string | null;
	recordedAt: Date | null;
}

export interface StudentAttendanceHistoryDetail {
	student: {
		userId: number;
		fullName: string;
		username: string;
		nisn: string | null;
		avatarUrl: string | null;
		kelasName: string;
		totalHadir: number;
		totalExcused: number;
		totalAlpha: number;
		totalSessionsCount: number;
		attendanceRate: number;
	};
	logs: StudentSessionAttendanceLog[];
}

export interface MentorRosterViewData {
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	mentorClasses: MentorClassOption[];
	selectedKelas: MentorClassOption | null;
	searchQuery: string;
	riskFilter: 'all' | 'warning' | 'critical' | 'good';
	summary: {
		totalStudentsCount: number;
		avgAttendanceRate: number;
		avgPoints: number;
		attentionNeededCount: number;
	};
	roster: StudentRosterItem[];
}

export const MentorStudentRosterService = {
	/**
	 * Get list of classes assigned to mentor in academic year
	 */
	async getMentorClasses(mentorUserId: number, tahunAjaranId?: number): Promise<MentorClassOption[]> {
		return await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatName: tingkat.name,
				tahunAjaranId: kelasInstance.tahunAjaranId,
				targetAngkatan: kelasInstance.targetAngkatan
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.innerJoin(mentorAssignment, eq(mentorAssignment.kelasInstanceId, kelasInstance.id))
			.where(
				and(
					eq(mentorAssignment.userId, mentorUserId),
					tahunAjaranId ? eq(kelasInstance.tahunAjaranId, tahunAjaranId) : undefined
				)
			)
			.orderBy(tingkat.levelOrder, kelasInstance.name);
	},

	/**
	 * Fetch Student Roster data with 60% attendance threshold & pre-computed curriculum progress
	 */
	async getRosterData(params: {
		mentorUserId: number;
		tahunAjaranId?: number;
		kelasInstanceId?: number;
		searchQuery?: string;
		riskFilter?: 'all' | 'warning' | 'critical' | 'good';
		angkatanFilter?: string;
	}): Promise<MentorRosterViewData> {
		const searchQuery = params.searchQuery?.trim() || '';
		const riskFilter = params.riskFilter || 'all';

		const tahunAjaranOptions = await db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive
			})
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.name));

		const selectedTahunAjaran = params.tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === params.tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		const activeTaId = selectedTahunAjaran?.id;

		const mentorClasses = activeTaId
			? await this.getMentorClasses(params.mentorUserId, activeTaId)
			: [];

		const selectedKelas = params.kelasInstanceId
			? mentorClasses.find((c) => c.id === params.kelasInstanceId) || mentorClasses[0] || null
			: mentorClasses[0] || null;

		if (!selectedKelas) {
			return {
				tahunAjaranOptions,
				selectedTahunAjaran,
				mentorClasses,
				selectedKelas: null,
				searchQuery,
				riskFilter,
				summary: {
					totalStudentsCount: 0,
					avgAttendanceRate: 0,
					avgPoints: 0,
					attentionNeededCount: 0
				},
				roster: []
			};
		}

		const targetKelasId = selectedKelas.id;

		const [enrolledStudentsRaw, sessionsList, classRow] = await Promise.all([
			db
				.select({
					userId: user.id,
					username: user.username,
					nisn: user.nisn,
					fullName: user.fullName,
					avatarUrl: user.avatarUrl,
					angkatan: user.angkatan,
					rombelLabel: user.rombelLabel,
					kelasId: keanggotaan.kelasInstanceId,
					kelasName: kelasInstance.name,
					tingkatName: tingkat.name,
					targetAngkatan: kelasInstance.targetAngkatan
				})
				.from(keanggotaan)
				.innerJoin(user, eq(keanggotaan.userId, user.id))
				.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
				.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
				.where(
					and(
						eq(keanggotaan.kelasInstanceId, targetKelasId),
						searchQuery
							? or(
									like(user.fullName, `%${searchQuery}%`),
									like(user.username, `%${searchQuery}%`),
									like(user.nisn, `%${searchQuery}%`)
								)
							: undefined
					)
				)
				.orderBy(user.fullName),

			db
				.select({
					id: pertemuan.id,
					subPhaseId: pertemuan.subPhaseId,
					title: pertemuan.title
				})
				.from(pertemuan)
				.where(eq(pertemuan.kelasInstanceId, targetKelasId)),

			db
				.select({ curriculumTrackId: kelasInstance.curriculumTrackId })
				.from(kelasInstance)
				.where(eq(kelasInstance.id, targetKelasId))
		]);

		const studentUserIds = enrolledStudentsRaw.map((s) => s.userId);
		const sessionIds = sessionsList.map((s) => s.id);
		const trackId = classRow[0]?.curriculumTrackId;

		// Fetch Phases & Subphases for the Track
		const phasesRaw = trackId
			? await db
					.select({ id: phase.id, sortOrder: phase.sortOrder })
					.from(phase)
					.where(eq(phase.curriculumTrackId, trackId))
					.orderBy(phase.sortOrder)
			: [];

		const phaseIds = phasesRaw.map((p) => p.id);
		const subPhasesRaw = phaseIds.length > 0
			? await db
					.select({ id: subPhase.id, phaseId: subPhase.phaseId })
					.from(subPhase)
					.where(inArray(subPhase.phaseId, phaseIds))
			: [];

		const subPhaseIds = subPhasesRaw.map((sp) => sp.id);

		// Parallel fetch attendance, points, tasks, submissions, quizzes
		const [attendanceRecords, pointsList, tasksRaw, submissionsRaw, quizzesRaw, quizAttemptsRaw] = await Promise.all([
			sessionIds.length > 0 && studentUserIds.length > 0
				? db
						.select({
							userId: attendance.userId,
							pertemuanId: attendance.pertemuanId,
							status: attendance.status
						})
						.from(attendance)
						.where(
							and(
								inArray(attendance.pertemuanId, sessionIds),
								inArray(attendance.userId, studentUserIds)
							)
						)
				: Promise.resolve([]),

			studentUserIds.length > 0
				? db
						.select({
							userId: pointLog.userId,
							totalPoints: sql<number>`COALESCE(SUM(${pointLog.amount}), 0)`
						})
						.from(pointLog)
						.where(inArray(pointLog.userId, studentUserIds))
						.groupBy(pointLog.userId)
				: Promise.resolve([]),

			subPhaseIds.length > 0
				? db
						.select({ id: task.id, pertemuanId: task.pertemuanId })
						.from(task)
				: Promise.resolve([]),

			studentUserIds.length > 0
				? db
						.select({ userId: submission.userId, taskId: submission.taskId, status: submission.status })
						.from(submission)
						.where(and(inArray(submission.userId, studentUserIds), eq(submission.status, 'approved')))
				: Promise.resolve([]),

			subPhaseIds.length > 0
				? db
						.select({ id: quiz.id, subPhaseId: quiz.subPhaseId, passingScore: quiz.passingScore })
						.from(quiz)
						.where(inArray(quiz.subPhaseId, subPhaseIds))
				: Promise.resolve([]),

			studentUserIds.length > 0
				? db
						.select({ userId: quizAttempt.userId, quizId: quizAttempt.quizId, score: quizAttempt.score })
						.from(quizAttempt)
						.where(inArray(quizAttempt.userId, studentUserIds))
				: Promise.resolve([])
		]);

		const pointsMap = new Map<number, number>();
		for (const p of pointsList) pointsMap.set(p.userId, Number(p.totalPoints));

		const attendanceMap = new Map<string, string>();
		for (const a of attendanceRecords) {
			attendanceMap.set(`${a.userId}_${a.pertemuanId}`, a.status);
		}

		// Pre-compute overall curriculum progress per student
		const quizPassingScoreMap = new Map<number, number>();
		for (const q of quizzesRaw) quizPassingScoreMap.set(q.id, q.passingScore);

		const sessionTasksMap = new Map<number, number[]>();
		for (const t of tasksRaw) {
			if (t.pertemuanId) {
				const list = sessionTasksMap.get(t.pertemuanId) || [];
				list.push(t.id);
				sessionTasksMap.set(t.pertemuanId, list);
			}
		}

		const subPhaseSessionsMap = new Map<number, number[]>();
		for (const s of sessionsList) {
			if (s.subPhaseId) {
				const list = subPhaseSessionsMap.get(s.subPhaseId) || [];
				list.push(s.id);
				subPhaseSessionsMap.set(s.subPhaseId, list);
			}
		}

		const subPhaseQuizzesMap = new Map<number, number[]>();
		for (const q of quizzesRaw) {
			const list = subPhaseQuizzesMap.get(q.subPhaseId) || [];
			list.push(q.id);
			subPhaseQuizzesMap.set(q.subPhaseId, list);
		}

		let totalAttendanceRateSum = 0;
		let totalPointsSum = 0;
		let attentionNeededCount = 0;

		const totalSessionsCount = sessionsList.length;

		let roster: StudentRosterItem[] = enrolledStudentsRaw.map((st) => {
			let totalHadir = 0;
			let totalExcused = 0;
			let totalAlpha = 0;

			for (const sess of sessionsList) {
				const stStatus = attendanceMap.get(`${st.userId}_${sess.id}`);
				if (stStatus === 'hadir') totalHadir++;
				else if (stStatus === 'excused') totalExcused++;
				else totalAlpha++;
			}

			const recordedCount = totalHadir + totalExcused + totalAlpha;
			const attendanceRate = recordedCount > 0
				? Math.round((totalHadir / recordedCount) * 100)
				: 0;

			const totalPoints = pointsMap.get(st.userId) || 0;
			totalAttendanceRateSum += attendanceRate;
			totalPointsSum += totalPoints;

			let riskStatus: 'normal' | 'warning' | 'critical' = 'normal';
			if (attendanceRate < 40) {
				riskStatus = 'critical';
				attentionNeededCount++;
			} else if (attendanceRate < 60) {
				riskStatus = 'warning';
				attentionNeededCount++;
			}

			// Pre-calculate Curriculum Progress for Student
			const stApprovedTasks = new Set(
				submissionsRaw.filter((sub) => sub.userId === st.userId).map((sub) => sub.taskId)
			);
			const stPassedQuizzes = new Set(
				quizAttemptsRaw
					.filter((qa) => qa.userId === st.userId && qa.score >= (quizPassingScoreMap.get(qa.quizId) || 60))
					.map((qa) => qa.quizId)
			);

			let startedPhasesCount = 0;
			let totalPhasesRateSum = 0;

			for (const p of phasesRaw) {
				const subPhasesForPhase = subPhasesRaw.filter((sp) => sp.phaseId === p.id);
				let startedSubPhasesCount = 0;
				let subPhaseRateSum = 0;

				for (const sp of subPhasesForPhase) {
					const sessIds = subPhaseSessionsMap.get(sp.id) || [];
					const totSess = sessIds.length;
					let attCount = 0;
					let totTasks = 0;
					let appTasks = 0;

					for (const sId of sessIds) {
						if (attendanceMap.get(`${st.userId}_${sId}`) === 'hadir') attCount++;
						const tIds = sessionTasksMap.get(sId) || [];
						totTasks += tIds.length;
						for (const tId of tIds) {
							if (stApprovedTasks.has(tId)) appTasks++;
						}
					}

					const qIds = subPhaseQuizzesMap.get(sp.id) || [];
					const hasQuiz = qIds.length > 0;
					const qPassed = hasQuiz && qIds.some((qId) => stPassedQuizzes.has(qId));

					const isStarted = totSess > 0 || totTasks > 0 || hasQuiz;
					if (isStarted) {
						startedSubPhasesCount++;
						const aR = totSess > 0 ? (attCount / totSess) * 100 : 0;
						const tR = totTasks > 0 ? (appTasks / totTasks) * 100 : 0;
						const qR = hasQuiz ? (qPassed ? 100 : 0) : 0;

						let cRate = 0;
						if (totTasks > 0 && hasQuiz) cRate = Math.round(aR * 0.4 + tR * 0.3 + qR * 0.3);
						else if (totTasks > 0) cRate = Math.round(aR * 0.5 + tR * 0.5);
						else if (hasQuiz) cRate = Math.round(aR * 0.5 + qR * 0.5);
						else cRate = Math.round(aR);

						subPhaseRateSum += cRate;
					}
				}

				if (startedSubPhasesCount > 0) {
					startedPhasesCount++;
					totalPhasesRateSum += Math.round(subPhaseRateSum / startedSubPhasesCount);
				}
			}

			const hasAnyStarted = startedPhasesCount > 0;
			const overallProgress = hasAnyStarted
				? Math.round(totalPhasesRateSum / startedPhasesCount)
				: 0;

			return {
				userId: st.userId,
				username: st.username,
				nisn: st.nisn,
				fullName: st.fullName,
				avatarUrl: st.avatarUrl,
				angkatan: st.angkatan,
				rombelLabel: st.rombelLabel,
				targetAngkatan: st.targetAngkatan,
				kelasId: st.kelasId,
				kelasName: st.kelasName,
				tingkatName: st.tingkatName,
				totalHadir,
				totalExcused,
				totalAlpha,
				totalSessionsCount,
				attendanceRate,
				overallProgress,
				hasAnyStarted,
				totalPoints,
				riskStatus
			};
		});

		if (riskFilter === 'warning') {
			roster = roster.filter((r) => r.riskStatus === 'warning');
		} else if (riskFilter === 'critical') {
			roster = roster.filter((r) => r.riskStatus === 'critical');
		} else if (riskFilter === 'good') {
			roster = roster.filter((r) => r.riskStatus === 'normal');
		}

		const totalStudentsCount = enrolledStudentsRaw.length;
		const avgAttendanceRate = totalStudentsCount > 0
			? Math.round(totalAttendanceRateSum / totalStudentsCount)
			: 0;
		const avgPoints = totalStudentsCount > 0
			? Math.round(totalPointsSum / totalStudentsCount)
			: 0;

		return {
			tahunAjaranOptions,
			selectedTahunAjaran,
			mentorClasses,
			selectedKelas,
			searchQuery,
			riskFilter,
			summary: {
				totalStudentsCount,
				avgAttendanceRate,
				avgPoints,
				attentionNeededCount
			},
			roster
		};
	},

	/**
	 * Fetch detailed individual student curriculum phase progress
	 */
	async getStudentCurriculumProgress(
		studentUserId: number,
		kelasInstanceId: number
	): Promise<StudentProgressDetail | null> {
		const [classRow] = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				curriculumTrackId: kelasInstance.curriculumTrackId
			})
			.from(kelasInstance)
			.where(eq(kelasInstance.id, kelasInstanceId));

		if (!classRow) return null;

		const [studentUser] = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn,
				avatarUrl: user.avatarUrl
			})
			.from(user)
			.where(eq(user.id, studentUserId));

		if (!studentUser) return null;

		const phasesRaw = await db
			.select({
				id: phase.id,
				title: phase.title,
				sortOrder: phase.sortOrder
			})
			.from(phase)
			.where(eq(phase.curriculumTrackId, classRow.curriculumTrackId))
			.orderBy(phase.sortOrder);

		const phaseIds = phasesRaw.map((p) => p.id);
		if (phaseIds.length === 0) {
			return {
				student: {
					userId: studentUser.id,
					fullName: studentUser.fullName,
					username: studentUser.username,
					nisn: studentUser.nisn,
					avatarUrl: studentUser.avatarUrl,
					kelasName: classRow.name,
					totalPoints: 0,
					attendanceRate: 0,
					overallProgress: 0,
					hasAnyStarted: false
				},
				phases: []
			};
		}

		const subPhasesRaw = await db
			.select({
				id: subPhase.id,
				phaseId: subPhase.phaseId,
				title: subPhase.title,
				sortOrder: subPhase.sortOrder
			})
			.from(subPhase)
			.where(inArray(subPhase.phaseId, phaseIds))
			.orderBy(subPhase.sortOrder);

		const subPhaseIds = subPhasesRaw.map((sp) => sp.id);

		const [sessionsRaw, studentAttendanceRaw, tasksRaw, studentSubmissionsRaw, quizzesRaw, studentQuizAttemptsRaw, totalPointsRow] = await Promise.all([
			subPhaseIds.length > 0
				? db
						.select({
							id: pertemuan.id,
							subPhaseId: pertemuan.subPhaseId
						})
						.from(pertemuan)
						.where(
							and(
								eq(pertemuan.kelasInstanceId, kelasInstanceId),
								inArray(pertemuan.subPhaseId, subPhaseIds)
							)
						)
				: Promise.resolve([]),

			subPhaseIds.length > 0
				? db
						.select({
							pertemuanId: attendance.pertemuanId,
							status: attendance.status
						})
						.from(attendance)
						.where(
							and(
								eq(attendance.userId, studentUserId),
								eq(attendance.status, 'hadir')
							)
						)
				: Promise.resolve([]),

			subPhaseIds.length > 0
				? db
						.select({
							id: task.id,
							pertemuanId: task.pertemuanId
						})
						.from(task)
				: Promise.resolve([]),

			db
				.select({
					taskId: submission.taskId,
					status: submission.status
				})
				.from(submission)
				.where(and(eq(submission.userId, studentUserId), eq(submission.status, 'approved'))),

			subPhaseIds.length > 0
				? db
						.select({
							id: quiz.id,
							subPhaseId: quiz.subPhaseId,
							passingScore: quiz.passingScore
						})
						.from(quiz)
						.where(inArray(quiz.subPhaseId, subPhaseIds))
				: Promise.resolve([]),

			db
				.select({
					quizId: quizAttempt.quizId,
					score: quizAttempt.score
				})
				.from(quizAttempt)
				.where(eq(quizAttempt.userId, studentUserId)),

			db
				.select({
					totalPoints: sql<number>`COALESCE(SUM(${pointLog.amount}), 0)`
				})
				.from(pointLog)
				.where(eq(pointLog.userId, studentUserId))
		]);

		const attendedSet = new Set(studentAttendanceRaw.map((a) => a.pertemuanId));
		const approvedTasksSet = new Set(studentSubmissionsRaw.map((s) => s.taskId));

		const quizPassingScoreMap = new Map<number, number>();
		for (const q of quizzesRaw) quizPassingScoreMap.set(q.id, q.passingScore);

		const passedQuizzesSet = new Set(
			studentQuizAttemptsRaw
				.filter((qa) => qa.score >= (quizPassingScoreMap.get(qa.quizId) || 60))
				.map((qa) => qa.quizId)
		);

		const sessionTasksMap = new Map<number, number[]>();
		for (const t of tasksRaw) {
			if (t.pertemuanId) {
				const list = sessionTasksMap.get(t.pertemuanId) || [];
				list.push(t.id);
				sessionTasksMap.set(t.pertemuanId, list);
			}
		}

		const subPhaseSessionsMap = new Map<number, number[]>();
		for (const s of sessionsRaw) {
			if (s.subPhaseId) {
				const list = subPhaseSessionsMap.get(s.subPhaseId) || [];
				list.push(s.id);
				subPhaseSessionsMap.set(s.subPhaseId, list);
			}
		}

		const subPhaseQuizzesMap = new Map<number, number[]>();
		for (const q of quizzesRaw) {
			const list = subPhaseQuizzesMap.get(q.subPhaseId) || [];
			list.push(q.id);
			subPhaseQuizzesMap.set(q.subPhaseId, list);
		}

		const phases: StudentPhaseDetail[] = phasesRaw.map((p) => {
			const subPhasesForPhase = subPhasesRaw.filter((sp) => sp.phaseId === p.id);

			const subPhases: StudentSubPhaseDetail[] = subPhasesForPhase.map((sp) => {
				const sessIds = subPhaseSessionsMap.get(sp.id) || [];
				const totalSessionsCount = sessIds.length;
				let attendedSessionsCount = 0;
				let totalTasksCount = 0;
				let approvedTasksCount = 0;

				for (const sId of sessIds) {
					if (attendedSet.has(sId)) attendedSessionsCount++;
					const tIds = sessionTasksMap.get(sId) || [];
					totalTasksCount += tIds.length;
					for (const tId of tIds) {
						if (approvedTasksSet.has(tId)) approvedTasksCount++;
					}
				}

				const quizIds = subPhaseQuizzesMap.get(sp.id) || [];
				const hasQuiz = quizIds.length > 0;
				const quizPassed = hasQuiz && quizIds.some((qId) => passedQuizzesSet.has(qId));

				const isStarted = totalSessionsCount > 0 || totalTasksCount > 0 || hasQuiz;

				const attRate = totalSessionsCount > 0 ? (attendedSessionsCount / totalSessionsCount) * 100 : 0;
				const tskRate = totalTasksCount > 0 ? (approvedTasksCount / totalTasksCount) * 100 : 0;
				const qzRate = hasQuiz ? (quizPassed ? 100 : 0) : 0;

				let completionRate = 0;
				if (!isStarted) {
					completionRate = 0;
				} else if (totalTasksCount > 0 && hasQuiz) {
					completionRate = Math.round(attRate * 0.4 + tskRate * 0.3 + qzRate * 0.3);
				} else if (totalTasksCount > 0) {
					completionRate = Math.round(attRate * 0.5 + tskRate * 0.5);
				} else if (hasQuiz) {
					completionRate = Math.round(attRate * 0.5 + qzRate * 0.5);
				} else {
					completionRate = Math.round(attRate);
				}

				return {
					id: sp.id,
					title: sp.title,
					sortOrder: sp.sortOrder,
					totalSessionsCount,
					attendedSessionsCount,
					totalTasksCount,
					approvedTasksCount,
					hasQuiz,
					quizPassed,
					isStarted,
					completionRate
				};
			});

			const startedSubPhases = subPhases.filter((sp) => sp.isStarted);
			const hasStartedSubPhases = startedSubPhases.length > 0;
			const phaseCompletionRate = hasStartedSubPhases
				? Math.round(startedSubPhases.reduce((acc, sp) => acc + sp.completionRate, 0) / startedSubPhases.length)
				: 0;

			return {
				id: p.id,
				phaseCode: `FASE ${p.sortOrder}`,
				title: p.title,
				sortOrder: p.sortOrder,
				hasStartedSubPhases,
				completionRate: phaseCompletionRate,
				subPhases
			};
		});

		const startedPhases = phases.filter((p) => p.hasStartedSubPhases);
		const hasAnyStarted = startedPhases.length > 0;
		const overallProgress = hasAnyStarted
			? Math.round(startedPhases.reduce((acc, p) => acc + p.completionRate, 0) / startedPhases.length)
			: 0;

		const totalPoints = totalPointsRow[0] ? Number(totalPointsRow[0].totalPoints) : 0;

		return {
			student: {
				userId: studentUser.id,
				fullName: studentUser.fullName,
				username: studentUser.username,
				nisn: studentUser.nisn,
				avatarUrl: studentUser.avatarUrl,
				kelasName: classRow.name,
				totalPoints,
				attendanceRate: 0,
				overallProgress,
				hasAnyStarted
			},
			phases
		};
	},

	/**
	 * Fetch detailed student session attendance log history for drawer view
	 */
	async getStudentAttendanceHistory(
		studentUserId: number,
		kelasInstanceId: number
	): Promise<StudentAttendanceHistoryDetail | null> {
		const [classRow] = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name
			})
			.from(kelasInstance)
			.where(eq(kelasInstance.id, kelasInstanceId));

		if (!classRow) return null;

		const [studentUser] = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn,
				avatarUrl: user.avatarUrl
			})
			.from(user)
			.where(eq(user.id, studentUserId));

		if (!studentUser) return null;

		const sessionsRaw = await db
			.select({
				id: pertemuan.id,
				title: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				activityType: pertemuan.activityType
			})
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
			.orderBy(desc(pertemuan.sessionDate));

		const sessionIds = sessionsRaw.map((s) => s.id);

		const attendanceRecords = sessionIds.length > 0
			? await db
					.select({
						pertemuanId: attendance.pertemuanId,
						status: attendance.status,
						method: attendance.method,
						manualReason: attendance.manualReason,
						recordedAt: attendance.recordedAt
					})
					.from(attendance)
					.where(and(eq(attendance.userId, studentUserId), inArray(attendance.pertemuanId, sessionIds)))
			: [];

		const attendanceMap = new Map<number, typeof attendanceRecords[0]>();
		for (const a of attendanceRecords) {
			attendanceMap.set(a.pertemuanId, a);
		}

		let totalHadir = 0;
		let totalExcused = 0;
		let totalAlpha = 0;

		const logs: StudentSessionAttendanceLog[] = sessionsRaw.map((s) => {
			const att = attendanceMap.get(s.id);
			let status: 'hadir' | 'excused' | 'alpha' = 'alpha';

			if (att?.status === 'hadir') {
				status = 'hadir';
				totalHadir++;
			} else if (att?.status === 'excused') {
				status = 'excused';
				totalExcused++;
			} else {
				status = 'alpha';
				totalAlpha++;
			}

			return {
				sessionId: s.id,
				sessionTitle: s.title,
				sessionDate: String(s.sessionDate),
				startTime: String(s.startTime),
				activityType: s.activityType,
				status,
				method: (att?.method as 'qr' | 'manual' | null) || null,
				manualReason: att?.manualReason || null,
				recordedAt: att?.recordedAt || null
			};
		});

		const totalSessionsCount = sessionsRaw.length;
		const recordedCount = totalHadir + totalExcused + totalAlpha;
		const attendanceRate = recordedCount > 0 ? Math.round((totalHadir / recordedCount) * 100) : 0;

		return {
			student: {
				userId: studentUser.id,
				fullName: studentUser.fullName,
				username: studentUser.username,
				nisn: studentUser.nisn,
				avatarUrl: studentUser.avatarUrl,
				kelasName: classRow.name,
				totalHadir,
				totalExcused,
				totalAlpha,
				totalSessionsCount,
				attendanceRate
			},
			logs
		};
	}
};

import { db } from '$lib/server/db';
import {
	tingkat,
	curriculumTrack,
	phase,
	subPhase,
	materi,
	quiz,
	kelasInstance,
	tahunAjaran,
	pertemuan,
	attendance,
	keanggotaan,
	task,
	submission,
	quizAttempt
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, sql, count, gte } from 'drizzle-orm';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface TrackSummaryCard {
	id: number;
	title: string;
	description: string | null;
	tingkatId: number;
	tingkatName: string;
	executingClassesCount: number;
	executingClassNames: string[];
	totalStudents: number;
	totalPhases: number;
	totalSubPhases: number;
	totalMateri: number;
	totalQuizzes: number;
	avgCompletionRate: number;
	trackState: 'active' | 'upcoming' | 'archived';
}

export interface ClassInstanceOption {
	id: number;
	name: string;
}

export interface SubPhaseProgressItem {
	id: number;
	title: string;
	description: string | null;
	sortOrder: number;
	materiCount: number;
	hasQuiz: boolean;
	quizTitle: string | null;
	passingScore: number | null;
	totalClassSessions: number;
	completedStudentsCount: number;
	totalActiveStudents: number;
	completionRate: number; // 0 - 100%
	// Breakdown rates for transparency
	attendanceRate: number;
	taskCompletionRate: number;
	quizPassRate: number;
	totalTasks: number;
	totalApprovedSubmissions: number;
	quizPassedCount: number;
	status: 'SELESAI' | 'BERJALAN' | 'BELUM_DIMULAI';
}

export interface PhaseProgressGroup {
	id: number;
	title: string;
	description: string | null;
	sortOrder: number;
	avgCompletionRate: number;
	subPhases: SubPhaseProgressItem[];
}

export interface CurriculumGridViewData {
	viewMode: 'grid';
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	trackCards: TrackSummaryCard[];
}

export interface CurriculumDetailViewData {
	viewMode: 'detail';
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	selectedTrack: {
		id: number;
		title: string;
		description: string | null;
		tingkatId: number;
		tingkatName: string;
	};
	kelasOptions: ClassInstanceOption[];
	selectedKelas: ClassInstanceOption | null;
	summary: {
		totalPhases: number;
		totalSubPhases: number;
		totalMateri: number;
		totalQuizzes: number;
		totalExecutingClasses: number;
		totalStudents: number;
		avgTrackCompletionRate: number;
	};
	phases: PhaseProgressGroup[];
}

export type CurriculumMonitoringData = CurriculumGridViewData | CurriculumDetailViewData;

/**
 * Calculate a composite completion rate for a SubPhase using all available signals.
 * Weights are assigned dynamically based on what content exists:
 *
 *   - Has Tasks + Quiz:  40% Attendance + 30% Task + 30% Quiz
 *   - Has Tasks only:    50% Attendance + 50% Task
 *   - Has Quiz only:     50% Attendance + 50% Quiz
 *   - Neither:           100% Attendance
 */
function calculateCompositeRate(params: {
	attendanceRate: number;
	taskCompletionRate: number;
	quizPassRate: number;
	hasTasks: boolean;
	hasQuiz: boolean;
}): number {
	const { attendanceRate, taskCompletionRate, quizPassRate, hasTasks, hasQuiz } = params;

	if (hasTasks && hasQuiz) {
		return Math.round(attendanceRate * 0.4 + taskCompletionRate * 0.3 + quizPassRate * 0.3);
	}
	if (hasTasks) {
		return Math.round(attendanceRate * 0.5 + taskCompletionRate * 0.5);
	}
	if (hasQuiz) {
		return Math.round(attendanceRate * 0.5 + quizPassRate * 0.5);
	}
	return Math.round(attendanceRate);
}

export const CurriculumMonitoringService = {
	/**
	 * Get all academic years sorted by active first
	 */
	async getTahunAjaranOptions(): Promise<TahunAjaranOption[]> {
		return await db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive
			})
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.name));
	},

	/**
	 * Fetch Tier 1: Grid of Curriculum Track Cards for an Academic Year (Parallel Query Batching)
	 */
	async getTrackCards(
		tahunAjaranId?: number,
		options?: { onlyExecuting?: boolean; kelasInstanceId?: number }
	): Promise<CurriculumGridViewData> {
		// Always fetch active academic year if not provided
		const tahunAjaranOptions = await db
			.select({ id: tahunAjaran.id, name: tahunAjaran.name, isActive: tahunAjaran.isActive })
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.name));

		const selectedTahunAjaran = tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === tahunAjaranId) || tahunAjaranOptions[0] || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		if (!selectedTahunAjaran) {
			return {
				viewMode: 'grid',
				tahunAjaranOptions,
				selectedTahunAjaran: null,
				trackCards: []
			};
		}

		const activeTaId = selectedTahunAjaran.id;

		// 1. Fetch running classes with assigned tracks & session-based tracks & all published tracks in parallel
		const [runningClassesWithTracks, sessionClassesWithTracks, allTracks] = await Promise.all([
			db
				.select({
					kelasId: kelasInstance.id,
					kelasName: kelasInstance.name,
					tingkatId: kelasInstance.tingkatId,
					tingkatName: tingkat.name,
					trackId: curriculumTrack.id,
					trackTitle: curriculumTrack.title,
					trackDesc: curriculumTrack.description
				})
				.from(kelasInstance)
				.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
				.leftJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
				.where(
					and(
						eq(kelasInstance.tahunAjaranId, activeTaId),
						options?.kelasInstanceId ? eq(kelasInstance.id, options.kelasInstanceId) : undefined
					)
				)
				.orderBy(tingkat.levelOrder, curriculumTrack.title),

			db
				.select({
					kelasId: kelasInstance.id,
					kelasName: kelasInstance.name,
					tingkatId: kelasInstance.tingkatId,
					tingkatName: tingkat.name,
					trackId: curriculumTrack.id,
					trackTitle: curriculumTrack.title,
					trackDesc: curriculumTrack.description
				})
				.from(pertemuan)
				.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
				.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.innerJoin(curriculumTrack, eq(phase.curriculumTrackId, curriculumTrack.id))
				.leftJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
				.where(
					and(
						eq(kelasInstance.tahunAjaranId, activeTaId),
						options?.kelasInstanceId ? eq(kelasInstance.id, options.kelasInstanceId) : undefined
					)
				),

			db
				.select({
					id: curriculumTrack.id,
					title: curriculumTrack.title,
					description: curriculumTrack.description,
					tingkatId: curriculumTrack.tingkatId,
					tingkatName: tingkat.name
				})
				.from(curriculumTrack)
				.leftJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
				.where(eq(curriculumTrack.isPublished, true))
				.orderBy(tingkat.levelOrder, curriculumTrack.title)
		]);

		const trackMap = new Map<number, {
			id: number;
			title: string;
			description: string | null;
			tingkatId: number;
			tingkatName: string;
			kelasIds: number[];
			classNames: string[];
		}>();

		for (const row of [...runningClassesWithTracks, ...sessionClassesWithTracks]) {
			if (!trackMap.has(row.trackId)) {
				trackMap.set(row.trackId, {
					id: row.trackId,
					title: row.trackTitle,
					description: row.trackDesc,
					tingkatId: row.tingkatId ?? 0,
					tingkatName: row.tingkatName ?? 'Umum',
					kelasIds: [],
					classNames: []
				});
			}
			const entry = trackMap.get(row.trackId)!;
			if (!entry.kelasIds.includes(row.kelasId)) {
				entry.kelasIds.push(row.kelasId);
				entry.classNames.push(row.kelasName);
			}
		}

		if (!options?.onlyExecuting || trackMap.size === 0) {
			for (const tr of allTracks) {
				if (!trackMap.has(tr.id)) {
					trackMap.set(tr.id, {
						id: tr.id,
						title: tr.title,
						description: tr.description,
						tingkatId: tr.tingkatId ?? 0,
						tingkatName: tr.tingkatName ?? 'Umum',
						kelasIds: [],
						classNames: []
					});
				}
			}
		}

		const allTrackIds = Array.from(trackMap.keys());
		if (allTrackIds.length === 0) {
			return {
				viewMode: 'grid',
				tahunAjaranOptions,
				selectedTahunAjaran,
				trackCards: []
			};
		}

		const allExecutingClassIds = Array.from(trackMap.values()).flatMap((t) => t.kelasIds);

		// 2. Parallel Batch Fetching: counts + students + sessions
		const [
			phasesCountList,
			subPhasesCountList,
			materiCountList,
			quizCountList,
			activeStudentsList,
			allSessions
		] = await Promise.all([
			db
				.select({ trackId: phase.curriculumTrackId, total: count(phase.id) })
				.from(phase)
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			db
				.select({ trackId: phase.curriculumTrackId, total: count(subPhase.id) })
				.from(subPhase)
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			db
				.select({ trackId: phase.curriculumTrackId, total: count(materi.id) })
				.from(materi)
				.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			db
				.select({ trackId: phase.curriculumTrackId, total: count(quiz.id) })
				.from(quiz)
				.innerJoin(subPhase, eq(quiz.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			allExecutingClassIds.length > 0
				? db
						.select({ kelasInstanceId: keanggotaan.kelasInstanceId, userId: keanggotaan.userId })
						.from(keanggotaan)
						.where(and(inArray(keanggotaan.kelasInstanceId, allExecutingClassIds), eq(keanggotaan.status, 'aktif')))
				: Promise.resolve([]),

			allExecutingClassIds.length > 0
				? db
						.select({ id: pertemuan.id, kelasInstanceId: pertemuan.kelasInstanceId })
						.from(pertemuan)
						.where(inArray(pertemuan.kelasInstanceId, allExecutingClassIds))
				: Promise.resolve([])
		]);

		const phasesCountMap = new Map<number, number>();
		for (const p of phasesCountList) phasesCountMap.set(p.trackId, Number(p.total));

		const subPhasesCountMap = new Map<number, number>();
		for (const sp of subPhasesCountList) subPhasesCountMap.set(sp.trackId, Number(sp.total));

		const materiCountMap = new Map<number, number>();
		for (const m of materiCountList) materiCountMap.set(m.trackId, Number(m.total));

		const quizCountMap = new Map<number, number>();
		for (const q of quizCountList) quizCountMap.set(q.trackId, Number(q.total));

		// students per class
		const classStudentsMap = new Map<number, number[]>();
		for (const st of activeStudentsList) {
			const list = classStudentsMap.get(st.kelasInstanceId) || [];
			list.push(st.userId);
			classStudentsMap.set(st.kelasInstanceId, list);
		}

		// 3. Batch attendance, tasks, and submissions for all sessions
		const allSessionIds = allSessions.map((s) => s.id);

		const [attendanceRows, taskRows, submissionRows] = await Promise.all([
			allSessionIds.length > 0
				? db
						.select({ pertemuanId: attendance.pertemuanId, total: count(attendance.id) })
						.from(attendance)
						.where(and(inArray(attendance.pertemuanId, allSessionIds), eq(attendance.status, 'hadir')))
						.groupBy(attendance.pertemuanId)
				: Promise.resolve([]),

			allSessionIds.length > 0
				? db
						.select({ id: task.id, pertemuanId: task.pertemuanId })
						.from(task)
						.where(inArray(task.pertemuanId, allSessionIds))
				: Promise.resolve([]),

			// We'll fetch submissions separately after we have task IDs
			Promise.resolve([])
		]);

		const allTaskIds = taskRows.map((t) => t.id);
		const approvedSubmissions = allTaskIds.length > 0
			? await db
					.select({ taskId: submission.taskId, total: count(submission.id) })
					.from(submission)
					.where(and(inArray(submission.taskId, allTaskIds), eq(submission.status, 'approved')))
					.groupBy(submission.taskId)
			: [];

		// Map: pertemuanId -> attendance count
		const attendanceMap = new Map<number, number>();
		for (const a of attendanceRows) attendanceMap.set(a.pertemuanId, Number(a.total));

		// Map: pertemuanId -> task count, Map: pertemuanId -> approved submissions count
		const tasksPerSessionMap = new Map<number, number>();
		const taskIdToSession = new Map<number, number>();
		for (const t of taskRows) {
			tasksPerSessionMap.set(t.pertemuanId, (tasksPerSessionMap.get(t.pertemuanId) || 0) + 1);
			taskIdToSession.set(t.id, t.pertemuanId);
		}

		const approvedPerSessionMap = new Map<number, number>();
		for (const s of approvedSubmissions) {
			const sessId = taskIdToSession.get(s.taskId);
			if (sessId !== undefined) {
				approvedPerSessionMap.set(sessId, (approvedPerSessionMap.get(sessId) || 0) + Number(s.total));
			}
		}

		// sessions per kelasInstance
		const sessionsPerClass = new Map<number, number[]>();
		for (const s of allSessions) {
			const list = sessionsPerClass.get(s.kelasInstanceId) || [];
			list.push(s.id);
			sessionsPerClass.set(s.kelasInstanceId, list);
		}

		// Build Track Cards
		const trackCards: TrackSummaryCard[] = [];

		for (const tr of trackMap.values()) {
			const executingClassIds = tr.kelasIds;
			let trackTotalStudents = 0;

			// Aggregate across all classes in this track
			let totalAttended = 0;
			let totalMaxAttendance = 0; // sessions × students
			let totalTaskSlots = 0;     // tasks × students eligible
			let totalApproved = 0;

			for (const cId of executingClassIds) {
				const sList = classStudentsMap.get(cId) || [];
				const studCount = sList.length;
				trackTotalStudents += studCount;

				const sessList = sessionsPerClass.get(cId) || [];
				for (const sessId of sessList) {
					totalAttended += attendanceMap.get(sessId) || 0;
					totalMaxAttendance += studCount;

					const taskCount = tasksPerSessionMap.get(sessId) || 0;
					totalTaskSlots += taskCount * studCount;
					totalApproved += approvedPerSessionMap.get(sessId) || 0;
				}
			}

			const attendanceRate = totalMaxAttendance > 0
				? Math.min(100, (totalAttended / totalMaxAttendance) * 100)
				: 0;
			const taskRate = totalTaskSlots > 0
				? Math.min(100, (totalApproved / totalTaskSlots) * 100)
				: 0;

			const hasTasks = totalTaskSlots > 0;
			const hasQuizInTrack = (quizCountMap.get(tr.id) || 0) > 0;

			// For Tier 1 cards, quiz pass rate is expensive to compute per-track,
			// so we use attendance + task only (quiz detail is in Tier 2)
			const avgCompletionRate = executingClassIds.length === 0
				? 0
				: calculateCompositeRate({
						attendanceRate,
						taskCompletionRate: taskRate,
						quizPassRate: 0,
						hasTasks,
						hasQuiz: false // defer quiz to detail view
					});

			const trackState: 'active' | 'upcoming' | 'archived' =
				tr.kelasIds.length === 0
					? 'upcoming'
					: avgCompletionRate >= 100
						? 'archived'
						: 'active';

			trackCards.push({
				id: tr.id,
				title: tr.title,
				description: tr.description,
				tingkatId: tr.tingkatId,
				tingkatName: tr.tingkatName,
				executingClassesCount: tr.kelasIds.length,
				executingClassNames: tr.classNames,
				totalStudents: trackTotalStudents,
				totalPhases: phasesCountMap.get(tr.id) || 0,
				totalSubPhases: subPhasesCountMap.get(tr.id) || 0,
				totalMateri: materiCountMap.get(tr.id) || 0,
				totalQuizzes: quizCountMap.get(tr.id) || 0,
				avgCompletionRate,
				trackState
			});
		}

		return {
			viewMode: 'grid',
			tahunAjaranOptions,
			selectedTahunAjaran,
			trackCards
		};
	},

	/**
	 * Fetch Tier 2: Detailed Phase & SubPhase Hierarchy (Parallel Query Batching)
	 *
	 * Completion per SubPhase = weighted composite of:
	 *   - Attendance Rate   (kehadiran siswa di sesi pertemuan)
	 *   - Task Completion   (tugas approved / total tugas × siswa)
	 *   - Quiz Pass Rate    (siswa lulus quiz ≥ passing score)
	 */
	async getTrackDetail(params: {
		trackId: number;
		tahunAjaranId?: number;
		kelasInstanceId?: number;
	}): Promise<CurriculumDetailViewData> {
		const tahunAjaranOptions = await this.getTahunAjaranOptions();

		const selectedTahunAjaran = params.tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === params.tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		const activeTaId = selectedTahunAjaran?.id || 1;

		// 1. Parallel: Track profile, executing classes (direct + sessions), phases
		const [[trackRow], directClasses, sessionClasses, trackPhases] = await Promise.all([
			db
				.select({
					id: curriculumTrack.id,
					title: curriculumTrack.title,
					description: curriculumTrack.description,
					tingkatId: curriculumTrack.tingkatId,
					tingkatName: tingkat.name
				})
				.from(curriculumTrack)
				.innerJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
				.where(eq(curriculumTrack.id, params.trackId)),

			db
				.select({ id: kelasInstance.id, name: kelasInstance.name })
				.from(kelasInstance)
				.where(and(eq(kelasInstance.tahunAjaranId, activeTaId), eq(kelasInstance.curriculumTrackId, params.trackId)))
				.orderBy(kelasInstance.name),

			db
				.select({ id: kelasInstance.id, name: kelasInstance.name })
				.from(pertemuan)
				.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
				.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(and(eq(kelasInstance.tahunAjaranId, activeTaId), eq(phase.curriculumTrackId, params.trackId))),

			db
				.select({ id: phase.id, title: phase.title, description: phase.description, sortOrder: phase.sortOrder })
				.from(phase)
				.where(eq(phase.curriculumTrackId, params.trackId))
				.orderBy(phase.sortOrder)
		]);

		if (!trackRow) {
			throw new Error('Curriculum Track tidak ditemukan');
		}

		// Combine direct & session classes without duplicates
		const classMap = new Map<number, { id: number; name: string }>();
		for (const c of [...directClasses, ...sessionClasses]) {
			classMap.set(c.id, c);
		}
		const runningClasses = Array.from(classMap.values());

		const kelasOptions: ClassInstanceOption[] = runningClasses.map((c) => ({ id: c.id, name: c.name }));
		const selectedKelas = params.kelasInstanceId ? kelasOptions.find((k) => k.id === params.kelasInstanceId) || null : null;
		const targetClassIds = selectedKelas ? [selectedKelas.id] : kelasOptions.map((c) => c.id);
		const phaseIds = trackPhases.map((p) => p.id);

		const emptyResult = (totalStudents = 0): CurriculumDetailViewData => ({
			viewMode: 'detail',
			tahunAjaranOptions,
			selectedTahunAjaran,
			selectedTrack: trackRow,
			kelasOptions,
			selectedKelas,
			summary: {
				totalPhases: trackPhases.length,
				totalSubPhases: 0, totalMateri: 0, totalQuizzes: 0,
				totalExecutingClasses: targetClassIds.length,
				totalStudents,
				avgTrackCompletionRate: 0
			},
			phases: []
		});

		if (phaseIds.length === 0) return emptyResult();

		// 2. Parallel: SubPhases + enrolled students
		const [subPhasesList, activeStudents] = await Promise.all([
			db
				.select({ id: subPhase.id, phaseId: subPhase.phaseId, title: subPhase.title, description: subPhase.description, sortOrder: subPhase.sortOrder })
				.from(subPhase)
				.where(inArray(subPhase.phaseId, phaseIds))
				.orderBy(subPhase.phaseId, subPhase.sortOrder),

			targetClassIds.length > 0
				? db.select({ userId: keanggotaan.userId }).from(keanggotaan)
						.where(and(inArray(keanggotaan.kelasInstanceId, targetClassIds), eq(keanggotaan.status, 'aktif')))
				: Promise.resolve([])
		]);

		const subPhaseIds = subPhasesList.map((sp) => sp.id);
		const studentIds = activeStudents.map((s) => s.userId);
		const totalStudents = studentIds.length;

		if (subPhaseIds.length === 0) return emptyResult(totalStudents);

		// 3. Parallel: Materi, Quizzes, Sessions, Quiz IDs
		const [materiCounts, quizzesList, subPhaseSessions] = await Promise.all([
			db
				.select({ subPhaseId: materi.subPhaseId, total: count(materi.id) })
				.from(materi)
				.where(inArray(materi.subPhaseId, subPhaseIds))
				.groupBy(materi.subPhaseId),

			db
				.select({ id: quiz.id, subPhaseId: quiz.subPhaseId, title: quiz.title, passingScore: quiz.passingScore })
				.from(quiz)
				.where(inArray(quiz.subPhaseId, subPhaseIds)),

			targetClassIds.length > 0
				? db
						.select({ id: pertemuan.id, subPhaseId: pertemuan.subPhaseId, kelasInstanceId: pertemuan.kelasInstanceId })
						.from(pertemuan)
						.where(and(inArray(pertemuan.subPhaseId, subPhaseIds), inArray(pertemuan.kelasInstanceId, targetClassIds)))
				: Promise.resolve([])
		]);

		const materiMap = new Map<number, number>();
		for (const mc of materiCounts) materiMap.set(mc.subPhaseId, Number(mc.total));

		const quizMap = new Map<number, { id: number; title: string; passingScore: number }>();
		for (const q of quizzesList) quizMap.set(q.subPhaseId, { id: q.id, title: q.title, passingScore: q.passingScore });

		// sessions grouped by subPhaseId
		const sessionMap = new Map<number, number[]>();
		for (const sess of subPhaseSessions) {
			const list = sessionMap.get(sess.subPhaseId) || [];
			list.push(sess.id);
			sessionMap.set(sess.subPhaseId, list);
		}

		const allSessionIds = subPhaseSessions.map((s) => s.id);
		const allQuizIds = quizzesList.map((q) => q.id);

		// 4. Parallel: Attendance per session, Tasks per session, Quiz attempts
		const [attendanceCounts, taskRows, quizAttemptRows] = await Promise.all([
			(allSessionIds.length > 0 && studentIds.length > 0)
				? db
						.select({ pertemuanId: attendance.pertemuanId, attendedCount: count(attendance.id) })
						.from(attendance)
						.where(and(
							inArray(attendance.pertemuanId, allSessionIds),
							inArray(attendance.userId, studentIds),
							eq(attendance.status, 'hadir')
						))
						.groupBy(attendance.pertemuanId)
				: Promise.resolve([]),

			allSessionIds.length > 0
				? db
						.select({ id: task.id, pertemuanId: task.pertemuanId })
						.from(task)
						.where(inArray(task.pertemuanId, allSessionIds))
				: Promise.resolve([]),

			(allQuizIds.length > 0 && studentIds.length > 0)
				? db
						.select({ quizId: quizAttempt.quizId, userId: quizAttempt.userId, score: quizAttempt.score })
						.from(quizAttempt)
						.where(and(
							inArray(quizAttempt.quizId, allQuizIds),
							inArray(quizAttempt.userId, studentIds)
						))
				: Promise.resolve([])
		]);

		// attendance per session
		const attendanceSessionMap = new Map<number, number>();
		for (const ac of attendanceCounts) attendanceSessionMap.set(ac.pertemuanId, Number(ac.attendedCount));

		// tasks per session + approved submissions
		const taskIdToSession = new Map<number, number>();
		const tasksPerSessionMap = new Map<number, number>();
		for (const t of taskRows) {
			taskIdToSession.set(t.id, t.pertemuanId);
			tasksPerSessionMap.set(t.pertemuanId, (tasksPerSessionMap.get(t.pertemuanId) || 0) + 1);
		}

		const allTaskIds = taskRows.map((t) => t.id);
		const approvedSubmissions = (allTaskIds.length > 0 && studentIds.length > 0)
			? await db
					.select({ taskId: submission.taskId, total: count(submission.id) })
					.from(submission)
					.where(and(
						inArray(submission.taskId, allTaskIds),
						inArray(submission.userId, studentIds),
						eq(submission.status, 'approved')
					))
					.groupBy(submission.taskId)
			: [];

		// approved count per session
		const approvedPerSessionMap = new Map<number, number>();
		for (const s of approvedSubmissions) {
			const sessId = taskIdToSession.get(s.taskId);
			if (sessId !== undefined) {
				approvedPerSessionMap.set(sessId, (approvedPerSessionMap.get(sessId) || 0) + Number(s.total));
			}
		}

		// quiz pass tracking: per quizId, count distinct users who passed
		// For each quiz, track best score per user
		const quizBestScores = new Map<number, Map<number, number>>(); // quizId -> userId -> bestScore
		for (const attempt of quizAttemptRows) {
			if (!quizBestScores.has(attempt.quizId)) {
				quizBestScores.set(attempt.quizId, new Map());
			}
			const userScores = quizBestScores.get(attempt.quizId)!;
			const prev = userScores.get(attempt.userId) || 0;
			if (attempt.score > prev) {
				userScores.set(attempt.userId, attempt.score);
			}
		}

		// 5. Build hierarchy with composite progress metrics
		let totalSubPhasesCount = 0;
		let totalMateriCount = 0;
		let totalQuizzesCount = quizzesList.length;
		let totalTrackCompletionSum = 0;

		const phaseGroupsMap = new Map<number, PhaseProgressGroup>();
		for (const p of trackPhases) {
			phaseGroupsMap.set(p.id, {
				id: p.id, title: p.title, description: p.description,
				sortOrder: p.sortOrder, avgCompletionRate: 0, subPhases: []
			});
		}

		for (const sp of subPhasesList) {
			totalSubPhasesCount++;
			const mCount = materiMap.get(sp.id) || 0;
			totalMateriCount += mCount;

			const quizInfo = quizMap.get(sp.id) || null;
			const linkedSessions = sessionMap.get(sp.id) || [];
			const totalClassSessions = linkedSessions.length;

			// ── Attendance Rate ──
			let totalAttendedInSubPhase = 0;
			for (const sessId of linkedSessions) {
				totalAttendedInSubPhase += attendanceSessionMap.get(sessId) || 0;
			}
			const maxPossibleAttendance = totalClassSessions * totalStudents;
			const attendanceRate = (totalStudents === 0 || totalClassSessions === 0)
				? 0
				: Math.min(100, (totalAttendedInSubPhase / maxPossibleAttendance) * 100);

			// ── Task Completion Rate ──
			let totalTasksInSubPhase = 0;
			let totalApprovedInSubPhase = 0;
			for (const sessId of linkedSessions) {
				const taskCount = tasksPerSessionMap.get(sessId) || 0;
				totalTasksInSubPhase += taskCount;
				totalApprovedInSubPhase += approvedPerSessionMap.get(sessId) || 0;
			}
			const totalTaskSlots = totalTasksInSubPhase * totalStudents;
			const taskCompletionRate = totalTaskSlots > 0
				? Math.min(100, (totalApprovedInSubPhase / totalTaskSlots) * 100)
				: 0;
			const hasTasks = totalTasksInSubPhase > 0;

			// ── Quiz Pass Rate ──
			let quizPassedCount = 0;
			let quizPassRate = 0;
			if (quizInfo && totalStudents > 0) {
				const userScores = quizBestScores.get(quizInfo.id);
				if (userScores) {
					for (const [, bestScore] of userScores) {
						if (bestScore >= quizInfo.passingScore) {
							quizPassedCount++;
						}
					}
				}
				quizPassRate = Math.min(100, (quizPassedCount / totalStudents) * 100);
			}

			// ── Composite Completion Rate ──
			const completionRate = (totalStudents === 0 || totalClassSessions === 0)
				? 0
				: calculateCompositeRate({
						attendanceRate,
						taskCompletionRate,
						quizPassRate,
						hasTasks,
						hasQuiz: !!quizInfo
					});

			totalTrackCompletionSum += completionRate;

			let status: 'SELESAI' | 'BERJALAN' | 'BELUM_DIMULAI' = 'BELUM_DIMULAI';
			if (completionRate >= 80) {
				status = 'SELESAI';
			} else if (completionRate > 0 || totalClassSessions > 0) {
				status = 'BERJALAN';
			}

			// completedStudentsCount: estimate students considered "done" with this subphase
			// Use the composite rate against total students
			const completedStudentsCount = Math.round((completionRate / 100) * totalStudents);

			const subPhaseItem: SubPhaseProgressItem = {
				id: sp.id,
				title: sp.title,
				description: sp.description,
				sortOrder: sp.sortOrder,
				materiCount: mCount,
				hasQuiz: !!quizInfo,
				quizTitle: quizInfo?.title || null,
				passingScore: quizInfo?.passingScore || null,
				totalClassSessions,
				completedStudentsCount,
				totalActiveStudents: totalStudents,
				completionRate,
				attendanceRate: Math.round(attendanceRate),
				taskCompletionRate: Math.round(taskCompletionRate),
				quizPassRate: Math.round(quizPassRate),
				totalTasks: totalTasksInSubPhase,
				totalApprovedSubmissions: totalApprovedInSubPhase,
				quizPassedCount,
				status
			};

			const group = phaseGroupsMap.get(sp.phaseId);
			if (group) {
				group.subPhases.push(subPhaseItem);
			}
		}

		const phases: PhaseProgressGroup[] = [];
		for (const group of phaseGroupsMap.values()) {
			if (group.subPhases.length > 0) {
				const sum = group.subPhases.reduce((acc, curr) => acc + curr.completionRate, 0);
				group.avgCompletionRate = Math.round(sum / group.subPhases.length);
			}
			phases.push(group);
		}

		const avgTrackCompletionRate = totalSubPhasesCount > 0
			? Math.round(totalTrackCompletionSum / totalSubPhasesCount)
			: 0;

		return {
			viewMode: 'detail',
			tahunAjaranOptions,
			selectedTahunAjaran,
			selectedTrack: trackRow,
			kelasOptions,
			selectedKelas,
			summary: {
				totalPhases: trackPhases.length,
				totalSubPhases: totalSubPhasesCount,
				totalMateri: totalMateriCount,
				totalQuizzes: totalQuizzesCount,
				totalExecutingClasses: targetClassIds.length,
				totalStudents,
				avgTrackCompletionRate
			},
			phases
		};
	}
};

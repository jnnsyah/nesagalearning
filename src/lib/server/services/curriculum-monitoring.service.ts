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
	keanggotaan
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, sql, count } from 'drizzle-orm';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface TingkatOption {
	id: number;
	name: string;
	levelOrder: number;
}

export interface ClassInstanceOption {
	id: number;
	name: string;
	tingkatId: number;
	tahunAjaranId: number;
	curriculumTrackId: number | null;
	curriculumTrackTitle: string | null;
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

export interface CurriculumMonitoringData {
	tahunAjaranOptions: TahunAjaranOption[];
	tingkatOptions: TingkatOption[];
	kelasOptions: ClassInstanceOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	selectedTingkat: TingkatOption | null;
	selectedKelas: ClassInstanceOption | null;
	activeTrackTitle: string | null;
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

export const CurriculumMonitoringService = {
	/**
	 * Get all academic years
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
	 * Get master grade levels (Tingkat)
	 */
	async getTingkatOptions(): Promise<TingkatOption[]> {
		return await db
			.select({
				id: tingkat.id,
				name: tingkat.name,
				levelOrder: tingkat.levelOrder
			})
			.from(tingkat)
			.orderBy(tingkat.levelOrder);
	},

	/**
	 * Get curriculum monitoring data based on Academic Year + Grade Level + Rombel
	 */
	async getCurriculumMonitoring(params: {
		tahunAjaranId?: number;
		tingkatId?: number;
		kelasInstanceId?: number;
	}): Promise<CurriculumMonitoringData> {
		const [tahunAjaranOptions, tingkatOptions] = await Promise.all([
			this.getTahunAjaranOptions(),
			this.getTingkatOptions()
		]);

		// Resolve Selected Academic Year (default to active TA)
		const selectedTahunAjaran = params.tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === params.tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		const activeTaId = selectedTahunAjaran?.id;

		// Resolve Selected Tingkat (default to first Tingkat)
		const selectedTingkat = params.tingkatId
			? tingkatOptions.find((t) => t.id === params.tingkatId) || null
			: tingkatOptions[0] || null;

		const activeTingkatId = selectedTingkat?.id;

		if (!activeTaId || !activeTingkatId) {
			return {
				tahunAjaranOptions,
				tingkatOptions,
				kelasOptions: [],
				selectedTahunAjaran,
				selectedTingkat,
				selectedKelas: null,
				activeTrackTitle: null,
				summary: {
					totalPhases: 0,
					totalSubPhases: 0,
					totalMateri: 0,
					totalQuizzes: 0,
					totalExecutingClasses: 0,
					totalStudents: 0,
					avgTrackCompletionRate: 0
				},
				phases: []
			};
		}

		// Fetch Class Instances for the selected Academic Year & Tingkat
		const runningClasses = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatId: kelasInstance.tingkatId,
				tahunAjaranId: kelasInstance.tahunAjaranId,
				curriculumTrackId: kelasInstance.curriculumTrackId,
				curriculumTrackTitle: curriculumTrack.title
			})
			.from(kelasInstance)
			.leftJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.where(
				and(
					eq(kelasInstance.tahunAjaranId, activeTaId),
					eq(kelasInstance.tingkatId, activeTingkatId)
				)
			)
			.orderBy(kelasInstance.name);

		const kelasOptions: ClassInstanceOption[] = runningClasses.map((c) => ({
			id: c.id,
			name: c.name,
			tingkatId: c.tingkatId,
			tahunAjaranId: c.tahunAjaranId,
			curriculumTrackId: c.curriculumTrackId,
			curriculumTrackTitle: c.curriculumTrackTitle
		}));

		// Resolve Selected Specific Class Instance if provided
		const selectedKelas = params.kelasInstanceId
			? kelasOptions.find((k) => k.id === params.kelasInstanceId) || null
			: null;

		// Determine target class IDs for metrics calculation
		const targetClasses = selectedKelas
			? [selectedKelas]
			: kelasOptions;

		const targetClassIds = targetClasses.map((c) => c.id);

		// Determine Curriculum Track ID (take track from target classes)
		const targetTrackId = selectedKelas?.curriculumTrackId
			? selectedKelas.curriculumTrackId
			: targetClasses.find((c) => c.curriculumTrackId !== null)?.curriculumTrackId || null;

		const activeTrackTitle = selectedKelas?.curriculumTrackTitle
			|| targetClasses.find((c) => c.curriculumTrackTitle !== null)?.curriculumTrackTitle
			|| null;

		if (targetClassIds.length === 0 || !targetTrackId) {
			return {
				tahunAjaranOptions,
				tingkatOptions,
				kelasOptions,
				selectedTahunAjaran,
				selectedTingkat,
				selectedKelas,
				activeTrackTitle,
				summary: {
					totalPhases: 0,
					totalSubPhases: 0,
					totalMateri: 0,
					totalQuizzes: 0,
					totalExecutingClasses: targetClassIds.length,
					totalStudents: 0,
					avgTrackCompletionRate: 0
				},
				phases: []
			};
		}

		// 1. Fetch Enrolled Active Students in Target Classes
		const activeStudents = await db
			.select({ userId: keanggotaan.userId })
			.from(keanggotaan)
			.where(
				and(
					inArray(keanggotaan.kelasInstanceId, targetClassIds),
					eq(keanggotaan.status, 'aktif')
				)
			);

		const studentIds = activeStudents.map((s) => s.userId);
		const totalStudents = studentIds.length;

		// 2. Fetch Phases for the Assigned Curriculum Track
		const trackPhases = await db
			.select({
				id: phase.id,
				title: phase.title,
				description: phase.description,
				sortOrder: phase.sortOrder
			})
			.from(phase)
			.where(eq(phase.curriculumTrackId, targetTrackId))
			.orderBy(phase.sortOrder);

		const phaseIds = trackPhases.map((p) => p.id);

		if (phaseIds.length === 0) {
			return {
				tahunAjaranOptions,
				tingkatOptions,
				kelasOptions,
				selectedTahunAjaran,
				selectedTingkat,
				selectedKelas,
				activeTrackTitle,
				summary: {
					totalPhases: 0,
					totalSubPhases: 0,
					totalMateri: 0,
					totalQuizzes: 0,
					totalExecutingClasses: targetClassIds.length,
					totalStudents,
					avgTrackCompletionRate: 0
				},
				phases: []
			};
		}

		// 3. Fetch SubPhases for all Phases in this Track
		const subPhasesList = await db
			.select({
				id: subPhase.id,
				phaseId: subPhase.phaseId,
				title: subPhase.title,
				description: subPhase.description,
				sortOrder: subPhase.sortOrder
			})
			.from(subPhase)
			.where(inArray(subPhase.phaseId, phaseIds))
			.orderBy(subPhase.phaseId, subPhase.sortOrder);

		const subPhaseIds = subPhasesList.map((sp) => sp.id);

		// 4. Fetch Materi & Quizzes count
		const materiCounts = subPhaseIds.length > 0
			? await db
					.select({
						subPhaseId: materi.subPhaseId,
						total: count(materi.id)
					})
					.from(materi)
					.where(inArray(materi.subPhaseId, subPhaseIds))
					.groupBy(materi.subPhaseId)
			: [];

		const materiMap = new Map<number, number>();
		for (const mc of materiCounts) {
			materiMap.set(mc.subPhaseId, Number(mc.total));
		}

		const quizzesList = subPhaseIds.length > 0
			? await db
					.select({
						subPhaseId: quiz.subPhaseId,
						title: quiz.title,
						passingScore: quiz.passingScore
					})
					.from(quiz)
					.where(inArray(quiz.subPhaseId, subPhaseIds))
			: [];

		const quizMap = new Map<number, { title: string; passingScore: number }>();
		for (const q of quizzesList) {
			quizMap.set(q.subPhaseId, { title: q.title, passingScore: q.passingScore });
		}

		// 5. Fetch Meetings/Pertemuan executed in target classes
		const subPhaseSessions = (subPhaseIds.length > 0 && targetClassIds.length > 0)
			? await db
					.select({
						id: pertemuan.id,
						subPhaseId: pertemuan.subPhaseId,
						kelasInstanceId: pertemuan.kelasInstanceId
					})
					.from(pertemuan)
					.where(
						and(
							inArray(pertemuan.subPhaseId, subPhaseIds),
							inArray(pertemuan.kelasInstanceId, targetClassIds)
						)
					)
			: [];

		const sessionMap = new Map<number, number[]>();
		for (const sess of subPhaseSessions) {
			const list = sessionMap.get(sess.subPhaseId) || [];
			list.push(sess.id);
			sessionMap.set(sess.subPhaseId, list);
		}

		// 6. Fetch Attendance records
		const allSessionIds = subPhaseSessions.map((s) => s.id);
		const attendanceCounts = (allSessionIds.length > 0 && studentIds.length > 0)
			? await db
					.select({
						pertemuanId: attendance.pertemuanId,
						attendedCount: count(attendance.id)
					})
					.from(attendance)
					.where(
						and(
							inArray(attendance.pertemuanId, allSessionIds),
							inArray(attendance.userId, studentIds),
							eq(attendance.status, 'hadir')
						)
					)
					.groupBy(attendance.pertemuanId)
			: [];

		const attendanceSessionMap = new Map<number, number>();
		for (const ac of attendanceCounts) {
			attendanceSessionMap.set(ac.pertemuanId, Number(ac.attendedCount));
		}

		// 7. Aggregate Hierarchy & Calculate Completion Rate
		let totalSubPhasesCount = 0;
		let totalMateriCount = 0;
		let totalQuizzesCount = quizzesList.length;
		let totalTrackCompletionSum = 0;

		const phaseGroupsMap = new Map<number, PhaseProgressGroup>();
		for (const p of trackPhases) {
			phaseGroupsMap.set(p.id, {
				id: p.id,
				title: p.title,
				description: p.description,
				sortOrder: p.sortOrder,
				avgCompletionRate: 0,
				subPhases: []
			});
		}

		for (const sp of subPhasesList) {
			totalSubPhasesCount++;
			const mCount = materiMap.get(sp.id) || 0;
			totalMateriCount += mCount;

			const quizInfo = quizMap.get(sp.id) || null;
			const linkedSessions = sessionMap.get(sp.id) || [];
			const totalClassSessions = linkedSessions.length;

			let totalAttendedInSubPhase = 0;
			for (const sessId of linkedSessions) {
				totalAttendedInSubPhase += attendanceSessionMap.get(sessId) || 0;
			}

			const maxPossibleAttendances = totalClassSessions * (totalStudents || 1);
			let completionRate = 0;

			if (totalStudents === 0 || totalClassSessions === 0) {
				completionRate = 0;
			} else {
				completionRate = Math.min(
					100,
					Math.round((totalAttendedInSubPhase / maxPossibleAttendances) * 100)
				);
			}

			totalTrackCompletionSum += completionRate;

			let status: 'SELESAI' | 'BERJALAN' | 'BELUM_DIMULAI' = 'BELUM_DIMULAI';
			if (completionRate >= 80) {
				status = 'SELESAI';
			} else if (completionRate > 0 || totalClassSessions > 0) {
				status = 'BERJALAN';
			}

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
				completedStudentsCount: Math.round(totalAttendedInSubPhase / (totalClassSessions || 1)),
				totalActiveStudents: totalStudents,
				completionRate,
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
			tahunAjaranOptions,
			tingkatOptions,
			kelasOptions,
			selectedTahunAjaran,
			selectedTingkat,
			selectedKelas,
			activeTrackTitle,
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

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
	submission
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, sql, count } from 'drizzle-orm';

export interface TingkatOption {
	id: number;
	name: string;
	levelOrder: number;
}

export interface TrackOption {
	id: number;
	title: string;
	tingkatId: number;
	tingkatName: string;
	isPublished: boolean;
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
	tingkatOptions: TingkatOption[];
	trackOptions: TrackOption[];
	selectedTingkat: TingkatOption | null;
	selectedTrack: TrackOption | null;
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
	 * Get available curriculum tracks
	 */
	async getTrackOptions(tingkatId?: number): Promise<TrackOption[]> {
		const conditions = [];
		if (tingkatId) {
			conditions.push(eq(curriculumTrack.tingkatId, tingkatId));
		}

		return await db
			.select({
				id: curriculumTrack.id,
				title: curriculumTrack.title,
				tingkatId: curriculumTrack.tingkatId,
				tingkatName: tingkat.name,
				isPublished: curriculumTrack.isPublished
			})
			.from(curriculumTrack)
			.innerJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
			.where(and(...conditions))
			.orderBy(tingkat.levelOrder, curriculumTrack.title);
	},

	/**
	 * Get curriculum track progress & hierarchy monitoring data
	 */
	async getCurriculumMonitoring(params: {
		tingkatId?: number;
		trackId?: number;
	}): Promise<CurriculumMonitoringData> {
		const tingkatOptions = await this.getTingkatOptions();
		const trackOptions = await this.getTrackOptions(params.tingkatId);

		const selectedTingkat = params.tingkatId
			? tingkatOptions.find((t) => t.id === params.tingkatId) || null
			: tingkatOptions[0] || null;

		const selectedTrack = params.trackId
			? trackOptions.find((tr) => tr.id === params.trackId) || null
			: trackOptions.find((tr) => tr.tingkatId === selectedTingkat?.id) || trackOptions[0] || null;

		if (!selectedTrack) {
			return {
				tingkatOptions,
				trackOptions,
				selectedTingkat,
				selectedTrack: null,
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

		const activeTrackId = selectedTrack.id;

		// 1. Get Executing Classes for this Track
		const executingClasses = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.where(and(eq(kelasInstance.curriculumTrackId, activeTrackId), eq(kelasInstance.isActive, true)));

		const executingClassIds = executingClasses.map((c) => c.id);

		// 2. Count Active Enrolled Students in executing classes
		let totalStudents = 0;
		let studentIds: number[] = [];
		if (executingClassIds.length > 0) {
			const activeStudents = await db
				.select({ userId: keanggotaan.userId })
				.from(keanggotaan)
				.where(and(inArray(keanggotaan.kelasInstanceId, executingClassIds), eq(keanggotaan.status, 'aktif')));

			studentIds = activeStudents.map((s) => s.userId);
			totalStudents = studentIds.length;
		}

		// 3. Fetch Phases for this Track
		const trackPhases = await db
			.select({
				id: phase.id,
				title: phase.title,
				description: phase.description,
				sortOrder: phase.sortOrder
			})
			.from(phase)
			.where(eq(phase.curriculumTrackId, activeTrackId))
			.orderBy(phase.sortOrder);

		const phaseIds = trackPhases.map((p) => p.id);

		if (phaseIds.length === 0) {
			return {
				tingkatOptions,
				trackOptions,
				selectedTingkat,
				selectedTrack,
				summary: {
					totalPhases: 0,
					totalSubPhases: 0,
					totalMateri: 0,
					totalQuizzes: 0,
					totalExecutingClasses: executingClasses.length,
					totalStudents,
					avgTrackCompletionRate: 0
				},
				phases: []
			};
		}

		// 4. Fetch SubPhases for all Phases in this Track
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

		// 5. Fetch Materi Counts & Quizzes per SubPhase
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

		// 6. Fetch Meetings/Pertemuan linked to subPhases
		const subPhaseSessions = (subPhaseIds.length > 0 && executingClassIds.length > 0)
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
							inArray(pertemuan.kelasInstanceId, executingClassIds)
						)
					)
			: [];

		const sessionMap = new Map<number, number[]>(); // subPhaseId -> pertemuanIds
		for (const sess of subPhaseSessions) {
			const list = sessionMap.get(sess.subPhaseId) || [];
			list.push(sess.id);
			sessionMap.set(sess.subPhaseId, list);
		}

		// 7. Fetch Attendance records per meeting to calculate subPhase completion rate
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

		// 8. Build Phase & SubPhase Hierarchy with Metrics
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

			// Completion rate calculations
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

		// Calculate avgCompletionRate per Phase
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
			tingkatOptions,
			trackOptions,
			selectedTingkat,
			selectedTrack,
			summary: {
				totalPhases: trackPhases.length,
				totalSubPhases: totalSubPhasesCount,
				totalMateri: totalMateriCount,
				totalQuizzes: totalQuizzesCount,
				totalExecutingClasses: executingClasses.length,
				totalStudents,
				avgTrackCompletionRate
			},
			phases
		};
	}
};

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
	 * Fetch Tier 1: Grid of Curriculum Track Cards for an Academic Year
	 */
	async getTrackCards(tahunAjaranId?: number): Promise<CurriculumGridViewData> {
		const tahunAjaranOptions = await this.getTahunAjaranOptions();

		const selectedTahunAjaran = tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === tahunAjaranId) || null
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

		// Determine trackState
		let trackState: 'active' | 'upcoming' | 'archived' = 'active';
		if (!selectedTahunAjaran.isActive) {
			trackState = 'archived';
		}

		// Get all curriculum tracks associated with class instances running in this Academic Year
		const runningClassesWithTracks = await db
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
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.tahunAjaranId, activeTaId))
			.orderBy(tingkat.levelOrder, curriculumTrack.title);

		// Group classes by Track ID
		const trackMap = new Map<number, {
			id: number;
			title: string;
			description: string | null;
			tingkatId: number;
			tingkatName: string;
			kelasIds: number[];
			classNames: string[];
		}>();

		for (const row of runningClassesWithTracks) {
			if (!trackMap.has(row.trackId)) {
				trackMap.set(row.trackId, {
					id: row.trackId,
					title: row.trackTitle,
					description: row.trackDesc,
					tingkatId: row.tingkatId,
					tingkatName: row.tingkatName,
					kelasIds: [],
					classNames: []
				});
			}
			const entry = trackMap.get(row.trackId)!;
			entry.kelasIds.push(row.kelasId);
			entry.classNames.push(row.kelasName);
		}

		// Also fetch any standalone published curriculum tracks for completeness
		const allTracks = await db
			.select({
				id: curriculumTrack.id,
				title: curriculumTrack.title,
				description: curriculumTrack.description,
				tingkatId: curriculumTrack.tingkatId,
				tingkatName: tingkat.name
			})
			.from(curriculumTrack)
			.innerJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
			.where(eq(curriculumTrack.isPublished, true))
			.orderBy(tingkat.levelOrder, curriculumTrack.title);

		for (const tr of allTracks) {
			if (!trackMap.has(tr.id)) {
				trackMap.set(tr.id, {
					id: tr.id,
					title: tr.title,
					description: tr.description,
					tingkatId: tr.tingkatId,
					tingkatName: tr.tingkatName,
					kelasIds: [],
					classNames: []
				});
			}
		}

		const trackCards: TrackSummaryCard[] = [];

		for (const tr of trackMap.values()) {
			const executingClassIds = tr.kelasIds;

			// 1. Total Students enrolled in executing classes
			let totalStudents = 0;
			let studentIds: number[] = [];
			if (executingClassIds.length > 0) {
				const students = await db
					.select({ userId: keanggotaan.userId })
					.from(keanggotaan)
					.where(and(inArray(keanggotaan.kelasInstanceId, executingClassIds), eq(keanggotaan.status, 'aktif')));

				studentIds = students.map((s) => s.userId);
				totalStudents = studentIds.length;
			}

			// 2. Count Phases, SubPhases, Materi, Quizzes for this Track
			const phasesRes = await db
				.select({ id: phase.id })
				.from(phase)
				.where(eq(phase.curriculumTrackId, tr.id));

			const phaseIds = phasesRes.map((p) => p.id);
			const totalPhases = phaseIds.length;

			let totalSubPhases = 0;
			let totalMateriCount = 0;
			let totalQuizzesCount = 0;
			let avgCompletionRate = 0;

			if (phaseIds.length > 0) {
				const subPhasesRes = await db
					.select({ id: subPhase.id })
					.from(subPhase)
					.where(inArray(subPhase.phaseId, phaseIds));

				const subPhaseIds = subPhasesRes.map((sp) => sp.id);
				totalSubPhases = subPhaseIds.length;

				if (subPhaseIds.length > 0) {
					const [materiRes] = await db
						.select({ total: count(materi.id) })
						.from(materi)
						.where(inArray(materi.subPhaseId, subPhaseIds));
					totalMateriCount = Number(materiRes?.total ?? 0);

					const [quizRes] = await db
						.select({ total: count(quiz.id) })
						.from(quiz)
						.where(inArray(quiz.subPhaseId, subPhaseIds));
					totalQuizzesCount = Number(quizRes?.total ?? 0);

					// Calculate overall completion rate
					if (executingClassIds.length > 0 && studentIds.length > 0) {
						const sessionsRes = await db
							.select({ id: pertemuan.id })
							.from(pertemuan)
							.where(
								and(
									inArray(pertemuan.subPhaseId, subPhaseIds),
									inArray(pertemuan.kelasInstanceId, executingClassIds)
								)
							);

						const sessionIds = sessionsRes.map((s) => s.id);
						if (sessionIds.length > 0) {
							const [attRes] = await db
								.select({ total: count(attendance.id) })
								.from(attendance)
								.where(
									and(
										inArray(attendance.pertemuanId, sessionIds),
										inArray(attendance.userId, studentIds),
										eq(attendance.status, 'hadir')
									)
								);

							const totalAttended = Number(attRes?.total ?? 0);
							const maxPossible = sessionIds.length * totalStudents;
							avgCompletionRate = maxPossible > 0 ? Math.min(100, Math.round((totalAttended / maxPossible) * 100)) : 0;
						}
					}
				}
			}

			trackCards.push({
				id: tr.id,
				title: tr.title,
				description: tr.description,
				tingkatId: tr.tingkatId,
				tingkatName: tr.tingkatName,
				executingClassesCount: tr.kelasIds.length,
				executingClassNames: tr.classNames,
				totalStudents,
				totalPhases,
				totalSubPhases,
				totalMateri: totalMateriCount,
				totalQuizzes: totalQuizzesCount,
				avgCompletionRate,
				trackState: tr.kelasIds.length === 0 ? 'upcoming' : trackState
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
	 * Fetch Tier 2: Detailed Phase & SubPhase Hierarchy for a Specific Track in an Academic Year
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

		// 1. Fetch Track Profile
		const [trackRow] = await db
			.select({
				id: curriculumTrack.id,
				title: curriculumTrack.title,
				description: curriculumTrack.description,
				tingkatId: curriculumTrack.tingkatId,
				tingkatName: tingkat.name
			})
			.from(curriculumTrack)
			.innerJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
			.where(eq(curriculumTrack.id, params.trackId));

		if (!trackRow) {
			throw new Error('Curriculum Track tidak ditemukan');
		}

		// 2. Fetch Classes executing this Track in this Academic Year
		const runningClasses = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name
			})
			.from(kelasInstance)
			.where(
				and(
					eq(kelasInstance.tahunAjaranId, activeTaId),
					eq(kelasInstance.curriculumTrackId, params.trackId)
				)
			)
			.orderBy(kelasInstance.name);

		const kelasOptions: ClassInstanceOption[] = runningClasses.map((c) => ({
			id: c.id,
			name: c.name
		}));

		const selectedKelas = params.kelasInstanceId
			? kelasOptions.find((k) => k.id === params.kelasInstanceId) || null
			: null;

		const targetClassIds = selectedKelas
			? [selectedKelas.id]
			: kelasOptions.map((c) => c.id);

		// 3. Fetch Enrolled Active Students
		let totalStudents = 0;
		let studentIds: number[] = [];
		if (targetClassIds.length > 0) {
			const activeStudents = await db
				.select({ userId: keanggotaan.userId })
				.from(keanggotaan)
				.where(
					and(
						inArray(keanggotaan.kelasInstanceId, targetClassIds),
						eq(keanggotaan.status, 'aktif')
					)
				);

			studentIds = activeStudents.map((s) => s.userId);
			totalStudents = studentIds.length;
		}

		// 4. Fetch Phases for this Track
		const trackPhases = await db
			.select({
				id: phase.id,
				title: phase.title,
				description: phase.description,
				sortOrder: phase.sortOrder
			})
			.from(phase)
			.where(eq(phase.curriculumTrackId, params.trackId))
			.orderBy(phase.sortOrder);

		const phaseIds = trackPhases.map((p) => p.id);

		if (phaseIds.length === 0) {
			return {
				viewMode: 'detail',
				tahunAjaranOptions,
				selectedTahunAjaran,
				selectedTrack: trackRow,
				kelasOptions,
				selectedKelas,
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

		// 5. Fetch SubPhases
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

		// 6. Fetch Materi & Quizzes
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

		// 7. Fetch Meetings & Attendance
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

		// 8. Build Hierarchy with Progress Metrics
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

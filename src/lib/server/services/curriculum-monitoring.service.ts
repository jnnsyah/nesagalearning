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
	 * Fetch Tier 1: Grid of Curriculum Track Cards for an Academic Year (Parallel Query Batching)
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

		let trackState: 'active' | 'upcoming' | 'archived' = 'active';
		if (!selectedTahunAjaran.isActive) {
			trackState = 'archived';
		}

		// 1. Fetch running classes with assigned tracks & all published tracks in parallel
		const [runningClassesWithTracks, allTracks] = await Promise.all([
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
				.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
				.where(eq(kelasInstance.tahunAjaranId, activeTaId))
				.orderBy(tingkat.levelOrder, curriculumTrack.title),

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

		const allTrackIds = Array.from(trackMap.keys());
		if (allTrackIds.length === 0) {
			return {
				viewMode: 'grid',
				tahunAjaranOptions,
				selectedTahunAjaran,
				trackCards: []
			};
		}

		// Collect all class IDs running across all tracks
		const allExecutingClassIds = Array.from(trackMap.values()).flatMap((t) => t.kelasIds);

		// 2. Parallel Batch Fetching of counts across all tracks
		const [phasesCountList, subPhasesCountList, materiCountList, quizCountList, activeStudentsList] = await Promise.all([
			// Phases per Track
			db
				.select({
					trackId: phase.curriculumTrackId,
					total: count(phase.id)
				})
				.from(phase)
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			// SubPhases per Track
			db
				.select({
					trackId: phase.curriculumTrackId,
					total: count(subPhase.id)
				})
				.from(subPhase)
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			// Materi per Track
			db
				.select({
					trackId: phase.curriculumTrackId,
					total: count(materi.id)
				})
				.from(materi)
				.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			// Quiz per Track
			db
				.select({
					trackId: phase.curriculumTrackId,
					total: count(quiz.id)
				})
				.from(quiz)
				.innerJoin(subPhase, eq(quiz.subPhaseId, subPhase.id))
				.innerJoin(phase, eq(subPhase.phaseId, phase.id))
				.where(inArray(phase.curriculumTrackId, allTrackIds))
				.groupBy(phase.curriculumTrackId),

			// Enrolled Students per Class
			allExecutingClassIds.length > 0
				? db
						.select({
							kelasInstanceId: keanggotaan.kelasInstanceId,
							userId: keanggotaan.userId
						})
						.from(keanggotaan)
						.where(
							and(
								inArray(keanggotaan.kelasInstanceId, allExecutingClassIds),
								eq(keanggotaan.status, 'aktif')
							)
						)
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

		const classStudentsMap = new Map<number, number[]>();
		for (const st of activeStudentsList) {
			const list = classStudentsMap.get(st.kelasInstanceId) || [];
			list.push(st.userId);
			classStudentsMap.set(st.kelasInstanceId, list);
		}

		// 3. Batch Fetch Attendance Rates for all executing sessions
		const sessionCounts = allExecutingClassIds.length > 0
			? await db
					.select({
						kelasInstanceId: pertemuan.kelasInstanceId,
						pertemuanId: pertemuan.id,
						subPhaseId: pertemuan.subPhaseId
					})
					.from(pertemuan)
					.where(inArray(pertemuan.kelasInstanceId, allExecutingClassIds))
			: [];

		const sessionIds = sessionCounts.map((s) => s.pertemuanId);
		const attendanceCounts = sessionIds.length > 0
			? await db
					.select({
						pertemuanId: attendance.pertemuanId,
						totalHadir: count(attendance.id)
					})
					.from(attendance)
					.where(and(inArray(attendance.pertemuanId, sessionIds), eq(attendance.status, 'hadir')))
					.groupBy(attendance.pertemuanId)
			: [];

		const attendanceMap = new Map<number, number>();
		for (const a of attendanceCounts) attendanceMap.set(a.pertemuanId, Number(a.totalHadir));

		// Class Sessions attendance aggregation map: kelasId -> { totalAttended, totalPossible }
		const classProgressMap = new Map<number, { totalAttended: number; totalSessions: number }>();
		for (const s of sessionCounts) {
			const attended = attendanceMap.get(s.pertemuanId) || 0;
			const entry = classProgressMap.get(s.kelasInstanceId) || { totalAttended: 0, totalSessions: 0 };
			entry.totalAttended += attended;
			entry.totalSessions += 1;
			classProgressMap.set(s.kelasInstanceId, entry);
		}

		// Build final Track Cards
		const trackCards: TrackSummaryCard[] = [];

		for (const tr of trackMap.values()) {
			const executingClassIds = tr.kelasIds;

			// Total students in this track
			let trackTotalStudents = 0;
			let totalAttendedInTrack = 0;
			let totalMaxPossibleInTrack = 0;

			for (const cId of executingClassIds) {
				const sList = classStudentsMap.get(cId) || [];
				trackTotalStudents += sList.length;

				const cProg = classProgressMap.get(cId) || { totalAttended: 0, totalSessions: 0 };
				totalAttendedInTrack += cProg.totalAttended;
				totalMaxPossibleInTrack += cProg.totalSessions * (sList.length || 1);
			}

			const avgCompletionRate = totalMaxPossibleInTrack > 0
				? Math.min(100, Math.round((totalAttendedInTrack / totalMaxPossibleInTrack) * 100))
				: 0;

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
	 * Fetch Tier 2: Detailed Phase & SubPhase Hierarchy (Parallel Query Batching)
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

		// 1. Parallel Fetching: Track Profile, Executing Classes, and Phases
		const [[trackRow], runningClasses, trackPhases] = await Promise.all([
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
				.orderBy(kelasInstance.name),

			db
				.select({
					id: phase.id,
					title: phase.title,
					description: phase.description,
					sortOrder: phase.sortOrder
				})
				.from(phase)
				.where(eq(phase.curriculumTrackId, params.trackId))
				.orderBy(phase.sortOrder)
		]);

		if (!trackRow) {
			throw new Error('Curriculum Track tidak ditemukan');
		}

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
					totalStudents: 0,
					avgTrackCompletionRate: 0
				},
				phases: []
			};
		}

		// 2. Parallel Fetching: SubPhases and Enrolled Active Students
		const [subPhasesList, activeStudents] = await Promise.all([
			db
				.select({
					id: subPhase.id,
					phaseId: subPhase.phaseId,
					title: subPhase.title,
					description: subPhase.description,
					sortOrder: subPhase.sortOrder
				})
				.from(subPhase)
				.where(inArray(subPhase.phaseId, phaseIds))
				.orderBy(subPhase.phaseId, subPhase.sortOrder),

			targetClassIds.length > 0
				? db
						.select({ userId: keanggotaan.userId })
						.from(keanggotaan)
						.where(
							and(
								inArray(keanggotaan.kelasInstanceId, targetClassIds),
								eq(keanggotaan.status, 'aktif')
							)
						)
				: Promise.resolve([])
		]);

		const subPhaseIds = subPhasesList.map((sp) => sp.id);
		const studentIds = activeStudents.map((s) => s.userId);
		const totalStudents = studentIds.length;

		if (subPhaseIds.length === 0) {
			return {
				viewMode: 'detail',
				tahunAjaranOptions,
				selectedTahunAjaran,
				selectedTrack: trackRow,
				kelasOptions,
				selectedKelas,
				summary: {
					totalPhases: trackPhases.length,
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

		// 3. Parallel Fetching: Materi, Quizzes, Meetings, and Attendance
		const [materiCounts, quizzesList, subPhaseSessions] = await Promise.all([
			db
				.select({
					subPhaseId: materi.subPhaseId,
					total: count(materi.id)
				})
				.from(materi)
				.where(inArray(materi.subPhaseId, subPhaseIds))
				.groupBy(materi.subPhaseId),

			db
				.select({
					subPhaseId: quiz.subPhaseId,
					title: quiz.title,
					passingScore: quiz.passingScore
				})
				.from(quiz)
				.where(inArray(quiz.subPhaseId, subPhaseIds)),

			targetClassIds.length > 0
				? db
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
				: Promise.resolve([])
		]);

		const materiMap = new Map<number, number>();
		for (const mc of materiCounts) {
			materiMap.set(mc.subPhaseId, Number(mc.total));
		}

		const quizMap = new Map<number, { title: string; passingScore: number }>();
		for (const q of quizzesList) {
			quizMap.set(q.subPhaseId, { title: q.title, passingScore: q.passingScore });
		}

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

		// 4. Aggregate Hierarchy with Progress Metrics
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

import { db } from '$lib/server/db';
import {
	tahunAjaran,
	kelasInstance,
	tingkat,
	keanggotaan,
	pertemuan,
	attendance,
	advisorNote,
	user,
	phase
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, asc, count, sql } from 'drizzle-orm';
import { CurriculumMonitoringService } from './curriculum-monitoring.service';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface ClassDashboardSummary {
	id: number;
	name: string;
	tingkatName: string;
	totalStudents: number;
	totalSessions: number;
	attendanceRate: number;
	curriculumRate: number;
}

export interface RecentAdvisorNoteItem {
	id: number;
	studentId: number;
	studentName: string;
	studentUsername: string;
	advisorName: string;
	category: string;
	note: string;
	createdAt: string;
}

export interface PhaseProgressSummary {
	id: number;
	phaseCode: string;
	title: string;
	sortOrder: number;
	avgCompletionRate: number;
}

export interface SessionAttendanceTrendItem {
	id: number;
	title: string;
	sessionDate: string;
	startTime: string;
	endTime: string;
	activityType: string;
	kelasId: number;
	kelasName: string;
	totalEnrolled: number;
	totalHadir: number;
	totalIzin: number;
	attendanceRate: number;
}

export interface GuruDashboardData {
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	stats: {
		totalStudentsCount: number;
		totalClassesCount: number;
		totalSessionsCount: number;
		overallAttendanceRate: number;
		overallCurriculumRate: number;
	};
	runningClasses: ClassDashboardSummary[];
	runningClassesOptions: { id: number; name: string }[];
	sessionAttendanceTrend: SessionAttendanceTrendItem[];
	phaseSummaries: PhaseProgressSummary[];
	recentNotes: RecentAdvisorNoteItem[];
}

export const GuruDashboardService = {
	/**
	 * Get aggregated dashboard data for Guru Pembimbing
	 */
	async getDashboardData(tahunAjaranId?: number): Promise<GuruDashboardData> {
		// 1. Fetch academic year options
		const tahunAjaranOptions = await db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive
			})
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.name));

		const selectedTahunAjaran = tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		if (!selectedTahunAjaran) {
			return {
				tahunAjaranOptions,
				selectedTahunAjaran: null,
				stats: {
					totalStudentsCount: 0,
					totalClassesCount: 0,
					totalSessionsCount: 0,
					overallAttendanceRate: 0,
					overallCurriculumRate: 0
				},
				runningClasses: [],
				runningClassesOptions: [],
				sessionAttendanceTrend: [],
				phaseSummaries: [],
				recentNotes: []
			};
		}

		const activeTaId = selectedTahunAjaran.id;

		// 2. Fetch running classes in selected TA
		const runningClassesRaw = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatId: kelasInstance.tingkatId,
				tingkatName: tingkat.name
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.tahunAjaranId, activeTaId))
			.orderBy(tingkat.levelOrder, kelasInstance.name);

		const classIds = runningClassesRaw.map((c) => c.id);

		if (classIds.length === 0) {
			return {
				tahunAjaranOptions,
				selectedTahunAjaran,
				stats: {
					totalStudentsCount: 0,
					totalClassesCount: 0,
					totalSessionsCount: 0,
					overallAttendanceRate: 0,
					overallCurriculumRate: 0
				},
				runningClasses: [],
				runningClassesOptions: [],
				sessionAttendanceTrend: [],
				phaseSummaries: [],
				recentNotes: []
			};
		}

		// 3. Parallel Query Batching: Students, Sessions, Attendance Records, Phases, Recent Notes & Curriculum Track Cards
		const [studentsCountList, sessionsList, allSessions, phasesRaw, recentNotesRaw, trackCardsRes] = await Promise.all([
			db
				.select({
					kelasInstanceId: keanggotaan.kelasInstanceId,
					totalStudents: count(keanggotaan.userId)
				})
				.from(keanggotaan)
				.where(inArray(keanggotaan.kelasInstanceId, classIds))
				.groupBy(keanggotaan.kelasInstanceId),

			db
				.select({
					kelasInstanceId: pertemuan.kelasInstanceId,
					totalSessions: count(pertemuan.id)
				})
				.from(pertemuan)
				.where(inArray(pertemuan.kelasInstanceId, classIds))
				.groupBy(pertemuan.kelasInstanceId),

			db
				.select({
					id: pertemuan.id,
					title: pertemuan.title,
					sessionDate: pertemuan.sessionDate,
					startTime: pertemuan.startTime,
					endTime: pertemuan.endTime,
					activityType: pertemuan.activityType,
					kelasId: kelasInstance.id,
					kelasName: kelasInstance.name,
					kelasInstanceId: pertemuan.kelasInstanceId
				})
				.from(pertemuan)
				.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
				.where(inArray(pertemuan.kelasInstanceId, classIds))
				.orderBy(asc(pertemuan.sessionDate), asc(pertemuan.startTime)),

			db
				.select({
					id: phase.id,
					phaseCode: sql<string>`'FASE ' || ${phase.sortOrder}`,
					title: phase.title,
					sortOrder: phase.sortOrder
				})
				.from(phase)
				.orderBy(phase.sortOrder),

			db
				.select({
					id: advisorNote.id,
					studentId: advisorNote.studentId,
					studentName: user.fullName,
					studentUsername: user.username,
					advisorName: sql<string>`'Guru Pembimbing'`,
					category: advisorNote.category,
					note: advisorNote.note,
					createdAt: advisorNote.createdAt
				})
				.from(advisorNote)
				.innerJoin(user, eq(advisorNote.studentId, user.id))
				.orderBy(desc(advisorNote.createdAt))
				.limit(5),

			CurriculumMonitoringService.getTrackCards(activeTaId).catch(() => ({ trackCards: [] }))
		]);

		const sessionIds = allSessions.map((s) => s.id);

		// Attendance count per session (hadir & excused)
		const attendanceRecords = sessionIds.length > 0
			? await db
					.select({
						pertemuanId: attendance.pertemuanId,
						status: attendance.status
					})
					.from(attendance)
					.where(and(inArray(attendance.pertemuanId, sessionIds), inArray(attendance.status, ['hadir', 'excused'])))
			: [];

		const hadirMap = new Map<number, number>();
		const izinMap = new Map<number, number>();

		for (const att of attendanceRecords) {
			if (att.status === 'hadir') {
				hadirMap.set(att.pertemuanId, (hadirMap.get(att.pertemuanId) || 0) + 1);
			} else if (att.status === 'excused') {
				izinMap.set(att.pertemuanId, (izinMap.get(att.pertemuanId) || 0) + 1);
			}
		}

		const studentsCountMap = new Map<number, number>();
		for (const st of studentsCountList) studentsCountMap.set(st.kelasInstanceId, Number(st.totalStudents));

		const sessionsCountMap = new Map<number, number>();
		for (const se of sessionsList) sessionsCountMap.set(se.kelasInstanceId, Number(se.totalSessions));

		// Class Progress Map: kelasId -> { totalHadir, totalPossible }
		const classProgressMap = new Map<number, { totalHadir: number; totalPossible: number }>();
		for (const s of allSessions) {
			const studCount = studentsCountMap.get(s.kelasInstanceId) || 0;
			const hadir = hadirMap.get(s.id) || 0;
			const entry = classProgressMap.get(s.kelasInstanceId) || { totalHadir: 0, totalPossible: 0 };
			entry.totalHadir += hadir;
			entry.totalPossible += studCount;
			classProgressMap.set(s.kelasInstanceId, entry);
		}

		// Session Attendance Trend calculation for visual chart
		const sessionAttendanceTrend: SessionAttendanceTrendItem[] = allSessions.map((s) => {
			const totalEnrolled = studentsCountMap.get(s.kelasInstanceId) || 0;
			const totalHadir = hadirMap.get(s.id) || 0;
			const totalIzin = izinMap.get(s.id) || 0;
			const attendanceRate = totalEnrolled > 0 ? Math.min(100, Math.round((totalHadir / totalEnrolled) * 100)) : 0;

			return {
				id: s.id,
				title: s.title,
				sessionDate: s.sessionDate,
				startTime: s.startTime,
				endTime: s.endTime,
				activityType: s.activityType,
				kelasId: s.kelasId,
				kelasName: s.kelasName,
				totalEnrolled,
				totalHadir,
				totalIzin,
				attendanceRate
			};
		});

		const runningClassesOptions = runningClassesRaw.map((c) => ({
			id: c.id,
			name: c.name
		}));

		// Calculate Overall Curriculum Rate
		const overallCurriculumRate = trackCardsRes.trackCards.length > 0
			? Math.round(
					trackCardsRes.trackCards.reduce((acc, t) => acc + t.avgCompletionRate, 0) /
						trackCardsRes.trackCards.length
				)
			: 0;

		// Build Running Classes Summary Grid
		let grandTotalStudents = 0;
		let grandTotalSessions = 0;
		let grandTotalHadir = 0;
		let grandTotalPossibleSlots = 0;

		const runningClasses: ClassDashboardSummary[] = runningClassesRaw.map((c) => {
			const totalStudents = studentsCountMap.get(c.id) || 0;
			const totalSessions = sessionsCountMap.get(c.id) || 0;
			const prog = classProgressMap.get(c.id) || { totalHadir: 0, totalPossible: 0 };

			grandTotalStudents += totalStudents;
			grandTotalSessions += totalSessions;
			grandTotalHadir += prog.totalHadir;
			grandTotalPossibleSlots += prog.totalPossible;

			const attendanceRate = prog.totalPossible > 0
				? Math.min(100, Math.round((prog.totalHadir / prog.totalPossible) * 100))
				: 0;

			return {
				id: c.id,
				name: c.name,
				tingkatName: c.tingkatName,
				totalStudents,
				totalSessions,
				attendanceRate,
				curriculumRate: overallCurriculumRate
			};
		});

		const overallAttendanceRate = grandTotalPossibleSlots > 0
			? Math.min(100, Math.round((grandTotalHadir / grandTotalPossibleSlots) * 100))
			: 0;

		// Build Phase Progress Summaries
		const phaseSummaries: PhaseProgressSummary[] = phasesRaw.map((p) => ({
			id: p.id,
			phaseCode: p.phaseCode,
			title: p.title,
			sortOrder: p.sortOrder,
			avgCompletionRate: overallCurriculumRate
		}));

		// Build Recent Notes
		const recentNotes: RecentAdvisorNoteItem[] = recentNotesRaw.map((rn) => ({
			id: rn.id,
			studentId: rn.studentId,
			studentName: rn.studentName,
			studentUsername: rn.studentUsername,
			advisorName: 'Guru Pembimbing',
			category: rn.category === 'intervensi' ? 'Pendampingan' : rn.category,
			note: rn.note,
			createdAt: new Date(rn.createdAt).toLocaleDateString('id-ID', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			})
		}));

		return {
			tahunAjaranOptions,
			selectedTahunAjaran,
			stats: {
				totalStudentsCount: grandTotalStudents,
				totalClassesCount: runningClasses.length,
				totalSessionsCount: grandTotalSessions,
				overallAttendanceRate,
				overallCurriculumRate
			},
			runningClasses,
			runningClassesOptions,
			sessionAttendanceTrend,
			phaseSummaries,
			recentNotes
		};
	}
};

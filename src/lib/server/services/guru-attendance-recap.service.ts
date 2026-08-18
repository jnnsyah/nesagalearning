import { db } from '$lib/server/db';
import {
	pertemuan,
	attendance,
	keanggotaan,
	kelasInstance,
	tahunAjaran,
	tingkat,
	user
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, asc, count, like, or } from 'drizzle-orm';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface ClassSummaryCard {
	id: number;
	name: string;
	tingkatId: number;
	tingkatName: string;
	totalStudentsCount: number;
	totalSessionsCount: number;
	overallAttendanceRate: number; // 0 - 100%
	classState: 'active' | 'upcoming' | 'archived';
}

export interface SessionHeaderItem {
	id: number;
	title: string;
	sessionDate: string;
	startTime: string;
	activityType: string;
	kelasName: string;
}

export interface StudentAttendanceStatus {
	status: 'hadir' | 'excused' | 'alpha';
	method: 'qr' | 'manual' | null;
	manualReason: string | null;
	recordedAt: Date | string | null;
}

export interface StudentRecapRow {
	userId: number;
	username: string;
	fullName: string;
	kelasName: string;
	totalHadir: number;
	totalExcused: number;
	totalAlpha: number;
	attendanceRate: number; // 0 - 100%
	sessionsMap: Record<number, StudentAttendanceStatus>; // pertemuanId -> status
}

export interface RecentAttendanceLogItem {
	id: number;
	userId: number;
	username: string;
	fullName: string;
	kelasName: string;
	pertemuanId: number;
	pertemuanTitle: string;
	sessionDate: string;
	method: 'qr' | 'manual';
	status: 'hadir' | 'excused';
	manualReason: string | null;
	recordedAt: Date | string;
}

export interface GuruAttendanceGridViewData {
	viewMode: 'grid';
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	classCards: ClassSummaryCard[];
}

export interface GuruAttendanceDetailViewData {
	viewMode: 'detail';
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	selectedKelas: {
		id: number;
		name: string;
		tingkatName: string;
	};
	searchQuery: string;
	activeTab: 'matrix' | 'logs';
	summary: {
		totalSessionsCount: number;
		totalStudentsCount: number;
		overallAttendanceRate: number;
		excusedRate: number;
		alphaRate: number;
		totalHadir: number;
		totalExcused: number;
		totalAlpha: number;
		qrCount: number;
		manualCount: number;
	};
	sessions: SessionHeaderItem[];
	students: StudentRecapRow[];
	recentLogs: RecentAttendanceLogItem[];
}

export type GuruAttendanceRecapData = GuruAttendanceGridViewData | GuruAttendanceDetailViewData;

export const GuruAttendanceRecapService = {
	/**
	 * Get list of all academic years sorted by active first
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
	 * Fetch Tier 1: Grid of Class/Rombel Summary Cards for an Academic Year
	 */
	async getGridCards(tahunAjaranId?: number): Promise<GuruAttendanceGridViewData> {
		const tahunAjaranOptions = await this.getTahunAjaranOptions();

		const selectedTahunAjaran = tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		if (!selectedTahunAjaran) {
			return {
				viewMode: 'grid',
				tahunAjaranOptions,
				selectedTahunAjaran: null,
				classCards: []
			};
		}

		const activeTaId = selectedTahunAjaran.id;

		let classState: 'active' | 'upcoming' | 'archived' = 'active';
		if (!selectedTahunAjaran.isActive) {
			classState = 'archived';
		}

		// 1. Fetch running classes in this Academic Year
		const runningClasses = await db
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

		const classIds = runningClasses.map((c) => c.id);
		if (classIds.length === 0) {
			return {
				viewMode: 'grid',
				tahunAjaranOptions,
				selectedTahunAjaran,
				classCards: []
			};
		}

		// 2. Parallel Query Batching: Enrolled Students, Sessions, Attendance Records
		const [studentsCountList, sessionsList, allSessions] = await Promise.all([
			db
				.select({
					kelasInstanceId: keanggotaan.kelasInstanceId,
					totalStudents: count(keanggotaan.userId)
				})
				.from(keanggotaan)
				.where(
					and(
						inArray(keanggotaan.kelasInstanceId, classIds),
						eq(keanggotaan.status, 'aktif')
					)
				)
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
					kelasInstanceId: pertemuan.kelasInstanceId
				})
				.from(pertemuan)
				.where(inArray(pertemuan.kelasInstanceId, classIds))
		]);

		const studentsCountMap = new Map<number, number>();
		for (const st of studentsCountList) studentsCountMap.set(st.kelasInstanceId, Number(st.totalStudents));

		const sessionsCountMap = new Map<number, number>();
		for (const se of sessionsList) sessionsCountMap.set(se.kelasInstanceId, Number(se.totalSessions));

		const sessionIds = allSessions.map((s) => s.id);
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

		// Class Progress Map: kelasId -> { totalHadir, totalPossible }
		const classProgressMap = new Map<number, { totalHadir: number; totalPossible: number }>();
		for (const s of allSessions) {
			const studCount = studentsCountMap.get(s.kelasInstanceId) || 0;
			const hadir = attendanceMap.get(s.id) || 0;
			const entry = classProgressMap.get(s.kelasInstanceId) || { totalHadir: 0, totalPossible: 0 };
			entry.totalHadir += hadir;
			entry.totalPossible += studCount;
			classProgressMap.set(s.kelasInstanceId, entry);
		}

		// Build Cards
		const classCards: ClassSummaryCard[] = runningClasses.map((c) => {
			const totalStudentsCount = studentsCountMap.get(c.id) || 0;
			const totalSessionsCount = sessionsCountMap.get(c.id) || 0;
			const prog = classProgressMap.get(c.id) || { totalHadir: 0, totalPossible: 0 };

			const overallAttendanceRate = prog.totalPossible > 0
				? Math.min(100, Math.round((prog.totalHadir / prog.totalPossible) * 100))
				: 0;

			return {
				id: c.id,
				name: c.name,
				tingkatId: c.tingkatId,
				tingkatName: c.tingkatName,
				totalStudentsCount,
				totalSessionsCount,
				overallAttendanceRate,
				classState: totalSessionsCount === 0 ? 'upcoming' : classState
			};
		});

		return {
			viewMode: 'grid',
			tahunAjaranOptions,
			selectedTahunAjaran,
			classCards
		};
	},

	/**
	 * Fetch Tier 2: Detailed Rekap Presensi for a specific Class Instance
	 */
	async getRecapDetail(params: {
		kelasInstanceId: number;
		tahunAjaranId?: number;
		searchQuery?: string;
		activeTab?: 'matrix' | 'logs';
	}): Promise<GuruAttendanceDetailViewData> {
		const tahunAjaranOptions = await this.getTahunAjaranOptions();

		const selectedTahunAjaran = params.tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === params.tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		const activeTaId = selectedTahunAjaran?.id || 1;
		const searchQuery = params.searchQuery?.trim() || '';
		const activeTab = params.activeTab || 'matrix';

		// 1. Fetch Selected Class Info
		const [classRow] = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatName: tingkat.name
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.id, params.kelasInstanceId));

		if (!classRow) {
			throw new Error('Kelas Instance tidak ditemukan');
		}

		// 2. Parallel Fetching: Active Enrolled Students & Sessions for this Class
		const [enrolledStudents, sessionsList] = await Promise.all([
			db
				.select({
					userId: user.id,
					username: user.username,
					fullName: user.fullName,
					kelasInstanceId: keanggotaan.kelasInstanceId,
					kelasName: kelasInstance.name
				})
				.from(keanggotaan)
				.innerJoin(user, eq(keanggotaan.userId, user.id))
				.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
				.where(
					and(
						eq(keanggotaan.kelasInstanceId, params.kelasInstanceId),
						eq(keanggotaan.status, 'aktif'),
						searchQuery
							? or(
									like(user.fullName, `%${searchQuery}%`),
									like(user.username, `%${searchQuery}%`)
								)
							: undefined
					)
				)
				.orderBy(user.fullName),

			db
				.select({
					id: pertemuan.id,
					title: pertemuan.title,
					sessionDate: pertemuan.sessionDate,
					startTime: pertemuan.startTime,
					activityType: pertemuan.activityType,
					kelasInstanceId: pertemuan.kelasInstanceId,
					kelasName: kelasInstance.name
				})
				.from(pertemuan)
				.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
				.where(eq(pertemuan.kelasInstanceId, params.kelasInstanceId))
				.orderBy(asc(pertemuan.sessionDate), asc(pertemuan.startTime))
		]);

		const studentIds = enrolledStudents.map((s) => s.userId);
		const sessionIds = sessionsList.map((s) => s.id);

		const totalStudentsCount = enrolledStudents.length;
		const totalSessionsCount = sessionsList.length;

		// 3. Parallel Fetching: Attendance Records & Recent Logs
		const [attendanceRecords, recentLogsRaw] = await Promise.all([
			sessionIds.length > 0 && studentIds.length > 0
				? db
						.select({
							id: attendance.id,
							pertemuanId: attendance.pertemuanId,
							userId: attendance.userId,
							status: attendance.status,
							method: attendance.method,
							manualReason: attendance.manualReason,
							recordedAt: attendance.recordedAt
						})
						.from(attendance)
						.where(
							and(
								inArray(attendance.pertemuanId, sessionIds),
								inArray(attendance.userId, studentIds)
							)
						)
				: Promise.resolve([]),

			sessionIds.length > 0
				? db
						.select({
							id: attendance.id,
							userId: attendance.userId,
							username: user.username,
							fullName: user.fullName,
							kelasName: kelasInstance.name,
							pertemuanId: attendance.pertemuanId,
							pertemuanTitle: pertemuan.title,
							sessionDate: pertemuan.sessionDate,
							method: attendance.method,
							status: attendance.status,
							manualReason: attendance.manualReason,
							recordedAt: attendance.recordedAt
						})
						.from(attendance)
						.innerJoin(user, eq(attendance.userId, user.id))
						.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
						.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
						.where(
							and(
								inArray(attendance.pertemuanId, sessionIds),
								searchQuery
									? or(
											like(user.fullName, `%${searchQuery}%`),
											like(user.username, `%${searchQuery}%`)
										)
									: undefined
							)
						)
						.orderBy(desc(attendance.recordedAt))
						.limit(100)
				: Promise.resolve([])
		]);

		// Map: key `${userId}_${pertemuanId}` -> Attendance Record
		const recordMap = new Map<string, typeof attendanceRecords[0]>();
		let totalHadir = 0;
		let totalExcused = 0;
		let qrCount = 0;
		let manualCount = 0;

		for (const rec of attendanceRecords) {
			const key = `${rec.userId}_${rec.pertemuanId}`;
			recordMap.set(key, rec);

			if (rec.status === 'hadir') {
				totalHadir++;
			} else if (rec.status === 'excused') {
				totalExcused++;
			}

			if (rec.method === 'qr') {
				qrCount++;
			} else if (rec.method === 'manual') {
				manualCount++;
			}
		}

		// 4. Build Matrix Rows per Student
		let totalPossibleSlotsCount = 0;

		const students: StudentRecapRow[] = enrolledStudents.map((st) => {
			let stHadir = 0;
			let stExcused = 0;
			let stAlpha = 0;

			const sessionsMap: Record<number, StudentAttendanceStatus> = {};

			for (const sess of sessionsList) {
				totalPossibleSlotsCount++;
				const rec = recordMap.get(`${st.userId}_${sess.id}`);
				if (rec) {
					if (rec.status === 'hadir') {
						stHadir++;
					} else if (rec.status === 'excused') {
						stExcused++;
					}
					sessionsMap[sess.id] = {
						status: rec.status as 'hadir' | 'excused',
						method: rec.method as 'qr' | 'manual',
						manualReason: rec.manualReason,
						recordedAt: rec.recordedAt
					};
				} else {
					stAlpha++;
					sessionsMap[sess.id] = {
						status: 'alpha',
						method: null,
						manualReason: null,
						recordedAt: null
					};
				}
			}

			const totalRecorded = stHadir + stExcused + stAlpha;
			const attendanceRate = totalRecorded > 0
				? Math.round((stHadir / totalRecorded) * 100)
				: 0;

			return {
				userId: st.userId,
				username: st.username,
				fullName: st.fullName,
				kelasName: st.kelasName,
				totalHadir: stHadir,
				totalExcused: stExcused,
				totalAlpha: stAlpha,
				attendanceRate,
				sessionsMap
			};
		});

		const totalAlpha = Math.max(0, totalPossibleSlotsCount - totalHadir - totalExcused);
		const overallAttendanceRate = totalPossibleSlotsCount > 0
			? Math.round((totalHadir / totalPossibleSlotsCount) * 100)
			: 0;
		const excusedRate = totalPossibleSlotsCount > 0
			? Math.round((totalExcused / totalPossibleSlotsCount) * 100)
			: 0;
		const alphaRate = totalPossibleSlotsCount > 0
			? Math.round((totalAlpha / totalPossibleSlotsCount) * 100)
			: 0;

		const sessions: SessionHeaderItem[] = sessionsList.map((s) => ({
			id: s.id,
			title: s.title,
			sessionDate: String(s.sessionDate),
			startTime: String(s.startTime),
			activityType: s.activityType,
			kelasName: s.kelasName
		}));

		const recentLogs: RecentAttendanceLogItem[] = recentLogsRaw.map((rl) => ({
			id: rl.id,
			userId: rl.userId,
			username: rl.username,
			fullName: rl.fullName,
			kelasName: rl.kelasName,
			pertemuanId: rl.pertemuanId,
			pertemuanTitle: rl.pertemuanTitle,
			sessionDate: String(rl.sessionDate),
			method: rl.method as 'qr' | 'manual',
			status: rl.status as 'hadir' | 'excused',
			manualReason: rl.manualReason,
			recordedAt: String(rl.recordedAt)
		}));

		return {
			viewMode: 'detail',
			tahunAjaranOptions,
			selectedTahunAjaran,
			selectedKelas: classRow,
			searchQuery,
			activeTab,
			summary: {
				totalSessionsCount,
				totalStudentsCount,
				overallAttendanceRate,
				excusedRate,
				alphaRate,
				totalHadir,
				totalExcused,
				totalAlpha,
				qrCount,
				manualCount
			},
			sessions,
			students,
			recentLogs
		};
	}
};

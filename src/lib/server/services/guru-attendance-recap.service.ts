import { db } from '$lib/server/db';
import {
	pertemuan,
	attendance,
	keanggotaan,
	kelasInstance,
	tahunAjaran,
	user
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, asc, count, like, or } from 'drizzle-orm';

export interface TahunAjaranOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface ClassInstanceOption {
	id: number;
	name: string;
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

export interface GuruAttendanceRecapData {
	tahunAjaranOptions: TahunAjaranOption[];
	selectedTahunAjaran: TahunAjaranOption | null;
	kelasOptions: ClassInstanceOption[];
	selectedKelas: ClassInstanceOption | null;
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
	 * Fetch comprehensive Rekap Presensi data for Guru role
	 * Enforces Parallel Query Batching (`Promise.all`) for < 30ms response times.
	 */
	async getAttendanceRecapData(params: {
		tahunAjaranId?: number;
		kelasInstanceId?: number;
		searchQuery?: string;
		activeTab?: 'matrix' | 'logs';
	}): Promise<GuruAttendanceRecapData> {
		const tahunAjaranOptions = await this.getTahunAjaranOptions();

		const selectedTahunAjaran = params.tahunAjaranId
			? tahunAjaranOptions.find((ta) => ta.id === params.tahunAjaranId) || null
			: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null;

		const activeTaId = selectedTahunAjaran?.id || 1;
		const searchQuery = params.searchQuery?.trim() || '';
		const activeTab = params.activeTab || 'matrix';

		// 1. Fetch Class Instances for the selected Academic Year
		const runningClasses = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name
			})
			.from(kelasInstance)
			.where(eq(kelasInstance.tahunAjaranId, activeTaId))
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

		if (targetClassIds.length === 0) {
			return {
				tahunAjaranOptions,
				selectedTahunAjaran,
				kelasOptions,
				selectedKelas,
				searchQuery,
				activeTab,
				summary: {
					totalSessionsCount: 0,
					totalStudentsCount: 0,
					overallAttendanceRate: 0,
					excusedRate: 0,
					alphaRate: 0,
					totalHadir: 0,
					totalExcused: 0,
					totalAlpha: 0,
					qrCount: 0,
					manualCount: 0
				},
				sessions: [],
				students: [],
				recentLogs: []
			};
		}

		// 2. Parallel Fetching: Active Enrolled Students & Sessions
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
						inArray(keanggotaan.kelasInstanceId, targetClassIds),
						eq(keanggotaan.status, 'aktif'),
						searchQuery
							? or(
									like(user.fullName, `%${searchQuery}%`),
									like(user.username, `%${searchQuery}%`)
								)
							: undefined
					)
				)
				.orderBy(kelasInstance.name, user.fullName),

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
				.where(inArray(pertemuan.kelasInstanceId, targetClassIds))
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

		// Sessions per class map for fast alpha calculation
		const sessionsPerClassMap = new Map<number, number[]>();
		for (const sess of sessionsList) {
			const list = sessionsPerClassMap.get(sess.kelasInstanceId) || [];
			list.push(sess.id);
			sessionsPerClassMap.set(sess.kelasInstanceId, list);
		}

		// 4. Build Matrix Rows per Student
		let totalPossibleSlotsCount = 0;

		const students: StudentRecapRow[] = enrolledStudents.map((st) => {
			const classSessions = sessionsPerClassMap.get(st.kelasInstanceId) || [];
			let stHadir = 0;
			let stExcused = 0;
			let stAlpha = 0;

			const sessionsMap: Record<number, StudentAttendanceStatus> = {};

			for (const sessId of classSessions) {
				totalPossibleSlotsCount++;
				const rec = recordMap.get(`${st.userId}_${sessId}`);
				if (rec) {
					if (rec.status === 'hadir') {
						stHadir++;
					} else if (rec.status === 'excused') {
						stExcused++;
					}
					sessionsMap[sessId] = {
						status: rec.status as 'hadir' | 'excused',
						method: rec.method as 'qr' | 'manual',
						manualReason: rec.manualReason,
						recordedAt: rec.recordedAt
					};
				} else {
					stAlpha++;
					sessionsMap[sessId] = {
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
			tahunAjaranOptions,
			selectedTahunAjaran,
			kelasOptions,
			selectedKelas,
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

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
	pointLog
} from '$lib/server/db/schema';
import { eq, and, inArray, desc, count, like, or, sql } from 'drizzle-orm';
import { AttendanceService } from './attendance.service';

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
}

export interface StudentRosterItem {
	userId: number;
	username: string;
	nisn: string | null;
	fullName: string;
	avatarUrl: string | null;
	kelasId: number;
	kelasName: string;
	tingkatName: string;
	totalHadir: number;
	totalExcused: number;
	totalAlpha: number;
	totalSessionsCount: number;
	attendanceRate: number; // 0 - 100%
	totalPoints: number;
	riskStatus: 'normal' | 'warning' | 'critical';
}

export interface SessionOptionItem {
	id: number;
	title: string;
	sessionDate: string;
	startTime: string;
	activityType: string;
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
	availableSessions: SessionOptionItem[];
}

export const MentorStudentRosterService = {
	/**
	 * Get list of classes assigned to mentor in academic year
	 */
	async getMentorClasses(mentorUserId: number, tahunAjaranId?: number): Promise<MentorClassOption[]> {
		// Fetch classes assigned to mentor or all running classes if mentor assignment empty
		const assignedRows = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatName: tingkat.name,
				tahunAjaranId: kelasInstance.tahunAjaranId
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

		if (assignedRows.length > 0) return assignedRows;

		// Fallback: If no explicit assignment, return all running classes for the mentor role
		return await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatName: tingkat.name,
				tahunAjaranId: kelasInstance.tahunAjaranId
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(tahunAjaranId ? eq(kelasInstance.tahunAjaranId, tahunAjaranId) : undefined)
			.orderBy(tingkat.levelOrder, kelasInstance.name);
	},

	/**
	 * Fetch Student Roster & Quick Attendance data for Mentor
	 */
	async getRosterData(params: {
		mentorUserId: number;
		tahunAjaranId?: number;
		kelasInstanceId?: number;
		searchQuery?: string;
		riskFilter?: 'all' | 'warning' | 'critical' | 'good';
	}): Promise<MentorRosterViewData> {
		const searchQuery = params.searchQuery?.trim() || '';
		const riskFilter = params.riskFilter || 'all';

		// 1. Fetch academic year options
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

		// 2. Fetch mentor's assigned classes
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
				roster: [],
				availableSessions: []
			};
		}

		const targetKelasId = selectedKelas.id;

		// 3. Parallel Query Batching: Enrolled Students, Sessions, Attendance Records, Student Points, Available Sessions
		const [enrolledStudentsRaw, sessionsList, availableSessionsRaw] = await Promise.all([
			db
				.select({
					userId: user.id,
					username: user.username,
					nisn: user.nisn,
					fullName: user.fullName,
					avatarUrl: user.avatarUrl,
					kelasId: keanggotaan.kelasInstanceId,
					kelasName: kelasInstance.name,
					tingkatName: tingkat.name
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
					title: pertemuan.title,
					sessionDate: pertemuan.sessionDate,
					startTime: pertemuan.startTime,
					activityType: pertemuan.activityType
				})
				.from(pertemuan)
				.where(eq(pertemuan.kelasInstanceId, targetKelasId))
				.orderBy(desc(pertemuan.sessionDate)),

			db
				.select({
					id: pertemuan.id,
					title: pertemuan.title,
					sessionDate: pertemuan.sessionDate,
					startTime: pertemuan.startTime,
					activityType: pertemuan.activityType
				})
				.from(pertemuan)
				.where(eq(pertemuan.kelasInstanceId, targetKelasId))
				.orderBy(desc(pertemuan.sessionDate))
		]);

		const studentUserIds = enrolledStudentsRaw.map((s) => s.userId);
		const sessionIds = sessionsList.map((s) => s.id);

		// Parallel fetch attendance & points
		const [attendanceRecords, pointsList] = await Promise.all([
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
				: Promise.resolve([])
		]);

		const pointsMap = new Map<number, number>();
		for (const p of pointsList) pointsMap.set(p.userId, Number(p.totalPoints));

		// Map key `${userId}_${pertemuanId}` -> status
		const attendanceMap = new Map<string, string>();
		for (const a of attendanceRecords) {
			attendanceMap.set(`${a.userId}_${a.pertemuanId}`, a.status);
		}

		// 4. Build Roster Items
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
			if (attendanceRate < 50) {
				riskStatus = 'critical';
				attentionNeededCount++;
			} else if (attendanceRate < 75) {
				riskStatus = 'warning';
				attentionNeededCount++;
			}

			return {
				userId: st.userId,
				username: st.username,
				nisn: st.nisn,
				fullName: st.fullName,
				avatarUrl: st.avatarUrl,
				kelasId: st.kelasId,
				kelasName: st.kelasName,
				tingkatName: st.tingkatName,
				totalHadir,
				totalExcused,
				totalAlpha,
				totalSessionsCount,
				attendanceRate,
				totalPoints,
				riskStatus
			};
		});

		// Apply riskFilter if requested
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

		const availableSessions: SessionOptionItem[] = availableSessionsRaw.map((s) => ({
			id: s.id,
			title: s.title,
			sessionDate: String(s.sessionDate),
			startTime: String(s.startTime),
			activityType: s.activityType
		}));

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
			roster,
			availableSessions
		};
	},

	/**
	 * Record quick manual attendance for a student
	 */
	async recordQuickAttendance(params: {
		mentorUserId: number;
		studentUserId: number;
		pertemuanId: number;
		status: 'hadir' | 'excused';
		manualReason: string;
	}) {
		return await AttendanceService.recordAttendanceManual({
			pertemuanId: params.pertemuanId,
			userId: params.studentUserId,
			status: params.status,
			manualReason: params.manualReason
		});
	}
};

import { db } from '../db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '../db/schema/academic';
import { user } from '../db/schema/auth';
import { attendance, pertemuan } from '../db/schema/session';
import { submission, task } from '../db/schema/task';
import { streakCounter, pointLog } from '../db/schema/gamification';
import { eq, and, sql, count, desc, inArray, ilike, or } from 'drizzle-orm';

export interface ClassOption {
	id: number;
	name: string;
	tahunAjaranId: number;
	tahunAjaranName: string;
	tahunAjaranIsActive: boolean;
	tingkatName: string;
	isActive: boolean;
}

export interface AcademicYearOption {
	id: number;
	name: string;
	isActive: boolean;
}

export interface ClassHealthCardItem {
	kelasId: number;
	kelasName: string;
	tahunAjaranId: number;
	tahunAjaranName: string;
	tingkatName: string;
	totalStudents: number;
	avgAttendanceRate: number;
	avgTaskCompletionRate: number;
	avgStreak: number;
	alertStudentsCount: number;
	healthStatus: 'SEHAT' | 'WASPADA' | 'KRITIS';
	healthColor: string;
	isArchived: boolean;
}

export interface ClassHealthSummary {
	kelasId: number;
	kelasName: string;
	tahunAjaranName: string;
	tingkatName: string;
	totalStudents: number;
	avgAttendanceRate: number; // 0 - 100%
	avgTaskCompletionRate: number; // 0 - 100%
	avgStreak: number;
	healthStatus: 'SEHAT' | 'WASPADA' | 'KRITIS';
	healthColor: string;
	isArchived: boolean;
	attendanceTiers: {
		excellentCount: number; // 90% - 100%
		goodCount: number;      // 75% - 89%
		warningCount: number;   // 60% - 74%
		criticalCount: number;  // < 60%
		excellentPct: number;
		goodPct: number;
		warningPct: number;
		criticalPct: number;
	};
}

export interface StudentHealthMetrics {
	studentId: number;
	fullName: string;
	username: string;
	avatarUrl: string | null;
	kelasId: number;
	kelasName: string;
	totalSessions: number;
	attendedCount: number;
	attendanceRate: number; // %
	totalTasks: number;
	approvedTasksCount: number;
	taskCompletionRate: number; // %
	currentStreak: number;
	maxStreak: number;
	totalPoints: number;
	riskLevel: 'SEHAT' | 'WASPADA' | 'KRITIS';
	alertReasons: string[];
}

export interface PaginatedStudentHealthRoster {
	items: StudentHealthMetrics[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export const ClassHealthService = {
	/**
	 * Fetch available class options for filtering
	 */
	async getClassOptions(): Promise<ClassOption[]> {
		const classes = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tahunAjaranId: kelasInstance.tahunAjaranId,
				tahunAjaranName: tahunAjaran.name,
				tahunAjaranIsActive: tahunAjaran.isActive,
				tingkatName: tingkat.name,
				isActive: kelasInstance.isActive
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.orderBy(desc(tahunAjaran.isActive), desc(kelasInstance.isActive), desc(kelasInstance.createdAt));

		return classes;
	},

	/**
	 * Fetch available academic years
	 */
	async getAcademicYearOptions(): Promise<AcademicYearOption[]> {
		const years = await db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive
			})
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.name));

		return years;
	},

	/**
	 * Fetch class health cards for all classes in a specific academic year
	 */
	async getClassHealthCards(tahunAjaranId?: number): Promise<{
		academicYears: AcademicYearOption[];
		selectedTahunAjaran: AcademicYearOption | null;
		classCards: ClassHealthCardItem[];
	}> {
		const academicYears = await this.getAcademicYearOptions();
		const selectedTahunAjaran = tahunAjaranId
			? academicYears.find((y) => y.id === tahunAjaranId) || null
			: academicYears.find((y) => y.isActive) || academicYears[0] || null;

		const activeTaId = selectedTahunAjaran?.id ?? null;

		if (!activeTaId) {
			return { academicYears, selectedTahunAjaran, classCards: [] };
		}

		// Get all classes for this academic year (active + archived)
		const classes = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tahunAjaranId: kelasInstance.tahunAjaranId,
				tahunAjaranName: tahunAjaran.name,
				tahunAjaranIsActive: tahunAjaran.isActive,
				tingkatName: tingkat.name,
				isActive: kelasInstance.isActive
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.tahunAjaranId, activeTaId))
			.orderBy(tingkat.levelOrder, kelasInstance.name);

		const classCards: ClassHealthCardItem[] = [];

		for (const c of classes) {
			const { summary, alertStudentsCount } = await this.getClassHealthSummary(c.id);
			classCards.push({
				kelasId: c.id,
				kelasName: c.name,
				tahunAjaranId: c.tahunAjaranId,
				tahunAjaranName: c.tahunAjaranName,
				tingkatName: c.tingkatName,
				totalStudents: summary.totalStudents,
				avgAttendanceRate: summary.avgAttendanceRate,
				avgTaskCompletionRate: summary.avgTaskCompletionRate,
				avgStreak: summary.avgStreak,
				alertStudentsCount,
				healthStatus: summary.healthStatus,
				healthColor: summary.healthColor,
				isArchived: !c.isActive || !c.tahunAjaranIsActive
			});
		}

		return {
			academicYears,
			selectedTahunAjaran,
			classCards
		};
	},

	/**
	 * Calculate health summary and attendance distribution for a class (or all active classes)
	 */
	async getClassHealthSummary(kelasId?: number): Promise<{
		classOptions: ClassOption[];
		selectedKelas: ClassOption | null;
		summary: ClassHealthSummary;
		alertStudentsCount: number;
	}> {
		const classOptions = await this.getClassOptions();
		const selectedKelas = kelasId
			? classOptions.find((c) => c.id === kelasId) || null
			: classOptions.find((c) => c.isActive) || classOptions[0] || null;

		const activeKelasId = selectedKelas?.id ?? null;

		// 1. Get student memberships for this class (including historical enrollments)
		const membershipConditions = [];
		if (activeKelasId) {
			membershipConditions.push(eq(keanggotaan.kelasInstanceId, activeKelasId));
		}

		const students = await db
			.select({
				studentId: user.id,
				fullName: user.fullName,
				username: user.username,
				avatarUrl: user.avatarUrl,
				kelasId: keanggotaan.kelasInstanceId,
				kelasName: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name
			})
			.from(keanggotaan)
			.innerJoin(user, eq(keanggotaan.userId, user.id))
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(and(...membershipConditions));

		const studentIds = students.map((s) => s.studentId);
		const totalStudents = students.length;

		if (totalStudents === 0 || !activeKelasId) {
			return {
				classOptions,
				selectedKelas,
				summary: {
					kelasId: activeKelasId || 0,
					kelasName: selectedKelas?.name || 'Semua Kelas',
					tahunAjaranName: selectedKelas?.tahunAjaranName || '-',
					tingkatName: selectedKelas?.tingkatName || '-',
					totalStudents: 0,
					avgAttendanceRate: 100,
					avgTaskCompletionRate: 100,
					avgStreak: 0,
					healthStatus: 'SEHAT',
					healthColor: '#16a34a',
					isArchived: selectedKelas ? (!selectedKelas.isActive || !selectedKelas.tahunAjaranIsActive) : false,
					attendanceTiers: {
						excellentCount: 0,
						goodCount: 0,
						warningCount: 0,
						criticalCount: 0,
						excellentPct: 0,
						goodPct: 0,
						warningPct: 0,
						criticalPct: 0
					}
				},
				alertStudentsCount: 0
			};
		}

		// 2. Count total past sessions held for this class
		const [sessionsCountRes] = await db
			.select({ total: count(pertemuan.id) })
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, activeKelasId));
		const totalClassSessions = Number(sessionsCountRes?.total ?? 0);

		// 3. Count total tasks assigned to this class
		const [tasksCountRes] = await db
			.select({ total: count(task.id) })
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(eq(pertemuan.kelasInstanceId, activeKelasId));
		const totalClassTasks = Number(tasksCountRes?.total ?? 0);

		// 4. Fetch attendance records per student
		const attendanceRecords = await db
			.select({
				userId: attendance.userId,
				status: attendance.status
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(pertemuan.kelasInstanceId, activeKelasId), inArray(attendance.userId, studentIds)));

		const studentAttendedMap = new Map<number, number>();
		for (const att of attendanceRecords) {
			if (att.status === 'hadir' || att.status === 'excused') {
				studentAttendedMap.set(att.userId, (studentAttendedMap.get(att.userId) || 0) + 1);
			}
		}

		// 5. Fetch approved task submissions per student
		const approvedSubmissions = await db
			.select({
				userId: submission.userId
			})
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(
				and(
					eq(pertemuan.kelasInstanceId, activeKelasId),
					inArray(submission.userId, studentIds),
					eq(submission.status, 'approved')
				)
			);

		const studentApprovedTasksMap = new Map<number, number>();
		for (const sub of approvedSubmissions) {
			studentApprovedTasksMap.set(sub.userId, (studentApprovedTasksMap.get(sub.userId) || 0) + 1);
		}

		// 6. Fetch streaks per student
		const streaks = await db
			.select({
				userId: streakCounter.userId,
				currentStreak: streakCounter.currentStreak,
				maxStreak: streakCounter.maxStreak
			})
			.from(streakCounter)
			.where(and(eq(streakCounter.kelasInstanceId, activeKelasId), inArray(streakCounter.userId, studentIds)));

		const studentStreakMap = new Map<number, { current: number; max: number }>();
		for (const st of streaks) {
			studentStreakMap.set(st.userId, { current: st.currentStreak, max: st.maxStreak });
		}

		// 7. Aggregate metrics across students
		let totalAttendancePctSum = 0;
		let totalTaskCompletionPctSum = 0;
		let totalStreakSum = 0;
		let alertStudentsCount = 0;

		let excellentCount = 0;
		let goodCount = 0;
		let warningCount = 0;
		let criticalCount = 0;

		for (const s of students) {
			const attended = studentAttendedMap.get(s.studentId) || 0;
			const attRate = totalClassSessions > 0 ? Math.round((attended / totalClassSessions) * 100) : 100;
			totalAttendancePctSum += attRate;

			const approvedTasks = studentApprovedTasksMap.get(s.studentId) || 0;
			const taskRate = totalClassTasks > 0 ? Math.round((approvedTasks / totalClassTasks) * 100) : 100;
			totalTaskCompletionPctSum += taskRate;

			const streakInfo = studentStreakMap.get(s.studentId) || { current: 0, max: 0 };
			totalStreakSum += streakInfo.current;

			// Tiers
			if (attRate >= 90) excellentCount++;
			else if (attRate >= 75) goodCount++;
			else if (attRate >= 60) warningCount++;
			else criticalCount++;

			// Alert condition
			if (attRate < 75 || taskRate < 50 || (streakInfo.current === 0 && totalClassSessions >= 3)) {
				alertStudentsCount++;
			}
		}

		const avgAttendanceRate = Math.round(totalAttendancePctSum / totalStudents);
		const avgTaskCompletionRate = Math.round(totalTaskCompletionPctSum / totalStudents);
		const avgStreak = Number((totalStreakSum / totalStudents).toFixed(1));

		let healthStatus: 'SEHAT' | 'WASPADA' | 'KRITIS' = 'SEHAT';
		let healthColor = '#16a34a'; // Green

		if (avgAttendanceRate < 70 || criticalCount >= totalStudents * 0.25) {
			healthStatus = 'KRITIS';
			healthColor = '#dc2626'; // Red
		} else if (avgAttendanceRate < 85 || warningCount + criticalCount >= totalStudents * 0.3) {
			healthStatus = 'WASPADA';
			healthColor = '#d97706'; // Amber
		}

		return {
			classOptions,
			selectedKelas,
			summary: {
				kelasId: activeKelasId,
				kelasName: selectedKelas?.name || 'Kelas',
				tahunAjaranName: selectedKelas?.tahunAjaranName || '-',
				tingkatName: selectedKelas?.tingkatName || '-',
				totalStudents,
				avgAttendanceRate,
				avgTaskCompletionRate,
				avgStreak,
				healthStatus,
				healthColor,
				isArchived: selectedKelas ? (!selectedKelas.isActive || !selectedKelas.tahunAjaranIsActive) : false,
				attendanceTiers: {
					excellentCount,
					goodCount,
					warningCount,
					criticalCount,
					excellentPct: Math.round((excellentCount / totalStudents) * 100),
					goodPct: Math.round((goodCount / totalStudents) * 100),
					warningPct: Math.round((warningCount / totalStudents) * 100),
					criticalPct: Math.round((criticalCount / totalStudents) * 100)
				}
			},
			alertStudentsCount
		};
	},

	/**
	 * Get full student health roster with risk levels, alert reasons, and pagination
	 */
	async getStudentHealthRoster(params: {
		kelasId?: number;
		search?: string;
		riskLevel?: string;
		page?: number;
		limit?: number;
	}): Promise<PaginatedStudentHealthRoster> {
		const classOptions = await this.getClassOptions();
		const activeKelasId = params.kelasId || classOptions.find((c) => c.isActive)?.id || classOptions[0]?.id;

		const page = Math.max(1, params.page || 1);
		const limit = Math.min(100, Math.max(1, params.limit || 15));
		const offset = (page - 1) * limit;

		if (!activeKelasId) {
			return { items: [], total: 0, page, limit, totalPages: 1 };
		}

		// 1. Get students in class (including historical enrollments for archived classes)
		const membershipConditions = [
			eq(keanggotaan.kelasInstanceId, activeKelasId)
		];

		if (params.search && params.search.trim() !== '') {
			const term = `%${params.search.trim()}%`;
			membershipConditions.push(or(ilike(user.fullName, term), ilike(user.username, term))!);
		}

		const students = await db
			.select({
				studentId: user.id,
				fullName: user.fullName,
				username: user.username,
				avatarUrl: user.avatarUrl,
				kelasId: keanggotaan.kelasInstanceId,
				kelasName: kelasInstance.name
			})
			.from(keanggotaan)
			.innerJoin(user, eq(keanggotaan.userId, user.id))
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.where(and(...membershipConditions));

		if (students.length === 0) {
			return { items: [], total: 0, page, limit, totalPages: 1 };
		}
		const studentIds = students.map((s) => s.studentId);

		// 2. Class session count & task count
		const [sessionsCountRes] = await db
			.select({ total: count(pertemuan.id) })
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, activeKelasId));
		const totalSessions = Number(sessionsCountRes?.total ?? 0);

		const [tasksCountRes] = await db
			.select({ total: count(task.id) })
			.from(task)
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(eq(pertemuan.kelasInstanceId, activeKelasId));
		const totalTasks = Number(tasksCountRes?.total ?? 0);

		// 3. Attendance records per student
		const attendanceRecords = await db
			.select({
				userId: attendance.userId,
				status: attendance.status
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(pertemuan.kelasInstanceId, activeKelasId), inArray(attendance.userId, studentIds)));

		const studentAttendedMap = new Map<number, number>();
		for (const att of attendanceRecords) {
			if (att.status === 'hadir' || att.status === 'excused') {
				studentAttendedMap.set(att.userId, (studentAttendedMap.get(att.userId) || 0) + 1);
			}
		}

		// 4. Approved task submissions per student
		const approvedSubmissions = await db
			.select({
				userId: submission.userId
			})
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(
				and(
					eq(pertemuan.kelasInstanceId, activeKelasId),
					inArray(submission.userId, studentIds),
					eq(submission.status, 'approved')
				)
			);

		const studentApprovedTasksMap = new Map<number, number>();
		for (const sub of approvedSubmissions) {
			studentApprovedTasksMap.set(sub.userId, (studentApprovedTasksMap.get(sub.userId) || 0) + 1);
		}

		// 5. Streaks per student
		const streaks = await db
			.select({
				userId: streakCounter.userId,
				currentStreak: streakCounter.currentStreak,
				maxStreak: streakCounter.maxStreak
			})
			.from(streakCounter)
			.where(and(eq(streakCounter.kelasInstanceId, activeKelasId), inArray(streakCounter.userId, studentIds)));

		const studentStreakMap = new Map<number, { current: number; max: number }>();
		for (const st of streaks) {
			studentStreakMap.set(st.userId, { current: st.currentStreak, max: st.maxStreak });
		}

		// 6. Total points per student
		const pointsList = await db
			.select({
				userId: pointLog.userId,
				totalPoints: sql<number>`COALESCE(SUM(${pointLog.amount}), 0)::int`
			})
			.from(pointLog)
			.where(and(eq(pointLog.kelasInstanceId, activeKelasId), inArray(pointLog.userId, studentIds)))
			.groupBy(pointLog.userId);

		const studentPointsMap = new Map<number, number>();
		for (const pt of pointsList) {
			studentPointsMap.set(pt.userId, pt.totalPoints);
		}

		// 7. Calculate individual student health metrics & risk status
		const roster: StudentHealthMetrics[] = [];

		for (const s of students) {
			const attendedCount = studentAttendedMap.get(s.studentId) || 0;
			const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

			const approvedTasksCount = studentApprovedTasksMap.get(s.studentId) || 0;
			const taskCompletionRate = totalTasks > 0 ? Math.round((approvedTasksCount / totalTasks) * 100) : 100;

			const streakInfo = studentStreakMap.get(s.studentId) || { current: 0, max: 0 };
			const totalPoints = studentPointsMap.get(s.studentId) || 0;

			const alertReasons: string[] = [];
			if (attendanceRate < 75) {
				alertReasons.push(`Kehadiran ${attendanceRate}% (< 75%)`);
			}
			if (taskCompletionRate < 50 && totalTasks > 0) {
				alertReasons.push(`Tugas selesai ${taskCompletionRate}% (< 50%)`);
			}
			if (streakInfo.current === 0 && totalSessions >= 3) {
				alertReasons.push('Streak terputus / Absen berulang');
			}

			let riskLevel: 'SEHAT' | 'WASPADA' | 'KRITIS' = 'SEHAT';
			if (attendanceRate < 60 || alertReasons.length >= 2) {
				riskLevel = 'KRITIS';
			} else if (attendanceRate < 75 || alertReasons.length >= 1) {
				riskLevel = 'WASPADA';
			}

			// Filter by riskLevel if specified
			if (params.riskLevel && params.riskLevel !== 'semua') {
				if (params.riskLevel.toUpperCase() !== riskLevel) continue;
			}

			roster.push({
				studentId: s.studentId,
				fullName: s.fullName,
				username: s.username,
				avatarUrl: s.avatarUrl,
				kelasId: s.kelasId,
				kelasName: s.kelasName,
				totalSessions,
				attendedCount,
				attendanceRate,
				totalTasks,
				approvedTasksCount,
				taskCompletionRate,
				currentStreak: streakInfo.current,
				maxStreak: streakInfo.max,
				totalPoints,
				riskLevel,
				alertReasons
			});
		}

		// Sort roster: KRITIS first, then WASPADA, then lowest attendanceRate
		roster.sort((a, b) => {
			const riskOrder = { KRITIS: 1, WASPADA: 2, SEHAT: 3 };
			if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
				return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
			}
			return a.attendanceRate - b.attendanceRate;
		});

		const total = roster.length;
		const totalPages = Math.ceil(total / limit) || 1;
		const items = roster.slice(offset, offset + limit);

		return {
			items,
			total,
			page,
			limit,
			totalPages
		};
	}
};

import { db } from '../db';
import { pertemuan, attendanceToken, attendance } from '../db/schema/session';
import { keanggotaan, kelasInstance } from '../db/schema/academic';
import { user } from '../db/schema/auth';
import { pointLog } from '../db/schema/gamification';
import { eq, and, desc, gt, inArray } from 'drizzle-orm';
import { PointsService } from './points.service';
import crypto from 'node:crypto';

export interface AttendanceTokenData {
	id: number;
	pertemuanId: number;
	token: string;
	expiresAt: Date;
	isActive: boolean;
	createdAt: Date;
}

export interface StudentAttendanceItem {
	userId: number;
	username: string;
	fullName: string;
	attendanceId: number | null;
	status: 'hadir' | 'excused' | 'belum_hadir';
	method: 'qr' | 'manual' | null;
	manualReason: string | null;
	recordedAt: Date | null;
}

export class AttendanceService {
	/**
	 * Helper to check if meeting is currently ongoing (with 15-min grace period)
	 */
	static isMeetingOngoing(
		meeting: { sessionDate: Date | string; startTime: string; endTime: string },
		now: Date = new Date()
	): boolean {
		if (!meeting.sessionDate || !meeting.startTime || !meeting.endTime) return false;

		const parseDateOnly = (dateVal: any): string => {
			if (!dateVal) return '';
			if (dateVal instanceof Date) {
				const yyyy = dateVal.getFullYear();
				const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
				const dd = String(dateVal.getDate()).padStart(2, '0');
				return `${yyyy}-${mm}-${dd}`;
			}
			const str = String(dateVal).trim();
			if (str.includes('T')) return str.split('T')[0];
			if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
			const d = new Date(str);
			if (!isNaN(d.getTime())) {
				const yyyy = d.getFullYear();
				const mm = String(d.getMonth() + 1).padStart(2, '0');
				const dd = String(d.getDate()).padStart(2, '0');
				return `${yyyy}-${mm}-${dd}`;
			}
			return str;
		};

		const parseTimeOnly = (timeVal: any): string => {
			if (!timeVal) return '00:00:00';
			const str = String(timeVal).trim();
			const parts = str.split(':');
			const hh = (parts[0] || '00').padStart(2, '0');
			const mm = (parts[1] || '00').padStart(2, '0');
			const ss = (parts[2] || '00').padStart(2, '0');
			return `${hh}:${mm}:${ss}`;
		};

		const dateStr = parseDateOnly(meeting.sessionDate);
		const startStr = parseTimeOnly(meeting.startTime);
		const endStr = parseTimeOnly(meeting.endTime);

		const startMs = new Date(`${dateStr}T${startStr}`).getTime();
		const endMs = new Date(`${dateStr}T${endStr}`).getTime();

		if (isNaN(startMs) || isNaN(endMs)) return false;

		const GRACE_MS = 15 * 60 * 1000; // 15 minutes preparation & wrap-up window
		const nowMs = now.getTime();

		return nowMs >= startMs - GRACE_MS && nowMs <= endMs + GRACE_MS;
	}

	/**
	 * Generate dynamic QR token with 30-second auto-rotate expiry
	 */
	static async generateQRToken(pertemuanId: number, expirySeconds: number = 30): Promise<AttendanceTokenData> {
		// Verify pertemuan exists
		const meeting = await db.query.pertemuan.findFirst({
			where: eq(pertemuan.id, pertemuanId)
		});

		if (!meeting) {
			throw new Error('Pertemuan tidak ditemukan');
		}

		// Deactivate any existing active tokens for this meeting
		await db
			.update(attendanceToken)
			.set({ isActive: false })
			.where(and(eq(attendanceToken.pertemuanId, pertemuanId), eq(attendanceToken.isActive, true)));

		const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
		let tokenStr = 'NLC-';
		for (let i = 0; i < 4; i++) {
			tokenStr += charset[crypto.randomInt(0, charset.length)];
		}

		const expiresAt = new Date(Date.now() + expirySeconds * 1000);

		const [newToken] = await db
			.insert(attendanceToken)
			.values({
				pertemuanId,
				token: tokenStr,
				expiresAt,
				isActive: true
			})
			.returning();

		return {
			id: newToken.id,
			pertemuanId: newToken.pertemuanId,
			token: newToken.token,
			expiresAt: newToken.expiresAt,
			isActive: newToken.isActive,
			createdAt: newToken.createdAt
		};
	}

	/**
	 * Get the currently active and non-expired QR token for a meeting
	 */
	static async getLatestActiveToken(pertemuanId: number): Promise<AttendanceTokenData | null> {
		const result = await db
			.select()
			.from(attendanceToken)
			.where(
				and(
					eq(attendanceToken.pertemuanId, pertemuanId),
					eq(attendanceToken.isActive, true),
					gt(attendanceToken.expiresAt, new Date())
				)
			)
			.orderBy(desc(attendanceToken.createdAt))
			.limit(1);

		if (result.length === 0) return null;

		return {
			id: result[0].id,
			pertemuanId: result[0].pertemuanId,
			token: result[0].token,
			expiresAt: result[0].expiresAt,
			isActive: result[0].isActive,
			createdAt: result[0].createdAt
		};
	}

	/**
	 * Record attendance via scanned QR code token
	 */
	static async recordAttendanceViaQR(
		userId: number,
		tokenString: string
	): Promise<{
		success: boolean;
		message: string;
		attendance?: typeof attendance.$inferSelect;
		points?: { pointsAwarded: number; currentStreak: number; milestoneBonusAwarded: number };
	}> {
		// 1. Validate token existence
		const tokenRecord = await db.query.attendanceToken.findFirst({
			where: eq(attendanceToken.token, tokenString)
		});

		if (!tokenRecord) {
			throw new Error('Token QR presensi tidak ditemukan. Silakan scan ulang kode terbaru di layar proyektor.');
		}

		// 2. Fetch associated meeting
		const meeting = await db.query.pertemuan.findFirst({
			where: eq(pertemuan.id, tokenRecord.pertemuanId)
		});

		if (!meeting) {
			throw new Error('Data pertemuan terkait tidak ditemukan.');
		}

		// 3. Strict check: verify meeting schedule window
		if (!AttendanceService.isMeetingOngoing(meeting)) {
			throw new Error('Presensi QR ditutup karena jadwal pertemuan kelas tidak sedang berlangsung.');
		}

		// 4. Grace Period Check for ongoing meetings:
		// Allow token if it is active OR if it was created within the last 90 seconds (1.5 minutes) for this ongoing meeting
		const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
		const isRecentToken = new Date(tokenRecord.createdAt) >= ninetySecondsAgo;

		if (!tokenRecord.isActive && !isRecentToken) {
			throw new Error('Token QR presensi telah kedaluwarsa (batas toleransi login 1.5 menit). Silakan scan ulang kode terbaru.');
		}

		if (new Date() > new Date(tokenRecord.expiresAt) && !isRecentToken) {
			throw new Error('Token QR presensi telah kedaluwarsa (batas toleransi login 1.5 menit). Silakan scan ulang kode terbaru.');
		}

		// 3. Verify student enrollment in the meeting's KelasInstance
		const membership = await db.query.keanggotaan.findFirst({
			where: and(
				eq(keanggotaan.userId, userId),
				eq(keanggotaan.kelasInstanceId, meeting.kelasInstanceId),
				eq(keanggotaan.status, 'aktif')
			)
		});

		if (!membership) {
			throw new Error('Anda tidak terdaftar sebagai siswa aktif di kelas untuk pertemuan ini.');
		}

		// 4. Check if student has already recorded attendance for this meeting
		const existingAttendance = await db.query.attendance.findFirst({
			where: and(eq(attendance.pertemuanId, meeting.id), eq(attendance.userId, userId))
		});

		if (existingAttendance) {
			throw new Error('Anda sudah mencatatkan presensi untuk pertemuan ini sebelumnya.');
		}

		// 5. Insert new attendance record
		const [newAttendance] = await db
			.insert(attendance)
			.values({
				pertemuanId: meeting.id,
				userId,
				method: 'qr',
				status: 'hadir',
				recordedAt: new Date()
			})
			.returning();

		// 6. Award attendance points & update streak counter
		const pointsResult = await PointsService.awardAttendancePoints(
			userId,
			meeting.kelasInstanceId,
			meeting.id,
			meeting.isWeekend
		);

		return {
			success: true,
			message: 'Presensi via QR berhasil dicatat!',
			attendance: newAttendance,
			points: pointsResult
		};
	}

	/**
	 * Record attendance manually by mentor (mandatory reason required)
	 */
	static async recordAttendanceManual(input: {
		pertemuanId: number;
		userId: number;
		status: 'hadir' | 'excused';
		manualReason: string;
	}): Promise<{
		success: boolean;
		message: string;
		attendance: typeof attendance.$inferSelect;
		points?: { pointsAwarded: number; currentStreak: number; milestoneBonusAwarded: number };
	}> {
		if (!input.manualReason || input.manualReason.trim().length < 3) {
			throw new Error('Alasan presensi manual wajib diisi (minimal 3 karakter).');
		}

		// 1. Fetch meeting
		const meeting = await db.query.pertemuan.findFirst({
			where: eq(pertemuan.id, input.pertemuanId)
		});

		if (!meeting) {
			throw new Error('Pertemuan tidak ditemukan.');
		}

		// 2. Check student membership
		const membership = await db.query.keanggotaan.findFirst({
			where: and(
				eq(keanggotaan.userId, input.userId),
				eq(keanggotaan.kelasInstanceId, meeting.kelasInstanceId)
			)
		});

		if (!membership) {
			throw new Error('Siswa tidak terdaftar di kelas untuk pertemuan ini.');
		}

		// 3. Upsert attendance record
		const existingAttendance = await db.query.attendance.findFirst({
			where: and(eq(attendance.pertemuanId, input.pertemuanId), eq(attendance.userId, input.userId))
		});

		let savedAttendance: typeof attendance.$inferSelect;

		if (existingAttendance) {
			const [updated] = await db
				.update(attendance)
				.set({
					method: 'manual',
					status: input.status,
					manualReason: input.manualReason.trim(),
					recordedAt: new Date()
				})
				.where(eq(attendance.id, existingAttendance.id))
				.returning();
			savedAttendance = updated;
		} else {
			const [inserted] = await db
				.insert(attendance)
				.values({
					pertemuanId: input.pertemuanId,
					userId: input.userId,
					method: 'manual',
					status: input.status,
					manualReason: input.manualReason.trim(),
					recordedAt: new Date()
				})
				.returning();
			savedAttendance = inserted;
		}

		// 4. Update points and streak
		let pointsResult;
		if (input.status === 'hadir') {
			pointsResult = await PointsService.awardAttendancePoints(
				input.userId,
				meeting.kelasInstanceId,
				meeting.id,
				meeting.isWeekend
			);
		} else {
			// 'excused' breaks streak
			await PointsService.updateStreakForStatus(input.userId, meeting.kelasInstanceId);
		}

		return {
			success: true,
			message: `Presensi manual berhasil dicatat (${input.status.toUpperCase()}).`,
			attendance: savedAttendance,
			points: pointsResult
		};
	}

	/**
	 * Record attendance in bulk/batch mode for multiple students
	 */
	static async recordAttendanceBulk(input: {
		pertemuanId: number;
		defaultReason: string;
		items: { userId: number; status: 'hadir' | 'excused' | 'belum_hadir'; manualReason?: string }[];
	}): Promise<{ success: boolean; message: string; updatedCount: number }> {
		const meeting = await db.query.pertemuan.findFirst({
			where: eq(pertemuan.id, input.pertemuanId)
		});

		if (!meeting) {
			throw new Error('Pertemuan tidak ditemukan.');
		}

		let updatedCount = 0;

		for (const item of input.items) {
			const reason = (item.manualReason && item.manualReason.trim()) || input.defaultReason;

			if (item.status === 'hadir' || item.status === 'excused') {
				const existing = await db.query.attendance.findFirst({
					where: and(eq(attendance.pertemuanId, input.pertemuanId), eq(attendance.userId, item.userId))
				});

				if (existing) {
					await db
						.update(attendance)
						.set({
							method: 'manual',
							status: item.status,
							manualReason: reason,
							recordedAt: new Date()
						})
						.where(eq(attendance.id, existing.id));
				} else {
					await db.insert(attendance).values({
						pertemuanId: input.pertemuanId,
						userId: item.userId,
						method: 'manual',
						status: item.status,
						manualReason: reason,
						recordedAt: new Date()
					});
				}

				if (item.status === 'hadir') {
					await PointsService.awardAttendancePoints(
						item.userId,
						meeting.kelasInstanceId,
						meeting.id,
						meeting.isWeekend
					);
				} else {
					await db
						.delete(pointLog)
						.where(
							and(
								eq(pointLog.userId, item.userId),
								eq(pointLog.kelasInstanceId, meeting.kelasInstanceId),
								inArray(pointLog.source, ['attendance_weekday', 'attendance_weekend']),
								eq(pointLog.referenceId, meeting.id)
							)
						);
					await PointsService.updateStreakForStatus(item.userId, meeting.kelasInstanceId);
				}
				updatedCount++;
			} else if (item.status === 'belum_hadir') {
				await db
					.delete(attendance)
					.where(and(eq(attendance.pertemuanId, input.pertemuanId), eq(attendance.userId, item.userId)));
				await db
					.delete(pointLog)
					.where(
						and(
							eq(pointLog.userId, item.userId),
							eq(pointLog.kelasInstanceId, meeting.kelasInstanceId),
							inArray(pointLog.source, ['attendance_weekday', 'attendance_weekend']),
							eq(pointLog.referenceId, meeting.id)
						)
					);
				await PointsService.updateStreakForStatus(item.userId, meeting.kelasInstanceId);
			}
		}

		return {
			success: true,
			message: `Berhasil memperbarui presensi massal (${updatedCount} siswa).`,
			updatedCount
		};
	}

	/**
	 * Get comprehensive attendance list for all enrolled students in a meeting
	 */
	static async getAttendanceListForPertemuan(pertemuanId: number): Promise<{
		meeting: typeof pertemuan.$inferSelect;
		students: StudentAttendanceItem[];
	}> {
		const meeting = await db.query.pertemuan.findFirst({
			where: eq(pertemuan.id, pertemuanId)
		});

		if (!meeting) {
			throw new Error('Pertemuan tidak ditemukan');
		}

		// Get enrolled active students
		const enrolledStudents = await db
			.select({
				userId: user.id,
				username: user.username,
				fullName: user.fullName
			})
			.from(keanggotaan)
			.innerJoin(user, eq(keanggotaan.userId, user.id))
			.where(
				and(
					eq(keanggotaan.kelasInstanceId, meeting.kelasInstanceId),
					eq(keanggotaan.status, 'aktif')
				)
			);

		// Get recorded attendance for this meeting
		const attendanceRecords = await db
			.select()
			.from(attendance)
			.where(eq(attendance.pertemuanId, pertemuanId));

		const attendanceMap = new Map(attendanceRecords.map((rec) => [rec.userId, rec]));

		const studentList: StudentAttendanceItem[] = enrolledStudents.map((s) => {
			const record = attendanceMap.get(s.userId);
			return {
				userId: s.userId,
				username: s.username,
				fullName: s.fullName,
				attendanceId: record ? record.id : null,
				status: record ? (record.status as 'hadir' | 'excused') : 'belum_hadir',
				method: record ? (record.method as 'qr' | 'manual') : null,
				manualReason: record ? record.manualReason : null,
				recordedAt: record ? record.recordedAt : null
			};
		});

		return {
			meeting,
			students: studentList
		};
	}
}

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '$lib/server/db/schema/academic';
import { user as userTable } from '$lib/server/db/schema/auth';
import { attendance, pertemuan } from '$lib/server/db/schema/session';
import { submission, task } from '$lib/server/db/schema/task';
import { pointLog } from '$lib/server/db/schema/gamification';
import { eq, and, sql, count, sum, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'guru' && locals.user.role !== 'admin') {
		throw error(403, 'Akses khusus Guru Pembimbing & Admin.');
	}

	const selectedKelasId = url.searchParams.get('kelasId') ? Number(url.searchParams.get('kelasId')) : null;
	const search = (url.searchParams.get('q') || '').trim().toLowerCase();

	// Fetch active kelas options
	const kelasOptions = await db
		.select({
			id: kelasInstance.id,
			name: kelasInstance.name,
			tahunAjaranName: tahunAjaran.name,
			tingkatName: tingkat.name
		})
		.from(kelasInstance)
		.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
		.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
		.where(eq(kelasInstance.isActive, true));

	const targetKelasId = selectedKelasId || (kelasOptions.length > 0 ? kelasOptions[0].id : null);

	let studentReports: any[] = [];
	let totalMeetings = 0;

	if (targetKelasId) {
		// Fetch total meetings for selected kelas
		const [meetingRes] = await db
			.select({ total: count(pertemuan.id) })
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, targetKelasId));

		totalMeetings = Number(meetingRes?.total ?? 0);

		// Fetch enrolled students
		const members = await db
			.select({
				userId: keanggotaan.userId,
				fullName: userTable.fullName,
				username: userTable.username,
				nisn: userTable.nisn,
				email: userTable.email,
				avatarUrl: userTable.avatarUrl,
				kelasName: kelasInstance.name
			})
			.from(keanggotaan)
			.innerJoin(userTable, eq(keanggotaan.userId, userTable.id))
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.where(and(eq(keanggotaan.kelasInstanceId, targetKelasId), eq(keanggotaan.status, 'aktif')));

		// Fetch attendance & point stats per student
		const studentIds = members.map((m) => m.userId);

		if (studentIds.length > 0) {
			const meetingsInKelas = await db
				.select({ id: pertemuan.id })
				.from(pertemuan)
				.where(eq(pertemuan.kelasInstanceId, targetKelasId));

			const meetingIds = meetingsInKelas.map((m) => m.id);

			// Attendance counts per student
			const attendanceRows = meetingIds.length > 0
				? await db
						.select({
							userId: attendance.userId,
							status: attendance.status,
							total: count(attendance.id)
						})
						.from(attendance)
						.where(and(inArray(attendance.pertemuanId, meetingIds), inArray(attendance.userId, studentIds)))
						.groupBy(attendance.userId, attendance.status)
				: [];

			// Point sums per student
			const pointRows = await db
				.select({
					userId: pointLog.userId,
					totalPoints: sum(pointLog.amount)
				})
				.from(pointLog)
				.where(and(eq(pointLog.kelasInstanceId, targetKelasId), inArray(pointLog.userId, studentIds)))
				.groupBy(pointLog.userId);

			const attendMap: Record<number, { hadir: number; excused: number; alfa: number }> = {};
			for (const r of attendanceRows) {
				if (!attendMap[r.userId]) attendMap[r.userId] = { hadir: 0, excused: 0, alfa: 0 };
				if (r.status === 'hadir') attendMap[r.userId].hadir = Number(r.total);
				else if (r.status === 'excused') attendMap[r.userId].excused = Number(r.total);
				else if (r.status === 'alfa') attendMap[r.userId].alfa = Number(r.total);
			}

			const pointMap: Record<number, number> = {};
			for (const p of pointRows) {
				pointMap[p.userId] = Number(p.totalPoints ?? 0);
			}

			studentReports = members
				.filter((m) => {
					if (!search) return true;
					return (
						m.fullName.toLowerCase().includes(search) ||
						m.username.toLowerCase().includes(search) ||
						(m.nisn && m.nisn.includes(search))
					);
				})
				.map((m) => {
					const att = attendMap[m.userId] || { hadir: 0, excused: 0, alfa: 0 };
					const totalAttended = att.hadir + att.excused;
					const attendRate = totalMeetings > 0 ? Math.round((att.hadir / totalMeetings) * 100) : 0;
					return {
						...m,
						hadir: att.hadir,
						excused: att.excused,
						alfa: att.alfa,
						totalMeetings,
						attendRate,
						totalPoints: pointMap[m.userId] || 0
					};
				});
		}
	}

	// Calculate summary metrics
	const totalSiswa = studentReports.length;
	const avgAttendRate = totalSiswa > 0 ? Math.round(studentReports.reduce((acc, s) => acc + s.attendRate, 0) / totalSiswa) : 0;
	const totalPointsEarned = studentReports.reduce((acc, s) => acc + s.totalPoints, 0);

	return {
		kelasOptions,
		selectedKelasId: targetKelasId,
		totalMeetings,
		studentReports,
		metrics: {
			totalSiswa,
			avgAttendRate,
			totalPointsEarned,
			totalKelas: kelasOptions.length
		}
	};
};

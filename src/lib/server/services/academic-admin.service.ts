import { db } from '../db';
import { tahunAjaran, kelasInstance, keanggotaan, masterRombel } from '../db/schema/academic';
import { user } from '../db/schema/auth';
import { eq, ne, and, count, desc, like } from 'drizzle-orm';
import type { CreateTahunAjaranInput, UpdateTahunAjaranInput } from '$lib/validators/academic';

export interface TahunAjaranItem {
	id: number;
	name: string;
	isActive: boolean;
	startedAt: Date | null;
	endedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	totalClasses: number;
	totalStudents: number;
	dateStatus: 'aktif_periode' | 'belum_mulai' | 'selesai' | 'tanpa_tanggal';
}

export interface AcademicSummaryStats {
	totalTahunAjaran: number;
	activeTahunAjaranName: string;
	totalClassesAcrossAll: number;
	totalStudentsAcrossAll: number;
}

function isFutureDate(d: Date | null): boolean {
	if (!d) return false;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const target = new Date(d);
	target.setHours(0, 0, 0, 0);
	return target > now;
}

function isPastDate(d: Date | null): boolean {
	if (!d) return false;
	const now = new Date();
	const target = new Date(d);
	target.setHours(23, 59, 59, 999);
	return now > target;
}

function isDateInRange(start: Date | null, end: Date | null): boolean {
	if (!start || !end) return false;
	const now = new Date();
	const s = new Date(start);
	s.setHours(0, 0, 0, 0);
	const e = new Date(end);
	e.setHours(23, 59, 59, 999);
	return now >= s && now <= e;
}

function formatDateIndo(dateInput: Date | string | null): string {
	if (!dateInput) return '-';
	const d = new Date(dateInput);
	if (isNaN(d.getTime())) return '-';
	return d.toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

export const AcademicAdminService = {
	/**
	 * Automatically syncs active status based on current date window [startedAt, endedAt]
	 */
	async syncAutomaticActiveStatus(): Promise<void> {
		const rows = await db.select().from(tahunAjaran);

		for (const row of rows) {
			if (row.startedAt && row.endedAt) {
				const inRange = isDateInRange(row.startedAt, row.endedAt);
				if (inRange && !row.isActive) {
					// Today falls within schedule! Auto-activate this term & deactivate others
					await db.update(tahunAjaran).set({ isActive: false, updatedAt: new Date() });
					await db.update(tahunAjaran).set({ isActive: true, updatedAt: new Date() }).where(eq(tahunAjaran.id, row.id));
					console.log(`[Auto-Academic-Year] Automatically activated academic year: ${row.name}`);
					break;
				}
			}
		}
	},

	/**
	 * Fetches all academic years with aggregate stats and date status indicators
	 */
	async getTahunAjaranList(searchQuery?: string): Promise<{
		items: TahunAjaranItem[];
		stats: AcademicSummaryStats;
	}> {
		await this.syncAutomaticActiveStatus();

		let query = db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive,
				startedAt: tahunAjaran.startedAt,
				endedAt: tahunAjaran.endedAt,
				createdAt: tahunAjaran.createdAt,
				updatedAt: tahunAjaran.updatedAt
			})
			.from(tahunAjaran);

		if (searchQuery && searchQuery.trim() !== '') {
			const term = `%${searchQuery.trim()}%`;
			query = query.where(like(tahunAjaran.name, term)) as typeof query;
		}

		const rows = await query.orderBy(desc(tahunAjaran.createdAt));

		let activeTaName = 'Belum ada TA aktif';
		let totalClassesGlobal = 0;
		let totalStudentsGlobal = 0;

		const items: TahunAjaranItem[] = [];

		for (const row of rows) {
			if (row.isActive) {
				activeTaName = row.name;
			}

			// Determine date status relative to today
			let dateStatus: 'aktif_periode' | 'belum_mulai' | 'selesai' | 'tanpa_tanggal' = 'tanpa_tanggal';
			if (row.startedAt && isFutureDate(row.startedAt)) {
				dateStatus = 'belum_mulai';
			} else if (row.endedAt && isPastDate(row.endedAt)) {
				dateStatus = 'selesai';
			} else if (row.startedAt && row.endedAt && isDateInRange(row.startedAt, row.endedAt)) {
				dateStatus = 'aktif_periode';
			}

			// Count classes for this academic year
			const [classCountRes] = await db
				.select({ total: count(kelasInstance.id) })
				.from(kelasInstance)
				.where(eq(kelasInstance.tahunAjaranId, row.id));

			const classCount = Number(classCountRes?.total ?? 0);
			totalClassesGlobal += classCount;

			// Count active students in classes of this academic year
			const [studentCountRes] = await db
				.select({ total: count(keanggotaan.id) })
				.from(keanggotaan)
				.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
				.where(and(eq(kelasInstance.tahunAjaranId, row.id), eq(keanggotaan.status, 'aktif')));

			const studentCount = Number(studentCountRes?.total ?? 0);
			totalStudentsGlobal += studentCount;

			items.push({
				...row,
				totalClasses: classCount,
				totalStudents: studentCount,
				dateStatus
			});
		}

		return {
			items,
			stats: {
				totalTahunAjaran: rows.length,
				activeTahunAjaranName: activeTaName,
				totalClassesAcrossAll: totalClassesGlobal,
				totalStudentsAcrossAll: totalStudentsGlobal
			}
		};
	},

	/**
	 * Creates a new academic year with strict future start date activation guards.
	 */
	async createTahunAjaran(input: CreateTahunAjaranInput): Promise<{ success: boolean; message?: string }> {
		const nameTrimmed = input.name.trim();

		// Check name collision
		const [existing] = await db
			.select({ id: tahunAjaran.id })
			.from(tahunAjaran)
			.where(eq(tahunAjaran.name, nameTrimmed));

		if (existing) {
			return { success: false, message: `Periode '${nameTrimmed}' sudah ada.` };
		}

		const startDate = input.startedAt && input.startedAt.trim() !== '' ? new Date(input.startedAt) : null;
		const endDate = input.endedAt && input.endedAt.trim() !== '' ? new Date(input.endedAt) : null;

		let shouldBeActive = Boolean(input.isActive);

		// BUSINESS GUARD: Cannot manually activate if start date is in the future
		if (shouldBeActive && startDate && isFutureDate(startDate)) {
			return {
				success: false,
				message: `Periode '${nameTrimmed}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(startDate)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
			};
		}

		// If activating new term, deactivate all existing academic years
		if (shouldBeActive) {
			await db.update(tahunAjaran).set({ isActive: false, updatedAt: new Date() });
		}

		await db.insert(tahunAjaran).values({
			name: nameTrimmed,
			isActive: shouldBeActive,
			startedAt: startDate,
			endedAt: endDate,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return { success: true, message: `Periode '${nameTrimmed}' berhasil ditambahkan.` };
	},

	/**
	 * Updates an existing academic year with future start date activation guards.
	 */
	async updateTahunAjaran(input: UpdateTahunAjaranInput): Promise<{ success: boolean; message?: string }> {
		const nameTrimmed = input.name.trim();

		const [target] = await db
			.select({ id: tahunAjaran.id, isActive: tahunAjaran.isActive })
			.from(tahunAjaran)
			.where(eq(tahunAjaran.id, input.id));

		if (!target) {
			return { success: false, message: 'Periode tidak ditemukan.' };
		}

		// Check name collision with other records
		const [nameCheck] = await db
			.select({ id: tahunAjaran.id })
			.from(tahunAjaran)
			.where(and(eq(tahunAjaran.name, nameTrimmed), ne(tahunAjaran.id, input.id)));

		if (nameCheck) {
			return { success: false, message: `Periode '${nameTrimmed}' sudah digunakan oleh data lain.` };
		}

		const startDate = input.startedAt && input.startedAt.trim() !== '' ? new Date(input.startedAt) : null;
		const endDate = input.endedAt && input.endedAt.trim() !== '' ? new Date(input.endedAt) : null;

		let shouldBeActive = Boolean(input.isActive);

		// BUSINESS GUARD: Cannot manually activate if start date is in the future
		if (shouldBeActive && startDate && isFutureDate(startDate)) {
			return {
				success: false,
				message: `Periode '${nameTrimmed}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(startDate)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
			};
		}

		// If toggling to active, deactivate all other academic years
		if (shouldBeActive) {
			await db.update(tahunAjaran).set({ isActive: false, updatedAt: new Date() });
		}

		await db
			.update(tahunAjaran)
			.set({
				name: nameTrimmed,
				isActive: shouldBeActive,
				startedAt: startDate,
				endedAt: endDate,
				updatedAt: new Date()
			})
			.where(eq(tahunAjaran.id, input.id));

		return { success: true, message: `Periode '${nameTrimmed}' berhasil diperbarui.` };
	},

	/**
	 * Toggles active status of an academic year with future date guard
	 */
	async setActiveTahunAjaran(id: number): Promise<{ success: boolean; message?: string }> {
		const [target] = await db
			.select({
				id: tahunAjaran.id,
				name: tahunAjaran.name,
				isActive: tahunAjaran.isActive,
				startedAt: tahunAjaran.startedAt
			})
			.from(tahunAjaran)
			.where(eq(tahunAjaran.id, id));

		if (!target) {
			return { success: false, message: 'Periode tidak ditemukan.' };
		}

		if (target.isActive) {
			return { success: true, message: `Periode '${target.name}' sudah dalam status aktif.` };
		}

		// BUSINESS GUARD: Cannot activate if start date is in the future
		if (target.startedAt && isFutureDate(target.startedAt)) {
			return {
				success: false,
				message: `Periode '${target.name}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(target.startedAt)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
			};
		}

		// Deactivate all, then activate target
		await db.update(tahunAjaran).set({ isActive: false, updatedAt: new Date() });
		await db
			.update(tahunAjaran)
			.set({ isActive: true, updatedAt: new Date() })
			.where(eq(tahunAjaran.id, id));

		return { success: true, message: `Periode '${target.name}' sekarang aktif.` };
	},

	/**
	 * Safely deletes an academic year if no connected classes exist
	 */
	async deleteTahunAjaran(id: number): Promise<{ success: boolean; message?: string }> {
		const [target] = await db
			.select({ id: tahunAjaran.id, name: tahunAjaran.name })
			.from(tahunAjaran)
			.where(eq(tahunAjaran.id, id));

		if (!target) {
			return { success: false, message: 'Periode tidak ditemukan.' };
		}

		// Check foreign key reference in kelasInstance
		const [classRef] = await db
			.select({ total: count(kelasInstance.id) })
			.from(kelasInstance)
			.where(eq(kelasInstance.tahunAjaranId, id));

		const connectedClasses = Number(classRef?.total ?? 0);

		if (connectedClasses > 0) {
			return {
				success: false,
				message: `Periode '${target.name}' tidak dapat dihapus karena masih terhubung dengan ${connectedClasses} kelas.`
			};
		}

		await db.delete(tahunAjaran).where(eq(tahunAjaran.id, id));

		return { success: true, message: `Periode '${target.name}' berhasil dihapus.` };
	},

	/**
	 * Bulk promotes student rombelLabels to next level upon active Periode switch
	 */
	async bulkPromoteRombels(): Promise<{ success: boolean; promotedCount: number; message: string }> {
		const [activeTa] = await db
			.select()
			.from(tahunAjaran)
			.where(eq(tahunAjaran.isActive, true));

		if (!activeTa) {
			return {
				success: false,
				promotedCount: 0,
				message: 'Kenaikan kelas ditolak: Belum ada Periode Komunitas yang aktif saat ini.'
			};
		}

		const now = new Date();
		if (activeTa.endedAt && new Date(activeTa.endedAt) > now) {
			return {
				success: false,
				promotedCount: 0,
				message: `Kenaikan kelas ditolak: Periode Komunitas aktif '${activeTa.name}' masih berlangsung hingga ${formatDateIndo(activeTa.endedAt)}. Kenaikan kelas baru dapat dieksekusi setelah rentang waktu periode ini resmi berakhir.`
			};
		}

		const allRombels = await db.select().from(masterRombel).orderBy(masterRombel.levelOrder);
		if (allRombels.length === 0) {
			return { success: false, promotedCount: 0, message: 'Belum ada data Master Rombel.' };
		}

		const rombelMap = new Map<string, string>();
		for (const r of allRombels) {
			if (r.nextRombelId) {
				const nextR = allRombels.find((item) => item.id === r.nextRombelId);
				if (nextR) rombelMap.set(r.name, nextR.name);
			} else {
				if (r.name.startsWith('X ')) {
					rombelMap.set(r.name, r.name.replace(/^X /, 'XI '));
				} else if (r.name.startsWith('XI ')) {
					rombelMap.set(r.name, r.name.replace(/^XI /, 'XII '));
				} else if (r.name.startsWith('XII ')) {
					rombelMap.set(r.name, 'Alumni');
				}
			}
		}

		const students = await db
			.select({ id: user.id, rombelLabel: user.rombelLabel })
			.from(user)
			.where(eq(user.role, 'siswa'));

		let promotedCount = 0;
		for (const s of students) {
			if (s.rombelLabel && rombelMap.has(s.rombelLabel)) {
				const nextLabel = rombelMap.get(s.rombelLabel)!;
				await db
					.update(user)
					.set({ rombelLabel: nextLabel, updatedAt: new Date() })
					.where(eq(user.id, s.id));
				promotedCount++;
			}
		}

		return {
			success: true,
			promotedCount,
			message: `Berhasil memperbarui ${promotedCount} label kelas siswa ke tingkat berikutnya.`
		};
	},

	/**
	 * Returns preview items and summary stats for bulk promotion
	 */
	async getPromotionPreview(): Promise<{
		canPromote: boolean;
		timeframeNotice?: string;
		summary: {
			totalStudents: number;
			willPromoteCount: number;
			willGraduateCount: number;
			unchangedCount: number;
		};
		items: Array<{
			id: number;
			fullName: string;
			username: string;
			angkatan: number | null;
			currentRombel: string | null;
			nextRombel: string;
			status: 'promote' | 'graduate' | 'unchanged';
		}>;
	}> {
		const [activeTa] = await db
			.select()
			.from(tahunAjaran)
			.where(eq(tahunAjaran.isActive, true));

		const now = new Date();
		let canPromote = true;
		let timeframeNotice: string | undefined = undefined;

		if (!activeTa) {
			canPromote = false;
			timeframeNotice = 'Belum ada Periode Komunitas yang aktif saat ini.';
		} else if (activeTa.endedAt && new Date(activeTa.endedAt) > now) {
			canPromote = false;
			timeframeNotice = `Periode aktif '${activeTa.name}' masih berlangsung hingga ${formatDateIndo(activeTa.endedAt)}. Tombol eksekusi kenaikan kelas dikunci hingga rentang waktu periode berakhir.`;
		}

		const allRombels = await db.select().from(masterRombel).orderBy(masterRombel.levelOrder);
		const rombelMap = new Map<string, string>();

		for (const r of allRombels) {
			if (r.nextRombelId) {
				const nextR = allRombels.find((item) => item.id === r.nextRombelId);
				if (nextR) rombelMap.set(r.name, nextR.name);
			} else {
				if (r.name.startsWith('X ')) {
					rombelMap.set(r.name, r.name.replace(/^X /, 'XI '));
				} else if (r.name.startsWith('XI ')) {
					rombelMap.set(r.name, r.name.replace(/^XI /, 'XII '));
				} else if (r.name.startsWith('XII ')) {
					rombelMap.set(r.name, 'Alumni');
				}
			}
		}

		const students = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				angkatan: user.angkatan,
				rombelLabel: user.rombelLabel
			})
			.from(user)
			.where(eq(user.role, 'siswa'))
			.orderBy(user.rombelLabel, user.fullName);

		let willPromoteCount = 0;
		let willGraduateCount = 0;
		let unchangedCount = 0;

		const items = students.map((s) => {
			const current = s.rombelLabel || 'Belum Diatur';
			let next = current;
			let status: 'promote' | 'graduate' | 'unchanged' = 'unchanged';

			if (s.rombelLabel && rombelMap.has(s.rombelLabel)) {
				next = rombelMap.get(s.rombelLabel)!;
				if (next === 'Alumni') {
					status = 'graduate';
					willGraduateCount++;
				} else {
					status = 'promote';
					willPromoteCount++;
				}
			} else {
				unchangedCount++;
			}

			return {
				id: s.id,
				fullName: s.fullName,
				username: s.username,
				angkatan: s.angkatan,
				currentRombel: s.rombelLabel,
				nextRombel: next,
				status
			};
		});

		return {
			canPromote,
			timeframeNotice,
			summary: {
				totalStudents: students.length,
				willPromoteCount,
				willGraduateCount,
				unchangedCount
			},
			items
		};
	}
};

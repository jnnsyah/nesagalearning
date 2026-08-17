import { db } from '../db';
import { tahunAjaran, kelasInstance, keanggotaan } from '../db/schema/academic';
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
			return { success: false, message: `Tahun ajaran '${nameTrimmed}' sudah ada.` };
		}

		const startDate = input.startedAt && input.startedAt.trim() !== '' ? new Date(input.startedAt) : null;
		const endDate = input.endedAt && input.endedAt.trim() !== '' ? new Date(input.endedAt) : null;

		let shouldBeActive = Boolean(input.isActive);

		// BUSINESS GUARD: Cannot manually activate if start date is in the future
		if (shouldBeActive && startDate && isFutureDate(startDate)) {
			return {
				success: false,
				message: `Tahun ajaran '${nameTrimmed}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(startDate)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
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

		return { success: true, message: `Tahun ajaran '${nameTrimmed}' berhasil ditambahkan.` };
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
			return { success: false, message: 'Tahun ajaran tidak ditemukan.' };
		}

		// Check name collision with other records
		const [nameCheck] = await db
			.select({ id: tahunAjaran.id })
			.from(tahunAjaran)
			.where(and(eq(tahunAjaran.name, nameTrimmed), ne(tahunAjaran.id, input.id)));

		if (nameCheck) {
			return { success: false, message: `Tahun ajaran '${nameTrimmed}' sudah digunakan oleh data lain.` };
		}

		const startDate = input.startedAt && input.startedAt.trim() !== '' ? new Date(input.startedAt) : null;
		const endDate = input.endedAt && input.endedAt.trim() !== '' ? new Date(input.endedAt) : null;

		let shouldBeActive = Boolean(input.isActive);

		// BUSINESS GUARD: Cannot manually activate if start date is in the future
		if (shouldBeActive && startDate && isFutureDate(startDate)) {
			return {
				success: false,
				message: `Tahun ajaran '${nameTrimmed}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(startDate)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
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

		return { success: true, message: `Tahun ajaran '${nameTrimmed}' berhasil diperbarui.` };
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
			return { success: false, message: 'Tahun ajaran tidak ditemukan.' };
		}

		if (target.isActive) {
			return { success: true, message: `Tahun ajaran '${target.name}' sudah dalam status aktif.` };
		}

		// BUSINESS GUARD: Cannot activate if start date is in the future
		if (target.startedAt && isFutureDate(target.startedAt)) {
			return {
				success: false,
				message: `Tahun ajaran '${target.name}' belum dapat diaktifkan karena tanggal mulai (${formatDateIndo(target.startedAt)}) belum tiba. Sistem akan mengaktifkannya secara otomatis saat waktunya tiba.`
			};
		}

		// Deactivate all, then activate target
		await db.update(tahunAjaran).set({ isActive: false, updatedAt: new Date() });
		await db
			.update(tahunAjaran)
			.set({ isActive: true, updatedAt: new Date() })
			.where(eq(tahunAjaran.id, id));

		return { success: true, message: `Tahun ajaran '${target.name}' sekarang aktif.` };
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
			return { success: false, message: 'Tahun ajaran tidak ditemukan.' };
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
				message: `Tahun ajaran '${target.name}' tidak dapat dihapus karena masih terhubung dengan ${connectedClasses} kelas.`
			};
		}

		await db.delete(tahunAjaran).where(eq(tahunAjaran.id, id));

		return { success: true, message: `Tahun ajaran '${target.name}' berhasil dihapus.` };
	}
};

import { db } from '../db';
import {
	tahunAjaran,
	tingkat,
	kelasInstance,
	keanggotaan,
	mentorAssignment,
	masterAngkatan,
	masterRombel
} from '../db/schema/academic';
import { curriculumTrack } from '../db/schema/curriculum';
import { user } from '../db/schema/auth';
import { eq, ne, and, count, desc, like, inArray } from 'drizzle-orm';
import type { CreateKelasInput, UpdateKelasInput, AssignStudentInput } from '$lib/validators/master';

export interface MentorInfo {
	id: number;
	fullName: string;
	username: string;
}

export interface KelasItem {
	id: number;
	name: string;
	targetAngkatan?: number | null;
	tahunAjaranId: number;
	tahunAjaranName: string;
	isTahunAjaranActive: boolean;
	tingkatId?: number | null;
	tingkatName?: string | null;
	levelOrder?: number | null;
	curriculumTrackId?: number | null;
	curriculumTrackTitle?: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	totalStudents: number;
	mentors: MentorInfo[];
}

export interface MasterSummaryStats {
	totalKelas: number;
	activeKelasCount: number;
	totalStudentsAcrossClasses: number;
	totalAssignedMentors: number;
}

export const MasterAdminService = {
	/**
	 * Seeds baseline master data for Tingkat and Curriculum Track if tables are empty
	 */
	async ensureDefaultMasterData(): Promise<void> {
		// 1. Ensure Tingkat (10, 11, 12) exist
		const existingTingkat = await db.select({ id: tingkat.id, levelOrder: tingkat.levelOrder }).from(tingkat);
		
		let t10Id: number | null = existingTingkat.find((t) => t.levelOrder === 1)?.id ?? null;
		let t11Id: number | null = existingTingkat.find((t) => t.levelOrder === 2)?.id ?? null;
		let t12Id: number | null = existingTingkat.find((t) => t.levelOrder === 3)?.id ?? null;

		if (!t10Id) {
			const [inserted] = await db.insert(tingkat).values({ name: 'Tingkat X (Kelas 10)', levelOrder: 1 }).returning({ id: tingkat.id });
			t10Id = inserted.id;
		}
		if (!t11Id) {
			const [inserted] = await db.insert(tingkat).values({ name: 'Tingkat XI (Kelas 11)', levelOrder: 2 }).returning({ id: tingkat.id });
			t11Id = inserted.id;
		}
		if (!t12Id) {
			const [inserted] = await db.insert(tingkat).values({ name: 'Tingkat XII (Kelas 12)', levelOrder: 3 }).returning({ id: tingkat.id });
			t12Id = inserted.id;
		}

		// 2. Ensure default Curriculum Tracks exist for each level
		const existingTracks = await db.select({ id: curriculumTrack.id }).from(curriculumTrack);
		if (existingTracks.length === 0) {
			if (t10Id) {
				await db.insert(curriculumTrack).values({
					tingkatId: t10Id,
					title: 'Dasar Pemrograman & Web Standard',
					description: 'Landasan logika pemrograman, HTML5, CSS3, JavaScript ES6, dan Git VCS',
					isPublished: true
				});
			}
			if (t11Id) {
				await db.insert(curriculumTrack).values({
					tingkatId: t11Id,
					title: 'Front-End Framework & API Development',
					description: 'Pengembangan aplikasi web dinamis dengan Svelte 5, REST API, & Database',
					isPublished: true
				});
			}
			if (t12Id) {
				await db.insert(curriculumTrack).values({
					tingkatId: t12Id,
					title: 'Full-Stack Development & Capstone Project',
					description: 'Arsitektur web tingkat lanjut, deployment cloud, & proyek industri akhir',
					isPublished: true
				});
			}
		}
	},

	/**
	 * Fetches all class instances with joined academic metadata, active student count, and assigned mentors
	 */
	async getKelasList(
		searchQuery?: string,
		filterTahunAjaranId?: number,
		filterTingkatId?: number
	): Promise<{ items: KelasItem[]; stats: MasterSummaryStats }> {
		await this.ensureDefaultMasterData();

		let query = db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				targetAngkatan: kelasInstance.targetAngkatan,
				isActive: kelasInstance.isActive,
				createdAt: kelasInstance.createdAt,
				updatedAt: kelasInstance.updatedAt,
				tahunAjaranId: tahunAjaran.id,
				tahunAjaranName: tahunAjaran.name,
				isTahunAjaranActive: tahunAjaran.isActive,
				tingkatId: tingkat.id,
				tingkatName: tingkat.name,
				levelOrder: tingkat.levelOrder,
				curriculumTrackId: curriculumTrack.id,
				curriculumTrackTitle: curriculumTrack.title
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.leftJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.leftJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id));

		if (searchQuery && searchQuery.trim() !== '') {
			const term = `%${searchQuery.trim()}%`;
			query = query.where(like(kelasInstance.name, term)) as typeof query;
		}

		if (filterTahunAjaranId && filterTahunAjaranId > 0) {
			query = query.where(eq(kelasInstance.tahunAjaranId, filterTahunAjaranId)) as typeof query;
		}

		if (filterTingkatId && filterTingkatId > 0) {
			query = query.where(eq(kelasInstance.tingkatId, filterTingkatId)) as typeof query;
		}

		const rows = await query.orderBy(desc(kelasInstance.createdAt));

		let activeCount = 0;
		let totalStudentsGlobal = 0;
		const assignedMentorIds = new Set<number>();
		const items: KelasItem[] = [];

		for (const row of rows) {
			if (row.isActive) activeCount++;

			// 1. Count active students in this class
			const [studentCountRes] = await db
				.select({ total: count(keanggotaan.id) })
				.from(keanggotaan)
				.where(and(eq(keanggotaan.kelasInstanceId, row.id), eq(keanggotaan.status, 'aktif')));

			const studentCount = Number(studentCountRes?.total ?? 0);
			totalStudentsGlobal += studentCount;

			// 2. Fetch assigned mentors
			const mentorRows = await db
				.select({
					id: user.id,
					fullName: user.fullName,
					username: user.username
				})
				.from(mentorAssignment)
				.innerJoin(user, eq(mentorAssignment.userId, user.id))
				.where(eq(mentorAssignment.kelasInstanceId, row.id));

			const mentors: MentorInfo[] = mentorRows.map((m) => {
				assignedMentorIds.add(m.id);
				return {
					id: m.id,
					fullName: m.fullName,
					username: m.username
				};
			});

			items.push({
				...row,
				totalStudents: studentCount,
				mentors
			});
		}

		return {
			items,
			stats: {
				totalKelas: rows.length,
				activeKelasCount: activeCount,
				totalStudentsAcrossClasses: totalStudentsGlobal,
				totalAssignedMentors: assignedMentorIds.size
			}
		};
	},

	/**
	 * Fetches dropdown options data for forms and filter bars
	 */
	async getOptionsData(): Promise<{
		tahunAjaranList: Array<{ id: number; name: string; isActive: boolean }>;
		angkatanList: Array<{ id: number; year: number; name: string; isActive: boolean }>;
		tingkatList: Array<{ id: number; name: string; levelOrder: number }>;
		trackList: Array<{ id: number; title: string; tingkatId: number | null }>;
		mentorsList: Array<{ id: number; fullName: string; username: string }>;
		studentsList: Array<{ id: number; fullName: string; username: string; nisn: string | null }>;
	}> {
		await this.ensureDefaultMasterData();

		const angList = await this.getAllAngkatan();

		const taList = await db
			.select({ id: tahunAjaran.id, name: tahunAjaran.name, isActive: tahunAjaran.isActive })
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.createdAt));

		const tList = await db
			.select({ id: tingkat.id, name: tingkat.name, levelOrder: tingkat.levelOrder })
			.from(tingkat)
			.orderBy(tingkat.levelOrder);

		const trList = await db
			.select({ id: curriculumTrack.id, title: curriculumTrack.title, tingkatId: curriculumTrack.tingkatId })
			.from(curriculumTrack)
			.orderBy(curriculumTrack.id);

		const mList = await db
			.select({ id: user.id, fullName: user.fullName, username: user.username })
			.from(user)
			.where(eq(user.role, 'mentor'))
			.orderBy(user.fullName);

		const sList = await db
			.select({ id: user.id, fullName: user.fullName, username: user.username, nisn: user.nisn })
			.from(user)
			.where(eq(user.role, 'siswa'))
			.orderBy(user.fullName);

		return {
			angkatanList: angList,
			tahunAjaranList: taList,
			tingkatList: tList,
			trackList: trList,
			mentorsList: mList,
			studentsList: sList
		};
	},

	/**
	 * Creates a new class instance and assigns mentors
	 */
	async createKelas(input: CreateKelasInput): Promise<{ success: boolean; message?: string }> {
		const nameTrimmed = input.name.trim();

		// Check name collision in the same academic year
		const [existing] = await db
			.select({ id: kelasInstance.id })
			.from(kelasInstance)
			.where(and(eq(kelasInstance.tahunAjaranId, input.tahunAjaranId), eq(kelasInstance.name, nameTrimmed)));

		if (existing) {
			return { success: false, message: `Kelas '${nameTrimmed}' sudah ada pada periode yang dipilih.` };
		}

		// Auto-resolve non-null foreign keys tingkatId & curriculumTrackId if not provided in UI form
		let finalTingkatId = input.tingkatId;
		if (!finalTingkatId) {
			const existingTingkatIdsInTa = (
				await db
					.select({ tingkatId: kelasInstance.tingkatId })
					.from(kelasInstance)
					.where(eq(kelasInstance.tahunAjaranId, input.tahunAjaranId))
			).map((k) => k.tingkatId);

			const allTingkat = await db.select({ id: tingkat.id }).from(tingkat).orderBy(tingkat.levelOrder);
			const unusedTingkat = allTingkat.find((t) => !existingTingkatIdsInTa.includes(t.id));
			finalTingkatId = unusedTingkat ? unusedTingkat.id : allTingkat[0]?.id;
		}

		let finalTrackId = input.curriculumTrackId;
		if (!finalTrackId) {
			const [firstTrack] = await db.select({ id: curriculumTrack.id }).from(curriculumTrack).orderBy(curriculumTrack.id).limit(1);
			finalTrackId = firstTrack?.id;
		}

		if (!finalTingkatId || !finalTrackId) {
			return { success: false, message: 'Gagal membuat kelas: Data Tingkat atau Track Pembelajaran master belum diatur di sistem.' };
		}

		const [inserted] = await db
			.insert(kelasInstance)
			.values({
				tahunAjaranId: input.tahunAjaranId,
				targetAngkatan: input.targetAngkatan || null,
				tingkatId: finalTingkatId,
				curriculumTrackId: finalTrackId,
				name: nameTrimmed,
				isActive: Boolean(input.isActive),
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning({ id: kelasInstance.id });

		// Assign mentors if specified
		if (input.mentorIds && input.mentorIds.length > 0) {
			for (const mentorId of input.mentorIds) {
				await db.insert(mentorAssignment).values({
					userId: mentorId,
					kelasInstanceId: inserted.id,
					assignedAt: new Date()
				});
			}
		}

		return { success: true, message: `Kelompok / Kelas '${nameTrimmed}' berhasil dibuat.` };
	},

	/**
	 * Updates an existing class instance and mentor assignments
	 */
	async updateKelas(input: UpdateKelasInput): Promise<{ success: boolean; message?: string }> {
		const nameTrimmed = input.name.trim();

		const [target] = await db
			.select({
				id: kelasInstance.id,
				tingkatId: kelasInstance.tingkatId,
				curriculumTrackId: kelasInstance.curriculumTrackId
			})
			.from(kelasInstance)
			.where(eq(kelasInstance.id, input.id));

		if (!target) {
			return { success: false, message: 'Kelas tidak ditemukan.' };
		}

		// Check name collision with other class in same TA
		const [nameCheck] = await db
			.select({ id: kelasInstance.id })
			.from(kelasInstance)
			.where(
				and(
					eq(kelasInstance.tahunAjaranId, input.tahunAjaranId),
					eq(kelasInstance.name, nameTrimmed),
					ne(kelasInstance.id, input.id)
				)
			);

		if (nameCheck) {
			return { success: false, message: `Nama kelas '${nameTrimmed}' sudah digunakan pada periode tersebut.` };
		}

		let finalTingkatId = input.tingkatId || target.tingkatId;
		if (!finalTingkatId) {
			const [firstTingkat] = await db.select({ id: tingkat.id }).from(tingkat).limit(1);
			finalTingkatId = firstTingkat?.id || 1;
		}

		let finalTrackId = input.curriculumTrackId || target.curriculumTrackId;
		if (!finalTrackId) {
			const [firstTrack] = await db.select({ id: curriculumTrack.id }).from(curriculumTrack).limit(1);
			finalTrackId = firstTrack?.id || 1;
		}

		await db
			.update(kelasInstance)
			.set({
				tahunAjaranId: input.tahunAjaranId,
				targetAngkatan: input.targetAngkatan || null,
				tingkatId: finalTingkatId,
				curriculumTrackId: finalTrackId,
				name: nameTrimmed,
				isActive: Boolean(input.isActive),
				updatedAt: new Date()
			})
			.where(eq(kelasInstance.id, input.id));

		// Update mentor assignments: replace old assignments
		await db.delete(mentorAssignment).where(eq(mentorAssignment.kelasInstanceId, input.id));

		if (input.mentorIds && input.mentorIds.length > 0) {
			for (const mentorId of input.mentorIds) {
				await db.insert(mentorAssignment).values({
					userId: mentorId,
					kelasInstanceId: input.id,
					assignedAt: new Date()
				});
			}
		}

		return { success: true, message: `Kelas '${nameTrimmed}' berhasil diperbarui.` };
	},

	/**
	 * Deletes a class if no active students exist in it
	 */
	async deleteKelas(id: number): Promise<{ success: boolean; message?: string }> {
		const [target] = await db
			.select({ id: kelasInstance.id, name: kelasInstance.name })
			.from(kelasInstance)
			.where(eq(kelasInstance.id, id));

		if (!target) {
			return { success: false, message: 'Kelas tidak ditemukan.' };
		}

		// Check if active students belong to this class
		const [memberCountRes] = await db
			.select({ total: count(keanggotaan.id) })
			.from(keanggotaan)
			.where(and(eq(keanggotaan.kelasInstanceId, id), eq(keanggotaan.status, 'aktif')));

		const memberCount = Number(memberCountRes?.total ?? 0);

		if (memberCount > 0) {
			return {
				success: false,
				message: `Kelas '${target.name}' tidak dapat dihapus karena masih memiliki ${memberCount} siswa aktif.`
			};
		}

		// Delete mentor assignments first, then class
		await db.delete(mentorAssignment).where(eq(mentorAssignment.kelasInstanceId, id));
		await db.delete(kelasInstance).where(eq(kelasInstance.id, id));

		return { success: true, message: `Kelas '${target.name}' berhasil dihapus.` };
	},

	/**
	 * Fetches all active students in a specific class instance
	 */
	async getStudentsInKelas(kelasInstanceId: number): Promise<Array<{
		id: number;
		fullName: string;
		username: string;
		nisn: string | null;
		membershipId: number;
	}>> {
		const rows = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn,
				membershipId: keanggotaan.id
			})
			.from(keanggotaan)
			.innerJoin(user, eq(keanggotaan.userId, user.id))
			.where(and(eq(keanggotaan.kelasInstanceId, kelasInstanceId), eq(keanggotaan.status, 'aktif')))
			.orderBy(user.fullName);

		return rows;
	},

	/**
	 * Processes bulk grade promotion from source class to target class while preserving historical records
	 */
	async bulkPromoteStudents(input: {
		sourceKelasId: number;
		targetKelasId: number;
		promotions: Array<{ userId: number; action: 'naik' | 'tinggal' | 'keluar' }>;
	}): Promise<{ success: boolean; message?: string }> {
		if (input.sourceKelasId === input.targetKelasId) {
			return { success: false, message: 'Kelas tujuan tidak boleh sama dengan kelas asal.' };
		}

		const [sourceKelas] = await db.select({ name: kelasInstance.name }).from(kelasInstance).where(eq(kelasInstance.id, input.sourceKelasId));
		const [targetKelas] = await db.select({ name: kelasInstance.name }).from(kelasInstance).where(eq(kelasInstance.id, input.targetKelasId));

		if (!sourceKelas || !targetKelas) {
			return { success: false, message: 'Data kelas asal atau kelas tujuan tidak ditemukan.' };
		}

		let promotedCount = 0;
		let repeatedCount = 0;
		let exitedCount = 0;

		for (const item of input.promotions) {
			// 1. Update current membership status in source class
			await db
				.update(keanggotaan)
				.set({
					status: item.action,
					updatedAt: new Date()
				})
				.where(and(eq(keanggotaan.kelasInstanceId, input.sourceKelasId), eq(keanggotaan.userId, item.userId)));

			// 2. If 'naik' or 'tinggal', create new active membership record in target class
			if (item.action === 'naik' || item.action === 'tinggal') {
				// Check if student already has a membership in target class
				const [existingTargetMember] = await db
					.select({ id: keanggotaan.id })
					.from(keanggotaan)
					.where(and(eq(keanggotaan.kelasInstanceId, input.targetKelasId), eq(keanggotaan.userId, item.userId)));

				if (existingTargetMember) {
					await db
						.update(keanggotaan)
						.set({ status: 'aktif', updatedAt: new Date() })
						.where(eq(keanggotaan.id, existingTargetMember.id));
				} else {
					await db.insert(keanggotaan).values({
						userId: item.userId,
						kelasInstanceId: input.targetKelasId,
						status: 'aktif',
						joinedAt: new Date(),
						updatedAt: new Date()
					});
				}

				if (item.action === 'naik') promotedCount++;
				if (item.action === 'tinggal') repeatedCount++;
			} else if (item.action === 'keluar') {
				exitedCount++;
			}
		}

		// Deactivate source class after promotion completes
		await db
			.update(kelasInstance)
			.set({
				isActive: false,
				updatedAt: new Date()
			})
			.where(eq(kelasInstance.id, input.sourceKelasId));

		return {
			success: true,
			message: `Proses kenaikan kelas berhasil! ${promotedCount} siswa naik ke ${targetKelas.name}${repeatedCount > 0 ? `, ${repeatedCount} tinggal` : ''}${exitedCount > 0 ? `, ${exitedCount} lulus/keluar` : ''}. Kelas asal otomatis dinonaktifkan.`
		};
	},

	/**
	 * Returns all classes in sourceTaId with auto-suggested target classes in targetTaId and active student counts
	 */
	async getTaPromotionMatrix(sourceTaId: number, targetTaId?: number): Promise<{
		sourceTaName: string;
		targetTaName: string;
		matrix: Array<{
			sourceKelasId: number;
			sourceKelasName: string;
			sourceTingkatId: number;
			sourceTingkatName: string;
			totalStudents: number;
			suggestedTargetKelasId: number; // 0 = Lulus
		}>;
		targetClassesOptions: Array<{ id: number; name: string; tingkatName: string }>;
	}> {
		const [sourceTa] = await db.select({ name: tahunAjaran.name }).from(tahunAjaran).where(eq(tahunAjaran.id, sourceTaId));
		const [targetTa] = targetTaId ? await db.select({ name: tahunAjaran.name }).from(tahunAjaran).where(eq(tahunAjaran.id, targetTaId)) : [undefined];

		const sourceClasses = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tingkatId: kelasInstance.tingkatId,
				tingkatName: tingkat.name,
				tingkatLevel: tingkat.levelOrder
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.tahunAjaranId, sourceTaId))
			.orderBy(tingkat.levelOrder, kelasInstance.name);

		const targetClasses = (targetTaId && targetTaId !== sourceTaId)
			? await db
					.select({
						id: kelasInstance.id,
						name: kelasInstance.name,
						tingkatId: kelasInstance.tingkatId,
						tingkatName: tingkat.name,
						tingkatLevel: tingkat.levelOrder
					})
					.from(kelasInstance)
					.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
					.where(eq(kelasInstance.tahunAjaranId, targetTaId))
					.orderBy(tingkat.levelOrder, kelasInstance.name)
			: [];

		const matrix = [];
		for (const sc of sourceClasses) {
			const [countRes] = await db
				.select({ total: count(keanggotaan.id) })
				.from(keanggotaan)
				.where(and(eq(keanggotaan.kelasInstanceId, sc.id), eq(keanggotaan.status, 'aktif')));

			const studentCount = Number(countRes?.total ?? 0);

			let suggestedId = 0;
			const isGraduatingLevel = sc.tingkatLevel >= 12 || sc.tingkatName.includes('12') || sc.tingkatName.includes('XII');

			if (!isGraduatingLevel && targetClasses.length > 0) {
				const nextLevel = sc.tingkatLevel + 1;
				const matchingNextClass = targetClasses.find((tc) => tc.tingkatLevel === nextLevel);
				if (matchingNextClass) {
					suggestedId = matchingNextClass.id;
				}
			}

			matrix.push({
				sourceKelasId: sc.id,
				sourceKelasName: sc.name,
				sourceTingkatId: sc.tingkatId,
				sourceTingkatName: sc.tingkatName,
				totalStudents: studentCount,
				suggestedTargetKelasId: suggestedId
			});
		}

		return {
			sourceTaName: sourceTa?.name ?? '',
			targetTaName: targetTa?.name ?? (sourceTa?.name ?? ''),
			matrix,
			targetClassesOptions: targetClasses.map((tc) => ({
				id: tc.id,
				name: tc.name,
				tingkatName: tc.tingkatName
			}))
		};
	},

	/**
	 * Executes holistic Academic Year Grade Promotion across all mapped classes in source TA -> target TA
	 */
	async executeTaBulkPromotion(input: {
		sourceTaId: number;
		targetTaId: number;
		mappings: Array<{
			sourceKelasId: number;
			targetKelasId: number;
			overrides?: Array<{ userId: number; action: 'naik' | 'tinggal' | 'keluar' }>;
		}>;
	}): Promise<{ success: boolean; message?: string }> {
		if (input.sourceTaId === input.targetTaId) {
			return { success: false, message: 'Periode tujuan tidak boleh sama dengan periode asal.' };
		}

		let totalPromoted = 0;
		let totalGraduated = 0;
		let totalRepeated = 0;
		let totalExited = 0;

		for (const mapping of input.mappings) {
			const studentsInSource = await this.getStudentsInKelas(mapping.sourceKelasId);
			if (studentsInSource.length === 0) continue;

			const overrideMap = new Map<number, 'naik' | 'tinggal' | 'keluar'>();
			if (mapping.overrides && mapping.overrides.length > 0) {
				for (const ov of mapping.overrides) {
					overrideMap.set(ov.userId, ov.action);
				}
			}

			for (const st of studentsInSource) {
				const action = overrideMap.get(st.id) ?? 'naik';

				await db
					.update(keanggotaan)
					.set({ status: action, updatedAt: new Date() })
					.where(and(eq(keanggotaan.kelasInstanceId, mapping.sourceKelasId), eq(keanggotaan.userId, st.id)));

				if (action === 'naik') {
					if (mapping.targetKelasId > 0) {
						const [existingTarget] = await db
							.select({ id: keanggotaan.id })
							.from(keanggotaan)
							.where(and(eq(keanggotaan.kelasInstanceId, mapping.targetKelasId), eq(keanggotaan.userId, st.id)));

						if (existingTarget) {
							await db
								.update(keanggotaan)
								.set({ status: 'aktif', updatedAt: new Date() })
								.where(eq(keanggotaan.id, existingTarget.id));
						} else {
							await db.insert(keanggotaan).values({
								userId: st.id,
								kelasInstanceId: mapping.targetKelasId,
								status: 'aktif',
								joinedAt: new Date(),
								updatedAt: new Date()
							});
						}
						totalPromoted++;
					} else {
						totalGraduated++;
					}
				} else if (action === 'tinggal') {
					const repeatKelasId = mapping.targetKelasId > 0 ? mapping.targetKelasId : mapping.sourceKelasId;
					const [existingTarget] = await db
						.select({ id: keanggotaan.id })
						.from(keanggotaan)
						.where(and(eq(keanggotaan.kelasInstanceId, repeatKelasId), eq(keanggotaan.userId, st.id)));

					if (existingTarget) {
						await db
							.update(keanggotaan)
							.set({ status: 'aktif', updatedAt: new Date() })
							.where(eq(keanggotaan.id, existingTarget.id));
					} else {
						await db.insert(keanggotaan).values({
							userId: st.id,
							kelasInstanceId: repeatKelasId,
							status: 'aktif',
							joinedAt: new Date(),
							updatedAt: new Date()
						});
					}
					totalRepeated++;
				} else if (action === 'keluar') {
					totalExited++;
				}
			}

			// Deactivate source class after promotion completes for this class
			await db
				.update(kelasInstance)
				.set({
					isActive: false,
					updatedAt: new Date()
				})
				.where(eq(kelasInstance.id, mapping.sourceKelasId));
		}

		return {
			success: true,
			message: `Kenaikan Kelas Periode berhasil diproses! ${totalPromoted} siswa naik kelas, ${totalGraduated} siswa lulus${totalRepeated > 0 ? `, ${totalRepeated} tinggal` : ''}${totalExited > 0 ? `, ${totalExited} keluar` : ''}. Kelas-kelas lama otomatis dinonaktifkan.`
		};
	},

	/**
	 * Assigns a student to a class instance
	 */
	async addStudentToKelas(kelasInstanceId: number, userId: number): Promise<{ success: boolean; message?: string }> {
		const [targetKelas] = await db.select({ name: kelasInstance.name }).from(kelasInstance).where(eq(kelasInstance.id, kelasInstanceId));
		const [targetUser] = await db.select({ fullName: user.fullName }).from(user).where(eq(user.id, userId));

		if (!targetKelas || !targetUser) {
			return { success: false, message: 'Data kelas atau siswa tidak ditemukan.' };
		}

		const [existing] = await db
			.select({ id: keanggotaan.id, status: keanggotaan.status })
			.from(keanggotaan)
			.where(and(eq(keanggotaan.kelasInstanceId, kelasInstanceId), eq(keanggotaan.userId, userId)));

		if (existing) {
			if (existing.status === 'aktif') {
				return { success: false, message: `Siswa '${targetUser.fullName}' sudah menjadi anggota aktif di kelas '${targetKelas.name}'.` };
			}
			await db
				.update(keanggotaan)
				.set({ status: 'aktif', updatedAt: new Date() })
				.where(eq(keanggotaan.id, existing.id));
		} else {
			await db.insert(keanggotaan).values({
				userId,
				kelasInstanceId,
				status: 'aktif',
				joinedAt: new Date(),
				updatedAt: new Date()
			});
		}

		return { success: true, message: `Siswa '${targetUser.fullName}' berhasil ditambahkan ke kelas '${targetKelas.name}'.` };
	},

	/**
	 * Removes a student from a class instance (sets status = 'keluar')
	 */
	async removeStudentFromKelas(kelasInstanceId: number, userId: number): Promise<{ success: boolean; message?: string }> {
		const [targetUser] = await db.select({ fullName: user.fullName }).from(user).where(eq(user.id, userId));

		await db
			.update(keanggotaan)
			.set({ status: 'keluar', updatedAt: new Date() })
			.where(and(eq(keanggotaan.kelasInstanceId, kelasInstanceId), eq(keanggotaan.userId, userId)));

		return { success: true, message: `Siswa '${targetUser?.fullName ?? ''}' berhasil dikeluarkan dari kelas.` };
	},

	/**
	 * Gets student membership data for the bulk keanggotaan page
	 */
	async getKeanggotaanPageData(): Promise<{
		students: Array<{
			id: number;
			fullName: string;
			username: string;
			nisn: string | null;
			kelasId: number | null;
			kelasName: string | null;
			tahunAjaranName: string | null;
			tingkatName: string | null;
			status: string | null;
			joinedAt: Date | null;
		}>;
		options: {
			tahunAjaranList: Array<{ id: number; name: string; isActive: boolean }>;
			kelasList: Array<{ id: number; name: string; tahunAjaranId: number; tingkatName: string; isActive: boolean }>;
		};
		stats: {
			totalStudents: number;
			assignedCount: number;
			unassignedCount: number;
			activeKelasCount: number;
		};
	}> {
		await this.ensureDefaultMasterData();

		const allStudents = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn
			})
			.from(user)
			.where(eq(user.role, 'siswa'))
			.orderBy(user.fullName);

		const memberships = await db
			.select({
				userId: keanggotaan.userId,
				status: keanggotaan.status,
				joinedAt: keanggotaan.joinedAt,
				kelasId: kelasInstance.id,
				kelasName: kelasInstance.name,
				tahunAjaranName: tahunAjaran.name,
				tingkatName: tingkat.name
			})
			.from(keanggotaan)
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(keanggotaan.status, 'aktif'));

		const membershipMap = new Map<number, typeof memberships[0]>();
		for (const m of memberships) {
			membershipMap.set(m.userId, m);
		}

		const studentRows = allStudents.map((s) => {
			const mem = membershipMap.get(s.id);
			return {
				id: s.id,
				fullName: s.fullName,
				username: s.username,
				nisn: s.nisn,
				kelasId: mem ? mem.kelasId : null,
				kelasName: mem ? mem.kelasName : null,
				tahunAjaranName: mem ? mem.tahunAjaranName : null,
				tingkatName: mem ? mem.tingkatName : null,
				status: mem ? mem.status : 'unassigned',
				joinedAt: mem ? mem.joinedAt : null
			};
		});

		const taList = await db
			.select({ id: tahunAjaran.id, name: tahunAjaran.name, isActive: tahunAjaran.isActive })
			.from(tahunAjaran)
			.orderBy(desc(tahunAjaran.isActive), desc(tahunAjaran.createdAt));

		const kelasList = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				tahunAjaranId: kelasInstance.tahunAjaranId,
				tingkatName: tingkat.name,
				isActive: kelasInstance.isActive
			})
			.from(kelasInstance)
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.orderBy(desc(kelasInstance.isActive), kelasInstance.name);

		const assignedCount = studentRows.filter((s) => s.kelasId !== null).length;
		const unassignedCount = studentRows.length - assignedCount;
		const activeKelasCount = kelasList.filter((k) => k.isActive).length;

		return {
			students: studentRows,
			options: {
				tahunAjaranList: taList,
				kelasList
			},
			stats: {
				totalStudents: studentRows.length,
				assignedCount,
				unassignedCount,
				activeKelasCount
			}
		};
	},

	/**
	 * Bulk assigns students to a target class
	 */
	async bulkAssignStudents(userIds: number[], targetKelasId: number): Promise<{ success: boolean; message?: string }> {
		const [targetKelas] = await db
			.select({ name: kelasInstance.name })
			.from(kelasInstance)
			.where(eq(kelasInstance.id, targetKelasId));

		if (!targetKelas) {
			return { success: false, message: 'Kelas tujuan tidak ditemukan.' };
		}

		let assignedCount = 0;
		for (const uId of userIds) {
			const [existing] = await db
				.select({ id: keanggotaan.id })
				.from(keanggotaan)
				.where(and(eq(keanggotaan.kelasInstanceId, targetKelasId), eq(keanggotaan.userId, uId)));

			if (existing) {
				await db
					.update(keanggotaan)
					.set({ status: 'aktif', updatedAt: new Date() })
					.where(eq(keanggotaan.id, existing.id));
			} else {
				await db.insert(keanggotaan).values({
					userId: uId,
					kelasInstanceId: targetKelasId,
					status: 'aktif',
					joinedAt: new Date(),
					updatedAt: new Date()
				});
			}
			assignedCount++;
		}

		return {
			success: true,
			message: `Berhasil mendaftarkan ${assignedCount} siswa ke kelas '${targetKelas.name}'.`
		};
	},

	/**
	 * Bulk removes students from their active class
	 */
	async bulkRemoveStudents(userIds: number[]): Promise<{ success: boolean; message?: string }> {
		let removedCount = 0;
		for (const uId of userIds) {
			await db
				.update(keanggotaan)
				.set({ status: 'keluar', updatedAt: new Date() })
				.where(and(eq(keanggotaan.userId, uId), eq(keanggotaan.status, 'aktif')));
			removedCount++;
		}

		return {
			success: true,
			message: `Berhasil mengeluarkan ${removedCount} siswa dari kelas.`
		};
	},

	/**
	 * Fetches detailed info for a single class instance including current members & available students
	 */
	async getKelasDetail(kelasId: number): Promise<{
		kelas: {
			id: number;
			name: string;
			isActive: boolean;
			tahunAjaranId: number;
			tahunAjaranName: string;
			isTahunAjaranActive: boolean;
			tingkatName: string;
			curriculumTrackTitle: string;
		} | null;
		members: Array<{
			id: number;
			fullName: string;
			username: string;
			nisn: string | null;
			status: string | null;
			joinedAt: Date | null;
		}>;
		availableStudents: Array<{
			id: number;
			fullName: string;
			username: string;
			nisn: string | null;
			currentKelasName: string | null;
		}>;
	}> {
		const [row] = await db
			.select({
				id: kelasInstance.id,
				name: kelasInstance.name,
				isActive: kelasInstance.isActive,
				tahunAjaranId: tahunAjaran.id,
				tahunAjaranName: tahunAjaran.name,
				isTahunAjaranActive: tahunAjaran.isActive,
				tingkatName: tingkat.name,
				curriculumTrackTitle: curriculumTrack.title
			})
			.from(kelasInstance)
			.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.where(eq(kelasInstance.id, kelasId));

		if (!row) {
			return { kelas: null, members: [], availableStudents: [] };
		}

		const memberCondition = row.isActive
			? and(eq(keanggotaan.kelasInstanceId, kelasId), eq(keanggotaan.status, 'aktif'))
			: eq(keanggotaan.kelasInstanceId, kelasId);

		const members = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn,
				status: keanggotaan.status,
				joinedAt: keanggotaan.joinedAt
			})
			.from(keanggotaan)
			.innerJoin(user, eq(keanggotaan.userId, user.id))
			.where(memberCondition)
			.orderBy(user.fullName);

		const memberUserIds = new Set(members.map((m) => m.id));

		const allStudents = await db
			.select({
				id: user.id,
				fullName: user.fullName,
				username: user.username,
				nisn: user.nisn
			})
			.from(user)
			.where(eq(user.role, 'siswa'))
			.orderBy(user.fullName);

		const activeMemberships = await db
			.select({
				userId: keanggotaan.userId,
				kelasName: kelasInstance.name
			})
			.from(keanggotaan)
			.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
			.where(eq(keanggotaan.status, 'aktif'));

		const assignedUserIds = new Set(activeMemberships.map((am) => am.userId));

		const availableStudents = allStudents
			.filter((s) => !assignedUserIds.has(s.id))
			.map((s) => ({
				id: s.id,
				fullName: s.fullName,
				username: s.username,
				nisn: s.nisn,
				currentKelasName: null
			}));

		return {
			kelas: row,
			members,
			availableStudents
		};
	},

	/**
	 * Master Angkatan CRUD
	 */
	async getAllAngkatan() {
		return db.select().from(masterAngkatan).orderBy(desc(masterAngkatan.year));
	},

	async createAngkatan(year: number, name?: string) {
		const finalName = name && name.trim() ? name.trim() : `Angkatan ${year}`;
		const [created] = await db
			.insert(masterAngkatan)
			.values({ year, name: finalName, isActive: true })
			.returning();
		return created;
	},

	async toggleAngkatan(id: number, isActive: boolean) {
		const [updated] = await db
			.update(masterAngkatan)
			.set({ isActive })
			.where(eq(masterAngkatan.id, id))
			.returning();
		return updated;
	},

	async deleteAngkatan(id: number): Promise<{ success: boolean; message: string }> {
		const [target] = await db.select().from(masterAngkatan).where(eq(masterAngkatan.id, id)).limit(1);
		if (!target) {
			return { success: false, message: 'Angkatan tidak ditemukan.' };
		}

		const [userRef] = await db
			.select({ total: count(user.id) })
			.from(user)
			.where(eq(user.angkatan, target.year));

		const countConnected = Number(userRef?.total ?? 0);
		if (countConnected > 0) {
			return {
				success: false,
				message: `Angkatan '${target.name}' tidak dapat dihapus karena masih terhubung dengan ${countConnected} siswa.`
			};
		}

		await db.delete(masterAngkatan).where(eq(masterAngkatan.id, id));
		return { success: true, message: `Angkatan '${target.name}' berhasil dihapus.` };
	},

	/**
	 * Master Rombel CRUD
	 */
	async getAllRombel() {
		return db.select().from(masterRombel).orderBy(masterRombel.levelOrder, masterRombel.name);
	},

	async createRombel(name: string, levelOrder: number, nextRombelId?: number | null) {
		const [created] = await db
			.insert(masterRombel)
			.values({ name, levelOrder, nextRombelId: nextRombelId || null })
			.returning();
		return created;
	},

	async updateRombel(id: number, name: string, levelOrder: number, nextRombelId?: number | null) {
		const [updated] = await db
			.update(masterRombel)
			.set({ name, levelOrder, nextRombelId: nextRombelId || null })
			.where(eq(masterRombel.id, id))
			.returning();
		return updated;
	},

	async deleteRombel(id: number) {
		await db.delete(masterRombel).where(eq(masterRombel.id, id));
		return { success: true };
	}
};

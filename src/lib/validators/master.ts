import { z } from 'zod';

export const createKelasSchema = z.object({
	tahunAjaranId: z.number().positive('Tahun ajaran harus dipilih.'),
	tingkatId: z.number().positive('Tingkat harus dipilih.'),
	curriculumTrackId: z.number().positive('Track pembelajaran harus dipilih.'),
	name: z
		.string()
		.trim()
		.min(2, 'Nama kelas minimal 2 karakter.')
		.max(50, 'Nama kelas maksimal 50 karakter.'),
	mentorIds: z.array(z.number().positive()).optional().default([]),
	isActive: z.boolean().default(true)
});

export const updateKelasSchema = z.object({
	id: z.number().positive('ID kelas tidak valid.'),
	tahunAjaranId: z.number().positive('Tahun ajaran harus dipilih.'),
	tingkatId: z.number().positive('Tingkat harus dipilih.'),
	curriculumTrackId: z.number().positive('Track pembelajaran harus dipilih.'),
	name: z
		.string()
		.trim()
		.min(2, 'Nama kelas minimal 2 karakter.')
		.max(50, 'Nama kelas maksimal 50 karakter.'),
	mentorIds: z.array(z.number().positive()).optional().default([]),
	isActive: z.boolean().default(true)
});

export const assignStudentSchema = z.object({
	kelasInstanceId: z.number().positive('Kelas tidak valid.'),
	userId: z.number().positive('Siswa harus dipilih.'),
	status: z.enum(['aktif', 'naik', 'tinggal', 'keluar']).default('aktif')
});

export const bulkPromoteSchema = z.object({
	sourceKelasId: z.number().positive('Kelas asal harus dipilih.'),
	targetKelasId: z.number().positive('Kelas tujuan harus dipilih.'),
	promotions: z
		.array(
			z.object({
				userId: z.number().positive('ID siswa tidak valid.'),
				action: z.enum(['naik', 'tinggal', 'keluar'])
			})
		)
		.min(1, 'Minimal 1 siswa harus dipilih untuk kenaikan kelas.')
});

export const taBulkPromoteSchema = z.object({
	sourceTaId: z.number().positive('Tahun ajaran asal harus dipilih.'),
	targetTaId: z.number().positive('Tahun ajaran tujuan harus dipilih.'),
	mappings: z
		.array(
			z.object({
				sourceKelasId: z.number().positive('ID kelas asal tidak valid.'),
				targetKelasId: z.number().min(0, 'ID kelas tujuan tidak valid.'), // 0 = Lulus/Alumni
				overrides: z
					.array(
						z.object({
							userId: z.number().positive(),
							action: z.enum(['naik', 'tinggal', 'keluar'])
						})
					)
					.optional()
					.default([])
			})
		)
		.min(1, 'Minimal 1 pemetaan kelas harus diproses.')
});

export const bulkAssignStudentsSchema = z.object({
	userIds: z.array(z.number().positive()).min(1, 'Pilih minimal 1 siswa.'),
	targetKelasId: z.number().positive('Kelas tujuan harus dipilih.')
});

export const bulkRemoveStudentsSchema = z.object({
	userIds: z.array(z.number().positive()).min(1, 'Pilih minimal 1 siswa.')
});

export type CreateKelasInput = z.infer<typeof createKelasSchema>;
export type UpdateKelasInput = z.infer<typeof updateKelasSchema>;
export type AssignStudentInput = z.infer<typeof assignStudentSchema>;
export type BulkPromoteInput = z.infer<typeof bulkPromoteSchema>;
export type TABulkPromoteInput = z.infer<typeof taBulkPromoteSchema>;
export type BulkAssignStudentsInput = z.infer<typeof bulkAssignStudentsSchema>;
export type BulkRemoveStudentsInput = z.infer<typeof bulkRemoveStudentsSchema>;

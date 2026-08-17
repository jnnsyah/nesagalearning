import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['hadir', 'excused'] as const;
export const ATTENDANCE_METHODS = ['qr', 'manual'] as const;

export const scanAttendanceSchema = z.object({
	token: z.string({ message: 'Token presensi wajib diisi' }).min(1, 'Token presensi tidak boleh kosong')
});

export const manualAttendanceSchema = z.object({
	pertemuanId: z.number({ message: 'ID Pertemuan wajib diisi' }),
	userId: z.number({ message: 'ID Siswa wajib diisi' }),
	status: z.enum(ATTENDANCE_STATUSES, { message: 'Status presensi harus hadir atau excused' }),
	manualReason: z
		.string({ message: 'Alasan manual wajib diisi' })
		.min(3, 'Alasan presensi manual minimal 3 karakter')
});

export const generateTokenSchema = z.object({
	pertemuanId: z.number({ message: 'ID Pertemuan wajib diisi' }),
	expirySeconds: z.number().min(5, 'Durasi minimal 5 detik').max(300, 'Durasi maksimal 300 detik').optional().default(30)
});

export const bulkManualItemSchema = z.object({
	userId: z.number(),
	status: z.enum(['hadir', 'excused', 'belum_hadir']),
	manualReason: z.string().optional()
});

export const bulkManualAttendanceSchema = z.object({
	pertemuanId: z.number({ message: 'ID Pertemuan wajib diisi' }),
	defaultReason: z
		.string({ message: 'Alasan presensi manual wajib diisi' })
		.min(3, 'Alasan presensi manual minimal 3 karakter')
		.default('Presensi manual batch oleh mentor'),
	items: z.array(bulkManualItemSchema).min(1, 'Minimal 1 data siswa untuk disimpan')
});

export type ScanAttendanceInput = z.infer<typeof scanAttendanceSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type GenerateTokenInput = z.infer<typeof generateTokenSchema>;
export type BulkManualAttendanceInput = z.infer<typeof bulkManualAttendanceSchema>;

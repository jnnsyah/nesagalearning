import { z } from 'zod';

export const ACTIVITY_TYPES = [
	'teori',
	'praktik',
	'teori_praktik',
	'games',
	'quiz',
	'santai'
] as const;

export const TASK_SIZES = ['kecil', 'sedang', 'besar'] as const;

export const optionalTaskSchema = z.object({
	title: z.string().min(3, 'Judul task minimal 3 karakter'),
	description: z.string().optional(),
	taskSize: z.enum(TASK_SIZES).default('sedang')
});

export const createPertemuanSchema = z.object({
	kelasInstanceId: z.number({ message: 'Kelas Wajib dipilih' }),
	subPhaseId: z.number({ message: 'SubPhase Wajib dipilih' }),
	title: z.string().min(3, 'Judul pertemuan minimal 3 karakter'),
	activityType: z.enum(ACTIVITY_TYPES, { message: 'Tipe aktivitas wajib dipilih' }),
	sessionDate: z.string().min(1, 'Tanggal pertemuan wajib diisi'),
	startTime: z.string().min(1, 'Jam mulai wajib diisi'),
	endTime: z.string().min(1, 'Jam selesai wajib diisi'),
	location: z.string().optional(),
	materialUrl: z.string().optional().or(z.literal('')).nullable(),
	isWeekend: z.boolean().default(false),
	task: optionalTaskSchema.optional()
});

export const updatePertemuanSchema = createPertemuanSchema.partial().extend({
	id: z.number()
});

export type CreatePertemuanInput = z.infer<typeof createPertemuanSchema>;
export type UpdatePertemuanInput = z.infer<typeof updatePertemuanSchema>;
export type OptionalTaskInput = z.infer<typeof optionalTaskSchema>;

import { z } from 'zod';

export const createTahunAjaranSchema = z.object({
	name: z
		.string()
		.trim()
		.min(3, 'Nama tahun ajaran minimal 3 karakter.')
		.max(50, 'Nama tahun ajaran maksimal 50 karakter.'),
	isActive: z.boolean().default(false),
	startedAt: z.string().optional().or(z.literal('')).nullable(),
	endedAt: z.string().optional().or(z.literal('')).nullable()
});

export const updateTahunAjaranSchema = z.object({
	id: z.number().positive('ID tidak valid.'),
	name: z
		.string()
		.trim()
		.min(3, 'Nama tahun ajaran minimal 3 karakter.')
		.max(50, 'Nama tahun ajaran maksimal 50 karakter.'),
	isActive: z.boolean().default(false),
	startedAt: z.string().optional().or(z.literal('')).nullable(),
	endedAt: z.string().optional().or(z.literal('')).nullable()
});

export type CreateTahunAjaranInput = z.infer<typeof createTahunAjaranSchema>;
export type UpdateTahunAjaranInput = z.infer<typeof updateTahunAjaranSchema>;

import { z } from 'zod';

export const updatePointConfigSchema = z.object({
	configKey: z.string().trim().min(1, 'Kunci konfigurasi tidak boleh kosong.'),
	configValue: z.number().int('Nilai poin harus berupa angka bulat.').min(0, 'Nilai poin minimal 0.'),
	description: z.string().optional().or(z.literal('')).nullable()
});

export const bulkUpdatePointConfigSchema = z.object({
	configs: z
		.array(
			z.object({
				key: z.string().trim().min(1),
				value: z.number().int().min(0)
			})
		)
		.min(1, 'Minimal 1 konfigurasi untuk diperbarui.')
});

export type UpdatePointConfigInput = z.infer<typeof updatePointConfigSchema>;
export type BulkUpdatePointConfigInput = z.infer<typeof bulkUpdatePointConfigSchema>;

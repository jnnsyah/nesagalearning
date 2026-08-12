import { z } from 'zod';

export const createCurriculumTrackSchema = z.object({
	tingkatId: z.number({ message: 'Tingkat ID wajib dipilih' }),
	title: z.string().min(3, 'Judul kurikulum minimal 3 karakter').max(150, 'Judul maksimal 150 karakter'),
	description: z.string().optional()
});

export const updateCurriculumTrackSchema = createCurriculumTrackSchema.extend({
	isPublished: z.boolean().optional()
});

export const createPhaseSchema = z.object({
	curriculumTrackId: z.number(),
	title: z.string().min(3, 'Judul fase minimal 3 karakter').max(150),
	description: z.string().optional()
});

export const updatePhaseSchema = z.object({
	title: z.string().min(3, 'Judul fase minimal 3 karakter').max(150),
	description: z.string().optional()
});

export const reorderSchema = z.object({
	items: z.array(
		z.object({
			id: z.number(),
			sortOrder: z.number().int().min(1)
		})
	)
});

export const createSubPhaseSchema = z.object({
	phaseId: z.number(),
	title: z.string().min(3, 'Judul sub-fase minimal 3 karakter').max(150),
	description: z.string().optional()
});

export const updateSubPhaseSchema = z.object({
	title: z.string().min(3, 'Judul sub-fase minimal 3 karakter').max(150),
	description: z.string().optional()
});

export const createMateriSchema = z.object({
	subPhaseId: z.number(),
	title: z.string().min(3, 'Judul materi minimal 3 karakter').max(150),
	content: z.string().optional()
});

export const updateMateriSchema = z.object({
	title: z.string().min(3, 'Judul materi minimal 3 karakter').max(150),
	content: z.string().optional()
});

export type CreateCurriculumTrackInput = z.infer<typeof createCurriculumTrackSchema>;
export type UpdateCurriculumTrackInput = z.infer<typeof updateCurriculumTrackSchema>;
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CreateSubPhaseInput = z.infer<typeof createSubPhaseSchema>;
export type UpdateSubPhaseInput = z.infer<typeof updateSubPhaseSchema>;
export type CreateMateriInput = z.infer<typeof createMateriSchema>;
export type UpdateMateriInput = z.infer<typeof updateMateriSchema>;

import { z } from 'zod';

export const quizTypeEnum = z.enum(['pre-test', 'post-test']);
export type QuizType = z.infer<typeof quizTypeEnum>;

export const createQuizSchema = z.object({
	subPhaseId: z.coerce.number().int().positive({ message: 'Sub-fase wajib dipilih' }),
	title: z.string().trim().min(3, { message: 'Judul kuis minimal 3 karakter' }).max(200, { message: 'Judul kuis maksimal 200 karakter' }),
	description: z.string().trim().optional().nullable(),
	quizType: quizTypeEnum.default('post-test'),
	passingScore: z.coerce.number().int().min(0).max(100).default(60),
	durationMinutes: z.coerce.number().int().min(1).max(180).optional().nullable()
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial().omit({ subPhaseId: true });
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export const singleQuestionSchema = z.object({
	question: z.string().trim().min(3, { message: 'Teks pertanyaan minimal 3 karakter' }),
	imageUrl: z.string().trim().url({ message: 'URL gambar tidak valid' }).optional().nullable().or(z.literal('')),
	options: z.array(z.string().trim().min(1, { message: 'Opsi jawaban tidak boleh kosong' }))
		.min(2, { message: 'Pilihan jawaban minimal 2 item' })
		.max(6, { message: 'Pilihan jawaban maksimal 6 item' }),
	answer: z.coerce.number().int().min(0, { message: 'Jawaban benar harus berupa indeks non-negatif' }),
	explanation: z.string().trim().optional().nullable()
}).refine(
	(data) => data.answer < data.options.length,
	{
		message: 'Indeks jawaban benar berada di luar rentang pilihan jawaban yang tersedia',
		path: ['answer']
	}
);

export type SingleQuestionInput = z.infer<typeof singleQuestionSchema>;

/**
 * Validates an entire JSON array of imported quiz questions.
 * Returns { success: true, data: [...] } or { success: false, error: string, errorsByItem: Array<{ index: number, message: string }> }
 */
export function validateBulkQuizImport(rawInput: unknown): {
	success: boolean;
	data?: Array<{
		question: string;
		imageUrl: string | null;
		options: string[];
		answer: number;
		explanation?: string | null;
	}>;
	error?: string;
	errorsByItem?: Array<{ index: number; message: string }>;
} {
	if (!Array.isArray(rawInput)) {
		return {
			success: false,
			error: 'Format data harus berupa JSON Array (contoh: [ { "question": "...", "options": [...], "answer": 0 } ])'
		};
	}

	if (rawInput.length === 0) {
		return {
			success: false,
			error: 'Array kuis kosong. Minimal harus ada 1 pertanyaan.'
		};
	}

	if (rawInput.length > 100) {
		return {
			success: false,
			error: 'Maksimal 100 soal per import.'
		};
	}

	const errorsByItem: Array<{ index: number; message: string }> = [];
	const validatedQuestions: Array<{
		question: string;
		imageUrl: string | null;
		options: string[];
		answer: number;
		explanation?: string | null;
	}> = [];

	for (let i = 0; i < rawInput.length; i++) {
		const item = rawInput[i];
		const itemNum = i + 1;

		if (!item || typeof item !== 'object') {
			errorsByItem.push({
				index: i,
				message: `Soal #${itemNum}: Format objek soal tidak valid`
			});
			continue;
		}

		// Normalize fields (e.g. handle null/empty imageUrl)
		const normalizedItem = {
			question: (item as any).question ?? '',
			imageUrl: (item as any).imageUrl || null,
			options: Array.isArray((item as any).options) ? (item as any).options : [],
			answer: (item as any).answer,
			explanation: (item as any).explanation ?? null
		};

		const parseRes = singleQuestionSchema.safeParse(normalizedItem);

		if (!parseRes.success) {
			const issueMessages = parseRes.error.issues.map((iss) => iss.message).join(', ');
			errorsByItem.push({
				index: i,
				message: `Soal #${itemNum}: ${issueMessages}`
			});
		} else {
			validatedQuestions.push({
				question: parseRes.data.question,
				imageUrl: parseRes.data.imageUrl || null,
				options: parseRes.data.options,
				answer: parseRes.data.answer,
				explanation: parseRes.data.explanation || null
			});
		}
	}

	if (errorsByItem.length > 0) {
		const firstErrors = errorsByItem.slice(0, 3).map((e) => e.message).join(' | ');
		const errorSummary = `Terdapat ${errorsByItem.length} soal tidak valid: ${firstErrors}${errorsByItem.length > 3 ? ' ...' : ''}`;
		return {
			success: false,
			error: errorSummary,
			errorsByItem
		};
	}

	return {
		success: true,
		data: validatedQuestions
	};
}

export const submitQuizAttemptSchema = z.object({
	answers: z.array(
		z.object({
			questionId: z.coerce.number().int().positive(),
			selectedAnswer: z.coerce.number().int().min(0).max(10)
		})
	).min(1, { message: 'Jawaban kuis tidak boleh kosong' }),
	durationSeconds: z.coerce.number().int().min(0).optional()
});

export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;

import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { QuizService } from '$lib/server/services/quiz.service';
import { submitQuizAttemptSchema } from '$lib/validators/quiz';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'siswa') {
		throw redirect(302, '/login');
	}

	const quizId = Number(params.quizId);
	if (isNaN(quizId)) {
		throw error(400, 'ID Kuis tidak valid');
	}

	const userId = Number(locals.user.id);
	const examData = await QuizService.getStudentExam(quizId, userId);

	if (!examData) {
		throw error(404, 'Kuis tidak ditemukan');
	}

	return {
		exam: examData
	};
};

export const actions: Actions = {
	submitAttempt: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'siswa') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const quizId = Number(params.quizId);
		const userId = Number(locals.user.id);
		const formData = await request.formData();

		const answersRaw = formData.get('answers')?.toString() || '[]';
		const durationSeconds = Number(formData.get('durationSeconds') || 0);

		let parsedAnswers: unknown;
		try {
			parsedAnswers = JSON.parse(answersRaw);
		} catch {
			return fail(400, { error: 'Format data jawaban tidak valid' });
		}

		const parse = submitQuizAttemptSchema.safeParse({
			answers: parsedAnswers,
			durationSeconds
		});

		if (!parse.success) {
			const firstErr = parse.error.issues[0]?.message || 'Jawaban kuis tidak valid';
			return fail(400, { error: firstErr });
		}

		try {
			const result = await QuizService.submitQuizAttempt(
				quizId,
				userId,
				parse.data.answers,
				parse.data.durationSeconds
			);

			return {
				success: true,
				result
			};
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal mengirimkan jawaban kuis' });
		}
	}
};

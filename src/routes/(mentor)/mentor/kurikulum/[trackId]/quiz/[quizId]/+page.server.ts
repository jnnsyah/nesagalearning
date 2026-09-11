import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { QuizService } from '$lib/server/services/quiz.service';
import {
	updateQuizSchema,
	singleQuestionSchema,
	validateBulkQuizImport
} from '$lib/validators/quiz';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		throw redirect(302, '/login');
	}

	const trackId = Number(params.trackId);
	const quizId = Number(params.quizId);

	if (isNaN(trackId) || isNaN(quizId)) {
		throw error(400, 'Parameter ID tidak valid');
	}

	const quizDetail = await QuizService.getQuizDetail(quizId);
	if (!quizDetail) {
		throw error(404, 'Kuis tidak ditemukan');
	}

	const attempts = await QuizService.getQuizAttemptsList(quizId);

	return {
		trackId,
		quiz: quizDetail,
		attempts
	};
};

export const actions: Actions = {
	updateQuiz: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const quizId = Number(params.quizId);
		const formData = await request.formData();

		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const quizType = formData.get('quizType')?.toString() || 'post-test';
		const passingScore = Number(formData.get('passingScore') || 60);
		const durationRaw = formData.get('durationMinutes')?.toString();
		const durationMinutes = durationRaw && durationRaw.trim() !== '' ? Number(durationRaw) : null;

		const parse = updateQuizSchema.safeParse({
			title,
			description: description || null,
			quizType,
			passingScore,
			durationMinutes
		});

		if (!parse.success) {
			const firstErr = parse.error.issues[0]?.message || 'Input kuis tidak valid';
			return fail(400, { error: firstErr });
		}

		try {
			await QuizService.updateQuiz(quizId, parse.data);
			return { success: true, message: 'Detail kuis berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui kuis' });
		}
	},

	deleteQuiz: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const trackId = Number(params.trackId);
		const quizId = Number(params.quizId);

		try {
			await QuizService.deleteQuiz(quizId);
			throw redirect(303, `/mentor/kurikulum/${trackId}`);
		} catch (err: any) {
			if (err?.status === 303) throw err;
			return fail(500, { error: err?.message || 'Gagal menghapus kuis' });
		}
	},

	addQuestion: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const quizId = Number(params.quizId);
		const formData = await request.formData();

		const question = formData.get('question')?.toString() || '';
		const imageUrl = formData.get('imageUrl')?.toString() || null;
		const optionsRaw = formData.get('options')?.toString() || '[]';
		const answer = Number(formData.get('answer') || 0);
		const explanation = formData.get('explanation')?.toString() || null;

		let options: string[] = [];
		try {
			options = JSON.parse(optionsRaw);
		} catch {
			return fail(400, { error: 'Format pilihan jawaban tidak valid' });
		}

		const parse = singleQuestionSchema.safeParse({
			question,
			imageUrl: imageUrl || null,
			options,
			answer,
			explanation: explanation || null
		});

		if (!parse.success) {
			const firstErr = parse.error.issues[0]?.message || 'Data pertanyaan tidak valid';
			return fail(400, { error: firstErr });
		}

		try {
			await QuizService.addQuestion(quizId, parse.data);
			return { success: true, message: 'Pertanyaan berhasil ditambahkan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menambahkan pertanyaan' });
		}
	},

	updateQuestion: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const formData = await request.formData();
		const questionId = Number(formData.get('questionId'));

		if (isNaN(questionId)) {
			return fail(400, { error: 'ID pertanyaan tidak valid' });
		}

		const question = formData.get('question')?.toString() || '';
		const imageUrl = formData.get('imageUrl')?.toString() || null;
		const optionsRaw = formData.get('options')?.toString() || '[]';
		const answer = Number(formData.get('answer') || 0);
		const explanation = formData.get('explanation')?.toString() || null;

		let options: string[] = [];
		try {
			options = JSON.parse(optionsRaw);
		} catch {
			return fail(400, { error: 'Format pilihan jawaban tidak valid' });
		}

		const parse = singleQuestionSchema.safeParse({
			question,
			imageUrl: imageUrl || null,
			options,
			answer,
			explanation: explanation || null
		});

		if (!parse.success) {
			const firstErr = parse.error.issues[0]?.message || 'Data pertanyaan tidak valid';
			return fail(400, { error: firstErr });
		}

		try {
			await QuizService.updateQuestion(questionId, parse.data);
			return { success: true, message: 'Pertanyaan berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui pertanyaan' });
		}
	},

	deleteQuestion: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const formData = await request.formData();
		const questionId = Number(formData.get('questionId'));

		if (isNaN(questionId)) {
			return fail(400, { error: 'ID pertanyaan tidak valid' });
		}

		try {
			await QuizService.deleteQuestion(questionId);
			return { success: true, message: 'Pertanyaan berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus pertanyaan' });
		}
	},

	bulkImport: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const quizId = Number(params.quizId);
		const formData = await request.formData();
		const jsonString = formData.get('jsonContent')?.toString() || '';
		const replaceExisting = formData.get('replaceExisting') === 'true';

		let rawData: unknown;
		try {
			rawData = JSON.parse(jsonString);
		} catch {
			return fail(400, { error: 'Sintaks JSON tidak valid. Pastikan format JSON benar.' });
		}

		const validation = validateBulkQuizImport(rawData);
		if (!validation.success || !validation.data) {
			return fail(400, { error: validation.error || 'Validasi soal JSON gagal' });
		}

		try {
			const count = await QuizService.bulkImportQuestions(quizId, validation.data, replaceExisting);
			return { success: true, message: `Berhasil mengimpor ${count} soal pertanyaan!` };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal mengimpor soal ke database' });
		}
	}
};

import { fail, redirect, error, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CurriculumService } from '$lib/server/services/curriculum.service';
import {
	createPhaseSchema,
	updatePhaseSchema,
	createSubPhaseSchema,
	updateSubPhaseSchema,
	createMateriSchema,
	updateCurriculumTrackSchema
} from '$lib/validators/curriculum';
import { createQuizSchema } from '$lib/validators/quiz';
import { QuizService } from '$lib/server/services/quiz.service';
import { db } from '$lib/server/db';
import { quiz, quizQuestion } from '$lib/server/db/schema/curriculum';
import { eq, inArray, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		throw redirect(302, '/login');
	}

	const trackId = Number(params.trackId);
	if (isNaN(trackId)) {
		throw error(400, 'ID Track tidak valid');
	}

	const [track, tingkatList] = await Promise.all([
		CurriculumService.getTrackWithDetails(trackId),
		CurriculumService.getTingkatList()
	]);

	if (!track) {
		throw error(404, 'Track Pembelajaran tidak ditemukan');
	}

	// Extract all subphase IDs in this track
	const allSubPhaseIds = (track.phases || []).flatMap((p) => (p.subPhases || []).map((sp) => sp.id));

	let quizMap: Record<number, Array<{ id: number; title: string; quizType: string; passingScore: number; durationMinutes: number | null; questionCount: number }>> = {};

	if (allSubPhaseIds.length > 0) {
		const rawQuizzes = await db
			.select({
				id: quiz.id,
				subPhaseId: quiz.subPhaseId,
				title: quiz.title,
				quizType: quiz.quizType,
				passingScore: quiz.passingScore,
				durationMinutes: quiz.durationMinutes
			})
			.from(quiz)
			.where(inArray(quiz.subPhaseId, allSubPhaseIds));

		const counts = await Promise.all(
			rawQuizzes.map(async (q) => {
				const [qc] = await db
					.select({ count: count(quizQuestion.id) })
					.from(quizQuestion)
					.where(eq(quizQuestion.quizId, q.id));
				return { quizId: q.id, count: Number(qc?.count ?? 0) };
			})
		);

		const countMap = Object.fromEntries(counts.map((c) => [c.quizId, c.count]));

		for (const q of rawQuizzes) {
			if (!quizMap[q.subPhaseId]) quizMap[q.subPhaseId] = [];
			quizMap[q.subPhaseId].push({
				...q,
				questionCount: countMap[q.id] ?? 0
			});
		}
	}

	return {
		track,
		tingkatList,
		quizMap
	};
};

export const actions: Actions = {
	updateTrack: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const trackId = Number(params.trackId);
		const formData = await request.formData();
		const tingkatId = Number(formData.get('tingkatId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const isPublished = formData.get('isPublished') === 'true';

		const parse = updateCurriculumTrackSchema.safeParse({ tingkatId, title, description, isPublished });
		if (!parse.success) return fail(400, { error: 'Input track tidak valid' });

		try {
			await CurriculumService.updateTrack(trackId, parse.data);
			return { success: true, message: 'Track berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal mengupdate track' });
		}
	},

	// --- PHASE ACTIONS ---
	createPhase: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const curriculumTrackId = Number(params.trackId);
		const formData = await request.formData();
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = createPhaseSchema.safeParse({ curriculumTrackId, title, description });
		if (!parse.success) return fail(400, { error: 'Input fase tidak valid' });

		try {
			await CurriculumService.createPhase(parse.data);
			return { success: true, message: 'Fase baru berhasil ditambahkan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat fase' });
		}
	},

	updatePhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = updatePhaseSchema.safeParse({ title, description });
		if (!parse.success) return fail(400, { error: 'Input fase tidak valid' });

		try {
			await CurriculumService.updatePhase(id, parse.data);
			return { success: true, message: 'Fase berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui fase' });
		}
	},

	deletePhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deletePhase(id);
			return { success: true, message: 'Fase berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus fase' });
		}
	},

	// --- SUBPHASE ACTIONS ---
	createSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const phaseId = Number(formData.get('phaseId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = createSubPhaseSchema.safeParse({ phaseId, title, description });
		if (!parse.success) return fail(400, { error: 'Input sub-fase tidak valid' });

		try {
			await CurriculumService.createSubPhase(parse.data);
			return { success: true, message: 'Sub-fase berhasil ditambahkan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat sub-fase' });
		}
	},

	updateSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = updateSubPhaseSchema.safeParse({ title, description });
		if (!parse.success) return fail(400, { error: 'Input sub-fase tidak valid' });

		try {
			await CurriculumService.updateSubPhase(id, parse.data);
			return { success: true, message: 'Sub-fase berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui sub-fase' });
		}
	},

	deleteSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deleteSubPhase(id);
			return { success: true, message: 'Sub-fase berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus sub-fase' });
		}
	},

	// --- MATERI ACTIONS ---
	createMateri: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const subPhaseId = Number(formData.get('subPhaseId'));
		const title = formData.get('title')?.toString() || '';

		const parse = createMateriSchema.safeParse({ subPhaseId, title });
		if (!parse.success) return fail(400, { error: 'Input materi tidak valid' });

		try {
			const m = await CurriculumService.createMateri(parse.data);
			return { success: true, message: 'Materi berhasil dibuat', newMateriId: m.id };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat materi' });
		}
	},

	// --- QUIZ ACTIONS ---
	createQuiz: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const subPhaseId = Number(formData.get('subPhaseId'));
		const title = formData.get('title')?.toString() || '';
		const quizType = (formData.get('quizType')?.toString() || 'post-test') as 'pre-test' | 'post-test';
		const passingScore = Number(formData.get('passingScore') || 60);
		const durationRaw = formData.get('durationMinutes')?.toString();
		const durationMinutes = durationRaw && durationRaw.trim() !== '' ? Number(durationRaw) : null;

		const parse = createQuizSchema.safeParse({
			subPhaseId,
			title,
			quizType,
			passingScore,
			durationMinutes
		});

		if (!parse.success) {
			const msg = parse.error.issues[0]?.message || 'Input kuis tidak valid';
			return fail(400, { error: msg });
		}

		try {
			const created = await QuizService.createQuiz(parse.data);
			return { success: true, message: 'Kuis berhasil dibuat', newQuizId: created.id };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat kuis' });
		}
	},

	deleteMateri: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deleteMateri(id);
			return { success: true, message: 'Materi berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus materi' });
		}
	}
};

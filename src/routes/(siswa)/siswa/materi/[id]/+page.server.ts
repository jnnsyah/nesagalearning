import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { materi, subPhase, phase, curriculumTrack } from '$lib/server/db/schema/curriculum';
import { pertemuan } from '$lib/server/db/schema/session';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const materiId = Number(params.id);
	if (isNaN(materiId)) {
		throw error(400, 'ID Materi tidak valid.');
	}

	// 1. Fetch main materi details with subPhase, phase, and track
	const [materiDetail] = await db
		.select({
			id: materi.id,
			title: materi.title,
			content: materi.content,
			sortOrder: materi.sortOrder,
			subPhaseId: subPhase.id,
			subPhaseTitle: subPhase.title,
			phaseId: phase.id,
			phaseTitle: phase.title,
			trackId: curriculumTrack.id,
			trackTitle: curriculumTrack.title
		})
		.from(materi)
		.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
		.innerJoin(phase, eq(subPhase.phaseId, phase.id))
		.innerJoin(curriculumTrack, eq(phase.curriculumTrackId, curriculumTrack.id))
		.where(eq(materi.id, materiId));

	if (!materiDetail) {
		throw error(404, 'Materi pembelajaran tidak ditemukan.');
	}

	// 2. Fetch associated session slide material if any
	const [sessionSlide] = await db
		.select({
			pertemuanId: pertemuan.id,
			pertemuanTitle: pertemuan.title,
			materialUrl: pertemuan.materialUrl
		})
		.from(pertemuan)
		.where(and(eq(pertemuan.subPhaseId, materiDetail.subPhaseId)))
		.limit(1);

	// 3. Fetch all materi in the same subPhase for navigation
	const siblings = await db
		.select({
			id: materi.id,
			title: materi.title,
			sortOrder: materi.sortOrder
		})
		.from(materi)
		.where(eq(materi.subPhaseId, materiDetail.subPhaseId))
		.orderBy(asc(materi.sortOrder));

	const currentIndex = siblings.findIndex((s) => s.id === materiId);
	const prevMateri = currentIndex > 0 ? siblings[currentIndex - 1] : null;
	const nextMateri = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

	return {
		user: locals.user,
		materi: materiDetail,
		sessionSlide,
		prevMateri,
		nextMateri
	};
};

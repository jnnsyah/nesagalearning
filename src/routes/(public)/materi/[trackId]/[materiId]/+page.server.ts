import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { materi, subPhase, phase, curriculumTrack } from '$lib/server/db/schema/curriculum';
import { tingkat } from '$lib/server/db/schema/academic';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const trackId = Number(params.trackId);
	const materiId = Number(params.materiId);

	if (isNaN(trackId) || isNaN(materiId)) {
		throw error(400, 'Parameter tidak valid');
	}

	// 1. Verify track is published
	const [track] = await db
		.select({
			id: curriculumTrack.id,
			title: curriculumTrack.title,
			description: curriculumTrack.description,
			isPublished: curriculumTrack.isPublished,
			tingkatName: tingkat.name
		})
		.from(curriculumTrack)
		.leftJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
		.where(eq(curriculumTrack.id, trackId))
		.limit(1);

	if (!track || !track.isPublished) {
		throw error(404, 'Track tidak ditemukan atau belum dipublikasikan');
	}

	// 2. Fetch current materi
	const [materiDetail] = await db
		.select({
			id: materi.id,
			title: materi.title,
			content: materi.content,
			attachments: materi.attachments,
			videoRecommendations: materi.videoRecommendations,
			sortOrder: materi.sortOrder,
			subPhaseId: subPhase.id,
			subPhaseTitle: subPhase.title,
			phaseId: phase.id,
			phaseTitle: phase.title
		})
		.from(materi)
		.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
		.innerJoin(phase, eq(subPhase.phaseId, phase.id))
		.where(and(eq(materi.id, materiId), eq(phase.curriculumTrackId, trackId)))
		.limit(1);

	if (!materiDetail) {
		throw error(404, 'Materi tidak ditemukan dalam track ini');
	}

	// 3. Fetch syllabus hierarchy for sidebar
	const phases = await db
		.select()
		.from(phase)
		.where(eq(phase.curriculumTrackId, trackId))
		.orderBy(phase.sortOrder);

	const syllabus = await Promise.all(
		phases.map(async (p) => {
			const subPhases = await db
				.select()
				.from(subPhase)
				.where(eq(subPhase.phaseId, p.id))
				.orderBy(subPhase.sortOrder);

			const subPhasesWithMateri = await Promise.all(
				subPhases.map(async (sp) => {
					const materiList = await db
						.select({
							id: materi.id,
							title: materi.title,
							sortOrder: materi.sortOrder
						})
						.from(materi)
						.where(eq(materi.subPhaseId, sp.id))
						.orderBy(materi.sortOrder);

					return {
						...sp,
						materiList
					};
				})
			);

			return {
				...p,
				subPhases: subPhasesWithMateri
			};
		})
	);

	// 4. Flatten all materi for Prev/Next navigation
	const allMateriList: Array<{ id: number; title: string }> = [];
	for (const p of syllabus) {
		for (const sp of p.subPhases) {
			for (const m of sp.materiList) {
				allMateriList.push(m);
			}
		}
	}

	const currentIndex = allMateriList.findIndex((m) => m.id === materiId);
	const prevMateri = currentIndex > 0 ? allMateriList[currentIndex - 1] : null;
	const nextMateri = currentIndex < allMateriList.length - 1 ? allMateriList[currentIndex + 1] : null;

	return {
		track,
		materi: materiDetail,
		syllabus,
		prevMateri,
		nextMateri
	};
};

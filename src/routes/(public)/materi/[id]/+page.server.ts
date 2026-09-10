import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { curriculumTrack, phase, subPhase, materi } from '$lib/server/db/schema/curriculum';
import { tingkat } from '$lib/server/db/schema/academic';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const trackId = Number(params.id);
	if (isNaN(trackId)) throw error(404, 'Track tidak ditemukan');

	// Load the track
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

	// Load phases
	const phases = await db
		.select()
		.from(phase)
		.where(eq(phase.curriculumTrackId, trackId))
		.orderBy(phase.sortOrder);

	// Load sub-phases and materials per phase in parallel
	const phasesWithContent = await Promise.all(
		phases.map(async (p) => {
			const subs = await db
				.select()
				.from(subPhase)
				.where(eq(subPhase.phaseId, p.id))
				.orderBy(subPhase.sortOrder);

			const subsWithMateris = await Promise.all(
				subs.map(async (sp) => {
					const materis = await db
						.select({
							id: materi.id,
							title: materi.title,
							sortOrder: materi.sortOrder
						})
						.from(materi)
						.where(eq(materi.subPhaseId, sp.id))
						.orderBy(materi.sortOrder);
					return { ...sp, materis };
				})
			);

			return { ...p, subPhases: subsWithMateris };
		})
	);

	return {
		track,
		phases: phasesWithContent
	};
};

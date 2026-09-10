import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { curriculumTrack } from '$lib/server/db/schema/curriculum';
import { tingkat } from '$lib/server/db/schema/academic';
import { phase, subPhase, materi } from '$lib/server/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Fetch all tingkat master records and published tracks in parallel
	const [allTingkats, tracks] = await Promise.all([
		db
			.select({
				id: tingkat.id,
				name: tingkat.name,
				levelOrder: tingkat.levelOrder
			})
			.from(tingkat)
			.orderBy(tingkat.levelOrder),
		db
			.select({
				id: curriculumTrack.id,
				title: curriculumTrack.title,
				description: curriculumTrack.description,
				tingkatId: tingkat.id,
				tingkatName: tingkat.name,
				tingkatOrder: tingkat.levelOrder
			})
			.from(curriculumTrack)
			.leftJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
			.where(eq(curriculumTrack.isPublished, true))
			.orderBy(tingkat.levelOrder, curriculumTrack.id)
	]);

	// Count phases & materi per track in parallel
	const trackIds = tracks.map((t) => t.id);
	const [phaseCounts, materiCounts] = await Promise.all([
		Promise.all(
			trackIds.map((trackId) =>
				db
					.select({ id: phase.id })
					.from(phase)
					.where(eq(phase.curriculumTrackId, trackId))
					.then((rows) => ({ trackId, count: rows.length }))
			)
		),
		Promise.all(
			trackIds.map((trackId) =>
				db
					.select({ id: materi.id })
					.from(materi)
					.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
					.innerJoin(phase, eq(subPhase.phaseId, phase.id))
					.where(eq(phase.curriculumTrackId, trackId))
					.then((rows) => ({ trackId, count: rows.length }))
			)
		)
	]);

	const phaseCountMap = Object.fromEntries(phaseCounts.map((p) => [p.trackId, p.count]));
	const materiCountMap = Object.fromEntries(materiCounts.map((m) => [m.trackId, m.count]));

	// Group by tingkat
	const tingkatGroups: Record<string, { tingkatName: string; tingkatOrder: number; tracks: typeof tracks }> = {};
	for (const track of tracks) {
		const key = track.tingkatName ?? 'Umum';
		if (!tingkatGroups[key]) {
			tingkatGroups[key] = {
				tingkatName: key,
				tingkatOrder: track.tingkatOrder ?? 99,
				tracks: []
			};
		}
		tingkatGroups[key].tracks.push(track);
	}

	const groups = Object.values(tingkatGroups).sort((a, b) => a.tingkatOrder - b.tingkatOrder);

	return {
		tracks,
		allTingkats,
		groups,
		phaseCountMap,
		materiCountMap,
		totalTracks: tracks.length
	};
};

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { curriculumTrack, phase, subPhase, materi, materiCompletion } from '$lib/server/db/schema/curriculum';
import { tingkat, keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { eq, and, asc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = Number(locals.user.id);

	// 1. Fetch student active class and its curriculumTrackId & tingkatId
	const [membership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name,
			tingkatId: kelasInstance.tingkatId,
			curriculumTrackId: kelasInstance.curriculumTrackId
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	// 2. Fetch all published tracks with their tingkat (jenjang kelas)
	const tracks = await db
		.select({
			id: curriculumTrack.id,
			title: curriculumTrack.title,
			description: curriculumTrack.description,
			tingkatId: curriculumTrack.tingkatId,
			tingkatName: tingkat.name,
			levelOrder: tingkat.levelOrder
		})
		.from(curriculumTrack)
		.leftJoin(tingkat, eq(curriculumTrack.tingkatId, tingkat.id))
		.where(eq(curriculumTrack.isPublished, true))
		.orderBy(asc(tingkat.levelOrder), asc(curriculumTrack.id));

	if (tracks.length === 0) {
		return {
			user: locals.user,
			membership,
			tracks: [],
			selectedTrackId: null,
			selectedTrack: null,
			phases: []
		};
	}

	// 3. Fetch completed materi IDs for current student
	const completedRecords = await db
		.select({ materiId: materiCompletion.materiId })
		.from(materiCompletion)
		.where(eq(materiCompletion.userId, userId));
	const completedSet = new Set(completedRecords.map((c) => c.materiId));

	// 4. Fetch all phases, subphases, and materi counts for all published tracks in parallel
	const trackIds = tracks.map((t) => t.id);
	const allPhases = await db
		.select({
			id: phase.id,
			curriculumTrackId: phase.curriculumTrackId,
			title: phase.title,
			description: phase.description,
			sortOrder: phase.sortOrder
		})
		.from(phase)
		.where(inArray(phase.curriculumTrackId, trackIds))
		.orderBy(asc(phase.sortOrder));

	const allPhaseIds = allPhases.map((p) => p.id);
	const allSubPhases = allPhaseIds.length > 0
		? await db
				.select({
					id: subPhase.id,
					phaseId: subPhase.phaseId,
					title: subPhase.title,
					description: subPhase.description,
					sortOrder: subPhase.sortOrder
				})
				.from(subPhase)
				.where(inArray(subPhase.phaseId, allPhaseIds))
				.orderBy(asc(subPhase.sortOrder))
		: [];

	const allSubPhaseIds = allSubPhases.map((sp) => sp.id);
	const allMateri = allSubPhaseIds.length > 0
		? await db
				.select({
					id: materi.id,
					subPhaseId: materi.subPhaseId,
					title: materi.title,
					sortOrder: materi.sortOrder
				})
				.from(materi)
				.where(inArray(materi.subPhaseId, allSubPhaseIds))
				.orderBy(asc(materi.sortOrder))
		: [];

	// Map subPhaseId -> phaseId
	const subPhaseToPhaseMap = new Map<number, number>();
	for (const sp of allSubPhases) {
		subPhaseToPhaseMap.set(sp.id, sp.phaseId);
	}

	// Map phaseId -> trackId
	const phaseToTrackMap = new Map<number, number>();
	for (const p of allPhases) {
		phaseToTrackMap.set(p.id, p.curriculumTrackId);
	}

	// Compute counts per track
	const trackStatsMap = new Map<number, { phaseCount: number; materiCount: number; completedCount: number }>();
	for (const t of tracks) {
		trackStatsMap.set(t.id, { phaseCount: 0, materiCount: 0, completedCount: 0 });
	}

	for (const p of allPhases) {
		const stat = trackStatsMap.get(p.curriculumTrackId);
		if (stat) stat.phaseCount++;
	}

	for (const m of allMateri) {
		const phaseId = subPhaseToPhaseMap.get(m.subPhaseId);
		if (phaseId !== undefined) {
			const trackId = phaseToTrackMap.get(phaseId);
			if (trackId !== undefined) {
				const stat = trackStatsMap.get(trackId);
				if (stat) {
					stat.materiCount++;
					if (completedSet.has(m.id)) {
						stat.completedCount++;
					}
				}
			}
		}
	}

	const tracksWithStats = tracks.map((t) => {
		const stat = trackStatsMap.get(t.id) || { phaseCount: 0, materiCount: 0, completedCount: 0 };
		const completionPercentage = stat.materiCount > 0 ? Math.round((stat.completedCount / stat.materiCount) * 100) : 0;
		return {
			...t,
			phaseCount: stat.phaseCount,
			materiCount: stat.materiCount,
			completedCount: stat.completedCount,
			completionPercentage,
			isMyClassTrack: membership?.curriculumTrackId === t.id,
			isMyTingkat: membership?.tingkatId === t.tingkatId
		};
	});

	// Check if a specific track is requested in query params (e.g. ?track=123)
	const requestedTrackParam = url.searchParams.get('track');
	const selectedTrackId = requestedTrackParam ? Number(requestedTrackParam) : null;
	const selectedTrack = selectedTrackId ? tracksWithStats.find((t) => t.id === selectedTrackId) || null : null;

	// If a track is selected, build its full hierarchy
	let phasesHierarchy: Array<typeof allPhases[0] & {
		subPhases: Array<typeof allSubPhases[0] & {
			materiList: Array<typeof allMateri[0] & { isCompleted: boolean }>
		}>
	}> = [];

	if (selectedTrackId) {
		const trackPhases = allPhases.filter((p) => p.curriculumTrackId === selectedTrackId);
		const trackPhaseIds = new Set(trackPhases.map((p) => p.id));
		const trackSubPhases = allSubPhases.filter((sp) => trackPhaseIds.has(sp.phaseId));
		const trackSubPhaseIds = new Set(trackSubPhases.map((sp) => sp.id));
		const trackMateri = allMateri
			.filter((m) => trackSubPhaseIds.has(m.subPhaseId))
			.map((m) => ({
				...m,
				isCompleted: completedSet.has(m.id)
			}));

		// Group materi by subPhaseId
		const materiMap = new Map<number, typeof trackMateri>();
		for (const m of trackMateri) {
			if (!materiMap.has(m.subPhaseId)) {
				materiMap.set(m.subPhaseId, []);
			}
			materiMap.get(m.subPhaseId)!.push(m);
		}

		// Group subPhase by phaseId
		const subPhaseMap = new Map<number, Array<typeof trackSubPhases[0] & { materiList: typeof trackMateri }>>();
		for (const sp of trackSubPhases) {
			if (!subPhaseMap.has(sp.phaseId)) {
				subPhaseMap.set(sp.phaseId, []);
			}
			subPhaseMap.get(sp.phaseId)!.push({
				...sp,
				materiList: materiMap.get(sp.id) || []
			});
		}

		phasesHierarchy = trackPhases.map((p) => ({
			...p,
			subPhases: subPhaseMap.get(p.id) || []
		}));
	}

	return {
		user: locals.user,
		membership,
		tracks: tracksWithStats,
		selectedTrackId,
		selectedTrack,
		phases: phasesHierarchy
	};
};

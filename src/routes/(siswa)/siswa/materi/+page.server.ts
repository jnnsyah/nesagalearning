import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { curriculumTrack, phase, subPhase, materi } from '$lib/server/db/schema/curriculum';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = Number(locals.user.id);

	// 1. Fetch student active class and its curriculumTrackId
	const [membership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name,
			curriculumTrackId: kelasInstance.curriculumTrackId
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	// 2. Fetch all published tracks
	const tracks = await db
		.select({
			id: curriculumTrack.id,
			title: curriculumTrack.title,
			description: curriculumTrack.description
		})
		.from(curriculumTrack)
		.where(eq(curriculumTrack.isPublished, true))
		.orderBy(curriculumTrack.id);

	const activeTrackId = membership?.curriculumTrackId || tracks[0]?.id || null;

	if (!activeTrackId) {
		return {
			user: locals.user,
			membership,
			tracks,
			phases: []
		};
	}

	// 3. Fetch phases for the active track
	const phaseRecords = await db
		.select({
			id: phase.id,
			title: phase.title,
			description: phase.description,
			sortOrder: phase.sortOrder
		})
		.from(phase)
		.where(eq(phase.curriculumTrackId, activeTrackId))
		.orderBy(asc(phase.sortOrder));

	const phaseIds = phaseRecords.map((p) => p.id);

	if (phaseIds.length === 0) {
		return {
			user: locals.user,
			membership,
			tracks,
			activeTrackId,
			phases: []
		};
	}

	// 4. Fetch subPhases for these phases
	const subPhaseRecords = await db
		.select({
			id: subPhase.id,
			phaseId: subPhase.phaseId,
			title: subPhase.title,
			description: subPhase.description,
			sortOrder: subPhase.sortOrder
		})
		.from(subPhase)
		.orderBy(asc(subPhase.sortOrder));

	const subPhaseIds = subPhaseRecords.map((sp) => sp.id);

	// 5. Fetch materi items for these subPhases
	const materiRecords = subPhaseIds.length > 0
		? await db
				.select({
					id: materi.id,
					subPhaseId: materi.subPhaseId,
					title: materi.title,
					sortOrder: materi.sortOrder
				})
				.from(materi)
				.orderBy(asc(materi.sortOrder))
		: [];

	// Group materi by subPhaseId
	const materiMap = new Map<number, typeof materiRecords>();
	for (const m of materiRecords) {
		if (!materiMap.has(m.subPhaseId)) {
			materiMap.set(m.subPhaseId, []);
		}
		materiMap.get(m.subPhaseId)!.push(m);
	}

	// Group subPhase by phaseId
	const subPhaseMap = new Map<number, Array<typeof subPhaseRecords[0] & { materiList: typeof materiRecords }>>();
	for (const sp of subPhaseRecords) {
		if (!subPhaseMap.has(sp.phaseId)) {
			subPhaseMap.set(sp.phaseId, []);
		}
		subPhaseMap.get(sp.phaseId)!.push({
			...sp,
			materiList: materiMap.get(sp.id) || []
		});
	}

	// Assemble complete hierarchy
	const phasesHierarchy = phaseRecords.map((p) => ({
		...p,
		subPhases: subPhaseMap.get(p.id) || []
	}));

	return {
		user: locals.user,
		membership,
		tracks,
		activeTrackId,
		phases: phasesHierarchy
	};
};

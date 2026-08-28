import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { materi, subPhase, phase, curriculumTrack, materiCompletion } from '$lib/server/db/schema/curriculum';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { pertemuan } from '$lib/server/db/schema/session';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';

let isTableInitialized = false;

async function ensureMateriCompletionTable() {
	if (isTableInitialized) return;
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS materi_completion (
				id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
				materi_id bigint NOT NULL REFERENCES materi(id) ON DELETE CASCADE,
				user_id bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
				completed_at timestamp with time zone NOT NULL DEFAULT now(),
				CONSTRAINT materi_completion_user_materi_unique UNIQUE (user_id, materi_id)
			);
			CREATE INDEX IF NOT EXISTS idx_materi_completion_user ON materi_completion(user_id);
			CREATE INDEX IF NOT EXISTS idx_materi_completion_materi ON materi_completion(materi_id);
		`);
		isTableInitialized = true;
	} catch (e) {
		console.error('Failed to initialize materi_completion table:', e);
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	await ensureMateriCompletionTable();

	const userId = Number(locals.user.id);
	const materiId = Number(params.id);
	if (isNaN(materiId)) {
		throw error(400, 'ID Materi tidak valid.');
	}

	// 0. Fetch student active class membership
	const [membership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name,
			curriculumTrackId: kelasInstance.curriculumTrackId
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	// 1. Fetch main materi details with subPhase, phase, and track
	const [materiDetail] = await db
		.select({
			id: materi.id,
			title: materi.title,
			content: materi.content,
			attachments: materi.attachments,
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

	// [Security] Verify the materi belongs to a published track.
	// A siswa should never be able to access materi from an unpublished/draft track.
	const [trackRecord] = await db
		.select({ isPublished: curriculumTrack.isPublished })
		.from(curriculumTrack)
		.where(eq(curriculumTrack.id, materiDetail.trackId))
		.limit(1);

	if (!trackRecord?.isPublished) {
		throw error(403, 'Materi ini berasal dari Track Pembelajaran yang belum dipublikasikan.');
	}

	// 2. Check if logged-in student has completed reading this materi
	const [completionRecord] = await db
		.select({
			id: materiCompletion.id,
			completedAt: materiCompletion.completedAt
		})
		.from(materiCompletion)
		.where(and(eq(materiCompletion.userId, userId), eq(materiCompletion.materiId, materiId)));

	// 3. Fetch associated session slide material if any
	const [sessionSlide] = await db
		.select({
			pertemuanId: pertemuan.id,
			pertemuanTitle: pertemuan.title,
			materialUrl: pertemuan.materialUrl
		})
		.from(pertemuan)
		.where(eq(pertemuan.subPhaseId, materiDetail.subPhaseId))
		.limit(1);

	// 4. Fetch all phases and sub-phases in this track for the Dicoding-style syllabus sidebar
	const trackPhasesRaw = await db
		.select({
			id: phase.id,
			title: phase.title,
			sortOrder: phase.sortOrder
		})
		.from(phase)
		.where(eq(phase.curriculumTrackId, materiDetail.trackId))
		.orderBy(asc(phase.sortOrder));

	const phaseIds = trackPhasesRaw.map((p) => p.id);

	let trackSubPhasesRaw: Array<{
		id: number;
		phaseId: number;
		title: string;
		sortOrder: number;
	}> = [];

	if (phaseIds.length > 0) {
		trackSubPhasesRaw = await db
			.select({
				id: subPhase.id,
				phaseId: subPhase.phaseId,
				title: subPhase.title,
				sortOrder: subPhase.sortOrder
			})
			.from(subPhase)
			.where(inArray(subPhase.phaseId, phaseIds))
			.orderBy(asc(subPhase.sortOrder));
	}

	const subPhaseIds = trackSubPhasesRaw.map((sp) => sp.id);

	let trackMateriRaw: Array<{
		id: number;
		subPhaseId: number;
		title: string;
		sortOrder: number;
	}> = [];

	if (subPhaseIds.length > 0) {
		trackMateriRaw = await db
			.select({
				id: materi.id,
				subPhaseId: materi.subPhaseId,
				title: materi.title,
				sortOrder: materi.sortOrder
			})
			.from(materi)
			.where(inArray(materi.subPhaseId, subPhaseIds))
			.orderBy(asc(materi.sortOrder));
	}

	// 5. Fetch all completed materi IDs for this user in this track
	const userCompletions = await db
		.select({
			materiId: materiCompletion.materiId
		})
		.from(materiCompletion)
		.where(eq(materiCompletion.userId, userId));

	const completedSet = new Set(userCompletions.map((c) => Number(c.materiId)));

	// Flatten all materi in track order to compute global prev & next across sub-phases
	const allOrderedMateri: Array<{
		id: number;
		subPhaseId: number;
		title: string;
		isCompleted: boolean;
	}> = [];

	const syllabus = trackPhasesRaw.map((p) => {
		const subs = trackSubPhasesRaw
			.filter((sp) => sp.phaseId === p.id)
			.map((sp) => {
				const matList = trackMateriRaw
					.filter((m) => m.subPhaseId === sp.id)
					.map((m) => {
						const isDone = completedSet.has(m.id);
						const item = {
							id: m.id,
							subPhaseId: m.subPhaseId,
							title: m.title,
							isCompleted: isDone
						};
						allOrderedMateri.push(item);
						return item;
					});
				return {
					id: sp.id,
					title: sp.title,
					materiList: matList
				};
			});
		return {
			id: p.id,
			title: p.title,
			subPhases: subs
		};
	});

	const currentIndex = allOrderedMateri.findIndex((m) => m.id === materiId);
	const prevMateri = currentIndex > 0 ? allOrderedMateri[currentIndex - 1] : null;
	const nextMateri =
		currentIndex >= 0 && currentIndex < allOrderedMateri.length - 1
			? allOrderedMateri[currentIndex + 1]
			: null;

	const totalTrackModules = allOrderedMateri.length;
	const completedTrackModules = allOrderedMateri.filter((m) => m.isCompleted).length;
	const trackProgressPercentage =
		totalTrackModules > 0 ? Math.round((completedTrackModules / totalTrackModules) * 100) : 0;

	return {
		user: locals.user,
		membership,
		materi: {
			...materiDetail,
			attachments: (materiDetail.attachments as Array<{ name: string; url: string; size: number }>) || []
		},
		isCompleted: !!completionRecord,
		completedAt: completionRecord?.completedAt || null,
		sessionSlide,
		syllabus,
		trackStats: {
			totalModules: totalTrackModules,
			completedModules: completedTrackModules,
			progressPercentage: trackProgressPercentage
		},
		prevMateri,
		nextMateri
	};
};

export const actions: Actions = {
	toggleCompletion: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		await ensureMateriCompletionTable();

		const userId = Number(locals.user.id);
		const materiId = Number(params.id);
		if (isNaN(materiId)) {
			return fail(400, { message: 'ID Materi tidak valid.' });
		}

		// [Security] Verify the materi exists and belongs to a published track
		// before allowing the completion toggle (prevents marking arbitrary materiIds).
		const [materiRecord] = await db
			.select({ id: materi.id, trackIsPublished: curriculumTrack.isPublished })
			.from(materi)
			.innerJoin(subPhase, eq(materi.subPhaseId, subPhase.id))
			.innerJoin(phase, eq(subPhase.phaseId, phase.id))
			.innerJoin(curriculumTrack, eq(phase.curriculumTrackId, curriculumTrack.id))
			.where(eq(materi.id, materiId))
			.limit(1);

		if (!materiRecord) {
			return fail(404, { message: 'Materi tidak ditemukan.' });
		}

		if (!materiRecord.trackIsPublished) {
			return fail(403, { message: 'Materi ini berasal dari Track Pembelajaran yang belum dipublikasikan.' });
		}

		const [existing] = await db
			.select({ id: materiCompletion.id })
			.from(materiCompletion)
			.where(and(eq(materiCompletion.userId, userId), eq(materiCompletion.materiId, materiId)));

		if (existing) {
			// Delete completion record (Mark as Unread)
			await db
				.delete(materiCompletion)
				.where(and(eq(materiCompletion.userId, userId), eq(materiCompletion.materiId, materiId)));

			return { success: true, isCompleted: false, message: 'Status selesai dibaca dibatalkan.' };
		} else {
			// Insert completion record (Mark as Read - NO POINTS awarded to prevent point farming)
			await db.insert(materiCompletion).values({
				userId,
				materiId
			});

			return { success: true, isCompleted: true, message: 'Materi ditandai selesai dibaca.' };
		}
	}
};

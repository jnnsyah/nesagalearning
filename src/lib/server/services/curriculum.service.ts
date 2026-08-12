import { db } from '$lib/server/db';
import { curriculumTrack, phase, subPhase, materi, tingkat } from '$lib/server/db/schema';
import { eq, asc, max, sql } from 'drizzle-orm';
import type {
	CreateCurriculumTrackInput,
	UpdateCurriculumTrackInput,
	CreatePhaseInput,
	UpdatePhaseInput,
	CreateSubPhaseInput,
	UpdateSubPhaseInput,
	CreateMateriInput,
	UpdateMateriInput
} from '$lib/validators/curriculum';

export class CurriculumService {
	/**
	 * Get all curriculum tracks with associated Tingkat
	 */
	static async getTracks() {
		const tracks = await db.query.curriculumTrack.findMany({
			with: {
				tingkat: true,
				phases: {
					with: {
						subPhases: {
							with: {
								materis: {
									columns: { id: true }
								}
							}
						}
					}
				}
			},
			orderBy: (ct, { asc }) => [asc(ct.tingkatId), asc(ct.title)]
		});

		return tracks.map((t) => {
			const phaseCount = t.phases.length;
			let subPhaseCount = 0;
			let materiCount = 0;

			for (const p of t.phases) {
				subPhaseCount += p.subPhases.length;
				for (const sp of p.subPhases) {
					materiCount += sp.materis.length;
				}
			}

			return {
				id: t.id,
				title: t.title,
				description: t.description,
				isPublished: t.isPublished,
				tingkatId: t.tingkatId,
				tingkatName: t.tingkat?.name || 'Tingkat Unknown',
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
				phaseCount,
				subPhaseCount,
				materiCount
			};
		});
	}

	/**
	 * Get all available Tingkat levels for drop-down selection
	 */
	static async getTingkatList() {
		return db.select().from(tingkat).orderBy(asc(tingkat.levelOrder));
	}

	/**
	 * Get full curriculum track with all phases, sub-phases, and materis nested
	 */
	static async getTrackWithDetails(trackId: number) {
		const track = await db.query.curriculumTrack.findFirst({
			where: eq(curriculumTrack.id, trackId),
			with: {
				phases: {
					orderBy: (phases, { asc }) => [asc(phases.sortOrder)],
					with: {
						subPhases: {
							orderBy: (subPhases, { asc }) => [asc(subPhases.sortOrder)],
							with: {
								materis: {
									orderBy: (materis, { asc }) => [asc(materis.sortOrder)]
								}
							}
						}
					}
				}
			}
		});

		if (!track) return null;

		// Fetch tingkat details
		const tingkatData = await db
			.select()
			.from(tingkat)
			.where(eq(tingkat.id, track.tingkatId))
			.limit(1);

		return {
			...track,
			tingkatName: tingkatData[0]?.name || 'Tingkat Unknown'
		};
	}

	/**
	 * Create a new CurriculumTrack
	 */
	static async createTrack(input: CreateCurriculumTrackInput) {
		const [created] = await db
			.insert(curriculumTrack)
			.values({
				tingkatId: input.tingkatId,
				title: input.title,
				description: input.description || null
			})
			.returning();
		return created;
	}

	/**
	 * Update CurriculumTrack
	 */
	static async updateTrack(id: number, input: UpdateCurriculumTrackInput) {
		const [updated] = await db
			.update(curriculumTrack)
			.set({
				tingkatId: input.tingkatId,
				title: input.title,
				description: input.description || null,
				isPublished: input.isPublished ?? false,
				updatedAt: new Date()
			})
			.where(eq(curriculumTrack.id, id))
			.returning();
		return updated;
	}

	/**
	 * Toggle publish status of CurriculumTrack
	 */
	static async togglePublishTrack(id: number, isPublished: boolean) {
		const [updated] = await db
			.update(curriculumTrack)
			.set({
				isPublished,
				updatedAt: new Date()
			})
			.where(eq(curriculumTrack.id, id))
			.returning();
		return updated;
	}

	/**
	 * Delete CurriculumTrack (cascade deletes phases, sub-phases, materis)
	 */
	static async deleteTrack(id: number) {
		return db.delete(curriculumTrack).where(eq(curriculumTrack.id, id));
	}

	// ==================== PHASE OPERATIONS ====================

	/**
	 * Create a Phase (auto-assigned next sortOrder)
	 */
	static async createPhase(input: CreatePhaseInput) {
		const maxOrderResult = await db
			.select({ maxOrder: max(phase.sortOrder) })
			.from(phase)
			.where(eq(phase.curriculumTrackId, input.curriculumTrackId));

		const nextSortOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

		const [created] = await db
			.insert(phase)
			.values({
				curriculumTrackId: input.curriculumTrackId,
				title: input.title,
				description: input.description || null,
				sortOrder: nextSortOrder
			})
			.returning();

		return created;
	}

	/**
	 * Update Phase
	 */
	static async updatePhase(id: number, input: UpdatePhaseInput) {
		const [updated] = await db
			.update(phase)
			.set({
				title: input.title,
				description: input.description || null,
				updatedAt: new Date()
			})
			.where(eq(phase.id, id))
			.returning();
		return updated;
	}

	/**
	 * Delete Phase & shift remaining phases sortOrder
	 */
	static async deletePhase(id: number) {
		const target = await db.query.phase.findFirst({
			where: eq(phase.id, id)
		});
		if (!target) return;

		await db.delete(phase).where(eq(phase.id, id));

		// Normalize remaining phase sortOrders
		const remainingPhases = await db
			.select({ id: phase.id })
			.from(phase)
			.where(eq(phase.curriculumTrackId, target.curriculumTrackId))
			.orderBy(asc(phase.sortOrder));

		if (remainingPhases.length > 0) {
			await this.reorderPhases(
				target.curriculumTrackId,
				remainingPhases.map((p) => p.id)
			);
		}
	}

	/**
	 * Reorder Phases using two-pass transaction to avoid unique constraint collisions
	 */
	static async reorderPhases(curriculumTrackId: number, orderedIds: number[]) {
		return db.transaction(async (tx) => {
			// Pass 1: set temporary negative sortOrders
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(phase)
					.set({ sortOrder: -(i + 1000) })
					.where(eq(phase.id, orderedIds[i]));
			}
			// Pass 2: set final sortOrders
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(phase)
					.set({ sortOrder: i + 1, updatedAt: new Date() })
					.where(eq(phase.id, orderedIds[i]));
			}
		});
	}

	// ==================== SUB-PHASE OPERATIONS ====================

	/**
	 * Create SubPhase (auto-assigned next sortOrder)
	 */
	static async createSubPhase(input: CreateSubPhaseInput) {
		const maxOrderResult = await db
			.select({ maxOrder: max(subPhase.sortOrder) })
			.from(subPhase)
			.where(eq(subPhase.phaseId, input.phaseId));

		const nextSortOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

		const [created] = await db
			.insert(subPhase)
			.values({
				phaseId: input.phaseId,
				title: input.title,
				description: input.description || null,
				sortOrder: nextSortOrder
			})
			.returning();

		return created;
	}

	/**
	 * Update SubPhase
	 */
	static async updateSubPhase(id: number, input: UpdateSubPhaseInput) {
		const [updated] = await db
			.update(subPhase)
			.set({
				title: input.title,
				description: input.description || null,
				updatedAt: new Date()
			})
			.where(eq(subPhase.id, id))
			.returning();
		return updated;
	}

	/**
	 * Delete SubPhase & shift remaining sortOrders
	 */
	static async deleteSubPhase(id: number) {
		const target = await db.query.subPhase.findFirst({
			where: eq(subPhase.id, id)
		});
		if (!target) return;

		await db.delete(subPhase).where(eq(subPhase.id, id));

		const remaining = await db
			.select({ id: subPhase.id })
			.from(subPhase)
			.where(eq(subPhase.phaseId, target.phaseId))
			.orderBy(asc(subPhase.sortOrder));

		if (remaining.length > 0) {
			await this.reorderSubPhases(
				target.phaseId,
				remaining.map((sp) => sp.id)
			);
		}
	}

	/**
	 * Reorder SubPhases
	 */
	static async reorderSubPhases(phaseId: number, orderedIds: number[]) {
		return db.transaction(async (tx) => {
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(subPhase)
					.set({ sortOrder: -(i + 1000) })
					.where(eq(subPhase.id, orderedIds[i]));
			}
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(subPhase)
					.set({ sortOrder: i + 1, updatedAt: new Date() })
					.where(eq(subPhase.id, orderedIds[i]));
			}
		});
	}

	// ==================== MATERI OPERATIONS ====================

	/**
	 * Create Materi (auto-assigned next sortOrder)
	 */
	static async createMateri(input: CreateMateriInput) {
		const maxOrderResult = await db
			.select({ maxOrder: max(materi.sortOrder) })
			.from(materi)
			.where(eq(materi.subPhaseId, input.subPhaseId));

		const nextSortOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

		const [created] = await db
			.insert(materi)
			.values({
				subPhaseId: input.subPhaseId,
				title: input.title,
				content: input.content || null,
				sortOrder: nextSortOrder
			})
			.returning();

		return created;
	}

	/**
	 * Get single Materi with breadcrumbs (subPhase, phase, track)
	 */
	static async getMateriWithDetails(materiId: number) {
		const m = await db.query.materi.findFirst({
			where: eq(materi.id, materiId),
			with: {
				subPhase: {
					with: {
						phase: {
							with: {
								curriculumTrack: true
							}
						}
					}
				}
			}
		});
		return m;
	}

	/**
	 * Update Materi
	 */
	static async updateMateri(id: number, input: UpdateMateriInput) {
		const [updated] = await db
			.update(materi)
			.set({
				title: input.title,
				content: input.content !== undefined ? input.content : null,
				updatedAt: new Date()
			})
			.where(eq(materi.id, id))
			.returning();
		return updated;
	}

	/**
	 * Delete Materi & reorder remaining
	 */
	static async deleteMateri(id: number) {
		const target = await db.query.materi.findFirst({
			where: eq(materi.id, id)
		});
		if (!target) return;

		await db.delete(materi).where(eq(materi.id, id));

		const remaining = await db
			.select({ id: materi.id })
			.from(materi)
			.where(eq(materi.subPhaseId, target.subPhaseId))
			.orderBy(asc(materi.sortOrder));

		if (remaining.length > 0) {
			await this.reorderMateris(
				target.subPhaseId,
				remaining.map((m) => m.id)
			);
		}
	}

	/**
	 * Reorder Materis
	 */
	static async reorderMateris(subPhaseId: number, orderedIds: number[]) {
		return db.transaction(async (tx) => {
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(materi)
					.set({ sortOrder: -(i + 1000) })
					.where(eq(materi.id, orderedIds[i]));
			}
			for (let i = 0; i < orderedIds.length; i++) {
				await tx
					.update(materi)
					.set({ sortOrder: i + 1, updatedAt: new Date() })
					.where(eq(materi.id, orderedIds[i]));
			}
		});
	}
}

import { db } from '../db';
import { pertemuan, attendanceToken, attendance } from '../db/schema/session';
import { task, submission } from '../db/schema/task';
import { kelasInstance, keanggotaan } from '../db/schema/academic';
import { subPhase, phase, curriculumTrack } from '../db/schema/curriculum';
import { user } from '../db/schema/auth';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { CreatePertemuanInput, UpdatePertemuanInput } from '$lib/validators/pertemuan';

export interface PertemuanWithDetails {
	id: number;
	kelasInstanceId: number;
	subPhaseId: number;
	title: string;
	activityType: string;
	sessionDate: string;
	startTime: string;
	endTime: string;
	location: string | null;
	materialUrl: string | null;
	isWeekend: boolean;
	createdAt: Date;
	updatedAt: Date;
	subPhaseTitle?: string;
	kelasName?: string;
	tasks?: {
		id: number;
		title: string;
		description: string | null;
		taskSize: string;
	}[];
	totalHadir?: number;
}

export class PertemuanService {
	static async getPertemuanListByKelas(kelasInstanceId: number): Promise<PertemuanWithDetails[]> {
		const list = await db
			.select({
				id: pertemuan.id,
				kelasInstanceId: pertemuan.kelasInstanceId,
				subPhaseId: pertemuan.subPhaseId,
				title: pertemuan.title,
				activityType: pertemuan.activityType,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				endTime: pertemuan.endTime,
				location: pertemuan.location,
				materialUrl: pertemuan.materialUrl,
				isWeekend: pertemuan.isWeekend,
				createdAt: pertemuan.createdAt,
				updatedAt: pertemuan.updatedAt,
				subPhaseTitle: subPhase.title,
				kelasName: kelasInstance.name
			})
			.from(pertemuan)
			.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
			.orderBy(desc(pertemuan.sessionDate));

		return list;
	}

	static async getAllPertemuan(): Promise<PertemuanWithDetails[]> {
		const list = await db
			.select({
				id: pertemuan.id,
				kelasInstanceId: pertemuan.kelasInstanceId,
				subPhaseId: pertemuan.subPhaseId,
				title: pertemuan.title,
				activityType: pertemuan.activityType,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				endTime: pertemuan.endTime,
				location: pertemuan.location,
				materialUrl: pertemuan.materialUrl,
				isWeekend: pertemuan.isWeekend,
				createdAt: pertemuan.createdAt,
				updatedAt: pertemuan.updatedAt,
				subPhaseTitle: subPhase.title,
				kelasName: kelasInstance.name
			})
			.from(pertemuan)
			.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.orderBy(desc(pertemuan.sessionDate));

		// Attach attendance counts and tasks for each meeting in parallel
		const [attendanceCounts, allTasks] = await Promise.all([
			db
				.select({
					pertemuanId: attendance.pertemuanId,
					count: sql<number>`count(*)::int`
				})
				.from(attendance)
				.where(eq(attendance.status, 'hadir'))
				.groupBy(attendance.pertemuanId),
			db
				.select({
					id: task.id,
					pertemuanId: task.pertemuanId,
					title: task.title,
					description: task.description,
					taskSize: task.taskSize
				})
				.from(task)
		]);

		const countMap = new Map(attendanceCounts.map((a) => [a.pertemuanId, a.count]));
		const taskMap = new Map<number, { id: number; title: string; description: string | null; taskSize: string }[]>();
		for (const t of allTasks) {
			if (t.pertemuanId) {
				const arr = taskMap.get(t.pertemuanId) || [];
				arr.push({ id: t.id, title: t.title, description: t.description, taskSize: t.taskSize });
				taskMap.set(t.pertemuanId, arr);
			}
		}

		return list.map((m) => ({
			...m,
			totalHadir: countMap.get(m.id) ?? 0,
			tasks: taskMap.get(m.id) || []
		}));
	}

	static async getPertemuanById(id: number): Promise<PertemuanWithDetails | null> {
		const result = await db
			.select({
				id: pertemuan.id,
				kelasInstanceId: pertemuan.kelasInstanceId,
				subPhaseId: pertemuan.subPhaseId,
				title: pertemuan.title,
				activityType: pertemuan.activityType,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				endTime: pertemuan.endTime,
				location: pertemuan.location,
				materialUrl: pertemuan.materialUrl,
				isWeekend: pertemuan.isWeekend,
				createdAt: pertemuan.createdAt,
				updatedAt: pertemuan.updatedAt,
				subPhaseTitle: subPhase.title,
				kelasName: kelasInstance.name
			})
			.from(pertemuan)
			.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
			.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
			.where(eq(pertemuan.id, id))
			.limit(1);

		if (result.length === 0) return null;

		const meeting = result[0];
		const associatedTasks = await db
			.select({
				id: task.id,
				title: task.title,
				description: task.description,
				taskSize: task.taskSize
			})
			.from(task)
			.where(eq(task.pertemuanId, meeting.id));

		return {
			...meeting,
			tasks: associatedTasks
		};
	}

	static async createPertemuan(input: CreatePertemuanInput): Promise<{
		pertemuanId: number;
		taskId?: number;
	}> {
		return await db.transaction(async (tx) => {
			const [newPertemuan] = await tx
				.insert(pertemuan)
				.values({
					kelasInstanceId: input.kelasInstanceId,
					subPhaseId: input.subPhaseId,
					title: input.title,
					activityType: input.activityType,
					sessionDate: input.sessionDate,
					startTime: input.startTime,
					endTime: input.endTime,
					location: input.location || null,
					materialUrl: input.materialUrl || null,
					isWeekend: input.isWeekend
				})
				.returning({ id: pertemuan.id });

			let createdTaskId: number | undefined;

			if (input.task && input.task.title) {
				const [newTask] = await tx
					.insert(task)
					.values({
						pertemuanId: newPertemuan.id,
						title: input.task.title,
						description: input.task.description || null,
						taskSize: input.task.taskSize || 'sedang'
					})
					.returning({ id: task.id });
				createdTaskId = newTask.id;
			}

			return {
				pertemuanId: newPertemuan.id,
				taskId: createdTaskId
			};
		});
	}

	static async updatePertemuan(id: number, input: Partial<CreatePertemuanInput>): Promise<boolean> {
		return await db.transaction(async (tx) => {
			const updateData: Record<string, unknown> = {
				updatedAt: new Date()
			};

			if (input.title !== undefined) updateData.title = input.title;
			if (input.activityType !== undefined) updateData.activityType = input.activityType;
			if (input.sessionDate !== undefined) updateData.sessionDate = input.sessionDate;
			if (input.startTime !== undefined) updateData.startTime = input.startTime;
			if (input.endTime !== undefined) updateData.endTime = input.endTime;
			if (input.location !== undefined) updateData.location = input.location || null;
			if (input.materialUrl !== undefined) updateData.materialUrl = input.materialUrl || null;
			if (input.isWeekend !== undefined) updateData.isWeekend = input.isWeekend;
			if (input.subPhaseId !== undefined) updateData.subPhaseId = input.subPhaseId;

			await tx.update(pertemuan).set(updateData).where(eq(pertemuan.id, id));

			if (input.task && input.task.title) {
				const existingTasks = await tx
					.select({ id: task.id })
					.from(task)
					.where(eq(task.pertemuanId, id))
					.limit(1);

				if (existingTasks.length > 0) {
					await tx
						.update(task)
						.set({
							title: input.task.title,
							description: input.task.description || null,
							taskSize: input.task.taskSize || 'sedang',
							updatedAt: new Date()
						})
						.where(eq(task.id, existingTasks[0].id));
				} else {
					await tx.insert(task).values({
						pertemuanId: id,
						title: input.task.title,
						description: input.task.description || null,
						taskSize: input.task.taskSize || 'sedang'
					});
				}
			}

			return true;
		});
	}

	static async deletePertemuan(id: number): Promise<boolean> {
		await db.delete(pertemuan).where(eq(pertemuan.id, id));
		return true;
	}
}

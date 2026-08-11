import { pgTable, bigint, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { pertemuan } from './session';
import { user } from './auth';

export const task = pgTable(
	'task',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		pertemuanId: bigint('pertemuan_id', { mode: 'number' })
			.notNull()
			.references(() => pertemuan.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		taskSize: text('task_size').notNull().default('sedang'), // 'kecil' | 'sedang' | 'besar'
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_task_pertemuan').on(table.pertemuanId)
	]
);

export const submission = pgTable(
	'submission',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		taskId: bigint('task_id', { mode: 'number' })
			.notNull()
			.references(() => task.id, { onDelete: 'cascade' }),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		link: text('link').notNull(),
		status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'revisi'
		feedback: text('feedback'),
		submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		reviewedBy: bigint('reviewed_by', { mode: 'number' }).references(() => user.id)
	},
	(table) => [
		unique('submission_task_user_unique').on(table.taskId, table.userId),
		index('idx_submission_task').on(table.taskId),
		index('idx_submission_user').on(table.userId),
		index('idx_submission_status').on(table.status)
	]
);

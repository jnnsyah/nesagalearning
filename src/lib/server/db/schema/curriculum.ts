import {
	pgTable,
	bigint,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { tingkat } from './academic';

export const curriculumTrack = pgTable(
	'curriculum_track',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		tingkatId: bigint('tingkat_id', { mode: 'number' })
			.notNull()
			.references(() => tingkat.id),
		title: text('title').notNull(),
		description: text('description'),
		isPublished: boolean('is_published').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_curriculum_track_tingkat').on(table.tingkatId)]
);

export const phase = pgTable(
	'phase',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		curriculumTrackId: bigint('curriculum_track_id', { mode: 'number' })
			.notNull()
			.references(() => curriculumTrack.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		sortOrder: integer('sort_order').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('phase_track_sort_unique').on(table.curriculumTrackId, table.sortOrder),
		index('idx_phase_track').on(table.curriculumTrackId)
	]
);

export const subPhase = pgTable(
	'sub_phase',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		phaseId: bigint('phase_id', { mode: 'number' })
			.notNull()
			.references(() => phase.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		sortOrder: integer('sort_order').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('sub_phase_sort_unique').on(table.phaseId, table.sortOrder),
		index('idx_sub_phase_phase').on(table.phaseId)
	]
);

export const materi = pgTable(
	'materi',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		subPhaseId: bigint('sub_phase_id', { mode: 'number' })
			.notNull()
			.references(() => subPhase.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		content: text('content'),
		sortOrder: integer('sort_order').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('materi_sort_unique').on(table.subPhaseId, table.sortOrder),
		index('idx_materi_sub_phase').on(table.subPhaseId)
	]
);

export const quiz = pgTable(
	'quiz',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		subPhaseId: bigint('sub_phase_id', { mode: 'number' })
			.notNull()
			.references(() => subPhase.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		passingScore: integer('passing_score').notNull().default(60),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_quiz_sub_phase').on(table.subPhaseId)]
);

export const quizQuestion = pgTable(
	'quiz_question',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		quizId: bigint('quiz_id', { mode: 'number' })
			.notNull()
			.references(() => quiz.id, { onDelete: 'cascade' }),
		questionText: text('question_text').notNull(),
		options: jsonb('options').notNull().default([]),
		sortOrder: integer('sort_order').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('quiz_question_sort_unique').on(table.quizId, table.sortOrder),
		index('idx_quiz_question_quiz').on(table.quizId)
	]
);

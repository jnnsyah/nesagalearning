import { relations } from 'drizzle-orm';
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
import { user } from './auth';

export const curriculumTrack = pgTable(
	'curriculum_track',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		tingkatId: bigint('tingkat_id', { mode: 'number' })
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
		attachments: jsonb('attachments')
			.$type<Array<{ name: string; url: string; size: number }>>()
			.default([]),
		videoRecommendations: jsonb('video_recommendations')
			.$type<
				Array<{
					id: string;
					title: string;
					url: string;
					youtubeId: string;
					duration?: string;
					note?: string;
				}>
			>()
			.default([]),
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
		description: text('description'),
		quizType: text('quiz_type').notNull().default('post-test'), // 'pre-test' | 'post-test'
		passingScore: integer('passing_score').notNull().default(60),
		durationMinutes: integer('duration_minutes'), // null = no time limit
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
		imageUrl: text('image_url'),
		options: jsonb('options').$type<string[]>().notNull().default([]),
		correctAnswer: integer('correct_answer').notNull().default(0), // 0-based index matching options
		explanation: text('explanation'),
		sortOrder: integer('sort_order').notNull(),
	},
	(table) => [
		unique('quiz_question_sort_unique').on(table.quizId, table.sortOrder),
		index('idx_quiz_question_quiz').on(table.quizId)
	]
);

export const materiCompletion = pgTable(
	'materi_completion',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		materiId: bigint('materi_id', { mode: 'number' })
			.notNull()
			.references(() => materi.id, { onDelete: 'cascade' }),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('materi_completion_user_materi_unique').on(table.userId, table.materiId),
		index('idx_materi_completion_user').on(table.userId),
		index('idx_materi_completion_materi').on(table.materiId)
	]
);

export const curriculumTrackRelations = relations(curriculumTrack, ({ one, many }) => ({
	tingkat: one(tingkat, {
		fields: [curriculumTrack.tingkatId],
		references: [tingkat.id]
	}),
	phases: many(phase)
}));

export const phaseRelations = relations(phase, ({ one, many }) => ({
	curriculumTrack: one(curriculumTrack, {
		fields: [phase.curriculumTrackId],
		references: [curriculumTrack.id]
	}),
	subPhases: many(subPhase)
}));

export const subPhaseRelations = relations(subPhase, ({ one, many }) => ({
	phase: one(phase, {
		fields: [subPhase.phaseId],
		references: [phase.id]
	}),
	materis: many(materi),
	quizzes: many(quiz)
}));

export const materiRelations = relations(materi, ({ one }) => ({
	subPhase: one(subPhase, {
		fields: [materi.subPhaseId],
		references: [subPhase.id]
	})
}));

export const quizRelations = relations(quiz, ({ one, many }) => ({
	subPhase: one(subPhase, {
		fields: [quiz.subPhaseId],
		references: [subPhase.id]
	}),
	questions: many(quizQuestion)
}));

export const quizQuestionRelations = relations(quizQuestion, ({ one }) => ({
	quiz: one(quiz, {
		fields: [quizQuestion.quizId],
		references: [quiz.id]
	})
}));

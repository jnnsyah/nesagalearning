import {
	pgTable,
	bigint,
	text,
	integer,
	timestamp,
	jsonb,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { kelasInstance, tahunAjaran } from './academic';
import { quiz } from './curriculum';

export const pointLog = pgTable(
	'point_log',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		kelasInstanceId: bigint('kelas_instance_id', { mode: 'number' })
			.notNull()
			.references(() => kelasInstance.id),
		periodeId: bigint('periode_id', { mode: 'number' })
			.references(() => tahunAjaran.id),
		source: text('source').notNull(),
		amount: integer('amount').notNull(),
		referenceId: bigint('reference_id', { mode: 'number' }),
		referenceType: text('reference_type'),
		description: text('description'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_point_log_user_kelas').on(table.userId, table.kelasInstanceId),
		index('idx_point_log_kelas').on(table.kelasInstanceId),
		index('idx_point_log_user_periode').on(table.userId, table.periodeId)
	]
);

export const streakCounter = pgTable(
	'streak_counter',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		kelasInstanceId: bigint('kelas_instance_id', { mode: 'number' })
			.notNull()
			.references(() => kelasInstance.id),
		currentStreak: integer('current_streak').notNull().default(0),
		maxStreak: integer('max_streak').notNull().default(0),
		lastAttendedAt: timestamp('last_attended_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('streak_counter_user_kelas_unique').on(table.userId, table.kelasInstanceId),
		index('idx_streak_user_kelas').on(table.userId, table.kelasInstanceId)
	]
);

export const badgeType = pgTable('badge_type', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull().unique(),
	description: text('description'),
	iconUrl: text('icon_url'),
	criteria: text('criteria'),
	triggerType: text('trigger_type').notNull().default('manual_award'),
	triggerThreshold: integer('trigger_threshold').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const badge = pgTable(
	'badge',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		badgeTypeId: bigint('badge_type_id', { mode: 'number' })
			.notNull()
			.references(() => badgeType.id),
		earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('badge_user_type_unique').on(table.userId, table.badgeTypeId),
		index('idx_badge_user').on(table.userId),
		index('idx_badge_type').on(table.badgeTypeId)
	]
);

export const pointConfig = pgTable('point_config', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	configKey: text('config_key').notNull().unique(),
	configValue: integer('config_value').notNull(),
	description: text('description'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const quizAttempt = pgTable(
	'quiz_attempt',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		quizId: bigint('quiz_id', { mode: 'number' })
			.notNull()
			.references(() => quiz.id, { onDelete: 'cascade' }),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		score: integer('score').notNull(),
		answers: jsonb('answers').notNull().default([]),
		attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_quiz_attempt_quiz').on(table.quizId),
		index('idx_quiz_attempt_user').on(table.userId)
	]
);

import { pgTable, bigint, text, boolean, date, time, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { kelasInstance } from './academic';
import { subPhase } from './curriculum';
import { user } from './auth';

export const pertemuan = pgTable(
	'pertemuan',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		kelasInstanceId: bigint('kelas_instance_id', { mode: 'number' })
			.notNull()
			.references(() => kelasInstance.id),
		subPhaseId: bigint('sub_phase_id', { mode: 'number' })
			.notNull()
			.references(() => subPhase.id),
		title: text('title').notNull(),
		activityType: text('activity_type').notNull(), // 'teori' | 'praktik' | 'teori_praktik' | 'games' | 'quiz' | 'santai'
		sessionDate: date('session_date').notNull(),
		startTime: time('start_time').notNull(),
		endTime: time('end_time').notNull(),
		location: text('location'),
		materialUrl: text('material_url'),
		isWeekend: boolean('is_weekend').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_pertemuan_kelas').on(table.kelasInstanceId),
		index('idx_pertemuan_sub_phase').on(table.subPhaseId),
		index('idx_pertemuan_kelas_date').on(table.kelasInstanceId, table.sessionDate)
	]
);

export const attendanceToken = pgTable(
	'attendance_token',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		pertemuanId: bigint('pertemuan_id', { mode: 'number' })
			.notNull()
			.references(() => pertemuan.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_attendance_token_pertemuan').on(table.pertemuanId)
	]
);

export const attendance = pgTable(
	'attendance',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		pertemuanId: bigint('pertemuan_id', { mode: 'number' })
			.notNull()
			.references(() => pertemuan.id),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		method: text('method').notNull(), // 'qr' | 'manual'
		status: text('status').notNull(), // 'hadir' | 'excused'
		manualReason: text('manual_reason'),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('attendance_pertemuan_user_unique').on(table.pertemuanId, table.userId),
		index('idx_attendance_pertemuan').on(table.pertemuanId),
		index('idx_attendance_user').on(table.userId),
		index('idx_attendance_user_recorded').on(table.userId, table.recordedAt)
	]
);

import {
	pgTable,
	bigint,
	text,
	integer,
	boolean,
	timestamp,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { curriculumTrack } from './curriculum';

export const tahunAjaran = pgTable('tahun_ajaran', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull().unique(),
	isActive: boolean('is_active').notNull().default(false),
	startedAt: timestamp('started_at', { withTimezone: true }),
	endedAt: timestamp('ended_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const tingkat = pgTable('tingkat', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull().unique(),
	levelOrder: integer('level_order').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const kelasInstance = pgTable(
	'kelas_instance',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		tahunAjaranId: bigint('tahun_ajaran_id', { mode: 'number' })
			.notNull()
			.references(() => tahunAjaran.id),
		tingkatId: bigint('tingkat_id', { mode: 'number' })
			.notNull()
			.references(() => tingkat.id),
		curriculumTrackId: bigint('curriculum_track_id', { mode: 'number' })
			.notNull()
			.references(() => curriculumTrack.id),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('kelas_instance_tahun_tingkat_unique').on(table.tahunAjaranId, table.tingkatId),
		index('idx_kelas_instance_tahun').on(table.tahunAjaranId),
		index('idx_kelas_instance_tingkat').on(table.tingkatId),
		index('idx_kelas_instance_track').on(table.curriculumTrackId)
	]
);

export const keanggotaan = pgTable(
	'keanggotaan',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		kelasInstanceId: bigint('kelas_instance_id', { mode: 'number' })
			.notNull()
			.references(() => kelasInstance.id),
		status: text('status').notNull().default('aktif'), // 'aktif' | 'naik' | 'tinggal' | 'keluar'
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('keanggotaan_user_kelas_unique').on(table.userId, table.kelasInstanceId),
		index('idx_keanggotaan_user').on(table.userId),
		index('idx_keanggotaan_kelas').on(table.kelasInstanceId),
		index('idx_keanggotaan_user_status').on(table.userId, table.status)
	]
);

export const mentorAssignment = pgTable(
	'mentor_assignment',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		kelasInstanceId: bigint('kelas_instance_id', { mode: 'number' })
			.notNull()
			.references(() => kelasInstance.id),
		assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('mentor_assignment_user_kelas_unique').on(table.userId, table.kelasInstanceId),
		index('idx_mentor_assignment_user').on(table.userId),
		index('idx_mentor_assignment_kelas').on(table.kelasInstanceId)
	]
);

export const advisorNote = pgTable(
	'advisor_note',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		studentId: bigint('student_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		advisorId: bigint('advisor_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		note: text('note').notNull(),
		category: text('category').notNull().default('intervensi'), // 'intervensi' | 'konseling' | 'catatan_umum'
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_advisor_note_student').on(table.studentId),
		index('idx_advisor_note_advisor').on(table.advisorId)
	]
);

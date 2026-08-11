import { pgTable, bigint, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const auditLog = pgTable(
	'audit_log',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		actorId: bigint('actor_id', { mode: 'number' }).references(() => user.id),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: bigint('entity_id', { mode: 'number' }),
		oldValues: jsonb('old_values'),
		newValues: jsonb('new_values'),
		ipAddress: text('ip_address'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_audit_log_actor').on(table.actorId),
		index('idx_audit_log_entity').on(table.entityType, table.entityId),
		index('idx_audit_log_action').on(table.action)
	]
);

export const room = pgTable('room', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull().unique(),
	description: text('description'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const avatar = pgTable('avatar', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull(),
	imageUrl: text('image_url').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

import { pgTable, bigint, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const notification = pgTable(
	'notification',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id),
		type: text('type').notNull(),
		title: text('title').notNull(),
		message: text('message'),
		isRead: boolean('is_read').notNull().default(false),
		referenceId: bigint('reference_id', { mode: 'number' }),
		referenceType: text('reference_type'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_notification_user').on(table.userId)]
);

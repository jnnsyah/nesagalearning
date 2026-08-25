import { pgTable, bigint, text, boolean, timestamp, index, integer } from 'drizzle-orm/pg-core';

export const user = pgTable(
	'user',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		username: text('username').notNull().unique(),
		nisn: text('nisn').unique(),
		email: text('email').unique(),
		passwordHash: text('password_hash').notNull(),
		fullName: text('full_name').notNull(),
		role: text('role').notNull(), // 'admin' | 'guru' | 'mentor' | 'siswa'
		avatarUrl: text('avatar_url'),
		googleId: text('google_id').unique(),
		isEmailVerified: boolean('is_email_verified').notNull().default(false),
		isActive: boolean('is_active').notNull().default(true),
		angkatan: integer('angkatan'),
		rombelLabel: text('rombel_label'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_user_role').on(table.role),
		index('idx_user_nisn').on(table.nisn),
		index('idx_user_angkatan').on(table.angkatan)
	]
);

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		uaIsMobile: boolean('ua_is_mobile').notNull().default(false),
		rememberMe: boolean('remember_me').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_session_user').on(table.userId)]
);

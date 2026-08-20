import { pgTable, bigint, text, boolean, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
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

export const activityType = pgTable('activity_type', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Tabel konfigurasi email dinamis — bisa dikelola Admin dari dashboard
export const systemEmailConfig = pgTable('system_email_config', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	label: text('label').notNull(), // e.g. "Email Utama Notifikasi"
	senderName: text('sender_name').notNull(), // e.g. "NLC Team"
	senderEmail: text('sender_email').notNull(), // e.g. "noreply@nlc.sch.id"
	provider: text('provider').notNull().default('gmail'), // 'gmail' | 'smtp' | 'disabled'
	smtpHost: text('smtp_host'), // untuk custom SMTP
	smtpPort: text('smtp_port'), // default '587'
	smtpUser: text('smtp_user'), // email/username untuk login SMTP
	smtpPassEncrypted: text('smtp_pass_encrypted'), // app password / SMTP pass (dienkripsi di server)
	isActive: boolean('is_active').notNull().default(false), // hanya 1 yang boleh aktif
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Tabel token untuk alur Forgot & Reset Password
export const passwordResetToken = pgTable(
	'password_reset_token',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(), // random secure token (SHA-256 hashed)
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		usedAt: timestamp('used_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_password_reset_token_user').on(table.userId)]
);

// Tabel kode verifikasi 6 digit (OTP) untuk pendaftaran & verifikasi email
export const emailVerificationCode = pgTable(
	'email_verification_code',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint('user_id', { mode: 'number' })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		code: text('code').notNull(), // 6-digit numeric string (e.g. "849201")
		attempts: integer('attempts').notNull().default(0),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('idx_email_verification_code_user').on(table.userId)]
);

// Tabel log outbox email terkirim
export const emailOutbox = pgTable(
	'email_outbox',
	{
		id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		senderEmail: text('sender_email').notNull(),
		recipientEmail: text('recipient_email').notNull(),
		subject: text('subject').notNull(),
		bodyHtml: text('body_html').notNull(),
		bodyText: text('body_text'),
		status: text('status').notNull().default('sent'), // 'sent' | 'failed'
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('idx_email_outbox_recipient').on(table.recipientEmail),
		index('idx_email_outbox_status').on(table.status)
	]
);


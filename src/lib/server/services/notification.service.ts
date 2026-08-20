import { db } from '../db';
import { notification as notificationTable } from '../db/schema/notification';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export interface SendNotificationParams {
	userId: number;
	type: string;
	title: string;
	message?: string;
	referenceId?: number;
	referenceType?: string;
}

export interface NotificationItem {
	id: number;
	userId: number;
	type: string;
	title: string;
	message: string | null;
	isRead: boolean;
	referenceId: number | null;
	referenceType: string | null;
	createdAt: Date;
}

export const NotificationService = {
	/**
	 * Send a notification to a specific user
	 */
	async sendNotification(params: SendNotificationParams): Promise<NotificationItem> {
		const [created] = await db
			.insert(notificationTable)
			.values({
				userId: params.userId,
				type: params.type,
				title: params.title.trim(),
				message: params.message ? params.message.trim() : null,
				referenceId: params.referenceId ?? null,
				referenceType: params.referenceType ?? null
			})
			.returning();

		return created;
	},

	/**
	 * Fetch recent notifications and unread count for a user
	 */
	async getUserNotifications(userId: number, limit: number = 20): Promise<{ items: NotificationItem[]; unreadCount: number }> {
		const [items, [unreadRes]] = await Promise.all([
			db
				.select()
				.from(notificationTable)
				.where(eq(notificationTable.userId, userId))
				.orderBy(desc(notificationTable.createdAt))
				.limit(limit),
			db
				.select({ count: count() })
				.from(notificationTable)
				.where(and(eq(notificationTable.userId, userId), eq(notificationTable.isRead, false)))
		]);

		return {
			items,
			unreadCount: unreadRes?.count ?? 0
		};
	},

	/**
	 * Mark a single notification as read
	 */
	async markAsRead(id: number, userId: number): Promise<boolean> {
		const [updated] = await db
			.update(notificationTable)
			.set({ isRead: true })
			.where(and(eq(notificationTable.id, id), eq(notificationTable.userId, userId)))
			.returning();

		return Boolean(updated);
	},

	/**
	 * Mark all unread notifications for a user as read
	 */
	async markAllAsRead(userId: number): Promise<number> {
		const updatedRows = await db
			.update(notificationTable)
			.set({ isRead: true })
			.where(and(eq(notificationTable.userId, userId), eq(notificationTable.isRead, false)))
			.returning({ id: notificationTable.id });

		return updatedRows.length;
	}
};

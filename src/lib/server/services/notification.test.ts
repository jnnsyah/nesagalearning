import { describe, it, expect } from 'vitest';
import { NotificationService } from './notification.service';

describe('In-App Notification Service Engine', () => {
	it('should export all required NotificationService methods', () => {
		expect(typeof NotificationService.sendNotification).toBe('function');
		expect(typeof NotificationService.getUserNotifications).toBe('function');
		expect(typeof NotificationService.markAsRead).toBe('function');
		expect(typeof NotificationService.markAllAsRead).toBe('function');
	});
});

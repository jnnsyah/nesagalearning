import { db } from '$lib/server/db';
import { room, avatar, badgeType, activityType } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface RoomItem {
	id: number;
	name: string;
	description: string | null;
	createdAt: Date;
}

export interface AvatarItem {
	id: number;
	name: string;
	imageUrl: string;
	createdAt: Date;
}

export interface BadgeTypeItem {
	id: number;
	name: string;
	description: string | null;
	iconUrl: string | null;
	criteria: string | null;
	createdAt: Date;
}

export interface ActivityTypeItem {
	id: number;
	code: string;
	name: string;
	description: string | null;
	createdAt: Date;
}

export const OperationalMasterAdminService = {
	/**
	 * Fetches operational master data overview including rooms, avatars, badge types, and activity types
	 */
	async getOperationalMasterData() {
		const [rooms, avatars, badges] = await Promise.all([
			db.select().from(room).orderBy(desc(room.createdAt)),
			db.select().from(avatar).orderBy(desc(avatar.createdAt)),
			db.select().from(badgeType).orderBy(desc(badgeType.createdAt))
		]);

		let activities: ActivityTypeItem[] = [];
		try {
			activities = await db.select().from(activityType).orderBy(desc(activityType.createdAt));
			if (activities.length === 0) {
				const defaults = [
					{ code: 'teori', name: 'Teori (Pendalaman Konsep)', description: 'Sesi instruksional & penyampaian modul teori utama.' },
					{ code: 'praktik', name: 'Praktik (Hands-on Lab)', description: 'Praktik langsung pembuatan proyek & latihan coding.' },
					{ code: 'teori_praktik', name: 'Teori & Praktik', description: 'Kombinasi penyampaian konsep dan latihan praktikal.' },
					{ code: 'games', name: 'Games / Challenge', description: 'Tantangan interaktif & permainan edukatif.' },
					{ code: 'quiz', name: 'Quiz / Evaluasi', description: 'Sesi kuis terstruktur & penilaian pemahaman.' },
					{ code: 'santai', name: 'Santai / Networking', description: 'Sesi diskusi santai, keakraban & sharing session.' }
				];
				await db.insert(activityType).values(defaults);
				activities = await db.select().from(activityType).orderBy(desc(activityType.createdAt));
			}
		} catch (e) {
			console.error('[getOperationalMasterData activityType query error]:', e);
		}

		return {
			rooms,
			avatars,
			badges,
			activityTypes: activities,
			stats: {
				totalRooms: rooms.length,
				totalAvatars: avatars.length,
				totalBadges: badges.length,
				totalActivityTypes: activities.length
			}
		};
	},

	// --- ROOM CRUD ---
	async createRoom(data: { name: string; description?: string }): Promise<{ success: boolean; message?: string }> {
		const [existing] = await db.select({ id: room.id }).from(room).where(eq(room.name, data.name.trim()));
		if (existing) {
			return { success: false, message: `Ruangan '${data.name}' sudah terdaftar.` };
		}

		await db.insert(room).values({
			name: data.name.trim(),
			description: data.description?.trim() || null
		});

		return { success: true, message: `Ruangan '${data.name}' berhasil ditambahkan.` };
	},

	async updateRoom(id: number, data: { name: string; description?: string }): Promise<{ success: boolean; message?: string }> {
		await db.update(room).set({
			name: data.name.trim(),
			description: data.description?.trim() || null
		}).where(eq(room.id, id));

		return { success: true, message: `Ruangan '${data.name}' berhasil diperbarui.` };
	},

	async deleteRoom(id: number): Promise<{ success: boolean; message?: string }> {
		await db.delete(room).where(eq(room.id, id));
		return { success: true, message: 'Ruangan berhasil dihapus.' };
	},

	// --- ACTIVITY TYPE CRUD ---
	async createActivityType(data: { code: string; name: string; description?: string }): Promise<{ success: boolean; message?: string }> {
		const formattedCode = data.code.trim().toLowerCase().replace(/\s+/g, '_');
		const [existing] = await db.select({ id: activityType.id }).from(activityType).where(eq(activityType.code, formattedCode));
		if (existing) {
			return { success: false, message: `Kode Aktivitas '${formattedCode}' sudah terdaftar.` };
		}

		await db.insert(activityType).values({
			code: formattedCode,
			name: data.name.trim(),
			description: data.description?.trim() || null
		});

		return { success: true, message: `Tipe Aktivitas '${data.name}' berhasil ditambahkan.` };
	},

	async updateActivityType(id: number, data: { code: string; name: string; description?: string }): Promise<{ success: boolean; message?: string }> {
		const formattedCode = data.code.trim().toLowerCase().replace(/\s+/g, '_');
		await db.update(activityType).set({
			code: formattedCode,
			name: data.name.trim(),
			description: data.description?.trim() || null
		}).where(eq(activityType.id, id));

		return { success: true, message: `Tipe Aktivitas '${data.name}' berhasil diperbarui.` };
	},

	async deleteActivityType(id: number): Promise<{ success: boolean; message?: string }> {
		await db.delete(activityType).where(eq(activityType.id, id));
		return { success: true, message: 'Tipe Aktivitas berhasil dihapus.' };
	},

	// --- AVATAR CRUD ---
	async createAvatar(data: { name: string; imageUrl: string }): Promise<{ success: boolean; message?: string }> {
		await db.insert(avatar).values({
			name: data.name.trim(),
			imageUrl: data.imageUrl.trim()
		});

		return { success: true, message: `Avatar '${data.name}' berhasil ditambahkan.` };
	},

	async deleteAvatar(id: number): Promise<{ success: boolean; message?: string }> {
		await db.delete(avatar).where(eq(avatar.id, id));
		return { success: true, message: 'Avatar berhasil dihapus.' };
	},

	// --- BADGE TYPE CRUD ---
	async createBadgeType(data: { name: string; description?: string; iconUrl?: string; criteria?: string; triggerType?: string; triggerThreshold?: number }): Promise<{ success: boolean; message?: string }> {
		const [existing] = await db.select({ id: badgeType.id }).from(badgeType).where(eq(badgeType.name, data.name.trim()));
		if (existing) {
			return { success: false, message: `Tipe Badge '${data.name}' sudah terdaftar.` };
		}

		await db.insert(badgeType).values({
			name: data.name.trim(),
			description: data.description?.trim() || null,
			iconUrl: data.iconUrl?.trim() || null,
			criteria: data.criteria?.trim() || null,
			triggerType: data.triggerType?.trim() || 'manual_award',
			triggerThreshold: data.triggerThreshold ? Number(data.triggerThreshold) : 0
		});

		return { success: true, message: `Badge '${data.name}' berhasil ditambahkan.` };
	},

	async updateBadgeType(id: number, data: { name: string; description?: string; iconUrl?: string; criteria?: string; triggerType?: string; triggerThreshold?: number }): Promise<{ success: boolean; message?: string }> {
		await db.update(badgeType).set({
			name: data.name.trim(),
			description: data.description?.trim() || null,
			iconUrl: data.iconUrl?.trim() || null,
			criteria: data.criteria?.trim() || null,
			triggerType: data.triggerType?.trim() || 'manual_award',
			triggerThreshold: data.triggerThreshold ? Number(data.triggerThreshold) : 0
		}).where(eq(badgeType.id, id));

		return { success: true, message: `Badge '${data.name}' berhasil diperbarui.` };
	},

	async deleteBadgeType(id: number): Promise<{ success: boolean; message?: string }> {
		await db.delete(badgeType).where(eq(badgeType.id, id));
		return { success: true, message: 'Tipe Badge berhasil dihapus.' };
	}
};

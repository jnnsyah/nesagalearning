import { db } from '../db';
import { pointConfig } from '../db/schema/gamification';
import { eq, inArray, max, desc } from 'drizzle-orm';
import type { UpdatePointConfigInput } from '$lib/validators/point-config';

export interface PointConfigItem {
	id: number;
	configKey: string;
	configValue: number;
	description: string | null;
	category: 'Presensi & Kehadiran' | 'Bonus Milestone Streak' | 'Penilaian Tugas' | 'Lainnya';
	label: string;
	updatedAt: Date;
}

export interface PointConfigSummaryStats {
	totalConfigsCount: number;
	weekdayAttendancePoints: number;
	weekendAttendancePoints: number;
	maxStreakBonus: number;
	maxTaskPoints: number;
	lastUpdatedAt: Date | null;
}

export const DEFAULT_POINT_CONFIGS = [
	{
		key: 'attendance_weekday',
		value: 100,
		desc: 'Poin dasar presensi pada hari kerja (Senin - Jumat)',
		category: 'Presensi & Kehadiran' as const,
		label: 'Presensi Hari Kerja (Weekday)'
	},
	{
		key: 'attendance_weekend',
		value: 150,
		desc: 'Poin dasar presensi pada akhir pekan (Sabtu - Minggu)',
		category: 'Presensi & Kehadiran' as const,
		label: 'Presensi Akhir Pekan (Weekend)'
	},
	{
		key: 'streak_milestone_3',
		value: 50,
		desc: 'Bonus poin pencapaian streak 3 kali pertemuan beruntun',
		category: 'Bonus Milestone Streak' as const,
		label: 'Bonus Streak 3 Pertemuan'
	},
	{
		key: 'streak_milestone_7',
		value: 200,
		desc: 'Bonus poin pencapaian streak 7 kali pertemuan beruntun',
		category: 'Bonus Milestone Streak' as const,
		label: 'Bonus Streak 7 Pertemuan'
	},
	{
		key: 'streak_milestone_14',
		value: 500,
		desc: 'Bonus poin pencapaian streak 14 kali pertemuan beruntun',
		category: 'Bonus Milestone Streak' as const,
		label: 'Bonus Streak 14 Pertemuan'
	},
	{
		key: 'streak_milestone_30',
		value: 1000,
		desc: 'Bonus poin pencapaian streak 30 kali pertemuan beruntun',
		category: 'Bonus Milestone Streak' as const,
		label: 'Bonus Streak 30 Pertemuan'
	},
	{
		key: 'task_kecil',
		value: 50,
		desc: 'Poin untuk tugas ukuran kecil yang telah disetujui mentor',
		category: 'Penilaian Tugas' as const,
		label: 'Tugas Ukuran Kecil (Kecil)'
	},
	{
		key: 'task_sedang',
		value: 100,
		desc: 'Poin untuk tugas ukuran sedang yang telah disetujui mentor',
		category: 'Penilaian Tugas' as const,
		label: 'Tugas Ukuran Sedang (Sedang)'
	},
	{
		key: 'task_besar',
		value: 200,
		desc: 'Poin untuk tugas ukuran besar yang telah disetujui mentor',
		category: 'Penilaian Tugas' as const,
		label: 'Tugas Ukuran Besar (Besar)'
	}
];

export const PointConfigAdminService = {
	/**
	 * Seeds missing default configuration rows into DB if not present
	 */
	async ensureDefaultConfigsExist(): Promise<void> {
		for (const def of DEFAULT_POINT_CONFIGS) {
			const [existing] = await db
				.select({ id: pointConfig.id })
				.from(pointConfig)
				.where(eq(pointConfig.configKey, def.key));

			if (!existing) {
				await db.insert(pointConfig).values({
					configKey: def.key,
					configValue: def.value,
					description: def.desc,
					updatedAt: new Date()
				});
			}
		}
	},

	/**
	 * Fetches all point configuration items grouped by category with summary metrics
	 */
	async getPointConfigs(): Promise<{
		items: PointConfigItem[];
		stats: PointConfigSummaryStats;
	}> {
		await this.ensureDefaultConfigsExist();

		const dbRows = await db
			.select({
				id: pointConfig.id,
				configKey: pointConfig.configKey,
				configValue: pointConfig.configValue,
				description: pointConfig.description,
				updatedAt: pointConfig.updatedAt
			})
			.from(pointConfig)
			.orderBy(desc(pointConfig.updatedAt));

		const items: PointConfigItem[] = [];
		let weekdayPoints = 100;
		let weekendPoints = 150;
		let maxStreakBonus = 1000;
		let maxTaskPoints = 200;
		let latestUpdate: Date | null = null;

		const configMetaMap = new Map(DEFAULT_POINT_CONFIGS.map((d) => [d.key, d]));

		for (const row of dbRows) {
			const meta = configMetaMap.get(row.configKey);
			const category = meta ? meta.category : 'Lainnya';
			const label = meta ? meta.label : row.configKey;

			if (row.configKey === 'attendance_weekday') weekdayPoints = row.configValue;
			if (row.configKey === 'attendance_weekend') weekendPoints = row.configValue;
			if (row.configKey.startsWith('streak_milestone_')) {
				if (row.configValue > maxStreakBonus) maxStreakBonus = row.configValue;
			}
			if (row.configKey.startsWith('task_')) {
				if (row.configValue > maxTaskPoints) maxTaskPoints = row.configValue;
			}

			if (!latestUpdate || new Date(row.updatedAt) > new Date(latestUpdate)) {
				latestUpdate = row.updatedAt;
			}

			items.push({
				id: row.id,
				configKey: row.configKey,
				configValue: row.configValue,
				description: row.description || meta?.desc || null,
				category,
				label,
				updatedAt: row.updatedAt
			});
		}

		return {
			items,
			stats: {
				totalConfigsCount: items.length,
				weekdayAttendancePoints: weekdayPoints,
				weekendAttendancePoints: weekendPoints,
				maxStreakBonus,
				maxTaskPoints,
				lastUpdatedAt: latestUpdate
			}
		};
	},

	/**
	 * Updates a single point configuration entry
	 */
	async updatePointConfig(input: UpdatePointConfigInput): Promise<{ success: boolean; message?: string }> {
		const [existing] = await db
			.select({ id: pointConfig.id })
			.from(pointConfig)
			.where(eq(pointConfig.configKey, input.configKey));

		if (!existing) {
			await db.insert(pointConfig).values({
				configKey: input.configKey,
				configValue: input.configValue,
				description: input.description || null,
				updatedAt: new Date()
			});
		} else {
			await db
				.update(pointConfig)
				.set({
					configValue: input.configValue,
					description: input.description !== undefined ? input.description : undefined,
					updatedAt: new Date()
				})
				.where(eq(pointConfig.configKey, input.configKey));
		}

		return { success: true, message: `Konfigurasi '${input.configKey}' berhasil diperbarui.` };
	},

	/**
	 * Bulk updates multiple point configurations
	 */
	async bulkUpdatePointConfigs(
		configs: Array<{ key: string; value: number }>
	): Promise<{ success: boolean; message?: string }> {
		for (const cfg of configs) {
			await this.updatePointConfig({
				configKey: cfg.key,
				configValue: Number(cfg.value)
			});
		}

		return { success: true, message: `${configs.length} atribut konfigurasi poin berhasil diperbarui.` };
	},

	/**
	 * Resets all configurations to default baseline values
	 */
	async resetToDefaults(): Promise<{ success: boolean; message?: string }> {
		for (const def of DEFAULT_POINT_CONFIGS) {
			await this.updatePointConfig({
				configKey: def.key,
				configValue: def.value,
				description: def.desc
			});
		}

		return { success: true, message: 'Seluruh konfigurasi poin berhasil dikembalikan ke standar awal sistem.' };
	}
};

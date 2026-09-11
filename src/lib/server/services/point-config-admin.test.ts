import { describe, it, expect } from 'vitest';
import { updatePointConfigSchema, bulkUpdatePointConfigSchema } from '../../validators/point-config';
import { DEFAULT_POINT_CONFIGS } from './point-config-admin.service';

describe('Point Config Admin Validation & Logic', () => {
	it('validates correct updatePointConfigSchema input', () => {
		const valid = {
			configKey: 'attendance_weekday',
			configValue: 120,
			description: 'Poin weekday khusus promo'
		};

		const result = updatePointConfigSchema.safeParse(valid);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.configValue).toBe(120);
		}
	});

	it('rejects negative point values in updatePointConfigSchema', () => {
		const invalid = {
			configKey: 'task_kecil',
			configValue: -50
		};

		const result = updatePointConfigSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it('validates bulkUpdatePointConfigSchema input', () => {
		const bulkValid = {
			configs: [
				{ key: 'attendance_weekday', value: 100 },
				{ key: 'attendance_weekend', value: 200 }
			]
		};

		const result = bulkUpdatePointConfigSchema.safeParse(bulkValid);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.configs.length).toBe(2);
		}
	});

	it('ensures all 9 default point configuration items are defined', () => {
		expect(DEFAULT_POINT_CONFIGS.length).toBe(9);
		const keys = DEFAULT_POINT_CONFIGS.map((d) => d.key);
		expect(keys.includes('attendance_weekday')).toBe(true);
		expect(keys.includes('attendance_weekend')).toBe(true);
		expect(keys.includes('streak_milestone_30')).toBe(true);
		expect(keys.includes('task_besar')).toBe(true);
	});
});

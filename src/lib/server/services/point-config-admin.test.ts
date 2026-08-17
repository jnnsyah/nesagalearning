import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.configValue, 120);
		}
	});

	it('rejects negative point values in updatePointConfigSchema', () => {
		const invalid = {
			configKey: 'task_kecil',
			configValue: -50
		};

		const result = updatePointConfigSchema.safeParse(invalid);
		assert.equal(result.success, false);
	});

	it('validates bulkUpdatePointConfigSchema input', () => {
		const bulkValid = {
			configs: [
				{ key: 'attendance_weekday', value: 100 },
				{ key: 'attendance_weekend', value: 200 }
			]
		};

		const result = bulkUpdatePointConfigSchema.safeParse(bulkValid);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.configs.length, 2);
		}
	});

	it('ensures all 9 default point configuration items are defined', () => {
		assert.equal(DEFAULT_POINT_CONFIGS.length, 9);
		const keys = DEFAULT_POINT_CONFIGS.map((d) => d.key);
		assert.ok(keys.includes('attendance_weekday'));
		assert.ok(keys.includes('attendance_weekend'));
		assert.ok(keys.includes('streak_milestone_30'));
		assert.ok(keys.includes('task_besar'));
	});
});

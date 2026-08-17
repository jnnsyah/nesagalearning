import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTahunAjaranSchema, updateTahunAjaranSchema } from '../../validators/academic';

describe('Academic Admin Validation & Schema Logic', () => {
	it('validates correct createTahunAjaranSchema input', () => {
		const input = {
			name: '2026/2027',
			isActive: true,
			startedAt: '2026-07-15',
			endedAt: '2027-06-20'
		};

		const result = createTahunAjaranSchema.safeParse(input);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.name, '2026/2027');
			assert.equal(result.data.isActive, true);
		}
	});

	it('rejects short or empty academic year name', () => {
		const invalidInput = {
			name: '  ',
			isActive: false
		};

		const result = createTahunAjaranSchema.safeParse(invalidInput);
		assert.equal(result.success, false);
	});

	it('validates updateTahunAjaranSchema with valid ID', () => {
		const updateInput = {
			id: 1,
			name: '2027/2028',
			isActive: false,
			startedAt: '',
			endedAt: ''
		};

		const result = updateTahunAjaranSchema.safeParse(updateInput);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.id, 1);
			assert.equal(result.data.name, '2027/2028');
		}
	});

	it('rejects invalid or non-positive ID in updateTahunAjaranSchema', () => {
		const invalidUpdate = {
			id: 0,
			name: '2027/2028',
			isActive: false
		};

		const result = updateTahunAjaranSchema.safeParse(invalidUpdate);
		assert.equal(result.success, false);
	});
});

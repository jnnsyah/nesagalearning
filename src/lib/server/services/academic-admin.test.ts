import { describe, it, expect } from 'vitest';
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
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('2026/2027');
			expect(result.data.isActive).toBe(true);
		}
	});

	it('rejects short or empty academic year name', () => {
		const invalidInput = {
			name: '  ',
			isActive: false
		};

		const result = createTahunAjaranSchema.safeParse(invalidInput);
		expect(result.success).toBe(false);
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
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(1);
			expect(result.data.name).toBe('2027/2028');
		}
	});

	it('rejects invalid or non-positive ID in updateTahunAjaranSchema', () => {
		const invalidUpdate = {
			id: 0,
			name: '2027/2028',
			isActive: false
		};

		const result = updateTahunAjaranSchema.safeParse(invalidUpdate);
		expect(result.success).toBe(false);
	});
});

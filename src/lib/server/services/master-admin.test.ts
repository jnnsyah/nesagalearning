import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createKelasSchema, updateKelasSchema, assignStudentSchema, bulkPromoteSchema, taBulkPromoteSchema } from '../../validators/master';

describe('Master Admin & Class Validation Logic', () => {
	it('validates correct createKelasSchema input', () => {
		const valid = {
			tahunAjaranId: 1,
			tingkatId: 2,
			curriculumTrackId: 3,
			name: 'X TKJ 1',
			mentorIds: [10, 12],
			isActive: true
		};

		const result = createKelasSchema.safeParse(valid);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.name, 'X TKJ 1');
			assert.equal(result.data.mentorIds.length, 2);
		}
	});

	it('rejects short class name or missing IDs', () => {
		const invalid = {
			tahunAjaranId: 0,
			tingkatId: 1,
			curriculumTrackId: 1,
			name: 'A'
		};

		const result = createKelasSchema.safeParse(invalid);
		assert.equal(result.success, false);
	});

	it('validates updateKelasSchema with valid ID', () => {
		const updateValid = {
			id: 5,
			tahunAjaranId: 1,
			tingkatId: 1,
			curriculumTrackId: 1,
			name: 'XI RPL 2',
			mentorIds: [],
			isActive: true
		};

		const result = updateKelasSchema.safeParse(updateValid);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.id, 5);
			assert.equal(result.data.name, 'XI RPL 2');
		}
	});

	it('validates assignStudentSchema with valid status', () => {
		const assignValid = {
			kelasInstanceId: 5,
			userId: 101,
			status: 'aktif'
		};

		const result = assignStudentSchema.safeParse(assignValid);
		assert.equal(result.success, true);
	});

	it('validates bulkPromoteSchema input with multiple student promotions', () => {
		const bulkValid = {
			sourceKelasId: 1,
			targetKelasId: 2,
			promotions: [
				{ userId: 10, action: 'naik' as const },
				{ userId: 11, action: 'tinggal' as const },
				{ userId: 12, action: 'keluar' as const }
			]
		};

		const result = bulkPromoteSchema.safeParse(bulkValid);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.promotions.length, 3);
		}
	});

	it('validates taBulkPromoteSchema input with class matrix mappings', () => {
		const taBulkValid = {
			sourceTaId: 1,
			targetTaId: 2,
			mappings: [
				{
					sourceKelasId: 10,
					targetKelasId: 20,
					overrides: [{ userId: 101, action: 'tinggal' as const }]
				},
				{
					sourceKelasId: 11,
					targetKelasId: 0
				}
			]
		};

		const result = taBulkPromoteSchema.safeParse(taBulkValid);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.mappings.length, 2);
			assert.equal(result.data.mappings[1].targetKelasId, 0);
		}
	});
});

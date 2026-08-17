import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanAttendanceSchema, manualAttendanceSchema, generateTokenSchema } from './attendance';

describe('scanAttendanceSchema', () => {
	it('validates a non-empty QR token string', () => {
		const result = scanAttendanceSchema.safeParse({ token: 'abc-123-xyz' });
		assert.equal(result.success, true);
	});

	it('rejects empty QR token', () => {
		const result = scanAttendanceSchema.safeParse({ token: '' });
		assert.equal(result.success, false);
	});
});

describe('manualAttendanceSchema', () => {
	it('validates correct manual attendance entry', () => {
		const result = manualAttendanceSchema.safeParse({
			pertemuanId: 1,
			userId: 5,
			status: 'hadir',
			manualReason: 'HP siswa mati/rusak saat di kelas'
		});
		assert.equal(result.success, true);
	});

	it('validates excused status with reason', () => {
		const result = manualAttendanceSchema.safeParse({
			pertemuanId: 1,
			userId: 5,
			status: 'excused',
			manualReason: 'Izin lomba LKS SMK tingkat kota'
		});
		assert.equal(result.success, true);
	});

	it('rejects manual entry without reason', () => {
		const result = manualAttendanceSchema.safeParse({
			pertemuanId: 1,
			userId: 5,
			status: 'hadir',
			manualReason: ''
		});
		assert.equal(result.success, false);
	});
});

describe('generateTokenSchema', () => {
	it('defaults expirySeconds to 30 if omitted', () => {
		const result = generateTokenSchema.safeParse({ pertemuanId: 42 });
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.expirySeconds, 30);
		}
	});

	it('rejects invalid expirySeconds (> 300)', () => {
		const result = generateTokenSchema.safeParse({ pertemuanId: 42, expirySeconds: 999 });
		assert.equal(result.success, false);
	});
});

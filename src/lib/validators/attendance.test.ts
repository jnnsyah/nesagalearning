import { describe, it, expect } from 'vitest';
import { scanAttendanceSchema, manualAttendanceSchema, generateTokenSchema } from './attendance';

describe('scanAttendanceSchema', () => {
	it('validates a non-empty QR token string', () => {
		const result = scanAttendanceSchema.safeParse({ token: 'abc-123-xyz' });
		expect(result.success).toBe(true);
	});

	it('rejects empty QR token', () => {
		const result = scanAttendanceSchema.safeParse({ token: '' });
		expect(result.success).toBe(false);
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
		expect(result.success).toBe(true);
	});

	it('validates excused status with reason', () => {
		const result = manualAttendanceSchema.safeParse({
			pertemuanId: 1,
			userId: 5,
			status: 'excused',
			manualReason: 'Izin lomba LKS SMK tingkat kota'
		});
		expect(result.success).toBe(true);
	});

	it('rejects manual entry without reason', () => {
		const result = manualAttendanceSchema.safeParse({
			pertemuanId: 1,
			userId: 5,
			status: 'hadir',
			manualReason: ''
		});
		expect(result.success).toBe(false);
	});
});

describe('generateTokenSchema', () => {
	it('defaults expirySeconds to 30 if omitted', () => {
		const result = generateTokenSchema.safeParse({ pertemuanId: 42 });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.expirySeconds).toBe(30);
		}
	});

	it('rejects invalid expirySeconds (> 300)', () => {
		const result = generateTokenSchema.safeParse({ pertemuanId: 42, expirySeconds: 999 });
		expect(result.success).toBe(false);
	});
});

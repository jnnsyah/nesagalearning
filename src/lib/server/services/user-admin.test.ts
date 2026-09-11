import { describe, it, expect } from 'vitest';
import {
	createUserSchema,
	updateUserSchema,
	resetPasswordSchema,
	bulkImportSiswaSchema
} from '../../validators/user';

describe('User Admin Validation & Helper Logic', () => {
	it('validates correct siswa creation with NISN', () => {
		const validSiswa = {
			username: 'budi_tkj',
			nisn: '0081234567',
			fullName: 'Budi Santoso',
			email: 'budi@nesaga.sch.id',
			role: 'siswa',
			password: 'secretpassword123',
			isActive: true
		};

		const result = createUserSchema.safeParse(validSiswa);
		expect(result.success).toBe(true);
	});

	it('rejects siswa creation without NISN', () => {
		const invalidSiswaWithoutNisn = {
			username: 'budi_tkj',
			fullName: 'Budi Santoso',
			email: 'budi@nesaga.sch.id',
			role: 'siswa',
			password: 'secretpassword123',
			isActive: true
		};

		const result = createUserSchema.safeParse(invalidSiswaWithoutNisn);
		expect(result.success).toBe(false);
	});

	it('allows non-siswa creation without NISN', () => {
		const validMentorWithoutNisn = {
			username: 'mentor_budi',
			fullName: 'Budi Santoso',
			email: 'budi@nesaga.sch.id',
			role: 'mentor',
			password: 'secretpassword123',
			isActive: true
		};

		const result = createUserSchema.safeParse(validMentorWithoutNisn);
		expect(result.success).toBe(true);
	});

	it('rejects invalid username characters or short passwords', () => {
		const invalid = {
			username: 'invalid user name!',
			fullName: 'A',
			role: 'admin',
			password: '123'
		};

		const result = createUserSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it('validates reset password schema correctly', () => {
		const valid = {
			userId: 42,
			newPassword: 'newsecurepassword'
		};

		const result = resetPasswordSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('validates bulk import siswa list with NISN', () => {
		const bulkData = {
			users: [
				{ username: 'siswa_01', nisn: '0081234501', fullName: 'Ahmad Fauzi', email: 'ahmad@nesaga.sch.id' },
				{ username: 'siswa_02', nisn: '0081234502', fullName: 'Siti Aminah' }
			]
		};

		const result = bulkImportSiswaSchema.safeParse(bulkData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.users.length).toBe(2);
		}
	});

	it('validates user creation with valid 10-digit NISN', () => {
		const validWithNisn = {
			username: 'ahmad_01',
			nisn: '0081234567',
			fullName: 'Ahmad Fauzi',
			role: 'siswa',
			password: 'password123'
		};

		const result = createUserSchema.safeParse(validWithNisn);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.nisn).toBe('0081234567');
		}
	});
});

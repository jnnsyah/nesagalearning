import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
		assert.equal(result.success, true);
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
		assert.equal(result.success, false);
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
		assert.equal(result.success, true);
	});

	it('rejects invalid username characters or short passwords', () => {
		const invalid = {
			username: 'invalid user name!',
			fullName: 'A',
			role: 'admin',
			password: '123'
		};

		const result = createUserSchema.safeParse(invalid);
		assert.equal(result.success, false);
	});

	it('validates reset password schema correctly', () => {
		const valid = {
			userId: 42,
			newPassword: 'newsecurepassword'
		};

		const result = resetPasswordSchema.safeParse(valid);
		assert.equal(result.success, true);
	});

	it('validates bulk import siswa list with NISN', () => {
		const bulkData = {
			users: [
				{ username: 'siswa_01', nisn: '0081234501', fullName: 'Ahmad Fauzi', email: 'ahmad@nesaga.sch.id' },
				{ username: 'siswa_02', nisn: '0081234502', fullName: 'Siti Aminah' }
			]
		};

		const result = bulkImportSiswaSchema.safeParse(bulkData);
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.users.length, 2);
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
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data.nisn, '0081234567');
		}
	});
});

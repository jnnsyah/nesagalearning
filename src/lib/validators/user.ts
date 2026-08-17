import { z } from 'zod';

export const userRoleEnum = z.enum(['admin', 'guru', 'mentor', 'siswa']);

export const createUserSchema = z
	.object({
		username: z
			.string()
			.min(3, 'Username minimal 3 karakter.')
			.max(30, 'Username maksimal 30 karakter.')
			.regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, garis bawah, titik, atau strip.'),
		nisn: z
			.string()
			.trim()
			.regex(/^\d{8,12}$/, 'NISN harus berupa digit angka (8-12 digit).')
			.optional()
			.or(z.literal(''))
			.nullable(),
		fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
		email: z.string().email('Format email tidak valid.').optional().or(z.literal('')).nullable(),
		role: userRoleEnum,
		password: z.string().min(6, 'Password minimal 6 karakter.'),
		isActive: z.boolean().default(true)
	})
	.superRefine((data, ctx) => {
		if (data.role === 'siswa') {
			if (!data.nisn || data.nisn.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'NISN wajib diisi untuk pengguna dengan role Siswa.',
					path: ['nisn']
				});
			}
		}
	});

export const updateUserSchema = z
	.object({
		id: z.number().positive(),
		username: z
			.string()
			.min(3, 'Username minimal 3 karakter.')
			.max(30, 'Username maksimal 30 karakter.')
			.regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh huruf, angka, garis bawah, titik, atau strip.'),
		nisn: z
			.string()
			.trim()
			.regex(/^\d{8,12}$/, 'NISN harus berupa digit angka (8-12 digit).')
			.optional()
			.or(z.literal(''))
			.nullable(),
		fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
		email: z.string().email('Format email tidak valid.').optional().or(z.literal('')).nullable(),
		role: userRoleEnum,
		password: z.string().min(6, 'Password minimal 6 karakter.').optional().or(z.literal('')).nullable(),
		isActive: z.boolean().default(true)
	})
	.superRefine((data, ctx) => {
		if (data.role === 'siswa') {
			if (!data.nisn || data.nisn.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'NISN wajib diisi untuk pengguna dengan role Siswa.',
					path: ['nisn']
				});
			}
		}
	});

export const resetPasswordSchema = z.object({
	userId: z.number().positive('ID user tidak valid.'),
	newPassword: z.string().min(6, 'Password baru minimal 6 karakter.')
});

export const bulkImportSiswaItemSchema = z.object({
	username: z
		.string()
		.min(3, 'Username minimal 3 karakter.')
		.regex(/^[a-zA-Z0-9_.-]+$/),
	nisn: z
		.string()
		.trim()
		.min(1, 'NISN wajib diisi untuk Siswa.')
		.regex(/^\d{8,12}$/, 'NISN harus berupa digit angka (8-12 digit).'),
	fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
	email: z.string().email().optional().or(z.literal('')).nullable(),
	password: z.string().min(6).optional()
});

export const bulkImportSiswaSchema = z.object({
	users: z.array(bulkImportSiswaItemSchema).min(1, 'Minimal 1 data siswa untuk dimport.')
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type BulkImportSiswaInput = z.infer<typeof bulkImportSiswaSchema>;

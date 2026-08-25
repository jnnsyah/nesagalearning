import { z } from 'zod';

export const updateProfileSchema = z.object({
	fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100, 'Nama terlalu panjang'),
	username: z
		.string()
		.min(3, 'Username minimal 3 karakter')
		.max(30, 'Username maksimal 30 karakter')
		.regex(/^[a-z0-9_]+$/, 'Username hanya boleh berisi huruf kecil, angka, dan garis bawah (_)')
		.or(z.literal(''))
		.nullable()
		.optional(),
	email: z.string().email('Format email tidak valid').or(z.literal('')).nullable().optional(),
	nisn: z.string().regex(/^\d{10}$/, 'NISN harus terdiri dari 10 digit angka').or(z.literal('')).nullable().optional(),
	rombelLabel: z.string().max(50, 'Label kelas terlalu panjang').or(z.literal('')).nullable().optional()
});

export const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
		newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
		confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter')
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Konfirmasi password baru tidak cocok',
		path: ['confirmPassword']
	});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

import { db } from '../db';
import {
	user as userTable,
	session as sessionTable,
	emailVerificationCode,
	passwordResetToken,
	keanggotaan as keanggotaanTable,
	materiCompletion,
	submission as submissionTable,
	attendance as attendanceTable,
	badge as badgeTable,
	pointLog as pointLogTable,
	streakCounter as streakCounterTable,
	notification as notificationTable,
	quizAttempt as quizAttemptTable,
	advisorNote as advisorNoteTable
} from '../db/schema';
import { eq, and, like, or, sql, count, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface GetUsersFilter {
	search?: string;
	role?: string;
	status?: 'all' | 'active' | 'inactive';
	page?: number;
	limit?: number;
}

export interface UserAdminItem {
	id: number;
	username: string;
	nisn: string | null;
	email: string | null;
	fullName: string;
	role: string;
	avatarUrl: string | null;
	isActive: boolean;
	angkatan: number | null;
	rombelLabel: string | null;
	createdAt: Date;
}

export interface PaginatedUsersResult {
	items: UserAdminItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	stats: {
		totalUsers: number;
		siswaCount: number;
		mentorCount: number;
		guruCount: number;
		adminCount: number;
	};
}

export class UserAdminService {
	/**
	 * Get paginated list of users with search, role filter, and status filter
	 */
	static async getUsersList(filter: GetUsersFilter): Promise<PaginatedUsersResult> {
		const safePage = Math.max(1, filter.page || 1);
		const safeLimit = Math.min(100, Math.max(1, filter.limit || 10));
		const offset = (safePage - 1) * safeLimit;

		// Build filter conditions
		const conditions: any[] = [];

		if (filter.search && filter.search.trim() !== '') {
			const query = `%${filter.search.trim()}%`;
			conditions.push(
				or(
					like(userTable.username, query),
					like(userTable.nisn, query),
					like(userTable.fullName, query),
					like(userTable.email, query)
				)
			);
		}

		if (filter.role && filter.role !== 'all') {
			conditions.push(eq(userTable.role, filter.role));
		}

		if (filter.status === 'active') {
			conditions.push(eq(userTable.isActive, true));
		} else if (filter.status === 'inactive') {
			conditions.push(eq(userTable.isActive, false));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// 1. Get filtered total count
		const [countRes] = await db
			.select({ total: count(userTable.id) })
			.from(userTable)
			.where(whereClause);

		const total = Number(countRes?.total ?? 0);
		const totalPages = Math.ceil(total / safeLimit) || 1;

		// 2. Fetch paginated items
		const items = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				nisn: userTable.nisn,
				email: userTable.email,
				fullName: userTable.fullName,
				role: userTable.role,
				avatarUrl: userTable.avatarUrl,
				isActive: userTable.isActive,
				angkatan: userTable.angkatan,
				rombelLabel: userTable.rombelLabel,
				createdAt: userTable.createdAt
			})
			.from(userTable)
			.where(whereClause)
			.orderBy(desc(userTable.createdAt))
			.limit(safeLimit)
			.offset(offset);

		// 3. Fetch global stats by role
		const roleCounts = await db
			.select({
				role: userTable.role,
				total: count(userTable.id)
			})
			.from(userTable)
			.groupBy(userTable.role);

		let totalUsers = 0;
		let siswaCount = 0;
		let mentorCount = 0;
		let guruCount = 0;
		let adminCount = 0;

		for (const rc of roleCounts) {
			const c = Number(rc.total);
			totalUsers += c;
			if (rc.role === 'siswa') siswaCount = c;
			if (rc.role === 'mentor') mentorCount = c;
			if (rc.role === 'guru') guruCount = c;
			if (rc.role === 'admin') adminCount = c;
		}

		return {
			items,
			total,
			page: safePage,
			limit: safeLimit,
			totalPages,
			stats: {
				totalUsers,
				siswaCount,
				mentorCount,
				guruCount,
				adminCount
			}
		};
	}

	/**
	 * Create a new user with password hashing
	 */
	static async createUser(input: {
		username: string;
		nisn?: string | null;
		fullName: string;
		email?: string | null;
		role: string;
		password: string;
		isActive?: boolean;
		angkatan?: number | null;
		rombelLabel?: string | null;
	}) {
		const cleanUsername = input.username.trim().toLowerCase();
		const cleanNisn = input.nisn && input.nisn.trim() !== '' ? input.nisn.trim() : null;
		const cleanEmail = input.email && input.email.trim() !== '' ? input.email.trim().toLowerCase() : null;

		// Check username collision
		const [existingUser] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, cleanUsername));

		if (existingUser) {
			throw new Error(`Username '${cleanUsername}' sudah digunakan.`);
		}

		// Check NISN collision if provided
		if (cleanNisn) {
			const [existingNisn] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.nisn, cleanNisn));

			if (existingNisn) {
				throw new Error(`NISN '${cleanNisn}' sudah terdaftar untuk akun lain.`);
			}
		}

		// Check email collision if email provided
		if (cleanEmail) {
			const [existingEmail] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.email, cleanEmail));

			if (existingEmail) {
				throw new Error(`Email '${cleanEmail}' sudah digunakan oleh akun lain.`);
			}
		}

		const passwordHash = await bcrypt.hash(input.password, 10);

		const [newUser] = await db
			.insert(userTable)
			.values({
				username: cleanUsername,
				nisn: cleanNisn,
				fullName: input.fullName.trim(),
				email: cleanEmail,
				role: input.role,
				passwordHash,
				isActive: input.isActive ?? true,
				angkatan: input.angkatan ? Number(input.angkatan) : null,
				rombelLabel: input.rombelLabel ? input.rombelLabel.trim() : null
			})
			.returning();

		return newUser;
	}

	/**
	 * Update an existing user's details
	 */
	static async updateUser(input: {
		id: number;
		username: string;
		nisn?: string | null;
		fullName: string;
		email?: string | null;
		role: string;
		password?: string | null;
		isActive?: boolean;
		angkatan?: number | null;
		rombelLabel?: string | null;
	}) {
		const cleanUsername = input.username.trim().toLowerCase();
		const cleanNisn = input.nisn && input.nisn.trim() !== '' ? input.nisn.trim() : null;
		const cleanEmail = input.email && input.email.trim() !== '' ? input.email.trim().toLowerCase() : null;

		// Check username collision
		const [existingUsername] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, cleanUsername));

		if (existingUsername && Number(existingUsername.id) !== Number(input.id)) {
			throw new Error(`Username '${cleanUsername}' sudah digunakan oleh akun lain.`);
		}

		// Check NISN collision
		if (cleanNisn) {
			const [existingNisn] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.nisn, cleanNisn));

			if (existingNisn && Number(existingNisn.id) !== Number(input.id)) {
				throw new Error(`NISN '${cleanNisn}' sudah terdaftar untuk akun lain.`);
			}
		}

		// Check email collision
		if (cleanEmail) {
			const [existingEmail] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.email, cleanEmail));

			if (existingEmail && Number(existingEmail.id) !== Number(input.id)) {
				throw new Error(`Email '${cleanEmail}' sudah digunakan oleh akun lain.`);
			}
		}

		const updatePayload: any = {
			username: cleanUsername,
			nisn: cleanNisn,
			fullName: input.fullName.trim(),
			email: cleanEmail,
			role: input.role,
			isActive: input.isActive ?? true,
			angkatan: input.angkatan ? Number(input.angkatan) : null,
			rombelLabel: input.rombelLabel ? input.rombelLabel.trim() : null,
			updatedAt: new Date()
		};

		if (input.password && input.password.trim() !== '') {
			updatePayload.passwordHash = await bcrypt.hash(input.password.trim(), 10);
		}

		const [updated] = await db
			.update(userTable)
			.set(updatePayload)
			.where(eq(userTable.id, input.id))
			.returning();

		return updated;
	}

	/**
	 * Reset a user's password directly (Admin action)
	 */
	static async resetPassword(userId: number, newPassword: string) {
		if (!newPassword || newPassword.length < 6) {
			throw new Error('Password baru minimal 6 karakter.');
		}

		const passwordHash = await bcrypt.hash(newPassword, 10);

		const [updated] = await db
			.update(userTable)
			.set({
				passwordHash,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId))
			.returning();

		if (!updated) {
			throw new Error('User tidak ditemukan.');
		}

		// Invalidate active sessions across devices for security
		try {
			const { lucia } = await import('../auth/lucia');
			await lucia.invalidateUserSessions(String(userId));
		} catch (err) {
			console.error('Failed to invalidate user sessions on reset password:', err);
		}

		return updated;
	}

	/**
	 * Toggle user active/inactive status
	 */
	static async toggleUserStatus(userId: number) {
		const [targetUser] = await db
			.select({ id: userTable.id, isActive: userTable.isActive })
			.from(userTable)
			.where(eq(userTable.id, userId));

		if (!targetUser) {
			throw new Error('User tidak ditemukan.');
		}

		const newStatus = !targetUser.isActive;

		const [updated] = await db
			.update(userTable)
			.set({
				isActive: newStatus,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId))
			.returning();

		return updated;
	}

	/**
	 * Bulk import Siswa accounts (from CSV / batch array)
	 */
	static async bulkImportSiswa(
		usersList: Array<{ username: string; nisn?: string | null; fullName: string; email?: string | null; password?: string }>,
		defaultPassword: string = 'NesagaSiswa2026!'
	): Promise<{ successCount: number; skippedCount: number; errors: string[] }> {
		let successCount = 0;
		let skippedCount = 0;
		const errors: string[] = [];

		const defaultHash = await bcrypt.hash(defaultPassword, 10);

		for (const u of usersList) {
			try {
				const cleanUsername = u.username.trim().toLowerCase();
				const cleanNisn = u.nisn && u.nisn.trim() !== '' ? u.nisn.trim() : null;
				const cleanEmail = u.email && u.email.trim() !== '' ? u.email.trim().toLowerCase() : null;

				const [existing] = await db
					.select({ id: userTable.id })
					.from(userTable)
					.where(eq(userTable.username, cleanUsername));

				if (existing) {
					skippedCount++;
					errors.push(`Username '${cleanUsername}' sudah terdaftar (dilewati).`);
					continue;
				}

				if (cleanNisn) {
					const [existingNisn] = await db
						.select({ id: userTable.id })
						.from(userTable)
						.where(eq(userTable.nisn, cleanNisn));

					if (existingNisn) {
						skippedCount++;
						errors.push(`NISN '${cleanNisn}' sudah terdaftar untuk siswa lain (dilewati).`);
						continue;
					}
				}

				const passHash = u.password && u.password.length >= 6
					? await bcrypt.hash(u.password, 10)
					: defaultHash;

				await db.insert(userTable).values({
					username: cleanUsername,
					nisn: cleanNisn,
					fullName: u.fullName.trim(),
					email: cleanEmail,
					role: 'siswa',
					passwordHash: passHash,
					isActive: true
				});

				successCount++;
			} catch (err: any) {
				skippedCount++;
				errors.push(`Gagal mengimpor '${u.username}': ${err.message}`);
			}
		}

		return {
			successCount,
			skippedCount,
			errors
		};
	}

	/**
	 * Delete a user account permanently (excluding self-deletion)
	 */
	static async deleteUser(userId: number, currentAdminId: number): Promise<{ id: number; username: string; role: string }> {
		if (userId === currentAdminId) {
			throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
		}

		const [userToDelete] = await db
			.select({ id: userTable.id, username: userTable.username, role: userTable.role })
			.from(userTable)
			.where(eq(userTable.id, userId));

		if (!userToDelete) {
			throw new Error('User yang ingin dihapus tidak ditemukan.');
		}

		// Clean up dependent records before deleting user
		await db.delete(sessionTable).where(eq(sessionTable.userId, String(userId)));
		await db.delete(emailVerificationCode).where(eq(emailVerificationCode.userId, userId));
		await db.delete(passwordResetToken).where(eq(passwordResetToken.userId, userId));
		await db.delete(keanggotaanTable).where(eq(keanggotaanTable.userId, userId));
		await db.delete(materiCompletion).where(eq(materiCompletion.userId, userId));
		await db.delete(submissionTable).where(eq(submissionTable.userId, userId));
		await db.delete(attendanceTable).where(eq(attendanceTable.userId, userId));
		await db.delete(badgeTable).where(eq(badgeTable.userId, userId));
		await db.delete(pointLogTable).where(eq(pointLogTable.userId, userId));
		await db.delete(streakCounterTable).where(eq(streakCounterTable.userId, userId));
		await db.delete(notificationTable).where(eq(notificationTable.userId, userId));
		await db.delete(quizAttemptTable).where(eq(quizAttemptTable.userId, userId));
		await db.delete(advisorNoteTable).where(or(eq(advisorNoteTable.studentId, userId), eq(advisorNoteTable.advisorId, userId)));

		// Delete user record permanently
		await db.delete(userTable).where(eq(userTable.id, userId));

		return userToDelete;
	}
}

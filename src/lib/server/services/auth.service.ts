import { db } from '../db';
import { user as userTable } from '../db/schema/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { lucia, isMobileUserAgent } from '../auth/lucia';
import type { Cookie } from 'lucia';

export async function loginWithUsernamePassword(
	usernameInput: string,
	passwordInput: string,
	userAgent: string | null,
	rememberMeInput?: boolean
): Promise<{ user: typeof userTable.$inferSelect; cookie: Cookie }> {
	const user = await db.query.user.findFirst({
		where: eq(userTable.username, usernameInput)
	});

	if (!user) {
		throw new Error('Username atau password salah');
	}

	if (!user.isActive) {
		throw new Error('Akun Anda telah dinonaktifkan. Hubungi administrator.');
	}

	const validPassword = await bcrypt.compare(passwordInput, user.passwordHash);
	if (!validPassword) {
		throw new Error('Username atau password salah');
	}

	const isMobile = isMobileUserAgent(userAgent);
	const rememberMe = rememberMeInput ?? false;

	const session = await lucia.createSession(String(user.id), {
		uaIsMobile: isMobile,
		rememberMe: rememberMe
	});

	const cookie = lucia.createSessionCookie(session.id);
	return { user, cookie };
}

export async function logoutUser(sessionId: string): Promise<Cookie> {
	await lucia.invalidateSession(sessionId);
	return lucia.createBlankSessionCookie();
}

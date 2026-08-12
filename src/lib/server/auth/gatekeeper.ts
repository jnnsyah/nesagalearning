import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { lucia, isMobileUserAgent } from './lucia';
import { db } from '../db';
import { user as userTable } from '../db/schema/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { Cookie } from 'lucia';

export type UserRole = 'admin' | 'guru' | 'mentor' | 'siswa';

/**
 * AuthGatekeeper — Deep Module for Session Validation, Login/Logout, and Server RBAC Protection.
 */
export const AuthGatekeeper = {
	/**
	 * Map role to default home dashboard path
	 */
	getRoleDefaultPath(role: UserRole | string): string {
		switch (role) {
			case 'admin':
				return '/admin';
			case 'guru':
				return '/guru';
			case 'mentor':
				return '/mentor';
			case 'siswa':
			default:
				return '/siswa';
		}
	},

	/**
	 * Validates the current incoming HTTP session & attaches user/session to event.locals
	 */
	async validateRequest(event: RequestEvent) {
		const sessionId = event.cookies.get(lucia.sessionCookieName);
		if (!sessionId) {
			event.locals.user = null;
			event.locals.session = null;
			return { user: null, session: null };
		}

		const { session, user } = await lucia.validateSession(sessionId);

		if (session && session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '/',
				...sessionCookie.attributes
			});
		}

		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '/',
				...sessionCookie.attributes
			});
		}

		event.locals.user = user as any;
		event.locals.session = session;
		return { user: user as any, session };
	},

	/**
	 * Enforces strict 1-to-1 Server RBAC route isolation based on URL pathname.
	 * Throws a standard SvelteKit redirect (302) if unauthorized.
	 */
	enforceRoutePolicy(user: { role: UserRole } | null, pathname: string) {
		// Ignore non-protected public routes
		if (pathname === '/login' || pathname === '/logout' || pathname.startsWith('/api/public')) {
			return;
		}

		const rolePrefixes: Record<UserRole, string> = {
			admin: '/admin',
			guru: '/guru',
			mentor: '/mentor',
			siswa: '/siswa'
		};

		// If user is not authenticated and trying to access any role area
		const isProtectedArea = Object.values(rolePrefixes).some((prefix) => pathname.startsWith(prefix));
		if (isProtectedArea && !user) {
			throw redirect(302, '/login');
		}

		if (!user) return;

		// Check if user is accessing a protected role route outside their assigned role
		const userAllowedPrefix = rolePrefixes[user.role];

		for (const [roleKey, prefix] of Object.entries(rolePrefixes)) {
			if (pathname.startsWith(prefix) && user.role !== roleKey) {
				// Redirect user back to their own role dashboard
				throw redirect(302, userAllowedPrefix);
			}
		}
	},

	/**
	 * Authenticates user credentials and creates a new Lucia session
	 */
	async login(
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
	},

	/**
	 * Invalidates active session and creates blank cookie
	 */
	async logout(sessionId: string): Promise<Cookie> {
		await lucia.invalidateSession(sessionId);
		return lucia.createBlankSessionCookie();
	}
};

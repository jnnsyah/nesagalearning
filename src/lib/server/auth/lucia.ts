import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { dev } from '$app/environment';
import { db } from '../db';
import { session, user } from '../db/schema/auth';

// Cast schema tables to any for Drizzle adapter compatibility with bigint primary keys
const adapter = new DrizzlePostgreSQLAdapter(db, session as any, user as any);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes: any) => {
		return {
			username: attributes.username,
			email: attributes.email,
			fullName: attributes.fullName,
			role: attributes.role as 'admin' | 'guru' | 'mentor' | 'siswa',
			avatarUrl: attributes.avatarUrl,
			googleId: attributes.googleId,
			isEmailVerified: attributes.isEmailVerified ?? false,
			isActive: attributes.isActive,
			nisn: attributes.nisn ?? null
		};
	},
	getSessionAttributes: (attributes: any) => {
		return {
			uaIsMobile: attributes.uaIsMobile ?? false,
			rememberMe: attributes.rememberMe ?? false
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: {
			username: string;
			email: string | null;
			fullName: string;
			role: 'admin' | 'guru' | 'mentor' | 'siswa';
			avatarUrl: string | null;
			googleId: string | null;
			isEmailVerified: boolean;
			isActive: boolean;
			nisn: string | null;
		};
		DatabaseSessionAttributes: {
			uaIsMobile: boolean;
			rememberMe: boolean;
		};
	}
}

export const SESSION_DURATION_DESKTOP_SEC = 24 * 60 * 60; // 1 Hari (24 Jam)
export const SESSION_DURATION_MOBILE_SEC = 30 * 24 * 60 * 60; // 30 Hari (1 Bulan)

export function getSessionDurationSec(isMobile: boolean): number {
	return isMobile ? SESSION_DURATION_MOBILE_SEC : SESSION_DURATION_DESKTOP_SEC;
}

export function isMobileUserAgent(userAgent: string | null): boolean {
	if (!userAgent) return false;
	return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
}

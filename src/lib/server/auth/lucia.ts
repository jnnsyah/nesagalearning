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
			isActive: attributes.isActive,
			nisn: attributes.nisn ?? null
		};
	}
});

export function isMobileUserAgent(userAgent: string | null): boolean {
	if (!userAgent) return false;
	return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
}

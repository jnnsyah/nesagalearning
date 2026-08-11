import type { User, Session } from 'lucia';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

declare module 'lucia' {
	interface Register {
		Lucia: typeof import('./lib/server/auth/lucia').lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	email: string | null;
	fullName: string;
	role: 'admin' | 'guru' | 'mentor' | 'siswa';
	avatarUrl: string | null;
	googleId: string | null;
	isActive: boolean;
}

export {};

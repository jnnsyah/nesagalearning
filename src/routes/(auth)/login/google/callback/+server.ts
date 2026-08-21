import type { RequestHandler } from './$types';
import { getGoogleOAuthClient, type GoogleUserResult } from '$lib/server/auth/oauth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import { lucia, isMobileUserAgent } from '$lib/server/auth/lucia';
import { AuthGatekeeper } from '$lib/server/auth/gatekeeper';
import { redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	const storedState = cookies.get('google_oauth_state');
	const storedCodeVerifier = cookies.get('google_oauth_code_verifier');

	if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
		throw redirect(303, '/login?error=Invalid+OAuth+state+or+code');
	}

	const google = getGoogleOAuthClient();
	if (!google) {
		throw redirect(303, '/login?error=Google+OAuth+is+not+configured');
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
		const accessToken = tokens.accessToken();

		// Fetch google user info
		const googleResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!googleResponse.ok) {
			throw new Error('Gagal mendapatkan profil pengguna dari Google.');
		}

		const googleUser: GoogleUserResult = await googleResponse.json();

		if (!googleUser.email) {
			throw redirect(303, '/login?error=Google+account+must+have+an+email');
		}

		// Cari user di DB berdasarkan googleId atau email
		const existingUsers = await db
			.select()
			.from(userTable)
			.where(or(eq(userTable.googleId, googleUser.sub), eq(userTable.email, googleUser.email)))
			.limit(1);

		let dbUser = existingUsers[0];

		if (dbUser) {
			// Update googleId & isEmailVerified jika belum terpasang
			if (!dbUser.googleId || !dbUser.isEmailVerified) {
				await db
					.update(userTable)
					.set({
						googleId: googleUser.sub,
						isEmailVerified: true,
						avatarUrl: dbUser.avatarUrl || googleUser.picture || null,
						updatedAt: new Date()
					})
					.where(eq(userTable.id, dbUser.id));
			}
		} else {
			// Buat user baru (role: siswa)
			const baseUsername = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
			const randomSuffix = crypto.randomBytes(2).toString('hex');
			const username = `${baseUsername}_${randomSuffix}`;
			const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

			const inserted = await db
				.insert(userTable)
				.values({
					username,
					email: googleUser.email,
					fullName: googleUser.name || baseUsername,
					passwordHash: dummyPasswordHash,
					role: 'siswa',
					googleId: googleUser.sub,
					isEmailVerified: true,
					avatarUrl: googleUser.picture || null,
					isActive: true
				})
				.returning();

			dbUser = inserted[0];
		}

		if (!dbUser.isActive) {
			throw redirect(303, '/login?error=Akun+Anda+telah+dinonaktifkan');
		}

		// Buat Lucia session
		const userAgent = request.headers.get('user-agent');
		const isMobile = isMobileUserAgent(userAgent);

		const session = await lucia.createSession(String(dbUser.id), {
			uaIsMobile: isMobile,
			rememberMe: true
		});

		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		// Hapus cookie temporary OAuth
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_oauth_code_verifier', { path: '/' });

		const redirectCookie = cookies.get('google_oauth_redirect_to');
		cookies.delete('google_oauth_redirect_to', { path: '/' });

		const redirectPath = (redirectCookie && redirectCookie.startsWith('/'))
			? redirectCookie
			: AuthGatekeeper.getRoleDefaultPath(dbUser.role);

		throw redirect(302, redirectPath);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
			throw err; // rethrow SvelteKit redirect
		}
		const msg = err instanceof Error ? err.message : 'Gagal login via Google';
		throw redirect(303, `/login?error=${encodeURIComponent(msg)}`);
	}
};

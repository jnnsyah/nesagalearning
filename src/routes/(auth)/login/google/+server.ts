import type { RequestHandler } from './$types';
import { getGoogleOAuthClient, isGoogleOAuthEnabled } from '$lib/server/auth/oauth';
import { generateState, generateCodeVerifier } from 'arctic';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isGoogleOAuthEnabled()) {
		throw redirect(303, '/login?error=Google+OAuth+is+not+configured');
	}

	const google = getGoogleOAuthClient();
	if (!google) {
		throw redirect(303, '/login?error=Failed+to+initialize+Google+OAuth');
	}

	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	// Set cookies untuk validasi callback
	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 10, // 10 menit
		sameSite: 'lax'
	});

	cookies.set('google_oauth_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

	throw redirect(302, url.toString());
};

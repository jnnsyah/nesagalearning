// Google OAuth structure ready for PRD integration
// When GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are provided in environment variables,
// initialize Google OAuth provider using arctic / standard OAuth2 flow.

export interface GoogleUserResult {
	sub: string;
	name: string;
	email: string;
	picture?: string;
}

export function isGoogleOAuthEnabled(): boolean {
	return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

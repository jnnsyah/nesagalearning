import { Google } from 'arctic';
import { env } from '$env/dynamic/private';
import * as staticPrivate from '$env/static/private';
import fs from 'fs';
import path from 'path';

let cachedDotenv: Record<string, string> | null = null;

function getDotenvVars(): Record<string, string> {
	if (cachedDotenv) return cachedDotenv;
	cachedDotenv = {};
	try {
		const possiblePaths = [
			path.resolve(process.cwd(), '.env'),
			path.resolve(process.cwd(), 'app/.env'),
			path.resolve('/home/jian/nlc/app/.env')
		];
		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				const content = fs.readFileSync(p, 'utf-8');
				for (const line of content.split('\n')) {
					const trimmed = line.trim();
					if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
						const [key, ...valParts] = trimmed.split('=');
						let val = valParts.join('=').trim();
						if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
							val = val.slice(1, -1);
						}
						cachedDotenv[key.trim()] = val;
					}
				}
				break;
			}
		}
	} catch (e) {
		console.error('Failed to read .env file directly:', e);
	}
	return cachedDotenv;
}

export interface GoogleUserResult {
	sub: string;
	name: string;
	email: string;
	picture?: string;
	email_verified?: boolean;
}

function getEnvVal(key: string): string | undefined {
	const fileVars = getDotenvVars();
	return (
		env[key] ||
		(staticPrivate as Record<string, string>)[key] ||
		process.env[key] ||
		fileVars[key]
	);
}

export function isGoogleOAuthEnabled(): boolean {
	const clientId = getEnvVal('GOOGLE_CLIENT_ID');
	const clientSecret = getEnvVal('GOOGLE_CLIENT_SECRET');
	return Boolean(clientId && clientId.trim() !== '' && clientSecret && clientSecret.trim() !== '');
}

export function getGoogleOAuthClient(): Google | null {
	const clientId = getEnvVal('GOOGLE_CLIENT_ID');
	const clientSecret = getEnvVal('GOOGLE_CLIENT_SECRET');
	const appUrl = getEnvVal('PUBLIC_APP_URL') || 'http://localhost:5173';

	if (!clientId || !clientSecret) {
		return null;
	}

	const redirectURI = `${appUrl}/login/google/callback`;
	return new Google(clientId, clientSecret, redirectURI);
}

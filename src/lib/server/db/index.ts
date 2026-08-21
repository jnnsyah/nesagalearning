import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let databaseUrl = process.env.DATABASE_URL;

try {
	const { env } = await import('$env/dynamic/private');
	if (env?.DATABASE_URL) {
		databaseUrl = env.DATABASE_URL;
	}
} catch {
	// Running outside SvelteKit SSR environment (e.g. tsx node:test)
}

if (!databaseUrl) {
	databaseUrl = 'postgresql://nlc:nlc_dev@localhost:5432/nlc_dev';
}

// Serverless-compatible config:
// - max: 1 → no persistent pool (each lambda invocation gets 1 connection)
// - prepare: false → required for Supabase transaction pooler (Supavisor)
const isProduction = process.env.NODE_ENV === 'production';
const client = postgres(databaseUrl, {
	max: isProduction ? 1 : 10,
	prepare: false
});

export const db = drizzle(client, { schema });

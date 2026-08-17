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

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });

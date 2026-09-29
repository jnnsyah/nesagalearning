import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			bodySizeLimit: 25 * 1024 * 1024
		}),
		inlineStyleThreshold: 65536,
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;

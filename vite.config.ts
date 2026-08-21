import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		// Inject <link rel="modulepreload"> for all JS chunks reachable from the entry point.
		// This parallelises the JS waterfall that PageSpeed flags as a long network dependency chain.
		modulePreload: { polyfill: true },
		// Raise the chunk-size warning threshold (Tailwind v4 produces a large base CSS).
		chunkSizeWarningLimit: 700
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

			csrf: {
				checkOrigin: false
			},

			// Inline CSS files smaller than 64 KB directly into the HTML <style> block,
			// eliminating render-blocking <link rel="stylesheet"> requests.
			// Covers: 0.css (~61KB Tailwind global), 20.css (~7KB login), ToastContainer.css (~2.8KB).
			inlineStyleThreshold: 65536,

			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	]
});

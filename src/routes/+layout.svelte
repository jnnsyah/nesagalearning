<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/stores';

	let { children } = $props();
	let fontLoaded = $state(false);

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.fonts.ready.then(() => {
				fontLoaded = true;
			});
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Fullscreen Initial Loader (waits for fonts & DOM mount) -->
{#if !fontLoaded}
	<div class="initial-loader">
		<div class="loader-box">
			<div class="type-mono" style="font-size: 10px; color: var(--red); letter-spacing: 0.12em;">
				[ SYSTEM INITIALIZING ]
			</div>
			<div class="loader-title">NLC</div>
			<div class="loading-bar">
				<div class="loading-bar__fill"></div>
			</div>
			<div class="type-mono text-muted" style="font-size: 9px;">
				&gt;&gt;&gt; MEMUAT FONTS & ASSETS...
			</div>
		</div>
	</div>
{/if}

<!-- Route Navigation Loader Bar -->
{#if $navigating}
	<div class="loading-overlay">
		<div class="loading-bar">
			<div class="loading-bar__fill"></div>
		</div>
		<div class="loading-status">
			<span class="badge badge-live">LOADING</span>
			<span class="type-mono" style="font-size: 10px; color: var(--text-secondary);">
				&gt;&gt;&gt; MEMUAT DATA {$navigating.to?.url.pathname ?? ''}...
			</span>
		</div>
	</div>
{/if}

<div style="visibility: {fontLoaded ? 'visible' : 'hidden'}; display: contents;">
	{@render children()}
</div>

<style>
	.initial-loader {
		position: fixed;
		inset: 0;
		z-index: 99999;
		background: var(--bg-base);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.loader-box {
		width: 100%;
		max-width: 320px;
		background: var(--bg-panel);
		border: 1px solid var(--border-hard);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.loader-title {
		font-family: var(--font-macro);
		font-size: 2.5rem;
		line-height: 0.9;
		letter-spacing: -0.04em;
		color: var(--text-primary);
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10000;
		background: var(--bg-panel);
		border-bottom: 1px solid var(--border-hard);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
	}

	.loading-bar {
		height: 3px;
		width: 100%;
		background: var(--bg-cell);
		position: relative;
		overflow: hidden;
	}

	.loading-bar__fill {
		height: 100%;
		background: var(--red);
		width: 40%;
		position: absolute;
		animation: loading-scan 1s infinite ease-in-out;
	}

	@keyframes loading-scan {
		0% {
			left: -40%;
		}
		100% {
			left: 100%;
		}
	}

	.loading-status {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 16px;
	}
</style>

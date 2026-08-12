<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

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

{@render children()}

<style>
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
		animation: loading-scan 1.2s infinite ease-in-out;
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

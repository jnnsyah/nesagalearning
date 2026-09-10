<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/stores';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Subtle Top Progress Indicator (Only for Slow Network > 180ms) -->
{#if $navigating}
	<div class="top-nav-loader">
		<div class="top-nav-loader__bar"></div>
	</div>
{/if}

{@render children()}

<!-- Global Toast Notification Container -->
<ToastContainer />

<style>
	.top-nav-loader {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 2.5px;
		z-index: 99999;
		background: transparent;
		overflow: hidden;
		pointer-events: none;
		opacity: 0;
		animation: revealLoader 200ms ease-out 180ms forwards;
	}

	.top-nav-loader__bar {
		height: 100%;
		width: 45%;
		background: linear-gradient(90deg, #4338ca 0%, #4f46e5 50%, #06b6d4 100%);
		position: absolute;
		border-radius: 9999px;
		box-shadow: 0 0 8px rgba(79, 70, 229, 0.5);
		animation: top-bar-scan 0.9s infinite ease-in-out;
	}

	@keyframes revealLoader {
		to {
			opacity: 1;
		}
	}

	@keyframes top-bar-scan {
		0% { left: -45%; }
		100% { left: 100%; }
	}
</style>

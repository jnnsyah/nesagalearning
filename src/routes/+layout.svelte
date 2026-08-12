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

<!-- Slim Top Navigation Loading Bar -->
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
		height: 3px;
		z-index: 99999;
		background: rgba(79, 70, 229, 0.15);
		overflow: hidden;
		pointer-events: none;
	}

	.top-nav-loader__bar {
		height: 100%;
		width: 40%;
		background: linear-gradient(90deg, #4338ca 0%, #4f46e5 50%, #0d9488 100%);
		position: absolute;
		border-radius: 9999px;
		box-shadow: 0 0 10px rgba(79, 70, 229, 0.6);
		animation: top-bar-scan 1s infinite ease-in-out;
	}

	@keyframes top-bar-scan {
		0% { left: -40%; }
		100% { left: 100%; }
	}
</style>

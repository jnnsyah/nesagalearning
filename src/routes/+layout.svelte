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

<!-- Slim Top Navigation Loading Bar & Floating Badge -->
{#if $navigating}
	<div class="top-nav-loader">
		<div class="top-nav-loader__bar"></div>
	</div>
	<div class="global-nav-badge">
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="animate-spin text-indigo-600">
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
		<span>Memuat data...</span>
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

	.global-nav-badge {
		position: fixed;
		top: 14px;
		right: 20px;
		z-index: 99999;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(79, 70, 229, 0.2);
		border-radius: 9999px;
		box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: #312e81;
		pointer-events: none;
		animation: fadeInBadge 150ms ease-out;
	}

	@keyframes top-bar-scan {
		0% { left: -40%; }
		100% { left: 100%; }
	}

	@keyframes fadeInBadge {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (max-width: 640px) {
		.global-nav-badge {
			top: auto;
			bottom: calc(74px + env(safe-area-inset-bottom, 0px));
			left: 50%;
			right: auto;
			transform: translateX(-50%);
			box-shadow: 0 6px 20px rgba(15, 23, 42, 0.16);
			animation: fadeInBadgeMobile 150ms ease-out;
		}
	}

	@keyframes fadeInBadgeMobile {
		from { opacity: 0; transform: translate(-50%, 8px); }
		to { opacity: 1; transform: translate(-50%, 0); }
	}
</style>

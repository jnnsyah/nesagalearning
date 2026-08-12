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

<!-- Fullscreen Initial Loader -->
{#if !fontLoaded}
	<div class="initial-loader">
		<div class="loader-card">
			<div class="loader-title">NLC</div>
			<div class="loader-subtitle">Nesaga Learning Community</div>
			
			<div class="loader-dots">
				<div class="dot dot-1"></div>
				<div class="dot dot-2"></div>
				<div class="dot dot-3"></div>
			</div>

			<div class="loader-foot-text">
				Memuat platform pembelajaran...
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
			<span class="badge badge-live">MEMUAT HALAMAN</span>
			<span class="type-mono" style="font-size: 12px; color: var(--text-secondary);">
				Menyiapkan data {$navigating.to?.url.pathname ?? ''}...
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
		background: #f8fafc;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.loader-card {
		width: 100%;
		max-width: 380px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: var(--radius-xl);
		padding: 40px 32px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
	}

	.loader-title {
		font-family: var(--font-macro);
		font-size: 3.25rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		background: linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: 6px;
	}

	.loader-subtitle {
		font-size: 14px;
		font-weight: 600;
		color: #475569;
		margin-bottom: 28px;
	}

	.loader-dots {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #4f46e5;
		animation: bounce-dot 1.4s infinite ease-in-out both;
	}

	.dot-1 { animation-delay: -0.32s; }
	.dot-2 { animation-delay: -0.16s; }

	@keyframes bounce-dot {
		0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
		40% { transform: scale(1.1); opacity: 1; }
	}

	.loader-foot-text {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
		color: #64748b;
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10000;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-hard);
		box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
	}

	.loading-bar {
		height: 3.5px;
		width: 100%;
		background: #e2e8f0;
		position: relative;
		overflow: hidden;
	}

	.loading-bar__fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5 0%, #0d9488 100%);
		width: 45%;
		position: absolute;
		border-radius: var(--radius-full);
		box-shadow: 0 0 12px rgba(79, 70, 229, 0.5);
		animation: loading-scan 1.2s infinite ease-in-out;
	}

	@keyframes loading-scan {
		0% {
			left: -45%;
		}
		100% {
			left: 100%;
		}
	}

	.loading-status {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 24px;
	}
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let pathname = $derived($page.url.pathname);
	let isMateriReader = $derived(
		pathname.startsWith('/materi/') && pathname !== '/materi'
	);
	let isArticleViewer = $derived(
		/^\/materi\/[^/]+\/[^/]+/.test(pathname)
	);

	let userDashboardPath = $derived(
		data.user ? `/${data.user.role}` : '/login'
	);
	let portalButtonText = $derived(
		data.user ? 'Ke Dashboard' : 'Masuk Portal'
	);
	let isMateriSection = $derived(
		pathname.startsWith('/materi')
	);
	let navButtonHref = $derived(
		isMateriSection ? '/' : '/materi'
	);
	let navButtonText = $derived(
		isMateriSection ? 'Kembali ke Beranda' : 'Jelajahi Materi'
	);
</script>

<svelte:head>
	<meta name="theme-color" content="#4f46e5" />
</svelte:head>

<div class="public-shell">
	{#if !isArticleViewer}
		<header class="public-topbar">
			<a href="/" class="public-brand">
				<span class="brand-logo-text">NLC</span>
				<span class="brand-name">Nesaga Learning Community</span>
			</a>
			<div class="public-topbar-right">
				<a href={navButtonHref} class="btn-secondary-head-pill hide-on-mobile">
					{#if isMateriSection}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
					{/if}
					<span>{navButtonText}</span>
				</a>
				<a href={userDashboardPath} class="btn-create-pill">
					{#if data.user}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
					{/if}
					<span>{portalButtonText}</span>
				</a>
			</div>
		</header>
	{/if}

	<main class="public-content">
		{@render children()}
	</main>

	{#if !isMateriReader}
		<footer class="public-footer">
			<div class="footer-inner">
				<span class="footer-brand">NLC — Nesaga Learning Community</span>
				<div class="footer-links">
					<a href="/materi">Jelajahi Materi</a>
					<a href="/docs">Dokumentasi</a>
					<a href={userDashboardPath}>{portalButtonText}</a>
				</div>
				<span class="footer-copy">Komunitas Belajar SMK Negeri 1 Gantiwarno</span>
			</div>
		</footer>
	{/if}
</div>

<style>
	.public-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--bg-base);
	}

	/* ── Topbar ── */
	.public-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 24px;
		border-bottom: 1px solid var(--border-hard);
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		position: sticky;
		top: 0;
		z-index: 90;
		box-shadow: var(--shadow-sm);
	}

	.public-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}

	.brand-logo-text {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}

	.brand-name {
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.public-topbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* ── Content ── */
	.public-content {
		flex: 1;
	}

	/* ── Footer ── */
	.public-footer {
		border-top: 1px solid var(--border-hard);
		background: #ffffff;
		padding: 20px 24px;
	}

	.footer-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.footer-brand {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.footer-links {
		display: flex;
		gap: 20px;
	}

	.footer-links a {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.footer-links a:hover {
		color: var(--primary);
	}

	.footer-copy {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-ghost);
	}

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.public-topbar {
			padding: 10px 16px;
		}
		.brand-name {
			display: none;
		}
		.brand-logo-text {
			font-size: 1.25rem;
		}
		.hide-on-mobile {
			display: none;
		}
		.public-footer {
			padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px));
		}
		.footer-inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		.footer-links {
			flex-wrap: wrap;
			gap: 14px;
		}
	}
</style>

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
	let isDocs = $derived(
		pathname.startsWith('/docs')
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
				{#if isMateriSection}
					<a href="/" class="btn-secondary-head-pill topbar-nav-btn">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
						<span class="desktop-text">Kembali ke Beranda</span>
						<span class="mobile-text">Beranda</span>
					</a>
				{:else}
					<a href="/materi" class="btn-secondary-head-pill topbar-nav-btn">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
						<span class="desktop-text">Jelajahi Materi</span>
						<span class="mobile-text">Materi</span>
					</a>
				{/if}
				<a href={userDashboardPath} class="btn-create-pill topbar-portal-btn">
					{#if data.user}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
					{/if}
					<span class="desktop-text">{portalButtonText}</span>
					<span class="mobile-text">{data.user ? 'Dashboard' : 'Portal'}</span>
				</a>
			</div>
		</header>
	{/if}

	<main class="public-content">
		{@render children()}
	</main>

	{#if !isMateriReader && !isDocs}
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
		padding: 0 24px;
		height: 58px;
		box-sizing: border-box;
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

	.mobile-text {
		display: none;
	}

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.public-topbar {
			padding: 10px 14px;
		}
		.brand-name {
			display: none;
		}
		.brand-logo-text {
			font-size: 1.25rem;
		}
		.desktop-text {
			display: none;
		}
		.mobile-text {
			display: inline;
		}
		.topbar-nav-btn,
		.topbar-portal-btn {
			padding: 0 10px;
			font-size: 11px;
			height: 30px;
			gap: 5px;
			border-radius: 9999px;
			white-space: nowrap;
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

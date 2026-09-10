<script lang="ts">
	import { slide } from 'svelte/transition';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Accordion state: separated for sidebar tree and main content cards
	let openSidebarPhases = $state<Record<number, boolean>>({});
	let openCardPhases = $state<Record<number, boolean>>({});

	$effect(() => {
		if (data.phases.length > 0) {
			const initSidebar: Record<number, boolean> = {};
			const initCard: Record<number, boolean> = {};
			data.phases.forEach((p, i) => {
				initSidebar[p.id] = i === 0; // open first phase in sidebar
				initCard[p.id] = true; // open all cards in main content
			});
			openSidebarPhases = initSidebar;
			openCardPhases = initCard;
		}
	});

	function toggleSidebarPhase(id: number) {
		openSidebarPhases[id] = !openSidebarPhases[id];
	}

	function toggleCardPhase(id: number) {
		openCardPhases[id] = !openCardPhases[id];
	}

	// Guest banner dismiss
	let bannerDismissed = $state(false);

	function formatTingkatLabel(name: string | null | undefined): string {
		if (!name) return 'Track';
		const clean = name.trim();
		if (/\b(xii|12)\b/i.test(clean) || clean.toUpperCase().includes('XII') || clean.includes('3')) {
			return 'Kelas 3';
		}
		if (/\b(xi|11)\b/i.test(clean) || clean.toUpperCase().includes('XI') || clean.includes('2')) {
			return 'Kelas 2';
		}
		if (/\b(x|10)\b/i.test(clean) || clean.toUpperCase().includes('X') || clean.includes('1')) {
			return 'Kelas 1';
		}
		return clean.startsWith('Kelas') ? clean : `Kelas ${clean}`;
	}
</script>

<svelte:head>
	<title>{data.track.title} — Nesaga Learning Community</title>
	<meta name="description" content="Baca materi track {data.track.title} secara gratis di Nesaga Learning Community." />
</svelte:head>

<div class="reader-layout">
	<!-- Sidebar daftar isi -->
	<aside class="reader-sidebar hide-mobile">
		<div class="sidebar-header">
			<a href="/materi" class="back-link">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				Katalog
			</a>
			<span class="badge badge-neutral">{formatTingkatLabel(data.track.tingkatName)}</span>
		</div>
		<div class="sidebar-track-title">{data.track.title}</div>
		<nav class="sidebar-nav">
			{#each data.phases as p}
				<div class="nav-phase">
					<button
						type="button"
						class="nav-phase-btn"
						onclick={() => toggleSidebarPhase(p.id)}
					>
						<span>{p.title}</span>
						<svg
							width="13" height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							class="chevron"
							class:chevron--open={openSidebarPhases[p.id]}
						>
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					{#if openSidebarPhases[p.id]}
						<div class="nav-sub-list" transition:slide={{ duration: 160 }}>
							{#each p.subPhases as sp}
								<div class="nav-sub-phase">
									<div class="nav-sub-title">{sp.title}</div>
									{#each sp.materis as m}
										<a href="#{m.id}" class="nav-materi-link">
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
											{m.title}
										</a>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</nav>
	</aside>

	<!-- Main content -->
	<main class="reader-main page-container">
		<!-- Breadcrumb & header -->
		<div class="track-header panel">
			<div class="track-header-top">
				<div class="breadcrumb">
					<a href="/">Beranda</a>
					<span class="breadcrumb-sep">/</span>
					<a href="/materi">Katalog Materi</a>
					<span class="breadcrumb-sep">/</span>
					<span>{data.track.title}</span>
				</div>
				<span class="badge badge-hadir">Dipublikasikan</span>
			</div>
			<h1 class="track-main-title">{data.track.title}</h1>
			{#if data.track.description}
				<p class="track-main-desc">{data.track.description}</p>
			{/if}
			<!-- Guest CTA -->
			<div class="guest-track-cta">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<span>Kamu membaca dalam <strong>mode Tamu</strong>. <a href="/login" class="cta-link">Login</a> untuk menyimpan progress & mengerjakan kuis.</span>
			</div>
		</div>

		<!-- Phase & materi list -->
		{#if data.phases.length === 0}
			<div class="panel">
				<EmptyState
					title="Materi Belum Tersedia"
					description="Track ini belum memiliki konten pembelajaran."
					iconTheme="slate"
				/>
			</div>
		{:else}
			{#each data.phases as p, pi}
				<section class="phase-section panel">
					<button
						type="button"
						class="phase-header"
						onclick={() => toggleCardPhase(p.id)}
					>
						<div class="phase-header-left">
							<span class="phase-num">Fase {pi + 1}</span>
							<span class="phase-title">{p.title}</span>
						</div>
						<svg
							width="16" height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							class="chevron"
							class:chevron--open={openCardPhases[p.id]}
						>
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>

					{#if openCardPhases[p.id]}
						<div class="phase-body" transition:slide={{ duration: 180 }}>
							{#if p.description}
								<p class="phase-desc">{p.description}</p>
							{/if}

							{#each p.subPhases as sp}
								<div class="sub-phase-block">
									<div class="sub-phase-header">
										<div class="sub-phase-dot"></div>
										<h3 class="sub-phase-title">{sp.title}</h3>
									</div>
									{#if sp.description}
										<p class="sub-phase-desc">{sp.description}</p>
									{/if}

									{#if sp.materis.length === 0}
										<p class="no-materi">Belum ada materi di sub-fase ini.</p>
									{:else}
										<div class="materi-list">
											{#each sp.materis as m}
												<a
													id={String(m.id)}
													href="/materi/{data.track.id}/{m.id}"
													class="materi-item panel-hover"
												>
													<div class="materi-icon">
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
															<polyline points="14 2 14 8 20 8"/>
														</svg>
													</div>
													<span class="materi-title">{m.title}</span>
													<div class="materi-read-badge">Baca</div>
												</a>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		{/if}
	</main>
</div>

<!-- ══ STICKY GUEST NOTICE BANNER (LIGHT THEME) ══ -->
{#if !bannerDismissed && !data.user}
	<div class="guest-notice-banner">
		<div class="banner-icon">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
		</div>
		<span class="banner-text"><strong>Mode Tamu</strong> &bull; Login untuk simpan progress &amp; kerjakan kuis</span>
		<a href="/login" class="banner-cta">Login Sekarang</a>
		<button
			type="button"
			class="banner-dismiss"
			onclick={() => (bannerDismissed = true)}
			aria-label="Tutup banner"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
	</div>
{/if}

<style>
	/* ── Layout ── */
	.reader-layout {
		display: flex;
		flex: 1;
		min-height: calc(100vh - 61px);
		width: 100%;
		align-items: stretch;
	}

	/* ── Sidebar ── */
	.reader-sidebar {
		width: 290px;
		flex-shrink: 0;
		position: sticky;
		top: 61px;
		height: calc(100vh - 61px);
		overflow-y: auto;
		background: #ffffff;
		border-right: 1px solid var(--border-hard);
		padding: 20px 16px 40px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-sizing: border-box;
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 transparent;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.back-link:hover { color: var(--primary); }

	.sidebar-track-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-soft);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-phase-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		transition: background 140ms, color 140ms;
		text-align: left;
		gap: 8px;
	}

	.nav-phase-btn:hover { background: var(--primary-light); color: var(--primary); }

	.nav-sub-list {
		padding-left: 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 2px;
	}

	.nav-sub-title {
		font-family: var(--font-body);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		padding: 4px 8px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.nav-materi-link {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px;
		border-radius: var(--radius-sm);
		font-family: var(--font-body);
		font-size: 11.5px;
		color: var(--text-secondary);
		text-decoration: none;
		transition: background 130ms, color 130ms;
		line-height: 1.4;
	}

	.nav-materi-link:hover { background: var(--primary-light); color: var(--primary); }

	/* ── Main ── */
	.reader-main {
		flex: 1;
		min-width: 0;
		padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
	}

	/* ── Track Header ── */
	.track-header {
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.track-header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-muted);
		flex-wrap: wrap;
	}

	.breadcrumb a {
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.breadcrumb a:hover { color: var(--primary); }

	.breadcrumb-sep { color: var(--border-hard); }

	.track-main-title {
		font-family: var(--font-macro);
		font-size: clamp(1.2rem, 3vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.track-main-desc {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.guest-track-cta {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 14px;
		background: var(--blue-dim);
		border: 1px solid var(--blue-border);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 12.5px;
		color: #1e40af;
		margin-top: 4px;
	}

	.cta-link {
		color: var(--primary);
		font-weight: 700;
		text-decoration: underline;
	}

	/* ── Phase ── */
	.phase-section {
		overflow: hidden;
	}

	.phase-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 16px 20px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 140ms;
		gap: 12px;
	}

	.phase-header:hover { background: var(--bg-inset); }

	.phase-header-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
	}

	.phase-num {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.phase-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.phase-body {
		padding: 0 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		border-top: 1px solid var(--border-soft);
	}

	.phase-desc {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-muted);
		margin: 12px 0 0;
		line-height: 1.6;
	}

	/* ── Sub Phase ── */
	.sub-phase-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sub-phase-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 8px;
	}

	.sub-phase-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--primary);
		flex-shrink: 0;
	}

	.sub-phase-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.sub-phase-desc {
		font-family: var(--font-body);
		font-size: 12.5px;
		color: var(--text-muted);
		margin: 0 0 4px 16px;
		line-height: 1.5;
	}

	.no-materi {
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-ghost);
		margin: 4px 0 0 16px;
	}

	/* ── Materi Items ── */
	.materi-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-left: 16px;
	}

	.materi-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		background: #ffffff;
		text-decoration: none;
		color: inherit;
		transition: border-color 150ms, box-shadow 150ms, transform 150ms;
		cursor: pointer;
	}

	.materi-item:hover {
		border-color: var(--border-accent);
		box-shadow: var(--shadow-sm);
		transform: translateX(2px);
	}

	.materi-icon {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.materi-title {
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
		line-height: 1.4;
	}

	.materi-read-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		border: 1px solid var(--primary-border);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	/* ── Chevron ── */
	.chevron {
		flex-shrink: 0;
		transition: transform 200ms ease;
	}

	.chevron--open {
		transform: rotate(180deg);
	}

	/* ── Sticky Guest Banner (Light Theme) ── */
	.guest-notice-banner {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 80;
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1.5px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-full, 9999px);
		padding: 8px 12px 8px 18px;
		color: var(--text-primary, #0f172a);
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 500;
		max-width: calc(100vw - 32px);
		box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05);
		white-space: nowrap;
	}

	.banner-icon {
		color: var(--primary, #4f46e5);
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.banner-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-secondary, #334155);
	}

	.banner-text strong {
		color: var(--text-primary, #0f172a);
		font-weight: 700;
	}

	.banner-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border-radius: var(--radius-full, 9999px);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		transition: all 140ms ease;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
	}

	.banner-cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.banner-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--bg-cell, #f1f5f9);
		border: none;
		color: var(--text-muted, #64748b);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 140ms ease;
	}

	.banner-dismiss:hover {
		background: #e2e8f0;
		color: var(--text-primary, #0f172a);
	}

	/* ── Hide mobile sidebar ── */
	.hide-mobile {
		display: flex;
	}

	@media (max-width: 768px) {
		.hide-mobile { display: none; }
		.reader-main { padding-left: 0; }
		.guest-notice-banner {
			bottom: 16px;
			flex-wrap: wrap;
			white-space: normal;
			border-radius: var(--radius-lg, 16px);
			padding: 12px 14px;
		}
		.banner-text { white-space: normal; }
	}
</style>

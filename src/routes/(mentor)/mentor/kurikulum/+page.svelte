<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let user = $derived($page.data.user);

	// ── Sidebar state ──────────────────────────────────────────────────
	let sidebarCollapsed = $state(false);

	// ── Page state ────────────────────────────────────────────────────
	let showAddModal     = $state(false);
	let inspectingTrackId = $state<number | null>(null);
	let searchQuery       = $state('');
	let selectedTingkat   = $state<number | null>(null);
	let selectedStatus    = $state<'all' | 'published' | 'draft'>('all');
	let searchInputEl     = $state<HTMLInputElement | null>(null);

	// ── Derived data ──────────────────────────────────────────────────
	let filteredTracks = $derived(
		data.tracks.filter((t) => {
			if (selectedTingkat !== null && t.tingkatId !== selectedTingkat) return false;
			if (selectedStatus === 'published' && !t.isPublished) return false;
			if (selectedStatus === 'draft' && t.isPublished) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return (
					t.title.toLowerCase().includes(q) ||
					(t.description?.toLowerCase().includes(q) ?? false) ||
					t.tingkatName.toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	let totalTracks      = $derived(data.tracks.length);
	let publishedTracks  = $derived(data.tracks.filter((t) => t.isPublished).length);
	let draftTracks      = $derived(data.tracks.filter((t) => !t.isPublished).length);
	let totalMateris     = $derived(data.tracks.reduce((acc, t) => acc + (t.materiCount || 0), 0));
	let inspectedTrack   = $derived(inspectingTrackId ? data.tracks.find((t) => t.id === inspectingTrackId) ?? null : null);

	// ── Nav items ──────────────────────────────────────────────────────
	const navItems = [
		{
			href: '/mentor',
			label: 'Dashboard',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
		},
		{
			href: '/mentor/kurikulum',
			label: 'Kurikulum',
			active: true,
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
		},
		{
			href: '/mentor/pertemuan',
			label: 'Pertemuan',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
		},
		{
			href: '/mentor/siswa',
			label: 'Data Siswa',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
		},
		{
			href: '/mentor/grading',
			label: 'Grading Tugas',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
		},
	];

	// ── Keyboard shortcuts ─────────────────────────────────────────────
	function handleGlobalKeyDown(e: KeyboardEvent) {
		const tgt = e.target;
		if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || tgt instanceof HTMLSelectElement) return;
		if (e.key === '/') { e.preventDefault(); searchInputEl?.focus(); }
		if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); showAddModal = true; }
		if (e.key === '[') { e.preventDefault(); sidebarCollapsed = !sidebarCollapsed; }
	}

	function clearFilters() {
		searchQuery = '';
		selectedTingkat = null;
		selectedStatus = 'all';
	}
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<svelte:head>
	<title>Kurikulum — Portal Mentor NLC</title>
</svelte:head>

<div class="page-shell">
	<!-- ══════════════════════════════════════════════════
	     COLLAPSIBLE SIDEBAR
	     ══════════════════════════════════════════════════ -->
	<aside class="sidebar" class:sidebar--collapsed={sidebarCollapsed} aria-label="Navigasi Mentor">
		<!-- Brand -->
		<div class="sidebar__brand">
			{#if !sidebarCollapsed}
				<div class="brand-mark">NLC</div>
				<div class="brand-sub">Portal Mentor</div>
			{:else}
				<div class="brand-mark brand-mark--sm">N</div>
			{/if}
		</div>

		<!-- Nav items -->
		<nav class="sidebar__nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:nav-item--active={item.active}
					title={sidebarCollapsed ? item.label : undefined}
					aria-current={item.active ? 'page' : undefined}
				>
					<span class="nav-item__icon">{@html item.icon}</span>
					{#if !sidebarCollapsed}
						<span class="nav-item__label">{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- User section (pinned to bottom) -->
		<div class="sidebar__user">
			<hr class="rule" />
			{#if sidebarCollapsed}
				<div class="user-avatar-sm" title={user?.fullName}>
					{user?.fullName?.charAt(0) ?? 'M'}
				</div>
			{:else}
				<div class="user-card">
					<div class="user-avatar">{user?.fullName?.charAt(0) ?? 'M'}</div>
					<div class="user-info">
						<div class="user-name">{user?.fullName}</div>
						<div class="user-role">Mentor Aktif</div>
					</div>
				</div>
				<a href="/logout" class="logout-btn" aria-label="Keluar">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
						<polyline points="16 17 21 12 16 7"/>
						<line x1="21" y1="12" x2="9" y2="12"/>
					</svg>
					Keluar
				</a>
			{/if}
		</div>

		<!-- Collapse toggle button -->
		<button
			class="collapse-btn"
			onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
			aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			title="Toggle sidebar [ ]"
		>
			{#if sidebarCollapsed}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="9 18 15 12 9 6"/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="15 18 9 12 15 6"/>
				</svg>
			{/if}
		</button>
	</aside>

	<!-- ══════════════════════════════════════════════════
	     MAIN CONTENT
	     ══════════════════════════════════════════════════ -->
	<div class="main-wrapper">
		<!-- Topbar -->
		<header class="topbar">
			<div class="topbar__left">
				<nav class="breadcrumb" aria-label="Breadcrumb">
					<a href="/mentor" class="bc-link">Dashboard</a>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
					<span class="bc-current">Kurikulum</span>
				</nav>
				<h1 class="page-title">Kurikulum & Track Pembelajaran</h1>
			</div>
			<div class="topbar__right">
				<button
					id="btn-buat-track"
					onclick={() => (showAddModal = true)}
					class="btn-create"
					aria-label="Buat track kurikulum baru (Alt+N)"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19"/>
						<line x1="5" y1="12" x2="19" y2="12"/>
					</svg>
					<span>Buat Track</span>
					<kbd aria-hidden="true">Alt+N</kbd>
				</button>
			</div>
		</header>

		<!-- Scrollable content area -->
		<div class="content-area">

			<!-- ── Notifications ────────────────────────── -->
			{#if form?.error}
				<div class="notif notif--error" role="alert">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					{form.error}
				</div>
			{/if}
			{#if form?.success}
				<div class="notif notif--success" role="status">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					{form.message}
				</div>
			{/if}

			<!-- ── Stat cards ────────────────────────────── -->
			<div class="stats-row">
				<div class="stat-card">
					<div class="stat-card__icon" style="background:#e0e7ff;color:#4f46e5;">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
					</div>
					<div>
						<div class="stat-card__label">Total Track</div>
						<div class="stat-card__value">{totalTracks}</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card__icon" style="background:#dcfce7;color:#16a34a;">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					</div>
					<div>
						<div class="stat-card__label">Published</div>
						<div class="stat-card__value" style="color:#16a34a;">{publishedTracks}</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card__icon" style="background:#fef3c7;color:#d97706;">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					</div>
					<div>
						<div class="stat-card__label">Draft</div>
						<div class="stat-card__value" style="color:#d97706;">{draftTracks}</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card__icon" style="background:#f3e8ff;color:#9333ea;">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
					</div>
					<div>
						<div class="stat-card__label">Total Materi</div>
						<div class="stat-card__value">{totalMateris}</div>
					</div>
				</div>
			</div>

			<!-- ── Search & filter bar ───────────────────── -->
			<div class="filter-bar">
				<div class="search-row">
					<div class="search-wrap">
						<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input
							bind:this={searchInputEl}
							type="search"
							bind:value={searchQuery}
							placeholder='Cari judul track atau tingkat…'
							class="search-input"
							aria-label="Cari kurikulum"
						/>
						<kbd class="search-hint" aria-hidden="true">/</kbd>
					</div>

					{#if searchQuery || selectedTingkat !== null || selectedStatus !== 'all'}
						<button onclick={clearFilters} class="clear-btn" aria-label="Reset semua filter">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							Reset
						</button>
					{/if}
				</div>

				<div class="filter-chips-row">
					<!-- Tingkat filter -->
					<div class="filter-group" role="group" aria-label="Filter tingkat">
						<span class="filter-label">Tingkat</span>
						<button
							onclick={() => (selectedTingkat = null)}
							class="chip"
							class:chip--active={selectedTingkat === null}
						>Semua</button>
						{#each data.tingkatList as t}
							<button
								onclick={() => (selectedTingkat = t.id)}
								class="chip"
								class:chip--active={selectedTingkat === t.id}
							>{t.name}</button>
						{/each}
					</div>

					<div class="filter-divider" aria-hidden="true"></div>

					<!-- Status filter -->
					<div class="filter-group" role="group" aria-label="Filter status">
						<span class="filter-label">Status</span>
						{#each [['all', 'Semua'], ['published', 'Published'], ['draft', 'Draft']] as [val, lbl]}
							<button
								onclick={() => (selectedStatus = val as typeof selectedStatus)}
								class="chip"
								class:chip--active={selectedStatus === val}
							>{lbl}</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- ── Track grid ─────────────────────────────── -->
			{#if filteredTracks.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
					</div>
					<h3 class="empty-title">Tidak ada track ditemukan</h3>
					<p class="empty-sub">
						{#if searchQuery || selectedTingkat !== null || selectedStatus !== 'all'}
							Tidak ada track yang sesuai filter. Coba ubah kriteria pencarian.
						{:else}
							Belum ada track kurikulum. Buat track pertama untuk memulai.
						{/if}
					</p>
					{#if searchQuery || selectedTingkat !== null || selectedStatus !== 'all'}
						<button onclick={clearFilters} class="btn-ghost" style="width:auto;padding:9px 20px;">Reset Filter</button>
					{:else}
						<button onclick={() => (showAddModal = true)} class="btn-create" style="width:auto;">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
							Buat Track Pertama
						</button>
					{/if}
				</div>
			{:else}
				<p class="result-count">{filteredTracks.length} track ditemukan</p>
				<div class="track-grid" role="list">
					{#each filteredTracks as track (track.id)}
						<article class="track-card" role="listitem">
							<!-- Card top row: id + status toggle -->
							<div class="track-card__top">
								<span class="track-id">TRK-{String(track.id).padStart(3, '0')} · {track.tingkatName}</span>
								<form method="POST" action="?/togglePublish" use:enhance>
									<input type="hidden" name="id" value={track.id} />
									<input type="hidden" name="isPublished" value={track.isPublished} />
									<button
										type="submit"
										class="status-toggle"
										class:status-toggle--pub={track.isPublished}
										title="Klik untuk ubah status publikasi"
									>
										{#if track.isPublished}
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
											Published
										{:else}
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
											Draft
										{/if}
									</button>
								</form>
							</div>

							<!-- Title & desc -->
							<h2 class="track-card__title">{track.title}</h2>
							{#if track.description}
								<p class="track-card__desc">{track.description}</p>
							{/if}

							<!-- Mini metrics -->
							<div class="track-metrics">
								<div class="track-metric">
									<span class="track-metric__val">{track.phaseCount}</span>
									<span class="track-metric__key">Fase</span>
								</div>
								<div class="track-metric-sep" aria-hidden="true"></div>
								<div class="track-metric">
									<span class="track-metric__val">{track.subPhaseCount}</span>
									<span class="track-metric__key">Sub-fase</span>
								</div>
								<div class="track-metric-sep" aria-hidden="true"></div>
								<div class="track-metric">
									<span class="track-metric__val">{track.materiCount}</span>
									<span class="track-metric__key">Materi</span>
								</div>
							</div>

							<!-- Actions -->
							<div class="track-card__actions">
								<button
									type="button"
									onclick={() => (inspectingTrackId = track.id)}
									class="btn-ghost"
									style="padding:7px 14px;font-size:12px;"
									aria-label="Inspect track {track.title}"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
									Inspect
								</button>

								<div style="display:flex;gap:8px;">
									<form method="POST" action="?/deleteTrack" use:enhance>
										<input type="hidden" name="id" value={track.id} />
										<button
											type="submit"
											onclick={(e) => !confirm(`Hapus Track "${track.title}"?`) && e.preventDefault()}
											class="btn-delete"
											aria-label="Hapus track {track.title}"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
										</button>
									</form>

									<a
										href="/mentor/kurikulum/{track.id}"
										class="btn-manage"
										aria-label="Kelola track {track.title}"
									>
										Kelola
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
									</a>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}

		</div><!-- /content-area -->
	</div><!-- /main-wrapper -->
</div><!-- /page-shell -->

<!-- ══════════════════════════════════════════════════
     INSPECTION DRAWER
     ══════════════════════════════════════════════════ -->
{#if inspectedTrack}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="drawer-scrim"
		onclick={(e) => e.target === e.currentTarget && (inspectingTrackId = null)}
		role="dialog"
		aria-modal="true"
		aria-label="Detail track kurikulum"
	>
		<aside class="drawer">
			<div class="drawer__header">
				<div>
					<span class="badge badge-live">INSPECTOR</span>
					<div class="type-mono text-muted" style="margin-top:4px;font-size:10px;">TRK-{String(inspectedTrack.id).padStart(3,'0')}</div>
				</div>
				<button onclick={() => (inspectingTrackId = null)} class="btn-ghost" style="padding:6px 12px;font-size:12px;" aria-label="Tutup drawer">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					Tutup
				</button>
			</div>

			<div class="drawer__body">
				<div class="drawer-section">
					<div class="drawer-section__label">Judul Kurikulum</div>
					<h3 class="drawer-section__title">{inspectedTrack.title}</h3>
					<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
						<span class="badge badge-live">{inspectedTrack.tingkatName}</span>
						<span class="badge {inspectedTrack.isPublished ? 'badge-hadir' : 'badge-pending'}">{inspectedTrack.isPublished ? 'Published' : 'Draft'}</span>
					</div>
				</div>

				{#if inspectedTrack.description}
					<div class="drawer-section">
						<div class="drawer-section__label">Deskripsi Silabus</div>
						<p class="drawer-desc">{inspectedTrack.description}</p>
					</div>
				{/if}

				<div class="drawer-section">
					<div class="drawer-section__label">Ringkasan Struktur</div>
					<div class="drawer-metrics">
						<div class="drawer-metric">
							<div class="drawer-metric__val">{inspectedTrack.phaseCount}</div>
							<div class="drawer-metric__key">Fase</div>
						</div>
						<div class="drawer-metric">
							<div class="drawer-metric__val">{inspectedTrack.subPhaseCount}</div>
							<div class="drawer-metric__key">Sub-Fase</div>
						</div>
						<div class="drawer-metric">
							<div class="drawer-metric__val">{inspectedTrack.materiCount}</div>
							<div class="drawer-metric__key">Materi</div>
						</div>
					</div>
				</div>
			</div>

			<div class="drawer__footer">
				<button onclick={() => (inspectingTrackId = null)} class="btn-ghost" style="flex:1;">Tutup</button>
				<a href="/mentor/kurikulum/{inspectedTrack.id}" class="btn-manage" style="flex:2;justify-content:center;">
					Buka Builder
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
				</a>
			</div>
		</aside>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════
     CREATE TRACK MODAL
     ══════════════════════════════════════════════════ -->
{#if showAddModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-scrim"
		onclick={(e) => e.target === e.currentTarget && (showAddModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Buat track kurikulum baru"
	>
		<div class="modal">
			<div class="modal__header">
				<div>
					<h2 class="modal__title">Buat Track Kurikulum</h2>
					<p class="modal__sub">Isi informasi dasar untuk track baru.</p>
				</div>
				<button onclick={() => (showAddModal = false)} class="modal-close" aria-label="Tutup modal">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<form method="POST" action="?/createTrack" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showAddModal = false;
				};
			}}>
				<div class="modal__body">
					<div class="field-group-m">
						<label for="tingkatId" class="field-label">Tingkat Kelas <span aria-hidden="true">*</span></label>
						<select id="tingkatId" name="tingkatId" required class="field-input select-input">
							<option value="">— Pilih Tingkat Kelas —</option>
							{#each data.tingkatList as t}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>

					<div class="field-group-m">
						<label for="title" class="field-label">Judul Track <span aria-hidden="true">*</span></label>
						<input
							type="text"
							id="title"
							name="title"
							required
							placeholder="Contoh: Dasar Jaringan & Cisco Packet Tracer"
							class="field-input"
						/>
					</div>

					<div class="field-group-m">
						<label for="description" class="field-label">Deskripsi Silabus <span class="opt-label">Opsional</span></label>
						<textarea
							id="description"
							name="description"
							rows="3"
							placeholder="Penjelasan singkat cakupan kurikulum ini…"
							class="field-input"
							style="resize:vertical;"
						></textarea>
					</div>
				</div>

				<div class="modal__footer">
					<button type="button" onclick={() => (showAddModal = false)} class="btn-ghost">Batal</button>
					<button type="submit" class="btn-manage" style="width:auto;padding:10px 24px;">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
						Simpan Track
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* ── Page shell layout ─────────────────────────── */
	.page-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	/* ── Sidebar ─────────────────────────────────────── */
	.sidebar {
		width: 260px;
		min-height: 100vh;
		background: #ffffff;
		border-right: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 40;
	}

	.sidebar--collapsed {
		width: 68px;
	}

	/* Brand area */
	.sidebar__brand {
		padding: 20px 18px 16px;
		border-bottom: 1px solid var(--border-hard);
		min-height: 72px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow: hidden;
	}

	.brand-mark {
		font-family: var(--font-macro);
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--primary);
		letter-spacing: -0.03em;
		white-space: nowrap;
	}

	.brand-mark--sm {
		font-size: 1.15rem;
		text-align: center;
	}

	.brand-sub {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-muted);
		margin-top: 3px;
		white-space: nowrap;
	}

	/* Nav */
	.sidebar__nav {
		flex: 1;
		padding: 12px 10px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		overflow: hidden;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 10px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		white-space: nowrap;
		transition: background 150ms ease, color 150ms ease;
		min-height: 40px;
	}

	.nav-item:hover {
		background: var(--primary-light);
		color: var(--primary);
	}

	.nav-item--active {
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: #ffffff;
		box-shadow: var(--shadow-glow);
	}

	.nav-item--active:hover {
		background: linear-gradient(135deg, #4338ca, #4f46e5);
		color: #ffffff;
	}

	.nav-item__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
	}

	.nav-item__label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* User section pinned to bottom */
	.sidebar__user {
		padding: 12px 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow: hidden;
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.user-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: white;
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-avatar-sm {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: white;
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 8px auto 0;
		cursor: default;
	}

	.user-info {
		overflow: hidden;
	}

	.user-name {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-role {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		border: 1px solid var(--border-hard);
		background: #f8fafc;
		transition: all 150ms ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.logout-btn:hover {
		background: #fee2e2;
		border-color: #fca5a5;
		color: #dc2626;
	}

	/* Collapse toggle button */
	.collapse-btn {
		position: absolute;
		top: 22px;
		right: -13px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1.5px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: color 150ms ease, background 150ms ease, transform 150ms ease;
		z-index: 10;
	}

	.collapse-btn:hover {
		background: var(--primary-light);
		color: var(--primary);
		transform: scale(1.1);
	}

	/* ── Main wrapper ──────────────────────────────── */
	.main-wrapper {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* ── Topbar ────────────────────────────────────── */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 16px 28px;
		border-bottom: 1px solid var(--border-hard);
		background: rgba(255,255,255,0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		position: sticky;
		top: 0;
		z-index: 30;
	}

	.topbar__left {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.25rem, 3vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.topbar__right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.btn-create {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: linear-gradient(135deg, #4338ca, #4f46e5 60%, #6366f1);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		text-decoration: none;
		box-shadow: var(--shadow-glow);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(79,70,229,0.45);
	}

	.btn-create:active {
		transform: scale(0.98);
	}

	.btn-create kbd {
		background: rgba(255,255,255,0.2);
		border: 1px solid rgba(255,255,255,0.3);
		border-radius: 5px;
		padding: 1px 5px;
		font-size: 10px;
		font-family: var(--font-mono);
		font-weight: 600;
	}

	/* ── Content area ──────────────────────────────── */
	.content-area {
		flex: 1;
		padding: 24px 28px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1300px;
		width: 100%;
	}

	/* ── Notifications ──────────────────────────────── */
	.notif {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
	}

	.notif--error {
		background: var(--red-dim);
		border: 1px solid var(--red-border);
		color: var(--red);
	}

	.notif--success {
		background: var(--green-dim);
		border: 1px solid var(--green-border);
		color: var(--green-live);
	}

	/* ── Stats row ─────────────────────────────────── */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	@media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2,1fr); } }
	@media (max-width: 560px) { .stats-row { grid-template-columns: 1fr 1fr; } }

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-card__icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.025em;
	}

	/* ── Filter bar ─────────────────────────────────── */
	.filter-bar {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 14px 16px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.search-wrap {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: var(--text-ghost);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-primary);
		padding: 9px 40px 9px 38px;
		outline: none;
		transition: border-color 200ms ease, box-shadow 200ms ease;
	}

	.search-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
		background: #ffffff;
	}

	.search-hint {
		position: absolute;
		right: 10px;
		background: var(--bg-cell);
		border: 1px solid var(--border-hard);
		border-radius: 5px;
		padding: 1px 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.clear-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 7px 12px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.clear-btn:hover {
		border-color: #fca5a5;
		color: var(--red);
		background: var(--red-dim);
	}

	.filter-chips-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		border-top: 1px solid var(--border-hard);
		padding-top: 12px;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.filter-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.filter-divider {
		width: 1px;
		height: 20px;
		background: var(--border-hard);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 11px;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.chip:hover {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--primary-light);
	}

	.chip--active {
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		border-color: transparent;
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(79,70,229,0.25);
	}

	.chip--active:hover {
		color: #ffffff;
	}

	/* ── Result count ──────────────────────────────── */
	.result-count {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	/* ── Track grid ─────────────────────────────────── */
	.track-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 1100px) { .track-grid { grid-template-columns: repeat(2,1fr); } }
	@media (max-width: 680px)  { .track-grid { grid-template-columns: 1fr; } }

	.track-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: var(--shadow-sm);
		transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
	}

	.track-card:hover {
		border-color: var(--border-accent);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.track-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.track-id {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.03em;
	}

	/* Status toggle button */
	.status-toggle {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		border: 1.5px solid var(--amber-border);
		background: var(--amber-dim);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: #b45309;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: all 150ms ease;
	}

	.status-toggle--pub {
		border-color: var(--green-border);
		background: var(--green-dim);
		color: #047857;
	}

	.status-toggle:hover {
		transform: scale(1.04);
	}

	.track-card__title {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	.track-card__desc {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.55;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin: 0;
	}

	/* Mini metrics */
	.track-metrics {
		display: flex;
		align-items: center;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 10px 0;
		flex-shrink: 0;
	}

	.track-metric {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.track-metric__val {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}

	.track-metric__key {
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.track-metric-sep {
		width: 1px;
		height: 28px;
		background: var(--border-hard);
	}

	/* Actions row */
	.track-card__actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding-top: 10px;
		border-top: 1px solid var(--border-hard);
		margin-top: auto;
	}

	.btn-delete {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.btn-delete:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	.btn-manage {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(79,70,229,0.2);
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.btn-manage:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79,70,229,0.3);
	}

	/* ── Empty state ────────────────────────────────── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 56px 24px;
		background: #ffffff;
		border: 1px dashed var(--border-hard);
		border-radius: var(--radius-lg);
	}

	.empty-icon {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		background: var(--bg-cell);
		color: var(--text-ghost);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.empty-sub {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.6;
		max-width: 360px;
		margin-bottom: 20px;
	}

	/* ── Drawer ─────────────────────────────────────── */
	.drawer-scrim {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(15, 23, 42, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: stretch;
		justify-content: flex-end;
	}

	.drawer {
		width: 100%;
		max-width: 420px;
		background: #ffffff;
		border-left: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		box-shadow: -8px 0 40px rgba(15,23,42,0.08);
		animation: slideIn 220ms cubic-bezier(0.4,0,0.2,1);
	}

	@keyframes slideIn {
		from { transform: translateX(100%); opacity: 0; }
		to   { transform: translateX(0);   opacity: 1; }
	}

	.drawer__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-hard);
		position: sticky;
		top: 0;
		background: #ffffff;
		z-index: 1;
	}

	.drawer__body {
		flex: 1;
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.drawer-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.drawer-section__label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.drawer-section__title {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.drawer-desc {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.65;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px;
	}

	.drawer-metrics {
		display: grid;
		grid-template-columns: repeat(3,1fr);
		gap: 10px;
	}

	.drawer-metric {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px;
		text-align: center;
	}

	.drawer-metric__val {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}

	.drawer-metric__key {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		margin-top: 4px;
		text-transform: uppercase;
	}

	.drawer__footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-hard);
		display: flex;
		gap: 10px;
		position: sticky;
		bottom: 0;
		background: #ffffff;
	}

	/* ── Modal ──────────────────────────────────────── */
	.modal-scrim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.modal {
		width: 100%;
		max-width: 500px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 24px;
		box-shadow: 0 24px 64px rgba(15,23,42,0.12);
		overflow: hidden;
		animation: popIn 200ms cubic-bezier(0.34,1.56,0.64,1);
	}

	@keyframes popIn {
		from { transform: scale(0.92); opacity: 0; }
		to   { transform: scale(1);    opacity: 1; }
	}

	.modal__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 22px 24px 18px;
		border-bottom: 1px solid var(--border-hard);
	}

	.modal__title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 3px;
	}

	.modal__sub {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.modal-close {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 150ms ease;
	}

	.modal-close:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	.modal__body {
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal__footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
	}

	.field-group-m {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.opt-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		background: var(--bg-cell);
		border-radius: 5px;
		padding: 1px 6px;
		margin-left: 4px;
	}

	.select-input {
		appearance: none;
		-webkit-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 14px center;
		padding-right: 36px;
	}

	/* ── Responsive ─────────────────────────────────── */
	@media (max-width: 767px) {
		.sidebar { display: none; }
		.topbar { padding: 14px 16px; }
		.content-area { padding: 16px 16px 40px; }
		.btn-create span { display: none; }
		.btn-create kbd { display: none; }
		.btn-create { padding: 10px; }
	}
</style>

<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Search and filter state
	let searchQuery = $state('');
	let selectedTingkatFilter = $state<string>('all');

	// Available tingkat list from database or tracks
	let availableTingkats = $derived.by(() => {
		if (data.allTingkats && data.allTingkats.length > 0) {
			return data.allTingkats.map((t) => t.name);
		}
		const fromTracks = Array.from(new Set(data.tracks.map((t) => t.tingkatName).filter(Boolean))) as string[];
		return fromTracks.length > 0 ? fromTracks : ['X', 'XI', 'XII'];
	});

	function formatTingkatLabel(name: string | null | undefined): string {
		if (!name) return '';
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

	// Filtered tracks by search query and tingkat
	let filteredTracks = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		return data.tracks.filter((t) => {
			// Tingkat filter
			if (selectedTingkatFilter !== 'all' && t.tingkatName !== selectedTingkatFilter) {
				return false;
			}
			// Search query filter
			if (!q) return true;
			return (
				t.title.toLowerCase().includes(q) ||
				(t.description && t.description.toLowerCase().includes(q)) ||
				(t.tingkatName && t.tingkatName.toLowerCase().includes(q)) ||
				(t.tingkatName && formatTingkatLabel(t.tingkatName).toLowerCase().includes(q))
			);
		});
	});
</script>

<svelte:head>
	<title>Katalog Materi — Nesaga Learning Community</title>
	<meta name="description" content="Jelajahi track pembelajaran yang tersedia di Nesaga Learning Community." />
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     1. HEADER CARD
	     ══════════════════════════════════════════════════════════ -->
	<div class="catalog-header panel">
		<div class="catalog-header-top">
			<a href="/" class="back-link">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				<span>Beranda</span>
			</a>
			<span class="badge badge-neutral">{data.totalTracks} Track Tersedia</span>
		</div>
		<div class="catalog-header-main">
			<h1 class="catalog-title">Katalog Materi Pembelajaran</h1>
			<p class="catalog-sub">Jelajahi track pembelajaran yang dipublikasikan. Baca modul secara bebas tanpa perlu login.</p>
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     2. SEARCH & FILTER BAR (SATU ROW)
	     ══════════════════════════════════════════════════════════ -->
	<div class="filter-bar-card">
		<!-- Search Input with Search Icon & Clear Button -->
		<div class="search-input-wrapper">
			<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<input
				type="text"
				id="search-materi-input"
				placeholder="Cari track pembelajaran, topik, atau kata kunci..."
				bind:value={searchQuery}
				class="search-input"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="search-clear-btn"
					aria-label="Hapus pencarian"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Filter Buttons / Pills Beside Search Bar -->
		<div class="filter-pills-row" role="tablist" aria-label="Filter tingkatan kelas track">
			<button
				type="button"
				role="tab"
				aria-selected={selectedTingkatFilter === 'all'}
				onclick={() => (selectedTingkatFilter = 'all')}
				class="filter-pill {selectedTingkatFilter === 'all' ? 'filter-pill-active' : ''}"
			>
				<span>Semua Kelas</span>
				<span class="pill-badge">{data.totalTracks}</span>
			</button>
			{#each availableTingkats as tName}
				<button
					type="button"
					role="tab"
					aria-selected={selectedTingkatFilter === tName}
					onclick={() => (selectedTingkatFilter = tName)}
					class="filter-pill {selectedTingkatFilter === tName ? 'filter-pill-active' : ''}"
				>
					<span>{formatTingkatLabel(tName)}</span>
					<span class="pill-badge">{data.tracks.filter((t) => t.tingkatName === tName).length}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     3. TRACK CATALOG GRID
	     ══════════════════════════════════════════════════════════ -->
	{#if filteredTracks.length === 0}
		<div class="panel">
			<EmptyState
				title="Tidak Ada Track Ditemukan"
				description={searchQuery
					? `Tidak ada track pembelajaran yang cocok dengan "${searchQuery}". Coba kata kunci lain atau reset filter.`
					: 'Belum ada track pembelajaran untuk jenjang kelas yang dipilih.'}
				iconTheme="indigo"
				actionText="Reset Semua Filter"
				onAction={() => {
					searchQuery = '';
					selectedTingkatFilter = 'all';
				}}
			>
				{#snippet icon()}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				{/snippet}
			</EmptyState>
		</div>
	{:else}
		<div class="track-catalog-grid">
			{#each filteredTracks as track (track.id)}
				<div class="track-card">
					<!-- Top Meta Row -->
					<div class="track-card-top">
						<div class="flex items-center gap-1.5 flex-wrap">
							{#if track.tingkatName}
								<span class="track-tingkat-badge">
									{formatTingkatLabel(track.tingkatName)}
								</span>
							{/if}
						</div>
						<span class="track-modules-count">
							{data.materiCountMap[track.id] ?? 0} Modul
						</span>
					</div>

					<!-- Title & Desc -->
					<h3 class="track-card-title">{track.title}</h3>
					<p class="track-card-desc">
						{track.description || 'Modul alur pembelajaran Nesaga Learning Community.'}
					</p>

					<!-- Track Stats Info -->
					<div class="track-card-stats-box mt-auto pt-3 border-t border-slate-100">
						<div class="flex items-center justify-between text-xs text-slate-500">
							<span class="font-medium text-slate-600">
								{data.phaseCountMap[track.id] ?? 0} Fase Pembelajaran
							</span>
							<span class="badge badge-neutral">Publik</span>
						</div>
					</div>

					<!-- Action CTA Button -->
					<a href={`/materi/${track.id}`} class="btn-open-track">
						<span>Jelajahi Track Ini</span>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding-top: 24px;
		padding-bottom: 60px;
	}

	/* ══════════════════════════════════════════════════════════
	   1. HEADER CARD
	   ══════════════════════════════════════════════════════════ */
	.catalog-header {
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.catalog-header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.back-link:hover {
		color: var(--primary);
	}

	.catalog-header-main {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.catalog-title {
		font-family: var(--font-macro);
		font-size: clamp(1.2rem, 3vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.catalog-sub {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-muted);
		margin: 0;
	}

	/* ══════════════════════════════════════════════════════════
	   2. SEARCH & FILTER BAR (SATU ROW)
	   ══════════════════════════════════════════════════════════ */
	.filter-bar-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 10px 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.search-input-wrapper {
		position: relative;
		flex: 1;
		min-width: 220px;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: #94a3b8;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 8.5px 34px 8.5px 36px;
		background: #f8fafc;
		border: 1.5px solid #e2e8f0;
		border-radius: 9px;
		font-family: var(--font-body, system-ui, sans-serif);
		font-size: 13px;
		color: #0f172a;
		outline: none;
		transition: all 180ms ease;
		box-sizing: border-box;
	}

	.search-input::placeholder {
		color: #94a3b8;
		font-size: 13px;
	}

	.search-input:hover {
		border-color: #cbd5e1;
		background: #ffffff;
	}

	.search-input:focus {
		border-color: #4f46e5;
		background: #ffffff;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
	}

	.search-clear-btn {
		position: absolute;
		right: 8px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #e2e8f0;
		color: #64748b;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.search-clear-btn:hover {
		background: #cbd5e1;
		color: #0f172a;
	}

	.filter-pills-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 12px;
		border-radius: 9px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: #64748b;
		background: #f8fafc;
		border: 1.5px solid #e2e8f0;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.filter-pill:hover {
		background: #f1f5f9;
		color: #334155;
		border-color: #cbd5e1;
	}

	.filter-pill-active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
	}

	.filter-pill-active:hover {
		background: #4338ca;
		color: #ffffff;
		border-color: #4338ca;
	}

	.pill-badge {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 999px;
		background: #e2e8f0;
		color: #475569;
	}

	.filter-pill-active .pill-badge {
		background: rgba(255, 255, 255, 0.25);
		color: #ffffff;
	}

	/* ══════════════════════════════════════════════════════════
	   3. TRACK CATALOG GRID
	   ══════════════════════════════════════════════════════════ */
	.track-catalog-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}

	.track-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		transition: all 200ms ease;
		position: relative;
		box-sizing: border-box;
	}

	.track-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
		border-color: #cbd5e1;
	}

	.track-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 12px;
	}

	.track-tingkat-badge {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #0369a1;
		background: #e0f2fe;
		border: 1px solid #bae6fd;
		padding: 2.5px 8px;
		border-radius: 6px;
		letter-spacing: 0.02em;
	}

	.track-modules-count {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
	}

	.track-card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
		margin: 0 0 6px;
		line-height: 1.3;
	}

	.track-card-desc {
		font-size: 12.5px;
		color: #475569;
		line-height: 1.5;
		margin: 0 0 16px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.btn-open-track {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		margin-top: 14px;
		padding: 10px 16px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 10px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
		box-sizing: border-box;
	}

	.btn-open-track:hover {
		background: #4338ca;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.filter-bar-card {
			flex-direction: column;
			align-items: stretch;
			padding: 12px;
			gap: 10px;
		}

		.search-input-wrapper {
			min-width: 100%;
		}

		.filter-pills-row {
			width: 100%;
			overflow-x: auto;
			padding-bottom: 2px;
		}
	}

	@media (max-width: 640px) {
		.track-catalog-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

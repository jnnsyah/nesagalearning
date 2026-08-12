<script lang="ts">
	import { enhance } from '$app/forms';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type TrackItem = (typeof data.tracks)[number];

	// ── Form Drawer state ───────────────────────────────────────────────
	let showFormDrawer = $state(false);
	let editingTrack   = $state<TrackItem | null>(null);

	// Reactive Form Bindings
	let formTingkatId   = $state<number | string | null>(null);
	let formTitle       = $state('');
	let formDescription = $state('');
	let formIsPublished = $state(false);

	// ── Inspection Drawer state ─────────────────────────────────────────
	let inspectingTrackId = $state<number | null>(null);

	// ── Filter & Search state ───────────────────────────────────────────
	let searchQuery     = $state('');
	let selectedTingkat = $state<number | null>(null);
	let selectedStatus  = $state<'all' | 'published' | 'draft'>('all');

	// ── Actions ─────────────────────────────────────────────────────────
	function openCreateForm() {
		editingTrack    = null;
		formTingkatId   = null;
		formTitle       = '';
		formDescription = '';
		formIsPublished = false;
		showFormDrawer  = true;
	}

	function openEditForm(track: TrackItem) {
		editingTrack    = track;
		formTingkatId   = track.tingkatId;
		formTitle       = track.title;
		formDescription = track.description ?? '';
		formIsPublished = track.isPublished;
		showFormDrawer  = true;
	}

	function closeFormDrawer() {
		showFormDrawer  = false;
		editingTrack    = null;
		formTingkatId   = null;
		formTitle       = '';
		formDescription = '';
		formIsPublished = false;
	}

	function clearFilters() {
		searchQuery = '';
		selectedTingkat = null;
		selectedStatus = 'all';
	}

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

	let totalTracks     = $derived(data.tracks.length);
	let publishedTracks = $derived(data.tracks.filter((t) => t.isPublished).length);
	let draftTracks     = $derived(data.tracks.filter((t) => !t.isPublished).length);
	let totalMateris    = $derived(data.tracks.reduce((acc, t) => acc + (t.materiCount || 0), 0));
	let inspectedTrack  = $derived(inspectingTrackId ? data.tracks.find((t) => t.id === inspectingTrackId) ?? null : null);

	// ── Keyboard shortcuts ─────────────────────────────────────────────
	function handleGlobalKeyDown(e: KeyboardEvent) {
		const tgt = e.target;
		if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || tgt instanceof HTMLSelectElement) return;
		if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); openCreateForm(); }
		if (e.key === 'Escape') {
			if (showFormDrawer) closeFormDrawer();
			if (inspectingTrackId) inspectingTrackId = null;
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<svelte:head>
	<title>Kurikulum — Portal Mentor NLC</title>
</svelte:head>

<div class="content-area">

	<!-- Header row with page title & action button -->
	<div class="page-header-row">
		<div>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/mentor" class="bc-link">Dashboard</a>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
				<span class="bc-current">Kurikulum</span>
			</nav>
			<h1 class="page-title">Kurikulum & Track Pembelajaran</h1>
		</div>
		<button
			id="btn-buat-track"
			onclick={openCreateForm}
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
			<div style="flex:1;">
				<TextInput
					type="search"
					bind:value={searchQuery}
					placeholder="Cari judul track atau tingkat…"
					clearable
				/>
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
				<button onclick={openCreateForm} class="btn-create" style="width:auto;">
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
						<div style="display:flex;gap:6px;">
							<button
								type="button"
								onclick={() => (inspectingTrackId = track.id)}
								class="btn-ghost"
								style="padding:6px 10px;font-size:12px;"
								aria-label="Inspect track {track.title}"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
								Inspect
							</button>

							<button
								type="button"
								onclick={() => openEditForm(track)}
								class="btn-ghost"
								style="padding:6px 10px;font-size:12px;"
								aria-label="Edit track {track.title}"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								Edit
							</button>
						</div>

						<div style="display:flex;gap:6px;">
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
				<button onclick={() => { const tr = inspectedTrack; inspectingTrackId = null; if (tr) openEditForm(tr); }} class="btn-ghost" style="flex:1;">
					Edit
				</button>
				<a href="/mentor/kurikulum/{inspectedTrack.id}" class="btn-manage" style="flex:2;justify-content:center;">
					Buka Builder
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
				</a>
			</div>
		</aside>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════
     ADD / EDIT TRACK SLIDER DRAWER WITH CUSTOM UI COMPONENTS
     ══════════════════════════════════════════════════ -->
{#if showFormDrawer}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="form-scrim"
		onclick={(e) => e.target === e.currentTarget && closeFormDrawer()}
		role="dialog"
		aria-modal="true"
		aria-label={editingTrack ? 'Edit track kurikulum' : 'Buat track kurikulum baru'}
	>
		<aside class="form-drawer">
			<!-- Mobile drag handle pill -->
			<div class="mobile-drag-handle hide-desktop" aria-hidden="true"></div>

			<!-- Drawer Header -->
			<div class="form-drawer__header">
				<div>
					<span class="badge {editingTrack ? 'badge-hadir' : 'badge-live'} mb-1">
						{editingTrack ? 'EDIT TRACK' : 'TRACK BARU'}
					</span>
					<h2 class="form-drawer__title">
						{editingTrack ? 'Edit Track Kurikulum' : 'Buat Track Kurikulum Baru'}
					</h2>
					<p class="form-drawer__sub">
						{editingTrack ? 'Perbarui informasi dasar & status publikasi track.' : 'Isi detail informasi dasar untuk track baru.'}
					</p>
				</div>
				<button onclick={closeFormDrawer} class="form-drawer__close" aria-label="Tutup panel">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<!-- Form -->
			<form
				method="POST"
				action={editingTrack ? '?/updateTrack' : '?/createTrack'}
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeFormDrawer();
					};
				}}
				class="form-drawer__form"
			>
				{#if editingTrack}
					<input type="hidden" name="id" value={editingTrack.id} />
				{/if}

				<div class="form-drawer__body">
					<!-- CustomSelect Component for Tingkat Class -->
					<CustomSelect
						name="tingkatId"
						label="Tingkat Kelas"
						required
						bind:value={formTingkatId}
						options={data.tingkatList.map((t) => ({ value: t.id, label: t.name }))}
						placeholder="— Pilih Tingkat Kelas —"
					/>

					<!-- TextInput Component for Track Title -->
					<TextInput
						name="title"
						label="Judul Track"
						required
						bind:value={formTitle}
						placeholder="Contoh: Dasar Jaringan & Cisco Packet Tracer"
						clearable
					/>

					<!-- TextArea Component for Description -->
					<TextArea
						name="description"
						label="Deskripsi Silabus"
						bind:value={formDescription}
						placeholder="Penjelasan singkat cakupan kurikulum dan kompetensi yang dipelajari…"
						rows={4}
						maxlength={300}
					/>

					<!-- ToggleSwitch Component for Publication Status (Edit Mode) -->
					{#if editingTrack}
						<ToggleSwitch
							name="isPublished"
							label="Status Publikasi Track"
							bind:checked={formIsPublished}
							onLabel="Published (Aktif untuk siswa)"
							offLabel="Draft (Hanya terlihat oleh mentor)"
							description="Beralih ke Published agar materi dapat langsung diakses siswa."
						/>
					{/if}
				</div>

				<!-- Drawer Footer (Sticky bottom) -->
				<div class="form-drawer__footer">
					<button type="button" onclick={closeFormDrawer} class="btn-ghost" style="flex:1;">
						Batal
					</button>
					<button type="submit" class="btn-create" style="flex:2;justify-content:center;">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
						{editingTrack ? 'Simpan Perubahan' : 'Simpan Track Baru'}
					</button>
				</div>
			</form>
		</aside>
	</div>
{/if}

<style>
	/* ── Content area ──────────────────────────────── */
	.content-area {
		padding: 24px 28px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1300px;
		margin: 0 auto;
		width: 100%;
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
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
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
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

	/* ── Inspection Drawer ─────────────────────────── */
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

	/* ── Add / Edit Form Slider Drawer ─────────────────
	   Desktop: Slides from Right
	   Mobile: Slides from Bottom
	   ──────────────────────────────────────────────── */
	.form-scrim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: stretch;
		justify-content: flex-end;
	}

	.form-drawer {
		width: 100%;
		max-width: 480px;
		background: #ffffff;
		border-left: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		box-shadow: -12px 0 48px rgba(15, 23, 42, 0.12);
		animation: slideFromRight 240ms cubic-bezier(0.16, 1, 0.3, 1);
		height: 100vh;
		overflow: hidden;
	}

	@keyframes slideFromRight {
		from { transform: translateX(100%); }
		to   { transform: translateX(0); }
	}

	.mobile-drag-handle {
		width: 36px;
		height: 4px;
		border-radius: 9999px;
		background: var(--border-hard);
		margin: 12px auto 4px;
		flex-shrink: 0;
	}

	.form-drawer__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 22px 24px 18px;
		border-bottom: 1px solid var(--border-hard);
		flex-shrink: 0;
		background: #ffffff;
	}

	.form-drawer__title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 3px;
		line-height: 1.25;
	}

	.form-drawer__sub {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.form-drawer__close {
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

	.form-drawer__close:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	.form-drawer__form {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.form-drawer__body {
		flex: 1;
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		overflow-y: auto;
	}

	.form-drawer__footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		gap: 12px;
		background: #ffffff;
		flex-shrink: 0;
	}

	/* ── Mobile Layout Adjustment (<768px): Slide from Bottom ── */
	@media (max-width: 767px) {
		.content-area { padding: 16px 16px 40px; }
		.btn-create span { display: none; }
		.btn-create kbd { display: none; }
		.btn-create { padding: 10px; }

		.form-scrim {
			align-items: flex-end;
			justify-content: center;
		}

		.form-drawer {
			max-width: 100%;
			height: auto;
			max-height: 88vh;
			border-left: none;
			border-top: 1px solid var(--border-hard);
			border-radius: 24px 24px 0 0;
			box-shadow: 0 -12px 48px rgba(15, 23, 42, 0.15);
			animation: slideFromBottom 240ms cubic-bezier(0.16, 1, 0.3, 1);
		}

		@keyframes slideFromBottom {
			from { transform: translateY(100%); }
			to   { transform: translateY(0); }
		}
	}
</style>

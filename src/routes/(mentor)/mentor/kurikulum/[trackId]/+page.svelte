<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Slider Drawer States (Right on desktop, Bottom on mobile) ──────
	let drawerType = $state<'track' | 'phase' | 'subPhase' | 'materi' | null>(null);
	let drawerMode = $state<'create' | 'edit'>('create');
	let targetId   = $state<number | null>(null);

	// Contextual parent IDs for subphase & materi creation
	let parentPhaseId    = $state<number | null>(null);
	let parentSubPhaseId = $state<number | null>(null);

	// Form input bindings
	let formTitle       = $state('');
	let formDescription = $state('');
	let formTingkatId   = $state<number | string | null>(null);
	let formIsPublished = $state(false);

	// ── Drawer Handlers ────────────────────────────────────────────────
	function openEditTrackDrawer() {
		drawerType      = 'track';
		drawerMode      = 'edit';
		targetId        = data.track.id;
		formTitle       = data.track.title;
		formDescription = data.track.description ?? '';
		formTingkatId   = data.track.tingkatId;
		formIsPublished = data.track.isPublished;
	}

	function openCreatePhaseDrawer() {
		drawerType      = 'phase';
		drawerMode      = 'create';
		targetId        = null;
		formTitle       = '';
		formDescription = '';
	}

	function openEditPhaseDrawer(p: { id: number; title: string; description: string | null }) {
		drawerType      = 'phase';
		drawerMode      = 'edit';
		targetId        = p.id;
		formTitle       = p.title;
		formDescription = p.description ?? '';
	}

	function openCreateSubPhaseDrawer(phaseId: number) {
		drawerType      = 'subPhase';
		drawerMode      = 'create';
		parentPhaseId   = phaseId;
		targetId        = null;
		formTitle       = '';
		formDescription = '';
	}

	function openEditSubPhaseDrawer(sp: { id: number; title: string; description: string | null }) {
		drawerType      = 'subPhase';
		drawerMode      = 'edit';
		targetId        = sp.id;
		formTitle       = sp.title;
		formDescription = sp.description ?? '';
	}

	function openCreateMateriDrawer(subPhaseId: number) {
		drawerType       = 'materi';
		drawerMode       = 'create';
		parentSubPhaseId = subPhaseId;
		targetId         = null;
		formTitle        = '';
		formDescription  = '';
	}

	function closeDrawer() {
		drawerType       = null;
		targetId         = null;
		parentPhaseId    = null;
		parentSubPhaseId = null;
		formTitle        = '';
		formDescription  = '';
	}

	// Quick Preview Modal State
	let previewMateri = $state<{ title: string; content: string | null; id: number } | null>(null);

	// Collapsible Phases State
	let expandedPhases = $state<Record<number, boolean>>({});

	// Initialize all phases expanded by default
	$effect(() => {
		if (data.track?.phases) {
			const map: Record<number, boolean> = {};
			data.track.phases.forEach((p) => {
				map[p.id] = expandedPhases[p.id] !== undefined ? expandedPhases[p.id] : true;
			});
			expandedPhases = map;
		}
	});

	function togglePhase(phaseId: number) {
		expandedPhases[phaseId] = !expandedPhases[phaseId];
	}

	function setAllPhasesExpanded(expanded: boolean) {
		const map: Record<number, boolean> = {};
		data.track.phases.forEach((p) => {
			map[p.id] = expanded;
		});
		expandedPhases = map;
	}

	// Reordering State
	let isReordering = $state(false);

	async function moveItem(
		type: 'phase' | 'subPhase' | 'materi',
		parentId: number,
		items: { id: number }[],
		index: number,
		direction: 'up' | 'down'
	) {
		if (isReordering) return;
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= items.length) return;

		isReordering = true;
		const copy = [...items.map((i) => i.id)];
		const temp = copy[index];
		copy[index] = copy[targetIndex];
		copy[targetIndex] = temp;

		try {
			const res = await fetch('/api/mentor/kurikulum/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, parentId, orderedIds: copy })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				alert('Gagal melakukan reorder');
			}
		} catch (err) {
			console.error(err);
			alert('Terjadi kesalahan koneksi saat reorder');
		} finally {
			isReordering = false;
		}
	}

	// Calculate totals
	let totalSubPhases = $derived(
		data.track.phases.reduce((acc, p) => acc + p.subPhases.length, 0)
	);
	let totalMateris = $derived(
		data.track.phases.reduce(
			(acc, p) => acc + p.subPhases.reduce((sAcc, sp) => sAcc + sp.materis.length, 0),
			0
		)
	);

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (drawerType) closeDrawer();
			if (previewMateri) previewMateri = null;
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<title>{data.track.title} — Builder Kurikulum NLC</title>
</svelte:head>

<div class="content-area">

	<!-- ═══════════════════════════════════════════════════════
	     HEADER & BREADCRUMBS
	     ═══════════════════════════════════════════════════════ -->
	<div class="page-header-row">
		<div>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/mentor" class="bc-link">Dashboard</a>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
				<a href="/mentor/kurikulum" class="bc-link">Kurikulum</a>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
				<span class="bc-current">{data.track.title}</span>
			</nav>
			<div class="flex items-center gap-3 mt-1">
				<h1 class="page-title">{data.track.title}</h1>
				<span class="badge {data.track.isPublished ? 'badge-hadir' : 'badge-pending'}">
					{data.track.isPublished ? 'PUBLISHED' : 'DRAFT'}
				</span>
				<span class="badge badge-live">{data.track.tingkatName || 'Tingkat'}</span>
			</div>
			{#if data.track.description}
				<p class="page-sub mt-1">{data.track.description}</p>
			{/if}
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			<a href="/mentor/kurikulum" class="btn-ghost" style="padding: 8px 14px; font-size: 13px;">
				← Kembali
			</a>
			<button onclick={openEditTrackDrawer} class="btn-ghost" style="padding: 8px 14px; font-size: 13px;">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				Edit Track
			</button>
			<button onclick={openCreatePhaseDrawer} class="btn-create">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				<span>Tambah Fase</span>
			</button>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════
	     NOTIFICATIONS
	     ═══════════════════════════════════════════════════════ -->
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

	<!-- ═══════════════════════════════════════════════════════
	     STRUCTURE METRICS BAR
	     ═══════════════════════════════════════════════════════ -->
	<div class="metrics-bar">
		<div class="metrics-bar__left">
			<span class="type-mono text-muted" style="font-size: 11px;">STRUKTUR:</span>
			<div class="metric-pill">
				<span class="metric-pill__val" style="color: var(--primary);">{data.track.phases.length}</span>
				<span class="metric-pill__key">Fase</span>
			</div>
			<div class="metric-pill">
				<span class="metric-pill__val">{totalSubPhases}</span>
				<span class="metric-pill__key">Sub-fase</span>
			</div>
			<div class="metric-pill">
				<span class="metric-pill__val">{totalMateris}</span>
				<span class="metric-pill__key">Materi</span>
			</div>
		</div>

		<div class="metrics-bar__right">
			<button onclick={() => setAllPhasesExpanded(true)} class="btn-ghost" style="padding: 5px 12px; font-size: 11.5px;">
				Expand All
			</button>
			<button onclick={() => setAllPhasesExpanded(false)} class="btn-ghost" style="padding: 5px 12px; font-size: 11.5px;">
				Collapse All
			</button>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════
	     TREE BUILDER (PHASES -> SUB-PHASES -> MATERIS)
	     ═══════════════════════════════════════════════════════ -->
	<div class="tree-container">
		{#if data.track.phases.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
				</div>
				<h3 class="empty-title">Belum Ada Fase</h3>
				<p class="empty-sub">Tambahkan fase pertama untuk mulai menyusun kurikulum track ini.</p>
				<button onclick={openCreatePhaseDrawer} class="btn-create" style="width: auto;">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Tambah Fase Pertama
				</button>
			</div>
		{:else}
			{#each data.track.phases as p, pIdx (p.id)}
				<!-- PHASE CARD -->
				<div class="phase-card">
					<!-- Phase Header -->
					<div class="phase-header">
						<button
							type="button"
							onclick={() => togglePhase(p.id)}
							class="phase-title-btn"
							aria-expanded={expandedPhases[p.id]}
						>
							<span class="chevron-icon" class:chevron-icon--open={expandedPhases[p.id]}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
							</span>
							<span class="badge badge-hadir">FASE {String(p.sortOrder).padStart(2, '0')}</span>
							<div>
								<h2 class="phase-name">{p.title}</h2>
								{#if p.description}
									<p class="phase-desc">{p.description}</p>
								{/if}
							</div>
						</button>

						<div class="phase-actions">
							<!-- Reorder buttons -->
							<div class="reorder-group">
								<button
									onclick={() => moveItem('phase', data.track.id, data.track.phases, pIdx, 'up')}
									disabled={pIdx === 0 || isReordering}
									class="reorder-btn"
									title="Geser Naik"
								>▲</button>
								<button
									onclick={() => moveItem('phase', data.track.id, data.track.phases, pIdx, 'down')}
									disabled={pIdx === data.track.phases.length - 1 || isReordering}
									class="reorder-btn"
									title="Geser Turun"
								>▼</button>
							</div>

							<button onclick={() => openEditPhaseDrawer(p)} class="btn-ghost" style="padding: 5px 12px; font-size: 12px;">
								Edit
							</button>

							<form method="POST" action="?/deletePhase" use:enhance>
								<input type="hidden" name="id" value={p.id} />
								<button
									type="submit"
									onclick={(e) => !confirm(`Hapus Fase "${p.title}" beserta seluruh sub-fase & materinya?`) && e.preventDefault()}
									class="btn-delete"
									aria-label="Hapus Fase {p.title}"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
								</button>
							</form>

							<button onclick={() => openCreateSubPhaseDrawer(p.id)} class="btn-create" style="padding: 6px 12px; font-size: 12px;">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
								<span>Sub-fase</span>
							</button>
						</div>
					</div>

					<!-- Sub-phases Body -->
					{#if expandedPhases[p.id]}
						<div class="subphases-container">
							{#if p.subPhases.length === 0}
								<div class="subphase-empty">
									Belum ada sub-fase. Klik <strong>"+ Sub-fase"</strong> di atas untuk menambah.
								</div>
							{:else}
								{#each p.subPhases as sp, spIdx (sp.id)}
									<div class="subphase-card">
										<!-- Sub-phase Header -->
										<div class="subphase-header">
											<div class="subphase-title-group">
												<span class="subphase-num">{p.sortOrder}.{sp.sortOrder}</span>
												<span class="subphase-title">{sp.title}</span>
												{#if sp.description}
													<span class="subphase-desc">— {sp.description}</span>
												{/if}
											</div>

											<div class="subphase-actions">
												<div class="reorder-group">
													<button
														onclick={() => moveItem('subPhase', p.id, p.subPhases, spIdx, 'up')}
														disabled={spIdx === 0 || isReordering}
														class="reorder-btn"
														title="Geser Naik"
													>▲</button>
													<button
														onclick={() => moveItem('subPhase', p.id, p.subPhases, spIdx, 'down')}
														disabled={spIdx === p.subPhases.length - 1 || isReordering}
														class="reorder-btn"
														title="Geser Turun"
													>▼</button>
												</div>

												<button onclick={() => openEditSubPhaseDrawer(sp)} class="btn-ghost" style="padding: 4px 10px; font-size: 11px;">
													Edit
												</button>

												<form method="POST" action="?/deleteSubPhase" use:enhance>
													<input type="hidden" name="id" value={sp.id} />
													<button
														type="submit"
														onclick={(e) => !confirm(`Hapus Sub-fase "${sp.title}"?`) && e.preventDefault()}
														class="btn-delete"
														style="width: 28px; height: 28px;"
														aria-label="Hapus Sub-fase {sp.title}"
													>
														<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
													</button>
												</form>

												<button onclick={() => openCreateMateriDrawer(sp.id)} class="btn-ghost" style="padding: 4px 10px; font-size: 11px; color: var(--primary); border-color: var(--border-accent);">
													+ Materi
												</button>
											</div>
										</div>

										<!-- Materis List -->
										<div class="materis-list">
											{#if sp.materis.length === 0}
												<div class="materi-empty">
													Belum ada materi modul.
												</div>
											{:else}
												{#each sp.materis as m, mIdx (m.id)}
													<div class="materi-item">
														<div class="materi-left">
															<span class="materi-badge">M-{m.sortOrder}</span>
															<span class="materi-title">{m.title}</span>
															{#if m.content}
																<span class="badge badge-hadir" style="font-size: 9px;">Ada Konten</span>
															{:else}
																<span class="badge badge-pending" style="font-size: 9px;">Kosong</span>
															{/if}
														</div>

														<div class="materi-right">
															<div class="reorder-group">
																<button
																	onclick={() => moveItem('materi', sp.id, sp.materis, mIdx, 'up')}
																	disabled={mIdx === 0 || isReordering}
																	class="reorder-btn"
																	style="padding: 1px 4px; font-size: 9px;"
																	title="Geser Naik"
																>▲</button>
																<button
																	onclick={() => moveItem('materi', sp.id, sp.materis, mIdx, 'down')}
																	disabled={mIdx === sp.materis.length - 1 || isReordering}
																	class="reorder-btn"
																	style="padding: 1px 4px; font-size: 9px;"
																	title="Geser Turun"
																>▼</button>
															</div>

															{#if m.content}
																<button
																	type="button"
																	onclick={() => (previewMateri = { title: m.title, content: m.content, id: m.id })}
																	class="btn-ghost"
																	style="padding: 4px 9px; font-size: 11px;"
																>
																	Preview
																</button>
															{/if}

															<a
																href="/mentor/kurikulum/{data.track.id}/materi/{m.id}"
																class="btn-manage"
																style="padding: 4px 10px; font-size: 11px;"
															>
																Edit →
															</a>
														</div>
													</div>
												{/each}
											{/if}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

</div><!-- /content-area -->

<!-- ══════════════════════════════════════════════════
     READ-ONLY MATERI PREVIEW MODAL
     ══════════════════════════════════════════════════ -->
{#if previewMateri}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-scrim"
		onclick={(e) => e.target === e.currentTarget && (previewMateri = null)}
		role="dialog"
		aria-modal="true"
		aria-label="Preview Materi"
	>
		<div class="preview-modal">
			<div class="preview-modal__header">
				<h3 class="preview-modal__title">
					Preview: {previewMateri.title}
				</h3>
				<button onclick={() => (previewMateri = null)} class="modal-close" aria-label="Tutup preview">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="preview-modal__body">
				{@html previewMateri.content || '<p class="type-mono text-muted">Belum ada konten materi.</p>'}
			</div>

			<div class="preview-modal__footer">
				<span class="type-mono text-muted" style="font-size: 11px;">Read-Only Preview</span>
				<div style="display:flex;gap:8px;">
					<button onclick={() => (previewMateri = null)} class="btn-ghost">Tutup</button>
					<a href="/mentor/kurikulum/{data.track.id}/materi/{previewMateri.id}" class="btn-manage">Buka Editor →</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════
     RESPONSIVE SLIDER DRAWER FOR ADD / EDIT ACTIONS
     (Right on desktop, Bottom on mobile)
     ══════════════════════════════════════════════════ -->
{#if drawerType}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="form-scrim"
		onclick={(e) => e.target === e.currentTarget && closeDrawer()}
		role="dialog"
		aria-modal="true"
		aria-label="Form Kurikulum"
	>
		<aside class="form-drawer">
			<!-- Mobile drag handle -->
			<div class="mobile-drag-handle hide-desktop" aria-hidden="true"></div>

			<!-- Drawer Header -->
			<div class="form-drawer__header">
				<div>
					<span class="badge {drawerMode === 'edit' ? 'badge-hadir' : 'badge-live'} mb-1">
						{drawerMode === 'edit' ? 'EDIT' : 'TAMBAH'} {drawerType.toUpperCase()}
					</span>
					<h2 class="form-drawer__title">
						{#if drawerType === 'track'}
							{drawerMode === 'edit' ? 'Edit Detail Track' : 'Buat Track Baru'}
						{:else if drawerType === 'phase'}
							{drawerMode === 'edit' ? 'Edit Detail Fase' : 'Tambah Fase Baru'}
						{:else if drawerType === 'subPhase'}
							{drawerMode === 'edit' ? 'Edit Detail Sub-Fase' : 'Tambah Sub-Fase Baru'}
						{:else if drawerType === 'materi'}
							Tambah Materi Baru
						{/if}
					</h2>
				</div>
				<button onclick={closeDrawer} class="form-drawer__close" aria-label="Tutup drawer">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<!-- Dynamic Form Action -->
			<form
				method="POST"
				action={
					drawerType === 'track'
						? '?/updateTrack'
						: drawerType === 'phase'
						? drawerMode === 'edit' ? '?/updatePhase' : '?/createPhase'
						: drawerType === 'subPhase'
						? drawerMode === 'edit' ? '?/updateSubPhase' : '?/createSubPhase'
						: '?/createMateri'
				}
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeDrawer();
					};
				}}
				class="form-drawer__form"
			>
				<!-- Hidden Target IDs -->
				{#if drawerType === 'track'}
					<input type="hidden" name="id" value={data.track.id} />
				{:else if drawerMode === 'edit' && targetId}
					<input type="hidden" name="id" value={targetId} />
				{:else if drawerType === 'subPhase' && parentPhaseId}
					<input type="hidden" name="phaseId" value={parentPhaseId} />
				{:else if drawerType === 'materi' && parentSubPhaseId}
					<input type="hidden" name="subPhaseId" value={parentSubPhaseId} />
				{/if}

				<div class="form-drawer__body">
					<!-- Track-specific fields -->
					{#if drawerType === 'track'}
						<CustomSelect
							name="tingkatId"
							label="Tingkat Kelas"
							required
							bind:value={formTingkatId}
							options={data.tingkatList.map((t) => ({ value: t.id, label: t.name }))}
							placeholder="— Pilih Tingkat Kelas —"
						/>
						<TextInput
							name="title"
							label="Judul Track"
							required
							bind:value={formTitle}
							placeholder="Contoh: Dasar Jaringan & Cisco Packet Tracer"
							clearable
						/>
						<TextArea
							name="description"
							label="Deskripsi Silabus"
							bind:value={formDescription}
							placeholder="Penjelasan singkat cakupan kurikulum…"
							rows={4}
						/>
						<ToggleSwitch
							name="isPublished"
							label="Status Publikasi"
							bind:checked={formIsPublished}
							onLabel="Published (Aktif)"
							offLabel="Draft"
						/>
					{:else}
						<!-- Generic Title & Description for Phase, Sub-Phase, Materi -->
						<TextInput
							name="title"
							label={
								drawerType === 'phase'
									? 'Judul Fase'
									: drawerType === 'subPhase'
									? 'Judul Sub-Fase'
									: 'Judul Materi'
							}
							required
							bind:value={formTitle}
							placeholder={
								drawerType === 'phase'
									? 'Contoh: Fase 1 — Routing Protocols'
									: drawerType === 'subPhase'
									? 'Contoh: Konfigurasi Router OSPF'
									: 'Contoh: Dasar Teori OSPF Single Area'
							}
							clearable
						/>

						{#if drawerType !== 'materi'}
							<TextArea
								name="description"
								label="Deskripsi (Opsional)"
								bind:value={formDescription}
								placeholder="Penjelasan singkat cakupan bagian ini…"
								rows={3}
							/>
						{/if}
					{/if}
				</div>

				<!-- Drawer Footer -->
				<div class="form-drawer__footer">
					<button type="button" onclick={closeDrawer} class="btn-ghost" style="flex:1;">
						Batal
					</button>
					<button type="submit" class="btn-create" style="flex:2;justify-content:center;">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
						Simpan
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

	.bc-link:hover { color: var(--primary); }

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

	.page-sub {
		font-size: 13.5px;
		color: var(--text-secondary);
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

	/* ── Metrics Bar ────────────────────────────────── */
	.metrics-bar {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 14px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		box-shadow: var(--shadow-sm);
	}

	.metrics-bar__left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.metric-pill {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.metric-pill__val {
		font-family: var(--font-macro);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.metric-pill__key {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.metrics-bar__right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* ── Tree Container & Phase Cards ──────────────── */
	.tree-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.phase-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-left: 4px solid var(--primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.phase-header {
		padding: 16px 20px;
		background: var(--bg-inset);
		border-bottom: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.phase-header { flex-direction: column; align-items: flex-start; }
	}

	.phase-title-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		padding: 0;
	}

	.chevron-icon {
		color: var(--text-muted);
		display: flex;
		align-items: center;
		transition: transform 200ms ease;
	}

	.chevron-icon--open {
		transform: rotate(90deg);
		color: var(--primary);
	}

	.phase-name {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.phase-desc {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	.phase-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.reorder-group {
		display: flex;
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 6px;
		overflow: hidden;
	}

	.reorder-btn {
		border: none;
		background: transparent;
		padding: 3px 7px;
		font-size: 10px;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.reorder-btn:hover:not(:disabled) {
		background: var(--primary-light);
		color: var(--primary);
	}

	.reorder-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.btn-delete {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-delete:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	/* Sub-phases */
	.subphases-container {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.subphase-empty {
		padding: 16px;
		text-align: center;
		font-size: 12.5px;
		color: var(--text-muted);
		background: var(--bg-inset);
		border: 1px dashed var(--border-hard);
		border-radius: var(--radius-md);
	}

	.subphase-card {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.subphase-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-hard);
	}

	@media (max-width: 640px) {
		.subphase-header { flex-direction: column; align-items: flex-start; }
	}

	.subphase-title-group {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.subphase-num {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 800;
		color: var(--primary);
	}

	.subphase-title {
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.subphase-desc {
		font-size: 12px;
		color: var(--text-muted);
	}

	.subphase-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* Materis */
	.materis-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.materi-empty {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		padding: 4px 0;
	}

	.materi-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 8px;
		gap: 12px;
	}

	.materi-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.materi-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
		background: #e0e7ff;
		color: #4f46e5;
	}

	.materi-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.materi-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-manage {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		text-decoration: none;
		box-shadow: 0 2px 8px rgba(79,70,229,0.2);
		transition: transform 150ms ease;
	}

	.btn-manage:hover { transform: translateY(-1px); }

	/* ── Empty State ────────────────────────────────── */
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
		margin-bottom: 20px;
	}

	/* ── Preview Modal ──────────────────────────────── */
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

	.preview-modal {
		width: 100%;
		max-width: 720px;
		max-height: 85vh;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 24px;
		box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.preview-modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-hard);
	}

	.preview-modal__title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
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
		transition: all 150ms ease;
	}

	.modal-close:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	.preview-modal__body {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
		color: var(--text-secondary);
		line-height: 1.65;
	}

	.preview-modal__footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* ── Slide-over Form Drawer (Right Desktop, Bottom Mobile) ── */
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
		line-height: 1.25;
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

	@media (max-width: 767px) {
		.content-area { padding: 16px 16px 40px; }
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

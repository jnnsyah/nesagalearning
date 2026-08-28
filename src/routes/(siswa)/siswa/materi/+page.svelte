<script lang="ts">
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Search and filter state
	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'unread' | 'completed'>('all');
	let selectedTingkatFilter = $state<string>('all');

	// Distinct Tingkat/Jenjang Kelas list for catalog filter pills
	let distinctTingkats = $derived(
		Array.from(new Set(data.tracks.map((t) => t.tingkatName).filter(Boolean))) as string[]
	);

	let catalogTracks = $derived(
		selectedTingkatFilter === 'all'
			? data.tracks
			: data.tracks.filter((t) => t.tingkatName === selectedTingkatFilter)
	);

	// Accordion state: map of phaseId -> isOpen
	let openPhases = $state<Record<number, boolean>>({});

	// Initialize open phases (open all by default or first phase with unread materials)
	$effect(() => {
		if (data.phases && data.phases.length > 0) {
			const initial: Record<number, boolean> = {};
			data.phases.forEach((p, idx) => {
				const hasUnread = p.subPhases.some((sp) => sp.materiList.some((m) => !m.isCompleted));
				initial[p.id] = idx === 0 || hasUnread;
			});
			openPhases = initial;
		}
	});

	function togglePhase(phaseId: number) {
		openPhases[phaseId] = !openPhases[phaseId];
	}

	function expandAllPhases() {
		const updated: Record<number, boolean> = {};
		data.phases?.forEach((p) => {
			updated[p.id] = true;
		});
		openPhases = updated;
	}

	function collapseAllPhases() {
		const updated: Record<number, boolean> = {};
		data.phases?.forEach((p) => {
			updated[p.id] = false;
		});
		openPhases = updated;
	}

	function handleTrackSelectChange(val: string | number | null) {
		if (val) {
			goto(`?track=${val}`, { keepFocus: true, noScroll: true });
		} else {
			goto(`/siswa/materi`, { keepFocus: true, noScroll: true });
		}
	}

	let trackOptions = $derived([
		...data.tracks.map((t) => ({ value: t.id, label: t.title }))
	]);

	// Calculate overall curriculum progress
	let allMateriList = $derived.by(() => {
		const list: Array<{
			id: number;
			title: string;
			subPhaseTitle: string;
			phaseTitle: string;
			isCompleted: boolean;
		}> = [];
		(data.phases || []).forEach((p) => {
			p.subPhases.forEach((sp) => {
				sp.materiList.forEach((m) => {
					list.push({
						id: m.id,
						title: m.title,
						subPhaseTitle: sp.title,
						phaseTitle: p.title,
						isCompleted: m.isCompleted
					});
				});
			});
		});
		return list;
	});

	let totalMateriCount = $derived(allMateriList.length);
	let completedCount = $derived(allMateriList.filter((m) => m.isCompleted).length);
	let unreadCount = $derived(totalMateriCount - completedCount);
	let completionPercentage = $derived(
		totalMateriCount > 0 ? Math.round((completedCount / totalMateriCount) * 100) : 0
	);

	// Next unread module for quick resume CTA
	let nextUnreadMateri = $derived(allMateriList.find((m) => !m.isCompleted) || allMateriList[0] || null);

	// Filtered phases by search and status filter
	let filteredPhases = $derived.by(() => {
		const phases = data.phases || [];
		const q = searchQuery.toLowerCase().trim();

		return phases
			.map((p) => {
				const filteredSubPhases = p.subPhases
					.map((sp) => {
						const filteredMateri = sp.materiList.filter((m) => {
							// Status filter match
							if (statusFilter === 'unread' && m.isCompleted) return false;
							if (statusFilter === 'completed' && !m.isCompleted) return false;

							// Search match
							if (!q) return true;
							return (
								m.title.toLowerCase().includes(q) ||
								sp.title.toLowerCase().includes(q) ||
								p.title.toLowerCase().includes(q)
							);
						});
						return {
							...sp,
							materiList: filteredMateri
						};
					})
					.filter((sp) => sp.materiList.length > 0);

				const totalInPhase = p.subPhases.reduce((acc, sp) => acc + sp.materiList.length, 0);
				const completedInPhase = p.subPhases.reduce(
					(acc, sp) => acc + sp.materiList.filter((m) => m.isCompleted).length,
					0
				);

				return {
					...p,
					totalInPhase,
					completedInPhase,
					subPhases: filteredSubPhases
				};
			})
			.filter((p) => p.subPhases.length > 0);
	});

	let isAllExpanded = $derived(
		filteredPhases.length > 0 && filteredPhases.every((p) => openPhases[p.id])
	);
</script>

<svelte:head>
	<title>{data.selectedTrack ? `${data.selectedTrack.title} — Modul Pembelajaran` : 'Pilihan Track Pembelajaran — Siswa Hub'}</title>
</svelte:head>

<div class="content-area">
	{#if !data.selectedTrackId}
		<!-- ══════════════════════════════════════════════════════════
		     STAGE 1: DAFTAR / PILIHAN TRACK PEMBELAJARAN
		     ══════════════════════════════════════════════════════════ -->
		<!-- Page Header Card (Single Source of Truth Blueprint) -->
		<PageHeaderCard
			title="Pilihan Track Pembelajaran"
			subtitle="Pilih alur spesialisasi yang ingin Anda pelajari untuk mengakses seluruh modul & materi interaktifnya."
			breadcrumbs={[
				{ label: 'Beranda', href: '/siswa' },
				{ label: 'Track Pembelajaran' }
			]}
		>
			{#snippet badges()}
				{#if data.membership}
					<span class="badge badge-active-class">Kelas: {data.membership.kelasName}</span>
				{/if}
			{/snippet}
		</PageHeaderCard>

		<!-- Tingkat / Jenjang Filter Pills (if multiple tingkats exist) -->
		{#if distinctTingkats.length > 1}
			<div class="catalog-tingkat-pills-row" role="tablist" aria-label="Filter jenjang kelas track">
				<button
					type="button"
					role="tab"
					aria-selected={selectedTingkatFilter === 'all'}
					onclick={() => (selectedTingkatFilter = 'all')}
					class="catalog-tingkat-pill {selectedTingkatFilter === 'all' ? 'catalog-tingkat-pill--active' : ''}"
				>
					Semua Jenjang ({data.tracks.length})
				</button>
				{#each distinctTingkats as tName}
					<button
						type="button"
						role="tab"
						aria-selected={selectedTingkatFilter === tName}
						onclick={() => (selectedTingkatFilter = tName)}
						class="catalog-tingkat-pill {selectedTingkatFilter === tName ? 'catalog-tingkat-pill--active' : ''}"
					>
						{tName} ({data.tracks.filter((t) => t.tingkatName === tName).length})
					</button>
				{/each}
			</div>
		{/if}

		<!-- Track Catalog Grid -->
		{#if catalogTracks.length === 0}
			<div class="empty-state-card">
				<div class="empty-icon">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<h3 class="empty-title">Belum Ada Track Pembelajaran</h3>
				<p class="empty-sub">Belum ada track pembelajaran untuk jenjang kelas yang dipilih.</p>
			</div>
		{:else}
			<div class="track-catalog-grid">
				{#each catalogTracks as t (t.id)}
					<div class="track-card {t.isMyClassTrack ? 'track-card--my-class' : ''}">
						<!-- Card Top Pill -->
						<div class="track-card-top flex items-center justify-between gap-2 flex-wrap mb-3">
							<div class="flex items-center gap-1.5 flex-wrap">
								{#if t.tingkatName}
									<span class="track-tingkat-badge {t.isMyTingkat ? 'track-tingkat-badge--current' : ''}">
										{t.tingkatName}
									</span>
								{/if}

								{#if t.isMyClassTrack}
									<span class="track-role-pill track-role-pill--active">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
										<span>Track Kelas Anda</span>
									</span>
								{/if}
							</div>
							<span class="track-modules-count">{t.materiCount} Modul</span>
						</div>

						<!-- Card Title & Description -->
						<h3 class="track-card-title">{t.title}</h3>
						<p class="track-card-desc">{t.description || 'Modul alur spesialisasi pembelajaran Nesaga Learning Community.'}</p>

						<!-- Track Stats & Progress Bar -->
						<div class="track-card-stats-box mt-auto pt-3 border-t border-slate-100">
							<div class="flex items-center justify-between text-xs mb-1.5">
								<span class="font-medium text-slate-500">Progres Belajar</span>
								<span class="font-bold font-mono text-indigo-600">{t.completionPercentage}% ({t.completedCount}/{t.materiCount})</span>
							</div>

							<div class="track-progress-bar-track">
								<div class="track-progress-bar-fill" style="width: {t.completionPercentage}%;"></div>
							</div>

							<div class="flex items-center justify-between text-xs text-slate-500 mt-2">
								<span>{t.phaseCount} Fase</span>
								<span class="text-slate-400">&bull;</span>
								<span>{t.materiCount - t.completedCount} Belum Dibaca</span>
							</div>
						</div>

						<!-- Action Button -->
						<a href={`/siswa/materi?track=${t.id}`} class="btn-open-track">
							<span>Jelajahi Track Ini</span>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</a>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<!-- ══════════════════════════════════════════════════════════
		     STAGE 2: DETAIL TRACK PEMBELAJARAN (MODUL LIST)
		     ══════════════════════════════════════════════════════════ -->
		<!-- Page Header Card (Single Source of Truth Blueprint) -->
		<PageHeaderCard
			title={data.selectedTrack?.title ?? 'Modul Pembelajaran'}
			subtitle={data.selectedTrack?.description || 'Jelajahi alur modul materi pembelajaran pada track ini.'}
			breadcrumbs={[
				{ label: 'Pilihan Track', href: '/siswa/materi' },
				{ label: data.selectedTrack?.title ?? 'Detail Track' }
			]}
		>
			{#snippet badges()}
				{#if data.membership}
					<span class="badge badge-active-class">Kelas: {data.membership.kelasName}</span>
				{/if}
				{#if data.selectedTrack?.tingkatName}
					<span class="badge badge-grade">Tingkat {data.selectedTrack.tingkatName}</span>
				{/if}
				{#if data.selectedTrack?.isMyClassTrack}
					<span class="badge badge-active-class">⭐ Track Kelas Anda</span>
				{/if}
			{/snippet}
		</PageHeaderCard>

		<!-- 2. WIDGET RINGKASAN PROGRES BELAJAR & RESUME CTA -->
		{#if totalMateriCount > 0}
			<div class="progress-hero-card">
				<div class="progress-hero-main">
					<div class="progress-info-block">
						<div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
							<span class="progress-hero-label">Progres Track: {data.selectedTrack?.title}</span>
							<span class="progress-hero-percent">{completionPercentage}% Selesai</span>
						</div>

						<!-- Visual Progress Track Bar -->
						<div class="progress-bar-track" role="progressbar" aria-valuenow={completionPercentage} aria-valuemin={0} aria-valuemax={100}>
							<div class="progress-bar-fill" style="width: {completionPercentage}%;"></div>
						</div>

						<div class="progress-meta-row">
							<span class="meta-item">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<strong>{completedCount}</strong> Selesai
							</span>
							<span class="meta-divider">&bull;</span>
							<span class="meta-item">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5">
									<circle cx="12" cy="12" r="10" />
								</svg>
								<strong>{unreadCount}</strong> Belum Dibaca
							</span>
							<span class="meta-divider">&bull;</span>
							<span class="meta-item text-slate-500">
								Total {totalMateriCount} Modul
							</span>
						</div>
					</div>

					<!-- Quick Resume Reading CTA Button -->
					{#if nextUnreadMateri && unreadCount > 0}
						<a href={`/siswa/materi/${nextUnreadMateri.id}`} class="btn-resume-cta">
							<div class="btn-resume-icon">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polygon points="5 3 19 12 5 21 5 3" />
								</svg>
							</div>
							<div class="btn-resume-text">
								<span class="btn-resume-tag">Lanjutkan Belajar</span>
								<span class="btn-resume-title truncate">{nextUnreadMateri.title}</span>
							</div>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-resume-arrow">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</a>
					{:else if completedCount > 0 && unreadCount === 0}
						<div class="all-completed-pill">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							<span>Semua Modul Berhasil Diselesaikan!</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- 3. FILTER PANEL -->
		<div class="filter-card">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
				<!-- Search Bar with Quick Clear (×) -->
				<div class="md:col-span-2 relative">
					<div class="search-input-wrapper">
						<TextInput
							id="search-materi-input"
							label="Cari Modul & Topik"
							placeholder="Ketik judul modul, topik, atau kata kunci..."
							bind:value={searchQuery}
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => (searchQuery = '')}
								class="search-clear-btn"
								aria-label="Hapus pencarian"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Track Switcher Dropdown -->
				<div>
					{#if trackOptions.length > 1}
						<CustomSelect
							id="track-select-filter"
							label="Ganti Track Pembelajaran"
							value={data.selectedTrackId}
							options={trackOptions}
							searchable={false}
							onchange={handleTrackSelectChange}
						/>
					{/if}
				</div>
			</div>

			<!-- Status Filter Pills & Global Accordion Controls -->
			<div class="filter-footer-row mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
				<div class="filter-pills-row" role="tablist" aria-label="Filter status materi">
					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === 'all'}
						onclick={() => (statusFilter = 'all')}
						class="filter-pill {statusFilter === 'all' ? 'filter-pill-active' : ''}"
					>
						<span>Semua Modul</span>
						<span class="pill-badge">{totalMateriCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === 'unread'}
						onclick={() => (statusFilter = 'unread')}
						class="filter-pill {statusFilter === 'unread' ? 'filter-pill-active' : ''}"
					>
						<span>Belum Selesai</span>
						<span class="pill-badge pill-badge--unread">{unreadCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === 'completed'}
						onclick={() => (statusFilter = 'completed')}
						class="filter-pill {statusFilter === 'completed' ? 'filter-pill-active' : ''}"
					>
						<span>Selesai Dibaca</span>
						<span class="pill-badge pill-badge--completed">{completedCount}</span>
					</button>
				</div>

				<!-- Toggle All Accordions Button -->
				{#if filteredPhases.length > 1}
					<button
						type="button"
						onclick={isAllExpanded ? collapseAllPhases : expandAllPhases}
						class="btn-toggle-all"
					>
						{#if isAllExpanded}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="4 14 12 6 20 14" />
							</svg>
							<span>Tutup Semua Fase</span>
						{:else}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="4 6 12 14 20 6" />
							</svg>
							<span>Buka Semua Fase</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- 4. CURRICULUM HIERARCHY (ACCORDION & TOUCH ROWS) -->
		{#if filteredPhases.length === 0}
			<div class="empty-state-card">
				<div class="empty-icon">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<h3 class="empty-title">Tidak Ada Materi Ditemukan</h3>
				<p class="empty-sub">
					{searchQuery
						? `Tidak ada modul yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain atau hapus filter.`
						: 'Tidak ada modul materi untuk filter status yang dipilih pada track ini.'}
				</p>
				{#if searchQuery || statusFilter !== 'all'}
					<button
						type="button"
						onclick={() => {
							searchQuery = '';
							statusFilter = 'all';
						}}
						class="btn-reset-filters mt-3.5"
					>
						Reset Semua Filter
					</button>
				{/if}
			</div>
		{:else}
			<div class="phases-stack">
				{#each filteredPhases as p, pIdx (p.id)}
					{@const isOpen = searchQuery ? true : !!openPhases[p.id]}
					<div class="phase-card {isOpen ? 'phase-card--open' : ''}">
						<!-- Interactive Accordion Header -->
						<button
							type="button"
							onclick={() => togglePhase(p.id)}
							class="phase-accordion-head"
							aria-expanded={isOpen}
						>
							<div class="phase-head-left min-w-0 flex-1">
								<div class="flex items-center gap-2 flex-wrap mb-1">
									<span class="phase-badge-pill">FASE {pIdx + 1}</span>
									{#if p.totalInPhase > 0}
										<span class="phase-progress-tag {p.completedInPhase === p.totalInPhase ? 'phase-progress-tag--done' : ''}">
											{p.completedInPhase} / {p.totalInPhase} Selesai
										</span>
									{/if}
								</div>
								<h3 class="phase-title">{p.title}</h3>
								{#if p.description}
									<p class="phase-desc">{p.description}</p>
								{/if}
							</div>

							<div class="phase-head-right shrink-0">
								<div class="chevron-box {isOpen ? 'chevron-box--open' : ''}">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</div>
							</div>
						</button>

						<!-- Accordion Body -->
						{#if isOpen}
							<div class="phase-body" transition:slide={{ duration: 200 }}>
								{#each p.subPhases as sp, spIdx (sp.id)}
									<div class="subphase-card">
										<div class="subphase-header">
											<div class="subphase-number-indicator">
												{pIdx + 1}.{spIdx + 1}
											</div>
											<div class="min-w-0 flex-1">
												<h4 class="subphase-title">{sp.title}</h4>
												{#if sp.description}
													<p class="subphase-desc">{sp.description}</p>
												{/if}
											</div>
										</div>

										{#if sp.materiList.length === 0}
											<div class="no-materi-item">Belum ada modul materi pada sub-fase ini.</div>
										{:else}
											<div class="materi-stack">
												{#each sp.materiList as m, mIdx (m.id)}
													<a
														href={`/siswa/materi/${m.id}`}
														class="materi-item-row {m.isCompleted ? 'materi-item-row--completed' : ''}"
													>
														<!-- Status Bullet / Step Dot -->
														<div class="materi-status-dot {m.isCompleted ? 'materi-status-dot--completed' : ''}">
															{#if m.isCompleted}
																<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
																	<polyline points="20 6 9 17 4 12" />
																</svg>
															{:else}
																<span>{mIdx + 1}</span>
															{/if}
														</div>

														<!-- Title & Info -->
														<div class="materi-text-wrap min-w-0 flex-1">
															<div class="flex items-center gap-2 flex-wrap">
																<span class="materi-title">{m.title}</span>
																{#if m.isCompleted}
																	<span class="badge-done">SELESAI</span>
																{/if}
															</div>
															<span class="materi-action-sub">Ketuk untuk membaca modul &rsaquo;</span>
														</div>

														<!-- Right Action Chevron -->
														<div class="materi-action-arrow">
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
																<polyline points="9 18 15 12 9 6" />
															</svg>
														</div>
													</a>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* ══════════════════════════════════════════════════════════
	   CONTAINER & LAYOUT SPECIFICATIONS
	   ══════════════════════════════════════════════════════════ */
	.content-area {
		padding: 24px 32px 60px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-sizing: border-box;
	}

	/* ══════════════════════════════════════════════════════════
	   1. HEADER CARD
	   ══════════════════════════════════════════════════════════ */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 26px;
	}

	.header-badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.header-main-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.breadcrumb {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		flex-wrap: wrap;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.bc-link:hover {
		color: #4f46e5;
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #4f46e5;
	}

	.btn-back-track-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 26px;
		padding: 0 10px;
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		line-height: 1;
		transition: all 150ms ease;
	}

	.btn-back-track-pill:hover {
		background: #c7d2fe;
		color: #3730a3;
	}

	.btn-back-track-pill:active {
		transform: scale(0.98);
	}

	.page-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.15rem, 2vw, 1.4rem);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.25;
		margin: 0;
	}

	.page-sub {
		font-size: 12px;
		color: var(--text-secondary, #475569);
		margin: 0;
		line-height: 1.45;
	}

	.kelas-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 0 9px;
		border-radius: 6px;
		border: 1px solid #c7d2fe;
		line-height: 1;
		max-width: 100%;
		box-sizing: border-box;
		white-space: normal;
		word-break: break-word;
	}

	.track-tingkat-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #0369a1;
		background: #e0f2fe;
		border: 1px solid #bae6fd;
		padding: 0 9px;
		border-radius: 6px;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.track-tingkat-badge--current {
		color: #4338ca;
		background: #e0e7ff;
		border-color: #c7d2fe;
	}

	.track-role-pill {
		display: inline-flex;
		align-items: center;
		height: 26px;
		gap: 4px;
		padding: 0 9px;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: #64748b;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		line-height: 1;
	}

	.track-role-pill--active {
		color: #15803d;
		background: #dcfce7;
		border-color: #86efac;
	}

	/* ══════════════════════════════════════════════════════════
	   STAGE 1: TRACK CATALOG GRID & TINGKAT PILLS
	   ══════════════════════════════════════════════════════════ */
	.catalog-tingkat-pills-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: nowrap;
		overflow-x: auto;
		padding-bottom: 2px;
		-webkit-overflow-scrolling: touch;
	}

	.catalog-tingkat-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: #64748b;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.catalog-tingkat-pill:hover {
		background: #f8fafc;
		color: #334155;
	}

	.catalog-tingkat-pill--active {
		background: #0284c7;
		color: #ffffff;
		border-color: #0284c7;
		box-shadow: 0 2px 6px rgba(2, 132, 199, 0.2);
	}

	.catalog-tingkat-pill--active:hover {
		background: #0369a1;
		color: #ffffff;
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

	.track-tingkat-badge--current {
		color: #4338ca;
		background: #e0e7ff;
		border-color: #c7d2fe;
	}

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

	.track-card--my-class {
		border-color: #a5b4fc;
		background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
	}

	.track-role-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: #475569;
		background: #f1f5f9;
		padding: 3px 8px;
		border-radius: 6px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.track-role-pill--active {
		color: #4338ca;
		background: #e0e7ff;
		border: 1px solid #c7d2fe;
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
	}

	.track-progress-bar-track {
		width: 100%;
		height: 6px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
	}

	.track-progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%);
		border-radius: 999px;
		transition: width 300ms ease;
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

	/* ══════════════════════════════════════════════════════════
	   2. WIDGET PROGRES BELAJAR & QUICK RESUME CTA
	   ══════════════════════════════════════════════════════════ */
	.progress-hero-card {
		background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
		border: 1px solid #e0e7ff;
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.05);
	}

	.progress-hero-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.progress-info-block {
		flex: 1;
		min-width: 260px;
	}

	.progress-hero-label {
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 800;
		color: #334155;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.progress-hero-percent {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 800;
		color: #4f46e5;
	}

	.progress-bar-track {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
		margin: 6px 0 10px;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%);
		border-radius: 999px;
		transition: width 300ms ease-out;
	}

	.progress-meta-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11.5px;
		color: #64748b;
		flex-wrap: wrap;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.meta-divider {
		color: #cbd5e1;
	}

	.btn-resume-cta {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border-radius: 12px;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
		max-width: 320px;
		flex-shrink: 0;
	}

	.btn-resume-cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
	}

	.btn-resume-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-resume-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.btn-resume-tag {
		font-size: 10px;
		font-weight: 700;
		color: #c7d2fe;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.btn-resume-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 800;
		color: #ffffff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.btn-resume-arrow {
		color: #c7d2fe;
		flex-shrink: 0;
	}

	.all-completed-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: #dcfce7;
		border: 1px solid #86efac;
		color: #15803d;
		border-radius: 10px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 800;
	}

	/* ══════════════════════════════════════════════════════════
	   3. FILTER PANEL
	   ══════════════════════════════════════════════════════════ */
	.filter-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.search-input-wrapper {
		position: relative;
		width: 100%;
	}

	.search-clear-btn {
		position: absolute;
		right: 10px;
		bottom: 9px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.search-clear-btn:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.filter-pills-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: nowrap;
		overflow-x: auto;
		padding-bottom: 2px;
		-webkit-overflow-scrolling: touch;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: #64748b;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.filter-pill:hover {
		background: #f1f5f9;
		color: #334155;
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

	.pill-badge--unread {
		background: #fee2e2;
		color: #b91c1c;
	}

	.pill-badge--completed {
		background: #dcfce7;
		color: #15803d;
	}

	.btn-toggle-all {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		background: transparent;
		border: 1px solid transparent;
		padding: 5px 8px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-toggle-all:hover {
		color: #4f46e5;
		background: #f8fafc;
		border-color: #e2e8f0;
	}

	/* ══════════════════════════════════════════════════════════
	   4. ACCORDION PHASE CARDS & MODULE ROWS
	   ══════════════════════════════════════════════════════════ */
	.phases-stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.phase-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		transition: border-color 150ms ease;
	}

	.phase-card--open {
		border-color: #cbd5e1;
	}

	.phase-accordion-head {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 16px 20px;
		background: #fcfcfd;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 150ms ease;
	}

	.phase-accordion-head:hover {
		background: #f8fafc;
	}

	.phase-badge-pill {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid #c7d2fe;
	}

	.phase-progress-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: #64748b;
		background: #f1f5f9;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.phase-progress-tag--done {
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #bbf7d0;
	}

	.phase-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 14.5px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
		line-height: 1.3;
	}

	.phase-desc {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 3px;
		line-height: 1.4;
	}

	.chevron-box {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 200ms ease, background 150ms ease, color 150ms ease;
	}

	.chevron-box--open {
		transform: rotate(180deg);
		background: #e0e7ff;
		color: #4f46e5;
	}

	.phase-body {
		padding: 16px 20px 20px;
		border-top: 1px solid #f1f5f9;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.subphase-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 3.5px solid #6366f1;
		border-radius: 10px;
		padding: 14px 16px;
	}

	.subphase-header {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 10px;
	}

	.subphase-number-indicator {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 7px;
		border-radius: 4px;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.subphase-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
		line-height: 1.35;
	}

	.subphase-desc {
		font-size: 11.5px;
		color: #64748b;
		margin-top: 2px;
	}

	.no-materi-item {
		font-size: 11.5px;
		color: #94a3b8;
		font-style: italic;
		padding: 8px 0;
	}

	.materi-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* 100% Full Touch-Target Module Row Link */
	.materi-item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 14px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		text-decoration: none;
		min-height: 48px;
		box-sizing: border-box;
		transition: all 150ms ease;
		cursor: pointer;
	}

	.materi-item-row:hover {
		border-color: #cbd5e1;
		background: #ffffff;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
	}

	.materi-item-row:active {
		transform: scale(0.99);
	}

	.materi-item-row--completed {
		background: #ffffff;
		border-color: #e2e8f0;
	}

	.materi-status-dot {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.materi-status-dot--completed {
		background: #dcfce7;
		color: #16a34a;
	}

	.materi-text-wrap {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.materi-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.35;
	}

	.badge-done {
		font-family: var(--font-mono, monospace);
		font-size: 9px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #86efac;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.materi-action-sub {
		font-size: 10.5px;
		color: #64748b;
	}

	.materi-action-arrow {
		color: #94a3b8;
		flex-shrink: 0;
		transition: transform 150ms ease, color 150ms ease;
	}

	.materi-item-row:hover .materi-action-arrow {
		color: #4f46e5;
		transform: translateX(2px);
	}

	/* ══════════════════════════════════════════════════════════
	   EMPTY STATE
	   ══════════════════════════════════════════════════════════ */
	.empty-state-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 40px 24px;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	.empty-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}

	.empty-sub {
		font-size: 12.5px;
		color: var(--text-muted, #64748b);
		max-width: 420px;
		margin: 6px auto 0;
		line-height: 1.5;
	}

	.btn-reset-filters {
		display: inline-flex;
		align-items: center;
		padding: 8px 16px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border: none;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.btn-reset-filters:hover {
		background: #4338ca;
	}

	/* ══════════════════════════════════════════════════════════
	   FLUID RESPONSIVENESS (< 1024px & < 640px)
	   ══════════════════════════════════════════════════════════ */
	@media (max-width: 1023px) {
		.content-area {
			padding: 20px 24px 60px;
			gap: 16px;
		}
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}

		.header-card {
			padding: 12px 14px;
			gap: 8px;
		}

		.header-top-row {
			gap: 6px;
		}

		.header-badges-row {
			gap: 5px;
		}

		.header-main-content {
			gap: 3px;
		}

		.page-title {
			font-size: 1.125rem;
		}

		.page-sub {
			font-size: 11.5px;
		}

		.progress-hero-card {
			padding: 14px 14px;
		}

		.progress-hero-main {
			flex-direction: column;
			align-items: stretch;
			gap: 14px;
		}

		.btn-resume-cta {
			max-width: 100%;
			width: 100%;
			box-sizing: border-box;
			justify-content: space-between;
		}

		.filter-card {
			padding: 14px 16px;
		}

		.filter-footer-row {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
		}

		.filter-pills-row {
			width: 100%;
		}

		.btn-toggle-all {
			width: 100%;
			justify-content: center;
			padding: 7px;
			background: #f8fafc;
			border-color: #e2e8f0;
		}

		.phase-accordion-head {
			padding: 14px 14px;
		}

		.phase-body {
			padding: 12px 12px 16px;
			gap: 10px;
		}

		.subphase-card {
			padding: 12px 12px;
		}

		.materi-item-row {
			padding: 10px 12px;
			gap: 10px;
		}
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';

	let { data } = $props();

	// Local filter state for Tier 1
	let selectedTaId = $state('');
	let selectedKelasId = $state('');

	$effect(() => {
		selectedTaId = data.monitoringData.selectedTahunAjaran?.id
			? String(data.monitoringData.selectedTahunAjaran.id)
			: '';

		if (data.monitoringData.viewMode === 'detail') {
			selectedKelasId = data.monitoringData.selectedKelas?.id
				? String(data.monitoringData.selectedKelas.id)
				: '';
		}
	});

	// Collapsible phase state for Tier 2
	let expandedPhases = $state<Record<number, boolean>>({});

	$effect(() => {
		if (data.monitoringData.viewMode === 'detail') {
			const nextState: Record<number, boolean> = { ...expandedPhases };
			for (const p of data.monitoringData.phases) {
				if (nextState[p.id] === undefined) {
					nextState[p.id] = true;
				}
			}
			expandedPhases = nextState;
		}
	});

	// Dropdown Options
	const taSelectOptions = $derived(
		data.monitoringData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const kelasSelectOptions = $derived(
		data.monitoringData.viewMode === 'detail'
			? [
					{ value: '', label: 'Semua Rombel / Kelas' },
					...data.monitoringData.kelasOptions.map((k) => ({
						value: String(k.id),
						label: k.name
					}))
				]
			: []
	);

	function handleTaChange(val: string | number | null) {
		const taStr = String(val ?? '');
		const params = new URLSearchParams();
		if (taStr) params.set('tahunAjaranId', taStr);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleKelasChange(val: string | number | null) {
		const kelasStr = String(val ?? '');
		if (data.monitoringData.viewMode === 'detail') {
			const params = new URLSearchParams();
			params.set('trackId', String(data.monitoringData.selectedTrack.id));
			if (data.monitoringData.selectedTahunAjaran?.id) {
				params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
			}
			if (kelasStr) params.set('kelasInstanceId', kelasStr);
			goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
		}
	}

	function navigateToDetail(trackId: number) {
		const params = new URLSearchParams();
		params.set('trackId', String(trackId));
		if (data.monitoringData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function navigateBackToGrid() {
		const params = new URLSearchParams();
		if (data.monitoringData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function togglePhase(phaseId: number) {
		expandedPhases[phaseId] = !expandedPhases[phaseId];
	}
</script>

<svelte:head>
	<title>Pantau Kurikulum — Guru Pembimbing | NLC</title>
</svelte:head>

<div class="page-container">
	{#if data.monitoringData.viewMode === 'grid'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 1: GRID VIEW (Katalog Kartu Kurikulum Track)
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-top-row">
				<div>
					<div class="hero-title-group">
						<h1 class="hero-title">Katalog & Pantau Kurikulum</h1>
						{#if data.monitoringData.selectedTahunAjaran}
							<span class="badge badge-primary">
								TA {data.monitoringData.selectedTahunAjaran.name}
							</span>
						{/if}
					</div>
					<p class="hero-subtitle">
						Pilih alur kurikulum di bawah ini untuk memantau progres ketercapaian modul, materi, dan quiz per tingkat kelas.
					</p>
				</div>

				<div class="w-64 flex-shrink-0">
					<label for="grid-ta-select" class="filter-label">Tahun Ajaran</label>
					<CustomSelect
						id="grid-ta-select"
						name="tahunAjaranId"
						options={taSelectOptions}
						value={selectedTaId}
						onchange={handleTaChange}
						searchable={false}
					/>
				</div>
			</div>
		</header>

		{#if data.monitoringData.trackCards.length === 0}
			<div class="empty-card py-12 text-center">
				<div class="empty-icon-circle">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 4 4v14a3 3 0 0 1 3-3h7z"/></svg>
				</div>
				<h3 class="font-bold text-slate-800 text-base">Belum Ada Kurikulum Track Dipublikasi</h3>
				<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Tidak ditemukan alur kurikulum aktif untuk Tahun Ajaran {data.monitoringData.selectedTahunAjaran?.name || ''}.
				</p>
			</div>
		{:else}
			<section class="grid-cards-container" aria-label="Daftar Alur Kurikulum">
				<div class="cards-grid">
					{#each data.monitoringData.trackCards as track}
						<div
							class="track-card"
							class:track-card--archived={track.trackState === 'archived'}
							class:track-card--upcoming={track.trackState === 'upcoming'}
						>
							<div class="track-card-header">
								<div class="flex items-center justify-between gap-2">
									<span class="badge badge-subtle">{track.tingkatName}</span>

									{#if track.trackState === 'archived'}
										<span class="badge badge-archived inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
											<span>TERARSIP</span>
										</span>
									{:else if track.trackState === 'upcoming'}
										<span class="badge badge-amber inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
											<span>BELUM BERJALAN</span>
										</span>
									{:else}
										<span class="badge badge-success inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
											<span>AKTIF</span>
										</span>
									{/if}
								</div>

								<h3 class="track-card-title mt-2">{track.title}</h3>
								{#if track.description}
									<p class="track-card-desc">{track.description}</p>
								{/if}
							</div>

							<!-- Executing Rombel Info -->
							<div class="track-card-body">
								<div class="rombel-tags-row mb-3">
									<span class="text-xs font-bold text-slate-700">Rombel Eksekusi:</span>
									{#if track.executingClassNames.length === 0}
										<span class="type-mono text-xs text-slate-400">Belum Ada Rombel</span>
									{:else}
										{#each track.executingClassNames as cName}
											<span class="rombel-tag">{cName}</span>
										{/each}
									{/if}
								</div>

								<div class="metrics-mini-grid">
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalPhases}</span>
										<span class="mini-stat-lbl">Phase</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalSubPhases}</span>
										<span class="mini-stat-lbl">SubPhase</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalMateri}</span>
										<span class="mini-stat-lbl">Materi</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalQuizzes}</span>
										<span class="mini-stat-lbl">Quiz</span>
									</div>
								</div>

								<!-- Overall Progress Bar -->
								<div class="progress-box mt-3">
									<div class="flex items-center justify-between text-xs font-mono mb-1">
										<span class="text-slate-500">Rata-rata Ketercapaian</span>
										<span class="font-bold text-slate-800">{track.executingClassesCount === 0 ? '-' : `${track.avgCompletionRate}%`}</span>
									</div>
									<div class="mini-progress-track">
										<div
											class="mini-progress-fill"
											class:fill-green={track.avgCompletionRate >= 80}
											class:fill-amber={track.avgCompletionRate >= 50 && track.avgCompletionRate < 80}
											class:fill-blue={track.avgCompletionRate < 50}
											style="width: {track.executingClassesCount === 0 ? 0 : track.avgCompletionRate}%;"
										></div>
									</div>
								</div>
							</div>

							<div class="track-card-footer">
								<button
									type="button"
									class="btn-open-track"
									onclick={() => navigateToDetail(track.id)}
								>
									<span>Lihat Detail Modul</span>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else if data.monitoringData.viewMode === 'detail'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 2: DETAIL BREAKDOWN VIEW (Detail Modul Track)
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-top-bar">
				<button type="button" onclick={navigateBackToGrid} class="btn-back-link">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
					<span>Kembali ke Katalog Kurikulum (TA {data.monitoringData.selectedTahunAjaran?.name})</span>
				</button>
			</div>

			<div class="hero-content-flex">
				<div class="flex-grow">
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class="hero-title">{data.monitoringData.selectedTrack.title}</h1>
						<span class="badge badge-primary">{data.monitoringData.selectedTrack.tingkatName}</span>
					</div>
					{#if data.monitoringData.selectedTrack.description}
						<p class="hero-subtitle">{data.monitoringData.selectedTrack.description}</p>
					{/if}
				</div>

				<div class="w-64 flex-shrink-0">
					<label for="detail-kelas-select" class="filter-label">Filter Rombel Kelas</label>
					<CustomSelect
						id="detail-kelas-select"
						name="kelasInstanceId"
						options={kelasSelectOptions}
						value={selectedKelasId}
						onchange={handleKelasChange}
						searchable={false}
					/>
				</div>
			</div>
		</header>

		<!-- ══════════════════════════════════════════════════════════
		     SUMMARY STAT CARDS
		     ══════════════════════════════════════════════════════════ -->
		<section class="stats-grid" aria-label="Ringkasan Kurikulum Track">
			<div class="stat-card">
				<div class="stat-icon-box icon-phase">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.monitoringData.summary.totalPhases} Phase</span>
					<span class="stat-label">Struktur Pembelajaran</span>
					<span class="stat-subtext">{data.monitoringData.summary.totalSubPhases} Sub-Phase Modul</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-materi">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.monitoringData.summary.totalMateri} Materi</span>
					<span class="stat-label">Konten Teori & Lab</span>
					<span class="stat-subtext">{data.monitoringData.summary.totalQuizzes} Evaluation Quizzes</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-class">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.monitoringData.summary.totalExecutingClasses} Kelas</span>
					<span class="stat-label">Rombel Dipantau</span>
					<span class="stat-subtext">{data.monitoringData.summary.totalStudents} Siswa Terdaftar</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-progress">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.monitoringData.summary.avgTrackCompletionRate}%</span>
					<span class="stat-label">Ketercapaian Kurikulum</span>
					<span class="stat-subtext">Rata-rata Penyelesaian Modul</span>
				</div>
			</div>
		</section>

		<!-- ══════════════════════════════════════════════════════════
		     PHASE & SUBPHASE HIERARCHY ACCORDION
		     ══════════════════════════════════════════════════════════ -->
		<section class="phases-section">
			<div class="section-header">
				<div>
					<h2 class="section-title">Breakdown Modul Pembelajaran ({data.monitoringData.phases.length} Phase)</h2>
					<p class="section-subtitle">
						Dipantau untuk {data.monitoringData.selectedKelas?.name || `Seluruh Kelas ${data.monitoringData.selectedTrack.tingkatName}`} (TA {data.monitoringData.selectedTahunAjaran?.name})
					</p>
				</div>
				<span class="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
					Track: {data.monitoringData.selectedTrack.title}
				</span>
			</div>

			{#if data.monitoringData.phases.length === 0}
				<div class="empty-card py-8 text-center">
					<div class="empty-icon-circle">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
					</div>
					<p class="font-bold text-slate-800 text-sm">Belum Ada Phase pada Track Ini</p>
					<p class="text-xs text-slate-500 mt-1">Mentor / Admin belum menambahkan modul pembelajaran untuk kurikulum ini.</p>
				</div>
			{:else}
				<div class="phases-stack">
					{#each data.monitoringData.phases as p, i}
						<div class="phase-card" class:phase-card--collapsed={!expandedPhases[p.id]}>
							<button
								type="button"
								class="phase-header-btn"
								onclick={() => togglePhase(p.id)}
								aria-expanded={expandedPhases[p.id]}
							>
								<div class="flex items-center gap-3 min-w-0">
									<span class="phase-order-badge">Phase {i + 1}</span>
									<div class="text-left min-w-0">
										<h3 class="phase-title">{p.title}</h3>
										{#if p.description}
											<p class="phase-desc">{p.description}</p>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-4 flex-shrink-0">
									<div class="phase-progress-widget">
										<div class="flex items-center justify-between text-xs font-mono mb-1">
											<span class="text-slate-500">Progres Ketercapaian</span>
											<span class="font-bold text-slate-800">{p.avgCompletionRate}%</span>
										</div>
										<div class="mini-progress-track w-32">
											<div
												class="mini-progress-fill"
												class:fill-green={p.avgCompletionRate >= 80}
												class:fill-amber={p.avgCompletionRate >= 50 && p.avgCompletionRate < 80}
												class:fill-blue={p.avgCompletionRate < 50}
												style="width: {p.avgCompletionRate}%;"
											></div>
										</div>
									</div>

									<div class="chevron-icon" class:rotate-180={expandedPhases[p.id]}>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
									</div>
								</div>
							</button>

							{#if expandedPhases[p.id]}
								<div class="subphases-container">
									{#if p.subPhases.length === 0}
										<div class="p-4 text-center text-xs text-slate-400 font-mono">
											Tidak ada sub-phase pada phase ini.
										</div>
									{:else}
										<div class="subphases-grid">
											{#each p.subPhases as sp}
												<div class="subphase-card">
													<div class="subphase-header">
														<div class="flex items-center gap-2">
															<span class="subphase-order">#{sp.sortOrder}</span>
															<h4 class="subphase-title">{sp.title}</h4>
														</div>

														{#if sp.status === 'SELESAI'}
															<span class="badge badge-success">SELESAI</span>
														{:else if sp.status === 'BERJALAN'}
															<span class="badge badge-amber">BERJALAN</span>
														{:else}
															<span class="badge badge-subtle">BELUM DIMULAI</span>
														{/if}
													</div>

													{#if sp.description}
														<p class="subphase-desc">{sp.description}</p>
													{/if}

													<div class="subphase-meta-row">
														<span class="meta-pill">
															<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
															<span>{sp.materiCount} Materi</span>
														</span>

														{#if sp.hasQuiz}
															<span class="meta-pill meta-pill-quiz" title="Passing Score: {sp.passingScore}">
																<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
																<span>Quiz ({sp.passingScore} Pts)</span>
															</span>
														{:else}
															<span class="meta-pill text-slate-400">Tanpa Quiz</span>
														{/if}

														<span class="meta-pill">
															<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
															<span>{sp.totalClassSessions} Sesi Pertemuan</span>
														</span>
													</div>

													<div class="subphase-completion-box">
														<div class="flex items-center justify-between text-xs font-mono mb-1.5">
															<span class="text-slate-600 font-semibold">Tingkat Ketercapaian Siswa</span>
															<span class="font-bold text-slate-800">{sp.completionRate}%</span>
														</div>
														<div class="mini-progress-track">
															<div
																class="mini-progress-fill"
																class:fill-green={sp.completionRate >= 80}
																class:fill-amber={sp.completionRate >= 50 && sp.completionRate < 80}
																class:fill-blue={sp.completionRate < 50}
																style="width: {sp.completionRate}%;"
															></div>
														</div>
														<div class="text-[11px] text-slate-500 font-mono mt-1 text-right">
															Est. {sp.completedStudentsCount} dari {sp.totalActiveStudents} Siswa Selesai
														</div>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1280px;
		margin: 0 auto;
	}

	.page-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px 24px;
		margin-bottom: 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.hero-top-bar {
		margin-bottom: 12px;
	}

	.btn-back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: #4f46e5;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.btn-back-link:hover {
		text-decoration: underline;
	}

	.hero-top-row,
	.hero-content-flex {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.hero-title-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.hero-title {
		font-size: 22px;
		font-weight: 800;
		color: var(--text-main, #0f172a);
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		margin-top: 4px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Grid Track Cards (Tier 1) */
	.grid-cards-container {
		margin-top: 8px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.track-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.track-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
		border-color: #4f46e5;
	}

	.track-card--archived {
		background: #f8fafc;
		border: 1.5px dashed #cbd5e1;
	}

	.track-card--upcoming {
		background: #fffdf5;
		border: 1px solid #fde68a;
	}

	.track-card-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
		line-height: 1.3;
	}

	.track-card-desc {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 4px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.track-card-body {
		margin-top: 16px;
		margin-bottom: 16px;
	}

	.rombel-tags-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.rombel-tag {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #e0e7ff;
		color: #4338ca;
		padding: 2px 7px;
		border-radius: 6px;
	}

	.metrics-mini-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		background: #f8fafc;
		border: 1px solid #f1f5f9;
		border-radius: 8px;
		padding: 10px 8px;
		text-align: center;
	}

	.mini-stat-val {
		display: block;
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
	}

	.mini-stat-lbl {
		display: block;
		font-size: 10px;
		font-family: var(--font-mono, monospace);
		color: #64748b;
	}

	.track-card-footer {
		border-top: 1px solid var(--border-subtle, #f1f5f9);
		padding-top: 14px;
	}

	.btn-open-track {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 9px 16px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-open-track:hover {
		background: #4338ca;
	}

	/* Stats Grid (Tier 2) */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 16px;
		display: flex;
		align-items: flex-start;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.stat-icon-box {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-phase { background: #e0e7ff; color: #4338ca; }
	.icon-materi { background: #e0f2fe; color: #0369a1; }
	.icon-class { background: #f0fdf4; color: #15803d; }
	.icon-progress { background: #fef3c7; color: #b45309; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 800;
		color: var(--text-main, #0f172a);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	.stat-subtext {
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		color: #94a3b8;
		margin-top: 2px;
	}

	/* Phases Section */
	.phases-section {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
		gap: 12px;
		flex-wrap: wrap;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
	}

	.section-subtitle {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	.phases-stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.phase-card {
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-md, 8px);
		background: #ffffff;
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.phase-card:hover {
		border-color: #94a3b8;
	}

	.phase-header-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: #f8fafc;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s ease;
	}

	.phase-header-btn:hover {
		background: #f1f5f9;
	}

	.phase-order-badge {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #4f46e5;
		color: #ffffff;
		padding: 4px 8px;
		border-radius: 6px;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.phase-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
	}

	.phase-desc {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	.chevron-icon {
		transition: transform 0.2s ease;
		color: #64748b;
	}

	.rotate-180 {
		transform: rotate(180deg);
	}

	/* SubPhases Container */
	.subphases-container {
		padding: 16px 20px 20px;
		background: #ffffff;
		border-top: 1px solid var(--border-subtle, #f1f5f9);
	}

	.subphases-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 14px;
	}

	.subphase-card {
		border: 1px solid var(--border-subtle, #e2e8f0);
		border-radius: 8px;
		padding: 14px 16px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.subphase-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.subphase-order {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
	}

	.subphase-title {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
	}

	.subphase-desc {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 6px;
		margin-bottom: 10px;
	}

	.subphase-meta-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}

	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		color: #475569;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.meta-pill-quiz {
		background: #f0fdf4;
		color: #15803d;
		border-color: #bbf7d0;
	}

	.subphase-completion-box {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 10px 12px;
		margin-top: auto;
	}

	.mini-progress-track {
		height: 6px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.3s ease;
	}

	.fill-green { background: #16a34a; }
	.fill-amber { background: #d97706; }
	.fill-blue { background: #2563eb; }

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 3px 8px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		letter-spacing: 0.04em;
	}

	.badge-primary { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
	.badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
	.badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
	.badge-archived { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
	.badge-subtle { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

	.empty-card {
		background: #ffffff;
		border: 1px dashed var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 32px;
	}

	.empty-icon-circle {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	/* Mobile responsiveness */
	@media (max-width: 1024px) {
		.cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.subphases-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.cards-grid {
			grid-template-columns: 1fr;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
		.phase-header-btn {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
	}
</style>

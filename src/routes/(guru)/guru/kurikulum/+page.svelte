<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';

	let { data } = $props();

	// Active filter local state derived from server load data
	let selectedTaId = $state('');
	let selectedTingkatId = $state('');
	let selectedKelasId = $state('');

	// Keep local state in sync when server data changes
	$effect(() => {
		selectedTaId = data.monitoringData.selectedTahunAjaran?.id
			? String(data.monitoringData.selectedTahunAjaran.id)
			: '';
		selectedTingkatId = data.monitoringData.selectedTingkat?.id
			? String(data.monitoringData.selectedTingkat.id)
			: '';
		selectedKelasId = data.monitoringData.selectedKelas?.id
			? String(data.monitoringData.selectedKelas.id)
			: '';
	});

	// Collapsible phase state
	let expandedPhases = $state<Record<number, boolean>>({});

	// Initialize all phases expanded
	$effect(() => {
		const nextState: Record<number, boolean> = { ...expandedPhases };
		for (const p of data.monitoringData.phases) {
			if (nextState[p.id] === undefined) {
				nextState[p.id] = true;
			}
		}
		expandedPhases = nextState;
	});

	// Dropdown Options
	const taSelectOptions = $derived(
		data.monitoringData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const tingkatSelectOptions = $derived(
		data.monitoringData.tingkatOptions.map((t) => ({
			value: String(t.id),
			label: t.name
		}))
	);

	const kelasSelectOptions = $derived([
		{ value: '', label: 'Semua Rombel / Kelas' },
		...data.monitoringData.kelasOptions.map((k) => ({
			value: String(k.id),
			label: k.name
		}))
	]);

	function updateFilters(newTaId?: string, newTingkatId?: string, newKelasId?: string) {
		const ta = newTaId !== undefined ? newTaId : selectedTaId;
		const tk = newTingkatId !== undefined ? newTingkatId : selectedTingkatId;
		const kl = newKelasId !== undefined ? newKelasId : selectedKelasId;

		const params = new URLSearchParams();
		if (ta) params.set('tahunAjaranId', ta);
		if (tk) params.set('tingkatId', tk);
		if (kl) params.set('kelasInstanceId', kl);

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleTaChange(val: string | number | null) {
		updateFilters(String(val ?? ''), undefined, '');
	}

	function handleTingkatChange(val: string | number | null) {
		updateFilters(undefined, String(val ?? ''), '');
	}

	function handleKelasChange(val: string | number | null) {
		updateFilters(undefined, undefined, String(val ?? ''));
	}

	function togglePhase(phaseId: number) {
		expandedPhases[phaseId] = !expandedPhases[phaseId];
	}
</script>

<svelte:head>
	<title>Pantau Kurikulum — Guru Pembimbing | NLC</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Pantau Kurikulum per Tahun Ajaran</h1>
					{#if data.monitoringData.selectedTahunAjaran}
						<span class="badge badge-primary">
							TA {data.monitoringData.selectedTahunAjaran.name}
						</span>
					{/if}
					{#if data.monitoringData.selectedTingkat}
						<span class="badge badge-subtle">
							{data.monitoringData.selectedTingkat.name}
						</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					Supervisi ketercapaian kurikulum yang diterapakan pada tahun ajaran dan tingkat kelas tertentu.
				</p>
			</div>

			{#if data.monitoringData.activeTrackTitle}
				<div class="track-title-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 4 4v14a3 3 0 0 1 3-3h7z"/></svg>
					<span>{data.monitoringData.activeTrackTitle}</span>
				</div>
			{/if}
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     FILTER BAR: TAHUN AJARAN, TINGKAT, & ROMBEL
	     ══════════════════════════════════════════════════════════ -->
	<div class="filters-card">
		<div class="filters-grid">
			<!-- Select 1: Tahun Ajaran -->
			<div class="filter-col">
				<label for="ta-select" class="filter-label">Tahun Ajaran</label>
				<CustomSelect
					id="ta-select"
					name="tahunAjaranId"
					options={taSelectOptions}
					value={selectedTaId}
					onchange={handleTaChange}
					searchable={false}
				/>
			</div>

			<!-- Select 2: Tingkat Kelas -->
			<div class="filter-col">
				<label for="tingkat-select" class="filter-label">Tingkat Kelas</label>
				<CustomSelect
					id="tingkat-select"
					name="tingkatId"
					options={tingkatSelectOptions}
					value={selectedTingkatId}
					onchange={handleTingkatChange}
					searchable={false}
				/>
			</div>

			<!-- Select 3: Rombongan Belajar (Kelas) -->
			<div class="filter-col">
				<label for="kelas-select" class="filter-label">Rombongan Belajar</label>
				<CustomSelect
					id="kelas-select"
					name="kelasInstanceId"
					options={kelasSelectOptions}
					value={selectedKelasId}
					onchange={handleKelasChange}
					searchable={true}
				/>
			</div>
		</div>
	</div>

	{#if data.monitoringData.summary.totalExecutingClasses === 0}
		<div class="empty-card py-12 text-center">
			<div class="empty-icon-circle">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<h3 class="font-bold text-slate-800 text-base">Belum Ada Rombel yang Berjalan</h3>
			<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
				Tidak ditemukan rombongan belajar (kelas) aktif untuk {data.monitoringData.selectedTingkat?.name || 'Tingkat ini'} pada Tahun Ajaran {data.monitoringData.selectedTahunAjaran?.name || ''}.
			</p>
		</div>
	{:else if !data.monitoringData.activeTrackTitle}
		<div class="empty-card py-12 text-center">
			<div class="empty-icon-circle">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
			</div>
			<h3 class="font-bold text-slate-800 text-base">Belum Ada Curriculum Track Ditugaskan</h3>
			<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
				Rombongan belajar pada {data.monitoringData.selectedTingkat?.name} TA {data.monitoringData.selectedTahunAjaran?.name} belum ditugaskan alur kurikulum oleh Admin / Mentor.
			</p>
		</div>
	{:else}
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
		     PHASE & SUBPHASE HIERARCHY
		     ══════════════════════════════════════════════════════════ -->
		<section class="phases-section">
			<div class="section-header">
				<div>
					<h2 class="section-title">Breakdown Modul Pembelajaran ({data.monitoringData.phases.length} Phase)</h2>
					<p class="section-subtitle">
						Dipantau untuk {data.monitoringData.selectedKelas?.name || `Seluruh Kelas ${data.monitoringData.selectedTingkat?.name}`} (TA {data.monitoringData.selectedTahunAjaran?.name})
					</p>
				</div>
				<span class="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
					Track: {data.monitoringData.activeTrackTitle}
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
							<!-- Phase Header Button -->
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

							<!-- SubPhases Collapsible Container -->
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

													<!-- Content Meta Badges -->
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

													<!-- Student Completion Bar -->
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
		margin-bottom: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.hero-top-row {
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

	.track-title-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 700;
		color: #4f46e5;
		background: #e0e7ff;
		border: 1px solid #c7d2fe;
		padding: 6px 12px;
		border-radius: 8px;
	}

	/* Filters Card */
	.filters-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 16px 20px;
		margin-bottom: 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		align-items: center;
	}

	.filter-col {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Stats Grid */
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
		.filters-grid {
			grid-template-columns: 1fr;
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

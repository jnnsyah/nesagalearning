<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

	let { data } = $props();

	// Local reactive state
	let selectedTaId = $state(String(data.filters.taId || ''));
	let searchVal = $state(data.filters.search || '');
	let selectedKelasId = $state(String(data.filters.kelasId || ''));
	let selectedRiskLevel = $state(data.filters.riskLevel || 'semua');

	// Dropdown options
	let taDropdownOptions = $derived(
		(data.cardsData.academicYears || []).map((y: any) => ({
			value: String(y.id),
			label: `Tahun Ajaran ${y.name}${y.isActive ? ' (Aktif)' : ''}`
		}))
	);

	let classDropdownOptions = $derived(
		(data.classOptions || []).map((c: any) => ({
			value: String(c.id),
			label: `${c.name} (${c.tahunAjaranName})${!c.isActive || !c.tahunAjaranIsActive ? ' [TERARSIP]' : ''}`,
			description: `Tingkat ${c.tingkatName}`
		}))
	);

	const riskOptions = [
		{ value: 'semua', label: 'Semua Risiko' },
		{ value: 'KRITIS', label: 'KRITIS (< 60%)' },
		{ value: 'WASPADA', label: 'WASPADA (60-74%)' },
		{ value: 'SEHAT', label: 'SEHAT (≥ 75%)' }
	];

	// Debounced Live Search
	let debounceTimer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const term = searchVal;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (term !== (data.filters.search || '')) {
				applyFilters();
			}
		}, 300);
		return () => clearTimeout(debounceTimer);
	});

	function changeTahunAjaran(val: string | number | null) {
		const taId = String(val);
		const params = new URLSearchParams();
		if (taId) params.set('taId', taId);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function selectKelasCard(kelasId: number) {
		const params = new URLSearchParams();
		params.set('kelasId', String(kelasId));
		if (selectedTaId) params.set('taId', selectedTaId);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function backToClassGrid() {
		const params = new URLSearchParams();
		if (selectedTaId) params.set('taId', selectedTaId);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedKelasId) params.set('kelasId', selectedKelasId);
		if (selectedTaId) params.set('taId', selectedTaId);
		if (searchVal.trim()) params.set('search', searchVal.trim());
		if (selectedRiskLevel !== 'semua') params.set('risk', selectedRiskLevel);
		params.set('page', '1');

		const queryString = params.toString();
		const targetUrl = queryString ? `?${queryString}` : '/guru/monitoring';
		goto(targetUrl, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function resetFilters() {
		searchVal = '';
		selectedRiskLevel = 'semua';
		applyFilters();
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams();
		if (selectedKelasId) params.set('kelasId', selectedKelasId);
		if (selectedTaId) params.set('taId', selectedTaId);
		if (searchVal.trim()) params.set('search', searchVal.trim());
		if (selectedRiskLevel !== 'semua') params.set('risk', selectedRiskLevel);
		params.set('page', String(pageNum));

		const queryString = params.toString();
		goto(`?${queryString}`, { keepFocus: true, noScroll: true, replaceState: true });
	}
</script>

<svelte:head>
	<title>Class Health Monitoring & Intervensi Guru Advisor | NLC</title>
</svelte:head>

<div class="page-container">
	{#if data.viewMode === 'grid'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 1: CLASS SELECTION GRID VIEW (Pilih Kelas)
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-content-row">
				<div>
					<div class="hero-title-group">
						<h1 class="hero-title">Class Health Monitoring & Intervensi Advisor</h1>
						{#if data.cardsData.selectedTahunAjaran}
							<span class="badge badge-primary">
								{data.cardsData.selectedTahunAjaran.name}
							</span>
						{/if}
					</div>
					<p class="hero-subtitle">
						Pilih rombongan belajar (kelas) di bawah ini untuk memantau kesehatan kehadiran, penyelesaian tugas, dan daftar siswa yang membutuhkan intervensi.
					</p>
				</div>
				<div class="w-64 flex-shrink-0">
					<CustomSelect
						name="taId"
						options={taDropdownOptions}
						bind:value={selectedTaId}
						onchange={changeTahunAjaran}
					/>
				</div>
			</div>
		</header>

		<section class="class-cards-section">
			<div class="section-header-flex">
				<h2 class="section-title">Daftar Kelas ({data.cardsData.classCards.length} Kelas)</h2>
				<span class="type-mono text-xs text-slate-500">Tahun Ajaran: {data.cardsData.selectedTahunAjaran?.name}</span>
			</div>

			{#if data.cardsData.classCards.length === 0}
				<div class="card-table text-center py-12">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto text-slate-400 mb-2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
					<p class="font-bold text-slate-800 text-sm">Belum Ada Kelas di Tahun Ajaran Ini</p>
					<p class="text-xs text-slate-500 mt-1">Silakan pilih Tahun Ajaran lain dari dropdown di atas.</p>
				</div>
			{:else}
				<div class="class-cards-grid">
					{#each data.cardsData.classCards as card}
						<div
							class="class-health-card cursor-pointer"
							onclick={() => selectKelasCard(card.kelasId)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && selectKelasCard(card.kelasId)}
						>
							<div class="class-card-header">
								<div>
									<h3 class="class-card-name">{card.kelasName}</h3>
									<span class="class-card-tingkat">Tingkat {card.tingkatName} • {card.totalStudents} Siswa</span>
								</div>
								<div class="flex items-center gap-1.5 flex-wrap justify-end">
									{#if card.isArchived}
										<span class="badge badge-neutral">TERARSIP</span>
									{/if}
									<span
										class="badge"
										style="background: {card.healthColor}18; color: {card.healthColor}; border: 1px solid {card.healthColor}40;"
									>
										{card.healthStatus}
									</span>
								</div>
							</div>

							<div class="class-card-metrics">
								<div class="metric-pill">
									<span class="metric-label">% Kehadiran</span>
									<span class="metric-value">
										{card.totalStudents === 0 ? '-' : `${card.avgAttendanceRate}%`}
									</span>
								</div>
								<div class="metric-pill">
									<span class="metric-label">% Tugas Selesai</span>
									<span class="metric-value">
										{card.totalStudents === 0 ? '-' : `${card.avgTaskCompletionRate}%`}
									</span>
								</div>
								<div class="metric-pill">
									<span class="metric-label">Streak Rata-rata</span>
									<span class="metric-value">
										{card.totalStudents === 0 ? '-' : `${card.avgStreak} Hari`}
									</span>
								</div>
							</div>

							<div class="class-card-footer">
								{#if card.totalStudents === 0}
									<span class="neutral-count-pill">
										Belum Ada Siswa
									</span>
								{:else if card.alertStudentsCount > 0}
									<span class="alert-count-pill inline-flex items-center gap-1">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
										<span>{card.alertStudentsCount} Siswa Butuh Intervensi</span>
									</span>
								{:else}
									<span class="healthy-count-pill inline-flex items-center gap-1">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
										<span>Semua Siswa Sehat</span>
									</span>
								{/if}

								<button type="button" class="btn-pantau-kelas">
									<span>Pantau Kelas</span>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

	{:else if data.summary}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 2: DETAILED CLASS HEALTH DASHBOARD & ROSTER TABLE
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-content-row">
				<div>
					<div class="flex items-center gap-3 mb-2">
						<button
							type="button"
							onclick={backToClassGrid}
							class="btn-back-link cursor-pointer"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
							<span>Kembali ke Daftar Kelas</span>
						</button>
					</div>
					<div class="hero-title-group">
						<h1 class="hero-title">{data.summary.kelasName} — Health Dashboard</h1>
						{#if data.summary.isArchived}
							<span class="badge badge-neutral">TERARSIP</span>
						{/if}
						{#if data.summary.healthStatus === 'KRITIS'}
							<span class="badge badge-warning">KRITIS</span>
						{:else if data.summary.healthStatus === 'WASPADA'}
							<span class="badge badge-amber">WASPADA</span>
						{:else}
							<span class="badge badge-success">SEHAT</span>
						{/if}
					</div>
					<p class="hero-subtitle">
						Detail tingkat kehadiran, penyelesaian tugas, dan intervensi siswa untuk {data.summary.kelasName} ({data.summary.tahunAjaranName}).
					</p>
				</div>

				<div class="w-64 flex-shrink-0">
					<CustomSelect
						name="kelasId"
						options={classDropdownOptions}
						bind:value={selectedKelasId}
						onchange={applyFilters}
					/>
				</div>
			</div>
		</header>

		<!-- Key Metrics Grid -->
		<section class="stats-grid" aria-label="Statistik Kesehatan Kelas">
			<div class="stat-card">
				<div class="stat-icon-box icon-kelas">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.summary.healthStatus}</span>
					<span class="stat-label">Status Kesehatan Kelas</span>
					<span class="stat-subtext">{data.summary.kelasName} • {data.summary.tahunAjaranName}</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-siswa">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">
						{data.summary.totalStudents === 0 ? '-' : `${data.summary.avgAttendanceRate}%`}
					</span>
					<span class="stat-label">Kehadiran Rata-rata</span>
					<span class="stat-subtext">
						{data.summary.totalStudents === 0 ? 'Belum Ada Siswa Terdaftar' : `Dari ${data.summary.totalStudents} siswa aktif`}
					</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-active">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">
						{data.summary.totalStudents === 0 ? '-' : `${data.summary.avgTaskCompletionRate}%`}
					</span>
					<span class="stat-label">Tugas Selesai</span>
					<span class="stat-subtext">
						{data.summary.totalStudents === 0 ? 'Average Streak: -' : `Average Streak: ${data.summary.avgStreak} Hari`}
					</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-alert">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value text-red-600">{data.alertStudentsCount} Siswa</span>
					<span class="stat-label">Butuh Intervensi</span>
					<span class="stat-subtext">Kehadiran &lt; 75% / Streak putus</span>
				</div>
			</div>
		</section>

		<!-- Visual Attendance Distribution Chart -->
		<section class="card-table">
			<div class="card-header-flex">
				<div>
					<h3 class="card-title">Distribusi Kehadiran Siswa Kelas</h3>
					<p class="card-subtitle">Klasifikasi tingkat partisipasi siswa berdasarkan persentase kehadiran sesi</p>
				</div>
				<span class="count-pill count-pill-sky">{data.summary.totalStudents} Siswa Terdaftar</span>
			</div>

			<div class="bar-container">
				<div
					class="bar-segment bar-segment--excellent"
					style="width: {data.summary.attendanceTiers.excellentPct}%;"
					title="Sangat Baik: {data.summary.attendanceTiers.excellentCount} siswa ({data.summary.attendanceTiers.excellentPct}%)"
				></div>
				<div
					class="bar-segment bar-segment--good"
					style="width: {data.summary.attendanceTiers.goodPct}%;"
					title="Baik: {data.summary.attendanceTiers.goodCount} siswa ({data.summary.attendanceTiers.goodPct}%)"
				></div>
				<div
					class="bar-segment bar-segment--warning"
					style="width: {data.summary.attendanceTiers.warningPct}%;"
					title="Waspada: {data.summary.attendanceTiers.warningCount} siswa ({data.summary.attendanceTiers.warningPct}%)"
				></div>
				<div
					class="bar-segment bar-segment--critical"
					style="width: {data.summary.attendanceTiers.criticalPct}%;"
					title="Kritis: {data.summary.attendanceTiers.criticalCount} siswa ({data.summary.attendanceTiers.criticalPct}%)"
				></div>
			</div>

			<div class="tiers-grid">
				<div class="tier-card tier-card--excellent">
					<div class="tier-indicator"></div>
					<div>
						<span class="tier-name">Sangat Baik (90-100%)</span>
						<span class="tier-val">{data.summary.attendanceTiers.excellentCount} Siswa ({data.summary.attendanceTiers.excellentPct}%)</span>
					</div>
				</div>

				<div class="tier-card tier-card--good">
					<div class="tier-indicator"></div>
					<div>
						<span class="tier-name">Baik (75-89%)</span>
						<span class="tier-val">{data.summary.attendanceTiers.goodCount} Siswa ({data.summary.attendanceTiers.goodPct}%)</span>
					</div>
				</div>

				<div class="tier-card tier-card--warning">
					<div class="tier-indicator"></div>
					<div>
						<span class="tier-name">Waspada (60-74%)</span>
						<span class="tier-val">{data.summary.attendanceTiers.warningCount} Siswa ({data.summary.attendanceTiers.warningPct}%)</span>
					</div>
				</div>

				<div class="tier-card tier-card--critical">
					<div class="tier-indicator"></div>
					<div>
						<span class="tier-name">Kritis (&lt; 60%)</span>
						<span class="tier-val">{data.summary.attendanceTiers.criticalCount} Siswa ({data.summary.attendanceTiers.criticalPct}%)</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Filter Bar -->
		<FilterBar>
			{#snippet search()}
				<TextInput
					name="search"
					placeholder="Cari siswa real-time (Nama / Username)…"
					bind:value={searchVal}
					clearable
				/>
			{/snippet}

			{#snippet filters()}
				<div class="col-span-2 sm:col-span-2 flex items-center gap-2">
					<div class="flex-1">
						<CustomSelect
							name="riskLevel"
							options={riskOptions}
							bind:value={selectedRiskLevel}
							onchange={applyFilters}
							searchable={false}
						/>
					</div>
					{#if searchVal || selectedRiskLevel !== 'semua'}
						<button
							type="button"
							onclick={resetFilters}
							class="btn-drawer-secondary flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold flex-shrink-0"
							title="Reset Filter"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
							<span>Reset</span>
						</button>
					{/if}
				</div>
			{/snippet}
		</FilterBar>

		<!-- Student Health Roster Table -->
		<section class="card-table">
			<div class="card-header-flex">
				<div>
					<h3 class="card-title">Daftar Kesehatan Siswa & Intervensi Advisor</h3>
					<p class="card-subtitle">Menampilkan {data.rosterData.items.length} dari {data.rosterData.total} Siswa Terdaftar</p>
				</div>
				<span class="count-pill count-pill-sky">{data.rosterData.total} Siswa Total</span>
			</div>

			<div class="table-responsive">
				<table class="data-table">
					<thead>
						<tr>
							<th>Pengguna Siswa</th>
							<th>Tingkat Kehadiran</th>
							<th>Penyelesaian Tugas</th>
							<th>Streak Hari</th>
							<th>Status Risiko</th>
							<th>Catatan Intervensi</th>
							<th class="text-right">Aksi Advisor</th>
						</tr>
					</thead>
					<tbody>
						{#if data.rosterData.items.length === 0}
							<tr>
								<td colspan="7" class="empty-table-cell">
									<div class="empty-state-box">
										<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
										<p class="font-bold text-slate-800 text-sm mt-2">Tidak ada siswa yang sesuai kriteria filter</p>
										<p class="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau pilih filter tingkat risiko lain.</p>
									</div>
								</td>
							</tr>
						{:else}
							{#each data.rosterData.items as s}
								<tr class="table-row hover:bg-slate-50 transition" class:tr-alert={s.riskLevel !== 'SEHAT'}>
									<td>
										<div class="flex items-center gap-3">
											<div class="avatar-sm">
												{#if s.avatarUrl}
													<img src={s.avatarUrl} alt={s.fullName} class="avatar-img" />
												{:else}
													{s.fullName.charAt(0).toUpperCase()}
												{/if}
											</div>
											<div>
												<span class="font-bold text-slate-800 text-sm block">{s.fullName}</span>
												<span class="type-mono text-muted text-xs">@{s.username}</span>
											</div>
										</div>
									</td>

									<td>
										<div class="flex flex-col gap-1 min-w-[130px]">
											<div class="flex items-center justify-between gap-2">
												<span class="font-bold text-xs text-slate-800">
													{s.totalSessions === 0 ? '-' : `${s.attendanceRate}%`}
												</span>
												<span class="type-mono text-xs text-slate-500">{s.attendedCount}/{s.totalSessions} Sesi</span>
											</div>
											<div class="mini-progress-track">
												<div
													class="mini-progress-fill"
													class:fill-green={s.attendanceRate >= 75}
													class:fill-amber={s.attendanceRate >= 60 && s.attendanceRate < 75}
													class:fill-red={s.attendanceRate < 60}
													style="width: {s.totalSessions === 0 ? 0 : s.attendanceRate}%;"
												></div>
											</div>
										</div>
									</td>

									<td>
										<div class="flex flex-col gap-1 min-w-[130px]">
											<div class="flex items-center justify-between gap-2">
												<span class="font-bold text-xs text-slate-800">
													{s.totalTasks === 0 ? '-' : `${s.taskCompletionRate}%`}
												</span>
												<span class="type-mono text-xs text-slate-500">{s.approvedTasksCount}/{s.totalTasks} Tugas</span>
											</div>
											<div class="mini-progress-track">
												<div
													class="mini-progress-fill fill-blue"
													style="width: {s.totalTasks === 0 ? 0 : s.taskCompletionRate}%;"
												></div>
											</div>
										</div>
									</td>

									<td>
										<div class="flex items-center gap-1.5">
											<span class="streak-badge inline-flex items-center gap-1">
												<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
												<span>{s.currentStreak} Hari</span>
											</span>
											<span class="type-mono text-xs text-slate-400">(Max {s.maxStreak})</span>
										</div>
									</td>

									<td>
										{#if s.riskLevel === 'KRITIS'}
											<span class="badge badge-warning">KRITIS</span>
										{:else if s.riskLevel === 'WASPADA'}
											<span class="badge badge-amber">WASPADA</span>
										{:else}
											<span class="badge badge-success">SEHAT</span>
										{/if}
									</td>

									<td>
										{#if s.alertReasons.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each s.alertReasons as reason}
													<span class="alert-tag">
														{reason}
													</span>
												{/each}
											</div>
										{:else}
											<span class="text-xs text-emerald-600 font-medium">Performa Baik</span>
										{/if}
									</td>

									<td class="text-right">
										<a
											href="/guru/siswa/{s.studentId}"
											class="btn-action-profile"
											title="Lihat Detail & Catatan Advisor"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
											<span>Detail Advisor</span>
										</a>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			{#if data.rosterData.totalPages > 1}
				<div class="pagination-footer">
					<div class="pagination-info">
						Halaman <span class="font-bold text-slate-900">{data.rosterData.page}</span> dari <span class="font-bold text-slate-900">{data.rosterData.totalPages}</span>
					</div>
					<div class="pagination-buttons">
						{#if data.rosterData.page > 1}
							<button
								type="button"
								onclick={() => goToPage(data.rosterData.page - 1)}
								class="page-nav-btn cursor-pointer"
							>
								&larr; Sebelumnya
							</button>
						{:else}
							<span class="page-nav-btn page-nav-btn--disabled">&larr; Sebelumnya</span>
						{/if}

						<div class="page-numbers">
							{#each Array.from({ length: data.rosterData.totalPages }, (_, i) => i + 1) as pNum}
								{#if pNum === data.rosterData.page}
									<span class="page-num page-num--active">{pNum}</span>
								{:else if Math.abs(pNum - data.rosterData.page) <= 2 || pNum === 1 || pNum === data.rosterData.totalPages}
									<button
										type="button"
										onclick={() => goToPage(pNum)}
										class="page-num cursor-pointer"
									>
										{pNum}
									</button>
								{:else if Math.abs(pNum - data.rosterData.page) === 3}
									<span class="page-num-dots">...</span>
								{/if}
							{/each}
						</div>

						{#if data.rosterData.page < data.rosterData.totalPages}
							<button
								type="button"
								onclick={() => goToPage(data.rosterData.page + 1)}
								class="page-nav-btn cursor-pointer"
							>
								Selanjutnya &rarr;
							</button>
						{:else}
							<span class="page-nav-btn page-nav-btn--disabled">Selanjutnya &rarr;</span>
						{/if}
					</div>
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
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
			gap: 16px;
		}
	}

	/* Page Hero Section */
	.page-hero {
		background: var(--bg-card, #ffffff);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.hero-content-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.hero-title-group {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.hero-subtitle {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		margin-top: 4px;
		margin-bottom: 0;
	}

	.btn-back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
		transition: background 150ms ease;
	}

	.btn-back-link:hover {
		background: #c7d2fe;
	}

	/* Class Cards Grid (Tier 1) */
	.section-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.section-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.class-cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}

	@media (max-width: 1024px) {
		.class-cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.class-cards-grid {
			grid-template-columns: 1fr;
		}
	}

	.class-health-card {
		background: #ffffff;
		border: 1.5px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 16px;
		transition: all 150ms ease;
	}

	.class-health-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.08));
		border-color: var(--primary, #4f46e5);
	}

	.class-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.class-card-name {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.class-card-tingkat {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		display: block;
		margin-top: 2px;
	}

	.class-card-metrics {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		background: var(--bg-inset, #f8fafc);
		padding: 10px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #f1f5f9);
	}

	.metric-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.metric-label {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
	}

	.metric-value {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin-top: 2px;
	}

	.class-card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle, #f1f5f9);
	}

	.alert-count-pill {
		font-size: 11px;
		font-weight: 800;
		color: #b91c1c;
		background: #fef2f2;
		border: 1px solid #fecaca;
		padding: 3px 8px;
		border-radius: 9999px;
	}

	.healthy-count-pill {
		font-size: 11px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #bbf7d0;
		padding: 3px 8px;
		border-radius: 9999px;
	}

	.neutral-count-pill {
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		padding: 3px 8px;
		border-radius: 9999px;
	}

	.btn-pantau-kelas {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-md, 10px);
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.stat-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-kelas { background: #e0e7ff; color: #4f46e5; }
	.icon-active { background: #dcfce7; color: #166534; }
	.icon-siswa { background: #e0f2fe; color: #0369a1; }
	.icon-alert { background: #fef2f2; color: #dc2626; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		font-weight: 600;
		margin-top: 2px;
	}

	.stat-subtext {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted, #94a3b8);
		margin-top: 2px;
	}

	/* Card & Data Table */
	.card-table {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.card-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.card-subtitle {
		font-size: 12.5px;
		color: var(--text-muted, #64748b);
		margin-top: 4px;
		margin-bottom: 0;
	}

	.count-pill {
		display: inline-flex;
		align-items: center;
		padding: 3px 9px;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-weight: 700;
	}

	.count-pill-sky {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	/* Pure CSS Bar Chart */
	.bar-container {
		height: 18px;
		width: 100%;
		background: #f1f5f9;
		border-radius: 9999px;
		display: flex;
		overflow: hidden;
		margin-bottom: 16px;
	}

	.bar-segment {
		height: 100%;
		transition: width 300ms ease;
	}

	.bar-segment--excellent { background: #16a34a; }
	.bar-segment--good { background: #0284c7; }
	.bar-segment--warning { background: #d97706; }
	.bar-segment--critical { background: #dc2626; }

	.tiers-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	@media (max-width: 640px) {
		.tiers-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.tier-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.tier-card .tier-indicator {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-top: 4px;
		flex-shrink: 0;
	}

	.tier-card--excellent .tier-indicator { background: #16a34a; }
	.tier-card--good .tier-indicator { background: #0284c7; }
	.tier-card--warning .tier-indicator { background: #d97706; }
	.tier-card--critical .tier-indicator { background: #dc2626; }

	.tier-name {
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		display: block;
	}

	.tier-val {
		font-size: 12px;
		font-weight: 800;
		color: #0f172a;
		display: block;
		margin-top: 1px;
	}

	/* Table Section */
	.table-responsive {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 780px;
	}

	.data-table th {
		background: #f8fafc;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-hard, #e2e8f0);
		text-align: left;
	}

	.data-table td {
		padding: 14px;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
		font-size: 13px;
		vertical-align: middle;
	}

	.tr-alert {
		background: #fffdfa;
	}

	.avatar-sm {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-family: var(--font-macro);
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.type-mono {
		font-family: var(--font-mono);
	}

	.text-muted {
		color: var(--text-muted, #64748b);
	}

	/* Mini Progress Bar inside Table */
	.mini-progress-track {
		width: 100%;
		height: 6px;
		background: #f1f5f9;
		border-radius: 9999px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		border-radius: 9999px;
	}

	.fill-green { background: #16a34a; }
	.fill-amber { background: #d97706; }
	.fill-red { background: #dc2626; }
	.fill-blue { background: #0284c7; }

	.streak-badge {
		font-size: 11px;
		font-weight: 800;
		color: #c2410c;
		background: #ffedd5;
		padding: 2px 7px;
		border-radius: 9999px;
	}

	/* Standard Badges */
	.badge {
		padding: 3px 9px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		border-radius: 9999px;
	}

	.badge-primary { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
	.badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
	.badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
	.badge-warning { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }

	.alert-tag {
		font-size: 10px;
		font-weight: 700;
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.btn-action-profile {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary, #334155);
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-action-profile:hover {
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border-color: var(--primary, #4f46e5);
	}

	.empty-table-cell {
		text-align: center;
		padding: 40px 16px;
	}

	.empty-state-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: #94a3b8;
	}

	/* Pagination Footer Styling */
	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 16px;
		margin-top: 12px;
		border-top: 1px solid var(--border-subtle, #e2e8f0);
	}

	.pagination-info {
		font-size: 12px;
		color: var(--text-muted, #64748b);
	}

	.pagination-buttons {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.page-nav-btn {
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-hard, #cbd5e1);
		background: #ffffff;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary, #334155);
		transition: all 150ms ease;
	}

	.page-nav-btn:hover:not(.page-nav-btn--disabled) {
		background: #f1f5f9;
		color: #0f172a;
	}

	.page-nav-btn--disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.page-num {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px solid var(--border-hard, #cbd5e1);
		background: #ffffff;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary, #334155);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 150ms ease;
	}

	.page-num:hover:not(.page-num--active) {
		background: #f1f5f9;
		color: #0f172a;
	}

	.page-num--active {
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border-color: var(--primary, #4f46e5);
	}

	.page-num-dots {
		font-size: 12px;
		color: #94a3b8;
		padding: 0 4px;
	}
</style>

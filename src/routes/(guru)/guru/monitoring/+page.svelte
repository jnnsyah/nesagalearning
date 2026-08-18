<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

	let { data } = $props();

	// Local reactive state
	let searchVal = $state(data.filters.search || '');
	let selectedKelasId = $state(String(data.filters.kelasId || ''));
	let selectedRiskLevel = $state(data.filters.riskLevel || 'semua');

	// Class dropdown options
	let classDropdownOptions = $derived(
		(data.classOptions || []).map((c: any) => ({
			value: String(c.id),
			label: `${c.name} (${c.tahunAjaranName})`,
			description: `Tingkat ${c.tingkatName}`
		}))
	);

	const riskOptions = [
		{ value: 'semua', label: 'Semua Tingkat Risiko' },
		{ value: 'KRITIS', label: 'Perhatian Kritis (< 60%)' },
		{ value: 'WASPADA', label: 'Risiko Waspada (60% - 74%)' },
		{ value: 'SEHAT', label: 'Kondisi Sehat (≥ 75%)' }
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

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedKelasId) params.set('kelasId', selectedKelasId);
		if (searchVal.trim()) params.set('search', searchVal.trim());
		if (selectedRiskLevel !== 'semua') params.set('risk', selectedRiskLevel);

		const queryString = params.toString();
		const targetUrl = queryString ? `?${queryString}` : '/guru/monitoring';
		goto(targetUrl, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function resetFilters() {
		searchVal = '';
		selectedRiskLevel = 'semua';
		if (data.classOptions && data.classOptions.length > 0) {
			selectedKelasId = String(data.classOptions[0].id);
		}
		goto('/guru/monitoring', { keepFocus: true, noScroll: true, replaceState: true });
	}
</script>

<svelte:head>
	<title>Class Health Monitoring & Intervensi Guru Advisor | NLC</title>
</svelte:head>

<div class="health-monitoring-page">
	<!-- ══════════════════════════════════════════════════════════
	     1. HERO TITLE BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="hero-banner">
		<div class="hero-content">
			<div class="hero-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
				</svg>
			</div>
			<div>
				<h1 class="hero-title">Class Health Monitoring & Intervensi Advisor</h1>
				<p class="hero-subtitle">
					Pantau tingkat kehadiran, penyelesaian tugas, dan daftar siswa yang membutuhkan perhatian khusus secara real-time.
				</p>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (4 Stat Cards, 2x2 Mobile)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid">
		<!-- Card 1: Indeks Kesehatan Kelas -->
		<div class="stat-card">
			<div class="stat-header">
				<span class="stat-title">Status Kesehatan Kelas</span>
				<div class="stat-icon-wrap" style="background: {data.summary.healthColor}15; color: {data.summary.healthColor}">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</div>
			</div>
			<div class="stat-body">
				<div class="flex items-center gap-2 mt-1">
					<span class="stat-badge" style="background: {data.summary.healthColor}20; color: {data.summary.healthColor}; border-color: {data.summary.healthColor}40;">
						<span class="dot-indicator" style="background: {data.summary.healthColor};"></span>
						{data.summary.healthStatus}
					</span>
				</div>
				<span class="stat-meta">{data.summary.kelasName} • {data.summary.tahunAjaranName}</span>
			</div>
		</div>

		<!-- Card 2: Kehadiran Rata-rata -->
		<div class="stat-card">
			<div class="stat-header">
				<span class="stat-title">% Rata-Rata Kehadiran</span>
				<div class="stat-icon-wrap" style="background: #e0f2fe; color: #0284c7">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				</div>
			</div>
			<div class="stat-body">
				<span class="stat-value">{data.summary.avgAttendanceRate}%</span>
				<span class="stat-meta">Dari {data.summary.totalStudents} siswa aktif</span>
			</div>
		</div>

		<!-- Card 3: Penyelesaian Tugas -->
		<div class="stat-card">
			<div class="stat-header">
				<span class="stat-title">% Penyelesaian Tugas</span>
				<div class="stat-icon-wrap" style="background: #f0fdf4; color: #16a34a">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				</div>
			</div>
			<div class="stat-body">
				<span class="stat-value">{data.summary.avgTaskCompletionRate}%</span>
				<span class="stat-meta">Average Streak: {data.summary.avgStreak} Hari</span>
			</div>
		</div>

		<!-- Card 4: Siswa Perlu Perhatian -->
		<div class="stat-card">
			<div class="stat-header">
				<span class="stat-title">Butuh Intervensi Guru</span>
				<div class="stat-icon-wrap" style="background: #fef2f2; color: #dc2626">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				</div>
			</div>
			<div class="stat-body">
				<span class="stat-value text-red-600">{data.alertStudentsCount} Siswa</span>
				<span class="stat-meta">Kehadiran &lt; 75% atau streak putus</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     3. VISUAL ATTENDANCE DISTRIBUTION CHART (PURE CSS BAR)
	     ══════════════════════════════════════════════════════════ -->
	<section class="distribution-card">
		<div class="distribution-header">
			<div>
				<h3 class="distribution-title">Distribusi Kehadiran Siswa Kelas</h3>
				<p class="distribution-desc">Klasifikasi tingkat partisipasi siswa berdasarkan persentase kehadiran sesi</p>
			</div>
			<span class="total-badge">{data.summary.totalStudents} Siswa Terdaftar</span>
		</div>

		<!-- Pure CSS Multi-Segment Progress Bar -->
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

		<!-- Legend / Tier Metrics Grid -->
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

	<!-- ══════════════════════════════════════════════════════════
	     4. FILTER BAR ($lib/components/ui/FilterBar.svelte)
	     ══════════════════════════════════════════════════════════ -->
	<FilterBar>
		{#snippet search()}
			<div class="flex items-center gap-2 w-full">
				<div class="flex-1">
					<TextInput
						name="search"
						placeholder="Cari siswa real-time (Nama / Username)…"
						bind:value={searchVal}
						clearable
					/>
				</div>
				{#if searchVal || selectedRiskLevel !== 'semua'}
					<button
						type="button"
						onclick={resetFilters}
						class="btn-drawer-secondary flex items-center gap-1.5 py-2.5 px-3.5 text-xs font-bold flex-shrink-0"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
						<span>Reset Filter</span>
					</button>
				{/if}
			</div>
		{/snippet}

		{#snippet filters()}
			<CustomSelect
				name="kelasId"
				options={classDropdownOptions}
				bind:value={selectedKelasId}
				onchange={applyFilters}
			/>

			<CustomSelect
				name="riskLevel"
				options={riskOptions}
				bind:value={selectedRiskLevel}
				onchange={applyFilters}
			/>
		{/snippet}
	</FilterBar>

	<!-- ══════════════════════════════════════════════════════════
	     5. STUDENT HEALTH ROSTER TABLE
	     ══════════════════════════════════════════════════════════ -->
	<section class="table-container">
		<div class="table-header-row">
			<h2 class="table-title">Daftar Kesehatan Siswa & Intervensi Advisor</h2>
			<span class="table-count">{data.roster.length} Siswa Ditampilkan</span>
		</div>

		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th>NAMA SISWA</th>
						<th>TINGKAT KEHADIRAN</th>
						<th>PENYELESAIAN TUGAS</th>
						<th>STREAK HARI</th>
						<th>STATUS RISIKO</th>
						<th>CATATAN INTERVENSI</th>
						<th class="text-right">AKSI ADVISOR</th>
					</tr>
				</thead>
				<tbody>
					{#if data.roster.length === 0}
						<tr>
							<td colspan="7" class="empty-cell">
								<div class="empty-state">
									<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
									<p class="empty-title">Tidak ada siswa yang sesuai kriteria filter</p>
									<p class="empty-desc">Coba ubah kata kunci pencarian atau pilih filter tingkat risiko lain.</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each data.roster as s}
							<tr class:tr-alert={s.riskLevel !== 'SEHAT'}>
								<!-- Nama Siswa -->
								<td>
									<div class="student-profile-cell">
										<div class="avatar">
											{#if s.avatarUrl}
												<img src={s.avatarUrl} alt={s.fullName} />
											{:else}
												<span>{s.fullName.charAt(0).toUpperCase()}</span>
											{/if}
										</div>
										<div>
											<span class="font-bold text-slate-800 text-xs block">{s.fullName}</span>
											<span class="text-[11px] text-slate-500 font-mono">@{s.username}</span>
										</div>
									</div>
								</td>

								<!-- Tingkat Kehadiran -->
								<td>
									<div class="flex flex-col gap-1">
										<div class="flex items-center justify-between gap-2">
											<span class="font-bold text-xs text-slate-800">{s.attendanceRate}%</span>
											<span class="text-[11px] text-slate-500 font-semibold">{s.attendedCount}/{s.totalSessions} Sesi</span>
										</div>
										<div class="mini-progress-track">
											<div
												class="mini-progress-fill"
												class:fill-green={s.attendanceRate >= 75}
												class:fill-amber={s.attendanceRate >= 60 && s.attendanceRate < 75}
												class:fill-red={s.attendanceRate < 60}
												style="width: {s.attendanceRate}%;"
											></div>
										</div>
									</div>
								</td>

								<!-- Penyelesaian Tugas -->
								<td>
									<div class="flex flex-col gap-1">
										<div class="flex items-center justify-between gap-2">
											<span class="font-bold text-xs text-slate-800">{s.taskCompletionRate}%</span>
											<span class="text-[11px] text-slate-500 font-semibold">{s.approvedTasksCount}/{s.totalTasks} Tugas</span>
										</div>
										<div class="mini-progress-track">
											<div
												class="mini-progress-fill fill-blue"
												style="width: {s.taskCompletionRate}%;"
											></div>
										</div>
									</div>
								</td>

								<!-- Streak Hari -->
								<td>
									<div class="flex items-center gap-1.5">
										<span class="streak-badge">
											⚡ {s.currentStreak} Hari
										</span>
										<span class="text-[11px] text-slate-400 font-mono">(Max {s.maxStreak})</span>
									</div>
								</td>

								<!-- Status Risiko -->
								<td>
									{#if s.riskLevel === 'KRITIS'}
										<span class="risk-pill risk-pill--kritis">
											<span class="dot-indicator bg-red-600"></span>
											KRITIS
										</span>
									{:else if s.riskLevel === 'WASPADA'}
										<span class="risk-pill risk-pill--waspada">
											<span class="dot-indicator bg-amber-600"></span>
											WASPADA
										</span>
									{:else}
										<span class="risk-pill risk-pill--sehat">
											<span class="dot-indicator bg-green-600"></span>
											SEHAT
										</span>
									{/if}
								</td>

								<!-- Catatan Intervensi / Alert Reasons -->
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

								<!-- Aksi Advisor -->
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
	</section>
</div>

<style>
	.health-monitoring-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
	}

	/* Hero Banner */
	.hero-banner {
		background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
		border-radius: 16px;
		padding: 24px 28px;
		color: #ffffff;
		box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);
	}

	.hero-content {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.hero-icon {
		width: 48px;
		height: 48px;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		flex-shrink: 0;
	}

	.hero-title {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.hero-subtitle {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 4px;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.stat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stat-title {
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
	}

	.stat-icon-wrap {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-body {
		margin-top: 12px;
	}

	.stat-value {
		font-size: 22px;
		font-weight: 800;
		color: #0f172a;
		letter-spacing: -0.03em;
		display: block;
	}

	.stat-meta {
		font-size: 11px;
		color: #64748b;
		margin-top: 4px;
		display: block;
	}

	.stat-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 800;
		padding: 4px 10px;
		border-radius: 9999px;
		border: 1px solid;
	}

	.dot-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}

	/* Distribution Card */
	.distribution-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.distribution-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.distribution-title {
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.distribution-desc {
		font-size: 12px;
		color: #64748b;
		margin-top: 2px;
	}

	.total-badge {
		font-size: 11px;
		font-weight: 800;
		background: #f1f5f9;
		color: #334155;
		padding: 4px 10px;
		border-radius: 9999px;
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
	.table-container {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.table-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.table-title {
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.table-count {
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
	}

	.table-wrapper {
		width: 100%;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 780px;
	}

	th {
		background: #f8fafc;
		font-size: 10px;
		font-weight: 800;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 10px 14px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
		font-size: 12px;
		vertical-align: middle;
	}

	.tr-alert {
		background: #fffdfa;
	}

	.tr-alert:hover {
		background: #fff8f0;
	}

	.student-profile-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
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

	.risk-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 10px;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: 9999px;
		text-transform: uppercase;
	}

	.risk-pill--kritis { background: #fee2e2; color: #dc2626; }
	.risk-pill--waspada { background: #fef3c7; color: #b45309; }
	.risk-pill--sehat { background: #dcfce7; color: #15803d; }

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
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-action-profile:hover {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.empty-cell {
		text-align: center;
		padding: 40px 16px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: #94a3b8;
	}

	.empty-title {
		font-size: 14px;
		font-weight: 700;
		color: #334155;
		margin: 0;
	}

	.empty-desc {
		font-size: 12px;
		color: #64748b;
		margin: 0;
	}
</style>

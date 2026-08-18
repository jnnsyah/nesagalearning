<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { untrack } from 'svelte';

	let { data } = $props();

	// Filters State
	let selectedTaId = $derived(
		data.rosterData.selectedTahunAjaran?.id ? String(data.rosterData.selectedTahunAjaran.id) : ''
	);

	let selectedKelasId = $derived(
		data.rosterData.selectedKelas?.id ? String(data.rosterData.selectedKelas.id) : ''
	);

	let searchInput = $state(data.rosterData.searchQuery || '');
	let selectedRiskFilter = $state(data.rosterData.riskFilter || 'all');

	// Sync search input from server props
	$effect(() => {
		const q = data.rosterData.searchQuery;
		untrack(() => {
			if (searchInput !== q) searchInput = q;
		});
	});

	// Select Options
	const taSelectOptions = $derived(
		data.rosterData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const kelasSelectOptions = $derived(
		data.rosterData.mentorClasses.map((c) => ({
			value: String(c.id),
			label: `${c.name} (${c.tingkatName})`
		}))
	);

	const riskFilterOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'good', label: 'Kehadiran Baik (>=60%)' },
		{ value: 'warning', label: 'Perlu Perhatian (<60%)' },
		{ value: 'critical', label: 'Kritis (<40%)' }
	];

	function handleTaChange(val: string | number | null) {
		updateUrlFilters({ tahunAjaranId: String(val ?? '') });
	}

	function handleKelasChange(val: string | number | null) {
		updateUrlFilters({ kelasInstanceId: String(val ?? '') });
	}

	function handleRiskFilterChange(val: string | number | null) {
		updateUrlFilters({ risk: String(val ?? 'all') });
	}

	function updateUrlFilters(newParams: Record<string, string | null>) {
		const params = new URLSearchParams();
		if (selectedTaId) params.set('tahunAjaranId', selectedTaId);
		if (selectedKelasId) params.set('kelasInstanceId', selectedKelasId);
		if (searchInput.trim()) params.set('q', searchInput.trim());
		if (selectedRiskFilter !== 'all') params.set('risk', selectedRiskFilter);

		for (const [key, val] of Object.entries(newParams)) {
			if (val === null || val === '') {
				params.delete(key);
			} else {
				params.set(key, val);
			}
		}

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleSearchSubmit(e: SubmitEvent) {
		e.preventDefault();
		updateUrlFilters({ q: searchInput.trim() });
	}
</script>

<svelte:head>
	<title>Roster Siswa Kelas & Progress Track Pembelajaran — Mentor NLC</title>
</svelte:head>

<ToastContainer />

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Roster Siswa & Progress Track Pembelajaran</h1>
					{#if data.rosterData.selectedKelas}
						<span class="badge badge-primary">
							{data.rosterData.selectedKelas.name}
						</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					Direktori siswa aktif di kelas yang Anda ampu. Pantau statistik presensi, poin, dan progres pencapaian fase track pembelajaran siswa.
				</p>
			</div>

			<div class="flex items-center gap-3 flex-wrap">
				<div class="w-48">
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

				<div class="w-56">
					<label for="kelas-select" class="filter-label">Pilih Rombel Kelas</label>
					<CustomSelect
						id="kelas-select"
						name="kelasInstanceId"
						options={kelasSelectOptions}
						value={selectedKelasId}
						onchange={handleKelasChange}
						searchable={false}
					/>
				</div>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     4 KEY METRIC STAT CARDS (60% MINIMUM ATTENDANCE THRESHOLD)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Ringkasan Roster Siswa">
		<div class="stat-card">
			<div class="stat-icon-box icon-students">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.totalStudentsCount} Siswa</span>
				<span class="stat-label">Total Siswa Roster</span>
				<span class="stat-subtext">Kelas {data.rosterData.selectedKelas?.name || '-'}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-attendance">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.avgAttendanceRate}%</span>
				<span class="stat-label">Rata-rata Kehadiran</span>
				<span class="stat-subtext">Presensi Hadir Sesi</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-points">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.avgPoints} Pts</span>
				<span class="stat-label">Rata-rata Poin</span>
				<span class="stat-subtext">Total Gamifikasi Poin</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-attention">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.attentionNeededCount} Siswa</span>
				<span class="stat-label">Perlu Perhatian</span>
				<span class="stat-subtext">Kehadiran &lt; 60%</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     FILTER BAR & SEARCH
	     ══════════════════════════════════════════════════════════ -->
	<div class="filter-card mb-5">
		<form onsubmit={handleSearchSubmit} class="filter-controls-grid">
			<div class="search-input-col">
				<label for="roster-search-input" class="filter-label">Cari Nama Siswa / NISN</label>
				<div class="search-input-wrapper">
					<TextInput
						id="roster-search-input"
						name="q"
						placeholder="Ketik nama atau NISN siswa..."
						bind:value={searchInput}
					/>
					<button type="submit" class="btn-search-trigger" title="Cari">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					</button>
				</div>
			</div>

			<div class="w-56">
				<label for="risk-filter" class="filter-label">Filter Tingkat Risiko</label>
				<CustomSelect
					id="risk-filter"
					name="risk"
					options={riskFilterOptions}
					value={selectedRiskFilter}
					onchange={handleRiskFilterChange}
					searchable={false}
				/>
			</div>
		</form>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     ROSTER DATA TABLE (WITH INLINE PROGRESS BARS & DIRECT NAV LINKS)
	     ══════════════════════════════════════════════════════════ -->
	<section class="recap-card" aria-label="Daftar Siswa Roster">
		{#if data.rosterData.roster.length === 0}
			<div class="empty-card py-12 text-center">
				<div class="empty-icon-circle">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<h3 class="font-bold text-slate-800 text-base">Tidak Ada Siswa Ditemukan</h3>
				<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Tidak ditemukan siswa roster untuk kriteria pencarian dan filter yang dipilih.
				</p>
			</div>
		{:else}
			<div class="table-scroll-container">
				<table class="data-table">
					<thead>
						<tr>
							<th class="w-12 text-center">No</th>
							<th>Nama Siswa & Rombel</th>
							<th class="text-center">Total Poin</th>
							<th class="text-center">Hadir / Sesi</th>
							<th class="text-center">Izin / Sakit</th>
							<th class="text-center">Alpha</th>
							<th class="text-right w-36">% Kehadiran</th>
							<th class="text-right w-44">% Progress Track Pembelajaran</th>
							<th class="text-center w-28">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.rosterData.roster as student, idx}
							<tr class="hover:bg-slate-50 transition-colors">
								<td class="text-center text-xs font-mono text-slate-400">{idx + 1}</td>
								<td>
									<div class="student-profile-flex">
										<div class="avatar-circle">
											{#if student.avatarUrl}
												<img src={student.avatarUrl} alt={student.fullName} class="w-full h-full object-cover rounded-full" />
											{:else}
												<span>{student.fullName.charAt(0).toUpperCase()}</span>
											{/if}
										</div>
										<div class="student-name-box">
											<a
												href="/mentor/siswa/{student.userId}?kelasInstanceId={student.kelasId}"
												class="student-fullname hover:text-indigo-600 hover:underline transition-colors"
											>
												{student.fullName}
											</a>
											<div class="student-sub-info">
												<span class="student-nisn">{student.nisn ? `NISN: ${student.nisn}` : `@${student.username}`}</span>
												<span class="rombel-pill">{student.kelasName}</span>
											</div>
										</div>
									</div>
								</td>
								<td class="text-center font-bold text-indigo-700 font-mono text-sm">
									<span class="inline-flex items-center gap-1">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
										<span>{student.totalPoints} Pts</span>
									</span>
								</td>
								<td class="text-center font-bold text-emerald-700 font-mono text-sm">
									{student.totalHadir} / {student.totalSessionsCount}
								</td>
								<td class="text-center font-semibold text-amber-700 font-mono text-sm">
									{student.totalExcused}
								</td>
								<td class="text-center text-slate-400 font-mono text-sm">
									{student.totalAlpha}
								</td>
								<!-- Kehadiran Progress Bar -->
								<td class="text-right font-mono">
									<div class="flex items-center justify-end gap-2">
										<span class="font-bold text-slate-800">{student.attendanceRate}%</span>
										<div class="rate-mini-track">
											<div
												class="rate-mini-fill"
												class:fill-green={student.attendanceRate >= 60}
												class:fill-amber={student.attendanceRate >= 40 && student.attendanceRate < 60}
												class:fill-red={student.attendanceRate < 40}
												style="width: {student.attendanceRate}%;"
											></div>
										</div>
									</div>
								</td>
								<!-- Kurikulum Composite Progress Bar -->
								<td class="text-right font-mono">
									<div class="flex items-center justify-end gap-2">
										{#if student.hasAnyStarted}
											<span class="font-bold text-indigo-700">{student.overallProgress}%</span>
											<div class="rate-mini-track">
												<div
													class="rate-mini-fill fill-indigo"
													style="width: {student.overallProgress}%;"
												></div>
											</div>
										{:else}
											<span class="text-xs text-slate-400 font-normal">Belum Dimulai</span>
										{/if}
									</div>
								</td>
								<!-- Single Action Column -->
								<td class="text-center">
									<a
										href="/mentor/siswa/{student.userId}?kelasInstanceId={student.kelasId}"
										class="btn-detail-action"
										title="Lihat Detail Rapor Siswa"
									>
										<span>Detail</span>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
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

	.filter-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 4px;
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

	.icon-students { background: #e0e7ff; color: #4338ca; }
	.icon-attendance { background: #dcfce7; color: #15803d; }
	.icon-points { background: #fef3c7; color: #b45309; }
	.icon-attention { background: #fee2e2; color: #b91c1c; }

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

	/* Filter Card */
	.filter-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px 16px;
	}

	.filter-controls-grid {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}

	.search-input-col {
		flex: 1;
		min-width: 260px;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-search-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s ease;
	}

	.btn-search-trigger:hover {
		background: #4338ca;
	}

	/* Data Table */
	.recap-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		overflow: hidden;
	}

	.table-scroll-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 680px;
		font-size: 13px;
	}

	.data-table th {
		background: #f8fafc;
		color: #475569;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		text-transform: uppercase;
		padding: 10px 14px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
	}

	.student-profile-flex {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.avatar-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.student-name-box {
		display: flex;
		flex-direction: column;
	}

	.student-fullname {
		font-weight: 700;
		color: #0f172a;
		font-size: 13px;
		text-decoration: none;
	}

	.student-sub-info {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 2px;
	}

	.student-nisn {
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		color: #64748b;
	}

	.rombel-pill {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		background: #e0e7ff;
		color: #4338ca;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.rate-mini-track {
		width: 40px;
		height: 6px;
		background: #f1f5f9;
		border-radius: 3px;
		overflow: hidden;
	}

	.rate-mini-fill {
		height: 100%;
		border-radius: 3px;
	}

	.fill-green { background: #22c55e; }
	.fill-amber { background: #f59e0b; }
	.fill-red { background: #ef4444; }
	.fill-indigo { background: #6366f1; }

	.btn-detail-action {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 12px;
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.btn-detail-action:hover {
		background: #c7d2fe;
		color: #312e81;
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

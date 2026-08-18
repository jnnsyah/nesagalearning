<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';

	let { data } = $props();

	let selectedTaId = $derived(
		data.dashboardData.selectedTahunAjaran?.id
			? String(data.dashboardData.selectedTahunAjaran.id)
			: ''
	);

	const taSelectOptions = $derived(
		data.dashboardData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	function handleTaChange(val: string | number | null) {
		const taStr = String(val ?? '');
		const params = new URLSearchParams();
		if (taStr) params.set('tahunAjaranId', taStr);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Dashboard Guru Pembimbing — NLC Nesaga</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Dashboard Guru Pembimbing</h1>
					{#if data.dashboardData.selectedTahunAjaran}
						<span class="badge badge-primary">
							TA {data.dashboardData.selectedTahunAjaran.name}
						</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					Ringkasan agregat presensi sesi, skor ketercapaian komposit track pembelajaran, dan jurnal pendampingan siswa.
				</p>
			</div>

			<div class="w-64 flex-shrink-0">
				<label for="dash-ta-select" class="filter-label">Tahun Ajaran</label>
				<CustomSelect
					id="dash-ta-select"
					name="tahunAjaranId"
					options={taSelectOptions}
					value={selectedTaId}
					onchange={handleTaChange}
					searchable={false}
				/>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     4 KEY METRIC STAT CARDS
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Ringkasan Utama">
		<div class="stat-card">
			<div class="stat-icon-box icon-students">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.dashboardData.stats.totalStudentsCount} Siswa</span>
				<span class="stat-label">Total Siswa Terdaftar</span>
				<span class="stat-subtext">Dari {data.dashboardData.stats.totalClassesCount} Rombel Kelas</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-classes">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.dashboardData.stats.totalClassesCount} Rombel</span>
				<span class="stat-label">Kelas Berjalan</span>
				<span class="stat-subtext">{data.dashboardData.stats.totalSessionsCount} Sesi Pertemuan</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-attendance">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.dashboardData.stats.overallAttendanceRate}%</span>
				<span class="stat-label">Rata-rata Kehadiran</span>
				<span class="stat-subtext">Presensi Sesi Kelas</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-curriculum">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.dashboardData.stats.overallCurriculumRate}%</span>
				<span class="stat-label">Skor Komposit Track Pembelajaran</span>
				<span class="stat-subtext">Hadir (40%) + Tugas (30%) + Quiz (30%)</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     MAIN TWO-COLUMN LAYOUT
	     ══════════════════════════════════════════════════════════ -->
	<div class="dashboard-main-grid">
		<!-- Left Column: Rombel Supervisory Cards -->
		<div class="main-left-col">
			<section class="panel-section">
				<div class="panel-header">
					<div>
						<h3 class="panel-title">Monitoring Rombel Kelas</h3>
						<p class="panel-subtitle">Klik rombel untuk membuka rekap presensi atau matriks track pembelajaran.</p>
					</div>
				</div>

				{#if data.dashboardData.runningClasses.length === 0}
					<div class="empty-card py-10 text-center">
						<h3 class="font-bold text-slate-800 text-sm">Belum Ada Rombel Berjalan</h3>
						<p class="text-xs text-slate-500 mt-1">Tidak ada kelas aktif pada tahun ajaran yang dipilih.</p>
					</div>
				{:else}
					<div class="classes-grid">
						{#each data.dashboardData.runningClasses as cClass}
							<div class="class-summary-card">
								<div class="card-top flex items-center justify-between">
									<span class="badge badge-subtle">{cClass.tingkatName}</span>
									<span class="text-xs font-bold text-slate-900 font-mono">{cClass.name}</span>
								</div>

								<div class="metrics-dual-track mt-3">
									<div class="dual-metric-item">
										<div class="flex items-center justify-between text-xs mb-1">
											<span class="text-slate-500 font-mono">Kehadiran</span>
											<span class="font-bold text-slate-800">{cClass.attendanceRate}%</span>
										</div>
										<div class="mini-progress-track">
											<div
												class="mini-progress-fill"
												class:fill-green={cClass.attendanceRate >= 80}
												class:fill-amber={cClass.attendanceRate >= 50 && cClass.attendanceRate < 80}
												class:fill-red={cClass.attendanceRate < 50}
												style="width: {cClass.attendanceRate}%;"
											></div>
										</div>
									</div>

									<div class="dual-metric-item mt-2">
										<div class="flex items-center justify-between text-xs mb-1">
											<span class="text-slate-500 font-mono">Track Pembelajaran Komposit</span>
											<span class="font-bold text-indigo-700">{cClass.curriculumRate}%</span>
										</div>
										<div class="mini-progress-track">
											<div class="mini-progress-fill fill-indigo" style="width: {cClass.curriculumRate}%;"></div>
										</div>
									</div>
								</div>

								<div class="card-footer-actions mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
									<a
										href="/guru/presensi?kelasInstanceId={cClass.id}&tahunAjaranId={data.dashboardData.selectedTahunAjaran?.id || ''}&from=dashboard"
										class="btn-action-sm btn-action-indigo flex-1 text-center"
									>
										<span>Rekap Presensi</span>
									</a>
									<a
										href="/guru/kurikulum?kelasInstanceId={cClass.id}&tahunAjaranId={data.dashboardData.selectedTahunAjaran?.id || ''}&from=dashboard"
										class="btn-action-sm btn-action-outline flex-1 text-center"
									>
										<span>Matriks Track Pembelajaran</span>
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<!-- Right Column: Recent Notes Feed & Phase Overview -->
		<div class="main-right-col">
			<!-- Recent Supervisory Notes Feed -->
			<section class="panel-section mb-6">
				<div class="panel-header">
					<div>
						<h3 class="panel-title">Catatan Pendampingan Terbaru</h3>
						<p class="panel-subtitle">Jurnal intervensi & pendampingan siswa terbaru.</p>
					</div>
				</div>

				{#if data.dashboardData.recentNotes.length === 0}
					<div class="empty-card py-8 text-center">
						<p class="text-xs text-slate-400 font-mono">Belum ada catatan pendampingan siswa dicatat.</p>
					</div>
				{:else}
					<div class="notes-feed-stack">
						{#each data.dashboardData.recentNotes as note}
							<div class="note-feed-card">
								<div class="flex items-start justify-between gap-2">
									<div>
										<a href="/guru/siswa/{note.studentId}" class="font-bold text-slate-900 text-xs hover:underline">
											{note.studentName}
										</a>
										<span class="text-[11px] text-slate-400 font-mono block">@{note.studentUsername}</span>
									</div>
									<span class="badge badge-amber">{note.category}</span>
								</div>
								<p class="note-text-body mt-2 text-xs text-slate-600 font-mono">{note.note}</p>
								<div class="text-[10px] text-slate-400 font-mono mt-2 text-right">{note.createdAt}</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Quick Navigation Links -->
			<section class="panel-section">
				<div class="panel-header">
					<h3 class="panel-title">Akses Cepat Supervisi</h3>
				</div>
				<div class="quick-nav-stack mt-2">
					<a href="/guru/presensi" class="quick-nav-card">
						<div class="quick-icon icon-hadir">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
						<div>
							<h4 class="font-bold text-slate-800 text-xs">Laporan Rekap Presensi</h4>
							<p class="text-[11px] text-slate-500">Export Excel & PDF rekap presensi per-rombel</p>
						</div>
					</a>

					<a href="/guru/kurikulum" class="quick-nav-card mt-2">
						<div class="quick-icon icon-rate">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
						</div>
						<div>
							<h4 class="font-bold text-slate-800 text-xs">Monitoring Track Pembelajaran</h4>
							<p class="text-[11px] text-slate-500">Pantau progres komposit ketercapaian subfase</p>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>
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
	.icon-classes { background: #e0f2fe; color: #0369a1; }
	.icon-attendance { background: #dcfce7; color: #15803d; }
	.icon-curriculum { background: #fef3c7; color: #b45309; }

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

	/* Main Grid Layout */
	.dashboard-main-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;
	}

	.panel-section {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.panel-header {
		margin-bottom: 16px;
	}

	.panel-title {
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
	}

	.panel-subtitle {
		font-size: 12px;
		color: #64748b;
		margin-top: 2px;
	}

	.classes-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.class-summary-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px;
		transition: border-color 0.15s ease;
	}

	.class-summary-card:hover {
		border-color: #4f46e5;
	}

	.mini-progress-track {
		width: 100%;
		height: 6px;
		background: #e2e8f0;
		border-radius: 3px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		border-radius: 3px;
	}

	.fill-green { background: #22c55e; }
	.fill-amber { background: #f59e0b; }
	.fill-red { background: #ef4444; }
	.fill-indigo { background: #4f46e5; }

	.btn-action-sm {
		padding: 6px 10px;
		font-size: 11px;
		font-weight: 700;
		border-radius: 6px;
		text-decoration: none;
		display: inline-block;
		transition: all 0.15s ease;
	}

	.btn-action-indigo {
		background: #4f46e5;
		color: #ffffff;
	}

	.btn-action-indigo:hover {
		background: #4338ca;
	}

	.btn-action-outline {
		background: #ffffff;
		color: #334155;
		border: 1px solid #cbd5e1;
	}

	.btn-action-outline:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	/* Notes Feed Stack */
	.notes-feed-stack {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.note-feed-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
	}

	.note-text-body {
		line-height: 1.4;
	}

	/* Quick Nav Cards */
	.quick-nav-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		text-decoration: none;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.quick-nav-card:hover {
		background: #ffffff;
		border-color: #4f46e5;
	}

	.quick-icon {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
		.dashboard-main-grid {
			grid-template-columns: 1fr;
		}
		.classes-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

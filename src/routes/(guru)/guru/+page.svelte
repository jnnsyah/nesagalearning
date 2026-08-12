<script lang="ts">
	let { data } = $props();

	const faseData = [
		{ label: 'FASE 1', name: 'Mengoperasikan Komputer', value: 0 },
		{ label: 'FASE 2', name: 'Rakit PC', value: 0 },
		{ label: 'FASE 3', name: 'Dasar Jaringan', value: 0 },
		{ label: 'FASE 4', name: 'Packet Tracer', value: 0 },
	];

	const checkpoints = [
		{ id: 'CP-01', label: 'Mengoperasikan Komputer', status: 'Pending' },
		{ id: 'CP-02', label: 'Rakit PC & Diagnostik', status: 'Pending' },
		{ id: 'CP-03', label: 'Dasar Jaringan Komputer', status: 'Pending' },
		{ id: 'CP-04', label: 'Cisco Packet Tracer', status: 'Pending' },
	];
</script>

<svelte:head>
	<title>Monitoring Kelas — Guru NLC</title>
</svelte:head>

<div class="guru-shell">
	<!-- SIDEBAR (desktop) -->
	<aside class="sidebar hide-mobile" aria-label="Navigasi Guru">
		<div class="sidebar__brand">
			<div class="brand-wordmark">NLC</div>
			<div class="brand-sub">Portal Guru</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/guru" class="sidebar__nav-item active" aria-current="page">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
				Overview
			</a>
			<a href="/guru/kehadiran" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				Kehadiran
			</a>
			<a href="/guru/progress" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
				Progress Kelas
			</a>
			<a href="/guru/pertemuan" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				Daftar Pertemuan
			</a>
		</nav>
		<div class="sidebar__footer">
			<hr class="rule" />
			<div class="sidebar-profile">
				<div class="sidebar-avatar">{data.user?.fullName?.charAt(0) ?? 'G'}</div>
				<div class="sidebar-profile__info">
					<div class="sidebar-profile__name">{data.user?.fullName}</div>
					<div class="type-mono text-muted" style="font-size: 10px;">GURU OBSERVER</div>
				</div>
			</div>
			<a href="/logout" class="btn-ghost w-full mt-3" style="font-size: 12px; justify-content: center;">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
				Keluar
			</a>
		</div>
	</aside>

	<!-- MAIN -->
	<div class="guru-main">
		<header class="topbar hide-desktop">
			<div class="flex items-center gap-3">
				<span class="brand-wordmark" style="font-size: 1.2rem;">NLC</span>
				<span style="color: var(--text-muted);">•</span>
				<span style="font-size: 13px; font-weight: 700; color: var(--text-secondary);">Guru</span>
			</div>
			<a href="/logout" class="btn-ghost" style="padding: 6px 12px; font-size: 12px;">Keluar</a>
		</header>

		<div class="main-container">
			<!-- Page header -->
			<div class="page-header">
				<div>
					<div class="flex items-center gap-2 mb-2">
						<span class="badge badge-live">OBSERVER</span>
						<span class="type-mono text-muted">KLS-01 · TA 2026/2027</span>
					</div>
					<h1 class="page-title">Monitoring Kelas</h1>
					<p class="page-sub">Laporan agregat perkembangan kehadiran dan kurikulum TKJ kelas KLS-01.</p>
				</div>
				<div class="observer-badge hide-mobile">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
					<span>View Only</span>
				</div>
			</div>

			<!-- Aggregate stats -->
			<div class="stats-grid-4 mb-6">
				<div class="stat-card-v" style="--accent: #4f46e5; --bg: #e0e7ff;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Total Siswa</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">0</div>
					<div class="stat-card-v__meta">Terdaftar Aktif</div>
				</div>

				<div class="stat-card-v" style="--accent: #16a34a; --bg: #dcfce7;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Rata-rata Kehadiran</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">0%</div>
					<div class="stat-card-v__meta">Seluruh Pertemuan</div>
				</div>

				<div class="stat-card-v" style="--accent: #d97706; --bg: #fef3c7;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Fase Selesai</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">0/4</div>
					<div class="stat-card-v__meta">Checkpoint Kurikulum</div>
				</div>

				<div class="stat-card-v" style="--accent: #0d9488; --bg: #ccfbf1;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Total Pertemuan</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">0</div>
					<div class="stat-card-v__meta">Tahun Ajaran Ini</div>
				</div>
			</div>

			<!-- Attendance chart -->
			<section class="panel mb-6">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
						<span>Grafik Kehadiran per Fase</span>
					</div>
					<span class="type-mono text-muted" style="font-size: 11px;">KLS-01</span>
				</div>
				<div class="chart-area">
					<div class="chart-bars">
						{#each faseData as fase}
							<div class="chart-bar-item">
								<div class="chart-bar-pct">{fase.value}%</div>
								<div class="chart-bar-track">
									<div class="chart-bar-fill" style="height: {Math.max(fase.value, 4)}%;"></div>
								</div>
								<div class="chart-bar-label">{fase.label}</div>
								<div class="chart-bar-name">{fase.name}</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<!-- Checkpoint grid -->
			<section class="panel">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						<span>Progress Checkpoint Kurikulum</span>
					</div>
				</div>
				<div class="checkpoint-grid">
					{#each checkpoints as cp}
						<div class="checkpoint-card">
							<div class="checkpoint-id">{cp.id}</div>
							<div class="checkpoint-label">{cp.label}</div>
							<div class="checkpoint-footer">
								<span class="badge badge-pending">{cp.status}</span>
								<div class="checkpoint-bar">
									<div class="checkpoint-bar-fill" style="width: 0%;"></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.guru-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	.brand-wordmark {
		font-family: var(--font-macro);
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--primary);
		letter-spacing: -0.03em;
	}

	.brand-sub {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.sidebar__footer {
		margin-top: auto;
		padding: 16px 16px 24px;
	}

	.sidebar-profile {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 0;
	}

	.sidebar-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0d9488, #10b981);
		color: white;
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sidebar-profile__name {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.guru-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.main-container {
		padding: 28px 28px 48px;
		max-width: 1200px;
		width: 100%;
	}

	@media (max-width: 768px) {
		.main-container { padding: 20px 16px 48px; }
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 24px;
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.6rem, 4vw, 2.2rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.025em;
		margin-bottom: 6px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.observer-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #f0fdfa;
		border: 1px solid #99f6e4;
		border-radius: 10px;
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 700;
		color: #0d9488;
		white-space: nowrap;
	}

	.stats-grid-4 {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 900px) { .stats-grid-4 { grid-template-columns: repeat(2, 1fr); } }
	@media (max-width: 480px) { .stats-grid-4 { grid-template-columns: 1fr; } }

	.stat-card-v {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
		border-top: 3px solid var(--accent);
	}

	.stat-card-v:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-card-v__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.stat-card-v__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-card-v__icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--bg);
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-card-v__value {
		font-family: var(--font-macro);
		font-size: 2.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.stat-card-v__meta {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 6px;
	}

	/* Chart */
	.chart-area {
		padding: 24px;
	}

	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 24px;
		height: 200px;
	}

	.chart-bar-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.chart-bar-pct {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.chart-bar-track {
		flex: 1;
		width: 100%;
		max-width: 72px;
		display: flex;
		align-items: flex-end;
		background: var(--bg-cell);
		border-radius: var(--radius-md);
		overflow: hidden;
		padding: 4px;
	}

	.chart-bar-fill {
		width: 100%;
		background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
		border-radius: 8px;
		min-height: 4px;
		transition: height 600ms ease;
	}

	.chart-bar-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: var(--primary);
		margin-top: 8px;
	}

	.chart-bar-name {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		text-align: center;
		margin-top: 2px;
	}

	/* Checkpoint grid */
	.checkpoint-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		padding: 16px;
	}

	@media (max-width: 900px) { .checkpoint-grid { grid-template-columns: repeat(2, 1fr); } }
	@media (max-width: 480px) { .checkpoint-grid { grid-template-columns: 1fr; } }

	.checkpoint-card {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: border-color 200ms ease;
	}

	.checkpoint-card:hover {
		border-color: var(--border-accent);
	}

	.checkpoint-id {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.checkpoint-label {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		flex: 1;
	}

	.checkpoint-footer {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.checkpoint-bar {
		height: 5px;
		background: var(--border-hard);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.checkpoint-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5, #6366f1);
		border-radius: var(--radius-full);
		transition: width 500ms ease;
	}
</style>

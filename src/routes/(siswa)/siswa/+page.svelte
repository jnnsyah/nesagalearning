<script lang="ts">
	let { data } = $props();

	let role = $derived(data.user?.role ?? 'siswa');
	let uid = $derived(`USR/S-${String(data.user?.id ?? '000').padStart(3, '0')}`);
	let firstName = $derived(data.user?.fullName?.split(' ')[0] ?? 'Siswa');
</script>

<svelte:head>
	<title>Dashboard Siswa — NLC</title>
</svelte:head>

<div class="page-container">
	<!-- Welcome banner -->
	<section class="welcome-banner">
		<div class="welcome-banner__bg"></div>
		<div class="welcome-banner__inner">
			<div class="flex items-center gap-3 mb-3">
				<div class="avatar-xl">{data.user?.fullName?.charAt(0) ?? 'S'}</div>
				<div>
					<div class="flex items-center gap-2 mb-1">
						<span class="badge badge-hadir">{role.toUpperCase()}</span>
						<span class="type-mono text-muted">KLS-01 · TA 2026/2027</span>
					</div>
					<h1 class="welcome-name">Halo, {firstName}!</h1>
					<p class="type-mono text-muted">@{data.user?.username} · {uid}</p>
				</div>
			</div>
			<div class="flex items-center justify-between flex-wrap gap-3">
				<div class="welcome-quote">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					<span>Terus belajar, terus berkembang bersama NLC!</span>
				</div>
				<a
					href="/siswa/presensi"
					class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
				>
					<span>📱 Scan Presensi QR</span>
				</a>
			</div>
		</div>
	</section>

	<!-- Stats grid -->
	<section class="stats-grid mt-6">
		<div class="stat-card stat-card--indigo">
			<div class="stat-card__icon-wrap" style="background: #e0e7ff;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Total Poin</div>
				<div class="stat-card__value">0</div>
				<div class="stat-card__meta">TA 2026/2027 · KLS-01</div>
			</div>
		</div>

		<div class="stat-card stat-card--amber">
			<div class="stat-card__icon-wrap" style="background: #fef3c7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Streak Pertemuan</div>
				<div class="stat-card__value">0</div>
				<div class="stat-card__meta">Pertemuan Berturut-turut</div>
			</div>
		</div>

		<div class="stat-card stat-card--green">
			<div class="stat-card__icon-wrap" style="background: #dcfce7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Tingkat Kehadiran</div>
				<div class="stat-card__value">0%</div>
				<div class="stat-card__meta">Dari Total Sesi</div>
			</div>
		</div>
	</section>

	<!-- Two-col grid for tasks + progress -->
	<div class="two-col-grid mt-6">
		<!-- Tugas pending -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
					<span>Tugas Pending</span>
				</div>
				<span class="badge badge-pending">0 Tugas</span>
			</div>
			<div class="empty-state">
				<div class="empty-icon-wrap" style="background: #ecfdf5; color: #16a34a;">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				</div>
				<p class="empty-title">Semua Beres!</p>
				<p class="empty-sub">Tidak ada tugas pending. Semua sudah dikerjakan atau belum diberikan.</p>
			</div>
		</section>

		<!-- Progress Fase Kurikulum -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					<span>Progress Kurikulum</span>
				</div>
				<span class="type-mono text-muted" style="font-size: 11px;">TKJ Track</span>
			</div>
			<div class="phase-list">
				{#each [
					{ phase: 'FASE 1', name: 'Mengoperasikan Komputer', pct: 0, status: 'in-progress' },
					{ phase: 'FASE 2', name: 'Perakitan PC & Diagnostik', pct: 0, status: 'locked' },
					{ phase: 'FASE 3', name: 'Dasar Jaringan Komputer', pct: 0, status: 'locked' },
					{ phase: 'FASE 4', name: 'Cisco Packet Tracer & Routing', pct: 0, status: 'locked' },
				] as item}
					<div class="phase-item" class:phase-item--active={item.status === 'in-progress'}>
						<div class="phase-item__header">
							<div>
								<span class="phase-label">{item.phase}</span>
								<p class="phase-name">{item.name}</p>
							</div>
							{#if item.status === 'locked'}
								<span class="badge badge-pending">Terkunci</span>
							{:else}
								<span class="badge badge-live">Aktif</span>
							{/if}
						</div>
						<div class="phase-bar mt-2">
							<div class="phase-bar__fill" style="width: {item.pct}%;"></div>
						</div>
						<div class="phase-item__foot">0 dari 4 Sub-fase Selesai</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.page-container {
			padding: 20px 16px 48px;
		}
	}

	/* Welcome banner */
	.welcome-banner {
		position: relative;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}

	.welcome-banner__bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(224, 231, 255, 0.6) 0%, rgba(204, 251, 241, 0.4) 100%);
	}

	.welcome-banner__inner {
		position: relative;
		z-index: 1;
		padding: 28px 28px 24px;
	}

	.avatar-xl {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: white;
		font-family: var(--font-macro);
		font-size: 1.75rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
		flex-shrink: 0;
	}

	.welcome-name {
		font-family: var(--font-macro);
		font-size: clamp(1.35rem, 4vw, 1.85rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.welcome-quote {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		color: #0d9488;
		background: #ccfbf1;
		border: 1px solid #99f6e4;
		border-radius: 10px;
		padding: 8px 14px;
		width: fit-content;
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		display: flex;
		align-items: flex-start;
		gap: 16px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.stat-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-md);
	}

	.stat-card__icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card__body {
		flex: 1;
		min-width: 0;
	}

	.stat-card__label {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 2.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.stat-card__meta {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 6px;
	}

	/* Two-col grid */
	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 768px) {
		.two-col-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 36px 24px;
	}

	.empty-icon-wrap {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 6px;
		line-height: 1.5;
		max-width: 280px;
	}

	/* Phase list */
	.phase-list {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.phase-item {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
		transition: background 200ms ease, border-color 200ms ease;
	}

	.phase-item--active {
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.phase-item__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.phase-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.phase-name {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		margin-top: 2px;
	}

	.phase-bar {
		height: 6px;
		background: var(--border-hard);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.phase-bar__fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
		border-radius: var(--radius-full);
		transition: width 500ms ease;
	}

	.phase-item__foot {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 6px;
	}
</style>

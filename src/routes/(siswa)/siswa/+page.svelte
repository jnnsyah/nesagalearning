<script lang="ts">
	let { data } = $props();

	let role = $derived(data.user?.role ?? 'siswa');
	let uid = $derived(`USR/S-${String(data.user?.id ?? '000').padStart(3, '0')}`);
	let firstName = $derived(data.user?.fullName?.split(' ')[0] ?? 'Siswa');

	let totalPoints = $derived(data.profileStats?.totalPoints ?? 0);
	let currentStreak = $derived(data.profileStats?.currentStreak ?? 0);
	let attendanceCount = $derived(data.profileStats?.attendanceCount ?? 0);
	let kelasName = $derived(data.activeMembership?.kelasName ?? 'Kelas Aktif');
	let tahunAjaranName = $derived(data.activeMembership?.tahunAjaranName ?? 'TA Aktif');
	let phaseProgressList = $derived(data.phaseProgress ?? []);
	let pendingTasksList = $derived(data.pendingTasks ?? []);
	let historicalList = $derived(data.historicalProgress ?? []);
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
						<span class="type-mono text-muted">{kelasName} · {tahunAjaranName}</span>
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
				<div class="stat-card__value">{totalPoints}</div>
				<div class="stat-card__meta">{tahunAjaranName} · {kelasName}</div>
			</div>
		</div>

		<div class="stat-card stat-card--amber">
			<div class="stat-card__icon-wrap" style="background: #fef3c7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Streak Pertemuan</div>
				<div class="stat-card__value">{currentStreak}</div>
				<div class="stat-card__meta">Pertemuan Berturut-turut</div>
			</div>
		</div>

		<div class="stat-card stat-card--green">
			<div class="stat-card__icon-wrap" style="background: #dcfce7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Kehadiran Ter-record</div>
				<div class="stat-card__value">{attendanceCount}</div>
				<div class="stat-card__meta">Total Sesi Diikuti</div>
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
				<span class="badge {pendingTasksList.length > 0 ? 'badge-pending' : 'badge-hadir'}">{pendingTasksList.length} Tugas</span>
			</div>
			{#if pendingTasksList.length === 0}
				<div class="empty-state">
					<div class="empty-icon-wrap" style="background: #ecfdf5; color: #16a34a;">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					</div>
					<p class="empty-title">Semua Beres!</p>
					<p class="empty-sub">Tidak ada tugas pending. Semua sudah dikerjakan atau belum diberikan.</p>
				</div>
			{:else}
				<div class="task-list p-3 space-y-2">
					{#each pendingTasksList as t}
						<div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
							<div>
								<span class="text-xs font-bold text-indigo-600 block">{t.pertemuanTitle}</span>
								<h4 class="text-sm font-semibold text-slate-800 mt-0.5">{t.taskTitle}</h4>
								<p class="text-xs text-slate-500 mt-1 line-clamp-1">{t.taskDescription || 'Tidak ada deskripsi'}</p>
							</div>
							<a href="/siswa/tugas" class="btn-ghost-sm text-xs font-bold shrink-0">Kerjakan →</a>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Progress Fase Kurikulum Aktif -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					<span>Progress Kurikulum (Kelas Aktif)</span>
				</div>
				<span class="type-mono text-muted" style="font-size: 11px;">{kelasName}</span>
			</div>
			<div class="phase-list">
				{#if phaseProgressList.length === 0}
					<div class="p-6 text-center text-slate-500 text-xs font-medium">
						Belum ada data progress kurikulum untuk kelas ini.
					</div>
				{:else}
					{#each phaseProgressList as item, index}
						<div class="phase-item" class:phase-item--active={item.progressPercentage > 0 && item.progressPercentage < 100}>
							<div class="phase-item__header">
								<div>
									<span class="phase-label">FASE {index + 1}</span>
									<p class="phase-name">{item.phaseTitle}</p>
								</div>
								{#if item.progressPercentage === 100}
									<span class="badge badge-hadir">Selesai</span>
								{:else if item.progressPercentage > 0}
									<span class="badge badge-live">Berjalan</span>
								{:else}
									<span class="badge badge-pending">Belum Mulai</span>
								{/if}
							</div>
							<div class="phase-bar mt-2">
								<div class="phase-bar__fill" style="width: {item.progressPercentage}%;"></div>
							</div>
							<div class="phase-item__foot flex justify-between items-center">
								<span>{item.completedSubPhases} dari {item.totalSubPhases} Sub-fase Selesai</span>
								<span class="font-bold text-slate-700">{item.progressPercentage}%</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	</div>

	<!-- Riwayat Tingkat Terdahulu (Read-only) -->
	{#if historicalList.length > 0}
		<section class="panel mt-6">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
					<span>Riwayat Tingkat & Kenaikan Kelas (Read-Only)</span>
				</div>
				<span class="badge badge-hadir">{historicalList.length} Kelas Lulus/Pernah Diikuti</span>
			</div>
			<div class="p-4 space-y-4">
				{#each historicalList as history}
					<div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
						<div class="flex items-center justify-between flex-wrap gap-2 mb-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="badge badge-hadir text-uppercase">{history.status}</span>
									<span class="text-xs font-bold text-slate-500">{history.tahunAjaranName} · {history.tingkatName}</span>
								</div>
								<h3 class="text-base font-extrabold text-slate-800 mt-1">{history.kelasName} — {history.trackTitle}</h3>
							</div>
							<div class="text-right">
								<span class="text-xs text-slate-500 font-medium block">Poin Diraih di Kelas Ini</span>
								<span class="text-sm font-black text-indigo-600">+{history.totalPointsEarned} Poin</span>
							</div>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
							<div>
								<span class="text-slate-500 block font-medium">Ringkasan Presensi Sesi:</span>
								<span class="font-bold text-slate-700">{history.attendanceSummary.hadir} Hadir, {history.attendanceSummary.excused} Excused (Total {history.attendanceSummary.total} Sesi)</span>
							</div>
							<div>
								<span class="text-slate-500 block font-medium">Progress Fase Selesai:</span>
								<span class="font-bold text-slate-700">{history.phaseProgress.filter(p => p.progressPercentage === 100).length} dari {history.phaseProgress.length} Fase (100% Selesai)</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
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

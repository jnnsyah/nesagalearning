<script lang="ts">
	let { data } = $props();

	let role = $derived(data.user?.role ?? 'siswa');
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
	<!-- Welcome Banner Hero Card -->
	<section class="welcome-banner">
		<div class="welcome-banner__bg"></div>
		<div class="welcome-banner__inner">
			<div class="hero-content-flex">
				<div class="hero-user-info">
					<div class="avatar-hero">
						{#if data.user?.avatarUrl}
							<img src={data.user.avatarUrl} alt={data.user.fullName} class="avatar-img" referrerpolicy="no-referrer" />
						{:else}
							{data.user?.fullName?.charAt(0) ?? 'S'}
						{/if}
					</div>

					<div class="user-details">
						<div class="meta-pills-row">
							<span class="badge-role">{role.toUpperCase()}</span>
							<span class="badge-class">{kelasName}</span>
							<span class="badge-ta">{tahunAjaranName}</span>
						</div>
						<h1 class="welcome-title">Halo, {firstName}!</h1>
						<p class="user-sub">@{data.user?.username} &bull; {data.user?.nisn ? `NISN: ${data.user.nisn}` : (data.user?.email ?? 'Siswa Active')}</p>
					</div>
				</div>

				<div class="hero-actions">
					<a href="/siswa/presensi" class="btn-scan-hero">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<rect x="3" y="3" width="7" height="7" rx="1.5" />
							<rect x="14" y="3" width="7" height="7" rx="1.5" />
							<rect x="3" y="14" width="7" height="7" rx="1.5" />
							<rect x="14" y="14" width="7" height="7" rx="1.5" />
						</svg>
						<span>Scan QR Presensi</span>
					</a>
				</div>
			</div>

			<div class="hero-quote-bar">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
				</svg>
				<span>Terus belajar &amp; berkembang bersama Nesaga Learning Community</span>
			</div>
	</section>

	<!-- Completeness Warning Banner -->
	{#if data.completeness?.isIncomplete}
		<section class="completeness-alert-card mt-4">
			<div class="completeness-alert-inner">
				<div class="alert-icon-box">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
						<line x1="12" y1="9" x2="12" y2="13"/>
						<line x1="12" y1="17" x2="12.01" y2="17"/>
					</svg>
				</div>
				<div class="alert-content">
					<div class="alert-badge-tag">TINDAKAN DIPERLUKAN</div>
					<h3 class="alert-title">Data Akun Siswa Belum Lengkap!</h3>
					<ul class="alert-reasons-list">
						{#if data.completeness.isNisnMissing}
							<li>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
								<span><strong>NISN Belum Terisi:</strong> Masukkan 10 digit Nomor Induk Siswa Nasional di menu profil.</span>
							</li>
						{/if}
						{#if data.completeness.isClassUnassigned}
							<li>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
								<span><strong>Belum Ada Kelas:</strong> Hubungi Admin atau Guru untuk didaftarkan ke Kelas Aktif.</span>
							</li>
						{/if}
					</ul>
				</div>
				<div class="alert-actions">
					{#if data.completeness.isNisnMissing}
						<a href="/siswa/profile?tab=edit" class="btn-complete-data">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
							</svg>
							<span>Lengkapi NISN Sekarang</span>
						</a>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<!-- Key Metrics Stats Grid -->
	<section class="stats-grid mt-5">
		<div class="stat-card stat-card--indigo">
			<div class="stat-card__icon-wrap" style="background: #e0e7ff;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
				</svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Total Poin</div>
				<div class="stat-card__value">{totalPoints}</div>
				<div class="stat-card__meta truncate">{tahunAjaranName} &middot; {kelasName}</div>
			</div>
		</div>

		<div class="stat-card stat-card--amber">
			<div class="stat-card__icon-wrap" style="background: #fef3c7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
					<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
				</svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Streak Pertemuan</div>
				<div class="stat-card__value">{currentStreak}</div>
				<div class="stat-card__meta">Berturut-turut</div>
			</div>
		</div>

		<div class="stat-card stat-card--green">
			<div class="stat-card__icon-wrap" style="background: #dcfce7;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Kehadiran Presensi</div>
				<div class="stat-card__value">{attendanceCount}</div>
				<div class="stat-card__meta">Total Sesi Diikuti</div>
			</div>
		</div>
	</section>

	<!-- Two-Col Grid for Tasks + Curriculum Progress -->
	<div class="two-col-grid mt-5">
		<!-- Tugas Pending Panel -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
					<span>Tugas Perlu Dikerjakan</span>
				</div>
				<span class="badge {pendingTasksList.length > 0 ? 'badge-pending' : 'badge-hadir'}">{pendingTasksList.length} Tugas</span>
			</div>

			{#if pendingTasksList.length === 0}
				<div class="empty-state">
					<div class="empty-icon-wrap" style="background: #ecfdf5; color: #16a34a;">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					</div>
					<p class="empty-title">Semua Tugas Beres!</p>
					<p class="empty-sub">Tidak ada tugas pending. Semua tugas telah diselesaikan dengan baik.</p>
				</div>
			{:else}
				<div class="task-list p-3 space-y-2.5">
					{#each pendingTasksList as t}
						<div class="task-item-card p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
							<div class="min-w-0 flex-1">
								<span class="text-xs font-bold text-indigo-600 block mb-0.5">{t.pertemuanTitle}</span>
								<h4 class="text-sm font-extrabold text-slate-800 leading-snug">{t.taskTitle}</h4>
								<p class="text-xs text-slate-500 mt-1 line-clamp-2">{t.taskDescription || 'Tidak ada deskripsi tugas'}</p>
							</div>
							<a href="/siswa/tugas" class="btn-kerjakan-sm w-full sm:w-auto text-center shrink-0">
								<span>Kerjakan</span>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="9 18 15 12 9 6" />
								</svg>
							</a>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Progress Track Pembelajaran (Kelas Aktif) -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					<span>Progress Track Pembelajaran</span>
				</div>
				<span class="type-mono text-muted text-xs">{kelasName}</span>
			</div>

			<div class="phase-list">
				{#if phaseProgressList.length === 0}
					<div class="p-6 text-center text-slate-500 text-xs font-medium">
						Belum ada data progress track pembelajaran untuk kelas ini.
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

	<!-- Riwayat Tingkat Terdahulu (Read-Only) -->
	{#if historicalList.length > 0}
		<section class="panel mt-5">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
						<path d="M12 8v4l3 3" />
						<circle cx="12" cy="12" r="9" />
					</svg>
					<span>Riwayat Tingkat &amp; Kenaikan Kelas</span>
				</div>
				<span class="badge badge-hadir">{historicalList.length} Kelas Pernah Diikuti</span>
			</div>
			<div class="p-4 space-y-4">
				{#each historicalList as history}
					<div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
						<div class="flex items-center justify-between flex-wrap gap-2 mb-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="badge badge-hadir text-uppercase">{history.status}</span>
									<span class="text-xs font-bold text-slate-500">{history.tahunAjaranName} &middot; {history.tingkatName}</span>
								</div>
								<h3 class="text-base font-extrabold text-slate-800 mt-1">{history.kelasName} — {history.trackTitle}</h3>
							</div>
							<div class="text-right">
								<span class="text-xs text-slate-500 font-medium block">Poin Diraih</span>
								<span class="text-sm font-black text-indigo-600">+{history.totalPointsEarned} Poin</span>
							</div>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
							<div>
								<span class="text-slate-500 block font-medium">Ringkasan Presensi:</span>
								<span class="font-bold text-slate-700">{history.attendanceSummary.hadir} Hadir, {history.attendanceSummary.excused} Excused ({history.attendanceSummary.total} Sesi)</span>
							</div>
							<div>
								<span class="text-slate-500 block font-medium">Progress Fase:</span>
								<span class="font-bold text-slate-700">{history.phaseProgress.filter((p: any) => p.progressPercentage === 100).length} dari {history.phaseProgress.length} Fase Selesai</span>
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
		padding: 24px 32px 60px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* Welcome banner hero card */
	.welcome-banner {
		position: relative;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl, 16px);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.welcome-banner__bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(240, 253, 250, 0.5) 100%);
	}

	.welcome-banner__inner {
		position: relative;
		z-index: 1;
		padding: 24px 28px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.hero-content-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}

	.hero-user-info {
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 0;
	}

	.avatar-hero {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		font-family: var(--font-macro);
		font-size: 1.65rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
		border: 3px solid #ffffff;
		flex-shrink: 0;
		overflow: hidden;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.meta-pills-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.badge-role {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #86efac;
		padding: 3px 10px;
		border-radius: 9999px;
	}

	.badge-class {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 3px 10px;
		border-radius: 6px;
	}

	.badge-ta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-muted);
	}

	.welcome-title {
		font-family: var(--font-macro);
		font-size: clamp(1.35rem, 3.5vw, 1.85rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.15;
		margin: 2px 0 0;
	}

	.user-sub {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--text-muted);
	}

	.hero-actions {
		flex-shrink: 0;
	}

	.btn-scan-hero {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 20px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border-radius: 12px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
	}

	.btn-scan-hero:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4);
	}

	.hero-quote-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 600;
		color: #0f766e;
		background: rgba(204, 251, 241, 0.7);
		border: 1px solid #99f6e4;
		border-radius: 8px;
		padding: 8px 14px;
		width: fit-content;
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-card__icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 12px;
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
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.stat-card__meta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 4px;
	}

	/* Two-col grid */
	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}

	.btn-kerjakan-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 7px 14px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
		min-height: 34px;
	}

	.btn-kerjakan-sm:hover {
		background: #4338ca;
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
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 4px;
		line-height: 1.5;
		max-width: 280px;
	}

	/* Phase list */
	.phase-list {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.phase-item {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 10px);
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
		font-size: 10.5px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 6px;
	}

	/* Mobile Responsiveness Enhancements (< 1024px & < 640px) */
	@media (max-width: 1023px) {
		.page-container {
			padding: 20px 24px 60px;
			gap: 20px;
		}

		.two-col-grid {
			grid-template-columns: 1fr;
			gap: 20px;
		}
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 84px;
			gap: 16px;
		}

		.welcome-banner__inner {
			padding: 18px 16px;
			gap: 14px;
		}

		.hero-content-flex {
			flex-direction: column;
			align-items: stretch;
			gap: 16px;
		}

		.hero-user-info {
			gap: 14px;
		}

		.avatar-hero {
			width: 54px;
			height: 54px;
			font-size: 1.4rem;
		}

		.welcome-title {
			font-size: 1.3rem;
		}

		.btn-scan-hero {
			width: 100%;
			padding: 11px 16px;
			font-size: 12.5px;
			min-height: 44px;
		}

		.hero-quote-bar {
			width: 100%;
			font-size: 11.5px;
			padding: 8px 12px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.stat-card {
			padding: 16px;
			gap: 14px;
		}

		.stat-card__icon-wrap {
			width: 44px;
			height: 44px;
		}

		.stat-card__value {
			font-size: 1.8rem;
		}

		.stat-card__label {
			font-size: 12px;
		}
	}
	/* Completeness Alert Card */
	.completeness-alert-card {
		background: linear-gradient(135deg, #fffdf5 0%, #fffbe6 100%);
		border: 1.5px solid #fde047;
		border-radius: var(--radius-lg, 12px);
		padding: 18px 20px;
		box-shadow: 0 4px 16px rgba(234, 179, 8, 0.12);
	}

	.completeness-alert-inner {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	@media (max-width: 640px) {
		.completeness-alert-inner {
			flex-direction: column;
		}
	}

	.alert-icon-box {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: #fef08a;
		color: #a16207;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-badge-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #ca8a04;
		letter-spacing: 0.04em;
	}

	.alert-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: #713f12;
		margin: 2px 0 8px;
	}

	.alert-reasons-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 12.5px;
		color: #854d0e;
	}

	.alert-reasons-list li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		line-height: 1.4;
	}

	.alert-reasons-list svg {
		color: #d97706;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.alert-actions {
		display: flex;
		align-items: center;
		align-self: center;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.alert-actions {
			width: 100%;
			margin-top: 6px;
		}
	}

	.btn-complete-data {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 18px;
		background: linear-gradient(135deg, #d97706, #ca8a04);
		color: #ffffff;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 3px 10px rgba(217, 119, 6, 0.3);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-complete-data:hover {
		background: linear-gradient(135deg, #b45309, #d97706);
		transform: translateY(-1px);
	}
</style>

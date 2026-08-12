<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard Mentor — NLC</title>
</svelte:head>

<div class="mentor-shell">
	<!-- SIDEBAR (desktop) -->
	<aside class="sidebar hide-mobile" aria-label="Navigasi Mentor">
		<div class="sidebar__brand">
			<div class="brand-wordmark">NLC</div>
			<div class="brand-sub">Portal Mentor</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/mentor" class="sidebar__nav-item active" aria-current="page">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
				Dashboard
			</a>
			<a href="/mentor/kurikulum" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
				Kurikulum
			</a>
			<a href="/mentor/pertemuan" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				Pertemuan
			</a>
			<a href="/mentor/siswa" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				Data Siswa
			</a>
			<a href="/mentor/grading" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
				Grading Tugas
			</a>
		</nav>
		<div class="sidebar__footer">
			<hr class="rule" />
			<div class="sidebar-profile">
				<div class="sidebar-avatar">{data.user?.fullName?.charAt(0) ?? 'M'}</div>
				<div class="sidebar-profile__info">
					<div class="sidebar-profile__name">{data.user?.fullName}</div>
					<div class="type-mono text-muted" style="font-size: 10px;">@{data.user?.username}</div>
				</div>
			</div>
			<a href="/logout" class="btn-ghost w-full mt-3" style="font-size: 12px; justify-content: center;">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
				Keluar
			</a>
		</div>
	</aside>

	<!-- MAIN CONTENT -->
	<div class="mentor-main">
		<!-- Topbar (mobile) -->
		<header class="topbar hide-desktop">
			<div class="flex items-center gap-3">
				<span class="brand-wordmark" style="font-size: 1.2rem;">NLC</span>
				<span class="topbar-sep">•</span>
				<span style="font-size: 13px; font-weight: 700; color: var(--text-secondary);">Mentor</span>
			</div>
			<a href="/logout" class="btn-ghost" style="padding: 6px 12px; font-size: 12px;">Keluar</a>
		</header>

		<!-- Page container -->
		<div class="main-container">
			<!-- Page header -->
			<div class="page-header">
				<div>
					<div class="flex items-center gap-2 mb-2">
						<span class="badge badge-hadir">MENTOR AKTIF</span>
						<span class="type-mono text-muted">KLS-01 · TA 2026/2027</span>
					</div>
					<h1 class="page-title">Dashboard Mentor</h1>
					<p class="page-sub">Selamat datang kembali, <strong>{data.user?.fullName}</strong>. Kelola pertemuan & pantau progress siswa.</p>
				</div>
				<a href="/mentor/pertemuan/create" class="btn-primary hide-mobile" style="width: auto; padding: 10px 20px; font-size: 13px; white-space: nowrap;">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Buat Pertemuan
				</a>
			</div>

			<!-- Overview stats -->
			<div class="stats-row">
				<div class="stat-card-h">
					<div class="stat-card-h__icon" style="background: #e0e7ff; color: #4f46e5;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					</div>
					<div>
						<div class="stat-card-h__label">Siswa Aktif</div>
						<div class="stat-card-h__value">0</div>
						<div class="stat-card-h__meta">Kelas KLS-01</div>
					</div>
				</div>

				<div class="stat-card-h">
					<div class="stat-card-h__icon" style="background: #fef3c7; color: #d97706;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
					</div>
					<div>
						<div class="stat-card-h__label">Tugas Menunggu</div>
						<div class="stat-card-h__value">0</div>
						<div class="stat-card-h__meta">Pending Grading</div>
					</div>
				</div>

				<div class="stat-card-h">
					<div class="stat-card-h__icon" style="background: #ccfbf1; color: #0d9488;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
					</div>
					<div>
						<div class="stat-card-h__label">Sesi Berikutnya</div>
						<div class="stat-card-h__value" style="font-size: 1.1rem;">—</div>
						<div class="stat-card-h__meta">Belum Dijadwalkan</div>
					</div>
				</div>
			</div>

			<!-- Two-column content -->
			<div class="two-col-grid mt-6">
				<!-- Grading queue -->
				<section class="panel">
					<div class="section-header">
						<div class="flex items-center gap-2">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
							<span>Submission Menunggu</span>
						</div>
						<span class="badge badge-pending">0 Item</span>
					</div>
					<div class="empty-state">
						<div class="empty-icon-wrap" style="background: #ecfdf5; color: #16a34a;">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
						</div>
						<p class="empty-title">Tidak Ada Pending</p>
						<p class="empty-sub">Semua tugas siswa sudah diperiksa.</p>
					</div>
				</section>

				<!-- Recent sessions -->
				<section class="panel">
					<div class="section-header">
						<div class="flex items-center gap-2">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
							<span>Pertemuan Terbaru</span>
						</div>
					</div>
					<div class="empty-state">
						<div class="empty-icon-wrap" style="background: #eff6ff; color: #2563eb;">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
						<p class="empty-title">Belum Ada Pertemuan</p>
						<p class="empty-sub">Jadwal pertemuan komunitas akan muncul di sini.</p>
					</div>
				</section>
			</div>

			<!-- Quick actions strip -->
			<div class="quick-actions mt-6">
				<div class="quick-actions__header">Aksi Cepat</div>
				<div class="quick-actions__grid">
					<a href="/mentor/kurikulum" class="quick-action-card">
						<div class="quick-action-card__icon" style="background: #e0e7ff; color: #4f46e5;">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
						</div>
						<div class="quick-action-card__label">Kurikulum</div>
					</a>
					<a href="/mentor/pertemuan" class="quick-action-card">
						<div class="quick-action-card__icon" style="background: #ccfbf1; color: #0d9488;">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
						<div class="quick-action-card__label">Pertemuan</div>
					</a>
					<a href="/mentor/siswa" class="quick-action-card">
						<div class="quick-action-card__icon" style="background: #fef3c7; color: #d97706;">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
						</div>
						<div class="quick-action-card__label">Data Siswa</div>
					</a>
					<a href="/mentor/grading" class="quick-action-card">
						<div class="quick-action-card__icon" style="background: #fee2e2; color: #dc2626;">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
						</div>
						<div class="quick-action-card__label">Grading</div>
					</a>
				</div>
			</div>

		</div>
	</div>
</div>

<style>
	.mentor-shell {
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
		letter-spacing: 0.03em;
	}

	.topbar-sep {
		font-size: 12px;
		color: var(--text-muted);
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
		background: linear-gradient(135deg, #4f46e5, #6366f1);
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

	.mentor-main {
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
		.main-container {
			padding: 20px 16px 48px;
		}
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

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 640px) {
		.stats-row { grid-template-columns: 1fr; }
		.page-header { flex-direction: column; }
	}

	.stat-card-h {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.stat-card-h:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-card-h__icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card-h__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.stat-card-h__value {
		font-family: var(--font-macro);
		font-size: 2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.stat-card-h__meta {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 768px) {
		.two-col-grid { grid-template-columns: 1fr; }
	}

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
		margin-top: 4px;
		line-height: 1.5;
		max-width: 240px;
	}

	.quick-actions {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		box-shadow: var(--shadow-sm);
	}

	.quick-actions__header {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 16px;
	}

	.quick-actions__grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	@media (max-width: 640px) {
		.quick-actions__grid { grid-template-columns: repeat(2, 1fr); }
	}

	.quick-action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 16px 12px;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all 150ms ease;
	}

	.quick-action-card:hover {
		border-color: var(--border-accent);
		background: var(--primary-light);
		transform: translateY(-2px);
	}

	.quick-action-card__icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.quick-action-card__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
	}
</style>

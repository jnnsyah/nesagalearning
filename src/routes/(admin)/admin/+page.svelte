<script lang="ts">
	let { data } = $props();

	const quickActions = [
		{ href: '/admin/users/create', cat: 'PENGGUNA', label: 'Tambah User', desc: 'Buat akun siswa / guru / mentor baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>`, color: '#4f46e5', bg: '#e0e7ff' },
		{ href: '/admin/tahun-ajaran/create', cat: 'AKADEMIK', label: 'Buka Tahun Ajaran', desc: 'Setup periode akademik baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, color: '#0d9488', bg: '#ccfbf1' },
		{ href: '/admin/master/room', cat: 'MASTER DATA', label: 'Kelola Ruangan', desc: 'Kelola ruang lab & kelas', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, color: '#d97706', bg: '#fef3c7' },
		{ href: '/admin/konfigurasi', cat: 'PENGATURAN', label: 'Konfigurasi Poin', desc: 'Atur poin presensi & tugas', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`, color: '#9333ea', bg: '#f3e8ff' },
		{ href: '/admin/audit', cat: 'KEAMANAN', label: 'Audit Log Stream', desc: 'Riwayat aktivitas sistem', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, color: '#dc2626', bg: '#fee2e2' },
		{ href: '/admin/users', cat: 'AKUN', label: 'Reset Password', desc: 'Atur ulang password pengguna', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`, color: '#0891b2', bg: '#e0f2fe' },
	];
</script>

<svelte:head>
	<title>Pusat Kontrol — Admin NLC</title>
</svelte:head>

<div class="admin-shell">
	<!-- SIDEBAR (desktop) -->
	<aside class="sidebar hide-mobile" aria-label="Navigasi Admin">
		<div class="sidebar__brand">
			<div class="brand-wordmark">NLC</div>
			<div class="brand-sub">Panel Administrator</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/admin" class="sidebar__nav-item active" aria-current="page">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
				Overview
			</a>
			<a href="/admin/users" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				Manajemen User
			</a>
			<a href="/admin/tahun-ajaran" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				Tahun Ajaran
			</a>
			<a href="/admin/konfigurasi" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
				Konfigurasi Poin
			</a>
			<a href="/admin/audit" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				Audit Log
			</a>
			<a href="/admin/master" class="sidebar__nav-item">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
				Master Data
			</a>
		</nav>
		<div class="sidebar__footer">
			<hr class="rule" />
			<div class="sidebar-profile">
				<div class="sidebar-avatar">{data.user?.fullName?.charAt(0) ?? 'A'}</div>
				<div>
					<div class="sidebar-profile__name">{data.user?.fullName}</div>
					<div class="type-mono text-muted" style="font-size: 10px;">ADMINISTRATOR</div>
				</div>
			</div>
			<a href="/logout" class="btn-ghost w-full mt-3" style="font-size: 12px; justify-content: center;">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
				Keluar
			</a>
		</div>
	</aside>

	<!-- MAIN -->
	<div class="admin-main">
		<!-- Topbar mobile -->
		<header class="topbar hide-desktop">
			<div class="flex items-center gap-3">
				<span class="brand-wordmark" style="font-size: 1.2rem;">NLC</span>
				<span style="color: var(--text-muted);">•</span>
				<span style="font-size: 13px; font-weight: 700; color: var(--text-secondary);">Admin</span>
			</div>
			<a href="/logout" class="btn-ghost" style="padding: 6px 12px; font-size: 12px;">Keluar</a>
		</header>

		<!-- Main Container -->
		<div class="main-container">
			<!-- Header with system status -->
			<div class="page-header">
				<div>
					<div class="flex items-center gap-2 mb-2">
						<span class="badge badge-live">SYSTEM ONLINE</span>
						<span class="type-mono text-muted">TA 2026/2027</span>
					</div>
					<h1 class="page-title">Pusat Kontrol Sistem</h1>
					<p class="page-sub">Pengaturan master data, akun pengguna, dan konfigurasi platform NLC.</p>
				</div>
				<div class="system-status-chip hide-mobile">
					<div class="status-dot"></div>
					<span>Semua Sistem Normal</span>
				</div>
			</div>

			<!-- System status stats -->
			<div class="stats-grid-4 mb-6">
				<div class="stat-card-v" style="--accent: #4f46e5; --bg: #e0e7ff;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Total Pengguna</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">5</div>
					<div class="stat-card-v__meta">Terdaftar di Sistem</div>
				</div>

				<div class="stat-card-v" style="--accent: #0d9488; --bg: #ccfbf1;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Tahun Ajaran</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">1</div>
					<div class="stat-card-v__meta">2026/2027 Aktif</div>
				</div>

				<div class="stat-card-v" style="--accent: #d97706; --bg: #fef3c7;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Kelas Aktif</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">1</div>
					<div class="stat-card-v__meta">Kelas 1 TA 2026/2027</div>
				</div>

				<div class="stat-card-v" style="--accent: #dc2626; --bg: #fee2e2;">
					<div class="stat-card-v__top">
						<span class="stat-card-v__label">Audit Log</span>
						<div class="stat-card-v__icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
						</div>
					</div>
					<div class="stat-card-v__value">0</div>
					<div class="stat-card-v__meta">Entri Terbaru</div>
				</div>
			</div>

			<!-- Two column: Quick actions + Audit stream -->
			<div class="two-col-grid">
				<!-- Quick actions -->
				<section class="panel">
					<div class="section-header">
						<div class="flex items-center gap-2">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
							<span>Aksi Cepat Administrator</span>
						</div>
					</div>
					<div class="quick-actions-grid">
						{#each quickActions as action}
							<a href={action.href} class="action-tile">
								<div class="action-tile__icon" style="background: {action.bg}; color: {action.color};">
									{@html action.icon}
								</div>
								<div class="action-tile__body">
									<div class="action-tile__cat">{action.cat}</div>
									<div class="action-tile__label">{action.label}</div>
									<div class="action-tile__desc">{action.desc}</div>
								</div>
								<svg class="action-tile__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
							</a>
						{/each}
					</div>
				</section>

				<!-- Audit log stream -->
				<section class="panel">
					<div class="section-header">
						<div class="flex items-center gap-2">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
							<span>Audit Log Stream</span>
						</div>
						<span class="badge badge-live">Real-time</span>
					</div>
					<div class="audit-empty">
						<div class="audit-empty__icon">
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
						</div>
						<p class="empty-title">Log Stream Kosong</p>
						<p class="empty-sub">Aktivitas sistem terbaru akan terekam di sini secara otomatis.</p>
						<a href="/admin/audit" class="btn-ghost mt-3" style="width: auto; font-size: 12px;">
							Lihat Semua Log
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
						</a>
					</div>

					<!-- System health indicators -->
					<div class="health-panel">
						<div class="health-panel__title">Status Komponen Sistem</div>
						{#each [
							{ label: 'Auth Service', ok: true },
							{ label: 'Database', ok: true },
							{ label: 'File Storage (R2)', ok: true },
							{ label: 'QR Token Generator', ok: true },
						] as comp}
							<div class="health-row">
								<div class="health-indicator" class:health-indicator--ok={comp.ok}></div>
								<span class="health-label">{comp.label}</span>
								<span class="health-status">{comp.ok ? 'Operational' : 'Error'}</span>
							</div>
						{/each}
					</div>
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	.admin-shell {
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

	.admin-main {
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

	.system-status-chip {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 12px;
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 700;
		color: #059669;
		white-space: nowrap;
	}

	.status-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
		animation: pulse-live 2s infinite ease-in-out;
	}

	@keyframes pulse-live {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
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

	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 768px) {
		.two-col-grid { grid-template-columns: 1fr; }
		.page-header { flex-direction: column; }
	}

	/* Quick actions */
	.quick-actions-grid {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.action-tile {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: background 150ms ease, transform 150ms ease;
		cursor: pointer;
	}

	.action-tile:hover {
		background: var(--bg-inset);
		transform: translateX(4px);
	}

	.action-tile__icon {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.action-tile__body {
		flex: 1;
		min-width: 0;
	}

	.action-tile__cat {
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.06em;
		margin-bottom: 2px;
	}

	.action-tile__label {
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.action-tile__desc {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 1px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-tile__arrow {
		color: var(--text-ghost);
		opacity: 0;
		transition: opacity 150ms ease;
		flex-shrink: 0;
	}

	.action-tile:hover .action-tile__arrow {
		opacity: 1;
		color: var(--primary);
	}

	/* Audit empty + health */
	.audit-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 28px 24px 20px;
	}

	.audit-empty__icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #fee2e2;
		color: #dc2626;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
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
		max-width: 240px;
		line-height: 1.5;
	}

	.health-panel {
		margin: 0 12px 12px;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
	}

	.health-panel__title {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		margin-bottom: 10px;
	}

	.health-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 0;
	}

	.health-row + .health-row {
		border-top: 1px solid var(--border-hard);
	}

	.health-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #dc2626;
		flex-shrink: 0;
	}

	.health-indicator--ok {
		background: #10b981;
		box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
	}

	.health-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
	}

	.health-status {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: #059669;
	}
</style>

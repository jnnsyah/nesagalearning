<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard Mentor — NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Page header row with navigation breadcrumb & action button -->
	<div class="page-header-row">
		<div>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<span class="bc-current">Dashboard</span>
			</nav>
			<h1 class="page-title">Dashboard Mentor</h1>
			<p class="page-sub">Selamat datang kembali, <strong>{data.user?.fullName}</strong>. Kelola pertemuan & pantau progress siswa.</p>
		</div>
		<a href="/mentor/pertemuan/create" class="btn-create hide-mobile" style="text-decoration:none;">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			<span>Buat Pertemuan</span>
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
	<div class="two-col-grid">
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
	<div class="quick-actions">
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

<style>
	/* ── Content area identical to /mentor/kurikulum ── */
	.content-area {
		padding: 24px 28px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1300px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.btn-create {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: linear-gradient(135deg, #4338ca, #4f46e5 60%, #6366f1);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		text-decoration: none;
		box-shadow: var(--shadow-glow);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(79,70,229,0.45);
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 640px) {
		.stats-row { grid-template-columns: 1fr; }
		.page-header-row { flex-direction: column; }
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

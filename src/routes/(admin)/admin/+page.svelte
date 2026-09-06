<script lang="ts">
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';

	let { data } = $props();

	const quickActions = [
		{ href: '/admin/users', cat: 'PENGGUNA', label: 'Kelola & Tambah User', desc: 'Buat & atur akun siswa / guru / mentor baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>`, color: '#4f46e5', bg: '#e0e7ff' },
		{ href: '/admin/tahun-ajaran', cat: 'PERIODE', label: 'Manajemen Periode & Semester', desc: 'Setup periode komunitas & semester baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, color: '#0d9488', bg: '#ccfbf1' },
		{ href: '/admin/master', cat: 'MASTER DATA', label: 'Master Data Pembelajaran', desc: 'Kelola jenjang, tingkat, & mapel', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, color: '#d97706', bg: '#fef3c7' },
		{ href: '/admin/konfigurasi', cat: 'PENGATURAN', label: 'Konfigurasi Sistem & Poin', desc: 'Atur bobot poin, KKM, & streak', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`, color: '#9333ea', bg: '#f3e8ff' },
		{ href: '/admin/audit-logs', cat: 'KEAMANAN', label: 'Audit Log Stream', desc: 'Riwayat aktivitas & audit trail sistem', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, color: '#dc2626', bg: '#fee2e2' },
		{ href: '/admin/email', cat: 'KOMUNIKASI', label: 'Template & Log Email', desc: 'Atur template notifikasi & log pengiriman', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`, color: '#0891b2', bg: '#e0f2fe' },
	];
</script>

<svelte:head>
	<title>Pusat Kontrol — Admin NLC</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     PAGE HEADER CARD
	     ══════════════════════════════════════════════════════════ -->
	<PageHeaderCard
		title="Pusat Kontrol Sistem"
		subtitle="Pengaturan master data, akun pengguna, dan konfigurasi platform NLC."
		breadcrumbs={[{ label: 'Dashboard' }]}
	>
		{#snippet badges()}
			<span class="badge badge-success inline-flex items-center gap-1">
				<span class="status-dot"></span>
				<span>SYSTEM ONLINE</span>
			</span>
			<span class="badge badge-neutral">TA 2026/2027</span>
		{/snippet}
	</PageHeaderCard>

	<!-- ══════════════════════════════════════════════════════════
	     SYSTEM OVERVIEW STAT CARDS
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Status Komponen Utama">
		<StatCard
			label="Total Pengguna"
			value="5"
			subtext="Terdaftar di Sistem"
			variant="streak"
			href="/admin/users"
			tooltip="Kelola Pengguna"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
				</svg>
			{/snippet}
		</StatCard>

		<StatCard
			label="Tahun Ajaran"
			value="1"
			subtext="2026/2027 Aktif"
			variant="attendance"
			href="/admin/tahun-ajaran"
			tooltip="Kelola Periode & Semester"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			{/snippet}
		</StatCard>

		<StatCard
			label="Kelas Aktif"
			value="1"
			subtext="Kelas 1 TA 2026/2027"
			variant="pending"
			href="/admin/kelas"
			tooltip="Kelola Kelompok Kelas"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				</svg>
			{/snippet}
		</StatCard>

		<StatCard
			label="Audit Log"
			value="0"
			subtext="Entri Terbaru"
			variant="revisi"
			href="/admin/audit-logs"
			tooltip="Lihat Audit Log Stream"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			{/snippet}
		</StatCard>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     TWO COLUMN GRID: QUICK ACTIONS + SYSTEM HEALTH / AUDIT LOG
	     ══════════════════════════════════════════════════════════ -->
	<div class="two-col-grid">
		<!-- Quick actions panel -->
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

		<!-- Audit log stream & system health -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
					<span>Audit Log Stream</span>
				</div>
				<span class="badge badge-neutral">Real-time</span>
			</div>
			<div class="audit-empty">
				<div class="audit-empty__icon">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</div>
				<p class="empty-title">Log Stream Kosong</p>
				<p class="empty-sub">Aktivitas sistem terbaru akan terekam di sini secara otomatis.</p>
				<a href="/admin/audit-logs" class="btn-ghost mt-3" style="width: auto; font-size: 12px;">
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

<style>
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #16a34a;
		box-shadow: 0 0 6px rgba(22, 163, 74, 0.5);
		animation: pulse-live 2s infinite ease-in-out;
		display: inline-block;
	}

	@keyframes pulse-live {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 768px) {
		.two-col-grid { grid-template-columns: 1fr; }
	}

	.panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
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
		border-radius: var(--radius-md, 8px);
		text-decoration: none;
		transition: background 150ms ease, transform 150ms ease;
		cursor: pointer;
	}

	.action-tile:hover {
		background: var(--bg-inset, #f8fafc);
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
		font-family: var(--font-mono, monospace);
		font-size: 9px;
		font-weight: 800;
		color: var(--text-muted, #94a3b8);
		letter-spacing: 0.06em;
		margin-bottom: 2px;
	}

	.action-tile__label {
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}

	.action-tile__desc {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin-top: 1px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-tile__arrow {
		color: var(--text-ghost, #cbd5e1);
		opacity: 0;
		transition: opacity 150ms ease;
		flex-shrink: 0;
	}

	.action-tile:hover .action-tile__arrow {
		opacity: 1;
		color: var(--primary, #4f46e5);
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
		color: var(--text-primary, #0f172a);
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-secondary, #64748b);
		margin-top: 4px;
		max-width: 240px;
		line-height: 1.5;
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-hard, #cbd5e1);
		background: #ffffff;
		color: var(--text-primary, #0f172a);
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.btn-ghost:hover {
		background: #f8fafc;
	}

	.health-panel {
		margin: 0 12px 12px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-md, 8px);
		padding: 14px 16px;
	}

	.health-panel__title {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: var(--text-muted, #94a3b8);
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
		border-top: 1px solid var(--border-subtle, #f1f5f9);
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
		color: var(--text-primary, #0f172a);
		flex: 1;
	}

	.health-status {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		color: #059669;
	}
</style>

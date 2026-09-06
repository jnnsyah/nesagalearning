<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data } = $props();

	let isSyncingR2 = $state(false);
	let isCleaningOrphans = $state(false);
	let isCleanOrphanModalOpen = $state(false);
	let syncFormRef: HTMLFormElement;
	let cleanFormRef: HTMLFormElement;

	function formatDate(d: Date | string): string {
		const dt = new Date(d);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(dt);
	}

	const quickActions = [
		{ href: '/admin/users', cat: 'PENGGUNA', label: 'Kelola & Tambah User', desc: 'Buat & atur akun siswa / guru / mentor baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>`, color: '#4f46e5', bg: '#e0e7ff' },
		{ href: '/admin/tahun-ajaran', cat: 'PERIODE', label: 'Manajemen Periode & Semester', desc: 'Setup periode komunitas & semester baru', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, color: '#0d9488', bg: '#ccfbf1' },
		{ href: '/admin/master', cat: 'MASTER DATA', label: 'Master Data Pembelajaran', desc: 'Kelola jenjang, tingkat, & mapel', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, color: '#d97706', bg: '#fef3c7' },
		{ href: '/admin/konfigurasi', cat: 'PENGATURAN', label: 'Konfigurasi Sistem & Poin', desc: 'Atur bobot poin, KKM, & streak', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 1 0 14.14"/></svg>`, color: '#9333ea', bg: '#f3e8ff' },
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
			<span class="badge badge-neutral">{data.stats?.activeTaName || 'TA 2026/2027'}</span>
		{/snippet}
	</PageHeaderCard>

	<!-- ══════════════════════════════════════════════════════════
	     SYSTEM OVERVIEW STAT CARDS (REAL DB DATA)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Status Komponen Utama">
		<StatCard
			label="Total Pengguna"
			value={data.stats?.totalUsers ?? 0}
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
			value={data.stats?.activeTaName ?? 'Belum Set'}
			subtext="Periode Komunitas Aktif"
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
			value={data.stats?.activeKelasCount ?? 0}
			subtext="Kelompok Kelas Berjalan"
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
			value={data.stats?.totalAuditLogs ?? 0}
			subtext="Total Entri Terekam"
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
	     LOCAL DOCKER STORAGE & CLOUDFLARE R2 BACKUP PANEL
	     ══════════════════════════════════════════════════════════ -->
	<section class="panel">
		<div class="section-header">
			<div class="flex items-center gap-2">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
				</svg>
				<span>Statistik File Storage & Cloudflare R2 Backup</span>
			</div>
			<span class="badge" class:badge-success={data.storageStats?.r2Backup?.isConfigured} class:badge-neutral={!data.storageStats?.r2Backup?.isConfigured}>
				{data.storageStats?.r2Backup?.isConfigured ? 'R2 CLOUD SYNC ACTIVE' : 'DOCKER VOLUME MODE'}
			</span>
		</div>

		<div class="storage-stats-container">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Main Storage Usage Card -->
				<div class="storage-main-card">
					<div class="storage-main-info">
						<span class="storage-label">Kapasitas Disk Terpakai</span>
						<strong class="storage-value">{data.storageStats?.formattedTotalSize || '0 B'}</strong>
						<span class="storage-subtext">{data.storageStats?.totalFiles || 0} Total File Tersimpan di Server</span>
					</div>
					<div class="storage-badge-wrap">
						<span class="storage-pill">
							<span class="status-dot"></span>
							/app/uploads
						</span>
					</div>
				</div>

				<!-- Folder Breakdown Grid -->
				<div class="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="storage-mini-card">
						<span class="mini-label">Materi & Modul</span>
						<strong class="mini-val">{data.storageStats?.breakdown?.materials?.formattedSize || '0 B'}</strong>
						<span class="mini-meta">{data.storageStats?.breakdown?.materials?.count || 0} File</span>
					</div>

					<div class="storage-mini-card">
						<span class="mini-label">Foto Avatars</span>
						<strong class="mini-val">{data.storageStats?.breakdown?.avatars?.formattedSize || '0 B'}</strong>
						<span class="mini-meta">{data.storageStats?.breakdown?.avatars?.count || 0} File</span>
					</div>

					<div class="storage-mini-card">
						<span class="mini-label">Tugas Siswa</span>
						<strong class="mini-val">{data.storageStats?.breakdown?.submissions?.formattedSize || '0 B'}</strong>
						<span class="mini-meta">{data.storageStats?.breakdown?.submissions?.count || 0} File</span>
					</div>

					<div class="storage-mini-card">
						<span class="mini-label">Lampiran Pesan</span>
						<strong class="mini-val">{data.storageStats?.breakdown?.attachments?.formattedSize || '0 B'}</strong>
						<span class="mini-meta">{data.storageStats?.breakdown?.attachments?.count || 0} File</span>
					</div>
				</div>
			</div>

			<!-- Storage Maintenance & Cloudflare R2 Backup Row -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
				<!-- Cloudflare R2 Backup Card -->
				<div class="r2-backup-banner flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="r2-icon-wrap" class:r2-icon-wrap--active={data.storageStats?.r2Backup?.isConfigured}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
							</svg>
						</div>
						<div>
							<div class="r2-title">Cloudflare R2 Backup & Mirror</div>
							<div class="r2-status-desc">{data.storageStats?.r2Backup?.statusText}</div>
						</div>
					</div>
					{#if data.storageStats?.r2Backup?.isConfigured}
						<form
							bind:this={syncFormRef}
							action="?/syncR2Backup"
							method="POST"
							use:enhance={() => {
								isSyncingR2 = true;
								return async ({ result, update }) => {
									isSyncingR2 = false;
									if (result.type === 'success' && result.data?.message) {
										toast.success(result.data.message);
									} else if (result.type === 'failure' && result.data?.message) {
										toast.error(result.data.message);
									}
									await update();
								};
							}}
						>
							<button
								type="submit"
								disabled={isSyncingR2}
								class="btn-drawer-secondary inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
							>
								{#if isSyncingR2}
									<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
									<span>Syncing...</span>
								{:else}
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
									<span>Trigger Sync R2</span>
								{/if}
							</button>
						</form>
					{/if}
				</div>

				<!-- Orphan File Maintenance Card -->
				<div class="orphan-card flex flex-wrap items-center justify-between gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						</div>
						<div>
							<div class="text-xs font-bold text-amber-950">Maintenance File Orphan (Unused Files)</div>
							<div class="text-[11px] font-medium text-amber-800">
								{#if data.storageStats?.orphanStats?.count > 0}
									Ditemukan <strong>{data.storageStats.orphanStats.count} file</strong> ({data.storageStats.orphanStats.formattedSize}) tidak terpakai di DB.
								{:else}
									Semua file tersimpan rapi & terhubung di database (0 file orphan).
								{/if}
							</div>
						</div>
					</div>
					{#if data.storageStats?.orphanStats?.count > 0}
						<button
							type="button"
							onclick={() => (isCleanOrphanModalOpen = true)}
							class="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition"
						>
							Bersihkan File ({data.storageStats.orphanStats.formattedSize})
						</button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     TWO COLUMN GRID: QUICK ACTIONS + SYSTEM HEALTH & LOG STREAM
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

			{#if data.recentAuditLogs && data.recentAuditLogs.length > 0}
				<div class="audit-stream-list">
					{#each data.recentAuditLogs as log}
						<div class="audit-stream-item">
							<div class="audit-stream-header">
								<span class="actor-badge">
									<strong>{log.actorName}</strong> (@{log.actorUsername})
								</span>
								<span class="action-tag">{log.action}</span>
							</div>
							<div class="audit-stream-meta">
								<span>{log.entityLabel}</span>
								<span class="time-stamp">{formatDate(log.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="audit-empty">
					<div class="audit-empty__icon">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
					</div>
					<p class="empty-title">Log Stream Kosong</p>
					<p class="empty-sub">Aktivitas sistem terbaru akan terekam di sini secara otomatis.</p>
				</div>
			{/if}

			<div class="p-3 border-t border-slate-100 flex justify-end">
				<a href="/admin/audit-logs" class="btn-ghost" style="font-size: 12px;">
					Lihat Semua Audit Log
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
				</a>
			</div>

			<!-- System health indicators (Real live ping) -->
			<div class="health-panel">
				<div class="health-panel__title">STATUS KOMPONEN SISTEM (LIVE PING)</div>
				{#each data.healthStatus as comp}
					<div class="health-row">
						<div class="health-indicator" class:health-indicator--ok={comp.ok}></div>
						<span class="health-label">{comp.label}</span>
						<span class="health-status" class:health-status--err={!comp.ok}>{comp.status}</span>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<!-- ══════════════════════════════════════════════════════════
     CONFIRMATION MODAL: CLEAN ORPHAN FILES
     ══════════════════════════════════════════════════════════ -->
<ConfirmModal
	bind:open={isCleanOrphanModalOpen}
	title="Pembersihan File Orphan (Unused Storage)"
	message={`Hapus ${data.storageStats?.orphanStats?.count || 0} file orphan (${data.storageStats?.orphanStats?.formattedSize || '0 B'}) dari volume penyimpanan lokal. File-file ini sudah tidak tereferensi di database.`}
	confirmText="Hapus Permanen File Orphan"
	cancelText="Batal"
	variant="warning"
	loading={isCleaningOrphans}
	onconfirm={() => cleanFormRef?.requestSubmit()}
>
	{#snippet children()}
		<form
			bind:this={cleanFormRef}
			action="?/cleanOrphans"
			method="POST"
			use:enhance={() => {
				isCleaningOrphans = true;
				return async ({ result, update }) => {
					isCleaningOrphans = false;
					isCleanOrphanModalOpen = false;
					if (result.type === 'success' && result.data?.message) {
						toast.success(result.data.message);
					} else if (result.type === 'failure' && result.data?.message) {
						toast.error(result.data.message);
					}
					await update();
				};
			}}
		></form>
	{/snippet}
</ConfirmModal>

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

	/* Storage stats styles */
	.storage-stats-container {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.storage-main-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.storage-main-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.storage-label {
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
	}

	.storage-value {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.6rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
	}

	.storage-subtext {
		font-size: 11px;
		color: #64748b;
	}

	.storage-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #e2e8f0;
		color: #334155;
		padding: 4px 10px;
		border-radius: 9999px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.storage-mini-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mini-label {
		font-size: 11px;
		font-weight: 600;
		color: #64748b;
	}

	.mini-val {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: #0f172a;
	}

	.mini-meta {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		color: #94a3b8;
	}

	.r2-backup-banner {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.r2-icon-wrap {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: #dcfce7;
		color: #16a34a;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.r2-icon-wrap--active {
		background: #16a34a;
		color: #ffffff;
	}

	.r2-title {
		font-size: 13px;
		font-weight: 700;
		color: #14532d;
	}

	.r2-status-desc {
		font-size: 12px;
		color: #166534;
	}

	.r2-bucket-tag {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #dcfce7;
		color: #15803d;
		padding: 3px 8px;
		border-radius: 6px;
		border: 1px solid #86efac;
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

	/* Audit stream list */
	.audit-stream-list {
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.audit-stream-item {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.audit-stream-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.actor-badge {
		font-size: 12px;
		color: #0f172a;
	}

	.action-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		background: #e2e8f0;
		color: #334155;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.audit-stream-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11px;
		color: #64748b;
	}

	.time-stamp {
		font-family: var(--font-mono, monospace);
		color: #94a3b8;
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

	.health-status--err {
		color: #dc2626 !important;
	}
</style>

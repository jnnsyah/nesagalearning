<script lang="ts">
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Real-time 5-second live polling (Active ONLY when page tab is visible)
	$effect(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		function startPolling() {
			if (!interval) {
				interval = setInterval(() => {
					if (document.visibilityState === 'visible') {
						invalidateAll();
					}
				}, 5000);
			}
		}

		function stopPolling() {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		}

		function handleVisibilityChange() {
			if (document.visibilityState === 'visible') {
				invalidateAll();
				startPolling();
			} else {
				stopPolling();
			}
		}

		if (document.visibilityState === 'visible') {
			startPolling();
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			stopPolling();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	function formatDate(d: Date | string): string {
		const dt = new Date(d);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(dt);
	}
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
					<div class="storage-main-info flex-1">
						<span class="storage-label">Harddisk Server (Partisi Partisi /)</span>
						{#if data.storageStats?.diskTotalFormatted && data.storageStats.diskTotalFormatted !== '0 B'}
							<strong class="storage-value">{data.storageStats?.diskUsedFormatted} <span class="text-xs font-semibold text-slate-400">/ {data.storageStats?.diskTotalFormatted} ({data.storageStats?.diskPercent}%)</span></strong>
						{:else}
							<strong class="storage-value">{data.storageStats?.formattedTotalSize || '0 B'}</strong>
						{/if}
						<span class="storage-subtext">Folder Uploads: <strong>{data.storageStats?.formattedTotalSize || '0 B'}</strong> ({data.storageStats?.totalFiles || 0} File Tersimpan)</span>
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

			<!-- Cloudflare R2 Backup Banner -->
			<div class="r2-backup-banner">
				<div class="flex items-center gap-3">
					<div class="r2-icon-wrap" class:r2-icon-wrap--active={data.storageStats?.r2Backup?.isConfigured}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
						</svg>
					</div>
					<div>
						<div class="r2-title">Cloudflare R2 Cloud Backup & Mirror Service</div>
						<div class="r2-status-desc">{data.storageStats?.r2Backup?.statusText}</div>
					</div>
				</div>
				{#if data.storageStats?.r2Backup?.isConfigured}
					<span class="r2-bucket-tag">Bucket: {data.storageStats?.r2Backup?.bucketName}</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     TWO COLUMN GRID: SYSTEM HEALTH + AUDIT LOG & SECURITY MONITOR
	     ══════════════════════════════════════════════════════════ -->
	<div class="two-col-grid">
		<!-- Column 1: Standalone System Health & Live Ping Panel -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
						<rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
						<rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
						<line x1="6" y1="6" x2="6.01" y2="6"></line>
						<line x1="6" y1="18" x2="6.01" y2="18"></line>
					</svg>
					<span>Status & Kesehatan Sistem</span>
				</div>
				<span class="badge badge-success inline-flex items-center gap-1">
					<span class="status-dot"></span>
					<span>LIVE 5s</span>
				</span>
			</div>

			<div class="health-card-body">
				<!-- Server & DB Live Stat Cards (2 Rows Stacked) -->
				<div class="flex flex-col gap-3">
					<!-- Web Server Stat Card -->
					<div class="runtime-stat-card">
						<div class="runtime-card-header">
							<div class="runtime-icon-box bg-indigo-50 text-indigo-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
									<rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
									<line x1="6" y1="6" x2="6.01" y2="6"></line>
									<line x1="6" y1="18" x2="6.01" y2="18"></line>
								</svg>
							</div>
							<div class="flex-1 min-w-0">
								<div class="runtime-title">Node.js Web App Server</div>
								<div class="runtime-subtitle">{data.serverRuntime?.platform || 'Linux'} · {data.serverRuntime?.nodeVersion || 'Node'}</div>
							</div>
						</div>

						<div class="runtime-metrics-grid">
							<!-- RAM Heap App -->
							<div class="runtime-metric-item">
								<div class="flex items-center justify-between">
									<span class="metric-label">RAM Heap App</span>
									<span class="metric-ratio">{data.serverRuntime?.heapPercent ?? 0}%</span>
								</div>
								<strong class="metric-value">
									{data.serverRuntime?.heapUsedFormatted || '0 B'} <span class="metric-subval">/ {data.serverRuntime?.heapTotalFormatted || '0 B'}</span>
								</strong>
								<div class="progress-bar-wrap">
									<div class="progress-bar-fill" style="width: {data.serverRuntime?.heapPercent || 0}%"></div>
								</div>
							</div>

							<!-- System RAM OS -->
							<div class="runtime-metric-item">
								<div class="flex items-center justify-between">
									<span class="metric-label">RAM System OS</span>
									<span class="metric-ratio">{data.serverRuntime?.systemMemPercent ?? 0}%</span>
								</div>
								<strong class="metric-value">
									{data.serverRuntime?.systemMemUsedFormatted || '0 B'} <span class="metric-subval">/ {data.serverRuntime?.systemMemTotalFormatted || '0 B'}</span>
								</strong>
								<div class="progress-bar-wrap">
									<div class="progress-bar-fill" style="width: {data.serverRuntime?.systemMemPercent || 0}%"></div>
								</div>
							</div>

							<!-- CPU Load -->
							<div class="runtime-metric-item">
								<span class="metric-label">Beban CPU ({data.serverRuntime?.cpuCount || 1} Core)</span>
								<strong class="metric-value">Load {data.serverRuntime?.loadAvg1m || '0.00'}</strong>
							</div>

							<!-- Traffic Active Sessions -->
							<div class="runtime-metric-item">
								<span class="metric-label">Sesi User & Uptime</span>
								<strong class="metric-value text-indigo-700">
									{data.serverRuntime?.activeSessionsCount || 0} Sesi <span class="metric-subval">· {data.serverRuntime?.uptime || '0m'}</span>
								</strong>
							</div>
						</div>
					</div>

					<!-- DB Server Stat Card -->
					<div class="runtime-stat-card">
						<div class="runtime-card-header">
							<div class="runtime-icon-box bg-emerald-50 text-emerald-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
									<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
									<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
								</svg>
							</div>
							<div class="flex-1 min-w-0">
								<div class="runtime-title">PostgreSQL Database Engine</div>
								<div class="runtime-subtitle">{data.dbRuntime?.version || 'PostgreSQL'}</div>
							</div>
						</div>

						<div class="runtime-metrics-grid">
							<!-- DB Connections Ratio -->
							<div class="runtime-metric-item">
								<div class="flex items-center justify-between">
									<span class="metric-label">Koneksi DB Active</span>
									<span class="metric-ratio text-emerald-700">{data.dbRuntime?.connPercent ?? 0}%</span>
								</div>
								<strong class="metric-value">
									{data.dbRuntime?.activeConnections || 0} <span class="metric-subval">/ {data.dbRuntime?.maxConnections || 100} Max</span>
								</strong>
								<div class="progress-bar-wrap">
									<div class="progress-bar-fill progress-bar-fill--emerald" style="width: {data.dbRuntime?.connPercent || 0}%"></div>
								</div>
							</div>

							<!-- DB Size -->
							<div class="runtime-metric-item">
								<span class="metric-label">Kapasitas Storage DB</span>
								<strong class="metric-value">{data.dbRuntime?.size || '0 B'}</strong>
								<span class="metric-hint">Database nlc_dev</span>
							</div>

							<!-- Ping Latency -->
							<div class="runtime-metric-item">
								<span class="metric-label">Ping Latency</span>
								<strong class="metric-value text-emerald-700">{data.dbRuntime?.latencyMs ?? 0}ms</strong>
							</div>

							<!-- 24h Traffic -->
							<div class="runtime-metric-item">
								<span class="metric-label">Trafik Audit (24j)</span>
								<strong class="metric-value">{data.dbRuntime?.audit24hCount || 0} Event</strong>
							</div>
						</div>
					</div>
				</div>

				<div class="sub-section-title px-0 pt-2">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
					<span>STATUS INTEGRASI & MONITOR LAYANAN</span>
				</div>

				<div class="health-list">
					{#each data.healthStatus as comp}
						<div class="health-row-card" class:health-row-card--ok={comp.ok}>
							<div class="health-indicator" class:health-indicator--ok={comp.ok}></div>
							<div class="health-row-info">
								<span class="health-label">{comp.label}</span>
							</div>
							<span class="health-status" class:health-status--err={!comp.ok}>{comp.status}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Column 2: Standalone Audit Log Stream & Standalone Red Security Monitor Panel -->
		<div class="flex flex-col gap-5">
			<!-- Panel 2A: Standalone Audit Log Stream -->
			<section class="panel">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
							<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
						</svg>
						<span>Audit Log Stream Terbaru</span>
					</div>
					<a href="/admin/audit-logs" class="btn-ghost-sm">
						<span>Lihat Semua Log</span>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
					</a>
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
			</section>

			<!-- Panel 2B: Standalone Security Alert & Failed Login Panel -->
			<section class="panel">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
						<span>Monitor Keamanan & Login Gagal</span>
					</div>
					<span class="badge" class:badge-danger={(data.securityAlerts?.failedLogins24hCount || 0) > 0} class:badge-neutral={!(data.securityAlerts?.failedLogins24hCount || 0)}>
						{(data.securityAlerts?.failedLogins24hCount || 0) > 0 
							? `${data.securityAlerts.failedLogins24hCount} Event Gagal`
							: '0 Event (Aman)'}
					</span>
				</div>

				<div class="p-4 flex flex-col gap-3">
					<p class="text-xs text-slate-600 leading-relaxed margin-0">
						{#if (data.securityAlerts?.failedLogins24hCount || 0) > 0}
							Tercatat <strong class="text-rose-600 font-extrabold">{data.securityAlerts.failedLogins24hCount} percobaan login gagal</strong> dari <strong class="text-rose-600 font-extrabold">{data.securityAlerts.distinctFailedIPsCount} IP unik</strong> dalam 24 jam terakhir.
						{:else}
							Sistem aman. Tidak ada percobaan login gagal yang terdeteksi dalam 24 jam terakhir.
						{/if}
					</p>

					{#if data.securityAlerts?.flaggedIPs && data.securityAlerts.flaggedIPs.length > 0}
						<div class="flex flex-wrap gap-1.5 mt-1">
							{#each data.securityAlerts.flaggedIPs as ip}
								<span class="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-semibold">
									<span>IP {ip.ipAddress}:</span>
									<strong class="text-rose-600">{ip.failedCount}x gagal</strong>
								</span>
							{/each}
						</div>
					{/if}

					<div class="pt-2 border-t border-slate-100 flex justify-end">
						<a href="/admin/audit-logs?search=LOGIN_FAILED" class="btn-ghost-sm">
							<span>Inspeksi Audit Log Keamanan</span>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
						</a>
					</div>
				</div>
			</section>
		</div>
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

	/* System Health Standalone Card */
	.health-card-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Server Runtime Stat Cards */
	.runtime-stat-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.runtime-card-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.runtime-icon-box {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.runtime-title {
		font-size: 13px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.runtime-subtitle {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		color: #64748b;
	}

	.runtime-metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px dashed #e2e8f0;
	}

	.runtime-metric-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.metric-label {
		font-size: 10.5px;
		font-weight: 600;
		color: #64748b;
	}

	.metric-ratio {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: #4f46e5;
	}

	.metric-value {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.metric-subval {
		font-size: 11px;
		font-weight: 600;
		color: #94a3b8;
	}

	.metric-hint {
		font-size: 10px;
		color: #94a3b8;
	}

	.progress-bar-wrap {
		width: 100%;
		height: 4px;
		background: #e2e8f0;
		border-radius: 9999px;
		overflow: hidden;
		margin-top: 3px;
	}

	.progress-bar-fill {
		height: 100%;
		background: #4f46e5;
		border-radius: 9999px;
		transition: width 0.3s ease;
	}

	.progress-bar-fill--emerald {
		background: #10b981;
	}

	.health-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.health-row-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		transition: border-color 0.15s ease;
	}

	.health-row-card:hover {
		border-color: #cbd5e1;
	}

	.health-row-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* Audit Stream Sub-section */
	.sub-section-title {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 12px 16px 4px;
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		color: var(--text-muted, #94a3b8);
		letter-spacing: 0.05em;
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

	.btn-ghost-sm {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: 6px;
		border: 1px solid var(--border-hard, #cbd5e1);
		background: #ffffff;
		color: var(--text-primary, #0f172a);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.btn-ghost-sm:hover {
		background: #f8fafc;
		border-color: #94a3b8;
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

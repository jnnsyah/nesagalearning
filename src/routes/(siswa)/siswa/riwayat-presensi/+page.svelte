<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filterStatus = $state<'all' | 'hadir' | 'excused' | 'absen'>('all');

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';
		let d: Date;
		if (dateVal instanceof Date) {
			d = dateVal;
		} else {
			const str = String(dateVal).trim();
			const dateOnly = str.includes('T') ? str.split('T')[0] : str;
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
				const [y, m, day] = dateOnly.split('-').map(Number);
				d = new Date(y, m - 1, day);
			} else {
				d = new Date(str);
			}
		}
		if (isNaN(d.getTime())) return String(dateVal);
		const bulanIndo = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];
		return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
	}

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '-';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

	let filteredLogs = $derived(
		(data.attendanceLogs || []).filter((log) => {
			if (filterStatus === 'all') return true;
			return log.status === filterStatus;
		})
	);

	// Next Streak Milestone calculation
	let currentStreak = $derived(data.streakInfo.currentStreak || 0);
	let nextMilestone = $derived(
		currentStreak < 3 ? 3 : currentStreak < 5 ? 5 : currentStreak < 10 ? 10 : Math.ceil((currentStreak + 1) / 5) * 5
	);
	let streakProgressPercent = $derived(Math.min(100, Math.round((currentStreak / nextMilestone) * 100)));
</script>

<svelte:head>
	<title>Riwayat Presensi & Kehadiran — Siswa Hub</title>
</svelte:head>

<div class="content-area">
	<!-- Header Card -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Riwayat Presensi</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Riwayat Kehadiran Sesi</h1>
				<p class="page-sub">
					Lacak seluruh catatan kehadiran, keaktifan QR scanner, dan performa streak sesi kelas komunitas Anda.
				</p>
			</div>
			{#if data.membership}
				<span class="kelas-badge">Kelas: {data.membership.kelasName}</span>
			{/if}
		</div>
	</div>

	<!-- Stats Row Grid -->
	<div class="stats-grid mb-6">
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Persentase Kehadiran</div>
				<div class="stat-value" style="color: #4f46e5;">{data.stats.attendancePercentage}%</div>
				<div class="stat-meta">{data.stats.totalHadir} dari {data.stats.totalSessions} Sesi Hadir</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 11 12 14 22 4" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Hadir &amp; Izin</div>
				<div class="stat-value" style="color: #16a34a;">{data.stats.totalHadir + data.stats.totalExcused}</div>
				<div class="stat-meta">Hadir: {data.stats.totalHadir} | Izin: {data.stats.totalExcused}</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fffbeb; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			</div>
			<div class="w-full">
				<div class="stat-label">Streak Kehadiran Aktif</div>
				<div class="stat-value" style="color: #d97706;">
					{currentStreak} <span class="text-xs font-normal text-slate-500">Sesi</span>
				</div>
				<div class="streak-bar-wrap mt-1">
					<div class="streak-bar" style="width: {streakProgressPercent}%;"></div>
				</div>
				<div class="stat-meta mt-1">Target Next Milestone: {nextMilestone} Sesi</div>
			</div>
		</div>
	</div>

	<!-- Filter Tabs & List Container -->
	<div class="list-container">
		<div class="filter-bar">
			<div class="tab-group">
				<button
					type="button"
					onclick={() => (filterStatus = 'all')}
					class="tab-btn {filterStatus === 'all' ? 'tab-btn-active' : ''}"
				>
					Semua ({data.attendanceLogs.length})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'hadir')}
					class="tab-btn {filterStatus === 'hadir' ? 'tab-btn-active' : ''}"
				>
					Hadir ({data.stats.totalHadir})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'excused')}
					class="tab-btn {filterStatus === 'excused' ? 'tab-btn-active' : ''}"
				>
					Izin/Sakit ({data.stats.totalExcused})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'absen')}
					class="tab-btn {filterStatus === 'absen' ? 'tab-btn-active' : ''}"
				>
					Absen ({data.stats.totalSessions - (data.stats.totalHadir + data.stats.totalExcused)})
				</button>
			</div>
		</div>

		{#if filteredLogs.length === 0}
			<div class="empty-state">
				<p class="empty-title">Tidak Ada Catatan Presensi</p>
				<p class="empty-sub">Tidak ditemukan catatan presensi sesuai kriteria filter yang dipilih.</p>
			</div>
		{:else}
			<div class="timeline-list space-y-3 p-4">
				{#each filteredLogs as item}
					<div class="timeline-card">
						<div class="flex items-start justify-between gap-3 flex-wrap">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="activity-badge">{item.session.activityType.toUpperCase()}</span>
									{#if item.session.isWeekend}
										<span class="weekend-badge">WEEKEND</span>
									{/if}

									{#if item.status === 'hadir'}
										<span class="badge-status badge-hadir">HADIR</span>
									{:else if item.status === 'excused'}
										<span class="badge-status badge-excused">IZIN / SAKIT</span>
									{:else}
										<span class="badge-status badge-absen">ABSEN</span>
									{/if}
								</div>

								<h4 class="session-title">{item.session.title}</h4>

								<div class="session-meta mt-1">
									<span>Tanggal: <strong>{formatIndoDate(item.session.sessionDate)}</strong></span>
									<span>Jam: <strong>{formatTimeOnly(item.session.startTime)} - {formatTimeOnly(item.session.endTime)} WIB</strong></span>
									{#if item.session.location}
										<span>Ruangan: <strong>{item.session.location}</strong></span>
									{/if}
								</div>

								{#if item.attendance?.manualReason}
									<div class="manual-reason-box mt-2">
										<span>Catatan Presensi: "{item.attendance.manualReason}"</span>
									</div>
								{/if}
							</div>

							<div class="text-right flex-shrink-0">
								{#if item.attendance}
									<span class="method-tag">
										Metode: {item.attendance.method === 'qr' ? 'QR Code Scan' : 'Input Manual Mentor'}
									</span>
								{:else}
									<span class="method-tag text-slate-400">Belum Terdeteksi</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1100px;
		margin: 0 auto;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.3rem, 2.5vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.page-sub {
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.kelas-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-label {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
	}

	.stat-meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	.streak-bar-wrap {
		width: 100%;
		height: 6px;
		background: #f1f5f9;
		border-radius: 9999px;
		overflow: hidden;
	}

	.streak-bar {
		height: 100%;
		background: #d97706;
		border-radius: 9999px;
		transition: width 200ms ease;
	}

	.list-container {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.filter-bar {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.tab-group {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.tab-btn {
		padding: 6px 12px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tab-btn:hover {
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.tab-btn-active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
	}

	.timeline-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
		transition: all 150ms ease;
	}

	.timeline-card:hover {
		border-color: #cbd5e1;
		box-shadow: var(--shadow-sm);
	}

	.activity-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #4f46e5;
		background: #e0e7ff;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.weekend-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #b45309;
		background: #fffbeb;
		border: 1px solid #fde68a;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.badge-status {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 800;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.badge-hadir {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
	}

	.badge-excused {
		background: #e0e7ff;
		color: #3730a3;
		border: 1px solid #a5b4fc;
	}

	.badge-absen {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.session-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.session-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 11.5px;
		color: var(--text-secondary);
		flex-wrap: wrap;
	}

	.manual-reason-box {
		font-size: 11px;
		color: #475569;
		background: #f8fafc;
		padding: 4px 8px;
		border-radius: 4px;
		border-left: 3px solid #cbd5e1;
	}

	.method-tag {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.empty-state {
		text-align: center;
		padding: 36px 20px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px;
		}
	}
</style>

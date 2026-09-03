<script lang="ts">
	import MeetingAttendanceTrendChart from '$lib/components/ui/MeetingAttendanceTrendChart.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	let { data } = $props();

	let pendingMeetingSummaries = $derived(
		(data.meetingSummaries || []).filter((m) => (m.stats.pending + m.stats.revisi) > 0)
	);

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '-';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

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
		const bulanIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
		return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
	}
</script>

<svelte:head>
	<title>Dashboard Mentor — Portal NLC</title>
</svelte:head>

<div class="content-area">
	<div class="mb-6">
		<PageHeaderCard
			title="Dashboard Mentor"
			breadcrumbs={[{ label: 'Dashboard' }]}
		>
			{#snippet badges()}
				<span class="activity-badge-pill bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold uppercase">
					PORTAL MENTOR
				</span>
			{/snippet}

			{#snippet subtitleSnippet()}
				<p class="page-sub text-left">
					Selamat datang kembali, <strong class="text-indigo-600 font-semibold">{data.user?.fullName}</strong>.
				</p>
			{/snippet}

			{#snippet actions()}
				<a href="/mentor/jadwal" class="btn-secondary-head-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<span>Kalender Jadwal</span>
				</a>
				<a href="/mentor/pertemuan" class="btn-create-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>Kelola Pertemuan</span>
				</a>
			{/snippet}
		</PageHeaderCard>
	</div>

	<!-- Overview Stats Grid -->
	<div class="stats-row">
		<div class="stat-card-h">
			<div class="stat-card-h__icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div>
				<div class="stat-card-h__label">Total Siswa Aktif</div>
				<div class="stat-card-h__value">{data.stats.totalStudents}</div>
				<div class="stat-card-h__meta">Terdaftar di Kelas</div>
			</div>
		</div>

		<div class="stat-card-h">
			<div class="stat-card-h__icon" style="background: #fef3c7; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
			</div>
			<div>
				<div class="stat-card-h__label">Tugas Menunggu Periksa</div>
				<div class="stat-card-h__value" style={data.stats.pendingSubmissions > 0 ? 'color: #d97706;' : ''}>
					{data.stats.pendingSubmissions}
				</div>
				<div class="stat-card-h__meta">Submisi Pending</div>
			</div>
		</div>

		<div class="stat-card-h">
			<div class="stat-card-h__icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
			</div>
			<div>
				<div class="stat-card-h__label">Sesi Berikutnya</div>
				{#if data.stats.nextSession}
					<div class="stat-card-h__value" style="font-size: 0.95rem; line-height: 1.3;" title={data.stats.nextSession.title}>
						{data.stats.nextSession.title}
					</div>
					<div class="stat-card-h__meta">
						{formatIndoDate(data.stats.nextSession.sessionDate)} ({formatTimeOnly(data.stats.nextSession.startTime)} WIB)
					</div>
				{:else}
					<div class="stat-card-h__value" style="font-size: 1.1rem; color: #94a3b8;">Belum Ada</div>
					<div class="stat-card-h__meta">Tidak ada jadwal mendatang</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Interactive Session Attendance Trend Chart Card -->
	<div class="mb-6">
		<MeetingAttendanceTrendChart
			sessions={data.sessionAttendanceTrend || []}
			mentorClasses={data.mentorClasses || []}
		/>
	</div>

	<!-- Two-column grid -->
	<div class="two-col-grid">
		<!-- Sesi Pertemuan ber-Tugas -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
					<span>Sesi Pertemuan Ber-Tugas &amp; Status Submisi</span>
				</div>
				<span class="badge {data.stats.pendingSubmissions > 0 ? 'badge-pending' : 'badge-completed'}">
					{data.stats.pendingSubmissions} Submisi Menunggu
				</span>
			</div>

			{#if pendingMeetingSummaries.length === 0}
				<div class="empty-state">
					<div class="empty-icon-wrap" style="background: #ecfdf5; color: #16a34a;">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					</div>
					<p class="empty-title">Tidak Ada Submisi Menunggu</p>
					<p class="empty-sub">Semua tugas siswa dari seluruh sesi pertemuan telah selesai diperiksa.</p>
				</div>
			{:else}
				<div class="queue-list space-y-2.5 p-3.5">
					{#each pendingMeetingSummaries as m}
						<div class="meeting-task-item">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="track-badge-sm">
										{m.subPhaseTitle || 'Sub-Phase'}
									</span>
									<span class="badge badge-kelas-sm">{m.kelasName}</span>
								</div>

								<h4 class="task-item-title truncate">{m.pertemuanTitle}</h4>
								
								<div class="task-item-meta flex items-center gap-3 mt-1">
									<span class="truncate max-w-[200px]">Task: <strong class="text-slate-700">{m.taskTitle}</strong></span>
									<div class="flex items-center gap-1.5 font-mono">
										{#if m.stats.pending > 0}
											<span class="pill-pending">{m.stats.pending} Pending</span>
										{/if}
										{#if m.stats.revisi > 0}
											<span class="pill-revisi">{m.stats.revisi} Revisi</span>
										{/if}
									</div>
								</div>
							</div>

							<div class="flex-shrink-0 self-center">
								<a href="/mentor/tugas?pertemuanId={m.pertemuanId}&from=dashboard" class="btn-grade-sm">
									<span>Buka Studio ({m.stats.pending + m.stats.revisi}) &rsaquo;</span>
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Recent sessions -->
		<section class="panel">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
					<span>Sesi Pertemuan Terbaru</span>
				</div>
				<a href="/mentor/pertemuan" class="text-xs font-bold text-indigo hover:underline">
					Lihat Semua &rarr;
				</a>
			</div>

			{#if data.recentMeetings.length === 0}
				<div class="empty-state">
					<p class="empty-title">Belum Ada Sesi Pertemuan</p>
				</div>
			{:else}
				<div class="queue-list space-y-2.5 p-3.5">
					{#each data.recentMeetings as r}
						<div class="queue-item">
							<div class="queue-info flex-1">
								<div class="flex items-center gap-2 mb-0.5">
									<span class="badge badge-kelas-sm">{r.kelasName}</span>
									<span class="activity-type-label">{r.activityType.toUpperCase()}</span>
								</div>
								<h4 class="task-title text-sm">{r.title}</h4>
								<div class="submitted-at">
									{formatIndoDate(r.sessionDate)} &bull; {formatTimeOnly(r.startTime)} - {formatTimeOnly(r.endTime)} WIB
								</div>
							</div>
							<a href={`/mentor/pertemuan/${r.id}?from=dashboard`} class="btn-ghost-sm">
								Detail Pertemuan &rarr;
							</a>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Quick Actions Strip -->
	<div class="quick-actions-card">
		<h3 class="quick-actions__title">Aksi Cepat Mentor</h3>
		<div class="quick-actions__grid">
			<a href="/mentor/jadwal" class="quick-action-card">
				<div class="quick-action-card__icon" style="background: #e0e7ff; color: #4f46e5;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				</div>
				<div class="quick-action-card__label">Kalender Jadwal</div>
			</a>
			<a href="/mentor/pertemuan" class="quick-action-card">
				<div class="quick-action-card__icon" style="background: #ccfbf1; color: #0d9488;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
				</div>
				<div class="quick-action-card__label">Sesi Pertemuan</div>
			</a>
			<a href="/mentor/siswa" class="quick-action-card">
				<div class="quick-action-card__icon" style="background: #fef3c7; color: #d97706;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
				</div>
				<div class="quick-action-card__label">Roster Siswa</div>
			</a>
			<a href="/mentor/tugas?from=dashboard" class="quick-action-card">
				<div class="quick-action-card__icon" style="background: #fee2e2; color: #dc2626;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
				</div>
				<div class="quick-action-card__label">Studio Penilaian</div>
			</a>
		</div>
	</div>
</div>

<style>
	.content-area {
		padding: 24px 28px 40px;
		display: flex;
		flex-direction: column;
		gap: 24px;
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

	.btn-secondary-head-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-secondary-head-pill:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.btn-create-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-create-pill:hover {
		background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
		transform: translateY(-1px);
	}

	.activity-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 10px;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 10.5px;
		font-weight: 700;
		line-height: 1;
		border-width: 1px;
		border-style: solid;
		white-space: nowrap;
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
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
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.stat-card-h__meta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 600;
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

	.panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.section-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-soft);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.meeting-task-item {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		transition: all 150ms ease;
	}

	.meeting-task-item:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.track-badge-sm {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.task-item-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.task-item-meta {
		font-size: 11.5px;
		color: var(--text-secondary);
	}

	.pill-pending {
		background: #fef3c7;
		color: #d97706;
		font-size: 9.5px;
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.pill-revisi {
		background: #ffe4e6;
		color: #be123c;
		font-size: 9.5px;
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.queue-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 16px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		transition: all 150ms ease;
	}

	.queue-item:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.student-name {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.task-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 2px;
	}

	.submitted-at {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.btn-grade-sm {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
		flex-shrink: 0;
	}

	.btn-grade-sm:hover {
		background: #4338ca;
	}

	.btn-ghost-sm {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		color: var(--text-secondary);
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.btn-ghost-sm:hover {
		background: var(--bg-inset);
		color: var(--primary);
	}

	.badge-pending-sm {
		background: #fef3c7;
		color: #d97706;
		font-size: 9.5px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-revisi-sm {
		background: #ffe4e6;
		color: #be123c;
		font-size: 9.5px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-kelas-sm {
		background: #e0e7ff;
		color: #4338ca;
		font-size: 9.5px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-act-sm {
		background: #f1f5f9;
		color: #334155;
		font-size: 9.5px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-pending {
		background: #fef3c7;
		color: #d97706;
		border: 1px solid #fde68a;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 800;
	}

	.badge-completed {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 800;
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
		gap: 16px;
	}

	@media (max-width: 640px) {
		.quick-actions__grid { grid-template-columns: repeat(2, 1fr); }
	}

	.quick-action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 18px 14px;
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
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
	}
</style>

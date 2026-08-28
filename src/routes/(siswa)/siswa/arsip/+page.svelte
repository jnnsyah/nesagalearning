<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'presensi' | 'track' | 'tugas'>('presensi');
	let filterAttendanceStatus = $state<'all' | 'hadir' | 'excused' | 'absen'>('all');
	let filterTaskStatus = $state<'all' | 'approved' | 'revisi' | 'pending' | 'unsubmitted'>('all');

	// Selected Membership Info
	let selectedMembership = $derived(
		(data.memberships || []).find((m) => m.kelasInstanceId === data.selectedKelasId) || data.memberships?.[0]
	);

	let classSelectOptions = $derived(
		(data.memberships || []).map((m) => ({
			value: m.kelasInstanceId,
			label: `${m.kelasName} (${m.tahunAjaranName})`,
			badge: m.status.toUpperCase(),
			description: `${m.tingkatName} • ${m.trackTitle}`
		}))
	);

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

	// Filtered attendance logs
	let filteredAttendanceLogs = $derived(
		(data.archiveData?.attendanceLogs || []).filter((log) => {
			if (filterAttendanceStatus === 'all') return true;
			return log.status === filterAttendanceStatus;
		})
	);

	// Filtered tasks
	let filteredTasks = $derived(
		(data.archiveData?.tasks || []).filter((t) => {
			if (filterTaskStatus === 'all') return true;
			if (filterTaskStatus === 'unsubmitted') return !t.submission;
			return t.submission?.status === filterTaskStatus;
		})
	);
</script>

<svelte:head>
	<title>Arsip Belajar — Portal Siswa NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Card (Single Source of Truth Blueprint) -->
	<PageHeaderCard
		title="Arsip Belajar Siswa"
		breadcrumbs={[
			{ label: 'Profil Saya', href: '/siswa/profile' },
			{ label: 'Arsip Belajar' }
		]}
	>
		{#snippet actions()}
			{#if data.memberships && data.memberships.length > 0}
				<div class="w-64 max-w-full">
					<CustomSelect
						label="Pilih Kelas / Periode Akademik"
						options={classSelectOptions}
						value={data.selectedKelasId}
						searchable={data.memberships.length > 4}
						onchange={(val) => {
							if (val) goto(`/siswa/arsip?kelasId=${val}`);
						}}
					/>
				</div>
			{/if}
		{/snippet}
	</PageHeaderCard>
		{#if selectedMembership}
			<div class="class-summary-bar mt-4">
				<div class="summary-tag">
					<span>Periode:</span>
					<strong>{selectedMembership.tahunAjaranName}</strong>
				</div>
				<div class="summary-tag">
					<span>Tingkat:</span>
					<strong>{selectedMembership.tingkatName}</strong>
				</div>
				<div class="summary-tag">
					<span>Track:</span>
					<strong>{selectedMembership.trackTitle}</strong>
				</div>
				<div class="summary-tag">
					<span>Status Keanggotaan:</span>
					<span class="status-badge status-{selectedMembership.status}">
						{selectedMembership.status.toUpperCase()}
					</span>
				</div>
			</div>
		{/if}

	{#if !data.archiveData}
		<div class="empty-card">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
			</svg>
			<h3 class="empty-title">Belum Ada Data Arsip</h3>
			<p class="empty-sub">Tidak ditemukan data arsip untuk kelas yang dipilih.</p>
		</div>
	{:else}
		<!-- Primary Tab Navigation -->
		<div class="main-tabs">
			<button
				type="button"
				onclick={() => (activeTab = 'presensi')}
				class="main-tab-btn {activeTab === 'presensi' ? 'active' : ''}"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
					<line x1="16" y1="2" x2="16" y2="6"/>
					<line x1="8" y1="2" x2="8" y2="6"/>
					<line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
				<span>Arsip Riwayat Presensi</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'track')}
				class="main-tab-btn {activeTab === 'track' ? 'active' : ''}"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
				</svg>
				<span>Arsip Track Pembelajaran</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'tugas')}
				class="main-tab-btn {activeTab === 'tugas' ? 'active' : ''}"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
					<line x1="16" y1="13" x2="8" y2="13"/>
					<line x1="16" y1="17" x2="8" y2="17"/>
				</svg>
				<span>Arsip Tugas ({data.archiveData.tasks.length})</span>
			</button>
		</div>

		<!-- TAB 1: ARSIP RIWAYAT PRESENSI -->
		{#if activeTab === 'presensi'}
			<div class="stats-grid mb-6">
				<div class="stat-card">
					<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					</div>
					<div>
						<div class="stat-label">Kehadiran Kelas Ini</div>
						<div class="stat-value" style="color: #4f46e5;">{data.archiveData.attendanceStats.attendancePercentage}%</div>
						<div class="stat-meta">{data.archiveData.attendanceStats.totalHadir} dari {data.archiveData.attendanceStats.totalSessions} Sesi Hadir</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 11 12 14 22 4" />
						</svg>
					</div>
					<div>
						<div class="stat-label">Hadir &amp; Izin</div>
						<div class="stat-value" style="color: #16a34a;">
							{data.archiveData.attendanceStats.totalHadir + data.archiveData.attendanceStats.totalExcused}
						</div>
						<div class="stat-meta">
							Hadir: {data.archiveData.attendanceStats.totalHadir} | Izin: {data.archiveData.attendanceStats.totalExcused}
						</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon" style="background: #fffbeb; color: #d97706;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
						</svg>
					</div>
					<div>
						<div class="stat-label">Max Streak di Kelas Ini</div>
						<div class="stat-value" style="color: #d97706;">
							{data.archiveData.attendanceStats.streakInfo.maxStreak} <span class="text-xs font-normal text-slate-500">Sesi</span>
						</div>
						<div class="stat-meta">Arsip Streak Terjaga</div>
					</div>
				</div>
			</div>

			<div class="list-container">
				<div class="filter-bar">
					<div class="tab-group">
						<button
							type="button"
							onclick={() => (filterAttendanceStatus = 'all')}
							class="tab-btn {filterAttendanceStatus === 'all' ? 'tab-btn-active' : ''}"
						>
							Semua ({data.archiveData.attendanceLogs.length})
						</button>
						<button
							type="button"
							onclick={() => (filterAttendanceStatus = 'hadir')}
							class="tab-btn {filterAttendanceStatus === 'hadir' ? 'tab-btn-active' : ''}"
						>
							Hadir ({data.archiveData.attendanceStats.totalHadir})
						</button>
						<button
							type="button"
							onclick={() => (filterAttendanceStatus = 'excused')}
							class="tab-btn {filterAttendanceStatus === 'excused' ? 'tab-btn-active' : ''}"
						>
							Izin ({data.archiveData.attendanceStats.totalExcused})
						</button>
						<button
							type="button"
							onclick={() => (filterAttendanceStatus = 'absen')}
							class="tab-btn {filterAttendanceStatus === 'absen' ? 'tab-btn-active' : ''}"
						>
							Absen ({data.archiveData.attendanceStats.totalSessions - (data.archiveData.attendanceStats.totalHadir + data.archiveData.attendanceStats.totalExcused)})
						</button>
					</div>
				</div>

				{#if filteredAttendanceLogs.length === 0}
					<div class="empty-state">
						<p class="empty-title">Tidak Ada Catatan Presensi</p>
						<p class="empty-sub">Tidak ada data sesuai kriteria filter.</p>
					</div>
				{:else}
					<div class="timeline-list space-y-3 p-4">
						{#each filteredAttendanceLogs as item}
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
										</div>
									</div>
									<div class="text-right flex-shrink-0">
										<span class="method-tag">
											{item.attendance ? (item.attendance.method === 'qr' ? 'QR Code Scan' : 'Manual Mentor') : 'Tidak Hadir'}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- TAB 2: ARSIP TRACK PEMBELAJARAN -->
		{#if activeTab === 'track'}
			<div class="list-container p-6 space-y-6">
				<div class="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-4">
					<div>
						<h3 class="font-macro font-bold text-lg text-slate-900">{data.archiveData.kelas.trackTitle}</h3>
						<p class="text-xs text-slate-500 mt-0.5">Struktur Track Pembelajaran &amp; sub-materi yang dipelajari pada kelas ini.</p>
					</div>
					<div class="text-right">
						<span class="text-xs font-semibold text-slate-500">Poin Diperoleh:</span>
						<div class="font-macro text-xl font-extrabold text-amber-600">+{data.archiveData.totalPointsEarned} Poin</div>
					</div>
				</div>

				<div class="space-y-6">
					{#each data.archiveData.phaseDetails as p}
						<div class="phase-box">
							<div class="phase-header">
								<span class="phase-order">Fase {p.sortOrder}</span>
								<h4 class="phase-title">{p.title}</h4>
							</div>
							{#if p.description}
								<p class="phase-desc">{p.description}</p>
							{/if}

							<div class="subphases-grid mt-3">
								{#each p.subPhases as sp}
									<div class="subphase-card {sp.isCompleted ? 'completed' : ''}">
										<div class="flex items-center gap-2">
											{#if sp.isCompleted}
												<span class="sp-check" title="Sub-materi selesai">
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
														<polyline points="20 6 9 17 4 12" />
													</svg>
												</span>
											{:else}
												<span class="sp-dot"></span>
											{/if}
											<span class="sp-title">{sp.title}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- TAB 3: ARSIP TUGAS -->
		{#if activeTab === 'tugas'}
			<div class="list-container">
				<div class="filter-bar">
					<div class="tab-group">
						<button
							type="button"
							onclick={() => (filterTaskStatus = 'all')}
							class="tab-btn {filterTaskStatus === 'all' ? 'tab-btn-active' : ''}"
						>
							Semua ({data.archiveData.tasks.length})
						</button>
						<button
							type="button"
							onclick={() => (filterTaskStatus = 'approved')}
							class="tab-btn {filterTaskStatus === 'approved' ? 'tab-btn-active' : ''}"
						>
							Disetujui / Lulus
						</button>
						<button
							type="button"
							onclick={() => (filterTaskStatus = 'revisi')}
							class="tab-btn {filterTaskStatus === 'revisi' ? 'tab-btn-active' : ''}"
						>
							Perlu Revisi
						</button>
						<button
							type="button"
							onclick={() => (filterTaskStatus = 'pending')}
							class="tab-btn {filterTaskStatus === 'pending' ? 'tab-btn-active' : ''}"
						>
							Menunggu Review
						</button>
						<button
							type="button"
							onclick={() => (filterTaskStatus = 'unsubmitted')}
							class="tab-btn {filterTaskStatus === 'unsubmitted' ? 'tab-btn-active' : ''}"
						>
							Belum Dikirim
						</button>
					</div>
				</div>

				{#if filteredTasks.length === 0}
					<div class="empty-state">
						<p class="empty-title">Tidak Ada Tugas Ditemukan</p>
						<p class="empty-sub">Tidak ada arsip tugas sesuai kriteria filter.</p>
					</div>
				{:else}
					<div class="space-y-3 p-4">
						{#each filteredTasks as t}
							<div class="task-card">
								<div class="flex items-start justify-between gap-3 flex-wrap">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1 flex-wrap">
											<span class="session-tag">Sesi: {t.sessionTitle}</span>
											<span class="max-pts-tag">TUGAS {t.taskSize ? t.taskSize.toUpperCase() : 'SEDANG'}</span>
											{#if t.submission}
												{#if t.submission.status === 'approved'}
													<span class="task-status status-approved">DISETUJUI</span>
												{:else if t.submission.status === 'revisi'}
													<span class="task-status status-revisi">PERLU REVISI</span>
												{:else}
													<span class="task-status status-pending">MENUNGGU REVIEW</span>
												{/if}
											{:else}
												<span class="task-status status-empty">BELUM SUBMIT</span>
											{/if}
										</div>

										<h4 class="task-title">{t.taskTitle}</h4>
										{#if t.taskDescription}
											<p class="task-desc">{t.taskDescription}</p>
										{/if}

										{#if t.submission}
											<div class="submisi-info mt-2">
												<div class="flex items-center gap-2 text-xs flex-wrap">
													<span>URL Submisi:</span>
													<a href={t.submission.link} target="_blank" rel="noreferrer" class="submisi-url-link">
														{t.submission.link}
													</a>
												</div>
												{#if t.submission.feedback}
													<div class="feedback-box mt-1.5">
														<strong>Feedback Mentor:</strong> "{t.submission.feedback}"
													</div>
												{/if}
												<div class="text-[11px] text-slate-400 mt-1">
													Dikirim: {formatIndoDate(t.submission.submittedAt)}
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.content-area {
		padding: 24px 32px 60px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-sizing: border-box;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
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

	.selector-box {
		width: 100%;
		max-width: 320px;
	}

	.class-summary-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding-top: 14px;
		margin-top: 16px;
		border-top: 1px solid var(--border-hard);
		font-size: 12px;
	}

	.summary-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-size: 11.5px;
	}

	.summary-tag span {
		color: #64748b;
		font-family: var(--font-macro);
		font-weight: 700;
	}

	.summary-tag strong {
		color: #0f172a;
		font-weight: 700;
	}

	.status-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
		margin-left: 4px;
	}

	.status-aktif {
		background: #dcfce7;
		color: #15803d;
	}

	.status-naik {
		background: #e0e7ff;
		color: #4338ca;
	}

	.status-tinggal {
		background: #fee2e2;
		color: #b91c1c;
	}

	.main-tabs {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 20px;
		border-bottom: 2px solid var(--border-hard);
		padding-bottom: 2px;
	}

	.main-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border: none;
		background: transparent;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		border-bottom: 3px solid transparent;
		margin-bottom: -4px;
		transition: all 150ms ease;
	}

	.main-tab-btn:hover {
		color: var(--primary);
	}

	.main-tab-btn.active {
		color: #4f46e5;
		border-bottom-color: #4f46e5;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
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

	.timeline-card,
	.task-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
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
	}

	.badge-excused {
		background: #e0e7ff;
		color: #3730a3;
	}

	.badge-absen {
		background: #ffe4e6;
		color: #be123c;
	}

	.session-title,
	.task-title {
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

	.method-tag {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.phase-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 14px 16px;
	}

	.phase-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.phase-order {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.phase-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
	}

	.phase-desc {
		font-size: 12px;
		color: #64748b;
		margin-top: 4px;
	}

	.subphases-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}

	.subphase-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		color: #334155;
	}

	.subphase-card.completed {
		border-color: #86efac;
		background: #f0fdf4;
	}

	.sp-check {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 9999px;
		background: #16a34a;
		color: #ffffff;
		flex-shrink: 0;
	}

	.sp-dot {
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: #cbd5e1;
		flex-shrink: 0;
	}

	.sp-title {
		font-weight: 600;
	}

	.session-tag {
		font-size: 10.5px;
		font-weight: 700;
		color: #475569;
		background: #f1f5f9;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.max-pts-tag {
		font-size: 10.5px;
		font-weight: 700;
		color: #d97706;
		background: #fffbeb;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.task-status {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.status-approved {
		background: #dcfce7;
		color: #15803d;
	}

	.status-revisi {
		background: #fef3c7;
		color: #b45309;
	}

	.status-pending {
		background: #e0e7ff;
		color: #4338ca;
	}

	.status-empty {
		background: #f1f5f9;
		color: #94a3b8;
	}

	.task-desc {
		font-size: 12px;
		color: #64748b;
		margin-top: 4px;
	}

	.submisi-info {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 8px 12px;
	}

	.submisi-url-link {
		color: #2563eb;
		text-decoration: underline;
		word-break: break-all;
	}

	.feedback-box {
		font-size: 11.5px;
		color: #334155;
		background: #ffffff;
		border-left: 3px solid #3b82f6;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.empty-card,
	.empty-state {
		text-align: center;
		padding: 40px 20px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 8px;
	}

	.empty-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	@media (max-width: 1023px) {
		.content-area {
			padding: 20px 24px 60px;
			gap: 16px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}

		.main-tabs {
			overflow-x: auto;
			white-space: nowrap;

			-webkit-overflow-scrolling: touch;
		}

		.main-tab-btn {
			padding: 8px 12px;
			font-size: 12px;
		}
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	// Active tab state: 'track' | 'attendance' | 'tasks' | 'notes' (persisted via URL query param ?tab=...)
	let activeTab = $state<'track' | 'attendance' | 'tasks' | 'notes'>(
		(['track', 'attendance', 'tasks', 'notes'].includes(page.url.searchParams.get('tab') || '')
			? page.url.searchParams.get('tab')
			: 'track') as any
	);

	// 2-Tier view mode inside Track Pembelajaran tab: 'catalog' | 'detail' (persisted via URL query param ?view=detail)
	let trackViewMode = $state<'catalog' | 'detail'>(
		page.url.searchParams.get('view') === 'detail' ? 'detail' : 'catalog'
	);

	function selectTab(tab: 'track' | 'attendance' | 'tasks' | 'notes') {
		activeTab = tab;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		if (tab !== 'track') {
			url.searchParams.delete('view');
		}
		goto(url.toString(), { keepFocus: true, noScroll: true, replaceState: true });
	}

	function setTrackViewMode(mode: 'catalog' | 'detail') {
		trackViewMode = mode;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', 'track');
		if (mode === 'detail') {
			url.searchParams.set('view', 'detail');
		} else {
			url.searchParams.delete('view');
		}
		goto(url.toString(), { keepFocus: true, noScroll: true, replaceState: true });
	}

	// Extract data shortcuts
	let student = $derived(data.detailData?.student ?? {});
	let summary = $derived(data.detailData?.summary ?? {});
	let notes = $derived(data.detailData?.notes ?? []);
	let attendanceLogs = $derived(data.detailData?.attendanceLogs ?? []);
	let submissionLogs = $derived(data.detailData?.submissionLogs ?? []);
	let phaseProgressList = $derived(data.phaseProgress ?? []);
	let trackInfo = $derived(data.trackInfo ?? null);

	// Calculate overall Track Pembelajaran completion percentage
	let totalSubPhasesCount = $derived(
		phaseProgressList.reduce((acc: number, p: any) => acc + (p.totalSubPhases || 0), 0)
	);
	let completedSubPhasesCount = $derived(
		phaseProgressList.reduce((acc: number, p: any) => acc + (p.completedSubPhases || 0), 0)
	);
	let overallTrackProgress = $derived(
		totalSubPhasesCount > 0
			? Math.round((completedSubPhasesCount / totalSubPhasesCount) * 100)
			: 0
	);

	// Count task submission statuses
	let approvedTasksCount = $derived(submissionLogs.filter((s: any) => s.status === 'approved').length);
	let pendingTasksCount = $derived(submissionLogs.filter((s: any) => s.status === 'pending').length);
	let revisiTasksCount = $derived(submissionLogs.filter((s: any) => s.status === 'revisi').length);

	// Count attendance statuses
	let hadirCount = $derived(attendanceLogs.filter((a: any) => a.status === 'hadir').length);
	let excusedCount = $derived(
		attendanceLogs.filter((a: any) => a.status === 'izin' || a.status === 'sakit' || a.status === 'excused').length
	);
	let alfaCount = $derived(attendanceLogs.filter((a: any) => a.status === 'alfa').length);

	function formatDate(dateInput: Date | string) {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatShortDate(dateInput: Date | string) {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Progress Belajar Saya — NLC Siswa</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Card (Matches /siswa/tugas and /siswa/pertemuan) -->
	<div class="header-card">
		<div class="page-header-row">
			<div>
				<nav class="breadcrumb" aria-label="Breadcrumb">
					<a href="/siswa" class="bc-link">Beranda</a>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<polyline points="9 18 15 12 9 6" />
					</svg>
					<span class="bc-current">Progress Belajar Saya</span>
				</nav>
				<h1 class="page-title">Progress Belajar Saya</h1>
				<p class="page-sub">
					Pantau tingkat kesehatan belajar, capaian Track Pembelajaran, histori presensi, dan catatan pendampingan dari Guru Pembimbing.
				</p>
			</div>

			<div class="header-badges-row">
				{#if summary.riskLevel === 'KRITIS'}
					<span class="badge badge-kritis">STATUS: KRITIS</span>
				{:else if summary.riskLevel === 'WASPADA'}
					<span class="badge badge-waspada">STATUS: WASPADA</span>
				{:else}
					<span class="badge badge-sehat">STATUS: SEHAT</span>
				{/if}

				{#if student.tingkatName}
					<span class="badge badge-grade">Tingkat {student.tingkatName}</span>
				{/if}
				{#if student.kelasName}
					<span class="badge badge-active-class">Track Kelas Anda ({student.kelasName})</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Alert Warning Banner (If Any Attention Reason) -->
	{#if summary.alertReasons && summary.alertReasons.length > 0}
		<div class="alert-warning-box">
			<div class="alert-warning-header">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
					<line x1="12" y1="9" x2="12" y2="13"/>
					<line x1="12" y1="17" x2="12.01" y2="17"/>
				</svg>
				<span class="alert-warning-title">Catatan Perhatian Belajar</span>
			</div>
			<ul class="alert-warning-list">
				{#each summary.alertReasons as reason}
					<li>{reason}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Key Metrics Stats Grid (Matches /siswa/pertemuan and /siswa/tugas) -->
	<div class="stats-grid">
		<!-- Card 1: Presensi -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-attendance">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<span class="stat-pill">{summary.attendanceRate}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalSessions === 0 ? '-' : `${summary.attendanceRate}%`}</div>
				<div class="stat-label">Kehadiran Presensi</div>
				<div class="stat-subtext">{summary.attendedCount}/{summary.totalSessions} Sesi Hadir</div>
			</div>
		</div>

		<!-- Card 2: Tugas Approved -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-task">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
					</svg>
				</div>
				<span class="stat-pill">{summary.taskCompletionRate}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalTasks === 0 ? '-' : `${summary.taskCompletionRate}%`}</div>
				<div class="stat-label">Tugas Selesai</div>
				<div class="stat-subtext">{summary.approvedTasksCount}/{summary.totalTasks} Tugas Approved</div>
			</div>
		</div>

		<!-- Card 3: Track Pembelajaran -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-track">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
					</svg>
				</div>
				<span class="stat-pill">{overallTrackProgress}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{totalSubPhasesCount === 0 ? '0%' : `${overallTrackProgress}%`}</div>
				<div class="stat-label">Track Pembelajaran</div>
				<div class="stat-subtext">{completedSubPhasesCount}/{totalSubPhasesCount} Sub-fase</div>
			</div>
		</div>

		<!-- Card 4: Gamifikasi & Streak -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-streak">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
					</svg>
				</div>
				<span class="stat-pill">{summary.currentStreak} Hari</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalPoints} Pts</div>
				<div class="stat-label">Poin & Streak</div>
				<div class="stat-subtext">Max Streak: {summary.maxStreak} Hari</div>
			</div>
		</div>
	</div>

	<!-- Status Tabs Bar (Filter Panel matching /siswa/tugas) -->
	<div class="filter-panel">
		<div class="tabs-row">
			<button
				type="button"
				onclick={() => selectTab('track')}
				class="tab-btn {activeTab === 'track' ? 'tab-btn--active' : ''}"
			>
				Track Pembelajaran
			</button>
			<button
				type="button"
				onclick={() => selectTab('attendance')}
				class="tab-btn {activeTab === 'attendance' ? 'tab-btn--active' : ''}"
			>
				Histori Presensi ({attendanceLogs.length})
			</button>
			<button
				type="button"
				onclick={() => selectTab('tasks')}
				class="tab-btn {activeTab === 'tasks' ? 'tab-btn--active' : ''}"
			>
				Performa Tugas ({submissionLogs.length})
			</button>
			<button
				type="button"
				onclick={() => selectTab('notes')}
				class="tab-btn {activeTab === 'notes' ? 'tab-btn--active' : ''}"
			>
				Catatan Guru ({notes.length})
			</button>
		</div>
	</div>

	<!-- Tab Panels -->
	<main class="content-panel">
		<!-- TAB 1: TRACK PEMBELAJARAN (2-TIER CATALOG VIEW) -->
		{#if activeTab === 'track'}
			<div class="tab-section">
				{#if trackViewMode === 'catalog'}
					<!-- ══════════════════════════════════════════════════════════
					     TIER 1: KATALOG KARTU TRACK BELAJAR UTAMA
					     ══════════════════════════════════════════════════════════ -->
					<div class="section-header">
						<div>
							<h2 class="section-title">Katalog Track Pembelajaran Anda</h2>
							<p class="section-sub">Ringkasan alur track pembelajaran aktif yang sedang Anda ikuti pada kelas saat ini.</p>
						</div>
					</div>

					{#if !data.activeMembership || phaseProgressList.length === 0}
						<div class="empty-card">
							<div class="empty-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
								</svg>
							</div>
							<div class="empty-title">Belum Ada Track Pembelajaran Dipublikasikan</div>
							<div class="empty-sub">Alur track pembelajaran untuk kelas Anda belum dikonfigurasi atau belum dimulai oleh Guru.</div>
						</div>
					{:else}
						<div class="track-catalog-container">
							<div class="track-main-card">
								<!-- Header Track Card -->
								<div class="track-card-header">
									<div class="track-card-tags">
										{#if trackInfo?.tingkatName}
											<span class="badge badge-grade">{trackInfo.tingkatName}</span>
										{/if}
										<span class="badge badge-approved">AKTIF (Track Kelas Anda)</span>
									</div>

									<h3 class="track-card-title">
										{trackInfo?.trackTitle || 'Track Pembelajaran Kelas'}
									</h3>
									<p class="track-card-desc">
										{trackInfo?.trackDescription || 'Alur pembelajaran terstruktur untuk pengembangan kompetensi dan praktikum siswa.'}
									</p>
								</div>

								<!-- Body Track Card -->
								<div class="track-card-body">
									<div class="rombel-info-line">
										<span class="rombel-label">Rombel Kelas:</span>
										<span class="badge badge-active-class">{data.activeMembership.kelasName}</span>
										<span class="type-sub">({data.activeMembership.tahunAjaranName})</span>
									</div>

									<!-- Mini Metrics Grid -->
									<div class="metrics-mini-grid">
										<div class="mini-stat-item">
											<div class="mini-stat-val">{phaseProgressList.length}</div>
											<div class="mini-stat-lbl">Phase</div>
										</div>
										<div class="mini-stat-item">
											<div class="mini-stat-val">{totalSubPhasesCount}</div>
											<div class="mini-stat-lbl">SubPhase</div>
										</div>
										<div class="mini-stat-item">
											<div class="mini-stat-val">{summary.totalSessions}</div>
											<div class="mini-stat-lbl">Sesi</div>
										</div>
										<div class="mini-stat-item">
											<div class="mini-stat-val">{summary.totalTasks}</div>
											<div class="mini-stat-lbl">Tugas</div>
										</div>
									</div>

									<!-- Overall Ketercapaian Progress -->
									<div class="progress-box-card">
										<div class="progress-box-top">
											<span class="progress-box-lbl">Ketercapaian Progress Belajar Anda</span>
											<span class="progress-box-val">{overallTrackProgress}%</span>
										</div>
										<div class="progress-box-bar-bg">
											<div class="progress-box-bar-fill" style="width: {overallTrackProgress}%;"></div>
										</div>
									</div>
								</div>

								<!-- Footer Action Button -->
								<div class="track-card-footer">
									<button
										type="button"
										class="btn-open-track"
										onclick={() => setTrackViewMode('detail')}
									>
										<span>Lihat Detail Modul</span>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
									</button>
								</div>
							</div>
						</div>
					{/if}

				{:else if trackViewMode === 'detail'}
					<!-- ══════════════════════════════════════════════════════════
					     TIER 2: DETAIL BREAKDOWN VIEW (Rincian Fase & Sub-fase)
					     ══════════════════════════════════════════════════════════ -->
					<div class="tier-nav-bar">
						<button
							type="button"
							class="btn-back-catalog"
							onclick={() => setTrackViewMode('catalog')}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
							<span>Kembali ke Katalog Track Belajar</span>
						</button>
					</div>

					<div class="section-header">
						<div>
							<h2 class="section-title">{trackInfo?.trackTitle || 'Detail Modul Track Pembelajaran'}</h2>
							<p class="section-sub">Detail progres ketercapaian pada setiap fase dan sub-fase pembelajaran.</p>
						</div>

						<div class="overall-progress-box">
							<div class="progress-info-row">
								<span class="progress-label">Kemajuan Total</span>
								<span class="progress-val">{overallTrackProgress}%</span>
							</div>
							<div class="progress-bar-bg">
								<div class="progress-bar-fill" style="width: {overallTrackProgress}%;"></div>
							</div>
						</div>
					</div>

					<div class="phases-grid">
						{#each phaseProgressList as phaseItem}
							<div class="phase-card">
								<div class="phase-card-header">
									<div>
										<h3 class="phase-title">{phaseItem.phaseTitle}</h3>
										<span class="phase-meta">{phaseItem.completedSubPhases}/{phaseItem.totalSubPhases} Sub-fase Selesai</span>
									</div>
									<span class="phase-badge">{phaseItem.progressPercentage}%</span>
								</div>

								<div class="phase-bar-bg">
									<div class="phase-bar-fill" style="width: {phaseItem.progressPercentage}%;"></div>
								</div>

								{#if phaseItem.subPhases && phaseItem.subPhases.length > 0}
									<div class="subphase-stack">
										{#each phaseItem.subPhases as subItem}
											<div class="subphase-card">
												<div class="subphase-icon {subItem.isCompleted ? 'subphase-icon--done' : ''}">
													{#if subItem.isCompleted}
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
													{:else}
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
													{/if}
												</div>

												<div class="subphase-info">
													<div class="subphase-name">{subItem.subPhaseTitle}</div>
													<div class="subphase-meta-row">
														<span class="meta-pill">
															<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
															<span>{subItem.completedSessions}/{subItem.totalSessions} Sesi</span>
														</span>
														{#if subItem.totalTasks > 0}
															<span class="meta-pill meta-pill-task">
																<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
																<span>{subItem.approvedTasks}/{subItem.totalTasks} Tugas Approved</span>
															</span>
														{:else}
															<span class="meta-pill type-sub">Tanpa Tugas</span>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

		<!-- TAB 2: HISTORI PRESENSI -->
		{:else if activeTab === 'attendance'}
			<div class="tab-section">
				<div class="section-header">
					<div>
						<h2 class="section-title">Histori Kehadiran & Sesi Pertemuan</h2>
						<p class="section-sub">Rekapitulasi kehadiran presensi Anda pada setiap sesi komunitas.</p>
					</div>

					<div class="summary-pills-row">
						<span class="sum-badge sum-badge--success">Hadir: {hadirCount}</span>
						<span class="sum-badge sum-badge--warning">Izin/Sakit: {excusedCount}</span>
						<span class="sum-badge sum-badge--danger">Alfa: {alfaCount}</span>
					</div>
				</div>

				{#if attendanceLogs.length === 0}
					<div class="empty-card">
						<div class="empty-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
							</svg>
						</div>
						<div class="empty-title">Belum Ada Riwayat Presensi</div>
						<div class="empty-sub">Riwayat presensi sesi pertemuan akan muncul di sini setelah Anda melakukan scan QR atau presensi manual.</div>
					</div>
				{:else}
					<div class="table-container">
						<table class="data-table">
							<thead>
								<tr>
									<th>Sesi Pertemuan</th>
									<th>Tanggal Sesi</th>
									<th>Status Kehadiran</th>
									<th>Metode</th>
									<th>Waktu Dicatat</th>
								</tr>
							</thead>
							<tbody>
								{#each attendanceLogs as att}
									<tr>
										<td class="font-bold">{att.sessionTitle}</td>
										<td class="type-mono">{formatShortDate(att.sessionDate)}</td>
										<td>
											{#if att.status === 'hadir'}
												<span class="badge badge-approved">HADIR</span>
											{:else if att.status === 'izin' || att.status === 'sakit' || att.status === 'excused'}
												<span class="badge badge-pending">IZIN / SAKIT</span>
											{:else}
												<span class="badge badge-revisi">ALFA</span>
											{/if}
										</td>
										<td class="type-sub">{att.method === 'qr_scan' ? 'Scan QR' : 'Manual Pembimbing'}</td>
										<td class="type-sub">{formatDate(att.recordedAt)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

		<!-- TAB 3: PERFORMA TUGAS -->
		{:else if activeTab === 'tasks'}
			<div class="tab-section">
				<div class="section-header">
					<div>
						<h2 class="section-title">Histori Pengumpulan & Approval Tugas</h2>
						<p class="section-sub">Riwayat pengumpulan tugas beserta catatan penilaian dari mentor.</p>
					</div>

					<div class="summary-pills-row">
						<span class="sum-badge sum-badge--success">Approved: {approvedTasksCount}</span>
						<span class="sum-badge sum-badge--warning">Review: {pendingTasksCount}</span>
						<span class="sum-badge sum-badge--danger">Revisi: {revisiTasksCount}</span>
					</div>
				</div>

				{#if submissionLogs.length === 0}
					<div class="empty-card">
						<div class="empty-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
							</svg>
						</div>
						<div class="empty-title">Belum Ada Tugas Dikumpulkan</div>
						<div class="empty-sub">Riwayat pengumpulan tugas Anda akan muncul di sini setelah Anda mengirimkan tautan tugas di menu Tugas.</div>
					</div>
				{:else}
					<div class="tasks-stack">
						{#each submissionLogs as sub}
							<div
								class="task-item-card {sub.status === 'approved'
									? 'task-item-card--approved'
									: sub.status === 'revisi'
										? 'task-item-card--revisi'
										: 'task-item-card--pending'}"
							>
								<div class="task-item-top">
									<div>
										<h3 class="task-item-title">{sub.taskTitle}</h3>
										<span class="task-item-date">Dikirim pada: {formatDate(sub.submittedAt)}</span>
									</div>

									<div>
										{#if sub.status === 'approved'}
											<span class="badge badge-approved">APPROVED</span>
										{:else if sub.status === 'revisi'}
											<span class="badge badge-revisi">PERLU REVISI</span>
										{:else}
											<span class="badge badge-pending">MENUNGGU REVIEW</span>
										{/if}
									</div>
								</div>

								{#if sub.link}
									<div class="task-link-line">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
										<a href={sub.link} target="_blank" rel="noopener noreferrer" class="link-url">{sub.link}</a>
									</div>
								{/if}

								{#if sub.feedback}
									<div class="task-feedback-box">
										<div class="feedback-head">Catatan Feedback Mentor:</div>
										<div class="feedback-text">{sub.feedback}</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

		<!-- TAB 4: CATATAN GURU PEMBIMBING -->
		{:else if activeTab === 'notes'}
			<div class="tab-section">
				<div class="section-header">
					<div>
						<h2 class="section-title">Catatan Pendampingan & Bimbingan</h2>
						<p class="section-sub">Catatan umpan balik, pendampingan, atau arahan dari Guru Pembimbing Anda.</p>
					</div>
				</div>

				{#if notes.length === 0}
					<div class="empty-card">
						<div class="empty-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
							</svg>
						</div>
						<div class="empty-title">Belum Ada Catatan Guru Pembimbing</div>
						<div class="empty-sub">Catatan bimbingan dan apresiasi dari Guru Pembimbing Anda akan muncul di sini secara transparan.</div>
					</div>
				{:else}
					<div class="notes-stack">
						{#each notes as n}
							<div class="note-card">
								<div class="note-header">
									<div class="advisor-profile">
										<div class="advisor-avatar">
											{#if n.advisorAvatar}
												<img src={n.advisorAvatar} alt={n.advisorName} class="avatar-img" />
											{:else}
												{n.advisorName.charAt(0).toUpperCase()}
											{/if}
										</div>
										<div>
											<div class="advisor-name">{n.advisorName}</div>
											<div class="advisor-role">Guru Pembimbing</div>
										</div>
									</div>

									<div class="note-meta">
										{#if n.category === 'intervensi'}
											<span class="badge badge-pending">PENDAMPINGAN</span>
										{:else if n.category === 'konseling'}
											<span class="badge badge-unsubmitted">KONSELING</span>
										{:else}
											<span class="badge badge-unsubmitted">CATATAN UMUM</span>
										{/if}
										<span class="note-date">{formatDate(n.createdAt)}</span>
									</div>
								</div>

								<div class="note-body">
									<p>{n.note}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	/* ══════════════════════════════════════════════════════════
	   EXACT CONTENT AREA CONTAINER (Matches /siswa/tugas & /siswa/pertemuan)
	   ══════════════════════════════════════════════════════════ */
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

	@media (max-width: 1023px) {
		.content-area {
			padding: 20px 24px 60px;
			gap: 16px;
		}
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}
	}

	/* Header Card Container */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		margin-bottom: 0;
	}

	.page-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
	}
	.bc-link:hover {
		color: var(--primary, #2563eb);
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--primary, #2563eb);
		font-weight: 700;
	}

	.page-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
		margin: 0 0 6px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary, #475569);
		max-width: 680px;
		line-height: 1.5;
		margin: 0;
	}

	.header-badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 9px;
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		border-radius: var(--radius-full, 9999px);
		box-sizing: border-box;
		white-space: nowrap;
	}

	.badge-sehat {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}
	.badge-waspada {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
	}
	.badge-kritis {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}
	.badge-grade {
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
	}
	.badge-active-class {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	.badge-unsubmitted {
		background: var(--bg-cell, #f1f5f9);
		color: var(--text-secondary, #64748b);
		border: 1px solid var(--border-hard, #cbd5e1);
	}
	.badge-pending {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
	}
	.badge-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}
	.badge-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	/* Alert Warning Box */
	.alert-warning-box {
		background: #fffbe6;
		border: 1px solid #ffe58f;
		border-radius: 12px;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.alert-warning-header {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #d46b08;
	}
	.alert-warning-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: #873800;
	}
	.alert-warning-list {
		margin: 0;
		padding-left: 24px;
		font-size: 12.5px;
		color: #612500;
	}

	/* Stats Grid (Matches /siswa/tugas & /siswa/pertemuan) */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1023px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.stat-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stat-icon {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.icon-attendance { background: #e0f2fe; color: #0284c7; }
	.icon-task { background: #dcfce7; color: #16a34a; }
	.icon-track { background: #e0e7ff; color: #4f46e5; }
	.icon-streak { background: #fef3c7; color: #d97706; }

	.stat-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		background: var(--bg-cell, #f1f5f9);
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	.stat-subtext {
		font-size: 11px;
		color: var(--text-sub, #94a3b8);
		margin-top: 2px;
	}

	/* Filter Bar Tabs (Matches /siswa/tugas style) */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 10px 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		margin-bottom: 0;
	}

	.tabs-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		overflow-x: auto;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;
	}

	.tab-btn {
		padding: 6px 14px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary, #64748b);
		cursor: pointer;
		transition: all 150ms ease;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.tab-btn:hover {
		background: var(--bg-hover, #f1f5f9);
		color: var(--text-primary, #0f172a);
	}

	.tab-btn--active {
		background: var(--primary-light, #eff6ff);
		color: var(--primary, #2563eb);
		border-color: var(--primary-border, #bfdbfe);
	}

	/* Content Panel & Sections */
	.content-panel {
		width: 100%;
	}

	.tab-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	@media (min-width: 640px) {
		.section-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
		}
	}

	.section-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.section-sub {
		font-size: 13px;
		color: var(--text-secondary, #64748b);
		margin: 2px 0 0 0;
	}

	/* ══════════════════════════════════════════════════════════
	   2-TIER CATALOG STYLING (Matches /guru/kurikulum & /mentor/kurikulum)
	   ══════════════════════════════════════════════════════════ */
	.track-catalog-container {
		width: 100%;
	}

	.track-main-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.track-card-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.track-card-tags {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.track-card-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 4px 0 0 0;
		line-height: 1.3;
	}

	.track-card-desc {
		font-size: 13.5px;
		color: var(--text-secondary, #475569);
		margin: 0;
		line-height: 1.5;
	}

	.track-card-body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 14px 16px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
	}

	.rombel-info-line {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.rombel-label {
		font-weight: 700;
		color: var(--text-primary, #0f172a);
	}

	/* Mini Metrics Grid */
	.metrics-mini-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.mini-stat-item {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
		padding: 10px;
		text-align: center;
	}

	.mini-stat-val {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
	}

	.mini-stat-lbl {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	/* Progress Box in Catalog Card */
	.progress-box-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.progress-box-top {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 700;
	}

	.progress-box-lbl {
		color: var(--text-muted, #64748b);
	}

	.progress-box-val {
		color: var(--primary, #2563eb);
	}

	.progress-box-bar-bg {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-box-bar-fill {
		height: 100%;
		background: var(--primary, #2563eb);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}

	.track-card-footer {
		display: flex;
		justify-content: flex-end;
	}

	.btn-open-track {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
	}

	.btn-open-track:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.btn-open-track:active {
		transform: scale(0.98);
	}

	/* Tier Nav Bar (Back button in Tier 2) */
	.tier-nav-bar {
		margin-bottom: 4px;
	}

	.btn-back-catalog {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary, #475569);
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-back-catalog:hover {
		background: var(--bg-hover, #f1f5f9);
		color: var(--text-primary, #0f172a);
		border-color: #94a3b8;
	}

	/* Empty Card Style (Matches /siswa/tugas) */
	.empty-card {
		background: #ffffff;
		border: 2px dashed var(--border-hard, #cbd5e1);
		border-radius: 14px;
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--primary-light, #eff6ff);
		color: var(--primary, #2563eb);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		max-width: 400px;
	}

	/* Phase Grid & Cards */
	.phases-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.phase-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.phase-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.phase-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.phase-meta {
		font-size: 12px;
		color: var(--text-muted, #64748b);
	}

	.phase-badge {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: var(--primary, #2563eb);
		background: var(--primary-light, #eff6ff);
		padding: 2px 10px;
		border-radius: 9999px;
	}

	.phase-bar-bg {
		width: 100%;
		height: 6px;
		background: var(--bg-cell, #f1f5f9);
		border-radius: 9999px;
		overflow: hidden;
	}
	.phase-bar-fill {
		height: 100%;
		background: var(--primary, #2563eb);
		border-radius: 9999px;
	}

	.subphase-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.subphase-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
	}

	.subphase-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #cbd5e1;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.subphase-icon--done {
		background: #16a34a;
	}

	.subphase-info {
		flex: 1;
		min-width: 0;
	}

	.subphase-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
		word-break: break-word;
	}

	.subphase-meta-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 2px;
	}

	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		padding: 2px 7px;
		border-radius: 6px;
	}

	.meta-pill-task {
		color: #166534;
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	/* Summary Badges Row */
	.summary-pills-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.sum-badge {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 8px;
	}
	.sum-badge--success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
	.sum-badge--warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
	.sum-badge--danger { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }

	/* Data Table Container (Matches /admin/master) */
	.table-container {
		width: 100%;
		overflow-x: auto;
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	}

	.data-table {
		width: 100%;
		min-width: 600px;
		border-collapse: collapse;
		font-size: 13px;
	}
	.data-table th {
		background: var(--bg-inset, #f8fafc);
		color: var(--text-muted, #64748b);
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 10px 14px;
		text-align: left;
		border-bottom: 1px solid var(--border-hard, #e2e8f0);
	}
	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
		color: var(--text-primary, #0f172a);
	}
	.data-table tr:last-child td {
		border-bottom: none;
	}

	.type-mono {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
	}
	.type-sub {
		color: var(--text-muted, #64748b);
		font-size: 12px;
	}

	/* Tasks Stack */
	.tasks-stack {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.task-item-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.task-item-card--approved { border-left: 4px solid #16a34a; }
	.task-item-card--revisi { border-left: 4px solid #be123c; }
	.task-item-card--pending { border-left: 4px solid #d97706; }

	.task-item-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.task-item-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0 0 2px 0;
	}

	.task-item-date {
		font-size: 12px;
		color: var(--text-muted, #64748b);
	}

	.task-link-line {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--primary, #2563eb);
	}
	.link-url {
		font-family: var(--font-mono, monospace);
		color: var(--primary, #2563eb);
		text-decoration: underline;
		word-break: break-all;
	}

	.task-feedback-box {
		padding: 10px 12px;
		background: var(--bg-inset, #f8fafc);
		border-left: 3px solid var(--primary, #2563eb);
		border-radius: 6px;
		margin-top: 2px;
	}
	.feedback-head {
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.feedback-text {
		font-size: 13px;
		color: var(--text-primary, #0f172a);
		margin-top: 4px;
		line-height: 1.5;
	}

	/* Notes Stack */
	.notes-stack {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.note-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.note-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
	}

	.advisor-profile {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.advisor-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--primary, #2563eb);
		color: #ffffff;
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}
	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.advisor-name {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
	}
	.advisor-role {
		font-size: 11px;
		color: var(--text-muted, #64748b);
	}

	.note-meta {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.note-date {
		font-size: 12px;
		color: var(--text-sub, #94a3b8);
	}

	.note-body p {
		font-size: 13px;
		color: var(--text-primary, #0f172a);
		line-height: 1.5;
		margin: 0;
		white-space: pre-wrap;
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import StudentTrackProgressView from '$lib/components/progress/StudentTrackProgressView.svelte';

	let { data } = $props();

	// Active tab state: 'track' | 'attendance' | 'tasks' | 'notes'
	let activeTab = $state<'track' | 'attendance' | 'tasks' | 'notes'>(
		(['track', 'attendance', 'tasks', 'notes'].includes(page.url.searchParams.get('tab') || '')
			? page.url.searchParams.get('tab')
			: data.activeTabParam === 'attendance' ? 'attendance' : 'track') as any
	);

	// 2-Tier view mode inside Track Pembelajaran tab: 'catalog' | 'detail'
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
	<title>Detail Siswa — {student.fullName || 'Siswa'} | Portal Mentor NLC</title>
</svelte:head>

<div class="page-container">
	<!-- Standardized Header Card (Blueprint) -->
	<PageHeaderCard
		title="Progress Belajar — {student.fullName || 'Siswa'}"
		breadcrumbs={[
			{ label: 'Dashboard', href: '/mentor' },
			{ label: 'Daftar Siswa', href: `/mentor/siswa?kelasInstanceId=${data.kelasInstanceId}` },
			{ label: 'Detail Siswa' }
		]}
	>
		{#snippet badges()}
			{#if data.from === 'progress'}
				<a
					href="/mentor/progress?{data.trackIdParam ? `trackId=${data.trackIdParam}&` : ''}kelasInstanceId={data.kelasInstanceId}{data.tahunAjaranId ? `&tahunAjaranId=${data.tahunAjaranId}` : ''}"
					class="btn-secondary-head-pill"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span>Kembali ke Progress</span>
				</a>
			{:else}
				<a href="/mentor/siswa?kelasInstanceId={data.kelasInstanceId}" class="btn-secondary-head-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span>Kembali ke Roster</span>
				</a>
			{/if}
			{#if student.tingkatName}
				<span class="badge badge-grade">Tingkat {student.tingkatName}</span>
			{/if}
			{#if student.kelasName}
				<span class="badge badge-active-class">Kelas {student.kelasName}</span>
			{/if}
		{/snippet}
	</PageHeaderCard>

	<!-- ══════════════════════════════════════════════════════════
	     CARD INFORMASI PROFILE SISWA (IDENTITY CARD)
	     ══════════════════════════════════════════════════════════ -->
	<header class="student-hero-banner">
		<div class="hero-main-flex">
			<div class="student-identity-group">
				<div class="avatar-hero-lg">
					{#if student.avatarUrl}
						<img src={student.avatarUrl} alt={student.fullName} class="w-full h-full object-cover rounded-full" />
					{:else}
						<span>{(student.fullName || 'S').charAt(0).toUpperCase()}</span>
					{/if}
				</div>
				<div>
					<div class="flex items-center gap-2 flex-wrap">
						<h1 class="student-hero-title">{student.fullName || 'Siswa'}</h1>
						<span class="rombel-pill-lg">{student.kelasName || '-'}</span>
					</div>
					<p class="student-hero-sub">
						{student.nisn ? `NISN: ${student.nisn}` : `@${student.username || ''}`}
					</p>
				</div>
			</div>

			<!-- Quick Badge Pills Box -->
			<div class="hero-overall-box">
				<span class="hero-overall-val text-indigo-700 font-mono">
					{summary.totalPoints ?? 0} Pts
				</span>
				<span class="hero-overall-lbl">Total Poin Siswa</span>
			</div>
		</div>
	</header>

	<!-- Alert Warning Banner (If Any Attention Reason) -->
	{#if summary.alertReasons && summary.alertReasons.length > 0}
		<div class="alert-warning-box">
			<div class="alert-warning-header">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
				<span class="alert-warning-title">Catatan Perhatian Belajar Siswa</span>
			</div>
			<ul class="alert-warning-list">
				{#each summary.alertReasons as reason}
					<li>{reason}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Key Metrics Stats Grid (Matches /siswa/progress 100%) -->
	<div class="stats-grid">
		<!-- Card 1: Presensi -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-attendance">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				</div>
				<span class="stat-pill">{summary.attendanceRate ?? 0}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalSessions === 0 ? '-' : `${summary.attendanceRate}%`}</div>
				<div class="stat-label">Kehadiran Presensi</div>
				<div class="stat-subtext">{summary.attendedCount ?? 0}/{summary.totalSessions ?? 0} Sesi Hadir</div>
			</div>
		</div>

		<!-- Card 2: Tugas Approved -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-task">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<span class="stat-pill">{summary.taskCompletionRate ?? 0}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalTasks === 0 ? '-' : `${summary.taskCompletionRate}%`}</div>
				<div class="stat-label">Tugas Selesai</div>
				<div class="stat-subtext">{summary.approvedTasksCount ?? 0}/{summary.totalTasks ?? 0} Tugas Approved</div>
			</div>
		</div>

		<!-- Card 3: Track Pembelajaran -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-track">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</svg>
				</div>
				<span class="stat-pill">{summary.currentStreak ?? 0} Hari</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{summary.totalPoints ?? 0} Pts</div>
				<div class="stat-label">Poin & Streak</div>
				<div class="stat-subtext">Max Streak: {summary.maxStreak ?? 0} Hari</div>
			</div>
		</div>
	</div>

	<!-- Status Tabs Bar (Matches /siswa/progress 100%) -->
	<div class="filter-panel">
		<div class="tabs-row">
			<!-- Tab 1: Track Pembelajaran -->
			<button
				type="button"
				onclick={() => selectTab('track')}
				class="tab-btn {activeTab === 'track' ? 'tab-btn--all-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
				<span>Track Pembelajaran</span>
				<span class="tab-counter">{overallTrackProgress}%</span>
			</button>

			<!-- Tab 2: Histori Presensi -->
			<button
				type="button"
				onclick={() => selectTab('attendance')}
				class="tab-btn {activeTab === 'attendance' ? 'tab-btn--approved-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
				<span>Histori Presensi</span>
				<span class="tab-counter">{attendanceLogs.length}</span>
			</button>

			<!-- Tab 3: Performa Tugas -->
			<button
				type="button"
				onclick={() => selectTab('tasks')}
				class="tab-btn {activeTab === 'tasks' ? 'tab-btn--pending-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
				<span>Performa Tugas</span>
				<span class="tab-counter">{submissionLogs.length}</span>
			</button>

			<!-- Tab 4: Catatan Guru -->
			<button
				type="button"
				onclick={() => selectTab('notes')}
				class="tab-btn {activeTab === 'notes' ? 'tab-btn--revisi-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
				</svg>
				<span>Catatan Guru</span>
				<span class="tab-counter">{notes.length}</span>
			</button>
		</div>
	</div>

	<!-- Tab Panels -->
	<main class="content-panel">
		<!-- TAB 1: TRACK PEMBELAJARAN (2-TIER REUSABLE VIEW) -->
		{#if activeTab === 'track'}
			<StudentTrackProgressView
				{trackInfo}
				activeMembership={{
					kelasName: student.kelasName,
					tahunAjaranName: student.tahunAjaranName
				}}
				{phaseProgressList}
				{summary}
				initialViewMode={trackViewMode}
				onViewModeChange={(mode) => setTrackViewMode(mode)}
			/>

		<!-- TAB 2: HISTORI PRESENSI -->
		{:else if activeTab === 'attendance'}
			<div class="tab-section">
				<div class="section-header">
					<div>
						<h2 class="section-title">Histori Kehadiran & Sesi Pertemuan Siswa</h2>
						<p class="section-sub">Rekapitulasi kehadiran presensi {student.fullName} pada setiap sesi komunitas.</p>
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
								<rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
							</svg>
						</div>
						<div class="empty-title">Belum Ada Riwayat Presensi</div>
						<div class="empty-sub">Riwayat presensi sesi pertemuan akan muncul di sini setelah siswa melakukan presensi.</div>
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
									<th>Catatan</th>
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
												<span class="badge badge-revisi">ALFA / ABSEN</span>
											{/if}
										</td>
										<td class="type-sub uppercase font-mono text-xs">{att.method || 'MANUAL'}</td>
										<td class="type-sub">{att.manualReason || '-'}</td>
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
						<h2 class="section-title">Riwayat Pengumpulan & Performa Tugas Siswa</h2>
						<p class="section-sub">Daftar tugas yang telah dikirimkan oleh {student.fullName} beserta status evaluasinya.</p>
					</div>
				</div>

				{#if submissionLogs.length === 0}
					<div class="empty-card">
						<div class="empty-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						</div>
						<div class="empty-title">Belum Ada Tugas Dikumpulkan</div>
						<div class="empty-sub">Riwayat pengumpulan tugas siswa akan muncul di sini setelah mengirimkan tugas.</div>
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
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
										<a href={sub.link} target="_blank" rel="noopener noreferrer" class="link-url">{sub.link}</a>
									</div>
								{/if}

								{#if sub.feedback}
									<div class="task-feedback-box">
										<div class="feedback-head">Catatan Feedback Evaluator:</div>
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
						<h2 class="section-title">Catatan Pendampingan & Bimbingan Siswa</h2>
						<p class="section-sub">Catatan umpan balik, pendampingan, atau arahan bimbingan untuk {student.fullName}.</p>
					</div>
				</div>

				{#if notes.length === 0}
					<div class="empty-card">
						<div class="empty-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
						</div>
						<div class="empty-title">Belum Ada Catatan Guru Pembimbing</div>
						<div class="empty-sub">Catatan bimbingan dan apresiasi dari Guru Pembimbing akan muncul di sini.</div>
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
	/* Hero Identity Banner Card */
	.student-hero-banner {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		margin-bottom: 0;
	}

	.hero-main-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.student-identity-group {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.avatar-hero-lg {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #4f46e5;
		color: #ffffff;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.4rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
	}

	.student-hero-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
		line-height: 1.2;
	}

	.student-hero-sub {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		color: var(--text-muted, #64748b);
		margin: 2px 0 0 0;
	}

	.rombel-pill-lg {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #e0f2fe;
		color: #0369a1;
		padding: 2px 8px;
		border-radius: 6px;
		border: 1px solid #bae6fd;
	}

	.hero-overall-box {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}

	.hero-overall-val {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.4rem;
		font-weight: 900;
		line-height: 1.1;
	}

	.hero-overall-lbl {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
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

	/* Stats Grid (Matches /siswa/progress 100%) */
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

	/* Filter Panel Tabs Bar (Matches /siswa/progress 100%) */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 8px 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		margin-bottom: 0;
	}

	.tabs-row {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		white-space: nowrap;
		flex-wrap: nowrap;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}
	.tabs-row::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 12px;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border: 1px solid var(--border-hard, #e2e8f0);
		background: var(--bg-inset, #f8fafc);
		color: var(--text-secondary, #64748b);
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.tab-btn:hover {
		background: var(--bg-hover, #f1f5f9);
		color: var(--text-primary, #0f172a);
		border-color: #cbd5e1;
	}

	.tab-counter {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 9999px;
		background: #e2e8f0;
		color: #475569;
		line-height: 1;
	}

	/* Active Color Accents Per Status */
	.tab-btn--all-active {
		background: #eff6ff;
		color: #1d4ed8;
		border-color: #bfdbfe;
	}
	.tab-btn--all-active .tab-counter {
		background: #dbeafe;
		color: #1e40af;
	}

	.tab-btn--approved-active {
		background: #f0fdf4;
		color: #15803d;
		border-color: #bbf7d0;
	}
	.tab-btn--approved-active .tab-counter {
		background: #dcfce7;
		color: #166534;
	}

	.tab-btn--pending-active {
		background: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}
	.tab-btn--pending-active .tab-counter {
		background: #fef3c7;
		color: #92400e;
	}

	.tab-btn--revisi-active {
		background: #fff1f2;
		color: #be123c;
		border-color: #fecdd3;
	}
	.tab-btn--revisi-active .tab-counter {
		background: #ffe4e6;
		color: #9f1239;
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

	/* Data Table Container */
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

	/* Empty Card Style */
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
</style>

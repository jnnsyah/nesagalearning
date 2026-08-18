<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { untrack } from 'svelte';

	let { data } = $props();

	// Composite Student Info derived object
	const studentInfo = $derived({
		userId: data.studentProgress?.student.userId || data.studentAttendanceHistory?.student.userId || data.studentUserId,
		fullName: data.studentProgress?.student.fullName || data.studentAttendanceHistory?.student.fullName || 'Siswa',
		username: data.studentProgress?.student.username || data.studentAttendanceHistory?.student.username || '',
		nisn: data.studentProgress?.student.nisn ?? data.studentAttendanceHistory?.student.nisn ?? null,
		avatarUrl: data.studentProgress?.student.avatarUrl || data.studentAttendanceHistory?.student.avatarUrl || null,
		kelasName: data.studentProgress?.student.kelasName || data.studentAttendanceHistory?.student.kelasName || '-',
		totalPoints: data.studentProgress?.student.totalPoints || 0,
		attendanceRate: data.studentAttendanceHistory?.student.attendanceRate ?? data.studentProgress?.student.attendanceRate ?? 0,
		overallProgress: data.studentProgress?.student.overallProgress || 0,
		hasAnyStarted: data.studentProgress?.student.hasAnyStarted || false,
		totalHadir: data.studentAttendanceHistory?.student.totalHadir || 0,
		totalSessionsCount: data.studentAttendanceHistory?.student.totalSessionsCount || 0
	});

	// Tab state
	let activeTab = $state<'curriculum' | 'attendance'>(data.activeTab || 'curriculum');

	// Attendance Filters State
	let statusFilter = $state<'all' | 'hadir' | 'excused' | 'alpha'>('all');
	let startDateFilter = $state('');
	let endDateFilter = $state('');
	let searchQuery = $state('');

	// Pagination State
	let currentPage = $state(1);
	const pageSize = 10;

	// Reset page on filter changes
	$effect(() => {
		statusFilter;
		startDateFilter;
		endDateFilter;
		searchQuery;
		untrack(() => {
			currentPage = 1;
		});
	});

	// Derived Filtered Logs
	const filteredLogs = $derived.by(() => {
		const logs = data.studentAttendanceHistory?.logs || [];
		return logs.filter((log) => {
			if (statusFilter !== 'all' && log.status !== statusFilter) return false;
			if (startDateFilter && log.sessionDate < startDateFilter) return false;
			if (endDateFilter && log.sessionDate > endDateFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.trim().toLowerCase();
				const matchTitle = log.sessionTitle.toLowerCase().includes(q);
				const matchDate = log.sessionDate.toLowerCase().includes(q);
				if (!matchTitle && !matchDate) return false;
			}
			return true;
		});
	});

	const isAnyFilterActive = $derived(
		statusFilter !== 'all' || Boolean(startDateFilter) || Boolean(endDateFilter) || Boolean(searchQuery.trim())
	);

	// Derived Pagination Slices
	const totalPages = $derived(Math.max(1, Math.ceil(filteredLogs.length / pageSize)));

	const paginatedLogs = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredLogs.slice(start, start + pageSize);
	});

	function formatHumanDate(dateStr: string) {
		if (!dateStr) return '-';
		const parts = dateStr.split('-');
		if (parts.length === 3) {
			const y = Number(parts[0]);
			const m = Number(parts[1]) - 1;
			const d = Number(parts[2]);
			const dateObj = new Date(y, m, d);
			if (!isNaN(dateObj.getTime())) {
				return dateObj.toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				});
			}
		}
		const dateObj = new Date(dateStr);
		if (isNaN(dateObj.getTime())) return dateStr;
		return dateObj.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function switchTab(tab: 'curriculum' | 'attendance') {
		activeTab = tab;
		const params = new URLSearchParams(window.location.search);
		params.set('tab', tab);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Detail Siswa — {studentInfo.fullName} | Mentor NLC</title>
</svelte:head>

<ToastContainer />

<div class="page-container">
	<!-- Top Back Button Navigation -->
	<div class="mb-5">
		<a href="/mentor/siswa?kelasInstanceId={data.kelasInstanceId}" class="btn-back-link">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
			<span>Kembali ke Roster Siswa Kelas</span>
		</a>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     HERO PROFILE BANNER CARD
	     ══════════════════════════════════════════════════════════ -->
	<header class="student-hero-banner">
		<div class="hero-main-flex">
			<div class="student-identity-group">
				<div class="avatar-hero-lg">
					{#if studentInfo.avatarUrl}
						<img src={studentInfo.avatarUrl} alt={studentInfo.fullName} class="w-full h-full object-cover rounded-full" />
					{:else}
						<span>{studentInfo.fullName.charAt(0).toUpperCase()}</span>
					{/if}
				</div>
				<div>
					<div class="flex items-center gap-2 flex-wrap">
						<h1 class="student-hero-title">{studentInfo.fullName}</h1>
						<span class="rombel-pill-lg">{studentInfo.kelasName}</span>
					</div>
					<p class="student-hero-sub">
						{studentInfo.nisn ? `NISN: ${studentInfo.nisn}` : `@${studentInfo.username}`}
					</p>
				</div>
			</div>

			<!-- Composite Badge Box -->
			<div class="hero-overall-box">
				{#if activeTab === 'attendance'}
					<span class="hero-overall-val text-emerald-700">
						{studentInfo.attendanceRate}%
					</span>
					<span class="hero-overall-lbl">Rata-Rata Kehadiran</span>
				{:else}
					{#if studentInfo.hasAnyStarted}
						<span class="hero-overall-val text-indigo-700">
							{studentInfo.overallProgress}%
						</span>
						<span class="hero-overall-lbl">Progres Komposit</span>
					{:else}
						<span class="hero-overall-val-empty">
							Belum Dimulai
						</span>
						<span class="hero-overall-lbl">Status Kurikulum</span>
					{/if}
				{/if}
			</div>
		</div>

		<!-- 4 Key Stat Cards Banner Grid -->
		<div class="hero-stats-grid mt-6 pt-5 border-t border-slate-200">
			<div class="hero-stat-card">
				<span class="stat-lbl-mini">Total Poin Siswa</span>
				<span class="stat-val-mini text-amber-700 flex items-center justify-center gap-1">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
					<span>{studentInfo.totalPoints} Pts</span>
				</span>
			</div>

			<div class="hero-stat-card">
				<span class="stat-lbl-mini">Rata-Rata Kehadiran</span>
				<span class="stat-val-mini text-emerald-700">{studentInfo.attendanceRate}%</span>
			</div>

			<div class="hero-stat-card">
				<span class="stat-lbl-mini">Hadir Pertemuan</span>
				<span class="stat-val-mini text-indigo-700">
					{studentInfo.totalHadir}/{studentInfo.totalSessionsCount} Sesi
				</span>
			</div>

			<div class="hero-stat-card">
				<span class="stat-lbl-mini">Progres Kurikulum</span>
				<span class="stat-val-mini text-slate-800">
					{studentInfo.hasAnyStarted ? `${studentInfo.overallProgress}%` : 'Belum Dimulai'}
				</span>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     TAB NAVIGATION BAR
	     ══════════════════════════════════════════════════════════ -->
	<div class="tabs-header-bar mb-8">
		<button
			type="button"
			class="tab-btn"
			class:tab-btn-active={activeTab === 'curriculum'}
			onclick={() => switchTab('curriculum')}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
			<span>Detail Progress Kurikulum & Modul</span>
		</button>

		<button
			type="button"
			class="tab-btn"
			class:tab-btn-active={activeTab === 'attendance'}
			onclick={() => switchTab('attendance')}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			<span>Riwayat Presensi Sesi ({data.studentAttendanceHistory?.logs.length || 0} Sesi)</span>
		</button>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     TAB 1: CURRICULUM PROGRESS BREAKDOWN
	     ══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'curriculum'}
		<section aria-label="Rincian Fase Kurikulum Siswa" class="pt-2">
			{#if !data.studentProgress || data.studentProgress.phases.length === 0}
				<div class="empty-card py-16 text-center bg-white rounded-xl border border-slate-200">
					<p class="text-sm text-slate-500 font-mono">Belum ada modul / fase kurikulum yang ditautkan ke kelas ini.</p>
				</div>
			{:else}
				<div class="space-y-6">
					<div class="flex items-center justify-between pb-2 border-b border-slate-200">
						<h3 class="text-sm font-bold text-slate-700 font-mono uppercase tracking-wider">
							Daftar Fase Kurikulum ({data.studentProgress.phases.length} Fase)
						</h3>
						<span class="text-xs text-slate-400 font-mono">Standar Ketercapaian 100%</span>
					</div>

					{#each data.studentProgress.phases as phaseItem}
						<div class="phase-card">
							<div class="flex items-center justify-between gap-4 mb-3">
								<div class="flex items-center gap-3">
									<span class="phase-code-pill">{phaseItem.phaseCode}</span>
									<h4 class="font-extrabold text-slate-900 text-base">{phaseItem.title}</h4>
								</div>
								{#if phaseItem.hasStartedSubPhases}
									<span class="phase-rate-badge">{phaseItem.completionRate}%</span>
								{:else}
									<span class="badge badge-subtle text-xs">BELUM BERJALAN</span>
								{/if}
							</div>

							<div class="progress-track-bar mb-5">
								<div
									class="progress-fill-bar"
									style="width: {phaseItem.hasStartedSubPhases ? phaseItem.completionRate : 0}%;"
								></div>
							</div>

							<div class="space-y-3">
								{#each phaseItem.subPhases as subP}
									<div class="subphase-box" class:subphase-unstarted={!subP.isStarted}>
										<div class="flex items-center justify-between gap-3 mb-2">
											<h5 class="text-sm font-bold text-slate-900 truncate">{subP.title}</h5>
											{#if subP.isStarted}
												<span class="subphase-percent-tag">{subP.completionRate}%</span>
											{:else}
												<span class="badge badge-subtle text-[10px]">BELUM DIMULAI</span>
											{/if}
										</div>

										<div class="flex items-center gap-2 flex-wrap">
											{#if !subP.isStarted}
												<span class="meta-pill meta-pill-gray">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
													<span>Belum ada sesi / tugas diselenggarakan</span>
												</span>
											{:else}
												<span class="meta-pill meta-pill-slate">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>
													<span>Sesi: {subP.attendedSessionsCount}/{subP.totalSessionsCount}</span>
												</span>

												{#if subP.totalTasksCount > 0}
													<span class={subP.approvedTasksCount > 0 ? "meta-pill meta-pill-emerald" : "meta-pill meta-pill-gray"}>
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
														<span>Tugas: {subP.approvedTasksCount}/{subP.totalTasksCount} Approved</span>
													</span>
												{/if}

												{#if subP.hasQuiz}
													{#if subP.quizPassed}
														<span class="meta-pill meta-pill-emerald">
															<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
															<span>Quiz Lulus</span>
														</span>
													{:else}
														<span class="meta-pill meta-pill-gray">
															<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
															<span>Quiz Pending</span>
														</span>
													{/if}
												{/if}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

	<!-- ══════════════════════════════════════════════════════════
	     TAB 2: ATTENDANCE SESSION HISTORY DATA TABLE WITH FILTERS & PAGINATION
	     ══════════════════════════════════════════════════════════ -->
	{:else}
		<section aria-label="Riwayat Presensi Sesi Pertemuan" class="pt-2">
			<!-- Filter Controls Grid Card -->
			<div class="page-filter-card mb-6 space-y-4">
				<!-- Row 1: Search Bar (Left) & Reset Filter (Right when active) -->
				<div class="flex items-end justify-between gap-4">
					<div class="flex-1">
						<label for="page-search-input" class="filter-label">Cari Pertemuan / Topik</label>
						<TextInput
							id="page-search-input"
							placeholder="Ketik judul sesi atau tanggal..."
							bind:value={searchQuery}
						/>
					</div>

					{#if isAnyFilterActive}
						<div class="flex-shrink-0">
							<button
								type="button"
								class="btn-reset-filters-active"
								onclick={() => {
									statusFilter = 'all';
									startDateFilter = '';
									endDateFilter = '';
									searchQuery = '';
								}}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								<span>Reset Filter</span>
							</button>
						</div>
					{/if}
				</div>

				<!-- Row 2: Status Filter, Dari Tanggal, Sampai Tanggal -->
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="page-status-filter" class="filter-label">Filter Status</label>
						<CustomSelect
							id="page-status-filter"
							options={[
								{ value: 'all', label: 'Semua Status Sesi' },
								{ value: 'hadir', label: 'Hadir Saja' },
								{ value: 'excused', label: 'Izin / Sakit' },
								{ value: 'alpha', label: 'Alpha / Tanpa Keterangan' }
							]}
							bind:value={statusFilter}
							searchable={false}
						/>
					</div>

					<div>
						<DatePicker
							id="page-start-date"
							label="Dari Tanggal"
							placeholder="Pilih tgl awal..."
							bind:value={startDateFilter}
						/>
					</div>

					<div>
						<DatePicker
							id="page-end-date"
							label="Sampai Tanggal"
							placeholder="Pilih tgl akhir..."
							bind:value={endDateFilter}
						/>
					</div>
				</div>
			</div>

			<!-- Session Logs List Header -->
			<div class="flex items-center justify-between pb-2 mb-4 border-b border-slate-200">
				<h3 class="text-sm font-bold text-slate-700 font-mono uppercase tracking-wider">
					Daftar Riwayat Sesi ({filteredLogs.length} Sesi Pertemuan)
				</h3>
				<span class="text-xs text-slate-500 font-mono">
					Halaman {currentPage} dari {totalPages}
				</span>
			</div>

			{#if filteredLogs.length === 0}
				<div class="empty-card py-16 text-center bg-white rounded-xl border border-slate-200">
					<p class="text-sm text-slate-500 font-mono">Tidak ada sesi presensi yang sesuai dengan kriteria filter.</p>
				</div>
			{:else}
				<div class="recap-card mb-6">
					<div class="table-scroll-container">
						<table class="data-table">
							<thead>
								<tr>
									<th class="w-12 text-center">No</th>
									<th>Judul & Topik Pertemuan</th>
									<th class="text-center">Tanggal & Jam</th>
									<th class="text-center w-36">Status Kehadiran</th>
									<th class="text-center">Metode Presensi</th>
									<th>Catatan / Alasan</th>
								</tr>
							</thead>
							<tbody>
								{#each paginatedLogs as sessionLog, idx}
									<tr class="hover:bg-slate-50 transition-colors">
										<td class="text-center font-mono text-xs text-slate-400">
											{(currentPage - 1) * pageSize + idx + 1}
										</td>
										<td>
											<span class="font-extrabold text-slate-900 text-sm block">
												{sessionLog.sessionTitle}
											</span>
											{#if sessionLog.activityType}
												<span class="text-xs text-slate-400 font-mono block mt-0.5 uppercase">
													{sessionLog.activityType}
												</span>
											{/if}
										</td>
										<td class="text-center font-mono text-xs text-slate-600">
											<div class="inline-flex items-center justify-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
												<span>{formatHumanDate(sessionLog.sessionDate)}</span>
												<span class="text-slate-300">•</span>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
												<span>{sessionLog.startTime}</span>
											</div>
										</td>
										<td class="text-center">
											{#if sessionLog.status === 'hadir'}
												<span class="badge badge-success text-xs px-2.5 py-0.5 font-bold">HADIR</span>
											{:else if sessionLog.status === 'excused'}
												<span class="badge badge-warning text-xs px-2.5 py-0.5 font-bold">IZIN / SAKIT</span>
											{:else}
												<span class="badge badge-error text-xs px-2.5 py-0.5 font-bold">ALPHA</span>
											{/if}
										</td>
										<td class="text-center font-mono text-xs">
											{#if sessionLog.status === 'alpha'}
												<span class="text-slate-300">-</span>
											{:else if sessionLog.method === 'qr'}
												<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
													<span>QR Code</span>
												</span>
											{:else}
												<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
													<span>Manual</span>
												</span>
											{/if}
										</td>
										<td class="text-xs text-slate-600">
											{#if sessionLog.manualReason}
												<span class="italic bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200 inline-block">
													"{sessionLog.manualReason}"
												</span>
											{:else}
												<span class="text-slate-300">-</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Pagination Controls Footer -->
				<div class="pagination-footer">
					<span class="text-xs text-slate-500 font-mono">
						Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length} Sesi
					</span>

					<div class="flex items-center gap-2">
						<button
							type="button"
							class="btn-pagination"
							disabled={currentPage === 1}
							onclick={() => currentPage--}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
							<span>Sebelumnya</span>
						</button>

						{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
							<button
								type="button"
								class="btn-page-num"
								class:btn-page-num-active={currentPage === p}
								onclick={() => currentPage = p}
							>
								{p}
							</button>
						{/each}

						<button
							type="button"
							class="btn-pagination"
							disabled={currentPage === totalPages}
							onclick={() => currentPage++}
						>
							<span>Selanjutnya</span>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					</div>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1280px;
		margin: 0 auto;
	}

	.btn-back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 700;
		color: #4f46e5;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.btn-back-link:hover {
		color: #3730a3;
	}

	/* Hero Banner Card */
	.student-hero-banner {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 14px);
		padding: 24px 28px;
		margin-bottom: 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.hero-main-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
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
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 900;
		font-size: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.student-hero-title {
		font-size: 22px;
		font-weight: 900;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.rombel-pill-lg {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 800;
		background: #e0e7ff;
		color: #3730a3;
		padding: 2px 8px;
		border-radius: 6px;
	}

	.student-hero-sub {
		font-size: 13px;
		color: #64748b;
		font-family: var(--font-mono, monospace);
		margin-top: 3px;
	}

	.hero-overall-box {
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		padding: 12px 20px;
		text-align: right;
	}

	.hero-overall-val {
		display: block;
		font-size: 24px;
		font-weight: 900;
		line-height: 1.1;
	}

	.hero-overall-val-empty {
		display: block;
		font-size: 15px;
		font-weight: 800;
		color: #64748b;
		font-family: var(--font-mono, monospace);
	}

	.hero-overall-lbl {
		display: block;
		font-size: 10px;
		font-family: var(--font-mono, monospace);
		color: #64748b;
		font-weight: 700;
		text-transform: uppercase;
		margin-top: 2px;
	}

	.hero-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.hero-stat-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px;
		text-align: center;
	}

	.stat-lbl-mini {
		display: block;
		font-size: 11px;
		color: #64748b;
		font-weight: 600;
	}

	.stat-val-mini {
		display: block;
		font-size: 16px;
		font-weight: 800;
		font-family: var(--font-mono, monospace);
		margin-top: 3px;
	}

	/* Tabs Header Bar */
	.tabs-header-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		border-bottom: 2px solid #e2e8f0;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 18px;
		font-size: 14px;
		font-weight: 700;
		color: #64748b;
		border: none;
		background: transparent;
		border-bottom: 3px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		color: #4f46e5;
	}

	.tab-btn-active {
		color: #4f46e5;
		border-bottom-color: #4f46e5;
	}

	/* Phase Cards */
	.phase-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px 24px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
	}

	.phase-code-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 800;
		background: #e0e7ff;
		color: #3730a3;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.phase-rate-badge {
		font-family: var(--font-mono, monospace);
		font-size: 16px;
		font-weight: 900;
		color: #3730a3;
	}

	.progress-track-bar {
		width: 100%;
		height: 8px;
		background: #f1f5f9;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill-bar {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
		border-radius: 4px;
	}

	.subphase-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 4px solid #6366f1;
		border-radius: 10px;
		padding: 14px 16px;
	}

	.subphase-unstarted {
		border-left-color: #cbd5e1 !important;
		background: #fafafa !important;
	}

	.subphase-percent-tag {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 800;
		background: #e0e7ff;
		color: #4338ca;
		padding: 2px 8px;
		border-radius: 4px;
	}

	/* Attendance Filter Card */
	.page-filter-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.filter-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 4px;
	}

	.btn-reset-filters-active {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: #fee2e2;
		color: #b91c1c;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-reset-filters-active:hover {
		background: #fca5a5;
		color: #7f1d1d;
	}

	/* Data Table */
	.recap-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		overflow: hidden;
	}

	.table-scroll-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 680px;
		font-size: 13px;
	}

	.data-table th {
		background: #f8fafc;
		color: #475569;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		text-transform: uppercase;
		padding: 12px 14px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
	}

	/* Meta Pills */
	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.meta-pill-slate {
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #475569;
	}

	.meta-pill-emerald {
		background: #dcfce7;
		border: 1px solid #bbf7d0;
		color: #15803d;
	}

	.meta-pill-gray {
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #94a3b8;
	}

	/* Pagination Footer */
	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 16px;
		border-top: 1px solid #e2e8f0;
		flex-wrap: wrap;
		gap: 12px;
	}

	.btn-pagination {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-pagination:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.btn-pagination:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-page-num {
		min-width: 34px;
		height: 34px;
		padding: 0 8px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-family: var(--font-mono, monospace);
		font-weight: 700;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-page-num:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.btn-page-num-active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.hero-stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { untrack } from 'svelte';
	import type { StudentRosterItem } from '$lib/server/services/mentor-student-roster.service';

	let { data } = $props();

	// Form Drawer State for Student Curriculum Progress
	let drawerOpen = $state(false);
	let selectedStudent = $state<StudentRosterItem | null>(null);

	// Filters State
	let selectedTaId = $derived(
		data.rosterData.selectedTahunAjaran?.id ? String(data.rosterData.selectedTahunAjaran.id) : ''
	);

	let selectedKelasId = $derived(
		data.rosterData.selectedKelas?.id ? String(data.rosterData.selectedKelas.id) : ''
	);

	let searchInput = $state(data.rosterData.searchQuery || '');
	let selectedRiskFilter = $state(data.rosterData.riskFilter || 'all');

	// Auto-open drawer if studentId is present in URL
	$effect(() => {
		if (data.selectedStudentUserId && data.studentProgress) {
			const found = data.rosterData.roster.find((r) => r.userId === data.selectedStudentUserId);
			if (found) {
				untrack(() => {
					selectedStudent = found;
					drawerOpen = true;
				});
			}
		}
	});

	// Sync search input from server props
	$effect(() => {
		const q = data.rosterData.searchQuery;
		untrack(() => {
			if (searchInput !== q) searchInput = q;
		});
	});

	// Select Options
	const taSelectOptions = $derived(
		data.rosterData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const kelasSelectOptions = $derived(
		data.rosterData.mentorClasses.map((c) => ({
			value: String(c.id),
			label: `${c.name} (${c.tingkatName})`
		}))
	);

	const riskFilterOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'good', label: 'Kehadiran Baik (>=60%)' },
		{ value: 'warning', label: 'Perlu Perhatian (<60%)' },
		{ value: 'critical', label: 'Kritis (<40%)' }
	];

	function handleTaChange(val: string | number | null) {
		updateUrlFilters({ tahunAjaranId: String(val ?? '') });
	}

	function handleKelasChange(val: string | number | null) {
		updateUrlFilters({ kelasInstanceId: String(val ?? ''), studentId: null });
	}

	function handleRiskFilterChange(val: string | number | null) {
		updateUrlFilters({ risk: String(val ?? 'all') });
	}

	function updateUrlFilters(newParams: Record<string, string | null>) {
		const params = new URLSearchParams();
		if (selectedTaId) params.set('tahunAjaranId', selectedTaId);
		if (selectedKelasId) params.set('kelasInstanceId', selectedKelasId);
		if (searchInput.trim()) params.set('q', searchInput.trim());
		if (selectedRiskFilter !== 'all') params.set('risk', selectedRiskFilter);
		if (data.selectedStudentUserId && !newParams.hasOwnProperty('studentId')) {
			params.set('studentId', String(data.selectedStudentUserId));
		}

		for (const [key, val] of Object.entries(newParams)) {
			if (val === null || val === '') {
				params.delete(key);
			} else {
				params.set(key, val);
			}
		}

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleSearchSubmit(e: SubmitEvent) {
		e.preventDefault();
		updateUrlFilters({ q: searchInput.trim() });
	}

	function openStudentProgress(student: StudentRosterItem) {
		selectedStudent = student;
		updateUrlFilters({ studentId: String(student.userId) });
		drawerOpen = true;
	}

	function handleDrawerClose() {
		drawerOpen = false;
		updateUrlFilters({ studentId: null });
	}
</script>

<svelte:head>
	<title>Roster Siswa Kelas & Progress Kurikulum — Mentor NLC</title>
</svelte:head>

<ToastContainer />

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Roster Siswa & Progress Kurikulum</h1>
					{#if data.rosterData.selectedKelas}
						<span class="badge badge-primary">
							{data.rosterData.selectedKelas.name}
						</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					Direktori siswa aktif di kelas yang Anda ampu. Pantau statistik presensi, poin, dan progres pencapaian fase kurikulum siswa.
				</p>
			</div>

			<div class="flex items-center gap-3 flex-wrap">
				<div class="w-48">
					<label for="ta-select" class="filter-label">Tahun Ajaran</label>
					<CustomSelect
						id="ta-select"
						name="tahunAjaranId"
						options={taSelectOptions}
						value={selectedTaId}
						onchange={handleTaChange}
						searchable={false}
					/>
				</div>

				<div class="w-56">
					<label for="kelas-select" class="filter-label">Pilih Rombel Kelas</label>
					<CustomSelect
						id="kelas-select"
						name="kelasInstanceId"
						options={kelasSelectOptions}
						value={selectedKelasId}
						onchange={handleKelasChange}
						searchable={false}
					/>
				</div>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     4 KEY METRIC STAT CARDS (60% MINIMUM ATTENDANCE THRESHOLD)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Ringkasan Roster Siswa">
		<div class="stat-card">
			<div class="stat-icon-box icon-students">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.totalStudentsCount} Siswa</span>
				<span class="stat-label">Total Siswa Roster</span>
				<span class="stat-subtext">Kelas {data.rosterData.selectedKelas?.name || '-'}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-attendance">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.avgAttendanceRate}%</span>
				<span class="stat-label">Rata-rata Kehadiran</span>
				<span class="stat-subtext">Presensi Hadir Sesi</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-points">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.avgPoints} Pts</span>
				<span class="stat-label">Rata-rata Poin</span>
				<span class="stat-subtext">Total Gamifikasi Poin</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-attention">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.rosterData.summary.attentionNeededCount} Siswa</span>
				<span class="stat-label">Perlu Perhatian</span>
				<span class="stat-subtext">Kehadiran &lt; 60%</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     FILTER BAR & SEARCH
	     ══════════════════════════════════════════════════════════ -->
	<div class="filter-card mb-5">
		<form onsubmit={handleSearchSubmit} class="filter-controls-grid">
			<div class="search-input-col">
				<label for="roster-search-input" class="filter-label">Cari Nama Siswa / NISN</label>
				<div class="search-input-wrapper">
					<TextInput
						id="roster-search-input"
						name="q"
						placeholder="Ketik nama atau NISN siswa..."
						bind:value={searchInput}
					/>
					<button type="submit" class="btn-search-trigger" title="Cari">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					</button>
				</div>
			</div>

			<div class="w-56">
				<label for="risk-filter" class="filter-label">Filter Tingkat Risiko</label>
				<CustomSelect
					id="risk-filter"
					name="risk"
					options={riskFilterOptions}
					value={selectedRiskFilter}
					onchange={handleRiskFilterChange}
					searchable={false}
				/>
			</div>
		</form>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     ROSTER DATA TABLE (WITH INLINE PROGRESS BARS & SVG ACTION ICONS)
	     ══════════════════════════════════════════════════════════ -->
	<section class="recap-card" aria-label="Daftar Siswa Roster">
		{#if data.rosterData.roster.length === 0}
			<div class="empty-card py-12 text-center">
				<div class="empty-icon-circle">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<h3 class="font-bold text-slate-800 text-base">Tidak Ada Siswa Ditemukan</h3>
				<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Tidak ditemukan siswa roster untuk kriteria pencarian dan filter yang dipilih.
				</p>
			</div>
		{:else}
			<div class="table-scroll-container">
				<table class="data-table">
					<thead>
						<tr>
							<th class="w-12 text-center">No</th>
							<th>Nama Siswa & Rombel</th>
							<th class="text-center">Total Poin</th>
							<th class="text-center">Hadir / Sesi</th>
							<th class="text-center">Izin / Sakit</th>
							<th class="text-center">Alpha</th>
							<th class="text-right w-48">% Kehadiran</th>
							<th class="text-right w-52">% Progress Kurikulum</th>
						</tr>
					</thead>
					<tbody>
						{#each data.rosterData.roster as student, idx}
							<tr class="hover:bg-slate-50 transition-colors">
								<td class="text-center text-xs font-mono text-slate-400">{idx + 1}</td>
								<td>
									<div class="student-profile-flex">
										<div class="avatar-circle">
											{#if student.avatarUrl}
												<img src={student.avatarUrl} alt={student.fullName} class="w-full h-full object-cover rounded-full" />
											{:else}
												<span>{student.fullName.charAt(0).toUpperCase()}</span>
											{/if}
										</div>
										<div class="student-name-box">
											<span class="student-fullname">{student.fullName}</span>
											<div class="student-sub-info">
												<span class="student-nisn">{student.nisn ? `NISN: ${student.nisn}` : `@${student.username}`}</span>
												<span class="rombel-pill">{student.kelasName}</span>
											</div>
										</div>
									</div>
								</td>
								<td class="text-center font-bold text-indigo-700 font-mono text-sm">
									⭐ {student.totalPoints}
								</td>
								<td class="text-center font-bold text-emerald-700 font-mono text-sm">
									{student.totalHadir} / {student.totalSessionsCount}
								</td>
								<td class="text-center font-semibold text-amber-700 font-mono text-sm">
									{student.totalExcused}
								</td>
								<td class="text-center text-slate-400 font-mono text-sm">
									{student.totalAlpha}
								</td>
								<!-- Kehadiran Progress Bar + Detail Icon -->
								<td class="text-right font-mono">
									<div class="flex items-center justify-end gap-2">
										<span class="font-bold text-slate-800">{student.attendanceRate}%</span>
										<div class="rate-mini-track">
											<div
												class="rate-mini-fill"
												class:fill-green={student.attendanceRate >= 60}
												class:fill-amber={student.attendanceRate >= 40 && student.attendanceRate < 60}
												class:fill-red={student.attendanceRate < 40}
												style="width: {student.attendanceRate}%;"
											></div>
										</div>
										<a
											href="/guru/siswa/{student.userId}"
											class="btn-cell-icon"
											title="Lihat Detail Profil & Presensi Siswa"
										>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
										</a>
									</div>
								</td>
								<!-- Kurikulum Composite Progress Bar + SVG Action Icon -->
								<td class="text-right font-mono">
									<div class="flex items-center justify-end gap-2">
										{#if student.hasAnyStarted}
											<span class="font-bold text-indigo-700">{student.overallProgress}%</span>
											<div class="rate-mini-track">
												<div
													class="rate-mini-fill fill-indigo"
													style="width: {student.overallProgress}%;"
												></div>
											</div>
										{:else}
											<span class="text-xs text-slate-400 font-normal">Belum Dimulai</span>
										{/if}
										<button
											type="button"
											class="btn-cell-icon btn-cell-icon-indigo"
											title="Lihat Detail Progress Kurikulum"
											onclick={() => openStudentProgress(student)}
										>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<!-- ══════════════════════════════════════════════════════════
     SPACIOUS FORM DRAWER FOR INDIVIDUAL STUDENT CURRICULUM PROGRESS
     ══════════════════════════════════════════════════════════ -->
<FormDrawer
	bind:open={drawerOpen}
	onclose={handleDrawerClose}
	title="Detail Progress Phase Kurikulum Siswa"
	subtitle={selectedStudent ? `${selectedStudent.fullName} (${selectedStudent.nisn ? `NISN: ${selectedStudent.nisn}` : `@${selectedStudent.username}`})` : ''}
>
	{#if selectedStudent}
		<div class="drawer-progress-container space-y-6 py-2">
			<!-- Student Hero Header Card (Spacious Light Theme) -->
			<div class="student-hero-card">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div class="avatar-hero-circle">
							{#if selectedStudent.avatarUrl}
								<img src={selectedStudent.avatarUrl} alt={selectedStudent.fullName} class="w-full h-full object-cover rounded-full" />
							{:else}
								<span>{selectedStudent.fullName.charAt(0).toUpperCase()}</span>
							{/if}
						</div>
						<div>
							<h4 class="font-extrabold text-slate-900 text-base leading-snug">{selectedStudent.fullName}</h4>
							<div class="flex items-center gap-2 mt-1.5">
								<span class="text-xs text-slate-500 font-mono">{selectedStudent.nisn ? `NISN: ${selectedStudent.nisn}` : `@${selectedStudent.username}`}</span>
								<span class="rombel-pill">{selectedStudent.kelasName}</span>
							</div>
						</div>
					</div>

					<div class="overall-progress-box">
						{#if data.studentProgress?.student.hasAnyStarted}
							<span class="progress-val-text">
								{data.studentProgress.student.overallProgress}%
							</span>
							<span class="progress-lbl-text">Progres Komposit</span>
						{:else}
							<span class="progress-val-text-empty">
								Belum Dimulai
							</span>
							<span class="progress-lbl-text">Status Sesi Kelas</span>
						{/if}
					</div>
				</div>

				<div class="banner-stats-grid mt-5 pt-4 border-t border-slate-100">
					<div class="banner-stat-box">
						<span class="banner-stat-val text-amber-700">⭐ {selectedStudent.totalPoints}</span>
						<span class="banner-stat-lbl">Total Poin</span>
					</div>
					<div class="banner-stat-box">
						<span class="banner-stat-val text-emerald-700">{selectedStudent.attendanceRate}%</span>
						<span class="banner-stat-lbl">Kehadiran</span>
					</div>
					<div class="banner-stat-box">
						<span class="banner-stat-val text-indigo-700">{selectedStudent.totalHadir}/{selectedStudent.totalSessionsCount}</span>
						<span class="banner-stat-lbl">Hadir Sesi</span>
					</div>
				</div>
			</div>

			<!-- Curriculum Phase Cards Breakdown -->
			{#if !data.studentProgress}
				<div class="py-14 text-center bg-slate-50 rounded-xl border border-slate-200">
					<div class="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
					<p class="text-xs text-slate-500 font-mono">Memuat rincian progres fase kurikulum siswa...</p>
				</div>
			{:else if data.studentProgress.phases.length === 0}
				<div class="empty-card py-12 text-center bg-slate-50 rounded-xl border border-slate-200">
					<p class="text-xs text-slate-500 font-mono">Belum ada modul/fase kurikulum yang ditautkan ke kelas ini.</p>
				</div>
			{:else}
				<div class="phases-stack space-y-6">
					<div class="flex items-center justify-between pb-1 border-b border-slate-200">
						<h5 class="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider">
							Rincian Fase Kurikulum ({data.studentProgress.phases.length} Fase)
						</h5>
						<span class="text-xs text-slate-400 font-mono">Standar Ketercapaian 100%</span>
					</div>

					{#each data.studentProgress.phases as phaseItem}
						<div class="phase-progress-card">
							<!-- Phase Header Row -->
							<div class="flex items-center justify-between gap-3 mb-3">
								<div class="flex items-center gap-2.5">
									<span class="phase-badge-pill">{phaseItem.phaseCode}</span>
									<h5 class="font-extrabold text-slate-900 text-sm">{phaseItem.title}</h5>
								</div>
								{#if phaseItem.hasStartedSubPhases}
									<span class="phase-percent-badge">{phaseItem.completionRate}%</span>
								{:else}
									<span class="badge badge-subtle text-[11px]">BELUM BERJALAN</span>
								{/if}
							</div>

							<!-- Phase Progress Bar -->
							<div class="progress-track-bar mb-4">
								<div
									class="progress-fill-bar"
									style="width: {phaseItem.hasStartedSubPhases ? phaseItem.completionRate : 0}%;"
								></div>
							</div>

							<!-- SubPhases List with Generous Spacing -->
							<div class="subphases-list-stack space-y-3">
								{#each phaseItem.subPhases as subP}
									<div class="subphase-card" class:subphase-unstarted={!subP.isStarted}>
										<div class="flex items-center justify-between gap-3 mb-2">
											<h6 class="text-xs font-bold text-slate-900 truncate">{subP.title}</h6>
											{#if subP.isStarted}
												<span class="subphase-percent-tag">{subP.completionRate}%</span>
											{:else}
												<span class="badge badge-subtle text-[10px]">BELUM DIMULAI</span>
											{/if}
										</div>

										<div class="flex items-center gap-2 flex-wrap">
											{#if !subP.isStarted}
												<span class="meta-pill meta-pill-gray">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
													<span>Belum ada sesi / tugas diselenggarakan</span>
												</span>
											{:else}
												<span class="meta-pill meta-pill-slate">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>
													<span>Sesi: {subP.attendedSessionsCount}/{subP.totalSessionsCount}</span>
												</span>

												{#if subP.totalTasksCount > 0}
													<span class={subP.approvedTasksCount > 0 ? "meta-pill meta-pill-emerald" : "meta-pill meta-pill-gray"}>
														<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
														<span>Tugas: {subP.approvedTasksCount}/{subP.totalTasksCount} Approved</span>
													</span>
												{/if}

												{#if subP.hasQuiz}
													{#if subP.quizPassed}
														<span class="meta-pill meta-pill-emerald">
															<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
															<span>Quiz Lulus</span>
														</span>
													{:else}
														<span class="meta-pill meta-pill-gray">
															<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
		</div>
	{/if}
</FormDrawer>

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1280px;
		margin: 0 auto;
	}

	.page-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px 24px;
		margin-bottom: 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.hero-top-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.hero-title-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.hero-title {
		font-size: 22px;
		font-weight: 800;
		color: var(--text-main, #0f172a);
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		margin-top: 4px;
	}

	.filter-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 4px;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 16px;
		display: flex;
		align-items: flex-start;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.stat-icon-box {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-students { background: #e0e7ff; color: #4338ca; }
	.icon-attendance { background: #dcfce7; color: #15803d; }
	.icon-points { background: #fef3c7; color: #b45309; }
	.icon-attention { background: #fee2e2; color: #b91c1c; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 800;
		color: var(--text-main, #0f172a);
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
		font-family: var(--font-mono, monospace);
		color: #94a3b8;
		margin-top: 2px;
	}

	/* Filter Card */
	.filter-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px 16px;
	}

	.filter-controls-grid {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}

	.search-input-col {
		flex: 1;
		min-width: 260px;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-search-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s ease;
	}

	.btn-search-trigger:hover {
		background: #4338ca;
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
		padding: 10px 14px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
	}

	.student-profile-flex {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.avatar-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.student-name-box {
		display: flex;
		flex-direction: column;
	}

	.student-fullname {
		font-weight: 700;
		color: #0f172a;
		font-size: 13px;
	}

	.student-sub-info {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 2px;
	}

	.student-nisn {
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		color: #64748b;
	}

	.rombel-pill {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		background: #e0e7ff;
		color: #4338ca;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.rate-mini-track {
		width: 40px;
		height: 6px;
		background: #f1f5f9;
		border-radius: 3px;
		overflow: hidden;
	}

	.rate-mini-fill {
		height: 100%;
		border-radius: 3px;
	}

	.fill-green { background: #22c55e; }
	.fill-amber { background: #f59e0b; }
	.fill-red { background: #ef4444; }
	.fill-indigo { background: #6366f1; }

	.btn-cell-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.btn-cell-icon:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.btn-cell-icon-indigo {
		background: #e0e7ff;
		color: #4338ca;
		border-color: #c7d2fe;
	}

	.btn-cell-icon-indigo:hover {
		background: #c7d2fe;
		color: #312e81;
	}

	/* Drawer Student Hero Card Light */
	.student-hero-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: 14px;
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.avatar-hero-circle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 800;
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.overall-progress-box {
		background: #e0e7ff;
		border: 1px solid #c7d2fe;
		border-radius: 10px;
		padding: 10px 16px;
		text-align: right;
	}

	.progress-val-text {
		display: block;
		font-size: 22px;
		font-weight: 900;
		color: #4338ca;
		line-height: 1.1;
	}

	.progress-val-text-empty {
		display: block;
		font-size: 14px;
		font-weight: 800;
		font-family: var(--font-mono, monospace);
		color: #64748b;
		line-height: 1.1;
	}

	.progress-lbl-text {
		display: block;
		font-size: 9px;
		font-family: var(--font-mono, monospace);
		color: #4f46e5;
		font-weight: 700;
		text-transform: uppercase;
		margin-top: 2px;
	}

	.banner-stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.banner-stat-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		text-align: center;
	}

	.banner-stat-val {
		display: block;
		font-size: 14px;
		font-weight: 800;
		font-family: var(--font-mono, monospace);
	}

	.banner-stat-lbl {
		display: block;
		font-size: 10px;
		color: #64748b;
		margin-top: 2px;
	}

	/* Phase Cards */
	.phase-progress-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 18px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.phase-badge-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 800;
		background: #e0e7ff;
		color: #3730a3;
		padding: 3px 8px;
		border-radius: 6px;
		letter-spacing: 0.03em;
	}

	.phase-percent-badge {
		font-family: var(--font-mono, monospace);
		font-size: 14px;
		font-weight: 800;
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
		transition: width 0.3s ease;
	}

	/* Subphase Card Item */
	.subphase-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 4px solid #6366f1;
		border-radius: 10px;
		padding: 12px 14px;
		transition: background 0.15s ease;
	}

	.subphase-unstarted {
		border-left-color: #cbd5e1 !important;
		background: #fafafa !important;
	}

	.subphase-card:hover {
		background: #f1f5f9;
	}

	.subphase-percent-tag {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 800;
		background: #e0e7ff;
		color: #4338ca;
		padding: 2px 7px;
		border-radius: 4px;
	}

	/* Meta Pills */
	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.meta-pill-slate {
		background: #ffffff;
		border: 1px solid #e2e8f0;
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

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

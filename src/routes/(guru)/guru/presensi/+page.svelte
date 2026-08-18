<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import { untrack } from 'svelte';
	import { exportAttendanceToExcel, exportAttendanceToPDF } from '$lib/utils/attendance-exporter';
	import type { StudentRecapRow } from '$lib/server/services/guru-attendance-recap.service';

	let { data } = $props();

	// Derived values for filter controls
	let selectedTaId = $derived(
		data.recapData.selectedTahunAjaran?.id
			? String(data.recapData.selectedTahunAjaran.id)
			: ''
	);

	let searchInput = $state(
		data.recapData.viewMode === 'detail' ? data.recapData.searchQuery || '' : ''
	);

	let activeTab = $derived(
		data.recapData.viewMode === 'detail' ? data.recapData.activeTab || 'matrix' : 'matrix'
	);

	// Slide-over drawer state for student detail logs
	let drawerOpen = $state(false);
	let selectedStudentForDrawer = $state<StudentRecapRow | null>(null);

	function openStudentDrawer(student: StudentRecapRow) {
		selectedStudentForDrawer = student;
		drawerOpen = true;
	}

	// Sync local search input when server search query changes
	$effect(() => {
		if (data.recapData.viewMode === 'detail') {
			const q = data.recapData.searchQuery;
			untrack(() => {
				if (searchInput !== q) searchInput = q;
			});
		}
	});

	// Select options
	const taSelectOptions = $derived(
		data.recapData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	function handleTaChange(val: string | number | null) {
		const taStr = String(val ?? '');
		const params = new URLSearchParams();
		if (taStr) params.set('tahunAjaranId', taStr);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function navigateToDetail(kelasInstanceId: number) {
		const params = new URLSearchParams();
		params.set('kelasInstanceId', String(kelasInstanceId));
		if (data.recapData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.recapData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function navigateBackToGrid() {
		const params = new URLSearchParams();
		if (data.recapData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.recapData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function updateDetailFilters(newParams: Record<string, string | null>) {
		if (data.recapData.viewMode !== 'detail') return;

		const params = new URLSearchParams();
		params.set('kelasInstanceId', String(data.recapData.selectedKelas.id));
		if (data.recapData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.recapData.selectedTahunAjaran.id));
		}
		if (searchInput.trim()) params.set('q', searchInput.trim());
		if (activeTab !== 'matrix') params.set('tab', activeTab);

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
		updateDetailFilters({ q: searchInput.trim() });
	}

	function handleTabChange(tab: 'matrix' | 'logs') {
		updateDetailFilters({ tab });
	}

	function handleExportExcel() {
		if (data.recapData.viewMode === 'detail' && data.recapData.students.length > 0) {
			exportAttendanceToExcel(data.recapData);
		}
	}

	function handleExportPDF() {
		if (data.recapData.viewMode === 'detail' && data.recapData.students.length > 0) {
			exportAttendanceToPDF(data.recapData);
		}
	}
</script>

<svelte:head>
	<title>Rekap Presensi Sesi Kelas — Guru Pembimbing | NLC</title>
</svelte:head>

<div class="page-container">
	{#if data.recapData.viewMode === 'grid'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 1: GRID VIEW (Katalog Kartu Rombel Kelas)
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-top-row">
				<div>
					<div class="hero-title-group">
						<h1 class="hero-title">Katalog Rekap Presensi Rombel</h1>
						{#if data.recapData.selectedTahunAjaran}
							<span class="badge badge-primary">
								TA {data.recapData.selectedTahunAjaran.name}
							</span>
						{/if}
					</div>
					<p class="hero-subtitle">
						Pilih rombel / kelas di bawah ini untuk melihat laporan rekapitulasi presensi sesi kelas secara rinci.
					</p>
				</div>

				<div class="w-64 flex-shrink-0">
					<label for="grid-ta-select" class="filter-label">Tahun Ajaran</label>
					<CustomSelect
						id="grid-ta-select"
						name="tahunAjaranId"
						options={taSelectOptions}
						value={selectedTaId}
						onchange={handleTaChange}
						searchable={false}
					/>
				</div>
			</div>
		</header>

		{#if data.recapData.classCards.length === 0}
			<div class="empty-card py-12 text-center">
				<div class="empty-icon-circle">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<h3 class="font-bold text-slate-800 text-base">Belum Ada Rombel Kelas Aktif</h3>
				<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Tidak ditemukan rombel kelas berjalan untuk Tahun Ajaran {data.recapData.selectedTahunAjaran?.name || ''}.
				</p>
			</div>
		{:else}
			<section class="grid-cards-container" aria-label="Daftar Rombel Kelas">
				<div class="cards-grid">
					{#each data.recapData.classCards as cCard}
						<div
							class="class-card"
							class:class-card--archived={cCard.classState === 'archived'}
							class:class-card--upcoming={cCard.classState === 'upcoming'}
						>
							<div class="class-card-header">
								<div class="flex items-center justify-between gap-2">
									<span class="badge badge-subtle">{cCard.tingkatName}</span>

									{#if cCard.classState === 'archived'}
										<span class="badge badge-archived inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
											<span>TERARSIP</span>
										</span>
									{:else if cCard.classState === 'upcoming'}
										<span class="badge badge-amber inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
											<span>BELUM SESI</span>
										</span>
									{:else}
										<span class="badge badge-success inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
											<span>AKTIF</span>
										</span>
									{/if}
								</div>

								<h3 class="class-card-title mt-2">{cCard.name}</h3>
							</div>

							<div class="class-card-body">
								<div class="metrics-mini-grid">
									<div class="mini-stat">
										<span class="mini-stat-val">{cCard.totalStudentsCount}</span>
										<span class="mini-stat-lbl">Siswa</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{cCard.totalSessionsCount}</span>
										<span class="mini-stat-lbl">Sesi Pertemuan</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{cCard.overallAttendanceRate}%</span>
										<span class="mini-stat-lbl">Kehadiran</span>
									</div>
								</div>

								<div class="progress-box mt-3">
									<div class="flex items-center justify-between text-xs font-mono mb-1">
										<span class="text-slate-500">Tingkat Presensi Hadir</span>
										<span class="font-bold text-slate-800">{cCard.totalSessionsCount === 0 ? '-' : `${cCard.overallAttendanceRate}%`}</span>
									</div>
									<div class="mini-progress-track">
										<div
											class="mini-progress-fill"
											class:fill-green={cCard.overallAttendanceRate >= 80}
											class:fill-amber={cCard.overallAttendanceRate >= 50 && cCard.overallAttendanceRate < 80}
											class:fill-red={cCard.overallAttendanceRate < 50}
											style="width: {cCard.totalSessionsCount === 0 ? 0 : cCard.overallAttendanceRate}%;"
										></div>
									</div>
								</div>
							</div>

							<div class="class-card-footer">
								<button
									type="button"
									class="btn-open-class"
									onclick={() => navigateToDetail(cCard.id)}
								>
									<span>Lihat Rekap Presensi</span>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else if data.recapData.viewMode === 'detail'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 2: DETAIL BREAKDOWN VIEW (Rekap Presensi Rombel)
		     ══════════════════════════════════════════════════════════ -->
		<header class="page-hero">
			<div class="hero-top-bar">
				<button type="button" onclick={navigateBackToGrid} class="btn-back-link">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
					<span>Kembali ke Daftar Rombel (TA {data.recapData.selectedTahunAjaran?.name})</span>
				</button>
			</div>

			<div class="hero-top-row">
				<div>
					<div class="hero-title-group">
						<h1 class="hero-title">Rekap Presensi — {data.recapData.selectedKelas.name}</h1>
						<span class="badge badge-primary">{data.recapData.selectedKelas.tingkatName}</span>
					</div>
					<p class="hero-subtitle">
						Ringkasan keikutsertaan presensi siswa. Klik tombol "Detail Presensi" pada siswa untuk melihat timeline pertemuan.
					</p>
				</div>

				<div class="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onclick={handleExportExcel}
						disabled={data.recapData.students.length === 0}
						class="btn-export-excel"
						title="Export ke Excel (.xlsx)"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
						<span>Export Excel (.xlsx)</span>
					</button>

					<button
						type="button"
						onclick={handleExportPDF}
						disabled={data.recapData.students.length === 0}
						class="btn-export-pdf"
						title="Export ke Dokumen PDF (.pdf)"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>
						<span>Export PDF (.pdf)</span>
					</button>
				</div>
			</div>

			<!-- Filter Bar for Search -->
			<div class="filter-card mt-5">
				<form onsubmit={handleSearchSubmit} class="filter-controls-grid">
					<div class="search-input-col col-span-2">
						<label for="search-student-input" class="filter-label">Cari Nama Siswa / NISN</label>
						<div class="search-input-wrapper">
							<TextInput
								id="search-student-input"
								name="q"
								placeholder="Ketik nama atau NISN siswa..."
								bind:value={searchInput}
							/>
							<button type="submit" class="btn-search-trigger" title="Cari">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
							</button>
						</div>
					</div>
				</form>
			</div>
		</header>

		<!-- ══════════════════════════════════════════════════════════
		     4 SUMMARY STAT CARDS
		     ══════════════════════════════════════════════════════════ -->
		<section class="stats-grid" aria-label="Ringkasan Presensi">
			<div class="stat-card">
				<div class="stat-icon-box icon-hadir">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.recapData.summary.totalSessionsCount} Sesi</span>
					<span class="stat-label">Total Pertemuan Kelas</span>
					<span class="stat-subtext">Dari {data.recapData.summary.totalStudentsCount} Siswa Terdaftar</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-rate">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.recapData.summary.overallAttendanceRate}%</span>
					<span class="stat-label">Tingkat Kehadiran Overall</span>
					<span class="stat-subtext">Rata-rata Presensi Hadir</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-excused">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.recapData.summary.excusedRate}%</span>
					<span class="stat-label">Tingkat Izin / Sakit</span>
					<span class="stat-subtext">Presensi Berhalangan Sah</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-alpha">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{data.recapData.summary.alphaRate}%</span>
					<span class="stat-label">Tingkat Tanpa Keterangan</span>
					<span class="stat-subtext">Presensi Alpha / Belum Hadir</span>
				</div>
			</div>
		</section>

		<!-- ══════════════════════════════════════════════════════════
		     VIEW MODE TAB SWITCHER
		     ══════════════════════════════════════════════════════════ -->
		<div class="view-tabs-container">
			<div class="tabs-list" role="tablist">
				<button
					type="button"
					role="tab"
					class="tab-btn"
					class:tab-btn--active={activeTab === 'matrix'}
					onclick={() => handleTabChange('matrix')}
					aria-selected={activeTab === 'matrix'}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
					<span>Rekap Matriks Siswa</span>
					<span class="tab-count-pill">{data.recapData.students.length}</span>
				</button>

				<button
					type="button"
					role="tab"
					class="tab-btn"
					class:tab-btn--active={activeTab === 'logs'}
					onclick={() => handleTabChange('logs')}
					aria-selected={activeTab === 'logs'}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
					<span>Audit Log Riwayat Presensi</span>
					<span class="tab-count-pill">{data.recapData.recentLogs.length}</span>
				</button>
			</div>
		</div>

		<!-- ══════════════════════════════════════════════════════════
		     TAB CONTENT 1: REKAP MATRIKS SISWA (CLEAN & COMPACT TABLE)
		     ══════════════════════════════════════════════════════════ -->
		{#if activeTab === 'matrix'}
			<section class="recap-card" aria-label="Matriks Rekap Presensi">
				{#if data.recapData.students.length === 0}
					<div class="empty-card py-12 text-center">
						<div class="empty-icon-circle">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
						</div>
						<h3 class="font-bold text-slate-800 text-base">Tidak Ada Data Rekap Presensi</h3>
						<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
							Tidak ditemukan data presensi untuk kata kunci pencarian yang dipilih.
						</p>
					</div>
				{:else}
					<div class="table-scroll-container">
						<table class="data-table">
							<thead>
								<tr>
									<th class="w-12 text-center">No</th>
									<th>Nama Siswa & Rombel</th>
									<th class="text-center">Hadir</th>
									<th class="text-center">Izin / Sakit</th>
									<th class="text-center">Alpha</th>
									<th class="text-right">% Kehadiran</th>
									<th class="text-center w-36">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#each data.recapData.students as student, idx}
									<tr class="hover:bg-slate-50 transition-colors">
										<td class="text-center text-xs font-mono text-slate-400">{idx + 1}</td>
										<td>
											<div class="student-name-box">
												<span class="student-fullname">{student.fullName}</span>
												<div class="student-sub-info">
													<span class="student-nisn">{student.nisn ? `NISN: ${student.nisn}` : `@${student.username}`}</span>
													<span class="rombel-pill">{student.kelasName}</span>
												</div>
											</div>
										</td>
										<td class="text-center font-bold text-emerald-700 font-mono text-sm">
											{student.totalHadir}
										</td>
										<td class="text-center font-semibold text-amber-700 font-mono text-sm">
											{student.totalExcused}
										</td>
										<td class="text-center text-slate-400 font-mono text-sm">
											{student.totalAlpha}
										</td>
										<td class="text-right font-mono">
											<div class="flex items-center justify-end gap-2">
												<span class="font-bold text-slate-800">{student.attendanceRate}%</span>
												<div class="rate-mini-track">
													<div
														class="rate-mini-fill"
														class:fill-green={student.attendanceRate >= 80}
														class:fill-amber={student.attendanceRate >= 50 && student.attendanceRate < 80}
														class:fill-red={student.attendanceRate < 50}
														style="width: {student.attendanceRate}%;"
													></div>
												</div>
											</div>
										</td>
										<td class="text-center">
											<button
												type="button"
												class="btn-view-detail-log"
												onclick={() => openStudentDrawer(student)}
											>
												<span>Detail Log</span>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

		<!-- ══════════════════════════════════════════════════════════
		     TAB CONTENT 2: AUDIT LOG RIWAYAT PRESENSI
		     ══════════════════════════════════════════════════════════ -->
		{:else if activeTab === 'logs'}
			<section class="recap-card" aria-label="Audit Log Riwayat Presensi">
				{#if data.recapData.recentLogs.length === 0}
					<div class="empty-card py-12 text-center">
						<div class="empty-icon-circle">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
						</div>
						<h3 class="font-bold text-slate-800 text-base">Belum Ada Audit Log Presensi Recorded</h3>
						<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
							Belum ada riwayat presensi yang dicatat via QR maupun manual untuk kelas ini.
						</p>
					</div>
				{:else}
					<div class="table-scroll-container">
						<table class="data-table">
							<thead>
								<tr>
									<th>Waktu WIB</th>
									<th>Nama Siswa</th>
									<th>Rombel</th>
									<th>Sesi Pertemuan</th>
									<th>Metode</th>
									<th>Status Presensi</th>
									<th>Catatan Reason</th>
								</tr>
							</thead>
							<tbody>
								{#each data.recapData.recentLogs as log}
									<tr>
										<td class="type-mono text-xs text-slate-500">
											{new Date(log.recordedAt).toLocaleString('id-ID', {
												day: '2-digit',
												month: 'short',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</td>
										<td>
											<div class="font-bold text-slate-900 text-xs">{log.fullName}</div>
											<div class="text-[11px] text-slate-400 font-mono">@{log.username}</div>
										</td>
										<td>
											<span class="rombel-pill">{log.kelasName}</span>
										</td>
										<td class="text-xs font-medium text-slate-800">
											{log.pertemuanTitle}
											<span class="block text-[11px] text-slate-400 font-mono">{log.sessionDate}</span>
										</td>
										<td>
											{#if log.method === 'qr'}
												<span class="badge badge-subtle inline-flex items-center gap-1">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
													<span>QR SCAN</span>
												</span>
											{:else}
												<span class="badge badge-amber inline-flex items-center gap-1">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
													<span>MANUAL</span>
												</span>
											{/if}
										</td>
										<td>
											{#if log.status === 'hadir'}
												<span class="badge badge-success">HADIR</span>
											{:else}
												<span class="badge badge-warning">EXCUSED (IZIN)</span>
											{/if}
										</td>
										<td class="text-xs text-slate-600 font-mono">
											{log.manualReason || '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/if}

		<!-- ══════════════════════════════════════════════════════════
		     STUDENT ATTENDANCE SLIDER / DRAWER (FORM DRAWER REUSE)
		     ══════════════════════════════════════════════════════════ -->
		<FormDrawer
			bind:open={drawerOpen}
			title="Detail Timeline Presensi Siswa"
			subtitle={selectedStudentForDrawer ? `${selectedStudentForDrawer.fullName} (${selectedStudentForDrawer.nisn ? `NISN: ${selectedStudentForDrawer.nisn}` : `@${selectedStudentForDrawer.username}`})` : ''}
		>
			{#if selectedStudentForDrawer}
				<!-- Student Info Card Header -->
				<div class="drawer-student-card">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h4 class="font-extrabold text-slate-900 text-base">{selectedStudentForDrawer.fullName}</h4>
							<div class="student-sub-info mt-1">
								<span class="text-xs text-slate-500 font-mono">{selectedStudentForDrawer.nisn ? `NISN: ${selectedStudentForDrawer.nisn}` : `@${selectedStudentForDrawer.username}`}</span>
								<span class="rombel-pill">{selectedStudentForDrawer.kelasName}</span>
							</div>
						</div>
						<div class="text-right">
							<span class="text-xl font-extrabold text-slate-900">{selectedStudentForDrawer.attendanceRate}%</span>
							<span class="block text-[10px] text-slate-400 font-mono uppercase">Kehadiran</span>
						</div>
					</div>

					<div class="metrics-mini-grid mt-4">
						<div class="mini-stat">
							<span class="mini-stat-val text-emerald-700">{selectedStudentForDrawer.totalHadir}</span>
							<span class="mini-stat-lbl">Hadir</span>
						</div>
						<div class="mini-stat">
							<span class="mini-stat-val text-amber-700">{selectedStudentForDrawer.totalExcused}</span>
							<span class="mini-stat-lbl">Izin/Sakit</span>
						</div>
						<div class="mini-stat">
							<span class="mini-stat-val text-slate-400">{selectedStudentForDrawer.totalAlpha}</span>
							<span class="mini-stat-lbl">Alpha</span>
						</div>
					</div>
				</div>

				<!-- Session Logs Timeline -->
				<div class="drawer-sessions-section mt-6">
					<div class="flex items-center justify-between mb-3">
						<h5 class="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider">
							Histori Log Pertemuan ({data.recapData.sessions.length} Sesi)
						</h5>
					</div>

					{#if data.recapData.sessions.length === 0}
						<p class="text-xs text-slate-400 font-mono text-center py-6">Belum ada sesi pertemuan diselenggarakan.</p>
					{:else}
						<div class="session-timeline-stack">
							{#each data.recapData.sessions as sess, idx}
								{@const stStatus = selectedStudentForDrawer.sessionsMap[sess.id]}
								<div
									class="session-timeline-item"
									class:item--hadir={stStatus?.status === 'hadir'}
									class:item--excused={stStatus?.status === 'excused'}
									class:item--alpha={stStatus?.status === 'alpha'}
								>
									<div class="flex items-start justify-between gap-3">
										<div>
											<div class="flex items-center gap-2 flex-wrap">
												<span class="text-[11px] font-mono font-bold text-slate-400">#Sesi {idx + 1}</span>
												<span class="badge badge-subtle">{sess.activityType}</span>
												<span class="text-xs text-slate-400 font-mono">{sess.sessionDate}</span>
											</div>
											<h5 class="font-bold text-slate-900 text-sm mt-1">{sess.title}</h5>
										</div>

										<div class="flex-shrink-0">
											{#if stStatus?.status === 'hadir'}
												<span class="badge badge-success inline-flex items-center gap-1">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
													<span>HADIR ({stStatus.method?.toUpperCase() || 'QR'})</span>
												</span>
											{:else if stStatus?.status === 'excused'}
												<span class="badge badge-warning inline-flex items-center gap-1">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
													<span>IZIN / SAKIT</span>
												</span>
											{:else}
												<span class="badge badge-subtle">ALPHA</span>
											{/if}
										</div>
									</div>

									{#if stStatus?.manualReason}
										<div class="reason-note mt-2">
											<span class="font-bold text-slate-700">Alasan:</span> {stStatus.manualReason}
										</div>
									{/if}

									{#if stStatus?.recordedAt}
										<div class="text-[10px] text-slate-400 font-mono mt-2 text-right">
											Waktu Presensi: {new Date(stStatus.recordedAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</FormDrawer>
	{/if}
</div>

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

	.hero-top-bar {
		margin-bottom: 12px;
	}

	.btn-back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: #4f46e5;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.btn-back-link:hover {
		text-decoration: underline;
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

	/* Tier 1 Grid Cards */
	.grid-cards-container {
		margin-top: 8px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.class-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.class-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
		border-color: #4f46e5;
	}

	.class-card--archived {
		background: #f8fafc;
		border: 1.5px dashed #cbd5e1;
	}

	.class-card--upcoming {
		background: #fffdf5;
		border: 1px solid #fde68a;
	}

	.class-card-title {
		font-size: 18px;
		font-weight: 800;
		color: var(--text-main, #0f172a);
		line-height: 1.2;
	}

	.class-card-body {
		margin-top: 16px;
		margin-bottom: 16px;
	}

	.metrics-mini-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		background: #f8fafc;
		border: 1px solid #f1f5f9;
		border-radius: 8px;
		padding: 10px 8px;
		text-align: center;
	}

	.mini-stat-val {
		display: block;
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
	}

	.mini-stat-lbl {
		display: block;
		font-size: 10px;
		font-family: var(--font-mono, monospace);
		color: #64748b;
	}

	.class-card-footer {
		border-top: 1px solid var(--border-subtle, #f1f5f9);
		padding-top: 14px;
	}

	.btn-open-class {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 9px 16px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-open-class:hover {
		background: #4338ca;
	}

	.btn-export-excel {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #16a34a;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-export-excel:hover:not(:disabled) {
		background: #15803d;
	}

	.btn-export-excel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-export-pdf {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #dc2626;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-export-pdf:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-export-pdf:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Filter Card */
	.filter-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px 16px;
	}

	.filter-controls-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		align-items: flex-end;
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

	.icon-rate { background: #e0e7ff; color: #4338ca; }
	.icon-hadir { background: #dcfce7; color: #15803d; }
	.icon-excused { background: #fef3c7; color: #b45309; }
	.icon-alpha { background: #fee2e2; color: #b91c1c; }

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

	/* Tabs */
	.view-tabs-container {
		margin-bottom: 16px;
	}

	.tabs-list {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 2px;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: transparent;
		border: none;
		border-bottom: 3px solid transparent;
		font-size: 13px;
		font-weight: 700;
		color: #64748b;
		cursor: pointer;
		margin-bottom: -2px;
		transition: color 0.15s ease, border-color 0.15s ease;
	}

	.tab-btn:hover {
		color: #0f172a;
	}

	.tab-btn--active {
		color: #4f46e5;
		border-bottom-color: #4f46e5;
	}

	.tab-count-pill {
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		background: #f1f5f9;
		color: #475569;
		padding: 1px 6px;
		border-radius: 6px;
	}

	.tab-btn--active .tab-count-pill {
		background: #e0e7ff;
		color: #4338ca;
	}

	/* Recap Card & Table */
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

	.btn-view-detail-log {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		background: #e0e7ff;
		color: #4338ca;
		border: none;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-view-detail-log:hover {
		background: #c7d2fe;
	}

	/* Data Table for Logs & Compact Matrix */
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

	.data-table tr:hover td {
		background: #f8fafc;
	}

	/* Drawer Custom Styles */
	.drawer-student-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 16px;
	}

	.session-timeline-stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.session-timeline-item {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px 14px;
		transition: border-color 0.15s ease;
	}

	.item--hadir {
		border-left: 4px solid #22c55e;
	}

	.item--excused {
		border-left: 4px solid #f59e0b;
	}

	.item--alpha {
		border-left: 4px solid #cbd5e1;
		background: #fafafa;
	}

	.reason-note {
		font-size: 12px;
		color: #475569;
		background: #f1f5f9;
		padding: 6px 10px;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.cards-grid {
			grid-template-columns: 1fr;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

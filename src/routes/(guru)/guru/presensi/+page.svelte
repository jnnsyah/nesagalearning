<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import { untrack } from 'svelte';

	let { data } = $props();

	// Derived values for filter controls
	let selectedTaId = $derived(
		data.recapData.selectedTahunAjaran?.id
			? String(data.recapData.selectedTahunAjaran.id)
			: ''
	);

	let selectedKelasId = $derived(
		data.recapData.selectedKelas?.id
			? String(data.recapData.selectedKelas.id)
			: ''
	);

	let searchInput = $state(data.recapData.searchQuery || '');
	let activeTab = $derived(data.recapData.activeTab || 'matrix');

	// Sync local search input when server search query changes
	$effect(() => {
		const q = data.recapData.searchQuery;
		untrack(() => {
			if (searchInput !== q) searchInput = q;
		});
	});

	// Select options
	const taSelectOptions = $derived(
		data.recapData.tahunAjaranOptions.map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const kelasSelectOptions = $derived([
		{ value: '', label: 'Semua Rombel / Kelas' },
		...data.recapData.kelasOptions.map((k) => ({
			value: String(k.id),
			label: k.name
		}))
	]);

	function updateFilters(newParams: Record<string, string | null>) {
		const params = new URLSearchParams();
		if (selectedTaId) params.set('tahunAjaranId', selectedTaId);
		if (selectedKelasId) params.set('kelasInstanceId', selectedKelasId);
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

	function handleTaChange(val: string | number | null) {
		const taStr = String(val ?? '');
		updateFilters({ tahunAjaranId: taStr, kelasInstanceId: null });
	}

	function handleKelasChange(val: string | number | null) {
		const kelasStr = String(val ?? '');
		updateFilters({ kelasInstanceId: kelasStr });
	}

	function handleSearchSubmit(e: SubmitEvent) {
		e.preventDefault();
		updateFilters({ q: searchInput.trim() });
	}

	function handleTabChange(tab: 'matrix' | 'logs') {
		updateFilters({ tab });
	}

	function exportToCSV() {
		if (data.recapData.students.length === 0) return;

		const headers = ['No', 'Nama Siswa', 'NISN/Username', 'Kelas', ...data.recapData.sessions.map((s) => `Sesi: ${s.title} (${s.sessionDate})`), 'Total Hadir', 'Total Izin/Sakit', 'Total Alpha', 'Persentase Kehadiran'];

		const rows = data.recapData.students.map((st, idx) => {
			const sessionStatuses = data.recapData.sessions.map((sess) => {
				const stStatus = st.sessionsMap[sess.id]?.status;
				if (stStatus === 'hadir') return 'Hadir';
				if (stStatus === 'excused') return 'Izin/Sakit';
				return 'Alpha';
			});

			return [
				idx + 1,
				`"${st.fullName}"`,
				`"${st.username}"`,
				`"${st.kelasName}"`,
				...sessionStatuses,
				st.totalHadir,
				st.totalExcused,
				st.totalAlpha,
				`"${st.attendanceRate}%"`
			];
		});

		const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `Rekap_Presensi_${data.recapData.selectedKelas?.name || 'Semua_Kelas'}_TA${data.recapData.selectedTahunAjaran?.name || ''}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Rekap Presensi Sesi Kelas — Guru Pembimbing | NLC</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HEADER HERO & FILTER BAR
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Rekap Presensi Sesi Kelas</h1>
					{#if data.recapData.selectedTahunAjaran}
						<span class="badge badge-primary">
							TA {data.recapData.selectedTahunAjaran.name}
						</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					Pemantauan matriks keikutsertaan presensi QR & manual siswa per pertemuan sesi kelas.
				</p>
			</div>

			<div class="flex items-center gap-3 flex-wrap">
				<button
					type="button"
					onclick={exportToCSV}
					disabled={data.recapData.students.length === 0}
					class="btn-export-csv"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
					<span>Export CSV Rekap</span>
				</button>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="filter-card mt-5">
			<form onsubmit={handleSearchSubmit} class="filter-controls-grid">
				<div>
					<label for="recap-ta-select" class="filter-label">Tahun Ajaran</label>
					<CustomSelect
						id="recap-ta-select"
						name="tahunAjaranId"
						options={taSelectOptions}
						value={selectedTaId}
						onchange={handleTaChange}
						searchable={false}
					/>
				</div>

				<div>
					<label for="recap-kelas-select" class="filter-label">Filter Rombel / Kelas</label>
					<CustomSelect
						id="recap-kelas-select"
						name="kelasInstanceId"
						options={kelasSelectOptions}
						value={selectedKelasId}
						onchange={handleKelasChange}
						searchable={false}
					/>
				</div>

				<div class="search-input-col">
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
			<div class="stat-icon-box icon-rate">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.recapData.summary.overallAttendanceRate}%</span>
				<span class="stat-label">Rata-rata Kehadiran</span>
				<span class="stat-subtext">Dari {data.recapData.summary.totalStudentsCount} Siswa Terdaftar</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-hadir">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.recapData.summary.totalHadir} Presensi</span>
				<span class="stat-label">Total Kehadiran Siswa</span>
				<span class="stat-subtext">QR: {data.recapData.summary.qrCount} | Manual: {data.recapData.summary.manualCount}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-excused">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.recapData.summary.totalExcused} Izin / Sakit</span>
				<span class="stat-label">Presensi Excused</span>
				<span class="stat-subtext">Mempertahankan Status Progress</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-alpha">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.recapData.summary.totalAlpha} Belum Hadir</span>
				<span class="stat-label">Tanpa Keterangan</span>
				<span class="stat-subtext">Dalam {data.recapData.summary.totalSessionsCount} Sesi Pertemuan</span>
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
				<span>Matriks Presensi Siswa</span>
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
	     TAB CONTENT 1: MATRIKS PRESENSI SISWA
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
						Tidak ditemukan data presensi untuk kelas dan kata kunci pencarian yang dipilih.
					</p>
				</div>
			{:else}
				<div class="table-scroll-container">
					<table class="recap-matrix-table">
						<thead>
							<tr>
								<th class="col-sticky-student">Siswa & Rombel</th>
								{#each data.recapData.sessions as sess}
									<th class="col-session-header" title="{sess.title} — {sess.kelasName} ({sess.sessionDate})">
										<div class="sess-title-text">{sess.title}</div>
										<div class="sess-meta-text">
											<span>{sess.sessionDate}</span>
											<span class="sess-tag">{sess.kelasName}</span>
										</div>
									</th>
								{/each}
								<th class="col-summary-hdr text-center">Hadir</th>
								<th class="col-summary-hdr text-center">Izin</th>
								<th class="col-summary-hdr text-center">Alpha</th>
								<th class="col-summary-hdr text-right">Rata-rata %</th>
							</tr>
						</thead>
						<tbody>
							{#each data.recapData.students as student}
								<tr>
									<td class="col-sticky-student">
										<div class="student-name-box">
											<span class="student-fullname">{student.fullName}</span>
											<div class="student-sub-info">
												<span class="student-nisn">@{student.username}</span>
												<span class="rombel-pill">{student.kelasName}</span>
											</div>
										</div>
									</td>

									{#each data.recapData.sessions as sess}
										{@const statusObj = student.sessionsMap[sess.id]}
										<td class="col-status-cell text-center">
											{#if statusObj?.status === 'hadir'}
												<span
													class="status-pill status-pill--hadir"
													title="Hadir via {statusObj.method?.toUpperCase()} — {statusObj.recordedAt ? new Date(statusObj.recordedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}"
												>
													H
												</span>
											{:else if statusObj?.status === 'excused'}
												<span
													class="status-pill status-pill--excused"
													title="Izin/Sakit: {statusObj.manualReason || 'Tanpa catatan'}"
												>
													I
												</span>
											{:else}
												<span class="status-pill status-pill--alpha" title="Tidak Hadir / Alpha">
													A
												</span>
											{/if}
										</td>
									{/each}

									<td class="col-stat-num text-center text-emerald-700 font-bold">
										{student.totalHadir}
									</td>
									<td class="col-stat-num text-center text-amber-700 font-semibold">
										{student.totalExcused}
									</td>
									<td class="col-stat-num text-center text-slate-400">
										{student.totalAlpha}
									</td>
									<td class="col-rate-cell text-right font-mono">
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

	.btn-export-csv {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #ffffff;
		color: #334155;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.btn-export-csv:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.btn-export-csv:disabled {
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
		grid-template-columns: 220px 220px 1fr;
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

	.recap-matrix-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 680px;
		font-size: 13px;
	}

	.recap-matrix-table th {
		background: #f8fafc;
		color: #475569;
		font-size: 11px;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		text-transform: uppercase;
		padding: 10px 12px;
		border-bottom: 1px solid #e2e8f0;
		white-space: nowrap;
	}

	.col-sticky-student {
		position: sticky;
		left: 0;
		background: #ffffff;
		z-index: 2;
		min-width: 220px;
		text-align: left;
		border-right: 2px solid #e2e8f0;
		padding-left: 16px !important;
	}

	th.col-sticky-student {
		background: #f8fafc;
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

	.col-session-header {
		min-width: 110px;
		text-align: center;
		border-right: 1px solid #f1f5f9;
	}

	.sess-title-text {
		font-size: 12px;
		font-weight: 700;
		color: #0f172a;
		text-transform: none;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sess-meta-text {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		margin-top: 2px;
		font-size: 10px;
		color: #94a3b8;
	}

	.sess-tag {
		background: #f1f5f9;
		color: #475569;
		padding: 0 4px;
		border-radius: 3px;
	}

	.recap-matrix-table td {
		padding: 10px 12px;
		border-bottom: 1px solid #f1f5f9;
		border-right: 1px solid #f8fafc;
	}

	.recap-matrix-table tr:hover td {
		background: #faf5ff;
	}

	.recap-matrix-table tr:hover td.col-sticky-student {
		background: #ffffff;
	}

	.col-status-cell {
		width: 44px;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 800;
		font-family: var(--font-mono, monospace);
		cursor: default;
	}

	.status-pill--hadir {
		background: #dcfce7;
		color: #15803d;
	}

	.status-pill--excused {
		background: #fef3c7;
		color: #b45309;
	}

	.status-pill--alpha {
		background: #f1f5f9;
		color: #94a3b8;
	}

	.col-summary-hdr {
		min-width: 60px;
		background: #f8fafc;
		border-left: 1px solid #e2e8f0;
	}

	.col-stat-num {
		font-family: var(--font-mono, monospace);
		font-size: 13px;
		border-left: 1px solid #f1f5f9;
	}

	.col-rate-cell {
		min-width: 120px;
		border-left: 2px solid #e2e8f0;
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

	/* Data Table for Logs */
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

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.filter-controls-grid {
			grid-template-columns: 1fr;
		}
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

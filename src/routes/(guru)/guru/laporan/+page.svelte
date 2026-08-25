<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedKelasStr = $state(data.selectedKelasId ? String(data.selectedKelasId) : '');

	const kelasSelectOptions = $derived(
		data.kelasOptions.map((k) => ({
			value: String(k.id),
			label: `${k.name} (${k.tahunAjaranName})`
		}))
	);

	function handleKelasChange(val: string | number | null) {
		if (!val) return;
		const strVal = String(val);
		selectedKelasStr = strVal;
		goto(`/guru/laporan?kelasId=${strVal}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`);
	}

	function handleSearchSubmit() {
		goto(`/guru/laporan?kelasId=${selectedKelasStr}&q=${encodeURIComponent(searchQuery)}`);
	}

	function exportToCSV() {
		if (!data.studentReports || data.studentReports.length === 0) return;

		const headers = ['No', 'NISN', 'Nama Lengkap', 'Username', 'Kelas', 'Kehadiran (%)', 'Hadir', 'Izin/Sakit', 'Alfa', 'Total Poin'];
		const rows = data.studentReports.map((s, idx) => [
			idx + 1,
			`"${s.nisn || '-'}"`,
			`"${s.fullName}"`,
			`"${s.username}"`,
			`"${s.kelasName}"`,
			`${s.attendRate}%`,
			s.hadir,
			s.excused,
			s.alfa,
			s.totalPoints
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		const selectedKelasObj = data.kelasOptions.find((k) => String(k.id) === selectedKelasStr);
		const filename = `Rekap_Komunitas_${selectedKelasObj?.name || 'Kelas'}_${new Date().toISOString().slice(0, 10)}.csv`;
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function printReport() {
		window.print();
	}
</script>

<svelte:head>
	<title>Laporan & Rekapitulasi Komunitas — NLC</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     1. HERO TITLE BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-content">
			<div class="hero-title-row">
				<h1 class="page-title">Laporan & Rekapitulasi Komunitas</h1>
				<span class="badge badge-primary">Fase 12.4 Export Suite</span>
			</div>
			<p class="page-subtitle">
				Rekapitulasi matriks kehadiran, keaktifan presensi, dan perolehan poin siswa per kelas untuk kebutuhan rapor pembimbing.
			</p>
		</div>

		<div class="hero-actions">
			<button type="button" onclick={exportToCSV} class="btn btn-secondary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				<span>Export CSV/Excel</span>
			</button>

			<button type="button" onclick={printReport} class="btn btn-primary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="6 9 6 2 18 2 18 9" />
					<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
					<rect x="6" y="14" width="12" height="8" />
				</svg>
				<span>Cetak Rapor / PDF</span>
			</button>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon-wrap icon-indigo">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Siswa Terdaftar</span>
				<span class="stat-value">{data.metrics.totalSiswa} Siswa</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-wrap icon-emerald">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Rata-Rata Kehadiran</span>
				<span class="stat-value">{data.metrics.avgAttendRate}%</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-wrap icon-amber">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Poin Dikumpulkan</span>
				<span class="stat-value">{data.metrics.totalPointsEarned} Poin</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-wrap icon-teal">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Sesi Pertemuan</span>
				<span class="stat-value">{data.totalMeetings} Sesi</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     3. FILTER BAR
	     ══════════════════════════════════════════════════════════ -->
	<FilterBar>
		{#snippet search()}
			<form onsubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }}>
				<TextInput
					name="search"
					placeholder="Cari berdasarkan nama lengkap, username, atau NISN..."
					bind:value={searchQuery}
					clearable={true}
				/>
			</form>
		{/snippet}

		{#snippet filters()}
			<div class="w-full sm:w-64">
				<CustomSelect
					name="kelasId"
					value={selectedKelasStr}
					options={kelasSelectOptions}
					placeholder="Pilih Kelas Rombel"
					onchange={handleKelasChange}
				/>
			</div>
		{/snippet}
	</FilterBar>

	<!-- ══════════════════════════════════════════════════════════
	     4. DATA TABLE REKAPITULASI
	     ══════════════════════════════════════════════════════════ -->
	<div class="table-container">
		{#if data.studentReports.length === 0}
			<div class="empty-state p-8 text-center bg-white border border-slate-200 rounded-xl">
				<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<h3 class="text-sm font-bold text-slate-800">Data Rekapitulasi Tidak Ditemukan</h3>
				<p class="text-xs text-slate-500 mt-1">Belum ada siswa terdaftar pada kelas yang dipilih atau pencarian tidak cocok.</p>
			</div>
		{:else}
			<div class="table-wrapper overflow-x-auto">
				<table class="report-table">
					<thead>
						<tr>
							<th class="w-12 text-center">No</th>
							<th>Identitas Siswa</th>
							<th>NISN</th>
							<th class="text-center">Hadir</th>
							<th class="text-center">Izin/Sakit</th>
							<th class="text-center">Alfa</th>
							<th class="text-center">Tingkat Kehadiran</th>
							<th class="text-right">Total Poin</th>
							<th class="text-center print:hidden">Aksi Detail</th>
						</tr>
					</thead>
					<tbody>
						{#each data.studentReports as student, index}
							<tr>
								<td class="text-center font-mono text-xs text-slate-500">{index + 1}</td>
								<td>
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-full overflow-hidden bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0">
											{#if student.avatarUrl}
												<img src={student.avatarUrl} alt={student.fullName} class="w-full h-full object-cover" referrerpolicy="no-referrer" />
											{:else}
												{student.fullName.charAt(0).toUpperCase()}
											{/if}
										</div>
										<div>
											<div class="font-bold text-sm text-slate-900">{student.fullName}</div>
											<div class="text-xs text-slate-500 font-mono">@{student.username}</div>
										</div>
									</div>
								</td>
								<td class="font-mono text-xs text-slate-700">{student.nisn || '-'}</td>
								<td class="text-center font-bold text-emerald-700">{student.hadir} Sesi</td>
								<td class="text-center font-bold text-amber-600">{student.excused} Sesi</td>
								<td class="text-center font-bold text-rose-600">{student.alfa} Sesi</td>
								<td class="text-center">
									<div class="inline-flex items-center gap-2">
										<div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
											<div class="h-full {student.attendRate >= 85 ? 'bg-emerald-500' : student.attendRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: {student.attendRate}%;"></div>
										</div>
										<span class="font-bold text-xs {student.attendRate >= 85 ? 'text-emerald-700' : student.attendRate >= 75 ? 'text-amber-700' : 'text-rose-700'}">{student.attendRate}%</span>
									</div>
								</td>
								<td class="text-right font-black text-indigo-600">+{student.totalPoints}</td>
								<td class="text-center print:hidden">
									<a href="/guru/siswa/{student.userId}" class="btn-detail-link">
										<span>Rincian</span>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-container {
		padding: 24px 32px 60px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.page-hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.hero-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.page-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.75rem;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.page-subtitle {
		font-size: 13px;
		color: #64748b;
		margin-top: 4px;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		border: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: #ffffff;
		box-shadow: 0 3px 12px rgba(79, 70, 229, 0.3);
	}
	.btn-primary:hover { background: linear-gradient(135deg, #4338ca, #4f46e5); }

	.btn-secondary {
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #334155;
	}
	.btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 640px) {
		.stats-grid { grid-template-columns: 1fr; }
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 18px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.stat-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-indigo { background: #e0e7ff; color: #4338ca; }
	.icon-emerald { background: #dcfce7; color: #15803d; }
	.icon-amber { background: #fef3c7; color: #b45309; }
	.icon-teal { background: #ccfbf1; color: #0f766e; }

	.stat-label { font-size: 11.5px; font-weight: 700; color: #64748b; display: block; }
	.stat-value { font-family: var(--font-macro, system-ui, sans-serif); font-size: 1.4rem; font-weight: 800; color: #0f172a; }

	.table-container {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.report-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		min-width: 780px;
	}

	.report-table th {
		background: #f8fafc;
		padding: 14px 18px;
		font-size: 12px;
		font-weight: 700;
		color: #475569;
		border-bottom: 1px solid #e2e8f0;
	}

	.report-table td {
		padding: 14px 18px;
		border-bottom: 1px solid #f1f5f9;
		font-size: 13px;
	}

	.report-table tr:last-child td { border-bottom: none; }

	.btn-detail-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 6px;
		background: #e0e7ff;
		color: #4338ca;
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
	}
	.btn-detail-link:hover { background: #c7d2fe; }

	@media print {
		.page-container { padding: 0; max-width: 100%; }
		.hero-actions, .print\:hidden { display: none !important; }
		.report-table { min-width: 100%; }
	}
</style>

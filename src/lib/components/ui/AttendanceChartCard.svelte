<script lang="ts">
	interface StudentItem {
		userId: number;
		username: string;
		fullName: string;
		attendanceId?: number | null;
		status: 'hadir' | 'excused' | 'belum_hadir';
		method?: 'qr' | 'manual' | null;
		manualReason?: string | null;
		recordedAt?: string | Date | null;
	}

	let {
		attendanceList = [],
		meetingTitle = 'Sesi Pertemuan',
		kelasName = '',
		showRosterTable = true
	}: {
		attendanceList: StudentItem[];
		meetingTitle?: string;
		kelasName?: string;
		showRosterTable?: boolean;
	} = $props();

	// Derived Counts
	const totalStudents = $derived(attendanceList.length);
	const totalHadir = $derived(attendanceList.filter((s) => s.status === 'hadir').length);
	const totalIzin = $derived(attendanceList.filter((s) => s.status === 'excused').length);
	const totalBelum = $derived(attendanceList.filter((s) => s.status === 'belum_hadir').length);

	const qrCount = $derived(attendanceList.filter((s) => s.status === 'hadir' && s.method === 'qr').length);
	const manualCount = $derived(attendanceList.filter((s) => s.status === 'hadir' && s.method === 'manual').length);

	// Derived Percentages
	const hadirRate = $derived(totalStudents > 0 ? Math.round((totalHadir / totalStudents) * 100) : 0);
	const izinRate = $derived(totalStudents > 0 ? Math.round((totalIzin / totalStudents) * 100) : 0);
	const belumRate = $derived(totalStudents > 0 ? Math.round((totalBelum / totalStudents) * 100) : 0);

	// SVG Donut Chart Calculation
	const R = 38;
	const CIRCUMFERENCE = 2 * Math.PI * R; // ~238.76

	const hadirDash = $derived(totalStudents > 0 ? (totalHadir / totalStudents) * CIRCUMFERENCE : 0);
	const izinDash = $derived(totalStudents > 0 ? (totalIzin / totalStudents) * CIRCUMFERENCE : 0);
	const belumDash = $derived(totalStudents > 0 ? (totalBelum / totalStudents) * CIRCUMFERENCE : 0);

	const izinOffset = $derived(-hadirDash);
	const belumOffset = $derived(-(hadirDash + izinDash));

	// Filter & Search state for student roster
	let activeFilter = $state<'all' | 'hadir' | 'excused' | 'belum_hadir'>('all');
	let searchQuery = $state('');

	const filteredStudents = $derived.by(() => {
		return attendanceList.filter((s) => {
			if (activeFilter !== 'all' && s.status !== activeFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.trim().toLowerCase();
				const matchName = s.fullName.toLowerCase().includes(q);
				const matchUser = s.username.toLowerCase().includes(q);
				if (!matchName && !matchUser) return false;
			}
			return true;
		});
	});

	function formatTime(val: string | Date | null | undefined): string {
		if (!val) return '-';
		const d = new Date(val);
		if (isNaN(d.getTime())) return String(val);
		return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
	}
</script>

<div class="attendance-chart-card">
	<!-- Card Header -->
	<div class="card-header-row">
		<div>
			<div class="flex items-center gap-2 flex-wrap">
				<h3 class="card-title">Grafik Statistik Kehadiran Sesi</h3>
				{#if kelasName}
					<span class="kelas-badge-pill">{kelasName}</span>
				{/if}
			</div>
			<p class="card-subtitle">Distribusi presensi siswa real-time untuk <span class="text-slate-800 font-semibold">{meetingTitle}</span></p>
		</div>

		<div class="header-stat-tag">
			<span class="tag-val text-emerald-600">{hadirRate}%</span>
			<span class="tag-lbl">Tingkat Kehadiran</span>
		</div>
	</div>

	<!-- Chart & Breakdown Main Grid -->
	<div class="chart-content-grid">
		<!-- Left: Donut Chart Visual -->
		<div class="donut-chart-box">
			<div class="svg-container">
				<svg viewBox="0 0 100 100" class="donut-svg">
					<!-- Base background circle -->
					<circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" stroke-width="9" />

					{#if totalStudents > 0}
						<!-- Segment: Belum Absen -->
						{#if totalBelum > 0}
							<circle
								cx="50"
								cy="50"
								r={R}
								fill="none"
								stroke="#cbd5e1"
								stroke-width="9"
								stroke-dasharray="{belumDash} {CIRCUMFERENCE - belumDash}"
								stroke-dashoffset={belumOffset}
								class="chart-segment transition-all duration-500"
							/>
						{/if}

						<!-- Segment: Izin/Sakit -->
						{#if totalIzin > 0}
							<circle
								cx="50"
								cy="50"
								r={R}
								fill="none"
								stroke="#f59e0b"
								stroke-width="9"
								stroke-dasharray="{izinDash} {CIRCUMFERENCE - izinDash}"
								stroke-dashoffset={izinOffset}
								class="chart-segment transition-all duration-500"
							/>
						{/if}

						<!-- Segment: Hadir -->
						{#if totalHadir > 0}
							<circle
								cx="50"
								cy="50"
								r={R}
								fill="none"
								stroke="#10b981"
								stroke-width="9"
								stroke-dasharray="{hadirDash} {CIRCUMFERENCE - hadirDash}"
								stroke-dashoffset={0}
								class="chart-segment transition-all duration-500"
							/>
						{/if}
					{/if}
				</svg>

				<!-- Center Label -->
				<div class="donut-center-label">
					<span class="donut-rate-num">{hadirRate}%</span>
					<span class="donut-rate-lbl">Hadir ({totalHadir}/{totalStudents})</span>
				</div>
			</div>
		</div>

		<!-- Right: Category Progress Bars Breakdown -->
		<div class="breakdown-list-box">
			<!-- Hadir Category -->
			<div class="breakdown-item">
				<div class="item-header">
					<div class="flex items-center gap-2">
						<span class="legend-dot bg-emerald-500"></span>
						<span class="item-name font-bold text-slate-800">Hadir</span>
						<span class="item-sub text-slate-500 text-xs">({qrCount} QR • {manualCount} Manual)</span>
					</div>
					<div class="item-stats">
						<span class="font-mono font-bold text-emerald-700">{totalHadir} Siswa</span>
						<span class="text-xs text-slate-400 font-mono ml-1">({hadirRate}%)</span>
					</div>
				</div>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill bg-emerald-500" style="width: {hadirRate}%"></div>
				</div>
			</div>

			<!-- Izin/Sakit Category -->
			<div class="breakdown-item">
				<div class="item-header">
					<div class="flex items-center gap-2">
						<span class="legend-dot bg-amber-500"></span>
						<span class="item-name font-bold text-slate-800">Izin / Sakit</span>
						<span class="item-sub text-slate-500 text-xs">(Dengan Alasan)</span>
					</div>
					<div class="item-stats">
						<span class="font-mono font-bold text-amber-700">{totalIzin} Siswa</span>
						<span class="text-xs text-slate-400 font-mono ml-1">({izinRate}%)</span>
					</div>
				</div>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill bg-amber-500" style="width: {izinRate}%"></div>
				</div>
			</div>

			<!-- Belum Absen Category -->
			<div class="breakdown-item">
				<div class="item-header">
					<div class="flex items-center gap-2">
						<span class="legend-dot bg-slate-400"></span>
						<span class="item-name font-bold text-slate-800">Belum Presensi</span>
						<span class="item-sub text-slate-500 text-xs">(Belum Tercatat)</span>
					</div>
					<div class="item-stats">
						<span class="font-mono font-bold text-slate-600">{totalBelum} Siswa</span>
						<span class="text-xs text-slate-400 font-mono ml-1">({belumRate}%)</span>
					</div>
				</div>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill bg-slate-400" style="width: {belumRate}%"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Optional Detailed Roster Table Section -->
	{#if showRosterTable}
		<div class="roster-section mt-6 pt-5 border-t border-slate-200">
			<div class="roster-header-row mb-4">
				<div class="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						class="filter-pill"
						class:active={activeFilter === 'all'}
						onclick={() => (activeFilter = 'all')}
					>
						Semua ({totalStudents})
					</button>
					<button
						type="button"
						class="filter-pill filter-pill--hadir"
						class:active={activeFilter === 'hadir'}
						onclick={() => (activeFilter = 'hadir')}
					>
						Hadir ({totalHadir})
					</button>
					<button
						type="button"
						class="filter-pill filter-pill--izin"
						class:active={activeFilter === 'excused'}
						onclick={() => (activeFilter = 'excused')}
					>
						Izin/Sakit ({totalIzin})
					</button>
					<button
						type="button"
						class="filter-pill filter-pill--belum"
						class:active={activeFilter === 'belum_hadir'}
						onclick={() => (activeFilter = 'belum_hadir')}
					>
						Belum Absen ({totalBelum})
					</button>
				</div>

				<div class="search-box">
					<input
						type="text"
						placeholder="Cari nama siswa…"
						bind:value={searchQuery}
						class="search-input"
					/>
				</div>
			</div>

			{#if filteredStudents.length === 0}
				<div class="empty-roster py-8 text-center text-xs text-slate-500">
					Tidak ada data siswa yang cocok dengan filter.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="roster-table">
						<thead>
							<tr>
								<th style="width: 44px;">#</th>
								<th>Nama Siswa</th>
								<th>Status Presensi</th>
								<th>Metode</th>
								<th style="text-align: right;">Waktu Presensi</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStudents as st, idx (st.userId)}
								<tr>
									<td class="font-mono text-xs text-slate-400">{idx + 1}</td>
									<td>
										<div class="flex flex-col">
											<span class="font-bold text-slate-900 text-xs">{st.fullName}</span>
											<span class="text-[11px] text-slate-500 font-mono">@{st.username}</span>
										</div>
									</td>
									<td>
										{#if st.status === 'hadir'}
											<span class="badge-pill badge-pill--hadir">HADIR</span>
										{:else if st.status === 'excused'}
											<span class="badge-pill badge-pill--izin" title={st.manualReason || 'Izin/Sakit'}>
												IZIN / SAKIT
											</span>
										{:else}
											<span class="badge-pill badge-pill--belum">BELUM ABSEN</span>
										{/if}
									</td>
									<td>
										{#if st.method === 'qr'}
											<span class="method-tag method-tag--qr">QR Code</span>
										{:else if st.method === 'manual'}
											<span class="method-tag method-tag--manual" title={st.manualReason || ''}>Manual</span>
										{:else}
											<span class="text-xs text-slate-400">-</span>
										{/if}
									</td>
									<td style="text-align: right;" class="font-mono text-xs text-slate-600">
										{formatTime(st.recordedAt)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.attendance-chart-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 20px 24px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		width: 100%;
	}

	.card-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.kelas-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 8px;
		background: #eef2ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
	}

	.card-subtitle {
		font-size: 12.5px;
		color: #64748b;
		margin-top: 2px;
	}

	.header-stat-tag {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		padding: 6px 14px;
		border-radius: 10px;
	}

	.tag-val {
		font-family: var(--font-mono, monospace);
		font-size: 20px;
		font-weight: 800;
		line-height: 1;
	}

	.tag-lbl {
		font-size: 10.5px;
		font-weight: 600;
		color: #047857;
		margin-top: 2px;
	}

	.chart-content-grid {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 28px;
		align-items: center;
	}

	@media (max-width: 640px) {
		.chart-content-grid {
			grid-template-columns: 1fr;
			gap: 20px;
		}
	}

	.donut-chart-box {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.svg-container {
		position: relative;
		width: 170px;
		height: 170px;
	}

	.donut-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.chart-segment {
		stroke-linecap: round;
	}

	.donut-center-label {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.donut-rate-num {
		font-family: var(--font-mono, monospace);
		font-size: 26px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1;
	}

	.donut-rate-lbl {
		font-size: 10.5px;
		font-weight: 600;
		color: #64748b;
		margin-top: 4px;
		text-align: center;
	}

	.breakdown-list-box {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.breakdown-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}

	.progress-bar-bg {
		width: 100%;
		height: 8px;
		background: #f1f5f9;
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Roster Table Styles */
	.roster-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.filter-pill {
		padding: 4px 12px;
		border-radius: 8px;
		font-size: 11.5px;
		font-weight: 600;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.filter-pill:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.filter-pill.active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.filter-pill--hadir.active { background: #10b981; border-color: #10b981; }
	.filter-pill--izin.active { background: #f59e0b; border-color: #f59e0b; }
	.filter-pill--belum.active { background: #64748b; border-color: #64748b; }

	.search-input {
		padding: 5px 12px;
		border-radius: 8px;
		border: 1px solid #cbd5e1;
		font-size: 12px;
		outline: none;
		transition: border-color 150ms ease;
		width: 180px;
	}

	.search-input:focus {
		border-color: #6366f1;
	}

	.table-responsive {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.roster-table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 8px;
	}

	.roster-table th {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		color: #64748b;
		padding: 8px 10px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.roster-table td {
		padding: 10px;
		border-bottom: 1px solid #f1f5f9;
		font-size: 12.5px;
	}

	.badge-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 8px;
		border-radius: 4px;
		font-family: var(--font-macro, sans-serif);
		font-size: 10px;
		font-weight: 700;
	}

	.badge-pill--hadir { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
	.badge-pill--izin { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
	.badge-pill--belum { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

	.method-tag {
		display: inline-flex;
		align-items: center;
		height: 18px;
		padding: 0 6px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
	}

	.method-tag--qr { background: #e0e7ff; color: #4338ca; }
	.method-tag--manual { background: #f3e8ff; color: #7e22ce; }
</style>

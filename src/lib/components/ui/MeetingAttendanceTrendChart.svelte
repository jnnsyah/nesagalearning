<script lang="ts">
	import { tick } from 'svelte';
	import CustomSelect from './CustomSelect.svelte';
	import DatePicker from './DatePicker.svelte';

	interface SessionTrendItem {
		id: number;
		title: string;
		sessionDate: string;
		startTime: string;
		endTime: string;
		activityType: string;
		kelasId: number;
		kelasName: string;
		totalEnrolled: number;
		totalHadir: number;
		totalIzin: number;
		attendanceRate: number;
	}

	interface MentorClassOption {
		id: number;
		name: string;
	}

	let {
		sessions = [],
		mentorClasses = [],
		title = 'Grafik Statistik Kehadiran Sesi Pertemuan'
	}: {
		sessions: SessionTrendItem[];
		mentorClasses: MentorClassOption[];
		title?: string;
	} = $props();

	// Scroll container reference & auto-scroll effect
	let scrollContainer = $state<HTMLDivElement | null>(null);

	// Filter state
	let selectedRange = $state<'7_days' | '30_days' | 'this_month' | 'all' | 'custom'>('30_days');
	let selectedKelasId = $state<string>('');
	let customStartDate = $state<string>('');
	let customEndDate = $state<string>('');

	let activeHoverIndex = $state<number | null>(null);

	// Auto-scroll to the latest (rightmost) session bar whenever sessions or filters change
	$effect(() => {
		if (scrollContainer && filteredSessions.length > 0) {
			tick().then(() => {
				if (scrollContainer) {
					scrollContainer.scrollLeft = scrollContainer.scrollWidth;
				}
			});
		}
	});

	// Date Range Calculation Helpers
	function getTodayIso(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function getDaysAgoIso(days: number): string {
		const d = new Date();
		d.setDate(d.getDate() - days);
		return d.toISOString().slice(0, 10);
	}

	function getStartOfMonthIso(): string {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		return `${y}-${m}-01`;
	}

	// Filtered Sessions Derived State
	const filteredSessions = $derived.by(() => {
		let minDate = '';
		let maxDate = '';

		if (selectedRange === '7_days') {
			minDate = getDaysAgoIso(7);
		} else if (selectedRange === '30_days') {
			minDate = getDaysAgoIso(30);
		} else if (selectedRange === 'this_month') {
			minDate = getStartOfMonthIso();
		} else if (selectedRange === 'custom') {
			minDate = customStartDate;
			maxDate = customEndDate;
		}

		return sessions.filter((s) => {
			if (selectedKelasId && String(s.kelasId) !== String(selectedKelasId)) return false;
			if (minDate && s.sessionDate < minDate) return false;
			if (maxDate && s.sessionDate > maxDate) return false;
			return true;
		});
	});

	// Derived Overview Metrics
	const totalSessions = $derived(filteredSessions.length);
	const avgAttendanceRate = $derived(
		totalSessions > 0
			? Math.round(filteredSessions.reduce((acc, s) => acc + s.attendanceRate, 0) / totalSessions)
			: 0
	);
	const totalHadirSum = $derived(filteredSessions.reduce((acc, s) => acc + s.totalHadir, 0));
	const totalEnrolledSum = $derived(filteredSessions.reduce((acc, s) => acc + s.totalEnrolled, 0));

	const highestSession = $derived.by(() => {
		if (totalSessions === 0) return null;
		return [...filteredSessions].sort((a, b) => b.attendanceRate - a.attendanceRate)[0] || null;
	});

	const lowestSession = $derived.by(() => {
		if (totalSessions === 0) return null;
		return [...filteredSessions].sort((a, b) => a.attendanceRate - b.attendanceRate)[0] || null;
	});

	const kelasOptions = $derived([
		{ value: '', label: 'Semua Kelompok Belajar' },
		...mentorClasses.map((c) => ({ value: String(c.id), label: c.name }))
	]);

	const rangeOptions = [
		{ value: '30_days', label: '30 Hari Terakhir' },
		{ value: '7_days', label: '7 Hari Terakhir' },
		{ value: 'this_month', label: 'Bulan Ini' },
		{ value: 'all', label: 'Semua Pertemuan' },
		{ value: 'custom', label: 'Rentang Tanggal Custom' }
	];

	function formatIndoDate(dateStr: string): string {
		if (!dateStr) return '-';
		const [y, m, d] = dateStr.split('-').map(Number);
		if (!y || !m || !d) return dateStr;
		const bulanIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
		return `${d} ${bulanIndo[m - 1]}`;
	}
</script>

<div class="trend-chart-card">
	<!-- Header & Filter Bar -->
	<div class="card-header-row">
		<div>
			<div class="flex items-center gap-2 flex-wrap">
				<h3 class="card-title">{title}</h3>
				<span class="count-badge">{totalSessions} Sesi Terfilter</span>
			</div>
			<p class="card-subtitle">Tren perbandingan tingkat kehadiran siswa antar sesi pertemuan kelas.</p>
		</div>

		<!-- Filter Controls -->
		<div class="filter-controls-row">
			<div class="w-48">
				<CustomSelect
					id="trend-range-select"
					name="range"
					bind:value={selectedRange}
					options={rangeOptions}
					searchable={false}
				/>
			</div>

			<div class="w-52">
				<CustomSelect
					id="trend-kelas-select"
					name="kelasId"
					bind:value={selectedKelasId}
					options={kelasOptions}
					searchable={false}
				/>
			</div>
		</div>
	</div>

	<!-- Custom Date Picker Fields (if custom range selected) -->
	{#if selectedRange === 'custom'}
		<div class="custom-date-row mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 flex-wrap">
			<div class="w-44">
				<DatePicker
					id="trend-start-date"
					name="startDate"
					label="Tanggal Mulai"
					bind:value={customStartDate}
				/>
			</div>
			<div class="w-44">
				<DatePicker
					id="trend-end-date"
					name="endDate"
					label="Tanggal Selesai"
					bind:value={customEndDate}
				/>
			</div>
		</div>
	{/if}

	<!-- Overview Quick Stats Summary Strip -->
	<div class="stats-summary-strip mb-5">
		<div class="summary-pill bg-indigo-50 border-indigo-100">
			<span class="summary-val text-indigo-700 font-mono">{avgAttendanceRate}%</span>
			<span class="summary-lbl text-indigo-900">Rata-Rata Kehadiran</span>
		</div>

		<div class="summary-pill bg-emerald-50 border-emerald-100">
			<span class="summary-val text-emerald-700 font-mono">
				{totalHadirSum}/{totalEnrolledSum}
			</span>
			<span class="summary-lbl text-emerald-900">Total Siswa Hadir</span>
		</div>

		{#if highestSession}
			<div class="summary-pill bg-teal-50 border-teal-100 hide-mobile">
				<span class="summary-val text-teal-700 font-mono">{highestSession.attendanceRate}%</span>
				<span class="summary-lbl text-teal-900">Kehadiran Tertinggi ({highestSession.kelasName})</span>
			</div>
		{/if}

		{#if lowestSession}
			<div class="summary-pill bg-amber-50 border-amber-100 hide-mobile">
				<span class="summary-val text-amber-700 font-mono">{lowestSession.attendanceRate}%</span>
				<span class="summary-lbl text-amber-900">Kehadiran Terendah ({lowestSession.kelasName})</span>
			</div>
		{/if}
	</div>

	<!-- Interactive Visual Bar Trend Chart -->
	{#if totalSessions === 0}
		<div class="empty-chart-box py-12 text-center text-slate-500">
			<svg class="mx-auto text-slate-400 mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<line x1="18" y1="20" x2="18" y2="10" />
				<line x1="12" y1="20" x2="12" y2="4" />
				<line x1="6" y1="20" x2="6" y2="14" />
			</svg>
			<p class="text-sm font-bold text-slate-700">Belum Ada Data Sesi Pertemuan</p>
			<p class="text-xs text-slate-400 mt-1">Tidak ditemukan sesi pertemuan pada rentang tanggal &amp; filter yang dipilih.</p>
		</div>
	{:else}
		<div class="visual-chart-container">
			<div class="chart-y-axis">
				<span>100%</span>
				<span>75%</span>
				<span>50%</span>
				<span>25%</span>
				<span>0%</span>
			</div>

			<div class="chart-bars-scroll" bind:this={scrollContainer}>
				<div class="chart-bars-track">
					<!-- Horizontal Guide Lines -->
					<div class="guide-line" style="bottom: 48px; top: 0;"></div>
					<div class="guide-line" style="bottom: calc(48px + 25% * (100% - 48px) / 100);"></div>
					<div class="guide-line" style="bottom: calc(48px + 50% * (100% - 48px) / 100);"></div>
					<div class="guide-line" style="bottom: calc(48px + 75% * (100% - 48px) / 100);"></div>

					<!-- Session Bars -->
					{#each filteredSessions as sess, idx (sess.id)}
						{@const isHovered = activeHoverIndex === idx}
						<div
							class="bar-column-group"
							onmouseenter={() => (activeHoverIndex = idx)}
							onmouseleave={() => (activeHoverIndex = null)}
						>
							<!-- Tooltip Popover -->
							{#if isHovered}
								<div class="bar-tooltip-popover">
									<span class="tooltip-title">{sess.title}</span>
									<span class="tooltip-sub">{sess.kelasName} • {formatIndoDate(sess.sessionDate)}</span>
									<div class="tooltip-metrics">
										<span class="font-bold text-emerald-400">{sess.totalHadir}/{sess.totalEnrolled} Hadir</span>
										<span class="font-mono font-extrabold">{sess.attendanceRate}%</span>
									</div>
								</div>
							{/if}

							<!-- Bar Column Shape -->
							<div class="bar-track">
								<div
									class="bar-fill"
									class:bar-fill--high={sess.attendanceRate >= 80}
									class:bar-fill--mid={sess.attendanceRate >= 60 && sess.attendanceRate < 80}
									class:bar-fill--low={sess.attendanceRate < 60}
									style="height: {Math.max(6, sess.attendanceRate)}%;"
								>
									<span class="bar-rate-label">{sess.attendanceRate}%</span>
								</div>
							</div>

							<!-- X-Axis Date & Class Label -->
							<div class="bar-x-label">
								<span class="x-date-text">{formatIndoDate(sess.sessionDate)}</span>
								<span class="x-class-text">{sess.kelasName}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.trend-chart-card {
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
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16.5px;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.count-badge {
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

	.filter-controls-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.stats-summary-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	@media (max-width: 900px) {
		.stats-summary-strip {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.summary-pill {
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid transparent;
		display: flex;
		flex-direction: column;
	}

	.summary-val {
		font-size: 18px;
		font-weight: 800;
		line-height: 1.1;
	}

	.summary-lbl {
		font-size: 11px;
		font-weight: 600;
		margin-top: 2px;
	}

	/* Visual Chart Container */
	.visual-chart-container {
		display: flex;
		align-items: stretch;
		gap: 12px;
		height: 260px;
		margin-top: 10px;
		position: relative;
	}

	.chart-y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		color: #94a3b8;
		padding-bottom: 48px;
		text-align: right;
		width: 34px;
		flex-shrink: 0;
	}

	.chart-bars-scroll {
		flex: 1;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 4px;
	}

	.chart-bars-track {
		display: flex;
		align-items: stretch;
		gap: 16px;
		height: 100%;
		min-width: max-content;
		position: relative;
		box-sizing: border-box;
	}

	.bar-column-group {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 68px;
		height: 100%;
		cursor: pointer;
	}

	.bar-track {
		width: 28px;
		flex: 1;
		background: #f1f5f9;
		border-radius: 6px 6px 0 0;
		display: flex;
		align-items: flex-end;
		overflow: hidden;
		position: relative;
	}

	.bar-fill {
		width: 100%;
		border-radius: 6px 6px 0 0;
		position: relative;
		transition: height 500ms cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		justify-content: center;
	}

	.bar-fill--high { background: linear-gradient(180deg, #10b981 0%, #059669 100%); }
	.bar-fill--mid { background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); }
	.bar-fill--low { background: linear-gradient(180deg, #f43f5e 0%, #e11d48 100%); }

	.bar-rate-label {
		position: absolute;
		top: -18px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #334155;
	}

	/* X-Axis Labels */
	.bar-x-label {
		height: 42px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		text-align: center;
		margin-top: 6px;
		box-sizing: border-box;
	}

	.x-date-text {
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
		white-space: nowrap;
	}

	.x-class-text {
		font-size: 10px;
		color: #64748b;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* Tooltip Popover */
	.bar-tooltip-popover {
		position: absolute;
		bottom: calc(100% - 10px);
		left: 50%;
		transform: translateX(-50%);
		background: #0f172a;
		color: #ffffff;
		padding: 8px 12px;
		border-radius: 8px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
		z-index: 50;
		white-space: nowrap;
		display: flex;
		flex-direction: column;
		gap: 2px;
		pointer-events: none;
	}

	.tooltip-title {
		font-weight: 700;
		font-size: 12px;
	}

	.tooltip-sub {
		font-size: 10.5px;
		color: #94a3b8;
	}

	.tooltip-metrics {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 4px;
		font-size: 11px;
		border-top: 1px solid #334155;
		padding-top: 4px;
	}
</style>

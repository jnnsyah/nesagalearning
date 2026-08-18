<script lang="ts">
	import type { PageData } from './$types';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// View Modes: 'calendar' | 'timeline'
	let viewMode = $state<'calendar' | 'timeline'>('calendar');

	// Filters
	let searchQuery = $state('');
	let selectedKelas = $state('all');
	let selectedStatus = $state('all'); // 'all' | 'live' | 'upcoming' | 'completed'
	let selectedActivity = $state('all');

	// Calendar State (Current Displayed Month & Year)
	let today = new Date();
	let currentYear = $state(today.getFullYear());
	let currentMonth = $state(today.getMonth()); // 0-indexed (0 = Jan, 11 = Dec)

	// Selected Day Modal / Popover Detail
	let selectedMeetingDetail = $state<any | null>(null);
	let showDetailModal = $state(false);

	// Pagination State for Timeline View
	let currentPage = $state(1);
	let itemsPerPage = $state<number>(10);
	const pageSizeOptions = [
		{ value: 5, label: '5 data / hal' },
		{ value: 10, label: '10 data / hal' },
		{ value: 25, label: '25 data / hal' },
		{ value: 50, label: '50 data / hal' }
	];

	const monthNamesIndo = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];

	const dayNamesIndo = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'];

	// Helper to format ISO Date string YYYY-MM-DD
	function getTodayIso(): string {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const d = String(now.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	const todayIsoStr = getTodayIso();

	// Meeting Status Resolver
	function getMeetingStatus(meeting: any): 'live' | 'upcoming' | 'completed' {
		if (!meeting.sessionDate) return 'completed';

		const mDate = meeting.sessionDate;
		if (mDate < todayIsoStr) return 'completed';
		if (mDate > todayIsoStr) return 'upcoming';

		// If mDate === todayIsoStr, check time window
		const now = new Date();
		const currentMinutes = now.getHours() * 60 + now.getMinutes();

		const parseMin = (tStr: string) => {
			if (!tStr) return 0;
			const [h, m] = tStr.split(':').map(Number);
			return (h || 0) * 60 + (m || 0);
		};

		const startMin = parseMin(meeting.startTime);
		const endMin = parseMin(meeting.endTime);

		// Consider live if within start-end window OR same day
		if (currentMinutes >= startMin - 15 && currentMinutes <= endMin + 30) {
			return 'live';
		} else if (currentMinutes < startMin - 15) {
			return 'upcoming';
		} else {
			return 'completed';
		}
	}

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '-';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

	function formatIndoDate(dateVal: string | null | undefined): string {
		if (!dateVal) return '-';
		const parts = String(dateVal).split('-');
		if (parts.length === 3) {
			const y = Number(parts[0]);
			const m = Number(parts[1]) - 1;
			const d = Number(parts[2]);
			return `${d} ${monthNamesIndo[m]} ${y}`;
		}
		return String(dateVal);
	}

	// Filtered Meetings Computation
	let filteredMeetings = $derived.by(() => {
		return (data.meetings || []).filter((m) => {
			const matchKelas = selectedKelas === 'all' || String(m.kelasInstanceId) === String(selectedKelas);
			const matchActivity = selectedActivity === 'all' || m.activityType === selectedActivity;
			const matchSearch = searchQuery.trim() === '' ||
				m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(m.kelasName && m.kelasName.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));

			const status = getMeetingStatus(m);
			const matchStatus = selectedStatus === 'all' || status === selectedStatus;

			return matchKelas && matchActivity && matchSearch && matchStatus;
		});
	});

	// Reset Page on Filter Change
	$effect(() => {
		searchQuery;
		selectedKelas;
		selectedStatus;
		selectedActivity;
		untrack(() => {
			currentPage = 1;
		});
	});

	// Metrics Derived
	let totalCount = $derived(filteredMeetings.length);
	let liveCount = $derived(filteredMeetings.filter((m) => getMeetingStatus(m) === 'live').length);
	let upcomingCount = $derived(filteredMeetings.filter((m) => getMeetingStatus(m) === 'upcoming').length);
	let completedCount = $derived(filteredMeetings.filter((m) => getMeetingStatus(m) === 'completed').length);

	// Filter Active Check & Reset
	let isFilterActive = $derived(
		selectedKelas !== 'all' ||
		selectedStatus !== 'all' ||
		selectedActivity !== 'all' ||
		searchQuery.trim() !== ''
	);

	function resetFilters() {
		selectedKelas = 'all';
		selectedStatus = 'all';
		selectedActivity = 'all';
		searchQuery = '';
		currentPage = 1;
	}

	// Calendar Navigation
	function prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
	}

	function goToToday() {
		const n = new Date();
		currentYear = n.getFullYear();
		currentMonth = n.getMonth();
	}

	// Calendar Grid Calculation
	interface CalendarDay {
		dayNum: number;
		isoDate: string;
		isCurrentMonth: boolean;
		isToday: boolean;
		meetings: any[];
	}

	let calendarGrid = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

		// Get day of week for 1st day (0 = Sun, 1 = Mon, ..., 6 = Sat).
		// We want Monday = 0, ..., Sunday = 6.
		let startDay = firstDayOfMonth.getDay() - 1;
		if (startDay < 0) startDay = 6;

		const daysInMonth = lastDayOfMonth.getDate();

		const grid: CalendarDay[] = [];

		// Prev month padding
		const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
		for (let i = startDay - 1; i >= 0; i--) {
			const dNum = prevMonthLastDay - i;
			const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
			const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
			const iso = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
			grid.push({
				dayNum: dNum,
				isoDate: iso,
				isCurrentMonth: false,
				isToday: iso === todayIsoStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === iso)
			});
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			grid.push({
				dayNum: d,
				isoDate: iso,
				isCurrentMonth: true,
				isToday: iso === todayIsoStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === iso)
			});
		}

		// Next month padding to complete 35 or 42 cells grid
		const totalCells = grid.length > 35 ? 42 : 35;
		const nextMonthPadding = totalCells - grid.length;
		for (let n = 1; n <= nextMonthPadding; n++) {
			const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
			const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
			const iso = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
			grid.push({
				dayNum: n,
				isoDate: iso,
				isCurrentMonth: false,
				isToday: iso === todayIsoStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === iso)
			});
		}

		return grid;
	});

	// Timeline View Pagination
	let totalPages = $derived(Math.ceil(filteredMeetings.length / itemsPerPage) || 1);
	let paginatedMeetings = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredMeetings.slice(start, start + itemsPerPage);
	});

	function openMeetingDetail(m: any) {
		selectedMeetingDetail = m;
		showDetailModal = true;
	}

	function closeDetailModal() {
		showDetailModal = false;
		selectedMeetingDetail = null;
	}
</script>

<svelte:head>
	<title>Kalender Jadwal Pertemuan Kelas — Portal Mentor NLC</title>
</svelte:head>

<ToastContainer />

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero mb-8">
		<div class="hero-top-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Kalender & Timeline Jadwal Pertemuan</h1>
					<span class="badge badge-primary">MENTOR CALENDAR</span>
				</div>
				<p class="hero-subtitle">
					Visualisasikan jadwal sesi kelas komunitas, pantau status pertemuan secara real-time, dan akses materi serta lembar presensi.
				</p>
			</div>

			<div class="hero-actions">
				<a href="/mentor/pertemuan" class="btn-create">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>Kelola Pertemuan</span>
				</a>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     METRICS GRID
	     ══════════════════════════════════════════════════════════ -->
	<div class="stats-grid mb-8">
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Sesi Terjadwal</div>
				<div class="stat-value">{totalCount}</div>
				<div class="stat-meta">Pertemuan Kelas</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polygon points="10 8 16 12 10 16 10 8" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Live Hari Ini</div>
				<div class="stat-value" style="color: #16a34a;">{liveCount}</div>
				<div class="stat-meta">Sesi Berlangsung</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Akan Datang</div>
				<div class="stat-value" style="color: #4338ca;">{upcomingCount}</div>
				<div class="stat-meta">Mendatang</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #f1f5f9; color: #64748b;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Selesai / Terlewat</div>
				<div class="stat-value" style="color: #64748b;">{completedCount}</div>
				<div class="stat-meta">Riwayat Pertemuan</div>
			</div>
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     FILTER CARD (2-ROW STANDARD)
	     ══════════════════════════════════════════════════════════ -->
	<div class="page-filter-card mb-8">
		<!-- Row 1: Search Bar & Conditional Reset -->
		<div class="filter-row-top">
			<div class="flex-1">
				<TextInput
					id="search-jadwal-input"
					label="Cari Jadwal Pertemuan"
					placeholder="Ketik kata kunci judul, nama kelas, atau lokasi..."
					bind:value={searchQuery}
				/>
			</div>

			{#if isFilterActive}
				<div class="flex-shrink-0">
					<button
						type="button"
						class="btn-reset-filters-active"
						onclick={resetFilters}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						<span>Reset Filter</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Row 2: Controls Grid -->
		<div class="filter-row-bottom">
			<div>
				<CustomSelect
					id="kelas-filter"
					label="Filter Kelas Rombel"
					bind:value={selectedKelas}
					options={[
						{ value: 'all', label: 'Semua Kelas Instance' },
						...data.kelases.map((k) => ({ value: String(k.id), label: k.name }))
					]}
					searchable={false}
				/>
			</div>

			<div>
				<CustomSelect
					id="status-filter"
					label="Filter Status"
					bind:value={selectedStatus}
					options={[
						{ value: 'all', label: 'Semua Status' },
						{ value: 'live', label: 'Live Hari Ini' },
						{ value: 'upcoming', label: 'Akan Datang' },
						{ value: 'completed', label: 'Selesai / Terlewat' }
					]}
					searchable={false}
				/>
			</div>

			<div>
				<CustomSelect
					id="activity-filter"
					label="Tipe Aktivitas"
					bind:value={selectedActivity}
					options={[
						{ value: 'all', label: 'Semua Tipe Aktivitas' },
						{ value: 'teori', label: 'Teori' },
						{ value: 'praktik', label: 'Praktik' },
						{ value: 'teori_praktik', label: 'Teori & Praktik' },
						{ value: 'games', label: 'Games' },
						{ value: 'quiz', label: 'Quiz' }
					]}
					searchable={false}
				/>
			</div>

			<div>
				<label for="view-mode-toggle" class="filter-label">Mode Tampilan</label>
				<div class="view-mode-toggle-group">
					<button
						type="button"
						class="btn-toggle-mode {viewMode === 'calendar' ? 'active' : ''}"
						onclick={() => (viewMode = 'calendar')}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						<span>Kalender</span>
					</button>

					<button
						type="button"
						class="btn-toggle-mode {viewMode === 'timeline' ? 'active' : ''}"
						onclick={() => (viewMode = 'timeline')}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
						<span>Timeline List</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     VIEW MODE 1: CALENDAR VIEW
	     ══════════════════════════════════════════════════════════ -->
	{#if viewMode === 'calendar'}
		<div class="calendar-card mb-8">
			<!-- Calendar Header Navigation -->
			<div class="calendar-header">
				<div class="flex items-center gap-3">
					<h2 class="calendar-month-title">
						{monthNamesIndo[currentMonth]} {currentYear}
					</h2>
					<button type="button" class="btn-today-shortcut" onclick={goToToday}>
						Hari Ini
					</button>
				</div>

				<div class="calendar-nav-buttons">
					<button type="button" class="btn-cal-nav" onclick={prevMonth} title="Bulan Sebelumnya">
						&larr; Prev
					</button>
					<button type="button" class="btn-cal-nav" onclick={nextMonth} title="Bulan Selanjutnya">
						Next &rarr;
					</button>
				</div>
			</div>

			<!-- Days of Week Header -->
			<div class="calendar-days-header">
				{#each dayNamesIndo as dayName}
					<div class="cal-day-name">{dayName}</div>
				{/each}
			</div>

			<!-- Calendar Grid -->
			<div class="calendar-grid">
				{#each calendarGrid as cell}
					<div
						class="cal-cell {cell.isCurrentMonth ? '' : 'cal-cell--other'} {cell.isToday ? 'cal-cell--today' : ''}"
					>
						<div class="cal-cell__num">{cell.dayNum}</div>

						<div class="cal-cell__events">
							{#each cell.meetings as m}
								{@const status = getMeetingStatus(m)}
								<button
									type="button"
									class="event-chip event-chip--{status}"
									onclick={() => openMeetingDetail(m)}
									title="{m.title} ({m.kelasName})"
								>
									<span class="event-chip__dot"></span>
									<span class="event-chip__time">{formatTimeOnly(m.startTime)}</span>
									<span class="event-chip__title">{m.title}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     VIEW MODE 2: TIMELINE LIST VIEW
	     ══════════════════════════════════════════════════════════ -->
	{#if viewMode === 'timeline'}
		{#if filteredMeetings.length === 0}
			<div class="empty-card mb-8">
				<div class="empty-icon">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				</div>
				<h3 class="empty-title">Tidak ada jadwal pertemuan ditemukan</h3>
				<p class="empty-sub">Coba sesuaikan kata kunci pencarian atau kriteria filter di atas.</p>
			</div>
		{:else}
			<div class="timeline-list space-y-4 mb-8">
				{#each paginatedMeetings as m}
					{@const status = getMeetingStatus(m)}
					<div class="timeline-card timeline-card--{status}">
						<div class="timeline-date-box">
							<div class="date-month">{formatIndoDate(m.sessionDate)}</div>
							<div class="date-time">{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</div>
						</div>

						<div class="timeline-content flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="badge badge-kelas">{m.kelasName}</span>
								<span class="badge badge-activity">{m.activityType.toUpperCase()}</span>
								{#if status === 'live'}
									<span class="badge badge-live-pulsating">LIVE HARI INI</span>
								{:else if status === 'upcoming'}
									<span class="badge badge-upcoming">AKAN DATANG</span>
								{:else}
									<span class="badge badge-completed">SELESAI</span>
								{/if}
							</div>

							<h3 class="timeline-title">{m.title}</h3>
							<p class="timeline-meta">
								Lokasi: <strong>{m.location || 'Online / Ruang Kelas'}</strong> &bull; Sub-Fase: {m.subPhaseTitle || '-'}
							</p>
						</div>

						<div class="timeline-actions">
							<button
								type="button"
								class="btn-ghost-sm"
								onclick={() => openMeetingDetail(m)}
							>
								Lihat Rincian
							</button>
							<a
								href="/mentor/pertemuan"
								class="btn-primary-sm"
							>
								Presensi &amp; Materi &rarr;
							</a>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination Bar Standalone -->
			<div class="pagination-bar mb-8">
				<div class="pagination-info">
					Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredMeetings.length)}</strong> dari <strong>{filteredMeetings.length}</strong> jadwal
				</div>

				<div class="pagination-controls">
					<div class="items-per-page-selector">
						<span class="selector-label">Tampilkan:</span>
						<CustomSelect
							options={pageSizeOptions}
							bind:value={itemsPerPage}
							direction="up"
							searchable={false}
						/>
					</div>

					{#if totalPages > 1}
						<div class="pagination-actions">
							<button
								type="button"
								class="btn-pagination-nav"
								disabled={currentPage === 1}
								onclick={() => currentPage--}
							>
								&lsaquo; Prev
							</button>

							{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
								<button
									type="button"
									class="btn-pagination-num {currentPage === pageNum ? 'active' : ''}"
									onclick={() => currentPage = pageNum}
								>
									{pageNum}
								</button>
							{/each}

							<button
								type="button"
								class="btn-pagination-nav"
								disabled={currentPage === totalPages}
								onclick={() => currentPage++}
							>
								Next &rsaquo;
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- ══════════════════════════════════════════════════════════
     MEETING DETAIL MODAL
     ══════════════════════════════════════════════════════════ -->
{#if showDetailModal && selectedMeetingDetail}
	{@const m = selectedMeetingDetail}
	{@const status = getMeetingStatus(m)}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="form-scrim"
		onclick={(e) => e.target === e.currentTarget && closeDetailModal()}
		role="dialog"
		aria-modal="true"
	>
		<div class="modal-box">
			<div class="modal-header">
				<div>
					<div class="flex items-center gap-2 mb-1">
						{#if status === 'live'}
							<span class="badge badge-live-pulsating">LIVE HARI INI</span>
						{:else if status === 'upcoming'}
							<span class="badge badge-upcoming">AKAN DATANG</span>
						{:else}
							<span class="badge badge-completed">SELESAI</span>
						{/if}
						<span class="badge badge-kelas">{m.kelasName}</span>
					</div>
					<h3 class="modal-title">{m.title}</h3>
				</div>
				<button type="button" onclick={closeDetailModal} class="btn-close-modal">
					&times;
				</button>
			</div>

			<div class="modal-body space-y-4">
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<div class="text-xs text-slate-500 font-semibold uppercase mb-1">Tanggal &amp; Waktu</div>
						<div class="font-bold text-slate-800">{formatIndoDate(m.sessionDate)}</div>
						<div class="text-xs text-indigo-600 font-medium">{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</div>
					</div>

					<div>
						<div class="text-xs text-slate-500 font-semibold uppercase mb-1">Lokasi Sesi</div>
						<div class="font-bold text-slate-800">{m.location || 'Ruang Kelas Komunitas'}</div>
						<div class="text-xs text-emerald-600 font-medium">Tipe: {m.activityType.toUpperCase()}</div>
					</div>
				</div>

				<div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
					<div class="text-xs text-slate-500 font-semibold uppercase mb-1">Kaitan Sub-Fase Track</div>
					<div class="text-sm font-semibold text-slate-700">{m.subPhaseTitle || 'Sub-Fase Umum'}</div>
				</div>

				{#if m.materialUrl}
					<div class="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
							<span class="text-xs font-semibold text-slate-700">Slide Materi / PPT Terlampir</span>
						</div>
						<a href={m.materialUrl} target="_blank" rel="noopener" class="text-xs font-bold text-indigo-600 hover:underline">
							Buka PPT &rarr;
						</a>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<a href="/mentor/pertemuan" class="btn-primary-modal w-full text-center">
					Kelola Presensi &amp; Pertemuan Ini &rarr;
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-container {
		padding: 24px 32px 48px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-hero {
		background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
		border-radius: 16px;
		padding: 28px 32px;
		color: #ffffff;
		box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);
	}

	.hero-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.hero-title-group {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 6px;
	}

	.hero-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 24px;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		font-size: 14px;
		color: #c7d2fe;
		max-width: 680px;
		line-height: 1.5;
	}

	.btn-create {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: #ffffff;
		color: #4f46e5;
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 700;
		border-radius: 10px;
		transition: all 150ms ease;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.btn-create:hover {
		background: #f8fafc;
		transform: translateY(-1px);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 18px 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
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
		font-size: 12px;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.stat-value {
		font-family: var(--font-mono, monospace);
		font-size: 22px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.stat-meta {
		font-size: 11px;
		color: #94a3b8;
	}

	/* Filter Card Layout Standard */
	.page-filter-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.filter-row-top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 14px;
	}

	.filter-row-bottom {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		align-items: flex-end;
	}

	.btn-reset-filters-active {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-reset-filters-active:hover {
		background: #fca5a5;
		color: #991b1b;
	}

	.view-mode-toggle-group {
		display: flex;
		align-items: center;
		background: #f1f5f9;
		padding: 3px;
		border-radius: 10px;
		gap: 2px;
	}

	.btn-toggle-mode {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 34px;
		padding: 0 12px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: #64748b;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-toggle-mode.active {
		background: #ffffff;
		color: #4f46e5;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}

	/* Calendar Card */
	.calendar-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.calendar-month-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 20px;
		font-weight: 800;
		color: #0f172a;
	}

	.btn-today-shortcut {
		padding: 4px 10px;
		background: #e0e7ff;
		color: #4f46e5;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		border: none;
		cursor: pointer;
	}

	.calendar-nav-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-cal-nav {
		padding: 6px 14px;
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-cal-nav:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
	}

	.calendar-days-header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
		padding-bottom: 12px;
		border-bottom: 1px solid #f1f5f9;
		margin-bottom: 8px;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 8px;
	}

	.cal-cell {
		min-height: 110px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		transition: border-color 150ms ease;
	}

	.cal-cell:hover {
		border-color: #cbd5e1;
	}

	.cal-cell--other {
		background: #f8fafc;
		opacity: 0.55;
	}

	.cal-cell--today {
		border: 2px solid #4f46e5;
		background: #f5f3ff;
	}

	.cal-cell__num {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 800;
		color: #334155;
		margin-bottom: 6px;
	}

	.cal-cell--today .cal-cell__num {
		color: #4f46e5;
	}

	.cal-cell__events {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;

	}

	.event-chip {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 6px;
		border-radius: 5px;
		font-size: 11px;
		text-align: left;
		border: none;
		cursor: pointer;
		transition: transform 100ms ease;

	}

	.event-chip:hover {
		transform: scale(1.02);
	}

	.event-chip--live {
		background: #dcfce7;
		color: #15803d;
		border-left: 3px solid #16a34a;
	}

	.event-chip--upcoming {
		background: #e0e7ff;
		color: #3730a3;
		border-left: 3px solid #4f46e5;
	}

	.event-chip--completed {
		background: #f1f5f9;
		color: #475569;
		border-left: 3px solid #94a3b8;
	}

	.event-chip__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
	}

	.event-chip__time {
		font-family: var(--font-mono, monospace);
		font-weight: 700;
		font-size: 10px;
	}

	.event-chip__title {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Standalone Timeline Cards */
	.timeline-card {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 20px 24px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #ffffff;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		transition: all 180ms ease;
	}

	.timeline-card:hover {
		border-color: #cbd5e1;
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));
	}

	.timeline-card--live {
		border-left: 5px solid #16a34a;
		background: #f0fdf4;
	}

	.timeline-card--upcoming {
		border-left: 5px solid #4f46e5;
	}

	.timeline-card--completed {
		border-left: 5px solid #94a3b8;
		opacity: 0.85;
	}

	.timeline-date-box {
		width: 140px;
		flex-shrink: 0;
	}

	.date-month {
		font-size: 13px;
		font-weight: 700;
		color: #1e293b;
	}

	.date-time {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: #64748b;
	}

	.timeline-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
	}

	.timeline-meta {
		font-size: 12px;
		color: #64748b;
	}

	.timeline-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-ghost-sm {
		padding: 6px 12px;
		background: transparent;
		color: #475569;
		font-size: 12px;
		font-weight: 700;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		cursor: pointer;
	}

	.btn-primary-sm {
		padding: 6px 14px;
		background: #4f46e5;
		color: #ffffff;
		font-size: 12px;
		font-weight: 700;
		border-radius: 8px;
		text-decoration: none;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.badge-primary { background: rgba(255, 255, 255, 0.2); color: #ffffff; }
	.badge-kelas { background: #e0e7ff; color: #4338ca; }
	.badge-activity { background: #f1f5f9; color: #334155; }
	.badge-live-pulsating { background: #dcfce7; color: #15803d; }
	.badge-upcoming { background: #e0e7ff; color: #3730a3; }
	.badge-completed { background: #f1f5f9; color: #64748b; }

	/* Modal Detail */
	.form-scrim {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		z-index: 999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.modal-box {
		background: #ffffff;
		border-radius: 16px;
		width: 100%;
		max-width: 500px;
		padding: 24px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.modal-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 18px;
		font-weight: 800;
		color: #0f172a;
	}

	.btn-close-modal {
		background: transparent;
		border: none;
		font-size: 24px;
		color: #64748b;
		cursor: pointer;
	}

	.modal-footer {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid #e2e8f0;
	}

	.btn-primary-modal {
		display: block;
		padding: 10px 16px;
		background: #4f46e5;
		color: #ffffff;
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 700;
		border-radius: 10px;
		text-decoration: none;
	}

	/* Pagination Bar Standalone Card */
	.pagination-bar {
		padding: 16px 24px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		position: relative;
		z-index: 20;
	}

	.pagination-info {
		font-size: 13px;
		color: #64748b;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.items-per-page-selector {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.selector-label {
		font-size: 12px;
		color: #64748b;
	}

	.pagination-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-pagination-nav {
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
	}

	.btn-pagination-nav:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-pagination-num {
		min-width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 700;
		color: #475569;
		cursor: pointer;
	}

	.btn-pagination-num.active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.empty-card {
		padding: 48px 24px;
		text-align: center;
	}

	.empty-icon {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: #f1f5f9;
		color: #94a3b8;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.empty-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16px;
		font-weight: 800;
		color: #1e293b;
	}

	.empty-sub {
		font-size: 13px;
		color: #64748b;
	}

	@media (max-width: 1024px) {
		.stats-grid,
		.filter-row-bottom {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}

		.hero-top-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.stats-grid,
		.filter-row-bottom {
			grid-template-columns: 1fr;
		}

		.calendar-days-header,
		.calendar-grid {
			gap: 4px;
		}

		.cal-cell {
			min-height: 70px;
			padding: 4px;
		}

		.event-chip__title {
			display: none;
		}

		.timeline-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.timeline-date-box {
			width: 100%;
		}

		.pagination-bar {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>

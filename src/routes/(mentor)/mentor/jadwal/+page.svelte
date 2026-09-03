<script lang="ts">
	import type { PageData } from './$types';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
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
		searchQuery = '';
		selectedKelas = 'all';
		selectedStatus = 'all';
		selectedActivity = 'all';
	}

	// Calendar Computation Logic
	let calendarGridDays = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

		let startDayIndex = firstDayOfMonth.getDay() - 1; // Convert Sun=0, Mon=1 -> Mon=0, Sun=6
		if (startDayIndex < 0) startDayIndex = 6;

		const daysInMonth = lastDayOfMonth.getDate();
		const days: { dayNumber: number; isCurrentMonth: boolean; dateStr: string; meetings: any[] }[] = [];

		// Previous month padding
		const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
		for (let i = startDayIndex - 1; i >= 0; i--) {
			const d = prevMonthLastDay - i;
			const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
			const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
			const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dayNumber: d,
				isCurrentMonth: false,
				dateStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === dateStr)
			});
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dayNumber: d,
				isCurrentMonth: true,
				dateStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === dateStr)
			});
		}

		// Next month padding to reach full 35 or 42 grid cells
		const totalCells = days.length > 35 ? 42 : 35;
		const nextMonthPadding = totalCells - days.length;
		for (let d = 1; d <= nextMonthPadding; d++) {
			const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
			const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
			const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dayNumber: d,
				isCurrentMonth: false,
				dateStr,
				meetings: filteredMeetings.filter((m) => m.sessionDate === dateStr)
			});
		}

		return days;
	});

	function prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear -= 1;
		} else {
			currentMonth -= 1;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear += 1;
		} else {
			currentMonth += 1;
		}
	}

	function goToToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
	}

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
	<div class="mb-6">
		<PageHeaderCard
			title="Kalender & Timeline Jadwal Pertemuan"
			subtitle="Visualisasikan jadwal sesi kelas komunitas, pantau status pertemuan secara real-time, dan akses materi serta lembar presensi."
			breadcrumbs={[
				{ label: 'Dashboard', href: '/mentor' },
				{ label: 'Kalender Jadwal' }
			]}
		>
			{#snippet badges()}
				<span class="badge badge-neutral">{totalCount} SESI TOTAL</span>
			{/snippet}

			{#snippet actions()}
				<a href="/mentor/pertemuan" class="btn-create-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<span>Kelola Sesi</span>
				</a>
			{/snippet}
		</PageHeaderCard>
	</div>

	<!-- Quick Stats Grid (4 Metrics Cards) -->
	<div class="stats-grid mb-6">
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

	<!-- Filter Card -->
	<div class="page-filter-card mb-6">
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

			<div class="flex items-center gap-3">
				{#if isFilterActive}
					<button type="button" onclick={resetFilters} class="btn-reset-filters-active">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
						<span>Reset Filter</span>
					</button>
				{/if}

				<!-- Mode Switcher -->
				<div class="view-mode-toggle-group">
					<button
						type="button"
						class="btn-toggle-mode"
						class:active={viewMode === 'calendar'}
						onclick={() => (viewMode = 'calendar')}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						<span>Kalender</span>
					</button>

					<button
						type="button"
						class="btn-toggle-mode"
						class:active={viewMode === 'timeline'}
						onclick={() => (viewMode = 'timeline')}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="8" y1="6" x2="21" y2="6" />
							<line x1="8" y1="12" x2="21" y2="12" />
							<line x1="8" y1="18" x2="21" y2="18" />
							<line x1="3" y1="6" x2="3.01" y2="6" />
							<line x1="3" y1="12" x2="3.01" y2="12" />
							<line x1="3" y1="18" x2="3.01" y2="18" />
						</svg>
						<span>Timeline</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Row 2: Select Filters -->
		<div class="filter-row-bottom">
			<CustomSelect
				id="filter-kelas-select"
				label="Filter Kelas"
				bind:value={selectedKelas}
				options={[
					{ value: 'all', label: 'Semua Kelas' },
					...(data.kelases || []).map((k) => ({ value: String(k.id), label: k.name }))
				]}
				searchable={false}
			/>

			<CustomSelect
				id="filter-status-select"
				label="Status Pertemuan"
				bind:value={selectedStatus}
				options={[
					{ value: 'all', label: 'Semua Status' },
					{ value: 'live', label: 'Live / Berlangsung Hari Ini' },
					{ value: 'upcoming', label: 'Akan Datang' },
					{ value: 'completed', label: 'Selesai / Terlewat' }
				]}
				searchable={false}
			/>

			<CustomSelect
				id="filter-activity-select"
				label="Tipe Aktivitas"
				bind:value={selectedActivity}
				options={[
					{ value: 'all', label: 'Semua Tipe' },
					...(data.activityTypesOptions || [
						{ value: 'teori', label: 'Teori' },
						{ value: 'praktik', label: 'Praktik' },
						{ value: 'teori_praktik', label: 'Teori & Praktik' },
						{ value: 'games', label: 'Games' },
						{ value: 'quiz', label: 'Quiz' },
						{ value: 'santai', label: 'Santai' }
					])
				]}
				searchable={false}
			/>
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     VIEW MAIN CONTENT (CALENDAR OR TIMELINE)
	     ══════════════════════════════════════════════════════════ -->
	{#if viewMode === 'calendar'}
		<!-- CALENDAR MONTH VIEW -->
		<div class="calendar-card">
			<div class="calendar-header">
				<div class="flex items-center gap-3">
					<h2 class="calendar-month-title">
						{monthNamesIndo[currentMonth]} {currentYear}
					</h2>
					<button type="button" onclick={goToToday} class="btn-today-shortcut">
						Hari Ini
					</button>
				</div>

				<div class="calendar-nav-buttons">
					<button type="button" onclick={prevMonth} class="btn-cal-nav" aria-label="Bulan Sebelumnya">
						&larr; Prev
					</button>
					<button type="button" onclick={nextMonth} class="btn-cal-nav" aria-label="Bulan Berikutnya">
						Next &rarr;
					</button>
				</div>
			</div>

			<!-- Grid Days Header -->
			<div class="calendar-days-header">
				{#each dayNamesIndo as dayName}
					<div>{dayName}</div>
				{/each}
			</div>

			<!-- Calendar Matrix Grid -->
			<div class="calendar-grid">
				{#each calendarGridDays as cell}
					{@const isTodayCell = cell.dateStr === todayIsoStr}
					<div
						class="cal-cell"
						class:cal-cell--other={!cell.isCurrentMonth}
						class:cal-cell--today={isTodayCell}
					>
						<div class="cal-cell__num">{cell.dayNumber}</div>

						<div class="cal-cell__events">
							{#each cell.meetings as m}
								{@const st = getMeetingStatus(m)}
								<button
									type="button"
									class="event-chip event-chip--{st}"
									onclick={() => openMeetingDetail(m)}
									title="{m.title} ({m.startTime} - {m.endTime})"
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
	{:else}
		<!-- TIMELINE LIST VIEW -->
		<div class="timeline-container">
			{#if paginatedMeetings.length === 0}
				<div class="empty-state-card text-center py-12">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto text-slate-400 mb-3">
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<h3 class="text-base font-bold text-slate-800">Tidak ada jadwal pertemuan ditemukan</h3>
					<p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
						Coba ubah kata kunci pencarian atau sesuaikan filter kelas &amp; status pertemuan Anda.
					</p>
					{#if isFilterActive}
						<button type="button" onclick={resetFilters} class="btn-reset-filters-active">
							<span>Reset Filter</span>
						</button>
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					{#each paginatedMeetings as m}
						{@const st = getMeetingStatus(m)}
						<div class="timeline-card">
							<div class="timeline-card__date-box">
								<span class="timeline-card__day">{m.sessionDate ? m.sessionDate.split('-')[2] : '--'}</span>
								<span class="timeline-card__month">
									{m.sessionDate ? monthNamesIndo[Number(m.sessionDate.split('-')[1]) - 1]?.slice(0, 3) : ''}
								</span>
							</div>

							<div class="timeline-card__main">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="activity-badge">{m.activityType.toUpperCase()}</span>
									{#if m.isWeekend}
										<span class="weekend-tag">WEEKEND (+50%)</span>
									{/if}
									<span class="kelas-tag">{m.kelasName}</span>

									{#if st === 'live'}
										<span class="status-badge status-badge--live">LIVE SEKARANG</span>
									{:else if st === 'upcoming'}
										<span class="status-badge status-badge--upcoming">AKAN DATANG</span>
									{:else}
										<span class="status-badge status-badge--completed">SELESAI</span>
									{/if}
								</div>

								<h3 class="timeline-card__title">{m.title}</h3>
								<p class="timeline-card__meta">
									<span>{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</span>
									<span class="mx-1">•</span>
									<span>{m.location || 'Online / Belum ditentukan'}</span>
									<span class="mx-1">•</span>
									<span>{m.subPhaseTitle || 'Sub-Fase Track'}</span>
								</p>
							</div>

							<div class="timeline-card__actions">
								<button type="button" onclick={() => openMeetingDetail(m)} class="btn-detail-sm">
									Detail &amp; Sesi
								</button>
								<a href={`/mentor/presensi?pertemuanId=${m.id}`} class="btn-presensi-sm">
									Buka QR Presensi
								</a>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination Bar -->
				<div class="pagination-bar mt-6">
					<div class="flex items-center gap-3">
						<span class="text-xs font-semibold text-slate-600">
							Menampilkan {filteredMeetings.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredMeetings.length)} dari {filteredMeetings.length} sesi
						</span>
						<CustomSelect
							bind:value={itemsPerPage}
							options={pageSizeOptions}
							searchable={false}
						/>
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							class="pagination-btn"
							disabled={currentPage <= 1}
							onclick={() => (currentPage -= 1)}
						>
							&larr; Prev
						</button>
						<span class="text-xs font-bold text-slate-700 font-mono px-2">
							Hal {currentPage} / {totalPages}
						</span>
						<button
							type="button"
							class="pagination-btn"
							disabled={currentPage >= totalPages}
							onclick={() => (currentPage += 1)}
						>
							Next &rarr;
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Meeting Detail Modal -->
{#if showDetailModal && selectedMeetingDetail}
	<div class="modal-backdrop" onclick={closeDetailModal} role="dialog" aria-modal="true">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="region">
			<div class="modal-header">
				<div>
					<span class="activity-badge mb-1">{selectedMeetingDetail.activityType?.toUpperCase()}</span>
					<h3 class="modal-title">{selectedMeetingDetail.title}</h3>
				</div>
				<button type="button" onclick={closeDetailModal} class="btn-modal-close">&times;</button>
			</div>

			<div class="modal-body space-y-4">
				<div class="grid grid-cols-2 gap-3 text-xs">
					<div>
						<span class="text-slate-500 font-mono text-[11px] block">TANGGAL &amp; WAKTU</span>
						<span class="font-bold text-slate-800">{formatIndoDate(selectedMeetingDetail.sessionDate)}</span>
						<span class="block text-slate-600 font-mono mt-0.5">{formatTimeOnly(selectedMeetingDetail.startTime)} - {formatTimeOnly(selectedMeetingDetail.endTime)} WIB</span>
					</div>

					<div>
						<span class="text-slate-500 font-mono text-[11px] block">KELAS &amp; LOKASI</span>
						<span class="font-bold text-slate-800">{selectedMeetingDetail.kelasName}</span>
						<span class="block text-slate-600 mt-0.5">{selectedMeetingDetail.location || 'Online'}</span>
					</div>
				</div>

				<div class="border-t border-slate-100 pt-3">
					<span class="text-slate-500 font-mono text-[11px] block mb-1">SUB-FASE TRACK PEMBELAJARAN</span>
					<span class="text-xs font-semibold text-slate-800">{selectedMeetingDetail.subPhaseTitle || '-'}</span>
				</div>

				{#if selectedMeetingDetail.materialUrl}
					<div class="border-t border-slate-100 pt-3">
						<span class="text-slate-500 font-mono text-[11px] block mb-1">SLIDE MATERI</span>
						<a href={selectedMeetingDetail.materialUrl} target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
								<polyline points="15 3 21 3 21 9" />
								<line x1="10" y1="14" x2="21" y2="3" />
							</svg>
							<span>Buka Slide PPT Materi &rarr;</span>
						</a>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<a href={`/mentor/pertemuan/${selectedMeetingDetail.id}`} class="btn-detail-link">
					Buka Detail Sesi &rarr;
				</a>
				<a href={`/mentor/presensi?pertemuanId=${selectedMeetingDetail.id}`} class="btn-presensi-link">
					Presensi QR Sesi &rarr;
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-container {
		padding: 32px 36px 64px;
		max-width: 1320px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.page-container {
			padding: 20px 18px 48px;
		}
	}

	/* Standardized Header Card (Blueprint Spec) */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 24px !important;
		max-width: 100%;
		word-break: break-word;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 26px;
	}

	.header-badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.header-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: #eef2ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}

	.btn-create-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 13.5px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-create-pill:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.header-main-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	@media (max-width: 640px) {
		.header-card {
			padding: 12px 14px;
			gap: 8px;
		}
		.header-main-content {
			gap: 3px;
		}
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.bc-link:hover {
		color: var(--primary, #4f46e5);
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
	}

	.page-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.3rem, 2.5vw, 1.65rem);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.page-sub {
		font-size: 13.5px;
		color: var(--text-secondary, #64748b);
		margin: 0;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-top: 0 !important;
		margin-bottom: 24px !important;
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
		margin-bottom: 24px !important;
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
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	@media (max-width: 768px) {
		.timeline-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.timeline-card__date-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		flex-shrink: 0;
	}

	.timeline-card__day {
		font-family: var(--font-macro, sans-serif);
		font-size: 22px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1;
	}

	.timeline-card__month {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
	}

	.timeline-card__main {
		flex: 1;
		min-width: 0;
	}

	.timeline-card__title {
		font-family: var(--font-macro, sans-serif);
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
		margin-bottom: 4px;
	}

	.timeline-card__meta {
		font-size: 12.5px;
		color: #64748b;
	}

	.timeline-card__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-detail-sm {
		padding: 7px 14px;
		background: #f1f5f9;
		color: #334155;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-detail-sm:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.btn-presensi-sm {
		padding: 7px 14px;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: #ffffff;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border-radius: 8px;
		text-decoration: none;
		box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
		transition: all 150ms ease;
	}

	.btn-presensi-sm:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
	}

	/* Utility Badges */
	.activity-badge {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 2px 7px;
		border-radius: 4px;
		background: #e0e7ff;
		color: #4338ca;
	}

	.weekend-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		background: #fffbeb;
		color: #b45309;
		border: 1px solid #fde68a;
		padding: 2px 7px;
		border-radius: 4px;
	}

	.kelas-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		background: #f8fafc;
		color: #475569;
		border: 1px solid #cbd5e1;
		padding: 2px 7px;
		border-radius: 4px;
	}

	.status-badge {
		font-family: var(--font-macro, sans-serif);
		font-size: 10px;
		font-weight: 800;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.status-badge--live { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
	.status-badge--upcoming { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
	.status-badge--completed { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

	/* Pagination Bar */
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 18px;
		flex-wrap: wrap;
	}

	.pagination-btn {
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: #f1f5f9;
		border-color: #94a3b8;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Modal Backdrop & Card */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 999;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.modal-card {
		background: #ffffff;
		border-radius: 16px;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.modal-header {
		padding: 18px 22px;
		border-bottom: 1px solid #f1f5f9;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		background: #f8fafc;
	}

	.modal-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
	}

	.btn-modal-close {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #64748b;
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.btn-modal-close:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.modal-body {
		padding: 20px 22px;
	}

	.modal-footer {
		padding: 14px 22px;
		background: #f8fafc;
		border-top: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
	}

	.btn-detail-link {
		padding: 8px 14px;
		background: #f1f5f9;
		color: #334155;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-detail-link:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.btn-presensi-link {
		padding: 8px 14px;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: #ffffff;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border-radius: 8px;
		text-decoration: none;
		box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
		transition: all 150ms ease;
	}

	.btn-presensi-link:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
	}
</style>

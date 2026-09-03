<script lang="ts">
	import type { PageData } from './$types';
	import { onDestroy, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PaginationFooter from '$lib/components/ui/PaginationFooter.svelte';
	import { toast } from '$lib/stores/toast';
	import QRCode from 'qrcode';

	let { data }: { data: PageData } = $props();

	// Derivations & Dynamic Back Navigation derived state
	const currentMeeting = $derived(data.selectedMeeting);
	const fromParam = $derived(page.url.searchParams.get('from'));
	const fromDashboardParam = $derived(page.url.searchParams.get('from_dashboard'));
	const isFromDetail = $derived(fromParam === 'detail' || fromParam === 'detail_pertemuan');

	const backToDetailHref = $derived(
		currentMeeting
			? `/mentor/pertemuan/${currentMeeting.id}${fromDashboardParam === 'true' ? '?from=dashboard' : ''}`
			: '/mentor/pertemuan'
	);
	const backLabel = $derived(isFromDetail ? 'Kembali ke Detail Pertemuan' : 'Kembali ke Daftar Pertemuan');
	const backHref = $derived(isFromDetail ? backToDetailHref : '/mentor/pertemuan');

	// Pagination State
	let currentPage = $state(1);
	const pageSize = 10;

	// Mode Presensi Manual Bulk State
	let isBulkEditMode = $state(false);
	let bulkDefaultReason = $state('Presensi manual kelas oleh mentor');
	let isSubmittingBulk = $state(false);

	// Bulk items map: userId -> { status: 'hadir' | 'excused' | 'belum_hadir', manualReason: string }
	let bulkMap = $state<Record<number, { status: 'hadir' | 'excused' | 'belum_hadir'; manualReason: string }>>({});

	// Search & Filter State
	let searchQuery = $state('');
	let statusFilter = $state('all');
	let sortBy = $state('name_asc');

	// Dynamic 30-Second Auto-Rotating QR Token State
	let currentToken = $state(data.activeToken?.token ?? '');
	let tokenExpiresAt = $state(data.activeToken?.expiresAt ? new Date(data.activeToken.expiresAt) : null);
	let isRefreshingToken = $state(false);
	let countdownSeconds = $state(30);
	let qrDataUrl = $state('');
	let isQRExpanded = $state(false);

	$effect(() => {
		if (currentToken) {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const qrUrlPayload = `${origin}/siswa/presensi?token=${encodeURIComponent(currentToken)}`;

			QRCode.toDataURL(qrUrlPayload, {
				width: 280,
				margin: 1,
				color: { dark: '#0f172a', light: '#ffffff' }
			})
				.then((url) => {
					qrDataUrl = url;
				})
				.catch((err) => {
					console.error('Failed to generate QR code data URL:', err);
				});
		} else {
			qrDataUrl = '';
		}
	});

	// Dynamic local state for live attendance list
	let liveAttendanceList = $state<any[]>(data.attendanceList ?? []);

	$effect(() => {
		if (data.attendanceList) {
			liveAttendanceList = [...data.attendanceList];
		}
	});

	// Derivations
	const isOngoing = $derived(data.isOngoing ?? false);
	const students = $derived(liveAttendanceList);
	const totalStudents = $derived(students.length);
	const totalHadir = $derived(students.filter((s) => s.status === 'hadir').length);
	const totalExcused = $derived(students.filter((s) => s.status === 'excused').length);
	const totalBelumHadir = $derived(students.filter((s) => s.status === 'belum_hadir').length);
	const hadirPercent = $derived(totalStudents > 0 ? Math.round((totalHadir / totalStudents) * 100) : 0);

	// Live Polling & Notification Tracker
	let livePollingInterval: ReturnType<typeof setInterval> | null = null;
	const knownAttendanceMap = new Map<number, { status: string; name: string }>();

	async function pollLiveAttendance() {
		if (!currentMeeting || isBulkEditMode) return;

		try {
			const res = await fetch(`/api/attendance/list/${currentMeeting.id}`);
			if (!res.ok) return;

			const json = await res.json();
			if (json.success && json.data?.students) {
				const freshStudents: any[] = json.data.students;

				for (const s of freshStudents) {
					const prev = knownAttendanceMap.get(s.userId);
					if (prev && prev.status === 'belum_hadir' && s.status === 'hadir') {
						toast.success(`${s.fullName} Presensi!`);
					}
					knownAttendanceMap.set(s.userId, { status: s.status, name: s.fullName });
				}

				liveAttendanceList = freshStudents;
			}
		} catch (err) {
			// Silent catch for background polling
		}
	}

	function startLivePolling() {
		stopLivePolling();
		if (!currentMeeting) return;

		for (const s of liveAttendanceList) {
			knownAttendanceMap.set(s.userId, { status: s.status, name: s.fullName });
		}

		livePollingInterval = setInterval(pollLiveAttendance, 2500);
	}

	function stopLivePolling() {
		if (livePollingInterval) {
			clearInterval(livePollingInterval);
			livePollingInterval = null;
		}
	}

	$effect(() => {
		if (currentMeeting) {
			startLivePolling();
		} else {
			stopLivePolling();
		}

		return () => {
			stopLivePolling();
		};
	});

	// Initialize / reset bulk map whenever attendanceList changes or bulk mode opens
	$effect(() => {
		const newMap: Record<number, { status: 'hadir' | 'excused' | 'belum_hadir'; manualReason: string }> = {};
		for (const s of students) {
			newMap[s.userId] = {
				status: s.status,
				manualReason: s.manualReason || ''
			};
		}
		bulkMap = newMap;
	});

	// Filtered & Sorted Student List
	const filteredStudents = $derived.by(() => {
		let list = [...students];

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(s) => s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)
			);
		}

		if (statusFilter !== 'all') {
			list = list.filter((s) => s.status === statusFilter);
		}

		if (sortBy === 'name_asc') {
			list.sort((a, b) => a.fullName.localeCompare(b.fullName));
		} else if (sortBy === 'name_desc') {
			list.sort((a, b) => b.fullName.localeCompare(a.fullName));
		} else if (sortBy === 'status') {
			const order: Record<string, number> = { belum_hadir: 0, excused: 1, hadir: 2 };
			list.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
		}

		return list;
	});

	// Pagination Derived State & Auto-Reset Effect
	const totalItems = $derived(filteredStudents.length);
	const totalPages = $derived(Math.ceil(totalItems / pageSize) || 1);
	const paginatedStudents = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredStudents.slice(start, start + pageSize);
	});

	$effect(() => {
		searchQuery;
		statusFilter;
		sortBy;
		untrack(() => {
			currentPage = 1;
		});
	});

	// Auto-Rotating Token Interval logic
	let tokenRotationInterval: ReturnType<typeof setInterval> | null = null;
	let tickInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchNew30sToken() {
		if (!currentMeeting || !isOngoing) return;
		isRefreshingToken = true;

		try {
			const res = await fetch('/api/attendance/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pertemuanId: currentMeeting.id,
					expirySeconds: 30
				})
			});

			const json = await res.json();
			if (json.success) {
				currentToken = json.data.token;
				tokenExpiresAt = new Date(json.data.expiresAt);
				countdownSeconds = 30;
			}
		} catch (err: any) {
			console.error('Failed to auto-rotate QR token:', err);
		} finally {
			isRefreshingToken = false;
		}
	}

	function startDynamicQRRotation() {
		stopDynamicQRRotation();
		if (!currentMeeting || !isOngoing) return;

		if (!currentToken) {
			fetchNew30sToken();
		}

		tickInterval = setInterval(() => {
			if (tokenExpiresAt) {
				const now = new Date().getTime();
				const exp = new Date(tokenExpiresAt).getTime();
				const diffSecs = Math.max(0, Math.ceil((exp - now) / 1000));
				countdownSeconds = diffSecs;

				if (diffSecs <= 0) {
					fetchNew30sToken();
				}
			}
		}, 1000);
	}

	function stopDynamicQRRotation() {
		if (tokenRotationInterval) {
			clearInterval(tokenRotationInterval);
			tokenRotationInterval = null;
		}
		if (tickInterval) {
			clearInterval(tickInterval);
			tickInterval = null;
		}
	}

	$effect(() => {
		if (currentMeeting && isOngoing) {
			startDynamicQRRotation();
		} else {
			stopDynamicQRRotation();
		}

		return () => {
			stopDynamicQRRotation();
		};
	});

	onDestroy(() => {
		stopDynamicQRRotation();
	});

	function copyTokenToClipboard() {
		if (!currentToken) return;
		navigator.clipboard.writeText(currentToken);
		toast.info('Kode Token Presensi disalin ke clipboard!');
	}

	// Bulk Edit Helper Functions
	function setAllBulkStatus(targetStatus: 'hadir' | 'excused' | 'belum_hadir') {
		for (const s of filteredStudents) {
			if (bulkMap[s.userId]) {
				bulkMap[s.userId].status = targetStatus;
			}
		}
		toast.info(`Seluruh siswa terfilter ditandai sebagai ${targetStatus.toUpperCase()}.`);
	}

	function setSingleStudentStatus(userId: number, status: 'hadir' | 'excused' | 'belum_hadir') {
		if (bulkMap[userId]) {
			bulkMap[userId].status = status;
		}
	}

	async function submitBulkAttendance() {
		if (!currentMeeting) return;

		const defaultReason =
			bulkDefaultReason.trim().length >= 3
				? bulkDefaultReason.trim()
				: 'Presensi manual kelas oleh mentor';

		isSubmittingBulk = true;

		const items = filteredStudents.map((s) => ({
			userId: s.userId,
			status: bulkMap[s.userId]?.status ?? 'belum_hadir',
			manualReason: bulkMap[s.userId]?.manualReason?.trim() || undefined
		}));

		try {
			const res = await fetch('/api/attendance/manual-bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pertemuanId: currentMeeting.id,
					defaultReason,
					items
				})
			});

			const json = await res.json();
			if (json.success) {
				toast.success(json.message);
				isBulkEditMode = false;
				await invalidateAll();
			} else {
				toast.error(json.message || 'Gagal menyimpan presensi massal.');
			}
		} catch (err: any) {
			toast.error(err.message || 'Terjadi kesalahan sistem.');
		} finally {
			isSubmittingBulk = false;
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

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';

		let d: Date;
		if (dateVal instanceof Date) {
			d = dateVal;
		} else {
			const str = String(dateVal).trim();
			const dateOnly = str.includes('T') ? str.split('T')[0] : str;
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
				const [y, m, day] = dateOnly.split('-').map(Number);
				d = new Date(y, m - 1, day);
			} else {
				d = new Date(str);
			}
		}

		if (isNaN(d.getTime())) return String(dateVal);

		const bulanIndo = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];

		return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
	}

	function formatIndoTime(dateStr: Date | string | null): string {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return '-';
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${hh}:${mm} WIB`;
	}
</script>

<svelte:head>
	<title>Kelola Presensi Sesi — Portal Mentor NLC</title>
</svelte:head>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && isQRExpanded) isQRExpanded = false; }} />

<div class="page-container">
	<PageHeaderCard
			title={currentMeeting ? `Presensi: ${currentMeeting.title}` : 'Manajemen Presensi Sesi'}
			breadcrumbs={[
				{ label: 'Dashboard', href: '/mentor' },
				...(isFromDetail && currentMeeting
					? [{ label: `Detail Pertemuan #${currentMeeting.id}`, href: backToDetailHref }]
					: [{ label: 'Daftar Pertemuan', href: '/mentor/pertemuan' }]),
				{ label: 'Kelola Presensi' }
			]}
		>
			{#snippet badges()}
				<a href={backHref} class="btn-secondary-head-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span>{backLabel}</span>
				</a>
			{/snippet}

			{#snippet subtitleSnippet()}
				<p class="page-sub text-left">
					{#if currentMeeting}
						Kelas: <strong class="text-indigo-600 font-semibold">{currentMeeting.kelasName}</strong> · Sub-Fase Track Pembelajaran: {currentMeeting.subPhaseTitle}
					{:else}
						Generate token QR 30-detik otomatis atau kelola presensi massal siswa.
					{/if}
				</p>
		</PageHeaderCard>

	{#if currentMeeting}
		<!-- Main Top Grid: QR Generator Panel + Meeting Specs Card -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
			<!-- QR Generator Card (Vertically Centered Content) -->
			<div class="panel lg:col-span-2 p-6 flex flex-col justify-between min-h-[380px]">
				{#if isOngoing}
					<div class="flex flex-col h-full justify-between">
						<div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
							<div class="flex items-center gap-2.5">
								<div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="3" width="7" height="7" />
										<rect x="14" y="3" width="7" height="7" />
										<rect x="14" y="14" width="7" height="7" />
										<rect x="3" y="14" width="7" height="7" />
									</svg>
								</div>
								<div>
									<h3 class="font-extrabold text-slate-900 text-sm">Kode QR Presensi</h3>
									<p class="text-xs text-slate-500">Tampilkan kode ini di proyektor. Kode berganti otomatis tiap 30 detik.</p>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<span class="badge badge-live">
									<span>Rotasi: {countdownSeconds}s</span>
								</span>
								<button
									type="button"
									onclick={() => (isQRExpanded = true)}
									class="badge cursor-pointer hover:bg-indigo-100 transition-all font-bold"
									style="background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe;"
									title="Perbesar / Mode Proyektor"
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path d="M15 3h6v6" />
										<path d="M9 21H3v-6" />
										<path d="M21 3l-7 7" />
										<path d="M3 21l7-7" />
									</svg>
									<span>Expand QR</span>
								</button>
							</div>
						</div>

						{#if currentToken}
							<div class="my-auto p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
								<!-- Scannable QR Code Image -->
								{#if qrDataUrl}
									<div class="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 flex items-center justify-center">
										<img src={qrDataUrl} alt="Kode QR Presensi Sesi" class="w-52 h-52 sm:w-60 sm:h-60 rounded-lg object-contain" />
									</div>
								{:else}
									<div class="w-52 h-52 sm:w-60 sm:h-60 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-sm">
										<span class="text-xs font-semibold">Memuat Kode QR...</span>
									</div>
								{/if}

								<div class="font-mono text-sm sm:text-base font-extrabold text-slate-900 tracking-wider bg-slate-200/80 px-3.5 py-1.5 rounded-lg mb-3 select-all border border-slate-300/50">
									{currentToken}
								</div>

								<div class="w-56 sm:w-64 h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
									<div
										class="h-full bg-indigo-600 transition-all duration-1000 rounded-full"
										style="width: {(countdownSeconds / 30) * 100}%;"
									></div>
								</div>

								<button type="button" onclick={copyTokenToClipboard} class="btn-ghost text-xs">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
									</svg>
									<span>Salin Kode Token</span>
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex-1 my-auto py-8 px-4 flex flex-col items-center justify-center text-center">
						<div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3 shadow-xs">
							<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
						</div>

						<span class="badge badge-absen mb-2">DI LUAR JAM PERTEMUAN</span>
						<h3 class="font-extrabold text-slate-900 text-base">Presensi QR Otomatis Nonaktif</h3>
						<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
							Kode QR 30-detik otomatis hanya aktif saat jam pertemuan berlangsung (<strong>{formatIndoDate(currentMeeting.sessionDate)}</strong>, {formatTimeOnly(currentMeeting.startTime)} - {formatTimeOnly(currentMeeting.endTime)} WIB).
						</p>

						<button
							type="button"
							onclick={() => (isBulkEditMode = true)}
							class="btn-presensi text-xs px-4 py-2 mt-4"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
							</svg>
							<span>Isi Presensi Massal (Bulk Edit)</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Right Column: Detail Pertemuan + 4 Individual Stat Cards -->
			<div class="flex flex-col justify-start gap-4">
				<!-- Panel 1: Detail Pertemuan (Minimalist Horizontal List) -->
				<div class="panel p-5">
					<div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
						<h3 class="font-extrabold text-slate-900 text-sm">Detail Pertemuan</h3>
						{#if isOngoing}
							<span class="badge badge-live">SEDANG BERLANGSUNG</span>
						{:else}
							<span class="badge badge-absen">SELESAI</span>
						{/if}
					</div>

					<!-- Judul Sesi & Badge Sesi -->
					<div class="mb-3.5">
						<div class="flex items-center gap-1.5 mb-1">
							<span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/80">
								{currentMeeting.activityType || 'Teori & Praktik'}
							</span>
							{#if currentMeeting.isWeekend}
								<span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/80">
									Weekend (+50% Poin)
								</span>
							{/if}
						</div>
						<h4 class="font-extrabold text-slate-900 text-base leading-snug">{currentMeeting.title}</h4>
					</div>

					<!-- Minimalist Horizontal List -->
					<div class="divide-y divide-slate-100 text-xs border-t border-slate-100">
						<!-- Row 1: Kelas & Phase -->
						<div class="py-4.5 flex items-center justify-between gap-4">
							<div class="flex items-center gap-2.5 text-slate-500 shrink-0">
								<div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
										<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
									</svg>
								</div>
								<span class="font-semibold text-slate-600 text-xs sm:text-sm">Kelas &amp; PHASE</span>
							</div>
							<div class="font-bold text-slate-900 text-right text-xs sm:text-sm">
								{currentMeeting.kelasName} <span class="font-normal text-slate-500">({currentMeeting.subPhaseTitle})</span>
							</div>
						</div>

						<!-- Row 2: Tanggal -->
						<div class="py-4.5 flex items-center justify-between gap-4">
							<div class="flex items-center gap-2.5 text-slate-500 shrink-0">
								<div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
										<line x1="16" y1="2" x2="16" y2="6" />
										<line x1="8" y1="2" x2="8" y2="6" />
										<line x1="3" y1="10" x2="21" y2="10" />
									</svg>
								</div>
								<span class="font-semibold text-slate-600 text-xs sm:text-sm">Tanggal</span>
							</div>
							<div class="font-bold text-slate-900 text-right text-xs sm:text-sm">
								{formatIndoDate(currentMeeting.sessionDate)}
							</div>
						</div>

						<!-- Row 3: Waktu Sesi -->
						<div class="py-4.5 flex items-center justify-between gap-4">
							<div class="flex items-center gap-2.5 text-slate-500 shrink-0">
								<div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="10" />
										<polyline points="12 6 12 12 16 14" />
									</svg>
								</div>
								<span class="font-semibold text-slate-600 text-xs sm:text-sm">Waktu Sesi</span>
							</div>
							<div class="font-bold text-slate-900 text-right text-xs sm:text-sm">
								{formatTimeOnly(currentMeeting.startTime)} - {formatTimeOnly(currentMeeting.endTime)} WIB
							</div>
						</div>

						<!-- Row 4: Lokasi -->
						<div class="py-4.5 flex items-center justify-between gap-4">
							<div class="flex items-center gap-2.5 text-slate-500 shrink-0">
								<div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
								</div>
								<span class="font-semibold text-slate-600 text-xs sm:text-sm">Lokasi / Ruangan</span>
							</div>
							<div class="font-bold text-slate-900 text-right text-xs sm:text-sm truncate">
								{currentMeeting.location || 'Lab Komputer NLC'}
							</div>
						</div>
					</div>
				</div>

				<!-- Individual Stat Cards Grid (2x2 spacious layout) -->
				<div class="grid grid-cols-2 gap-3">
					<StatCard label="Total Siswa" value={totalStudents} variant="attendance">
						{#snippet icon()}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						{/snippet}
					</StatCard>
					<StatCard label="Hadir" value={totalHadir} subtext={`${hadirPercent}% Kehadiran`} variant="approved">
						{#snippet icon()}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{/snippet}
					</StatCard>
					<StatCard label="Izin (Excused)" value={totalExcused} variant="pending">
						{#snippet icon()}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						{/snippet}
					</StatCard>
					<StatCard label="Belum Hadir" value={totalBelumHadir} variant="revisi">
						{#snippet icon()}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						{/snippet}
					</StatCard>
				</div>
			</div>
		</div>

		<!-- Filter Bar -->
		<FilterBar>
			{#snippet search()}
				<TextInput
					label="Cari Siswa"
					placeholder="Cari berdasarkan nama atau username siswa..."
					bind:value={searchQuery}
					clearable
				/>
			{/snippet}

			{#snippet filters()}
				<div class="col-span-3">
					<CustomSelect
						name="statusFilter"
						label="Filter Status Kehadiran"
						bind:value={statusFilter}
						options={[
							{ value: 'all', label: 'Semua Status Kehadiran' },
							{ value: 'hadir', label: 'Hadir' },
							{ value: 'excused', label: 'Excused / Izin' },
							{ value: 'belum_hadir', label: 'Belum Presensi' }
						]}
					/>
				</div>

				<div class="col-span-3">
					<CustomSelect
						name="sortBy"
						label="Urutkan Berdasarkan"
						bind:value={sortBy}
						options={[
							{ value: 'name_asc', label: 'Nama (A-Z)' },
							{ value: 'name_desc', label: 'Nama (Z-A)' },
							{ value: 'status', label: 'Status Kehadiran' }
						]}
					/>
				</div>
			{/snippet}
		</FilterBar>

		{#if isBulkEditMode}
			<!-- BULK PRESENSI CHECKLIST PANEL -->
			<div class="panel overflow-hidden">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						<span>Mode Presensi Massal (Bulk Checklist)</span>
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => setAllBulkStatus('hadir')}
							class="btn-ghost text-xs py-1 px-2.5 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold"
						>
							Tandai Semua Hadir
						</button>
						<button
							type="button"
							onclick={() => setAllBulkStatus('excused')}
							class="btn-ghost text-xs py-1 px-2.5 bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold"
						>
							Tandai Semua Excused
						</button>
						<button
							type="button"
							onclick={() => setAllBulkStatus('belum_hadir')}
							class="btn-ghost text-xs py-1 px-2.5"
						>
							Reset Status
						</button>
						<button
							type="button"
							onclick={() => (isBulkEditMode = false)}
							class="btn-ghost text-xs py-1 px-2.5 font-bold border-slate-300"
						>
							Tutup Edit
						</button>
					</div>
				</div>

				<div class="p-5 border-bottom bg-slate-50/50">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
						<div class="md:col-span-2">
							<TextInput
								label="Alasan Presensi Massal (Wajib)"
								bind:value={bulkDefaultReason}
								placeholder="Contoh: Presensi fisik kelas oleh mentor"
								clearable
							/>
						</div>
						<div>
							<button
								type="button"
								onclick={submitBulkAttendance}
								disabled={isSubmittingBulk}
								class="btn-presensi py-2.5 text-xs font-bold w-full justify-center"
							>
								{#if isSubmittingBulk}
									<span>Menyimpan Presensi...</span>
								{:else}
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
										<polyline points="17 21 17 13 7 13 7 21" />
										<polyline points="7 3 7 8 15 8" />
									</svg>
									<span>Simpan Presensi ({filteredStudents.length} Siswa)</span>
								{/if}
							</button>
						</div>
					</div>
				</div>

				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-slate-50 border-bottom text-xs font-extrabold text-slate-600 uppercase">
							<th class="py-3 px-4 w-12">#</th>
							<th class="py-3 px-4">Nama Siswa</th>
							<th class="py-3 px-4">Pilih Status Kehadiran</th>
							<th class="py-3 px-4">Catatan Khusus (Opsional)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#if paginatedStudents.length === 0}
							<tr>
								<td colspan="4" class="p-0">
									<EmptyState
										title="Tidak Ada Data Siswa"
										description="Coba sesuaikan kata kunci pencarian atau filter status presensi."
										iconTheme="slate"
									/>
								</td>
							</tr>
						{:else}
							{#each paginatedStudents as s, idx ((currentPage - 1) * pageSize + idx)}
								{@const current = bulkMap[s.userId] ?? { status: 'belum_hadir', manualReason: '' }}
								<tr class="hover:bg-slate-50/80 transition-colors">
									<td class="py-3 px-4 font-mono text-xs text-slate-400">{(currentPage - 1) * pageSize + idx + 1}</td>
									<td class="py-3 px-4">
										<div class="flex items-center gap-3">
											<div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
												{s.fullName.charAt(0)}
											</div>
											<div>
												<div class="font-bold text-slate-900 text-sm">{s.fullName}</div>
												<div class="type-mono text-slate-500">@{s.username}</div>
											</div>
										</div>
									</td>
									<td class="py-3 px-4">
										<!-- Perfectly Balanced Radio Card Grid (h-9 / 36px) -->
										<div class="grid grid-cols-3 gap-2 w-full max-w-md" role="radiogroup" aria-label="Status Kehadiran {s.fullName}">
											<!-- Hadir Option Card -->
											<label
												class="flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none shadow-2xs
													{current.status === 'hadir'
														? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-400/50'
														: 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'}"
											>
												<input
													type="radio"
													name="status-{s.userId}"
													value="hadir"
													checked={current.status === 'hadir'}
													onchange={() => setSingleStudentStatus(s.userId, 'hadir')}
													class="sr-only"
												/>
												<span class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors {current.status === 'hadir' ? 'border-white bg-white' : 'border-slate-400'}">
													{#if current.status === 'hadir'}
														<span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
													{/if}
												</span>
												<span>HADIR</span>
											</label>

											<!-- Excused Option Card -->
											<label
												class="flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none shadow-2xs
													{current.status === 'excused'
														? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-1 ring-amber-400/50'
														: 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:bg-amber-50/40'}"
											>
												<input
													type="radio"
													name="status-{s.userId}"
													value="excused"
													checked={current.status === 'excused'}
													onchange={() => setSingleStudentStatus(s.userId, 'excused')}
													class="sr-only"
												/>
												<span class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors {current.status === 'excused' ? 'border-white bg-white' : 'border-slate-400'}">
													{#if current.status === 'excused'}
														<span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
													{/if}
												</span>
												<span>EXCUSED</span>
											</label>

											<!-- Belum Presensi Option Card -->
											<label
												class="flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none shadow-2xs
													{current.status === 'belum_hadir'
														? 'bg-slate-700 text-white border-slate-800 shadow-xs ring-1 ring-slate-400/50'
														: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'}"
											>
												<input
													type="radio"
													name="status-{s.userId}"
													value="belum_hadir"
													checked={current.status === 'belum_hadir'}
													onchange={() => setSingleStudentStatus(s.userId, 'belum_hadir')}
													class="sr-only"
												/>
												<span class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors {current.status === 'belum_hadir' ? 'border-white bg-white' : 'border-slate-400'}">
													{#if current.status === 'belum_hadir'}
														<span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
													{/if}
												</span>
												<span>BELUM</span>
											</label>
										</div>
									</td>
									<td class="py-3 px-4">
										<input
											type="text"
											bind:value={bulkMap[s.userId].manualReason}
											placeholder="Catatan khusus..."
											class="field-input py-1.5 px-3 text-xs"
										/>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>

				<div class="p-4 border-t border-slate-100">
					<PaginationFooter
						currentPage={currentPage}
						totalPages={totalPages}
						totalItems={totalItems}
						pageSize={pageSize}
						onPageChange={(p) => (currentPage = p)}
					/>
				</div>
			</div>
		{:else}
			<!-- READ-ONLY ATTENDANCE TABLE PANEL -->
			<div class="panel overflow-hidden">
				<div class="section-header">
					<div class="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
						</svg>
						<span>Daftar Presensi Kehadiran Siswa</span>
						<span class="type-mono text-muted text-xs">({filteredStudents.length} Siswa)</span>
					</div>

					<button
						type="button"
						onclick={() => (isBulkEditMode = true)}
						class="btn-presensi text-xs px-3.5 py-1.5"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						<span>Mode Edit Presensi Bulk</span>
					</button>
				</div>

				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-slate-50 border-bottom text-xs font-extrabold text-slate-600 uppercase">
							<th class="py-3 px-4">Nama Siswa</th>
							<th class="py-3 px-4">Status Presensi</th>
							<th class="py-3 px-4">Metode Input</th>
							<th class="py-3 px-4">Alasan / Catatan</th>
							<th class="py-3 px-4">Waktu Dicatat</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#if filteredStudents.length === 0}
							<tr>
								<td colspan="5" class="p-0">
									<EmptyState
										title="Tidak Ada Data Siswa"
										description="Coba sesuaikan kata kunci pencarian atau filter status presensi."
										iconTheme="slate"
									/>
								</td>
							</tr>
						{:else}
							{#each paginatedStudents as s (s.userId)}
								<tr class="hover:bg-slate-50/80 transition-colors">
									<td class="py-3 px-4">
										<div class="flex items-center gap-3">
											<div class="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
												{s.fullName.charAt(0)}
											</div>
											<div>
												<div class="font-bold text-slate-900 text-sm">{s.fullName}</div>
												<div class="type-mono text-slate-500">@{s.username}</div>
											</div>
										</div>
									</td>
									<td class="py-3 px-4">
										{#if s.status === 'hadir'}
											<span class="badge badge-hadir">HADIR</span>
										{:else if s.status === 'excused'}
											<span class="badge badge-excused">EXCUSED / IZIN</span>
										{:else}
											<span class="badge badge-absen">BELUM PRESENSI</span>
										{/if}
									</td>
									<td class="py-3 px-4">
										{#if s.method === 'qr'}
											<span class="badge badge-hadir">Scan QR</span>
										{:else if s.method === 'manual'}
											<span class="badge badge-excused">Manual Mentor</span>
										{:else}
											<span class="text-slate-400 text-xs">-</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-xs font-medium text-slate-600">
										{s.manualReason || '-'}
									</td>
									<td class="py-3 px-4 text-xs font-mono text-slate-600">
										{formatIndoTime(s.recordedAt)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>

				{#if filteredStudents.length > 0}
					<div class="p-4 border-t border-slate-100">
						<PaginationFooter
							currentPage={currentPage}
							totalPages={totalPages}
							totalItems={totalItems}
							pageSize={pageSize}
							onPageChange={(p) => (currentPage = p)}
						/>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

{#if isQRExpanded}
	<div
		class="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-label="Mode Proyektor Kode QR Presensi"
	>
		<div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center relative">
			<button
				type="button"
				onclick={() => (isQRExpanded = false)}
				class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-all"
				title="Tutup Mode Proyektor (Esc)"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			<div class="mb-4">
				<span class="badge badge-live mb-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs">
					<span>MODE PROYEKTOR · ROTASI {countdownSeconds}s</span>
				</span>
				{#if currentMeeting}
					<h3 class="font-extrabold text-slate-900 text-xl leading-tight">{currentMeeting.title}</h3>
					<p class="text-xs text-slate-500 mt-1 font-medium">{currentMeeting.kelasName} · {currentMeeting.subPhaseTitle}</p>
				{/if}
			</div>

			{#if qrDataUrl}
				<div class="p-4 bg-white border-2 border-indigo-100 rounded-3xl shadow-md mb-5 flex items-center justify-center">
					<img src={qrDataUrl} alt="Kode QR Presensi Proyektor" class="w-72 h-72 sm:w-80 sm:h-80 rounded-xl object-contain" />
				</div>
			{:else}
				<div class="w-72 h-72 sm:w-80 sm:h-80 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 mb-5">
					<span class="text-xs font-semibold">Memuat Kode QR...</span>
				</div>
			{/if}

			<div class="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-widest bg-slate-100 px-6 py-2.5 rounded-2xl mb-4 border border-slate-300/60 shadow-xs select-all">
				{currentToken}
			</div>

			<div class="w-72 sm:w-80 h-2.5 bg-slate-200 rounded-full overflow-hidden mb-5">
				<div
					class="h-full bg-indigo-600 transition-all duration-1000 rounded-full"
					style="width: {(countdownSeconds / 30) * 100}%;"
				></div>
			</div>

			<div class="flex items-center gap-3">
				<button type="button" onclick={copyTokenToClipboard} class="btn-ghost text-xs py-2 px-4">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					<span>Salin Kode Token</span>
				</button>
				<button type="button" onclick={() => (isQRExpanded = false)} class="btn-create text-xs py-2 px-5">
					<span>Tutup Proyektor [Esc]</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.content-area {
		padding: 24px 28px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1300px;
		margin: 0 auto;
		width: 100%;
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		margin-bottom: 4px;
	}

	.bc-link {
		color: var(--text-muted);
		font-weight: 500;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
	}

	.btn-presensi {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--primary);
		color: white;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		padding: 8px 16px;
		border-radius: var(--radius-md);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-presensi:hover {
		background: #4338ca;
		color: white;
		transform: translateY(-1px);
	}

	.btn-secondary-head-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-secondary-head-pill:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #94a3b8;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}
</style>

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import { Html5Qrcode } from 'html5-qrcode';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PaginationFooter from '$lib/components/ui/PaginationFooter.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type MeetingItem = (typeof data.meetings)[number];

	// ── Filters & Search State (All 4 Filters with Mobile Toggle) ────────
	let searchQuery = $state('');
	let selectedActivity = $state<string | number | null>('all');
	let selectedTimeFilter = $state<string | number | null>('all');
	let selectedAttendanceFilter = $state<string | number | null>('all');
	let sortBy = $state<string>('date_desc');
	let showMobileFilters = $state(false);

	// ── Detail Drawer State ─────────────────────────────────────────────
	let selectedDetailMeeting = $state<MeetingItem | null>(null);
	let showDetailDrawer = $state(false);
	let drawerTaskLink = $state('');
	let isDrawerTaskSubmitting = $state(false);
	let isDrawerTaskEditing = $state(false);

	// ── Drawer Task Cancel Modal State ──────────────────────────────────
	let showCancelConfirmModal = $state(false);
	let cancelTargetSubmission = $state<{ id: number; title: string } | null>(null);
	let isCancelling = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Operasi berhasil!');
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	function promptCancelDrawerTask(subId: number, taskTitle: string) {
		cancelTargetSubmission = { id: subId, title: taskTitle };
		showCancelConfirmModal = true;
	}

	function handleConfirmCancelSubmission() {
		const formEl = document.getElementById('cancel-meeting-task-form') as HTMLFormElement;
		if (formEl) {
			formEl.requestSubmit();
		}
	}

	// ── Pagination State ────────────────────────────────────────────────
	let currentPage = $state(1);
	let itemsPerPage = $state<number>(10);

	const pageSizeOptions = [
		{ value: 5, label: '5 Data / Halaman' },
		{ value: 10, label: '10 Data / Halaman' },
		{ value: 25, label: '25 Data / Halaman' },
		{ value: 50, label: '50 Data / Halaman' }
	];

	// ── Camera Scanner & Token State ─────────────────────────────────────
	let qrTokenInput = $state('');
	let isSubmitting = $state(false);
	let scanErrorMessage = $state('');
	let hasAutoSubmitted = $state(false);

	interface CameraDevice {
		id: string;
		label: string;
	}

	let isCameraOpen = $state(false);
	let isCameraLoading = $state(false);
	let openedFromDashboard = $state(false);
	let cameraError = $state('');
	let availableCameras = $state<CameraDevice[]>([]);
	let selectedDeviceId = $state<string>('');
	let html5QrcodeInstance: Html5Qrcode | null = null;

	let zoomLevel = $state(1);
	let minZoom = $state(1);
	let maxZoom = $state(4);

	const cameraSelectOptions = $derived(
		availableCameras.map((c) => ({
			value: c.id,
			label: c.label
		}))
	);

	let scanSuccessResult = $state<{
		message: string;
		pointsAwarded: number;
		currentStreak: number;
		milestoneBonusAwarded: number;
	} | null>(null);

	const streakInfo = $derived(data.streakInfo ?? { currentStreak: 0 });
	const stats = $derived(
		data.stats ?? { totalSessions: 0, totalHadir: 0, totalExcused: 0, attendancePercentage: 0 }
	);

	const currentStreak = $derived(streakInfo.currentStreak || 0);
	const nextMilestone = $derived.by(() => {
		const cur = currentStreak;
		if (cur < 3) return { streak: 3, bonus: 50 };
		if (cur < 5) return { streak: 5, bonus: 100 };
		if (cur < 10) return { streak: 10, bonus: 250 };
		if (cur < 15) return { streak: 15, bonus: 500 };
		return { streak: 20, bonus: 1000 };
	});

	const milestoneProgressPercent = $derived.by(() => {
		const target = nextMilestone.streak;
		return Math.min(100, Math.round((currentStreak / target) * 100));
	});

	// Date helpers
	let todayStr = new Date().toISOString().slice(0, 10);

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

	function formatIndoDateWithDay(dateVal: Date | string | null | undefined): string {
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
		const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
		const bulanIndo = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];
		return `${days[d.getDay()]}, ${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
	}

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

	function formatIndoTime(dateStr: Date | string | null): string {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return '-';
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${hh}:${mm} WIB`;
	}

	function getMeetingStatus(m: MeetingItem): 'live' | 'upcoming' | 'completed' {
		if (m.isLive) return 'live';

		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		const localTodayStr = `${yyyy}-${mm}-${dd}`;

		const sessionDateStr = String(m.sessionDate || '').slice(0, 10);

		if (sessionDateStr < localTodayStr) return 'completed';
		if (sessionDateStr > localTodayStr) return 'upcoming';

		const currentMinutes = now.getHours() * 60 + now.getMinutes();

		const [startH, startM] = (m.startTime || '00:00').split(':').map(Number);
		const [endH, endM] = (m.endTime || '23:59').split(':').map(Number);

		const startMinutes = (startH || 0) * 60 + (startM || 0);
		const endMinutes = (endH || 0) * 60 + (endM || 0);

		if (currentMinutes >= startMinutes - 30 && currentMinutes <= endMinutes + 60) {
			return 'live';
		}
		if (currentMinutes < startMinutes - 30) {
			return 'upcoming';
		}
		return 'completed';
	}

	function getActivityBadgeStyle(type: string): { bg: string; text: string; border: string; label: string } {
		switch (type) {
			case 'teori':
				return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'TEORI' };
			case 'praktik':
				return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'PRAKTIK' };
			case 'teori_praktik':
				return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'TEORI & PRAKTIK' };
			case 'games':
				return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'GAMES' };
			case 'quiz':
				return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'QUIZ' };
			default:
				return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'SANTAI' };
		}
	}

	function getTaskSizeBadge(size: string | null | undefined) {
		switch (size) {
			case 'kecil':
				return { label: 'SKALA KECIL', points: '+100 Poin', color: 'bg-sky-50 text-sky-700 border-sky-200' };
			case 'besar':
				return { label: 'SKALA BESAR', points: '+500 Poin', color: 'bg-purple-50 text-purple-700 border-purple-200' };
			default:
				return { label: 'SKALA SEDANG', points: '+250 Poin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
		}
	}

	function getFileExt(url: string | null | undefined): string {
		if (!url) return 'FILE';
		const clean = url.split('?')[0];
		const parts = clean.split('.');
		const ext = parts[parts.length - 1]?.toUpperCase() ?? 'FILE';
		if (ext.length > 5 || ext === clean.toUpperCase()) return 'LINK';
		return ext;
	}

	// Active filter count & boolean
	const activeFilterCount = $derived.by(() => {
		let cnt = 0;
		if (selectedActivity && selectedActivity !== 'all') cnt++;
		if (selectedTimeFilter && selectedTimeFilter !== 'all') cnt++;
		if (selectedAttendanceFilter && selectedAttendanceFilter !== 'all') cnt++;
		if (sortBy && sortBy !== 'date_desc') cnt++;
		return cnt;
	});

	let isFilterActive = $derived(
		searchQuery.trim() !== '' || activeFilterCount > 0
	);

	function resetFilters() {
		searchQuery = '';
		selectedActivity = 'all';
		selectedTimeFilter = 'all';
		selectedAttendanceFilter = 'all';
		sortBy = 'date_desc';
		currentPage = 1;
	}

	// Filtered & sorted meetings list
	let filteredMeetings = $derived(
		(data.meetings || [])
			.filter((m) => {
				const matchSearch =
					searchQuery === '' ||
					m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(m.subPhaseTitle && m.subPhaseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
					(m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));

				const matchActivity =
					!selectedActivity || selectedActivity === 'all' || m.activityType === String(selectedActivity);

				let matchTime = true;
				if (selectedTimeFilter === 'upcoming') {
					matchTime = m.sessionDate >= todayStr;
				} else if (selectedTimeFilter === 'today') {
					matchTime = m.sessionDate === todayStr;
				} else if (selectedTimeFilter === 'past') {
					matchTime = m.sessionDate < todayStr;
				}

				let matchAttendance = true;
				if (selectedAttendanceFilter === 'hadir') {
					matchAttendance = m.attendanceStatus === 'hadir';
				} else if (selectedAttendanceFilter === 'excused') {
					matchAttendance = m.attendanceStatus === 'excused';
				} else if (selectedAttendanceFilter === 'absen') {
					matchAttendance = m.attendanceStatus === 'absen' || m.attendanceStatus === 'none';
				}

				return matchSearch && matchActivity && matchTime && matchAttendance;
			})
			.sort((a, b) => {
				if (sortBy === 'date_asc') return a.sessionDate.localeCompare(b.sessionDate);
				if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
				if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
				return b.sessionDate.localeCompare(a.sessionDate);
			})
	);

	// Pagination calculations
	let totalPages = $derived(Math.ceil(filteredMeetings.length / itemsPerPage) || 1);

	let paginatedMeetings = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredMeetings.slice(start, start + itemsPerPage);
	});

	// Reset pagination on filter change
	$effect(() => {
		searchQuery;
		selectedActivity;
		selectedTimeFilter;
		selectedAttendanceFilter;
		sortBy;
		itemsPerPage;
		currentPage = 1;
	});

	// Drawer opener
	function openMeetingDetail(meeting: MeetingItem) {
		selectedDetailMeeting = meeting;
		drawerTaskLink = meeting.task?.submission?.link || '';
		isDrawerTaskEditing = false;
		showDetailDrawer = true;
	}

	function closeMeetingDetail() {
		showDetailDrawer = false;
		selectedDetailMeeting = null;
		drawerTaskLink = '';
		isDrawerTaskEditing = false;
	}

	// Camera Scanner logic
	async function loadAvailableCameras() {
		try {
			const devices = await Html5Qrcode.getCameras();
			if (devices && devices.length > 0) {
				availableCameras = devices.map((d, i) => ({
					id: d.id,
					label: d.label || `Kamera ${i + 1}`
				}));

				if (!selectedDeviceId) {
					const mainRear =
						devices.find((d) => {
							const lbl = d.label.toLowerCase();
							return (
								(lbl.includes('back') ||
									lbl.includes('rear') ||
									lbl.includes('0') ||
									lbl.includes('main') ||
									lbl.includes('utama')) &&
								!lbl.includes('wide') &&
								!lbl.includes('0.5') &&
								!lbl.includes('front')
							);
						}) ||
						devices.find((d) => {
							const lbl = d.label.toLowerCase();
							return (lbl.includes('back') || lbl.includes('rear')) && !lbl.includes('0.5');
						}) ||
						devices[0];

					selectedDeviceId = mainRear.id;
				}
			}
		} catch (err) {
			console.warn('Gagal membaca daftar kamera device:', err);
		}
	}

	async function setZoom(newZoom: number) {
		zoomLevel = Math.max(minZoom, Math.min(maxZoom, Number(newZoom.toFixed(1))));

		if (html5QrcodeInstance) {
			try {
				const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement;
				const track = (videoEl?.srcObject as MediaStream)?.getVideoTracks()?.[0];
				if (track) {
					const caps = track.getCapabilities ? (track.getCapabilities() as any) : {};
					if ('zoom' in caps) {
						minZoom = caps.zoom?.min || 1;
						maxZoom = caps.zoom?.max || 4;
						await track.applyConstraints({
							advanced: [{ zoom: zoomLevel }] as any
						});
					}
				}
			} catch {}
		}

		const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement;
		if (videoEl) {
			videoEl.style.transform = `scale(${zoomLevel})`;
			videoEl.style.transformOrigin = 'center center';
			videoEl.style.transition = 'transform 150ms ease-out';
		}
	}

	async function startCameraScanner(targetDeviceId?: string) {
		isCameraOpen = true;
		isCameraLoading = true;
		cameraError = '';
		zoomLevel = 1;

		try {
			await loadAvailableCameras();
			await new Promise((r) => setTimeout(r, 150));

			if (html5QrcodeInstance) {
				try {
					if (html5QrcodeInstance.isScanning) {
						await html5QrcodeInstance.stop();
					}
				} catch {}
				html5QrcodeInstance = null;
			}

			html5QrcodeInstance = new Html5Qrcode('qr-reader');

			const chosenId = targetDeviceId || selectedDeviceId;
			const config = chosenId ? { deviceId: { exact: chosenId } } : { facingMode: 'environment' };

			const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
				const minEdgePercentage = 0.75;
				const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
				const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
				return { width: qrboxSize, height: qrboxSize };
			};

			await html5QrcodeInstance.start(
				config,
				{
					fps: 10,
					qrbox: qrboxFunction
				},
				(decodedText) => {
					stopCameraScanner();
					let tokenVal = decodedText.trim();
					if (tokenVal.includes('token=')) {
						try {
							const parsed = new URL(tokenVal);
							tokenVal = parsed.searchParams.get('token') || tokenVal;
						} catch {}
					}
					qrTokenInput = tokenVal;
					submitToken(tokenVal);
				},
				() => {}
			);
		} catch (err: any) {
			if (targetDeviceId || selectedDeviceId) {
				try {
					const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
						const minEdgePercentage = 0.75;
						const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
						const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
						return { width: qrboxSize, height: qrboxSize };
					};

					await html5QrcodeInstance?.start(
						{ facingMode: 'environment' },
						{ fps: 10, qrbox: qrboxFunction },
						(decodedText) => {
							stopCameraScanner();
							let tokenVal = decodedText.trim();
							if (tokenVal.includes('token=')) {
								try {
									const parsed = new URL(tokenVal);
									tokenVal = parsed.searchParams.get('token') || tokenVal;
								} catch {}
							}
							qrTokenInput = tokenVal;
							submitToken(tokenVal);
						},
						() => {}
					);
					return;
				} catch {}
			}
			cameraError =
				'Gagal mengakses kamera: ' +
				(err?.message || 'Pastikan izin kamera sudah diberikan di browser Anda.');
		} finally {
			isCameraLoading = false;
		}
	}

	async function stopCameraScanner() {
		if (html5QrcodeInstance) {
			try {
				if (html5QrcodeInstance.isScanning) {
					await html5QrcodeInstance.stop();
				}
			} catch {}
			html5QrcodeInstance = null;
		}
		isCameraOpen = false;
		isCameraLoading = false;

		if (openedFromDashboard) {
			goto('/siswa');
		}
	}

	async function onCameraSelectChange(val: string | number | null) {
		if (val) {
			selectedDeviceId = String(val);
			await startCameraScanner(String(val));
		}
	}

	async function submitToken(tokenToSubmit: string) {
		if (!tokenToSubmit.trim() || isSubmitting) return;

		isSubmitting = true;
		scanErrorMessage = '';
		scanSuccessResult = null;

		try {
			const res = await fetch('/api/attendance/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: tokenToSubmit.trim() })
			});

			const json = await res.json();
			if (json.success) {
				scanSuccessResult = {
					message: json.message,
					pointsAwarded: json.points?.pointsAwarded ?? 100,
					currentStreak: json.points?.currentStreak ?? 1,
					milestoneBonusAwarded: json.points?.milestoneBonusAwarded ?? 0
				};
				toast.success(json.message);
				qrTokenInput = '';
				await invalidateAll();
			} else {
				scanErrorMessage = json.message || 'Token presensi tidak valid atau sudah kadaluarsa.';
				toast.error(scanErrorMessage);
			}
		} catch (err: any) {
			scanErrorMessage = err.message || 'Terjadi kesalahan jaringan saat mengirimkan presensi.';
			toast.error(scanErrorMessage);
		} finally {
			isSubmitting = false;
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		if (params.get('scan') === 'true') {
			openedFromDashboard = true;
			if (window.history && window.history.replaceState) {
				window.history.replaceState({}, '', window.location.pathname);
			}
			startCameraScanner();
		}

		if (data.urlToken && data.urlToken.trim()) {
			try {
				sessionStorage.setItem('pending_qr_token', data.urlToken.trim());
			} catch {}
		}

		let pendingToken: string | null = (data.urlToken && data.urlToken.trim()) || null;
		if (!pendingToken) {
			try {
				pendingToken = sessionStorage.getItem('pending_qr_token');
			} catch {}
		}

		const cleanToken = pendingToken ? pendingToken.trim() : '';

		if (cleanToken && !hasAutoSubmitted) {
			hasAutoSubmitted = true;
			qrTokenInput = cleanToken;

			try {
				sessionStorage.removeItem('pending_qr_token');
			} catch {}

			if (window.history && window.history.replaceState) {
				window.history.replaceState({}, '', window.location.pathname);
			}

			submitToken(cleanToken);
		}
	});

	// Active Live Session Derivation
	let activeLiveMeeting = $derived(
		data.meetings.find((m) => getMeetingStatus(m) === 'live') || null
	);

	let manualActiveToken = $state('');
	let isSubmittingManualActive = $state(false);

	async function handleManualActiveTokenSubmit(e: Event) {
		e.preventDefault();
		if (!manualActiveToken.trim()) return;
		isSubmittingManualActive = true;
		try {
			await submitToken(manualActiveToken.trim());
			manualActiveToken = '';
		} finally {
			isSubmittingManualActive = false;
		}
	}
</script>

<svelte:head>
	<title>Jadwal &amp; Sesi Pertemuan — Portal Siswa NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Card (Single Source of Truth Blueprint) -->
	<PageHeaderCard
		title="Jadwal & Sesi Pertemuan"
		breadcrumbs={[
			{ label: 'Beranda', href: '/siswa' },
			{ label: 'Jadwal & Sesi Pertemuan' }
		]}
	>
		{#snippet badges()}
			{#if data.membership}
				<span class="badge badge-active-class">Kelas: {data.membership.kelasName}</span>
			{/if}
		{/snippet}
	</PageHeaderCard>

	<!-- Celebration / Scan Result Notification if active -->
	{#if scanSuccessResult}
		<div class="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-xs">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<div>
					<h3 class="font-extrabold text-emerald-900 text-sm">Presensi Berhasil Dicatat!</h3>
					<p class="text-xs text-emerald-700 font-medium mt-0.5">{scanSuccessResult.message}</p>
				</div>
			</div>

			<div class="flex items-center gap-2 flex-wrap">
				<span class="badge-status badge-hadir text-xs px-3 py-1 font-bold">
					+ {scanSuccessResult.pointsAwarded} Poin Presensi
				</span>
				{#if scanSuccessResult.milestoneBonusAwarded > 0}
					<span class="badge-status badge-excused text-xs px-3 py-1 font-bold">
						Bonus Milestone +{scanSuccessResult.milestoneBonusAwarded} Poin!
					</span>
				{/if}
				<button
					type="button"
					onclick={() => (scanSuccessResult = null)}
					class="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 px-2 py-1"
				>
					Tutup
				</button>
			</div>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     CONTAINER SECTION: PRESENSI SESI AKTIF
	     ══════════════════════════════════════════════════════════ -->
	{#if activeLiveMeeting}
		{@const liveM = activeLiveMeeting}
		{@const isPresent = liveM.attendanceStatus === 'hadir' || liveM.attendanceStatus === 'excused'}
		<div class="active-session-card {isPresent ? 'active-session-card--present' : 'active-session-card--live'}">
			<div class="active-session-head">
				<div class="flex items-center gap-2.5 flex-wrap">
					{#if !isPresent}
						<span class="badge-live-pulse">
							<span class="pulse-indicator"></span>
							SESI AKTIF BERLANGSUNG
						</span>
					{:else}
						<span class="badge-present-verified">
							✓ SUDAH PRESENSI ({liveM.attendanceStatus.toUpperCase()})
						</span>
					{/if}

					<span class="active-time-tag">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<span>{liveM.startTime} - {liveM.endTime} WIB</span>
					</span>

					{#if liveM.location}
						<span class="active-room-tag">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
								<circle cx="12" cy="10" r="3" />
							</svg>
							<span>{liveM.location}</span>
						</span>
					{/if}
				</div>

				<button
					type="button"
					onclick={() => openMeetingDetail(liveM)}
					class="btn-active-detail"
				>
					<span>Detail Sesi</span>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</button>
			</div>

			<div class="active-session-body">
				<div class="active-session-info">
					<h2 class="active-session-title">{liveM.title}</h2>
					{#if liveM.subPhaseTitle}
						<p class="active-session-sub">{liveM.phaseTitle} &rsaquo; {liveM.subPhaseTitle}</p>
					{/if}
				</div>

				{#if !isPresent}
					<!-- Action Row: Scan QR & Manual Input -->
					<div class="active-actions-row">
						<button
							type="button"
							onclick={() => startCameraScanner()}
							class="btn-active-scan-qr"
						>
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<rect x="3" y="3" width="7" height="7" rx="1.5" />
								<rect x="14" y="3" width="7" height="7" rx="1.5" />
								<rect x="3" y="14" width="7" height="7" rx="1.5" />
								<rect x="14" y="14" width="7" height="7" rx="1.5" />
							</svg>
							<span>Scan QR Presensi</span>
						</button>

						<div class="active-or-divider">
							<span>atau</span>
						</div>

						<form onsubmit={handleManualActiveTokenSubmit} class="active-token-form">
							<input
								type="text"
								bind:value={manualActiveToken}
								placeholder="Masukkan kode token QR..."
								class="active-token-input"
							/>
							<button
								type="submit"
								disabled={isSubmittingManualActive || isSubmitting || !manualActiveToken.trim()}
								class="btn-active-token-submit"
							>
								{#if isSubmittingManualActive || isSubmitting}
									<span>Mengirim...</span>
								{:else}
									<span>Kirim Presensi</span>
								{/if}
							</button>
						</form>
					</div>
				{:else}
					<!-- Already Verified Info Row -->
					<div class="active-present-row">
						<div class="flex items-center gap-2 text-xs font-semibold text-emerald-900">
							<div class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
								✓
							</div>
							<span>Presensi kamu telah diverifikasi (+{liveM.isWeekend ? 150 : 100} Poin Kehadiran). Selamat belajar!</span>
						</div>

						<div class="flex items-center gap-2 flex-wrap">
							{#if liveM.materialUrl}
								<a
									href={liveM.materialUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="btn-active-slide-link"
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
									</svg>
									<span>Buka Slide PPT</span>
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Overview Key Metrics (4 Reusable StatCard Components) -->
	<div class="stats-grid">
		<!-- Card 1: Total Sesi Pertemuan -->
		<StatCard
			label="Sesi Pertemuan"
			value={stats.totalSessions}
			subtext="Total Sesi Terjadwal"
			variant="total"
			pillText="{stats.totalSessions} Total"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			{/snippet}
		</StatCard>

		<!-- Card 2: Persentase Kehadiran -->
		<StatCard
			label="Persentase Kehadiran"
			value="{stats.attendancePercentage}%"
			subtext="{stats.totalHadir} dari {stats.totalSessions} Sesi Hadir"
			variant="approved"
			pillText="{stats.attendancePercentage}%"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			{/snippet}
		</StatCard>

		<!-- Card 3: Total Hadir & Izin -->
		<StatCard
			label="Total Hadir & Izin"
			value={stats.totalHadir + stats.totalExcused}
			subtext="Hadir: {stats.totalHadir} | Izin: {stats.totalExcused}"
			variant="pending"
			pillText="{stats.totalHadir + stats.totalExcused} Sesi"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 11 12 14 22 4" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
				</svg>
			{/snippet}
		</StatCard>

		<!-- Card 4: Streak Pertemuan -->
		<StatCard
			label="Streak Kehadiran"
			value="{currentStreak} Sesi"
			subtext="Next: {nextMilestone.streak} Sesi"
			variant="streak"
			pillText="+{nextMilestone.bonus} Pts"
		>
			{#snippet icon()}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
			{/snippet}
		</StatCard>
	</div>

	<!-- Page Filter Card: 4 Complete Filters with Mobile Toggle -->
	<div class="page-filter-card">
		<!-- Row 1: Search Bar & Actions (Filter Toggle Button + Reset Button) -->
		<div class="filter-row-top">
			<div class="flex-1 min-w-0">
				<TextInput
					id="search-pertemuan-input"
					label="Cari Sesi Pertemuan"
					placeholder="Cari judul sesi, topik sub-fase, ruangan..."
					clearable={true}
					bind:value={searchQuery}
				/>
			</div>

			<div class="filter-top-actions">
				<!-- Mobile Filter Toggle Button (Shows/Hides 4 Filters on Mobile) -->
				<button
					type="button"
					class="btn-mobile-filter-toggle {showMobileFilters || activeFilterCount > 0 ? 'btn-mobile-filter-toggle--active' : ''}"
					onclick={() => (showMobileFilters = !showMobileFilters)}
					aria-expanded={showMobileFilters}
					title="Buka / Sembunyikan Filter"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
					</svg>
					<span class="mobile-filter-btn-text">Filter</span>
					{#if activeFilterCount > 0}
						<span class="mobile-filter-count-badge">{activeFilterCount}</span>
					{/if}
				</button>

				{#if isFilterActive}
					<button
						type="button"
						class="btn-reset-filters-active"
						onclick={resetFilters}
						title="Reset Filter"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
						<span>Reset</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Row 2: 4 Complete Filters (Always visible on desktop/tablet, toggleable on mobile with zero overflow) -->
		<div class="filter-row-bottom {showMobileFilters ? 'filter-row-bottom--show-mobile' : ''}">
			<div class="filter-col-item">
				<CustomSelect
					id="activity-select-filter"
					label="Tipe Aktivitas"
					bind:value={selectedActivity}
					options={[
						{ value: 'all', label: 'Semua Aktivitas' },
						{ value: 'teori', label: 'Teori' },
						{ value: 'praktik', label: 'Praktik' },
						{ value: 'teori_praktik', label: 'Teori & Praktik' },
						{ value: 'games', label: 'Games' },
						{ value: 'quiz', label: 'Quiz' },
						{ value: 'santai', label: 'Santai' }
					]}
					searchable={false}
				/>
			</div>

			<div class="filter-col-item">
				<CustomSelect
					id="time-select-filter"
					label="Periode Waktu"
					bind:value={selectedTimeFilter}
					options={[
						{ value: 'all', label: 'Semua Periode' },
						{ value: 'upcoming', label: 'Mendatang (>= Hari Ini)' },
						{ value: 'today', label: 'Hari Ini' },
						{ value: 'past', label: 'Terlewat / Lampau' }
					]}
					searchable={false}
				/>
			</div>

			<div class="filter-col-item">
				<CustomSelect
					id="attendance-select-filter"
					label="Status Presensi"
					bind:value={selectedAttendanceFilter}
					options={[
						{ value: 'all', label: 'Semua Status' },
						{ value: 'hadir', label: 'Hadir' },
						{ value: 'excused', label: 'Izin / Sakit' },
						{ value: 'absen', label: 'Belum Presensi' }
					]}
					searchable={false}
				/>
			</div>

			<div class="filter-col-item">
				<CustomSelect
					id="sort-select-filter"
					label="Urutkan Sesi"
					bind:value={sortBy}
					options={[
						{ value: 'date_desc', label: 'Tanggal (Terbaru)' },
						{ value: 'date_asc', label: 'Tanggal (Terlama)' },
						{ value: 'title_asc', label: 'Judul (A - Z)' },
						{ value: 'title_desc', label: 'Judul (Z - A)' }
					]}
					searchable={false}
				/>
			</div>
		</div>
	</div>

	<!-- Card List Grid Container -->
	{#if filteredMeetings.length === 0}
		<EmptyState
			title="Tidak Ada Sesi Pertemuan Ditemukan"
			description="Coba ubah kata kunci pencarian atau sesuaikan kombinasi filter di atas."
			iconTheme="slate"
		/>
	{:else}
		<div class="meetings-card-grid">
			{#each paginatedMeetings as m (m.id)}
				<div class="pertemuan-card {getMeetingStatus(m) === 'live' ? 'pertemuan-card--live' : ''}">
					<div class="pertemuan-card-body">
						<!-- Card Top Info Row -->
						<div class="card-top-row">
							<div class="flex items-center gap-1.5 flex-wrap">
								<span class="activity-badge {getActivityBadgeStyle(m.activityType).bg} {getActivityBadgeStyle(m.activityType).text} {getActivityBadgeStyle(m.activityType).border}">
									{getActivityBadgeStyle(m.activityType).label}
								</span>
								{#if m.isWeekend}
									<span class="weekend-badge">WEEKEND</span>
								{/if}
							</div>

							<!-- Meeting Time Status Pill -->
							<div>
								{#if getMeetingStatus(m) === 'live'}
									<span class="status-pill-live">LIVE HARI INI</span>
								{:else if getMeetingStatus(m) === 'upcoming'}
									<span class="status-pill-upcoming">AKAN DATANG</span>
								{:else}
									<span class="status-pill-completed">SELESAI</span>
								{/if}
							</div>
						</div>

						<!-- Title & Sub-phase Topic -->
						<h3 class="pertemuan-title">
							{m.title}
						</h3>
						<p class="pertemuan-subphase">
							{m.phaseTitle} &rsaquo; {m.subPhaseTitle}
						</p>

						<!-- Date, Time, Location Info Box -->
						<div class="pertemuan-meta-box">
							<div class="meta-item">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="4" width="18" height="18" rx="2" />
									<line x1="16" y1="2" x2="16" y2="6" />
									<line x1="8" y1="2" x2="8" y2="6" />
									<line x1="3" y1="10" x2="21" y2="10" />
								</svg>
								<span>{formatIndoDate(m.sessionDate)}</span>
							</div>

							<div class="meta-item">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10" />
									<polyline points="12 6 12 12 16 14" />
								</svg>
								<span>{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</span>
							</div>

							{#if m.location}
								<div class="meta-item">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
									<span>{m.location}</span>
								</div>
							{/if}
						</div>

						<!-- Bottom Row: Attendance Status & Material / Task Tag -->
						<div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
							<div>
								{#if m.attendanceStatus === 'hadir'}
									<span class="badge-status badge-hadir flex items-center gap-1 font-bold">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
											<polyline points="20 6 9 17 4 12"/>
										</svg>
										<span>HADIR ({m.attendance?.method === 'qr' ? 'Scan QR' : 'Manual'})</span>
									</span>
								{:else if m.attendanceStatus === 'excused'}
									<span class="badge-status badge-excused flex items-center gap-1 font-bold">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<circle cx="12" cy="12" r="10"/>
											<line x1="12" y1="8" x2="12" y2="12"/>
											<line x1="12" y1="16" x2="12.01" y2="16"/>
										</svg>
										<span>IZIN / SAKIT</span>
									</span>
								{:else}
									<span class="badge-status badge-absen font-bold">BELUM PRESENSI</span>
								{/if}
							</div>

							<!-- Unified Badge / Button Links (Slide PPT & Ada Tugas) -->
							<div class="flex items-center gap-2 flex-wrap">
								{#if m.materialUrl}
									<a
										href={m.materialUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="badge-pill-link badge-pill-materi"
										onclick={(e) => e.stopPropagation()}
										title="Buka Slide PPT"
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
										</svg>
										<span>Slide PPT</span>
									</a>
								{/if}

								{#if m.task}
									<a
										href={`/siswa/tugas?taskId=${m.task.id}`}
										class="badge-pill-link badge-pill-tugas"
										onclick={(e) => e.stopPropagation()}
										title="Buka Halaman Tugas"
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="9 11 12 14 22 4" />
											<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
										</svg>
										<span>Ada Tugas</span>
									</a>
								{/if}
							</div>
						</div>
					</div>

					<!-- Card Footer Action Buttons -->
					<div class="pertemuan-card-foot">
						<button
							type="button"
							onclick={() => openMeetingDetail(m)}
							class="btn-card-detail"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="10" r="10" />
								<line x1="12" y1="16" x2="12" y2="12" />
								<line x1="12" y1="8" x2="12.01" y2="8" />
							</svg>
							<span>Detail Sesi</span>
						</button>

						{#if getMeetingStatus(m) === 'live' && m.attendanceStatus !== 'hadir' && m.attendanceStatus !== 'excused'}
							<button
								type="button"
								onclick={() => startCameraScanner()}
								class="btn-card-presensi"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<rect x="3" y="3" width="7" height="7" rx="1.5" />
									<rect x="14" y="3" width="7" height="7" rx="1.5" />
									<rect x="3" y="14" width="7" height="7" rx="1.5" />
									<rect x="14" y="14" width="7" height="7" rx="1.5" />
								</svg>
								<span>Scan Presensi</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Reusable Pagination Footer Component -->
		<PaginationFooter
			currentPage={currentPage}
			totalPages={totalPages}
			totalItems={filteredMeetings.length}
			pageSize={itemsPerPage}
			onPageChange={(page) => (currentPage = page)}
		/>
	{/if}
</div>

<!-- ══════════════════════════════════════════════════════════
     HIGH-GRADE FORM DRAWER DETAIL PERTEMUAN (GOLD STANDARD)
     ══════════════════════════════════════════════════════════ -->
{#if selectedDetailMeeting}
	{@const sm = selectedDetailMeeting}
	<FormDrawer
		open={showDetailDrawer}
		title="Detail Sesi Pertemuan"
		subtitle={`Sesi #${sm.id} — ${sm.phaseTitle}`}
		onclose={closeMeetingDetail}
	>
		{#snippet children()}
			{#if selectedDetailMeeting}
				{@const meeting = selectedDetailMeeting}
				<div class="drawer-inner-content">
					<!-- 1. Hero Sesi Card Banner -->
					<div class="drawer-hero-banner">
						<div class="flex items-center justify-between gap-2 flex-wrap mb-2.5">
							<div class="flex items-center gap-1.5 flex-wrap">
								<span class="activity-badge {getActivityBadgeStyle(meeting.activityType).bg} {getActivityBadgeStyle(meeting.activityType).text} {getActivityBadgeStyle(meeting.activityType).border}">
									{getActivityBadgeStyle(meeting.activityType).label}
								</span>
								{#if meeting.isWeekend}
									<span class="weekend-badge">WEEKEND (+50% BONUS POIN)</span>
								{/if}
							</div>

							<div>
								{#if getMeetingStatus(meeting) === 'live'}
									<span class="status-pill-live">LIVE HARI INI</span>
								{:else if getMeetingStatus(meeting) === 'upcoming'}
									<span class="status-pill-upcoming">AKAN DATANG</span>
								{:else}
									<span class="status-pill-completed">SELESAI</span>
								{/if}
							</div>
						</div>

						<h2 class="drawer-session-title">
							{meeting.title}
						</h2>

						<div class="mt-3 flex items-center gap-2 text-xs text-slate-600 font-medium flex-wrap">
							<span class="text-slate-400">Track:</span>
							<span class="drawer-subphase-tag">
								{meeting.phaseTitle} &rsaquo; {meeting.subPhaseTitle}
							</span>
						</div>
					</div>

					<!-- 2. Grid 4-Stats Ringkas & Presisi -->
					<div class="drawer-stats-grid">
						<div class="drawer-stat-item">
							<div class="drawer-stat-icon bg-indigo-50 text-indigo-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="4" width="18" height="18" rx="2" />
									<line x1="16" y1="2" x2="16" y2="6" />
									<line x1="8" y1="2" x2="8" y2="6" />
									<line x1="3" y1="10" x2="21" y2="10" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<span class="drawer-stat-label">Hari &amp; Tanggal</span>
								<span class="drawer-stat-val text-slate-900">{formatIndoDateWithDay(meeting.sessionDate)}</span>
							</div>
						</div>

						<div class="drawer-stat-item">
							<div class="drawer-stat-icon bg-teal-50 text-teal-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10" />
									<polyline points="12 6 12 12 16 14" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<span class="drawer-stat-label">Jam Pelaksanaan</span>
								<span class="drawer-stat-val font-mono text-slate-900">
									{formatTimeOnly(meeting.startTime)} - {formatTimeOnly(meeting.endTime)} WIB
								</span>
							</div>
						</div>

						<div class="drawer-stat-item">
							<div class="drawer-stat-icon bg-purple-50 text-purple-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
									<circle cx="12" cy="10" r="3" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<span class="drawer-stat-label">Lokasi / Ruangan</span>
								<span class="drawer-stat-val text-slate-900 truncate">
									{meeting.location || 'Ruang Kelas Utama'}
								</span>
							</div>
						</div>

						<div class="drawer-stat-item">
							<div class="drawer-stat-icon bg-amber-50 text-amber-600">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<span class="drawer-stat-label">Bahan Pembelajaran</span>
								<span class="drawer-stat-val {meeting.materialUrl ? 'text-indigo-700 font-bold' : 'text-slate-500'}">
									{meeting.materialUrl ? 'Slide Tersedia' : 'Belum Ada Slide'}
								</span>
							</div>
						</div>
					</div>

					<!-- 3. Status Presensi Siswa Section Card -->
					<div class="drawer-section-card">
						<div class="drawer-section-head">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<polyline points="9 11 12 14 22 4" />
										<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
									</svg>
								</div>
								<h3 class="drawer-section-title">Status Presensi Siswa</h3>
							</div>

							<div>
								{#if meeting.attendanceStatus === 'hadir'}
									<span class="badge-status badge-hadir text-xs px-3 py-1 font-bold">
										HADIR ({meeting.attendance?.method === 'qr' ? 'Scan QR' : 'Manual Mentor'})
									</span>
								{:else if meeting.attendanceStatus === 'excused'}
									<span class="badge-status badge-excused text-xs px-3 py-1 font-bold">
										IZIN / SAKIT
									</span>
								{:else if getMeetingStatus(meeting) === 'completed'}
									<span class="badge-status badge-absen text-xs px-3 py-1 font-bold">ABSEN</span>
								{:else}
									<span class="badge-status bg-slate-100 text-slate-600 border border-slate-200 text-xs px-3 py-1 font-medium">BELUM PRESENSI</span>
								{/if}
							</div>
						</div>

						<div class="drawer-section-body space-y-3">
							{#if meeting.attendanceStatus === 'hadir'}
								<div class="drawer-verified-alert">
									<div class="flex items-center gap-2">
										<div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
											✓
										</div>
										<div class="text-xs text-emerald-900 font-medium">
											Kehadiran Anda telah diverifikasi oleh sistem.
										</div>
									</div>
									<span class="badge badge-approved shrink-0">
										+{meeting.isWeekend ? 150 : 100} Poin Presensi
									</span>
								</div>
							{/if}

							{#if meeting.attendance?.recordedAt}
								<div class="flex items-center justify-between text-xs border-t border-slate-100 pt-2.5">
									<span class="text-slate-500">Waktu Tercatat:</span>
									<span class="font-mono text-slate-800 font-bold">{formatIndoTime(meeting.attendance.recordedAt)}</span>
								</div>
							{/if}

							{#if meeting.attendance?.manualReason}
								<div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
									<span class="font-bold block mb-0.5">Catatan Mentor:</span>
									<p class="italic leading-relaxed">"{meeting.attendance.manualReason}"</p>
								</div>
							{/if}

							{#if getMeetingStatus(meeting) === 'live' && meeting.attendanceStatus !== 'hadir' && meeting.attendanceStatus !== 'excused'}
								<div class="drawer-live-alert">
									<div class="text-xs text-indigo-900 font-medium">
										Sesi sedang berlangsung! Segera lakukan scan QR Code presensi.
									</div>
									<button
										type="button"
										onclick={() => {
											closeMeetingDetail();
											startCameraScanner();
										}}
										class="btn-primary-action-sm"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<rect x="3" y="3" width="7" height="7" rx="1.5" />
											<rect x="14" y="3" width="7" height="7" rx="1.5" />
											<rect x="3" y="14" width="7" height="7" rx="1.5" />
											<rect x="14" y="14" width="7" height="7" rx="1.5" />
										</svg>
										<span>Scan QR Sekarang</span>
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- 4. Slide PPT & Modul Pembelajaran Card (hanya ditampilkan jika ada file slide terlampir) -->
					{#if meeting.materialUrl}
						<div class="drawer-section-card">
							<div class="drawer-section-head">
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
											<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
										</svg>
									</div>
									<h3 class="drawer-section-title">Slide PPT &amp; Modul Sesi</h3>
								</div>
							</div>

							<div class="drawer-section-body">
								<div class="drawer-file-card">
									<div class="flex items-center gap-3 min-w-0">
										<div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-xs">
											{getFileExt(meeting.materialUrl)}
										</div>
										<div class="min-w-0 flex-1">
											<h4 class="font-extrabold text-xs text-slate-900 block truncate">Slide Presentasi &amp; Modul</h4>
											<p class="text-[11px] text-slate-500 font-medium">Bahan ajar resmi untuk pertemuan ini</p>
										</div>
									</div>

									<a
										href={meeting.materialUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="btn-outline-action-sm"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
										<span>Buka Slide</span>
									</a>
								</div>
							</div>
						</div>
					{/if}

					<!-- 5. Penugasan Praktikum Section -->
					<div class="drawer-section-card">
						<div class="drawer-section-head">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="9 11 12 14 22 4" />
										<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
									</svg>
								</div>
								<h3 class="drawer-section-title">Penugasan Tugas Praktikum</h3>
							</div>

							{#if meeting.task}
								{@const sz = getTaskSizeBadge(meeting.task.taskSize)}
								<span class="badge {sz.color} text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border">
									{sz.label} ({sz.points})
								</span>
							{/if}
						</div>

						<div class="drawer-section-body">
							{#if meeting.task}
								{@const currentTask = meeting.task}
								<div class="drawer-task-card-container">
									<!-- Task Title & Instruction -->
									<div class="drawer-task-header-group">
										<h4 class="drawer-task-title-text">{currentTask.title}</h4>

										{#if currentTask.description}
											<div class="drawer-task-desc-box">
												<div class="desc-box-label">
													<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
														<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
														<polyline points="14 2 14 8 20 8" />
														<line x1="16" y1="13" x2="8" y2="13" />
														<line x1="16" y1="17" x2="8" y2="17" />
														<polyline points="10 9 9 9 8 9" />
													</svg>
													<span>Petunjuk &amp; Instruksi Tugas:</span>
												</div>
												<p class="desc-box-text">{currentTask.description}</p>
											</div>
										{/if}
									</div>

									<!-- Submission Section -->
									<div class="drawer-task-submission-group">
										{#if !currentTask.submission}
											<!-- Belum Submit -->
											<div class="submission-status-bar">
												<span class="badge-unsubmitted">BELUM SUBMIT</span>
												<span class="submission-hint">Kirim link hasil tugas</span>
											</div>

											<form
												method="POST"
												action="?/submitTask"
												use:enhance={() => {
													isDrawerTaskSubmitting = true;
													return async ({ result, update }) => {
														isDrawerTaskSubmitting = false;
														await update();
														if (result.type === 'success') {
															const updatedM = data.meetings.find((m) => m.id === meeting.id);
															if (updatedM) {
																selectedDetailMeeting = updatedM;
																drawerTaskLink = updatedM.task?.submission?.link || '';
															}
														}
													};
												}}
												class="drawer-submission-form"
											>
												<input type="hidden" name="taskId" value={currentTask.id} />
												<TextInput
													id="meetingTaskLink"
													name="link"
													label="Link Hasil Tugas (URL Publik)"
													placeholder="https://github.com/... atau https://figma.com/..."
													bind:value={drawerTaskLink}
													required
												/>
												<button
													type="submit"
													disabled={isDrawerTaskSubmitting || !drawerTaskLink.trim()}
													class="btn-drawer-cta-task"
												>
													{#if isDrawerTaskSubmitting}
														<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														<span>Mengirim Tugas...</span>
													{:else}
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
															<line x1="22" y1="2" x2="11" y2="13" />
															<polygon points="22 2 15 22 11 13 2 9 22 2" />
														</svg>
														<span>Kirim Tugas Sekarang</span>
													{/if}
												</button>
											</form>
										{:else if currentTask.submission.status === 'approved'}
											<!-- Disetujui -->
											<div class="submission-status-bar">
												<span class="badge-approved">DISETUJUI (+{currentTask.taskSize === 'kecil' ? '50' : currentTask.taskSize === 'besar' ? '200' : '100'} POIN)</span>
											</div>

											<div class="submission-alert-approved">
												<div class="alert-check-icon">✓</div>
												<div class="alert-text">Tugas telah diperiksa &amp; poin keaktifan telah diberikan.</div>
											</div>

											<div class="submitted-link-preview">
												<div class="min-w-0 flex-1">
													<span class="link-label">Link Submisi:</span>
													<a href={currentTask.submission.link} target="_blank" rel="noopener noreferrer" class="link-task-url">
														{currentTask.submission.link}
													</a>
												</div>
												<a href={currentTask.submission.link} target="_blank" rel="noopener noreferrer" class="btn-open-link-icon" title="Buka Link Tugas">
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
														<polyline points="15 3 21 3 21 9" />
														<line x1="10" y1="14" x2="21" y2="3" />
													</svg>
												</a>
											</div>
										{:else if currentTask.submission.status === 'revisi'}
											<!-- Perlu Revisi -->
											<div class="submission-status-bar">
												<span class="badge-revisi">PERLU REVISI</span>
											</div>

											{#if currentTask.submission.feedback}
												<div class="submission-feedback-box">
													<div class="feedback-head">
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
															<circle cx="12" cy="12" r="10"/>
															<line x1="12" y1="8" x2="12" y2="12"/>
															<line x1="12" y1="16" x2="12.01" y2="16"/>
														</svg>
														<span>Catatan Revisi Mentor:</span>
													</div>
													<p class="feedback-text">"{currentTask.submission.feedback}"</p>
												</div>
											{/if}

											<form
												method="POST"
												action="?/submitTask"
												use:enhance={() => {
													isDrawerTaskSubmitting = true;
													return async ({ result, update }) => {
														isDrawerTaskSubmitting = false;
														await update();
														if (result.type === 'success') {
															const updatedM = data.meetings.find((m) => m.id === meeting.id);
															if (updatedM) {
																selectedDetailMeeting = updatedM;
																drawerTaskLink = updatedM.task?.submission?.link || '';
															}
														}
													};
												}}
												class="drawer-submission-form"
											>
												<input type="hidden" name="taskId" value={currentTask.id} />
												<TextInput
													id="meetingTaskLinkRevisi"
													name="link"
													label="Link Hasil Revisi Tugas"
													placeholder="https://github.com/... atau https://figma.com/..."
													bind:value={drawerTaskLink}
													required
												/>
												<button
													type="submit"
													disabled={isDrawerTaskSubmitting || !drawerTaskLink.trim()}
													class="btn-drawer-cta-task btn-drawer-cta-revisi"
												>
													{#if isDrawerTaskSubmitting}
														<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														<span>Mengirim Perbaikan...</span>
													{:else}
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
															<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
														</svg>
														<span>Kirim Perbaikan Tugas</span>
													{/if}
												</button>
											</form>
										{:else}
											<!-- Pending Review -->
											<div class="submission-status-bar">
												<span class="badge-pending">PENDING REVIEW</span>
												<span class="submission-hint" style="color: #b45309;">Sedang menunggu review</span>
											</div>

											{#if !isDrawerTaskEditing}
												<div class="submitted-link-preview">
													<div class="min-w-0 flex-1">
														<span class="link-label">Link Submisi Kamu:</span>
														<a href={currentTask.submission.link} target="_blank" rel="noopener noreferrer" class="link-task-url">
															{currentTask.submission.link}
														</a>
													</div>
													<a href={currentTask.submission.link} target="_blank" rel="noopener noreferrer" class="btn-open-link-icon" title="Buka Link Tugas">
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
															<polyline points="15 3 21 3 21 9" />
															<line x1="10" y1="14" x2="21" y2="3" />
														</svg>
													</a>
												</div>

												<div class="flex items-center gap-2 pt-0.5">
													<button
														type="button"
														onclick={() => {
															drawerTaskLink = currentTask.submission?.link || '';
															isDrawerTaskEditing = true;
														}}
														class="btn-edit-link-sm"
													>
														<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
															<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
														</svg>
														<span>Edit Link</span>
													</button>
													<button
														type="button"
														onclick={() => {
															if (currentTask.submission) {
																promptCancelDrawerTask(currentTask.submission.id, currentTask.title);
															}
														}}
														class="btn-cancel-link-sm"
													>
														Batal Submit
													</button>
												</div>
											{:else}
												<!-- Edit Mode Form -->
												<form
													method="POST"
													action="?/submitTask"
													use:enhance={() => {
														isDrawerTaskSubmitting = true;
														return async ({ result, update }) => {
															isDrawerTaskSubmitting = false;
															await update();
															if (result.type === 'success') {
																isDrawerTaskEditing = false;
																const updatedM = data.meetings.find((m) => m.id === meeting.id);
																if (updatedM) {
																	selectedDetailMeeting = updatedM;
																	drawerTaskLink = updatedM.task?.submission?.link || '';
																}
															}
														};
													}}
													class="drawer-submission-form"
												>
													<input type="hidden" name="taskId" value={currentTask.id} />
													<TextInput
														id="meetingTaskLinkEdit"
														name="link"
														label="Perbarui Link Tugas"
														placeholder="https://github.com/... atau https://figma.com/..."
														bind:value={drawerTaskLink}
														required
													/>
													<div class="flex items-center gap-2">
														<button
															type="button"
															onclick={() => (isDrawerTaskEditing = false)}
															class="btn-cancel-link-sm"
														>
															Batal
														</button>
														<button
															type="submit"
															disabled={isDrawerTaskSubmitting || !drawerTaskLink.trim()}
															class="btn-drawer-cta-task"
															style="flex: 1;"
														>
															{#if isDrawerTaskSubmitting}
																<span>Menyimpan...</span>
															{:else}
																<span>Simpan Perubahan</span>
															{/if}
														</button>
													</div>
												</form>
											{/if}
										{/if}
									</div>
								</div>
							{:else}
								<div class="drawer-empty-task-card">
									<svg class="mx-auto text-slate-400 mb-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" y1="8" x2="12" y2="12" />
										<line x1="12" y1="16" x2="12.01" y2="16" />
									</svg>
									<p class="text-xs font-bold text-slate-700">Tidak Ada Penugasan Tugas</p>
									<p class="text-[11px] text-slate-500 mt-0.5">Tidak ada task penugasan yang ditempelkan pada pertemuan ini.</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/snippet}

		{#snippet footer()}
			{#if selectedDetailMeeting}
				{@const meeting = selectedDetailMeeting}
				<div class="drawer-footer-actions">
					<button
						type="button"
						onclick={closeMeetingDetail}
						class="btn-drawer-secondary"
					>
						Tutup
					</button>

					{#if getMeetingStatus(meeting) === 'live' && meeting.attendanceStatus !== 'hadir' && meeting.attendanceStatus !== 'excused'}
						<button
							type="button"
							onclick={() => {
								closeMeetingDetail();
								startCameraScanner();
							}}
							class="btn-drawer-primary"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<rect x="3" y="3" width="7" height="7" rx="1.5" />
								<rect x="14" y="3" width="7" height="7" rx="1.5" />
								<rect x="3" y="14" width="7" height="7" rx="1.5" />
								<rect x="14" y="14" width="7" height="7" rx="1.5" />
							</svg>
							<span>Scan Presensi QR</span>
						</button>
					{/if}
				</div>
			{/if}
		{/snippet}
	</FormDrawer>
{/if}

<!-- Modal Konfirmasi Batal Submit Tugas dari Slider -->
<ConfirmModal
	bind:open={showCancelConfirmModal}
	title="Batalkan Pengiriman Tugas?"
	message={`Apakah kamu yakin ingin membatalkan pengiriman tugas "${cancelTargetSubmission?.title || ''}"? Link tugas yang telah dikirimkan akan dihapus.`}
	confirmText="Ya, Batalkan Submit"
	cancelText="Tidak, Simpan Submisi"
	variant="danger"
	loading={isCancelling}
	onconfirm={handleConfirmCancelSubmission}
/>

<form
	id="cancel-meeting-task-form"
	method="POST"
	action="?/cancelTask"
	use:enhance={() => {
		isCancelling = true;
		return async ({ update }) => {
			isCancelling = false;
			showCancelConfirmModal = false;
			cancelTargetSubmission = null;
			await update();
			if (selectedDetailMeeting) {
				const updatedM = data.meetings.find((m) => m.id === selectedDetailMeeting?.id);
				if (updatedM) {
					selectedDetailMeeting = updatedM;
					drawerTaskLink = '';
					isDrawerTaskEditing = false;
				}
			}
		};
	}}
	style="display: none;"
>
	<input type="hidden" name="submissionId" value={cancelTargetSubmission?.id || 0} />
</form>

<!-- ══════════════════════════════════════════════════════════
     HIGH-GRADE CAMERA SCANNER MODAL
     ══════════════════════════════════════════════════════════ -->
{#if isCameraOpen}
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md transition-all duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="cameraModalTitle"
	>
		<div
			class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
		>
			<!-- Modal Header -->
			<div class="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
							<circle cx="12" cy="13" r="4"/>
						</svg>
					</div>
					<div>
						<h3 id="cameraModalTitle" class="font-extrabold text-slate-900 text-sm leading-tight">
							Scan QR Presensi Pertemuan
						</h3>
						<p class="text-[11px] text-slate-500 font-medium mt-0.5">Arahkan kamera ke kode QR Presensi</p>
					</div>
				</div>
				<button
					type="button"
					onclick={stopCameraScanner}
					class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-lg font-bold cursor-pointer"
					aria-label="Tutup modal kamera"
				>
					&times;
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
				{#if availableCameras.length > 1}
					<div>
						<CustomSelect
							id="cameraSelect"
							label={`Pilih Sensor Kamera (${availableCameras.length} Ditemukan)`}
							value={selectedDeviceId}
							options={cameraSelectOptions}
							searchable={false}
							onchange={onCameraSelectChange}
						/>
					</div>
				{/if}

				<!-- 1:1 Aspect Ratio Camera Live Stream Frame -->
				<div class="qr-camera-frame">
					{#if isCameraLoading}
						<div class="camera-loading-overlay">
							<svg class="animate-spin h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span class="text-xs font-semibold text-slate-300">Memulai sensor kamera...</span>
						</div>
					{/if}

					{#if cameraError}
						<div class="camera-error-overlay">
							<div class="p-4 text-xs bg-rose-950/90 text-rose-200 rounded-xl border border-rose-800 text-center font-medium max-w-[85%]">
								{cameraError}
							</div>
						</div>
					{/if}

					<div id="qr-reader"></div>
				</div>

				<!-- Zoom Control -->
				<div class="zoom-card-container">
					<div class="flex items-center justify-between gap-2 mb-3">
						<span class="zoom-card-title flex items-center gap-2">
							<div class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<circle cx="11" cy="11" r="8"/>
									<line x1="21" y1="21" x2="16.65" y2="16.65"/>
									<line x1="11" y1="8" x2="11" y2="14"/>
									<line x1="8" y1="11" x2="14" y2="11"/>
								</svg>
							</div>
							<span>Zoom Kamera</span>
							<span class="zoom-value-pill font-mono">{zoomLevel.toFixed(1)}x</span>
						</span>

						<div class="zoom-preset-group">
							{#each [1, 1.5, 2, 3] as preset}
								<button
									type="button"
									onclick={() => setZoom(preset)}
									class="zoom-preset-btn {Math.abs(zoomLevel - preset) < 0.05 ? 'zoom-preset-btn-active' : ''}"
								>
									{preset}x
								</button>
							{/each}
						</div>
					</div>

					<input
						type="range"
						min={minZoom}
						max={maxZoom}
						step="0.1"
						value={zoomLevel}
						oninput={(e) => setZoom(parseFloat((e.target as HTMLInputElement).value))}
						class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Grid and Layout Specifications per page-blueprint.md */
	.content-area {
		padding: 24px 32px 60px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-sizing: border-box;
	}

	/* Uniform Header Banner Card */
	.header-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		width: 100%;
		box-sizing: border-box;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: #94a3b8;
		margin-bottom: 6px;
	}

	.bc-link {
		color: #64748b;
		text-decoration: none;
	}

	.bc-link:hover {
		color: #4f46e5;
	}

	.bc-current {
		color: #4338ca;
		font-weight: 700;
	}

	.page-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.25rem, 2.2vw, 1.5rem);
		font-weight: 800;
		color: #0f172a;
		line-height: 1.25;
	}

	.page-sub {
		font-size: 12px;
		color: #64748b;
		margin-top: 3px;
		max-width: 680px;
	}

	.kelas-badge {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
	}

	/* ══════════════════════════════════════════════════════════
	   CONTAINER SECTION: PRESENSI SESI AKTIF
	   ══════════════════════════════════════════════════════════ */
	.active-session-card {
		background: #ffffff;
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		transition: all 150ms ease;
	}

	.active-session-card--live {
		border: 1.5px solid #a5b4fc;
		background: linear-gradient(180deg, #f8faff 0%, #ffffff 100%);
		box-shadow: 0 4px 16px rgba(79, 70, 229, 0.12);
	}

	.active-session-card--present {
		border: 1.5px solid #a7f3d0;
		background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
	}

	.active-session-head {
		padding: 12px 18px;
		background: rgba(248, 250, 252, 0.85);
		border-bottom: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.badge-live-pulse {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 3px 10px;
		background: #fee2e2;
		color: #b91c1c;
		border: 1px solid #fca5a5;
		border-radius: 999px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.pulse-indicator {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: #ef4444;
		box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
		animation: pulseLive 1.8s infinite;
	}

	@keyframes pulseLive {
		0% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
		}
		70% {
			transform: scale(1);
			box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
		}
		100% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
		}
	}

	.badge-present-verified {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px;
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
		border-radius: 999px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
	}

	.active-time-tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 600;
		color: #475569;
		background: #f1f5f9;
		padding: 3px 9px;
		border-radius: 6px;
	}

	.active-room-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: #0369a1;
		background: #e0f2fe;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.btn-active-detail {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 12px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 11.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-active-detail:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.active-session-body {
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.active-session-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.15rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.3;
		margin: 0;
	}

	.active-session-sub {
		font-size: 12px;
		color: #64748b;
		margin: 3px 0 0;
		font-weight: 500;
	}

	.active-actions-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding-top: 4px;
	}

	.btn-active-scan-qr {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 9px 18px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 3px 10px rgba(79, 70, 229, 0.3);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-active-scan-qr:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 5px 14px rgba(79, 70, 229, 0.4);
	}

	.btn-active-scan-qr:active {
		transform: scale(0.98);
	}

	.active-or-divider {
		font-size: 11px;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.active-token-form {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 260px;
	}

	.active-token-input {
		flex: 1;
		min-width: 140px;
		padding: 9px 12px;
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		background: #ffffff;
		border: 1.5px solid #cbd5e1;
		border-radius: 9px;
		color: #0f172a;
		outline: none;
		transition: border-color 150ms ease;
	}

	.active-token-input:focus {
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.btn-active-token-submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 9px 16px;
		background: #1e293b;
		color: #ffffff;
		border: none;
		border-radius: 9px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-active-token-submit:hover:not(:disabled) {
		background: #0f172a;
		transform: translateY(-1px);
	}

	.btn-active-token-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.active-present-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding: 8px 12px;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 10px;
	}

	.btn-active-slide-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		background: #ffffff;
		color: #065f46;
		border: 1px solid #6ee7b7;
		border-radius: 8px;
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-active-slide-link:hover {
		background: #d1fae5;
		color: #064e3b;
	}

	/* Overview Key Metrics Stats Grid (Matches /siswa/tugas and /siswa/progress) */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		width: 100%;
		box-sizing: border-box;
	}

	@media (max-width: 1023px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		box-sizing: border-box;
	}

	.stat-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stat-icon {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.icon-total { background: #e0f2fe; color: #0284c7; }
	.icon-approved { background: #dcfce7; color: #16a34a; }
	.icon-pending { background: #fef3c7; color: #d97706; }
	.icon-revisi { background: #ffe4e6; color: #be123c; }
	.icon-streak { background: #e0e7ff; color: #6366f1; }

	.stat-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		background: var(--bg-cell, #f1f5f9);
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
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
		color: var(--text-sub, #94a3b8);
		margin-top: 2px;
	}

	/* Page Filter Card Layout */
	.page-filter-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		box-sizing: border-box;
	}

	.filter-row-top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.filter-top-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-mobile-filter-toggle {
		display: none;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: #f8fafc;
		color: #475569;
		border: 1.5px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		height: 38px;
		box-sizing: border-box;
		transition: all 150ms ease;
	}

	.btn-mobile-filter-toggle:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.btn-mobile-filter-toggle--active {
		background: #e0e7ff;
		color: #4338ca;
		border-color: #a5b4fc;
	}

	.mobile-filter-count-badge {
		font-size: 10.5px;
		font-weight: 800;
		background: #4f46e5;
		color: #ffffff;
		min-width: 18px;
		height: 18px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
	}

	.btn-reset-filters-active {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		height: 38px;
		box-sizing: border-box;
		transition: background 150ms ease;
	}

	.btn-reset-filters-active:hover {
		background: #fee2e2;
	}

	.filter-row-bottom {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.filter-col-item {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	/* Mobile-Friendly Cards Grid Layout */
	.meetings-card-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		width: 100%;
		box-sizing: border-box;
	}

	.pertemuan-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
		min-width: 0;
		box-sizing: border-box;
	}

	.pertemuan-card:hover {
		transform: translateY(-2px);
		border-color: #cbd5e1;
		box-shadow: 0 5px 14px rgba(0, 0, 0, 0.06);
	}

	.pertemuan-card-body {
		padding: 14px 16px;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		box-sizing: border-box;
	}

	.pertemuan-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 14.5px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.35;
	}

	.pertemuan-subphase {
		font-size: 11.5px;
		color: #64748b;
		font-weight: 500;
		margin-top: 2px;
	}

	.pertemuan-meta-box {
		margin-top: 10px;
		padding: 8px 10px;
		background: #f8fafc;
		border: 1px solid #f1f5f9;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 11px;
		color: #475569;
		font-weight: 500;
	}

	.pertemuan-card-foot {
		padding: 9px 14px;
		background: #f8fafc;
		border-top: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		box-sizing: border-box;
	}

	.btn-card-detail {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-card-detail:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.btn-card-presensi {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
	}

	.btn-card-presensi:hover {
		background: #4338ca;
		box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
	}

	/* Card Top Info Row (AGENTS.md Blueprint) */
	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 10px;
		width: 100%;
	}

	/* Activity Badges & Status Pills (AGENTS.md Uniform Height 26px) */
	.activity-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		line-height: 1;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		padding: 0 9px;
		border-radius: 6px;
		border: 1px solid transparent;
		letter-spacing: 0.03em;
		box-sizing: border-box;
		white-space: nowrap;
	}

	.weekend-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		line-height: 1;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #b45309;
		background: #fef3c7;
		border: 1px solid #fde68a;
		padding: 0 9px;
		border-radius: 6px;
		box-sizing: border-box;
		white-space: nowrap;
	}

	.status-pill-live {
		display: inline-flex;
		align-items: center;
		height: 26px;
		line-height: 1;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #86efac;
		padding: 0 10px;
		border-radius: 9999px;
		box-shadow: 0 0 8px rgba(34, 197, 94, 0.25);
		box-sizing: border-box;
		white-space: nowrap;
	}

	.status-pill-upcoming {
		display: inline-flex;
		align-items: center;
		height: 26px;
		line-height: 1;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		border: 1px solid #c7d2fe;
		padding: 0 10px;
		border-radius: 9999px;
		box-sizing: border-box;
		white-space: nowrap;
	}

	.status-pill-completed {
		display: inline-flex;
		align-items: center;
		height: 26px;
		line-height: 1;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: #64748b;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		padding: 0 10px;
		border-radius: 9999px;
		box-sizing: border-box;
		white-space: nowrap;
	}

	.badge-status {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.badge-hadir {
		background: #dcfce7;
		color: #16a34a;
		border: 1px solid #86efac;
	}

	.badge-excused {
		background: #ffedd5;
		color: #c2410c;
		border: 1px solid #fed7aa;
	}

	.badge-absen {
		background: #ffe4e6;
		color: #e11d48;
		border: 1px solid #fecdd3;
	}

	/* Unified Pill Link Badges (Slide PPT & Ada Tugas) */
	.badge-pill-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3.5px 8px;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		transition: all 120ms ease;
	}

	.badge-pill-materi {
		background: #eff6ff;
		color: #2563eb;
		border: 1px solid #bfdbfe;
	}

	.badge-pill-materi:hover {
		background: #dbeafe;
		border-color: #93c5fd;
		color: #1d4ed8;
	}

	.badge-pill-tugas {
		background: #fffbeb;
		color: #b45309;
		border: 1px solid #fde68a;
	}

	.badge-pill-tugas:hover {
		background: #fef3c7;
		border-color: #fcd34d;
		color: #92400e;
	}

	/* Empty state */
	.empty-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 48px 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.empty-icon {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
	}

	.empty-sub {
		font-size: 13px;
		color: #64748b;
		margin-top: 4px;
	}

	/* Pagination Footer Bar */
	.pagination-footer-bar {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 12px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		box-sizing: border-box;
	}

	.pagination-nav-group {
		display: flex;
		align-items: center;
		gap: 8px;
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
		transition: all 150ms ease;
	}

	.btn-pagination-nav:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.btn-pagination-nav:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-page-indicator {
		font-family: var(--font-mono, monospace);
		font-size: 11.5px;
		font-weight: 700;
		color: #475569;
		padding: 0 4px;
	}

	/* Camera Frame & Zoom Container */
	.qr-camera-frame {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1;
		background: #090d16;
		border-radius: 14px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.camera-loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: rgba(9, 13, 22, 0.85);
		backdrop-filter: blur(4px);
		z-index: 10;
		padding: 20px;
		text-align: center;
	}

	.camera-error-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(9, 13, 22, 0.9);
		z-index: 10;
		padding: 16px;
	}

	#qr-reader {
		width: 100% !important;
		height: 100% !important;
		border: none !important;
	}

	:global(#qr-reader video) {
		width: 100% !important;
		height: 100% !important;
		object-fit: cover !important;
	}

	.zoom-card-container {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 14px;
	}

	.zoom-card-title {
		font-size: 12px;
		font-weight: 700;
		color: #334155;
	}

	.zoom-value-pill {
		font-size: 11px;
		background: #e0e7ff;
		color: #4338ca;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: 700;
	}

	.zoom-preset-group {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.zoom-preset-btn {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 6px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #475569;
		cursor: pointer;
	}

	.zoom-preset-btn-active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	/* ══════════════════════════════════════════════════════════
	   DRAWER UI/UX PRO MAX STANDARD STYLING
	   ══════════════════════════════════════════════════════════ */
	.drawer-inner-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.drawer-hero-banner {
		padding: 14px 16px;
		border-radius: 12px;
		background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
		border: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.drawer-session-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.35;
	}

	.drawer-subphase-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 6px;
		border: 1px solid #c7d2fe;
	}

	/* Drawer 4-Stats Grid */
	.drawer-stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.drawer-stat-item {
		padding: 10px 12px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	}

	.drawer-stat-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.drawer-stat-label {
		font-family: var(--font-macro, sans-serif);
		font-size: 10px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		display: block;
	}

	.drawer-stat-val {
		font-size: 11.5px;
		font-weight: 700;
		display: block;
		margin-top: 1px;
	}

	/* Section Cards Inside Drawer */
	.drawer-section-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	}

	.drawer-section-head {
		padding: 11px 14px;
		background: #f8fafc;
		border-bottom: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.drawer-section-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 800;
		color: #0f172a;
	}

	.drawer-section-body {
		padding: 12px 14px;
	}

	/* Drawer Footer Action Buttons */
	.drawer-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		width: 100%;
	}

	.btn-primary-action-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 14px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-primary-action-sm:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
	}

	.btn-primary-action-sm:active {
		transform: scale(0.98);
	}

	.btn-outline-action-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 14px;
		background: #ffffff;
		color: #4338ca;
		border: 1.5px solid #c7d2fe;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-outline-action-sm:hover {
		background: #eef2ff;
		border-color: #a5b4fc;
		color: #3730a3;
		transform: translateY(-1px);
	}

	.btn-outline-action-sm:active {
		transform: scale(0.98);
	}

	.btn-drawer-cta-task {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 11px 18px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 3px 10px -2px rgba(79, 70, 229, 0.35);
		transition: all 150ms ease;
		box-sizing: border-box;
	}

	.btn-drawer-cta-task:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
	}

	.btn-drawer-cta-task:active {
		transform: scale(0.98);
	}

	.btn-drawer-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 20px;
		background: #ffffff;
		color: #475569;
		border: 1.5px solid #cbd5e1;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-drawer-secondary:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
		transform: translateY(-1px);
	}

	.btn-drawer-secondary:active {
		transform: scale(0.98);
	}

	.btn-drawer-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 22px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
	}

	.btn-drawer-primary:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
	}

	.btn-drawer-primary:active {
		transform: scale(0.98);
	}

	/* Drawer Section Cards & Alert Layouts */
	.drawer-verified-alert {
		padding: 12px 14px;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.drawer-live-alert {
		padding: 12px 14px;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.drawer-file-card {
		padding: 12px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	/* Drawer Task Card Container & Clean Spacing Layout */
	.drawer-task-card-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.drawer-task-header-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.drawer-task-title-text {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.35;
		margin: 0;
	}

	.drawer-task-desc-box {
		padding: 10px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 3.5px solid #4f46e5;
		border-radius: 8px;
	}

	.desc-box-label {
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11px;
		font-weight: 700;
		color: #334155;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 4px;
	}

	.desc-box-text {
		font-size: 12px;
		color: #334155;
		line-height: 1.55;
		margin: 0;
		white-space: pre-line;
	}

	.drawer-task-submission-group {
		padding-top: 10px;
		border-top: 1px dashed #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.submission-status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.submission-hint {
		font-size: 11px;
		color: #64748b;
		font-weight: 500;
	}

	.drawer-submission-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.submission-alert-approved {
		padding: 10px 12px;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: #065f46;
	}

	.alert-check-icon {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		background: #10b981;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 800;
		flex-shrink: 0;
	}

	.alert-text {
		font-size: 11.5px;
		line-height: 1.4;
	}

	.submitted-link-preview {
		padding: 8px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.link-label {
		font-size: 10.5px;
		color: #64748b;
		display: block;
		margin-bottom: 1px;
	}

	.submission-feedback-box {
		padding: 10px 12px;
		background: #fff1f2;
		border: 1px solid #fecdd3;
		border-radius: 8px;
		font-size: 12px;
		color: #9f1239;
	}

	.feedback-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		color: #9f1239;
		margin-bottom: 4px;
		font-size: 11.5px;
	}

	.feedback-text {
		font-style: italic;
		line-height: 1.45;
		margin: 0;
		font-size: 11.5px;
	}

	.btn-drawer-cta-revisi {
		background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%) !important;
	}

	.drawer-empty-task-card {
		padding: 16px 14px;
		text-align: center;
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
		border-radius: 10px;
	}

	.link-task-url {
		font-family: var(--font-mono, monospace);
		font-size: 11.5px;
		color: #4f46e5;
		text-decoration: underline;
		word-break: break-all;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.btn-open-link-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #475569;
		flex-shrink: 0;
		transition: all 150ms ease;
	}

	.btn-open-link-icon:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.btn-edit-link-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		flex: 1;
		padding: 8px 12px;
		background: #ffffff;
		color: #475569;
		border: 1.5px solid #cbd5e1;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-edit-link-sm:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
		transform: translateY(-1px);
	}

	.btn-cancel-link-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px 12px;
		background: #fff1f2;
		color: #e11d48;
		border: 1.5px solid #fecdd3;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-cancel-link-sm:hover {
		background: #ffe4e6;
		border-color: #fda4af;
		color: #be123c;
		transform: translateY(-1px);
	}

	.badge-unsubmitted {
		background: var(--bg-cell);
		color: var(--text-secondary);
		border: 1px solid var(--border-hard);
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
	}

	.badge-pending {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
	}

	.badge-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
	}

	.badge-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
	}

	/* ══════════════════════════════════════════════════════════
	   FLUID MOBILE RESPONSIVENESS (< 1024px & < 640px)
	   ══════════════════════════════════════════════════════════ */
	@media (max-width: 1023px) {
		.content-area {
			padding: 20px 24px 60px;
			gap: 16px;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}

		.filter-row-bottom {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}

		/* Header Card Mobile Stack */
		.header-card {
			padding: 16px;
		}

		.header-card-content {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.header-card-actions {
			flex-direction: column;
			align-items: stretch;
			width: 100%;
			gap: 8px;
		}

		.kelas-badge {
			width: 100%;
			text-align: center;
			box-sizing: border-box;
		}

		/* Active Session Card Mobile */
		.active-session-head {
			padding: 10px 14px;
		}

		.active-session-body {
			padding: 14px;
			gap: 10px;
		}

		.active-actions-row {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}

		.btn-active-scan-qr {
			width: 100%;
			justify-content: center;
		}

		.active-or-divider {
			text-align: center;
			margin: -2px 0;
		}

		.active-token-form {
			width: 100%;
			min-width: 0;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}

		.stat-card {
			padding: 12px 14px;
			gap: 12px;
		}

		.stat-icon {
			width: 38px;
			height: 38px;
		}

		.stat-value {
			font-size: 1.45rem;
		}

		/* Compact Filter Card with Mobile Toggle Button */
		.page-filter-card {
			padding: 12px 14px;
			gap: 10px;
		}

		.filter-row-top {
			display: flex;
			flex-direction: row;
			align-items: flex-end;
			gap: 8px;
		}

		.filter-top-actions {
			display: flex;
			align-items: center;
			gap: 6px;
			flex-shrink: 0;
		}

		.btn-mobile-filter-toggle {
			display: inline-flex;
			padding: 8px 10px;
			font-size: 11.5px;
			height: 38px;
		}

		.btn-reset-filters-active {
			padding: 8px 10px;
			font-size: 11px;
			height: 38px;
		}

		/* Toggleable filters on mobile (zero horizontal overflow) */
		.filter-row-bottom {
			display: none;
			grid-template-columns: minmax(0, 1fr);
			gap: 8px;
			padding-top: 6px;
			border-top: 1px dashed #e2e8f0;
		}

		.filter-row-bottom--show-mobile {
			display: grid;
			animation: filterSlideDown 200ms ease-out;
		}

		@keyframes filterSlideDown {
			from {
				opacity: 0;
				transform: translateY(-6px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		/* Meetings Grid Mobile Stack */
		.meetings-card-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.pertemuan-card-body {
			padding: 14px;
		}

		.pertemuan-title {
			font-size: 14px;
		}

		.pertemuan-card-foot {
			padding: 10px 14px;
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}

		.btn-card-detail,
		.btn-card-presensi {
			width: 100%;
			justify-content: center;
			padding: 9px 14px;
			font-size: 12.5px;
		}

		/* Pagination Bar Mobile Stack */
		.pagination-footer-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
			text-align: center;
			padding: 12px 14px;
		}

		.pagination-info {
			text-align: center;
		}

		.mobile-page-size-wrap {
			width: 100%;
		}

		.pagination-nav-group {
			justify-content: center;
			width: 100%;
		}

		/* ══════════════════════════════════════════════════════════
		   DRAWER DETAIL MEETING MOBILE RESPONSIVENESS
		   ══════════════════════════════════════════════════════════ */
		.drawer-inner-content {
			gap: 12px;
		}

		.drawer-hero-banner {
			padding: 14px 16px;
			border-radius: 14px;
		}

		.drawer-session-title {
			font-size: 1.05rem;
			line-height: 1.35;
		}

		.drawer-subphase-tag {
			font-size: 10.5px;
			max-width: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/* 2x2 Compact Stat Cards Grid on Mobile */
		.drawer-stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.drawer-stat-item {
			padding: 10px;
			gap: 8px;
			border-radius: 10px;
		}

		.drawer-stat-icon {
			width: 32px;
			height: 32px;
			border-radius: 8px;
		}

		.drawer-stat-icon svg {
			width: 15px;
			height: 15px;
		}

		.drawer-stat-label {
			font-size: 9.5px;
		}

		.drawer-stat-val {
			font-size: 11px;
			line-height: 1.25;
		}

		.drawer-section-card {
			border-radius: 14px;
		}

		.drawer-section-head {
			padding: 12px 14px;
			gap: 8px;
		}

		.drawer-section-title {
			font-size: 12px;
		}

		.drawer-section-body {
			padding: 12px 14px;
		}

		.drawer-verified-alert {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}

		.drawer-verified-alert .font-mono {
			align-self: flex-start;
		}

		.drawer-live-alert {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
		}

		.drawer-file-card {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
		}

		.btn-outline-action-sm {
			width: 100%;
			justify-content: center;
			padding: 9px 14px;
			box-sizing: border-box;
		}

		.btn-primary-action-sm {
			width: 100%;
			justify-content: center;
			padding: 9px 14px;
			box-sizing: border-box;
		}

		.btn-drawer-cta-task {
			padding: 10px 14px;
			font-size: 12px;
			justify-content: center;
		}

		.drawer-footer-actions {
			flex-direction: column-reverse;
			align-items: stretch;
			gap: 8px;
		}

		.btn-drawer-secondary,
		.btn-drawer-primary {
			width: 100%;
			justify-content: center;
			padding: 11px 16px;
		}
	}
</style>

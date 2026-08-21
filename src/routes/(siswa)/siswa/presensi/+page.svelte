<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import { Html5Qrcode } from 'html5-qrcode';

	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';

	let { data }: { data: PageData } = $props();

	let qrTokenInput = $state('');
	let isSubmitting = $state(false);
	let scanErrorMessage = $state('');
	let hasAutoSubmitted = $state(false);

	// Camera scanner state
	interface CameraDevice {
		id: string;
		label: string;
	}

	let isCameraOpen = $state(false);
	let isCameraLoading = $state(false);
	let cameraError = $state('');
	let availableCameras = $state<CameraDevice[]>([]);
	let selectedDeviceId = $state<string>('');
	let html5QrcodeInstance: Html5Qrcode | null = null;

	// Camera Zoom State
	let zoomLevel = $state(1); // 1.0x to 4.0x
	let minZoom = $state(1);
	let maxZoom = $state(4);

	const cameraSelectOptions = $derived(
		availableCameras.map((c) => ({
			value: c.id,
			label: c.label
		}))
	);

	// Filter Tab State
	let filterStatus = $state<'all' | 'hadir' | 'excused' | 'absen'>('all');

	// Scan success payload state
	let scanSuccessResult = $state<{
		message: string;
		pointsAwarded: number;
		currentStreak: number;
		milestoneBonusAwarded: number;
	} | null>(null);

	const streakInfo = $derived(data.streakInfo ?? { currentStreak: 0 });
	const logs = $derived(data.attendanceLogs ?? []);
	const stats = $derived(
		data.stats ?? { totalSessions: 0, totalHadir: 0, totalExcused: 0, attendancePercentage: 0 }
	);

	// Filtered history list
	const filteredLogs = $derived(
		logs.filter((log) => {
			if (filterStatus === 'all') return true;
			return log.status === filterStatus;
		})
	);

	// Next milestone target
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

	async function loadAvailableCameras() {
		try {
			const devices = await Html5Qrcode.getCameras();
			if (devices && devices.length > 0) {
				availableCameras = devices.map((d, i) => ({
					id: d.id,
					label: d.label || `Kamera ${i + 1}`
				}));

				if (!selectedDeviceId) {
					// Prefer main rear camera (avoid 0.5x ultra-wide or front)
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

		// Try hardware MediaTrackConstraints zoom if available
		if (html5QrcodeInstance) {
			try {
				// @ts-ignore
				const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement;
				const track = (videoEl?.srcObject as MediaStream)?.getVideoTracks()?.[0];

				if (track) {
					const caps = track.getCapabilities ? track.getCapabilities() : {};
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

		// CSS Scale Zoom fallback for video container element (100% reliable across all browsers)
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

			await html5QrcodeInstance.start(
				config,
				{
					fps: 10,
					qrbox: { width: 240, height: 240 }
				},
				(decodedText) => {
					// Scanned QR token successfully!
					stopCameraScanner();

					let tokenVal = decodedText.trim();
					if (tokenVal.includes('token=')) {
						try {
							const parsed = new URL(tokenVal);
							tokenVal = parsed.searchParams.get('token') || tokenVal;
						} catch {}
					}

					qrTokenInput = tokenVal;
					toast.success('Kode QR berhasil dipindai!');
					submitToken(tokenVal);
				},
				() => {}
			);
		} catch (err: any) {
			// Fallback: try environment facing mode if exact deviceId failed
			if (targetDeviceId || selectedDeviceId) {
				try {
					await html5QrcodeInstance?.start(
						{ facingMode: 'environment' },
						{ fps: 10, qrbox: { width: 240, height: 240 } },
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
							toast.success('Kode QR berhasil dipindai!');
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

		// 1. Check if URL has ?scan=true (opened from dashboard button)
		const params = new URLSearchParams(window.location.search);
		if (params.get('scan') === 'true') {
			if (window.history && window.history.replaceState) {
				window.history.replaceState({}, '', window.location.pathname);
			}
			startCameraScanner();
		}

		// 2. If URL has token, save to sessionStorage as pending
		if (data.urlToken && data.urlToken.trim()) {
			try {
				sessionStorage.setItem('pending_qr_token', data.urlToken.trim());
			} catch {}
		}

		// 3. Read pending token from URL or sessionStorage
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

			// Clear pending token from sessionStorage to prevent duplicate auto-submits later
			try {
				sessionStorage.removeItem('pending_qr_token');
			} catch {}

			// Clean up URL query string (?token=...) without page reload
			if (window.history && window.history.replaceState) {
				window.history.replaceState({}, '', window.location.pathname);
			}

			// Automatically submit QR attendance scan
			submitToken(cleanToken);
		}
	});

	async function handleScanSubmit(e: Event) {
		e.preventDefault();
		if (!qrTokenInput.trim()) {
			scanErrorMessage = 'Silakan masukkan kode token QR terlebih dahulu.';
			return;
		}
		await submitToken(qrTokenInput);
	}

	function formatIndoTime(dateStr: Date | string | null): string {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return '-';
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${hh}:${mm} WIB`;
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

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}
</script>

<svelte:head>
	<title>Riwayat Presensi & Kehadiran — Siswa Hub</title>
</svelte:head>

<div class="content-area">
	<!-- Header Card (Original /siswa/riwayat-presensi Header Standard) -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Riwayat Presensi</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Riwayat Kehadiran &amp; Scan Presensi</h1>
				<p class="page-sub">
					Lacak seluruh catatan kehadiran, pindai kode QR presensi, dan pertahankan streak sesi kelas komunitas Anda.
				</p>
			</div>
			<div class="flex items-center gap-2.5 flex-wrap">
				{#if data.membership}
					<span class="kelas-badge">Kelas: {data.membership.kelasName}</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Stats Row Grid (3 Columns) -->
	<div class="stats-grid">
		<!-- Stat 1: Attendance Percentage -->
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Persentase Kehadiran</div>
				<div class="stat-value" style="color: #4f46e5;">{stats.attendancePercentage}%</div>
				<div class="stat-meta">{stats.totalHadir} dari {stats.totalSessions} Sesi Hadir</div>
			</div>
		</div>

		<!-- Stat 2: Total Hadir & Excused -->
		<div class="stat-card">
			<div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 11 12 14 22 4" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Hadir &amp; Izin</div>
				<div class="stat-value" style="color: #16a34a;">{stats.totalHadir + stats.totalExcused}</div>
				<div class="stat-meta">Hadir: {stats.totalHadir} | Izin: {stats.totalExcused}</div>
			</div>
		</div>

		<!-- Stat 3: Streak Counter & Progress -->
		<div class="stat-card">
			<div class="stat-icon" style="background: #fffbeb; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			</div>
			<div class="w-full min-w-0">
				<div class="flex items-center justify-between">
					<div class="stat-label">Streak Kehadiran Aktif</div>
					<span class="text-[11px] font-extrabold text-indigo-600">+{nextMilestone.bonus} Poin</span>
				</div>
				<div class="stat-value" style="color: #d97706;">
					{currentStreak} <span class="text-xs font-normal text-slate-500">Sesi</span>
				</div>
				<div class="streak-bar-wrap mt-1">
					<div class="streak-bar" style="width: {milestoneProgressPercent}%;"></div>
				</div>
				<div class="stat-meta mt-1">Target Next Milestone: {nextMilestone.streak} Sesi</div>
			</div>
		</div>
	</div>

	<!-- QR Scanner Form Card -->
	<div class="scanner-card">
		<div class="scanner-header">
			<div class="flex items-center gap-2">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-600">
					<path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
					<rect x="7" y="7" width="3" height="3" fill="currentColor" />
					<rect x="14" y="7" width="3" height="3" fill="currentColor" />
					<rect x="7" y="14" width="3" height="3" fill="currentColor" />
					<rect x="14" y="14" width="3" height="3" fill="currentColor" />
				</svg>
				<span class="scanner-title">Form Scan Presensi Mandiri</span>
			</div>
		</div>

		<div class="scanner-body">
			{#if scanSuccessResult}
				<!-- Celebration Success Panel -->
				<div class="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
					<div class="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-sm">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<h3 class="font-extrabold text-emerald-900 text-base">Presensi Berhasil Dicatat!</h3>
					<p class="text-xs text-emerald-700 font-medium mt-1">{scanSuccessResult.message}</p>

					<div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
						<span class="badge-status badge-hadir text-xs px-3 py-1 font-bold">
							+ {scanSuccessResult.pointsAwarded} Poin Kehadiran
						</span>
						{#if scanSuccessResult.milestoneBonusAwarded > 0}
							<span class="badge-status badge-excused text-xs px-3 py-1 font-bold">
								Bonus Milestone +{scanSuccessResult.milestoneBonusAwarded} Poin!
							</span>
						{/if}
					</div>

					<button
						type="button"
						onclick={() => (scanSuccessResult = null)}
						class="btn-scan-qr text-xs mt-4"
					>
						Scan Token Sesi Lain
					</button>
				</div>
			{:else}
				<form onsubmit={handleScanSubmit} class="space-y-4">
					<div>
						<div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
							<label for="tokenInput" class="stat-label uppercase m-0">
								Kode Token QR Presensi *
							</label>
							<button
								type="button"
								onclick={() => startCameraScanner()}
								class="btn-action-primary flex items-center gap-1.5"
							>
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
									<circle cx="12" cy="13" r="4"/>
								</svg>
								<span>Buka Kamera</span>
							</button>
						</div>
						<div class="relative">
							<input
								id="tokenInput"
								type="text"
								bind:value={qrTokenInput}
								placeholder="Masukkan kode token di sini..."
								class="scan-input font-mono text-sm font-bold tracking-wider w-full rounded-lg"
							/>
							{#if qrTokenInput}
								<button
									type="button"
									onclick={() => (qrTokenInput = '')}
									class="scan-clear-btn"
									aria-label="Bersihkan input"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="18" y1="6" x2="6" y2="18" />
										<line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							{/if}
						</div>
					</div>

					{#if scanErrorMessage}
						<div class="alert-error p-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
							{scanErrorMessage}
						</div>
					{/if}

					<button
						type="submit"
						disabled={isSubmitting || !qrTokenInput.trim()}
						class="btn-scan-submit w-full text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
					>
						{#if isSubmitting}
							<span>Memproses Presensi...</span>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<line x1="22" y1="2" x2="11" y2="13" />
								<polygon points="22 2 15 22 11 13 2 9 22 2" />
							</svg>
							<span>Kirim Presensi Sekarang</span>
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Filter Tabs & List Container (Original riwayat-presensi Container) -->
	<div class="list-container">
		<div class="filter-bar">
			<div class="tab-group">
				<button
					type="button"
					onclick={() => (filterStatus = 'all')}
					class="tab-btn {filterStatus === 'all' ? 'tab-btn-active' : ''}"
				>
					Semua ({logs.length})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'hadir')}
					class="tab-btn {filterStatus === 'hadir' ? 'tab-btn-active' : ''}"
				>
					Hadir ({stats.totalHadir})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'excused')}
					class="tab-btn {filterStatus === 'excused' ? 'tab-btn-active' : ''}"
				>
					Izin/Sakit ({stats.totalExcused})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'absen')}
					class="tab-btn {filterStatus === 'absen' ? 'tab-btn-active' : ''}"
				>
					Absen ({stats.totalSessions - (stats.totalHadir + stats.totalExcused)})
				</button>
			</div>
		</div>

		{#if filteredLogs.length === 0}
			<div class="empty-state">
				<p class="empty-title">Tidak Ada Catatan Presensi</p>
				<p class="empty-sub">Tidak ditemukan catatan presensi sesuai kriteria filter yang dipilih.</p>
			</div>
		{:else}
			<div class="timeline-list space-y-3 p-4">
				{#each filteredLogs as item}
					<div class="timeline-card">
						<div class="flex items-start justify-between gap-3 flex-wrap">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="activity-badge">{item.session.activityType.toUpperCase()}</span>
									{#if item.session.isWeekend}
										<span class="weekend-badge">WEEKEND</span>
									{/if}

									{#if item.status === 'hadir'}
										<span class="badge-status badge-hadir">HADIR</span>
									{:else if item.status === 'excused'}
										<span class="badge-status badge-excused">IZIN / SAKIT</span>
									{:else}
										<span class="badge-status badge-absen">ABSEN</span>
									{/if}
								</div>

								<h4 class="session-title">{item.session.title}</h4>

								<div class="session-meta mt-1">
									<span>Tanggal: <strong>{formatIndoDate(item.session.sessionDate)}</strong></span>
									{#if item.session.startTime}
										<span>Jam: <strong>{formatTimeOnly(item.session.startTime)} - {formatTimeOnly(item.session.endTime)} WIB</strong></span>
									{/if}
									{#if item.session.location}
										<span>Ruangan: <strong>{item.session.location}</strong></span>
									{/if}
								</div>

								{#if item.attendance?.manualReason}
									<div class="manual-reason-box mt-2">
										<span>Catatan Presensi: "{item.attendance.manualReason}"</span>
									</div>
								{/if}
							</div>

							<div class="text-right flex-shrink-0">
								{#if item.attendance}
									<span class="method-tag">
										Metode: {item.attendance.method === 'qr' ? 'QR Code Scan' : 'Input Manual Mentor'}
									</span>
									<div class="text-[11px] font-mono text-slate-500 mt-0.5">
										{formatIndoTime(item.attendance.recordedAt)}
									</div>
								{:else}
									<span class="method-tag text-slate-400">Belum Terdeteksi</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- High-Grade Camera Scanner Modal -->
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
							Scan QR Presensi
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
				<!-- Device Camera Selector Dropdown using CustomSelect UI -->
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

				<!-- Camera Live Stream Frame -->
				<div class="bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[250px]">
					{#if isCameraLoading}
						<div class="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
							<svg class="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Memulai sensor kamera... Mohon izinkan akses kamera.</span>
						</div>
					{/if}

					{#if cameraError}
						<div class="p-4 text-xs bg-rose-950/90 text-rose-200 rounded-xl border border-rose-800 m-3 text-center font-medium">
							{cameraError}
						</div>
					{/if}

					<div id="qr-reader" class="w-full h-full rounded-xl overflow-hidden min-h-[220px]"></div>
				</div>

				<!-- Sleek Camera Zoom Control Bar -->
				<div class="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-600">
								<circle cx="11" cy="11" r="8"/>
								<line x1="21" y1="21" x2="16.65" y2="16.65"/>
								<line x1="11" y1="8" x2="11" y2="14"/>
								<line x1="8" y1="11" x2="14" y2="11"/>
							</svg>
							Zoom Kamera <span class="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">{zoomLevel.toFixed(1)}x</span>
						</span>

						<!-- Sleek Zoom Shortcut Pills -->
						<div class="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200 shadow-2xs">
							{#each [1, 1.5, 2, 3] as preset}
								<button
									type="button"
									onclick={() => setZoom(preset)}
									class="px-2.5 py-0.5 text-[11px] font-bold font-mono rounded-full transition-all cursor-pointer {Math.abs(zoomLevel - preset) < 0.05 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
								>
									{preset}x
								</button>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => setZoom(zoomLevel - 0.2)}
							disabled={zoomLevel <= minZoom}
							class="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-700 font-extrabold text-sm flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 cursor-pointer shadow-2xs transition-all"
							aria-label="Zoom Out"
						>
							-
						</button>

						<input
							type="range"
							min={minZoom}
							max={maxZoom}
							step="0.1"
							value={zoomLevel}
							oninput={(e) => setZoom(parseFloat((e.target as HTMLInputElement).value))}
							class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
						/>

						<button
							type="button"
							onclick={() => setZoom(zoomLevel + 0.2)}
							disabled={zoomLevel >= maxZoom}
							class="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-700 font-extrabold text-sm flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 cursor-pointer shadow-2xs transition-all"
							aria-label="Zoom In"
						>
							+
						</button>
					</div>
				</div>

				<p class="text-[11px] text-slate-400 text-center font-medium">
					Sistem akan mendeteksi token presensi secara otomatis begitu QR terlihat pada kamera.
				</p>
			</div>

			<!-- Modal Footer: Seamless White Background matching card with unified padding -->
			<div class="px-5 py-4 bg-white border-t border-slate-100 flex items-center justify-end">
				<button
					type="button"
					onclick={stopCameraScanner}
					class="btn-modal-close w-full sm:w-auto"
				>
					Tutup Kamera
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.btn-action-primary {
		background: var(--primary, #4f46e5);
		color: #ffffff;
		font-family: var(--font-macro, inherit);
		font-size: 13px;
		font-weight: 700;
		padding: 9px 16px;
		border-radius: var(--radius-md, 8px);
		border: 1px solid transparent;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-action-primary:hover {
		background: #4338ca;
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
	}

	.btn-modal-close {
		background: #ffffff;
		color: var(--text-primary, #0f172a);
		font-family: var(--font-macro, inherit);
		font-size: 13px;
		font-weight: 700;
		padding: 9px 18px;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--border-hard, #cbd5e1);
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-modal-close:hover {
		background: #f8fafc;
		border-color: #94a3b8;
	}
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1100px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
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
		font-size: clamp(1.3rem, 2.5vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.page-sub {
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.kelas-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
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
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
	}

	.stat-meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	.streak-bar-wrap {
		width: 100%;
		height: 6px;
		background: #f1f5f9;
		border-radius: 9999px;
		overflow: hidden;
	}

	.streak-bar {
		height: 100%;
		background: #d97706;
		border-radius: 9999px;
		transition: width 200ms ease;
	}

	.scanner-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.scanner-header {
		padding: 14px 20px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.scanner-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.scanner-body {
		padding: 20px;
	}

	.scan-input {
		height: 44px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		padding: 10px 40px 10px 14px;
		color: var(--text-primary);
		font-size: 14px;
		border-radius: var(--radius-md);
		transition: all 150ms ease;
	}

	.scan-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
		outline: none;
	}

	.scan-clear-btn {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.scan-clear-btn:hover {
		background: #f1f5f9;
		color: #475569;
	}

	.btn-scan-submit {
		height: 44px;
		padding: 10px 20px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
	}

	.btn-scan-submit:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.btn-scan-submit:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-scan-submit:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		box-shadow: none;
	}

	@media (max-width: 640px) {
		.scanner-body {
			padding: 16px;
		}
	}

	.btn-scan-qr {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		border: none;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.btn-scan-qr:hover {
		background: #4338ca;
	}

	.list-container {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.filter-bar {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.tab-group {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.tab-btn {
		padding: 6px 12px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tab-btn:hover {
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.tab-btn-active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
	}

	.timeline-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
		transition: all 150ms ease;
	}

	.timeline-card:hover {
		border-color: #cbd5e1;
		box-shadow: var(--shadow-sm);
	}

	.activity-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #4f46e5;
		background: #e0e7ff;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.weekend-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #b45309;
		background: #fffbeb;
		border: 1px solid #fde68a;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.badge-status {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 800;
		padding: 1.5px 6px;
		border-radius: 4px;
	}

	.badge-hadir {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
	}

	.badge-excused {
		background: #e0e7ff;
		color: #3730a3;
		border: 1px solid #a5b4fc;
	}

	.badge-absen {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.session-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.session-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 11.5px;
		color: var(--text-secondary);
		flex-wrap: wrap;
	}

	.manual-reason-box {
		font-size: 11px;
		color: #475569;
		background: #f8fafc;
		padding: 4px 8px;
		border-radius: 4px;
		border-left: 3px solid #cbd5e1;
	}

	.method-tag {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.empty-state {
		text-align: center;
		padding: 36px 20px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 12px 80px;
		}

		.header-card {
			padding: 16px;
		}

		.filter-bar {
			padding: 8px 10px;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}

		.tab-group {
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			padding-bottom: 2px;
		}

		.tab-group::-webkit-scrollbar {
			display: none;
		}

		.tab-btn {
			flex-shrink: 0;
			white-space: nowrap;
			padding: 6px 10px;
			font-size: 11px;
		}
	}
</style>

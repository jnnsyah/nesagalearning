<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let { data }: { data: PageData } = $props();

	let qrTokenInput = $state('');
	let isSubmitting = $state(false);
	let scanErrorMessage = $state('');
	let hasAutoSubmitted = $state(false);

	// Scan success payload state
	let scanSuccessResult = $state<{
		message: string;
		pointsAwarded: number;
		currentStreak: number;
		milestoneBonusAwarded: number;
	} | null>(null);

	const streakInfo = $derived(data.streakInfo);
	const history = $derived(data.attendanceHistory ?? []);
	const totalAttended = $derived(history.filter((h) => h.status === 'hadir').length);

	// Next milestone target
	const nextMilestone = $derived.by(() => {
		const cur = streakInfo.currentStreak;
		if (cur < 3) return { streak: 3, bonus: 50 };
		if (cur < 5) return { streak: 5, bonus: 100 };
		if (cur < 10) return { streak: 10, bonus: 250 };
		if (cur < 15) return { streak: 15, bonus: 500 };
		return { streak: 20, bonus: 1000 };
	});

	const milestoneProgressPercent = $derived.by(() => {
		const target = nextMilestone.streak;
		return Math.min(100, Math.round((streakInfo.currentStreak / target) * 100));
	});

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
		if (data.urlToken && data.urlToken.trim() && !hasAutoSubmitted) {
			hasAutoSubmitted = true;
			qrTokenInput = data.urlToken.trim();
			submitToken(data.urlToken.trim());
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
</script>

<svelte:head>
	<title>Presensi QR & Streak Saya — NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Row -->
	<div class="page-header-row">
		<div>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/siswa" class="bc-link">Dashboard</a>
				<span class="text-slate-400">/</span>
				<span class="bc-current">Presensi QR & Streak</span>
			</nav>
			<h1 class="page-title">Scan Presensi & Streak Saya</h1>
			<p class="page-sub">
				Masukkan token QR dari proyektor mentor untuk mencatat Kehadiran dan pertahankan streak berturut-turut!
			</p>
		</div>
	</div>

	<!-- Streak Showcase Panel -->
	<div class="panel p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div class="flex items-center gap-4">
				<div class="w-14 h-14 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-200">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
					</svg>
				</div>
				<div>
					<div class="type-mono text-amber-700 font-bold uppercase">Streak Kehadiran Sesi</div>
					<div class="type-macro text-amber-900 text-3xl">{streakInfo.currentStreak} Sesi Beruntun</div>
				</div>
			</div>

			<div class="w-full sm:w-72 bg-white/80 backdrop-blur p-3 rounded-xl border border-amber-200">
				<div class="flex items-center justify-between text-xs font-bold mb-1">
					<span class="text-amber-800">Target Milestone: {nextMilestone.streak} Sesi</span>
					<span class="text-indigo-600">+{nextMilestone.bonus} Bonus Poin</span>
				</div>
				<div class="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden">
					<div
						class="h-full bg-amber-500 rounded-full transition-all duration-500"
						style="width: {milestoneProgressPercent}%;"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Grid: Scanner Input Card + Stats -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
		<!-- Scanner Input Form Card -->
		<div class="panel lg:col-span-2 overflow-hidden">
			<div class="section-header">
				<div class="flex items-center gap-2">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
						<rect x="7" y="7" width="3" height="3" fill="currentColor" />
						<rect x="14" y="7" width="3" height="3" fill="currentColor" />
						<rect x="7" y="14" width="3" height="3" fill="currentColor" />
						<rect x="14" y="14" width="3" height="3" fill="currentColor" />
					</svg>
					<span>Form Scan Presensi Mandiri</span>
				</div>
			</div>

			<div class="p-6">
				{#if scanSuccessResult}
					<!-- Celebration Success Panel -->
					<div class="p-6 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl text-center">
						<div class="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
						<h3 class="font-extrabold text-emerald-900 text-lg">Presensi Berhasil Dicatat!</h3>
						<p class="text-xs text-emerald-700 font-medium mt-1">{scanSuccessResult.message}</p>

						<div class="flex items-center justify-center gap-3 mt-4 flex-wrap">
							<span class="badge badge-hadir text-xs px-3 py-1">
								+ {scanSuccessResult.pointsAwarded} Poin Kehadiran
							</span>
							{#if scanSuccessResult.milestoneBonusAwarded > 0}
								<span class="badge badge-excused text-xs px-3 py-1">
									Bonus Milestone +{scanSuccessResult.milestoneBonusAwarded} Poin!
								</span>
							{/if}
						</div>

						<button
							type="button"
							onclick={() => (scanSuccessResult = null)}
							class="btn-ghost text-xs mt-5"
						>
							Scan Token Sesi Lain
						</button>
					</div>
				{:else}
					<form onsubmit={handleScanSubmit} class="space-y-4">
						<div>
							<label for="tokenInput" class="field-label uppercase">
								Kode Token QR (Lihat di Proyektor Mentor) *
							</label>
							<input
								id="tokenInput"
								type="text"
								bind:value={qrTokenInput}
								placeholder="Masukkan kode token di sini..."
								class="field-input font-mono text-base font-bold tracking-wider py-3"
							/>
						</div>

						{#if scanErrorMessage}
							<div class="alert-error">
								{scanErrorMessage}
							</div>
						{/if}

						<button
							type="submit"
							disabled={isSubmitting || !qrTokenInput.trim()}
							class="btn-primary py-3 text-base"
						>
							{#if isSubmitting}
								<span>Memproses Presensi...</span>
							{:else}
								<span>Kirim Presensi Sekarang</span>
							{/if}
						</button>
					</form>
				{/if}
			</div>
		</div>

		<!-- Right Column Quick Specs -->
		<div class="space-y-4">
			<div class="stat-block">
				<div class="stat-block__label">Total Kehadiran Saya</div>
				<div class="stat-block__value text-emerald-700">{totalAttended} Sesi</div>
				<div class="stat-block__meta">Tercatat Hadir Sesi</div>
			</div>

			<div class="stat-block">
				<div class="stat-block__label">Streak Tertinggi</div>
				<div class="stat-block__value text-amber-600">{streakInfo.maxStreak} Sesi</div>
				<div class="stat-block__meta">Rekor Pertemuan Berturut-turut</div>
			</div>
		</div>
	</div>

	<!-- History Table Panel -->
	<div class="panel overflow-hidden">
		<div class="section-header">
			<div class="flex items-center gap-2">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
				<span>Riwayat Kehadiran Sesi Saya</span>
			</div>
			<span class="type-mono text-muted">{history.length} Sesi</span>
		</div>

		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-slate-50 border-bottom text-xs font-extrabold text-slate-600 uppercase">
					<th class="py-3 px-4">Sesi Pertemuan</th>
					<th class="py-3 px-4">Tanggal</th>
					<th class="py-3 px-4">Metode Input</th>
					<th class="py-3 px-4">Status Kehadiran</th>
					<th class="py-3 px-4">Waktu Presensi</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if history.length === 0}
					<tr>
						<td colspan="5" class="text-center py-10 text-slate-500 text-sm">
							Belum ada riwayat presensi yang tercatat.
						</td>
					</tr>
				{:else}
					{#each history as item}
						<tr class="hover:bg-slate-50/80 transition-colors">
							<td class="py-3 px-4">
								<div class="font-bold text-slate-900 text-sm">{item.sessionTitle}</div>
								<div class="type-mono text-slate-500 uppercase">{item.activityType}</div>
							</td>
							<td class="py-3 px-4 text-xs font-semibold text-slate-700">
								{item.sessionDate}
							</td>
							<td class="py-3 px-4">
								{#if item.method === 'qr'}
									<span class="badge badge-live">Scan QR</span>
								{:else if item.method === 'manual'}
									<span class="badge badge-excused">Manual Mentor</span>
								{:else}
									<span class="text-xs text-slate-400">-</span>
								{/if}
							</td>
							<td class="py-3 px-4">
								{#if item.status === 'hadir'}
									<span class="badge badge-hadir">HADIR</span>
								{:else if item.status === 'excused'}
									<span class="badge badge-excused">EXCUSED / IZIN</span>
								{:else}
									<span class="badge badge-absen">BELUM PRESENSI</span>
								{/if}
							</td>
							<td class="py-3 px-4 text-xs font-mono text-slate-600">
								{formatIndoTime(item.recordedAt)}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

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

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}
</style>

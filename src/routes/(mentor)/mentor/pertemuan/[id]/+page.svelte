<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const m = $derived(data.meeting);
	const actBadge = $derived(getActivityBadgeStyle(m.activityType));

	let isInfoExpanded = $state(true);

	function formatIndoDate(dateStr: string): string {
		if (!dateStr) return '-';
		const [y, mVal, d] = dateStr.split('-').map(Number);
		if (!y || !mVal || !d) return dateStr;
		const dateObj = new Date(y, mVal - 1, d);
		const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
		const months = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];
		return `${days[dateObj.getDay()]}, ${d} ${months[mVal - 1]} ${y}`;
	}

	function getActivityBadgeStyle(type: string) {
		switch (type) {
			case 'teori':
				return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'TEORI' };
			case 'praktik':
				return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'PRAKTIK' };
			case 'teori_praktik':
				return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'TEORI & PRAKTIK' };
			case 'games':
				return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'GAMES' };
			case 'quiz':
				return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'QUIZ' };
			case 'santai':
				return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'SANTAI' };
			default:
				return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: type ? type.toUpperCase() : 'SESI' };
		}
	}

	function getTaskSizeBadge(size: string) {
		switch (size) {
			case 'kecil':
				return { label: 'SKALA KECIL', points: '+100 Poin', color: 'bg-sky-50 text-sky-700 border-sky-200' };
			case 'besar':
				return { label: 'SKALA BESAR', points: '+500 Poin', color: 'bg-purple-50 text-purple-700 border-purple-200' };
			default:
				return { label: 'SKALA SEDANG', points: '+250 Poin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
		}
	}

	function getFileExt(url: string | null): string {
		if (!url) return 'FILE';
		const parts = url.split('.');
		const ext = parts[parts.length - 1]?.toUpperCase() ?? 'FILE';
		if (ext.length > 5) return 'FILE';
		return ext;
	}
</script>

<svelte:head>
	<title>{m ? m.title : 'Detail Pertemuan'} — Portal Mentor NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Top Navigation Breadcrumb & Back -->
	<div class="header-top-nav">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/mentor" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<a href="/mentor/pertemuan" class="bc-link">Pertemuan</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Detail Sesi #{m.id}</span>
		</nav>

		<a href="/mentor/pertemuan" class="btn-back">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="19" y1="12" x2="5" y2="12" />
				<polyline points="12 19 5 12 12 5" />
			</svg>
			<span>Kembali ke Daftar Sesi</span>
		</a>
	</div>	<!-- Main Hero Title Banner -->
	<div class="hero-card mb-5">
		<div class="hero-card__content">
			<div class="flex flex-wrap items-center gap-2 mb-2">
				<span class="activity-badge {actBadge.bg} {actBadge.text} {actBadge.border}">
					{actBadge.label}
				</span>
				{#if m.isWeekend}
					<span class="weekend-tag">WEEKEND (+50% BONUS POIN)</span>
				{/if}
				<span class="kelas-tag">{m.kelasName}</span>
			</div>

			<h1 class="hero-title">{m.title}</h1>

			<div class="flex items-center gap-2 mt-2 text-sm text-slate-600">
				<span class="font-medium">Sub-Fase Track Pembelajaran:</span>
				<span class="subphase-pill">{m.subPhaseTitle}</span>
			</div>
		</div>

		<div class="hero-card__actions">
			<a href={`/mentor/presensi?pertemuanId=${m.id}`} class="btn-hero-primary">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
				</svg>
				<span>Buka Presensi QR</span>
			</a>
		</div>
	</div>

	<!-- Quick Stats Row -->
	<div class="stats-grid mb-5">
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Tanggal Pelaksanaan</div>
				<div class="stat-value-sm">{formatIndoDate(m.sessionDate)}</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #ecfdf5; color: #047857;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Waktu Pertemuan</div>
				<div class="stat-value-sm">{m.startTime} - {m.endTime} WIB</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fdf4ff; color: #a21caf;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
					<circle cx="12" cy="10" r="3" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Lokasi / Ruangan</div>
				<div class="stat-value-sm">{m.location || 'Online / Belum ditentukan'}</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fffbeb; color: #b45309;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Status Slide Materi</div>
				<div class="stat-value-sm">{m.materialUrl ? 'Slide Tersedia' : 'Belum Ada Slide'}</div>
			</div>
		</div>
	</div>

	<!-- Main Details Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
		<!-- Left Main Column (Details & Materials) -->
		<div class="lg:col-span-2 stacked-column">
			<!-- Detail Card (Collapsible) -->
			<div class="detail-panel">
				<button
					type="button"
					onclick={() => (isInfoExpanded = !isInfoExpanded)}
					class="panel-header panel-header-clickable flex items-center justify-between w-full text-left"
					aria-expanded={isInfoExpanded}
					aria-label="Sembunyikan atau tampilkan informasi lengkap"
				>
					<h2 class="panel-title">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						Informasi Lengkap Pertemuan
					</h2>

					<span class="collapse-icon-badge">
						<svg
							class="transform transition-transform duration-200 {isInfoExpanded ? 'rotate-180' : ''}"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</span>
				</button>

				{#if isInfoExpanded}
					<div class="panel-body">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div class="info-group">
								<span class="info-label">Judul Sesi Pertemuan</span>
								<span class="info-val-bold">{m.title}</span>
							</div>

							<div class="info-group">
								<span class="info-label">Kelas Instance</span>
								<span class="info-val-bold">{m.kelasName}</span>
							</div>

							<div class="info-group">
								<span class="info-label">Sub-Fase Track Pembelajaran</span>
								<span class="info-val">{m.subPhaseTitle}</span>
							</div>

							<div class="info-group">
								<span class="info-label">Tipe Aktivitas</span>
								<span class="info-val uppercase font-bold text-indigo-700">{m.activityType.replace('_', ' ')}</span>
							</div>

							<div class="info-group">
								<span class="info-label">Tanggal Execution</span>
								<span class="info-val">{formatIndoDate(m.sessionDate)}</span>
							</div>

							<div class="info-group">
								<span class="info-label">Jam Pelaksanaan</span>
								<span class="info-val">{m.startTime} — {m.endTime} WIB</span>
							</div>

							<div class="info-group sm:col-span-2">
								<span class="info-label">Lokasi / Ruangan Klasifikasi</span>
								<span class="info-val">{m.location || 'Online / Belum ditentukan'}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- PPT Slide / Material Card -->
			<div class="detail-panel">
				<div class="panel-header flex items-center justify-between">
					<h2 class="panel-title">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
							<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
						</svg>
						Slide PPT &amp; Modul Pembelajaran
					</h2>
				</div>

				<div class="panel-body">
					{#if m.materialUrl}
						<div class="material-download-box">
							<div class="ext-badge">{getFileExt(m.materialUrl)}</div>
							<div class="flex-1 min-w-0">
								<h4 class="material-box-title">Slide PPT / Modul Pembelajaran Sesi</h4>
								<p class="material-box-sub">File materi telah disiapkan dan siap diakses oleh siswa.</p>
							</div>
							<a
								href={m.materialUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="btn-download"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" y1="14" x2="21" y2="3" />
								</svg>
								<span>Buka Material Slide</span>
							</a>
						</div>
					{:else}
						<div class="empty-material-state">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
							<p class="text-sm font-semibold text-slate-700 mt-2">Belum Ada File Slide / PPT</p>
							<p class="text-xs text-slate-500 max-w-sm mt-1">
								Slide materi belum diunggah untuk pertemuan ini. Anda dapat menambahkan materi melalui tombol Edit Pertemuan.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right Side Column (Task & Quick Presensi) -->
		<div class="stacked-column">
			<!-- Presensi Quick Card -->
			<div class="presensi-card">
				<div class="presensi-card__header">
					<span class="badge badge-hadir">PRESENSI KELAS</span>
					<h3 class="presensi-card__title">Sistem Absensi Sesi</h3>
					<p class="presensi-card__sub">Buka token QR atau catat kehadiran siswa kelas {m.kelasName}.</p>
				</div>
				<a href={`/mentor/presensi?pertemuanId=${m.id}`} class="btn-presensi-action">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
					</svg>
					<span>Buka Scanner Presensi QR &rarr;</span>
				</a>
			</div>

			<!-- Task Nempel Card -->
			<div class="detail-panel">
				<div class="panel-header flex items-center justify-between">
					<h2 class="panel-title">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 11l3 3L22 4" />
							<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
						</svg>
						Penugasan Task (Opsional)
					</h2>
				</div>

				<div class="panel-body">
					{#if !m.tasks || m.tasks.length === 0}
						<div class="empty-task-state">
							<p class="text-xs text-slate-500 italic">Tidak ada task penugasan yang ditempelkan pada pertemuan ini.</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each m.tasks as t}
								{@const sz = getTaskSizeBadge(t.taskSize)}
								<div class="task-card-box">
									<div class="flex items-start justify-between gap-2 mb-2">
										<h4 class="task-card-title">{t.title}</h4>
										<span class="badge {sz.color}">
											{sz.label}
										</span>
									</div>

									<div class="task-points-pill mb-2">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
										<span>Bonus Poin: <strong>{sz.points}</strong></span>
									</div>

									{#if t.description}
										<div class="task-desc-box">
											<span class="task-desc-label">Instruksi Pengerjaan:</span>
											<p class="task-desc-text">{t.description}</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.content-area {
		padding: 32px 36px 64px;
		max-width: 1320px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 20px 18px 48px;
		}
	}

	.header-top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms ease;
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

	.btn-back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 7px 14px;
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-back:hover {
		background: var(--bg-inset);
		color: var(--text-primary);
		border-color: var(--text-muted);
	}

	/* Explicit Vertical Spacing Rules (UI-UX Pro Max 8dp Rhythm) */
	.stacked-column {
		display: flex;
		flex-direction: column;
		gap: 20px !important;
	}

	/* Hero Card */
	.hero-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 22px 26px;
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 20px !important;
	}

	@media (max-width: 768px) {
		.hero-card {
			flex-direction: column;
			padding: 18px 20px;
			margin-bottom: 16px !important;
		}
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: clamp(1.35rem, 2.2vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
		letter-spacing: -0.02em;
	}

	.subphase-pill {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.btn-hero-primary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(135deg, #059669 0%, #10b981 100%);
		color: #ffffff;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		padding: 10px 18px;
		border-radius: var(--radius-md);
		text-decoration: none;
		box-shadow: var(--shadow-glow);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
	}

	.btn-hero-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(5, 150, 105, 0.45);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 20px !important;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 540px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 22px;
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-bottom: 3px;
	}

	.stat-value-sm {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
	}

	/* Detail Panel */
	.detail-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.panel-header {
		padding: 18px 24px;
		border-bottom: 1px solid var(--border-soft);
		background: var(--bg-inset);
	}

	.panel-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.panel-body {
		padding: 24px 28px;
	}

	.info-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.info-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.info-val {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.info-val-bold {
		font-family: var(--font-macro);
		font-size: 14.5px;
		font-weight: 800;
		color: var(--text-primary);
	}

	/* Material Download Box */
	.material-download-box {
		display: flex;
		align-items: center;
		gap: 20px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 20px 24px;
	}

	@media (max-width: 640px) {
		.material-download-box {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.ext-badge {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 800;
		color: #047857;
		background: #d1fae5;
		border: 1px solid #a7f3d0;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		flex-shrink: 0;
	}

	.material-box-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.material-box-sub {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	.btn-download {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1.5px solid var(--primary-border);
		color: var(--primary);
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		padding: 9px 16px;
		border-radius: var(--radius-md);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-download:hover {
		background: var(--primary-light);
		border-color: var(--primary);
	}

	.empty-material-state {
		text-align: center;
		padding: 32px 20px;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.panel-header-clickable {
		cursor: pointer;
		transition: background 150ms ease;
	}

	.panel-header-clickable:hover {
		background: #e2e8f0;
	}

	.collapse-icon-badge {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
	}

	/* Presensi Quick Card (Light Theme Match) */
	.presensi-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 24px 28px;
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
	}

	.presensi-card__title {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 8px;
		margin-bottom: 4px;
	}

	.presensi-card__sub {
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 18px;
		line-height: 1.5;
	}

	.btn-presensi-action {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: #ffffff;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		padding: 11px 18px;
		border-radius: var(--radius-md);
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
		transition: transform 150ms ease;
	}

	.btn-presensi-action:hover {
		transform: translateY(-2px);
	}

	/* Task Card Box */
	.task-card-box {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px;
	}

	.task-card-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.task-points-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: #b45309;
		background: #fffbeb;
		border: 1px solid #fef3c7;
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.task-desc-box {
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid var(--border-soft);
	}

	.task-desc-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.task-desc-text {
		font-size: 12.5px;
		color: var(--text-secondary);
		margin-top: 2px;
		line-height: 1.5;
	}

	.empty-task-state {
		padding: 12px 0;
	}

	/* Utility Badges */
	.activity-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		letter-spacing: 0.04em;
	}

	.weekend-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
	}

	.kelas-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		background: var(--bg-panel);
		color: var(--text-secondary);
		border: 1px solid var(--border-hard);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
	}

	.badge-hadir {
		background: #ecfdf5;
		color: #047857;
		border-color: #a7f3d0;
	}
</style>

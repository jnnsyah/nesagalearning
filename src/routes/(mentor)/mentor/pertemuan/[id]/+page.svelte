<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import PaginationFooter from '$lib/components/ui/PaginationFooter.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';

	let { data }: { data: PageData } = $props();
	const m = $derived(data.meeting);
	const actBadge = $derived(getActivityBadgeStyle(m.activityType));

	const fromParam = $derived(page.url.searchParams.get('from'));
	const isFromDashboard = $derived(fromParam === 'dashboard');
	const backHref = $derived(isFromDashboard ? '/mentor' : '/mentor/pertemuan');
	const backLabel = $derived(isFromDashboard ? 'Kembali ke Dashboard' : 'Kembali ke Daftar');
	const presensiHref = $derived(
		`/mentor/presensi?pertemuanId=${m.id}&from=detail${isFromDashboard ? '&from_dashboard=true' : ''}`
	);

	let isInfoExpanded = $state(true);
	let rosterFilter = $state<'all' | 'hadir' | 'excused' | 'belum_hadir'>('all');
	let searchQuery = $state('');

	// Roster Pagination State
	let rosterPage = $state(1);
	const rosterPageSize = 10;

	// Attendance Roster Derived Metrics
	const studentList = $derived(data.attendanceList || []);
	const totalStudents = $derived(studentList.length);
	const totalHadir = $derived(studentList.filter((s) => s.status === 'hadir').length);
	const totalIzin = $derived(studentList.filter((s) => s.status === 'excused').length);
	const totalBelum = $derived(studentList.filter((s) => s.status === 'belum_hadir').length);
	const attendancePercentage = $derived(
		totalStudents > 0 ? Math.round((totalHadir / totalStudents) * 100) : 0
	);

	const filteredRoster = $derived.by(() => {
		return studentList.filter((s) => {
			if (rosterFilter !== 'all' && s.status !== rosterFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.trim().toLowerCase();
				const matchName = s.fullName.toLowerCase().includes(q);
				const matchUser = s.username.toLowerCase().includes(q);
				if (!matchName && !matchUser) return false;
			}
			return true;
		});
	});

	const totalRosterItems = $derived(filteredRoster.length);
	const totalRosterPages = $derived(Math.ceil(totalRosterItems / rosterPageSize) || 1);
	const paginatedRoster = $derived.by(() => {
		const start = (rosterPage - 1) * rosterPageSize;
		return filteredRoster.slice(start, start + rosterPageSize);
	});

	function handleRosterFilterChange(newFilter: 'all' | 'hadir' | 'excused' | 'belum_hadir') {
		rosterFilter = newFilter;
		rosterPage = 1;
	}

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

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '-';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

	function formatTime(val: string | Date | null | undefined): string {
		if (!val) return '-';
		const d = new Date(val);
		if (isNaN(d.getTime())) return String(val);
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${hh}:${mm} WIB`;
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
		const clean = url.split('?')[0];
		const parts = clean.split('.');
		const ext = parts[parts.length - 1]?.toUpperCase() ?? 'FILE';
		if (ext.length > 5 || ext === clean.toUpperCase()) return 'LINK';
		return ext;
	}
</script>

<svelte:head>
	<title>{m ? m.title : 'Detail Pertemuan'} — Portal Mentor NLC</title>
</svelte:head>

<div class="page-container">
	<PageHeaderCard
		title={m.title}
		breadcrumbs={[
			{ label: 'Dashboard', href: '/mentor' },
			...(isFromDashboard ? [] : [{ label: 'Pertemuan', href: '/mentor/pertemuan' }]),
			{ label: `Detail Sesi #${m.id}` }
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
				Sub-Fase Track Pembelajaran: <strong class="text-indigo-600 font-semibold">{m.subPhaseTitle}</strong>
			</p>
		{/snippet}

		{#snippet actions()}
			<a href={presensiHref} class="btn-create-pill">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
				</svg>
				<span>Buka Presensi QR</span>
			</a>
		{/snippet}
	</PageHeaderCard>

	<!-- Quick Stats Grid (4 Metrics Cards) -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Waktu Pertemuan</div>
				<div class="stat-value-sm">{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fdf4ff; color: #a21caf;">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 6v6l4 2" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Tingkat Kehadiran</div>
				<div class="stat-value-sm text-emerald-700">{attendancePercentage}% ({totalHadir}/{totalStudents})</div>
			</div>
		</div>
	</div>

	<!-- Main Details Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
		<!-- Left Main Column (Detail Card & Daftar Presensi Siswa Roster) -->
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
								<span class="info-val">{formatTimeOnly(m.startTime)} — {formatTimeOnly(m.endTime)} WIB</span>
							</div>

							<div class="info-group sm:col-span-2">
								<span class="info-label">Lokasi / Ruangan Klasifikasi</span>
								<span class="info-val">{m.location || 'Online / Belum ditentukan'}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Student Presensi Roster Panel (Daftar Hadir Card - Direct Below Detail Card) -->
			<div class="detail-panel">
				<div class="panel-header flex items-center justify-between flex-wrap gap-3">
					<h2 class="panel-title">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						Daftar Presensi Siswa Sesi ({totalHadir}/{totalStudents} Hadir)
					</h2>

					<a href={presensiHref} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
						Kelola Presensi Full &rarr;
					</a>
				</div>

				<div class="panel-body">
					<!-- Roster Filters & Search -->
					<div class="roster-toolbar mb-4">
						<div class="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								class="roster-tab"
								class:active={rosterFilter === 'all'}
								onclick={() => handleRosterFilterChange('all')}
							>
								Semua ({totalStudents})
							</button>
							<button
								type="button"
								class="roster-tab roster-tab--hadir"
								class:active={rosterFilter === 'hadir'}
								onclick={() => handleRosterFilterChange('hadir')}
							>
								Hadir ({totalHadir})
							</button>
							<button
								type="button"
								class="roster-tab roster-tab--izin"
								class:active={rosterFilter === 'excused'}
								onclick={() => handleRosterFilterChange('excused')}
							>
								Izin/Sakit ({totalIzin})
							</button>
							<button
								type="button"
								class="roster-tab roster-tab--belum"
								class:active={rosterFilter === 'belum_hadir'}
								onclick={() => handleRosterFilterChange('belum_hadir')}
							>
								Belum Absen ({totalBelum})
							</button>
						</div>

						<input
							type="text"
							placeholder="Cari siswa…"
							bind:value={searchQuery}
							oninput={() => (rosterPage = 1)}
							class="roster-search-input"
						/>
					</div>

					{#if filteredRoster.length === 0}
						<div class="empty-task-state py-8 text-center text-xs text-slate-500">
							Tidak ada data siswa yang sesuai dengan filter.
						</div>
					{:else}
						<div class="table-responsive">
							<table class="roster-data-table">
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
									{#each paginatedRoster as st, idx (st.userId)}
										<tr>
											<td class="font-mono text-xs text-slate-400">{(rosterPage - 1) * rosterPageSize + idx + 1}</td>
											<td>
												<div class="flex items-center gap-2">
													<div class="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600 text-xs flex items-center justify-center shrink-0">
														{st.fullName.charAt(0).toUpperCase()}
													</div>
													<div class="flex flex-col min-w-0">
														<span class="font-bold text-slate-900 text-xs truncate">{st.fullName}</span>
														<span class="text-[11px] text-slate-500 font-mono">@{st.username}</span>
													</div>
												</div>
											</td>
											<td>
												{#if st.status === 'hadir'}
													<span class="badge-status-pill badge-status-pill--hadir">HADIR</span>
												{:else if st.status === 'excused'}
													<span class="badge-status-pill badge-status-pill--izin" title={st.manualReason || ''}>
														IZIN / SAKIT
													</span>
												{:else}
													<span class="badge-status-pill badge-status-pill--belum">BELUM ABSEN</span>
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

						<div class="mt-4">
							<PaginationFooter
								currentPage={rosterPage}
								totalPages={totalRosterPages}
								totalItems={totalRosterItems}
								pageSize={rosterPageSize}
								onPageChange={(p) => (rosterPage = p)}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right Side Column (Presensi Card, PPT Slide Card, Task Card) -->
		<div class="stacked-column">
			<!-- Presensi Quick Card -->
			<div class="presensi-card">
				<div class="presensi-card__header">
					<span class="badge badge-hadir">PRESENSI KELAS</span>
					<h3 class="presensi-card__title">Sistem Absensi Sesi</h3>
					<p class="presensi-card__sub">Buka token QR atau catat kehadiran siswa kelas {m.kelasName}.</p>
				</div>
				<a href={presensiHref} class="btn-presensi-action">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
					</svg>
					<span>Buka Scanner Presensi QR &rarr;</span>
				</a>
			</div>

			<!-- PPT Slide / Material Card (Moved below Presensi Quick Card) -->
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
						<div class="material-download-box flex-col items-start">
							<div class="flex items-center gap-3 w-full">
								<div class="ext-badge">{getFileExt(m.materialUrl)}</div>
								<div class="flex-1 min-w-0">
									<h4 class="material-box-title truncate">Slide PPT / Modul Sesi</h4>
									<p class="material-box-sub text-xs">File materi siap diakses.</p>
								</div>
							</div>
							<a
								href={m.materialUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="btn-download w-full justify-center mt-2"
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
							<p class="text-xs text-slate-500 max-w-sm mt-1 text-center">
								Slide materi belum diunggah untuk pertemuan ini.
							</p>
						</div>
					{/if}
				</div>
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
		gap: 8px;
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

	.activity-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		border-width: 1px;
		border-style: solid;
		white-space: nowrap;
	}

	.weekend-tag-pill {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: #fffbeb;
		color: #b45309;
		border: 1px solid #fde68a;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}

	.kelas-tag-pill {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: #f8fafc;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
	}

	.btn-secondary-head-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
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

	/* Vertical Spacing & Column Rhythm */
	.stacked-column {
		display: flex;
		flex-direction: column;
		gap: 20px !important;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-top: 0 !important;
		margin-bottom: 24px !important;
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
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.stat-icon {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-label {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #64748b;
		margin-bottom: 2px;
	}

	.stat-value-sm {
		font-family: var(--font-macro, sans-serif);
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
	}

	/* Detail Panels */
	.detail-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		overflow: hidden;
	}

	.panel-header {
		padding: 16px 22px;
		border-bottom: 1px solid #f1f5f9;
		background: #f8fafc;
	}

	.panel-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13.5px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #0f172a;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.panel-body {
		padding: 22px 24px;
	}

	.info-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.info-label {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #64748b;
	}

	.info-val {
		font-size: 14px;
		font-weight: 600;
		color: #0f172a;
	}

	.info-val-bold {
		font-family: var(--font-macro, sans-serif);
		font-size: 14.5px;
		font-weight: 800;
		color: #0f172a;
	}

	/* Material Download Box */
	.material-download-box {
		display: flex;
		align-items: center;
		gap: 20px;
		background: #f8fafc;
		border: 1.5px solid #e2e8f0;
		border-radius: 12px;
		padding: 18px 22px;
	}

	@media (max-width: 640px) {
		.material-download-box {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.ext-badge {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		font-weight: 800;
		color: #047857;
		background: #d1fae5;
		border: 1px solid #a7f3d0;
		padding: 8px 12px;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.material-box-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
	}

	.material-box-sub {
		font-size: 12px;
		color: #64748b;
		margin-top: 2px;
	}

	.btn-download {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1.5px solid #c7d2fe;
		color: #4f46e5;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		padding: 9px 16px;
		border-radius: 8px;
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-download:hover {
		background: #eef2ff;
		border-color: #4f46e5;
	}

	.empty-material-state {
		text-align: center;
		padding: 28px 20px;
		color: #64748b;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.panel-header-clickable {
		cursor: pointer;
		transition: background 150ms ease;
	}

	.panel-header-clickable:hover {
		background: #f1f5f9;
	}

	.collapse-icon-badge {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
	}

	/* Student Presensi Roster Table */
	.roster-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.roster-tab {
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.roster-tab:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.roster-tab.active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.roster-tab--hadir.active { background: #10b981; border-color: #10b981; }
	.roster-tab--izin.active { background: #f59e0b; border-color: #f59e0b; }
	.roster-tab--belum.active { background: #64748b; border-color: #64748b; }

	.roster-search-input {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		font-size: 11.5px;
		outline: none;
		transition: border-color 150ms ease;
		width: 160px;
	}

	.roster-search-input:focus {
		border-color: #6366f1;
	}

	.table-responsive {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.roster-data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 620px;
	}

	.roster-data-table th {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		color: #64748b;
		padding: 8px 10px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.roster-data-table td {
		padding: 10px;
		border-bottom: 1px solid #f1f5f9;
		font-size: 12.5px;
	}

	.badge-status-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 8px;
		border-radius: 4px;
		font-family: var(--font-macro, sans-serif);
		font-size: 10px;
		font-weight: 700;
	}

	.badge-status-pill--hadir { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
	.badge-status-pill--izin { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
	.badge-status-pill--belum { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

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

	/* Presensi Quick Card */
	.presensi-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 22px 24px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.presensi-card__title {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: #0f172a;
		margin-top: 8px;
		margin-bottom: 4px;
	}

	.presensi-card__sub {
		font-size: 12px;
		color: #64748b;
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
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		padding: 11px 18px;
		border-radius: 8px;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
		transition: transform 150ms ease;
	}

	.btn-presensi-action:hover {
		transform: translateY(-2px);
	}

	/* Task Card Box */
	.task-card-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px;
	}

	.task-card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13.5px;
		font-weight: 800;
		color: #0f172a;
	}

	.task-points-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: #b45309;
		background: #fffbeb;
		border: 1px solid #fde68a;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.task-desc-box {
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid #f1f5f9;
	}

	.task-desc-label {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
	}

	.task-desc-text {
		font-size: 12.5px;
		color: #475569;
		margin-top: 2px;
		line-height: 1.5;
	}

	.empty-task-state {
		padding: 12px 0;
	}

	.badge {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid transparent;
	}

	.badge-hadir {
		background: #ecfdf5;
		color: #047857;
		border-color: #a7f3d0;
	}
</style>

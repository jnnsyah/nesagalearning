<script lang="ts">
	import { enhance } from '$app/forms';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type SubmissionItem = (typeof data.submissions)[number];
	type MeetingSummaryItem = (typeof data.meetingSummaries)[number];

	// Master-Detail Navigation State
	let selectedPertemuanId = $state<number | null>(null);

	// Level 1 Filters State (like /mentor/pertemuan)
	let selectedKelasFilter = $state<string>('all');
	let selectedTrackFilter = $state<string>('all');
	let selectedActivityFilter = $state<string>('all');

	let searchQuery = $state('');
	let selectedStatusFilter = $state<string>('all');
	let selectedTaskSize = $state<string>('all');

	// Review modal state
	let activeReviewTarget = $state<SubmissionItem | null>(null);
	let reviewStatus = $state<'approved' | 'revisi'>('approved');
	let reviewFeedback = $state('');
	let isSubmitting = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Penilaian berhasil disimpan');
			activeReviewTarget = null;
			reviewFeedback = '';
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	let activeMeetingSummary = $derived(
		(data.meetingSummaries || []).find((m) => m.pertemuanId === selectedPertemuanId) || null
	);

	let kelasOptions = $derived([
		{ value: 'all', label: 'Semua Kelas' },
		...Array.from(
			new Set((data.meetingSummaries || []).map((m) => m.kelasName).filter(Boolean))
		).map((k) => ({ value: String(k), label: String(k) }))
	]);

	let trackOptions = $derived([
		{ value: 'all', label: 'Semua Track Kurikulum' },
		...Array.from(
			new Set(
				(data.meetingSummaries || [])
					.map((m) => (m.phaseTitle ? `${m.phaseTitle} › ${m.subPhaseTitle}` : null))
					.filter(Boolean)
			)
		).map((t) => ({ value: String(t), label: String(t) }))
	]);

	let activityOptions = $derived([
		{ value: 'all', label: 'Semua Tipe Aktivitas' },
		{ value: 'teori', label: 'Teori & Pemahaman' },
		{ value: 'praktik', label: 'Praktik & Coding' },
		{ value: 'teori_praktik', label: 'Teori & Praktik' },
		{ value: 'games', label: 'Quiz / Challenge' }
	]);

	// Level 1: Filtered Meeting Summaries Grid
	let filteredMeetingSummaries = $derived(
		(data.meetingSummaries || []).filter((m) => {
			if (selectedKelasFilter !== 'all' && m.kelasName !== selectedKelasFilter) {
				return false;
			}
			if (selectedTrackFilter !== 'all') {
				const fullTrack = `${m.phaseTitle} › ${m.subPhaseTitle}`;
				if (fullTrack !== selectedTrackFilter) return false;
			}
			if (selectedActivityFilter !== 'all' && m.activityType !== selectedActivityFilter) {
				return false;
			}
			if (searchQuery.trim() !== '') {
				const q = searchQuery.toLowerCase();
				const titleMatch = m.pertemuanTitle?.toLowerCase().includes(q);
				const taskMatch = m.taskTitle?.toLowerCase().includes(q);
				const phaseMatch = m.phaseTitle?.toLowerCase().includes(q);
				const subPhaseMatch = m.subPhaseTitle?.toLowerCase().includes(q);
				return titleMatch || taskMatch || phaseMatch || subPhaseMatch;
			}
			return true;
		})
	);

	// Level 2: Submissions for the selected meeting
	let selectedMeetingSubmissions = $derived(
		(data.submissions || []).filter((sub) => {
			if (selectedPertemuanId !== null && sub.pertemuanId !== selectedPertemuanId) {
				return false;
			}
			if (selectedStatusFilter !== 'all' && sub.status !== selectedStatusFilter) {
				return false;
			}
			if (selectedTaskSize !== 'all' && sub.taskSize !== selectedTaskSize) {
				return false;
			}
			if (searchQuery.trim() !== '') {
				const q = searchQuery.toLowerCase();
				const nameMatch = sub.studentName?.toLowerCase().includes(q);
				const usernameMatch = sub.studentUsername?.toLowerCase().includes(q);
				const taskMatch = sub.taskTitle?.toLowerCase().includes(q);
				return nameMatch || usernameMatch || taskMatch;
			}
			return true;
		})
	);

	let pendingCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'pending').length
	);
	let approvedCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'approved').length
	);
	let revisiCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'revisi').length
	);

	function openReviewModal(sub: SubmissionItem, action: 'approved' | 'revisi') {
		activeReviewTarget = sub;
		reviewStatus = action;
		reviewFeedback = sub.feedback || '';
	}

	function closeReviewModal() {
		activeReviewTarget = null;
		reviewFeedback = '';
	}

	function selectMeeting(pertemuanId: number) {
		selectedPertemuanId = pertemuanId;
		searchQuery = '';
		selectedStatusFilter = 'all';
		selectedTaskSize = 'all';
	}

	function backToMeetingGrid() {
		selectedPertemuanId = null;
		searchQuery = '';
		selectedStatusFilter = 'all';
		selectedTaskSize = 'all';
	}

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';
		const d = new Date(dateVal);
		if (isNaN(d.getTime())) return String(dateVal);
		const months = [
			'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
			'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
		];
		const hours = String(d.getHours()).padStart(2, '0');
		const mins = String(d.getMinutes()).padStart(2, '0');
		return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hours}:${mins}`;
	}
</script>

<svelte:head>
	<title>Penilaian Tugas Siswa — Portal Mentor NLC</title>
</svelte:head>

<div class="content-area">
	{#if selectedPertemuanId === null}
		<!-- LEVEL 1: MASTER GRID VIEW (PILIH PERTEMUAN) -->
		<!-- Page Header Card -->
		<div class="header-card">
			<div class="page-header-row" style="margin-bottom: 0;">
				<div>
					<nav class="breadcrumb" aria-label="Breadcrumb">
						<a href="/mentor" class="bc-link">Dashboard</a>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<span class="bc-current">Penilaian Tugas</span>
					</nav>
					<h1 class="page-title">Daftar Pertemuan Ber-Tugas</h1>
					<p class="page-sub">
						Pilih sesi pertemuan di bawah ini untuk memeriksa hasil submisi tugas dari siswa, memberikan feedback, dan menyetujui poin.
					</p>
				</div>
			</div>
		</div>

		<!-- Overview Stats Grid -->
		<div class="stats-row">
			<div class="stat-card">
				<div class="stat-card__icon" style="background: #e0e7ff; color: #4f46e5;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Sesi Pertemuan</div>
					<div class="stat-card__value">{(data.meetingSummaries || []).length}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #fef3c7; color: #d97706;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Pending Review</div>
					<div class="stat-card__value" style="color: #d97706;">{pendingCountTotal}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #dcfce7; color: #16a34a;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Total Disetujui</div>
					<div class="stat-card__value" style="color: #16a34a;">{approvedCountTotal}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #ffe4e6; color: #e11d48;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Perlu Revisi</div>
					<div class="stat-card__value" style="color: #e11d48;">{revisiCountTotal}</div>
				</div>
			</div>
		</div>

		<!-- Filter & Search Bar Pertemuan (Level 1 Master View) -->
		<div class="filter-panel">
			<div class="filter-grid">
				<div class="filter-search-col">
					<div class="search-input-wrap">
						<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Cari nama sesi pertemuan, judul tugas, atau track kurikulum..."
							class="search-input"
						/>
						{#if searchQuery}
							<button type="button" onclick={() => (searchQuery = '')} class="search-clear-btn">✕</button>
						{/if}
					</div>
				</div>

				<div class="filter-select-col">
					<CustomSelect
						id="kelas-filter-l1"
						label="Filter Kelas"
						bind:value={selectedKelasFilter}
						options={kelasOptions}
					/>
				</div>

				<div class="filter-select-col">
					<CustomSelect
						id="track-filter-l1"
						label="Filter Track"
						bind:value={selectedTrackFilter}
						options={trackOptions}
					/>
				</div>

				<div class="filter-select-col">
					<CustomSelect
						id="activity-filter-l1"
						label="Tipe Sesi"
						bind:value={selectedActivityFilter}
						options={activityOptions}
					/>
				</div>
			</div>
		</div>

		<!-- Grid Cards Pertemuan (Master View) -->
		{#if filteredMeetingSummaries.length === 0}
			<div class="empty-card">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<div class="empty-title">Tidak Ada Pertemuan Ber-Tugas Ditemukan</div>
				<div class="empty-sub">Belum ada sesi pertemuan yang memiliki penugasan task sesuai pencarian.</div>
			</div>
		{:else}
			<div class="meeting-summary-grid">
				{#each filteredMeetingSummaries as m (m.pertemuanId)}
					<div class="meeting-summary-card">
						<div class="card-top-row mb-2">
							<span class="track-badge">
								{m.phaseTitle || 'Kurikulum Track'} &rsaquo; {m.subPhaseTitle || 'Sub-Phase'}
							</span>
							<span class="task-size-pill">
								{m.taskSize.toUpperCase()} (+{m.taskSize === 'kecil' ? '50' : m.taskSize === 'besar' ? '200' : '100'} Poin)
							</span>
						</div>

						<h3 class="meeting-card-title">{m.pertemuanTitle}</h3>
						<p class="meeting-card-date">
							Sesi: <strong>{formatIndoDate(m.sessionDate)}</strong> · {m.kelasName}
						</p>

						<div class="task-info-box">
							<span class="task-info-label">Judul Task:</span>
							<strong class="task-info-title">{m.taskTitle}</strong>
							{#if m.taskDescription}
								<p class="task-info-desc">{m.taskDescription}</p>
							{/if}
						</div>

						<!-- Live Submission Stats Grid -->
						<div class="submission-stats-grid">
							<div class="stat-pill stat-pending">
								<span class="stat-num">{m.stats.pending}</span>
								<span class="stat-txt">Pending</span>
							</div>
							<div class="stat-pill stat-approved">
								<span class="stat-num">{m.stats.approved}</span>
								<span class="stat-txt">Disetujui</span>
							</div>
							<div class="stat-pill stat-revisi">
								<span class="stat-num">{m.stats.revisi}</span>
								<span class="stat-txt">Revisi</span>
							</div>
							<div class="stat-pill stat-total">
								<span class="stat-num">{m.stats.total}</span>
								<span class="stat-txt">Total Submisi</span>
							</div>
						</div>

						<div class="card-action-bar">
							<button
								type="button"
								onclick={() => selectMeeting(m.pertemuanId)}
								class="btn-create"
								style="width: 100%; justify-content: center;"
							>
								<span>Periksa Submisi ({m.stats.total})</span>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="5" y1="12" x2="19" y2="12" />
									<polyline points="12 5 19 12 12 19" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<!-- LEVEL 2: DETAIL SUBMISSION TABLE VIEW (DETAIL SUBMISI PERTEMUAN TERPILIH) -->
		<div class="mb-4">
			<button type="button" onclick={backToMeetingGrid} class="btn-ghost">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				<span>Kembali ke Daftar Pertemuan</span>
			</button>
		</div>

		{#if activeMeetingSummary}
			<!-- Meeting Header Card -->
			<div class="header-card mb-6">
				<div class="page-header-row" style="margin-bottom: 0;">
					<div>
						<nav class="breadcrumb" aria-label="Breadcrumb">
							<a href="/mentor" class="bc-link">Dashboard</a>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<polyline points="9 18 15 12 9 6" />
							</svg>
							<button type="button" onclick={backToMeetingGrid} class="bc-link" style="border:none; background:none; padding:0; cursor:pointer;">
								Penilaian Tugas
							</button>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<polyline points="9 18 15 12 9 6" />
							</svg>
							<span class="bc-current">{activeMeetingSummary.pertemuanTitle}</span>
						</nav>
						<h1 class="page-title">{activeMeetingSummary.pertemuanTitle}</h1>
						<p class="page-sub">
							Task: <strong>{activeMeetingSummary.taskTitle}</strong> ({activeMeetingSummary.taskSize.toUpperCase()}) · Sesi: {formatIndoDate(activeMeetingSummary.sessionDate)} · {activeMeetingSummary.kelasName}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Filter Panel Level 2 (Status & Bobot & Search Siswa) -->
		<div class="filter-panel">
			<div class="filter-grid">
				<div class="filter-search-col">
					<div class="search-input-wrap">
						<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Cari nama siswa atau username..."
							class="search-input"
						/>
						{#if searchQuery}
							<button type="button" onclick={() => (searchQuery = '')} class="search-clear-btn">✕</button>
						{/if}
					</div>
				</div>

				<div class="filter-select-col-half">
					<CustomSelect
						id="status-filter-l2"
						label="Status Submisi"
						bind:value={selectedStatusFilter}
						options={[
							{ value: 'all', label: 'Semua Status' },
							{ value: 'pending', label: 'Pending Review' },
							{ value: 'approved', label: 'Disetujui' },
							{ value: 'revisi', label: 'Perlu Revisi' }
						]}
					/>
				</div>

				<div class="filter-select-col-half">
					<CustomSelect
						id="task-size-filter-l2"
						label="Bobot Tugas"
						bind:value={selectedTaskSize}
						options={[
							{ value: 'all', label: 'Semua Bobot' },
							{ value: 'kecil', label: 'Kecil (+50 Poin)' },
							{ value: 'sedang', label: 'Sedang (+100 Poin)' },
							{ value: 'besar', label: 'Besar (+200 Poin)' }
						]}
					/>
				</div>
			</div>
		</div>

		<!-- Data Table Submisi Siswa (Level 2 Detail) -->
		{#if selectedMeetingSubmissions.length === 0}
			<div class="empty-card">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<div class="empty-title">Tidak Ada Submission Ditemukan</div>
				<div class="empty-sub">Belum ada tugas yang dikirimkan oleh siswa untuk pertemuan ini sesuai filter.</div>
			</div>
		{:else}
			<div class="table-panel">
				<div class="table-bar-header">
					<span class="table-bar-title">Menampilkan {selectedMeetingSubmissions.length} Submisi Siswa</span>
				</div>

				<table class="data-table">
					<thead>
						<tr>
							<th>Siswa &amp; Kelas</th>
							<th>Tugas &amp; Track</th>
							<th>Link Submisi</th>
							<th>Waktu Kirim</th>
							<th>Status</th>
							<th style="text-align: right;">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each selectedMeetingSubmissions as sub (sub.id)}
							<tr>
								<td>
									<div class="student-block">
										<span class="student-name">{sub.studentName}</span>
										<span class="student-username">@{sub.studentUsername} · {sub.kelasName}</span>
									</div>
								</td>
								<td>
									<div class="task-block">
										<span class="task-title">{sub.taskTitle}</span>
										{#if sub.phaseTitle && sub.subPhaseTitle}
											<span class="curriculum-path" style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
												{sub.phaseTitle} &rsaquo; {sub.subPhaseTitle}
											</span>
										{/if}
									</div>
								</td>
								<td>
									<a
										href={sub.link}
										target="_blank"
										rel="noopener noreferrer"
										class="link-url"
										title={sub.link}
									>
										<span>Buka Link</span>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
									</a>
								</td>
								<td>
									<span class="time-text">{formatIndoDate(sub.submittedAt)}</span>
								</td>
								<td>
									{#if sub.status === 'pending'}
										<span class="badge badge-pending">PENDING</span>
									{:else if sub.status === 'approved'}
										<span class="badge badge-approved">DISETUJUI</span>
									{:else}
										<span class="badge badge-revisi">REVISI</span>
									{/if}
								</td>
								<td style="text-align: right;">
									<div class="action-buttons-cell">
										{#if sub.status === 'approved'}
											<span class="badge badge-approved" style="padding: 6px 12px; font-size: 11px;">
												✓ Disetujui
											</span>
											<button
												type="button"
												onclick={() => openReviewModal(sub, 'revisi')}
												class="btn-action btn-revisi"
												title="Minta Revisi Ulang"
											>
												Revisi
											</button>
										{:else if sub.status === 'revisi'}
											<button
												type="button"
												onclick={() => openReviewModal(sub, 'approved')}
												class="btn-action btn-approve"
												title="Setujui & Beri Poin"
											>
												Setujui
											</button>
											<span class="badge badge-revisi" style="padding: 6px 12px; font-size: 11px;">
												Revisi
											</span>
										{:else}
											<button
												type="button"
												onclick={() => openReviewModal(sub, 'approved')}
												class="btn-action btn-approve"
												title="Setujui & Beri Poin"
											>
												Setujui
											</button>
											<button
												type="button"
												onclick={() => openReviewModal(sub, 'revisi')}
												class="btn-action btn-revisi"
												title="Minta Revisi"
											>
												Revisi
											</button>
										{/if}
									</div>
								</td>
							</tr>
							{#if sub.feedback}
								<tr class="feedback-row">
									<td colspan="6">
										<div class="feedback-box">
											<strong>Catatan Mentor:</strong> {sub.feedback}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- Modal Dialog Review -->
{#if activeReviewTarget}
	<div class="form-scrim" role="dialog" aria-modal="true">
		<div class="review-modal">
			<div class="modal-header">
				<div>
					<h3 class="modal-title">
						{reviewStatus === 'approved' ? 'Setujui Tugas' : 'Minta Revisi Tugas'}
					</h3>
					<p class="modal-sub">
						{activeReviewTarget.studentName} — {activeReviewTarget.taskTitle}
					</p>
				</div>
				<button type="button" onclick={closeReviewModal} class="modal-close-btn" aria-label="Tutup">✕</button>
			</div>

			<form
				method="POST"
				action="?/review"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="modal-body"
			>
				<input type="hidden" name="submissionId" value={activeReviewTarget.id} />
				<input type="hidden" name="status" value={reviewStatus} />

				<div class="info-preview-box">
					<div><strong>Pertemuan:</strong> {activeReviewTarget.pertemuanTitle} ({formatIndoDate(activeReviewTarget.sessionDate)})</div>
					{#if activeReviewTarget.phaseTitle && activeReviewTarget.subPhaseTitle}
						<div><strong>Kurikulum:</strong> {activeReviewTarget.phaseTitle} &rsaquo; {activeReviewTarget.subPhaseTitle}</div>
					{/if}
					<div><strong>Link Submisi:</strong> <a href={activeReviewTarget.link} target="_blank" class="preview-link">{activeReviewTarget.link}</a></div>
					<div><strong>Ukuran Task:</strong> {activeReviewTarget.taskSize.toUpperCase()} ({activeReviewTarget.taskSize === 'kecil' ? '+50 Poin' : activeReviewTarget.taskSize === 'besar' ? '+200 Poin' : '+100 Poin'})</div>
				</div>

				<div class="mt-4">
					<TextArea
						id="feedback"
						name="feedback"
						label={reviewStatus === 'approved' ? 'Catatan Umpan Balik (Opsional)' : 'Catatan Instruksi Revisi'}
						placeholder={reviewStatus === 'approved' ? 'Contoh: Pekerjaan sangat rapi & konfigurasi tepat!' : 'Contoh: Mohon perbaiki bagian router bgp dan upload ulang link...'}
						bind:value={reviewFeedback}
						rows={4}
						required={reviewStatus === 'revisi'}
					/>
				</div>

				<div class="modal-footer mt-6">
					<button type="button" onclick={closeReviewModal} class="btn-ghost">
						Batal
					</button>
					{#if reviewStatus === 'approved'}
						<button type="submit" disabled={isSubmitting} class="btn-create" style="background:#16a34a;">
							{isSubmitting ? 'Menyimpan...' : 'Setujui & Tambah Poin'}
						</button>
					{:else}
						<button type="submit" disabled={isSubmitting} class="btn-create" style="background:#e11d48;">
							{isSubmitting ? 'Menyimpan...' : 'Kirim Catatan Revisi'}
						</button>
					{/if}
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.content-area {
		padding: 24px 32px 60px;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}

	/* Header Card Container */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}

	@media (max-width: 640px) {
		.page-header-row {
			flex-direction: column;
		}
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
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

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
		line-height: 1.2;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 680px;
		line-height: 1.5;
	}

	.btn-create {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: white;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		padding: 10px 18px;
		border: none;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-glow);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(79, 70, 229, 0.45);
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 9px 16px;
		cursor: pointer;
		transition: all 150ms ease;
		text-decoration: none;
	}

	.btn-ghost:hover {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	/* Stats Row */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	@media (max-width: 1024px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 18px 20px;
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.stat-card__icon {
		width: 42px;
		height: 42px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
	}

	/* Filter Panel */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
		align-items: flex-end;
	}

	.filter-search-col {
		grid-column: 1 / -1;
		width: 100%;
	}

	.filter-select-col,
	.filter-select-col-half {
		grid-column: span 12;
	}

	@media (min-width: 768px) {
		.filter-search-col {
			grid-column: 1 / -1;
		}

		.filter-select-col {
			grid-column: span 4;
		}

		.filter-select-col-half {
			grid-column: span 6;
		}
	}

	.search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 9px 34px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	.search-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.search-clear-btn {
		position: absolute;
		right: 10px;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 12px;
		cursor: pointer;
		padding: 4px;
	}

	/* Meeting Summary Cards Grid (Level 1) */
	.meeting-summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 20px;
	}

	.meeting-summary-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
	}

	.meeting-summary-card:hover {
		border-color: var(--primary-border);
		box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.12);
		transform: translateY(-2px);
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.track-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--primary);
		background: var(--primary-light);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
	}

	.task-size-pill {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--text-secondary);
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		padding: 3px 8px;
		border-radius: var(--radius-full);
	}

	.meeting-card-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 8px 0 2px;
	}

	.meeting-card-date {
		font-size: 12.5px;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.task-info-box {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px;
		margin-bottom: 16px;
	}

	.task-info-label {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.task-info-title {
		font-size: 13.5px;
		color: var(--text-primary);
	}

	.task-info-desc {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 4px;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Submission Stats Grid inside Meeting Card */
	.submission-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 16px;
	}

	.stat-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8px 4px;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		text-align: center;
	}

	.stat-pending {
		background: #fef3c7;
		border-color: #fde68a;
		color: #b45309;
	}

	.stat-approved {
		background: #dcfce7;
		border-color: #bbf7d0;
		color: #15803d;
	}

	.stat-revisi {
		background: #ffe4e6;
		border-color: #fecdd3;
		color: #be123c;
	}

	.stat-total {
		background: var(--bg-inset);
		border-color: var(--border-hard);
		color: var(--text-primary);
	}

	.stat-num {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		line-height: 1;
	}

	.stat-txt {
		font-size: 10px;
		font-weight: 600;
		margin-top: 3px;
		white-space: nowrap;
	}

	.card-action-bar {
		margin-top: auto;
	}

	/* High Density Table & Level 2 Views */
	.table-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow-x: auto;
	}

	.table-bar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 20px;
		background: #ffffff;
		border-bottom: 1px solid var(--border-hard);
	}

	.table-bar-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.data-table th {
		background: var(--bg-inset);
		padding: 12px 16px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--border-hard);
	}

	.data-table td {
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 13px;
		color: var(--text-primary);
		vertical-align: middle;
	}

	.data-table tbody tr:hover {
		background: #f8fafc;
	}

	.student-block, .task-block {
		display: flex;
		flex-direction: column;
	}

	.student-name, .task-title {
		font-weight: 700;
		color: var(--text-primary);
	}

	.student-username {
		font-size: 11.5px;
		color: var(--text-muted);
	}

	.link-url {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--primary);
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.link-url:hover {
		text-decoration: underline;
	}

	.time-text {
		font-size: 12px;
		color: var(--text-secondary);
	}

	/* Badges */
	.badge {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.badge-pending {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
	}

	.badge-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.badge-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.action-buttons-cell {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.btn-action {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-approve {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.btn-approve:hover {
		background: #16a34a;
		color: white;
	}

	.btn-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.btn-revisi:hover {
		background: #e11d48;
		color: white;
	}

	.feedback-row td {
		background: #fafafa;
		padding: 10px 16px 14px;
	}

	.feedback-box {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-left: 3px solid #d97706;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	/* Empty State */
	.empty-card {
		background: #ffffff;
		border: 1px dashed var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 60px 20px;
		text-align: center;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--bg-inset);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 400px;
		margin: 6px auto 0;
	}

	/* Review Modal */
	.form-scrim {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(4px);
		z-index: 99;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.review-modal {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		width: 100%;
		max-width: 520px;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-hard);
	}

	.modal-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.modal-sub {
		font-size: 12.5px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.modal-close-btn {
		border: none;
		background: none;
		color: var(--text-muted);
		font-size: 16px;
		cursor: pointer;
		padding: 4px;
	}

	.modal-body {
		padding: 24px;
	}

	.info-preview-box {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px 14px;
		font-size: 12.5px;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.preview-link {
		color: var(--primary);
		font-family: var(--font-mono);
		word-break: break-all;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
	}

	/* Mobile Responsiveness Enhancements */
	@media (max-width: 640px) {
		.header-card {
			padding: 16px;
		}

		.meeting-summary-grid {
			grid-template-columns: 1fr;
			gap: 14px;
		}

		.meeting-summary-card {
			padding: 16px;
		}

		.submission-stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 6px;
		}

		.stat-pill {
			padding: 6px 4px;
		}

		.stat-num {
			font-size: 13px;
		}

		.stat-txt {
			font-size: 9.5px;
		}

		.form-scrim {
			padding: 12px;
		}

		.review-modal {
			max-height: 90vh;
			overflow-y: auto;
			border-radius: var(--radius-lg);
		}

		.modal-header,
		.modal-body {
			padding: 16px;
		}

		.modal-footer {
			flex-direction: column-reverse;
			gap: 8px;
			width: 100%;
		}

		.modal-footer button {
			width: 100%;
			justify-content: center;
		}

		.data-table {
			min-width: 680px;
		}

		.table-bar-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
			padding: 12px 16px;
		}
	}
</style>

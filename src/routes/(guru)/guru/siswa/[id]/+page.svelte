<script lang="ts">
	import { enhance } from '$app/forms';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';

	let { data, form } = $props();

	let activeTab = $state<'notes' | 'attendance' | 'tasks'>('notes');
	let isSubmitting = $state(false);
	let newNoteText = $state('');
	let selectedCategory = $state('intervensi');

	const categoryOptions = [
		{ value: 'intervensi', label: 'Intervensi Akademik' },
		{ value: 'konseling', label: 'Konseling & Bimbingan' },
		{ value: 'catatan_umum', label: 'Catatan Umum Advisor' }
	];

	function formatDate(dateInput: Date | string) {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Detail Advisor Siswa — {data.detailData.student.fullName} | NLC</title>
</svelte:head>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     HERO HEADER: STUDENT PROFILE & RISK STATUS
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-top-bar">
			<a href="/guru/monitoring?kelasId={data.detailData.student.kelasId}" class="btn-back-link">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				<span>Kembali ke Health Monitoring</span>
			</a>
		</div>

		<div class="hero-content-flex">
			<div class="student-avatar-lg">
				{#if data.detailData.student.avatarUrl}
					<img src={data.detailData.student.avatarUrl} alt={data.detailData.student.fullName} class="avatar-img" />
				{:else}
					{data.detailData.student.fullName.charAt(0).toUpperCase()}
				{/if}
			</div>

			<div class="student-details">
				<div class="flex items-center gap-3 flex-wrap">
					<h1 class="student-name">{data.detailData.student.fullName}</h1>
					{#if data.detailData.summary.riskLevel === 'KRITIS'}
						<span class="badge badge-warning">KRITIS</span>
					{:else if data.detailData.summary.riskLevel === 'WASPADA'}
						<span class="badge badge-amber">WASPADA</span>
					{:else}
						<span class="badge badge-success">SEHAT</span>
					{/if}
				</div>

				<div class="student-meta">
					<span class="type-mono">@{data.detailData.student.username}</span>
					<span class="meta-dot">•</span>
					<span>{data.detailData.student.kelasName}</span>
					<span class="meta-dot">•</span>
					<span>Tingkat {data.detailData.student.tingkatName}</span>
					<span class="meta-dot">•</span>
					<span>{data.detailData.student.tahunAjaranName}</span>
				</div>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     ALERT BANNER (IF INTERVENTION NEEDED)
	     ══════════════════════════════════════════════════════════ -->
	{#if data.detailData.summary.alertReasons.length > 0}
		<section class="alert-banner" aria-label="Peringatan Intervensi Advisor">
			<div class="alert-banner-header">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-red-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				<h2 class="alert-banner-title">Peringatan Intervensi Advisor Required</h2>
			</div>
			<p class="alert-banner-desc">
				Siswa ini terdeteksi membutuhkan perhatian dan tindakan intervensi khusus berdasarkan indikator berikut:
			</p>
			<ul class="alert-list">
				{#each data.detailData.summary.alertReasons as reason}
					<li class="alert-item">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
						<span>{reason}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     KEY METRIC STAT CARDS
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Ringkasan Performa Siswa">
		<div class="stat-card">
			<div class="stat-icon-box icon-attendance">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.detailData.summary.totalSessions === 0 ? '-' : `${data.detailData.summary.attendanceRate}%`}</span>
				<span class="stat-label">Kehadiran Presensi</span>
				<span class="stat-subtext">{data.detailData.summary.attendedCount}/{data.detailData.summary.totalSessions} Sesi Hadir</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-task">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.detailData.summary.totalTasks === 0 ? '-' : `${data.detailData.summary.taskCompletionRate}%`}</span>
				<span class="stat-label">Tugas Selesai</span>
				<span class="stat-subtext">{data.detailData.summary.approvedTasksCount}/{data.detailData.summary.totalTasks} Tugas Approved</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-streak">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.detailData.summary.currentStreak} Hari</span>
				<span class="stat-label">Streak Aktif</span>
				<span class="stat-subtext">Max Streak: {data.detailData.summary.maxStreak} Hari</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-points">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M16 10H8"/></svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.detailData.summary.totalPoints} Pts</span>
				<span class="stat-label">Poin Gamifikasi</span>
				<span class="stat-subtext">Total Poin Terkumpul</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     MAIN CONTENT TABS: ADVISOR NOTES & ACTIVITY HISTORY
	     ══════════════════════════════════════════════════════════ -->
	<section class="card-section">
		<div class="tab-navigation">
			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'notes'}
				onclick={() => (activeTab = 'notes')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Catatan Intervensi Advisor ({data.detailData.notes.length})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'attendance'}
				onclick={() => (activeTab = 'attendance')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				<span>Histori Presensi ({data.detailData.attendanceLogs.length})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'tasks'}
				onclick={() => (activeTab = 'tasks')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
				<span>Histori Tugas ({data.detailData.submissionLogs.length})</span>
			</button>
		</div>

		<!-- TAB 1: ADVISOR INTERVENTION NOTES -->
		{#if activeTab === 'notes'}
			<div class="tab-content">
				<!-- Add Note Form -->
				<div class="add-note-box">
					<h3 class="box-title">Tambah Catatan Intervensi / Konseling Baru</h3>
					{#if form?.error}
						<div class="form-error-banner">
							{form.error}
						</div>
					{/if}
					{#if form?.success}
						<div class="form-success-banner">
							{form.message}
						</div>
					{/if}

					<form
						method="POST"
						action="?/addNote"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								newNoteText = '';
								await update();
							};
						}}
						class="flex flex-col gap-3 mt-3"
					>
						<div class="w-64">
							<CustomSelect
								name="category"
								options={categoryOptions}
								bind:value={selectedCategory}
								searchable={false}
							/>
						</div>

						<TextArea
							name="note"
							placeholder="Tuliskan catatan intervensi, kendala siswa, hasil bimbingan, atau tindak lanjut advisor di sini…"
							bind:value={newNoteText}
							rows={3}
							required
						/>

						<div class="flex justify-end">
							<button
								type="submit"
								disabled={isSubmitting || !newNoteText.trim()}
								class="btn-primary-action"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
								<span>{isSubmitting ? 'Simpan...' : 'Simpan Catatan Advisor'}</span>
							</button>
						</div>
					</form>
				</div>

				<!-- Notes Timeline -->
				<div class="notes-timeline">
					<h3 class="box-title mb-4">Riwayat Catatan Intervensi ({data.detailData.notes.length})</h3>

					{#if data.detailData.notes.length === 0}
						<div class="empty-state-box py-8 text-center">
							<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto text-slate-400 mb-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							<p class="font-bold text-slate-800 text-sm">Belum ada catatan intervensi</p>
							<p class="text-xs text-slate-500 mt-1">Gunakan formulir di atas untuk menambahkan catatan bimbingan pertama untuk siswa ini.</p>
						</div>
					{:else}
						<div class="timeline-list">
							{#each data.detailData.notes as noteItem}
								<div class="note-card">
									<div class="note-header">
										<div class="flex items-center gap-2">
											<div class="avatar-xs">
												{#if noteItem.advisorAvatar}
													<img src={noteItem.advisorAvatar} alt={noteItem.advisorName} class="avatar-img" />
												{:else}
													{noteItem.advisorName.charAt(0).toUpperCase()}
												{/if}
											</div>
											<span class="font-bold text-xs text-slate-800">{noteItem.advisorName}</span>
											<span class="badge badge-subtle uppercase">{noteItem.category.replace('_', ' ')}</span>
										</div>
										<span class="type-mono text-xs text-slate-400">{formatDate(noteItem.createdAt)}</span>
									</div>
									<p class="note-body">{noteItem.note}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

		<!-- TAB 2: ATTENDANCE HISTORY -->
		{:else if activeTab === 'attendance'}
			<div class="tab-content">
				<div class="table-responsive">
					<table class="data-table">
						<thead>
							<tr>
								<th>Pertemuan / Sesi</th>
								<th>Tanggal</th>
								<th>Status Presensi</th>
								<th>Metode</th>
								<th>Catatan Manual</th>
								<th class="text-right">Waktu Dicatat</th>
							</tr>
						</thead>
						<tbody>
							{#if data.detailData.attendanceLogs.length === 0}
								<tr>
									<td colspan="6" class="empty-table-cell text-center py-8 text-slate-400">
										Belum ada riwayat presensi recorded
									</td>
								</tr>
							{:else}
								{#each data.detailData.attendanceLogs as att}
									<tr>
										<td class="font-bold text-slate-800">{att.sessionTitle}</td>
										<td class="type-mono text-xs text-slate-600">{att.sessionDate}</td>
										<td>
											{#if att.status === 'hadir'}
												<span class="badge badge-success">HADIR</span>
											{:else if att.status === 'excused'}
												<span class="badge badge-amber">IZIN / SAKIT</span>
											{:else}
												<span class="badge badge-warning">ALPHA</span>
											{/if}
										</td>
										<td class="type-mono text-xs text-slate-500 uppercase">{att.method}</td>
										<td class="text-xs text-slate-600">{att.manualReason || '-'}</td>
										<td class="text-right type-mono text-xs text-slate-400">{formatDate(att.recordedAt)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

		<!-- TAB 3: TASK SUBMISSION HISTORY -->
		{:else if activeTab === 'tasks'}
			<div class="tab-content">
				<div class="table-responsive">
					<table class="data-table">
						<thead>
							<tr>
								<th>Judul Tugas</th>
								<th>Link Submission</th>
								<th>Status Review</th>
								<th>Feedback Mentor</th>
								<th class="text-right">Waktu Dikirimm</th>
							</tr>
						</thead>
						<tbody>
							{#if data.detailData.submissionLogs.length === 0}
								<tr>
									<td colspan="5" class="empty-table-cell text-center py-8 text-slate-400">
										Belum ada pengumpulan tugas recorded
									</td>
								</tr>
							{:else}
								{#each data.detailData.submissionLogs as sub}
									<tr>
										<td class="font-bold text-slate-800">{sub.taskTitle}</td>
										<td>
											<a href={sub.link} target="_blank" rel="noopener noreferrer" class="link-url text-xs">
												{sub.link}
											</a>
										</td>
										<td>
											{#if sub.status === 'approved'}
												<span class="badge badge-success">APPROVED</span>
											{:else if sub.status === 'revisi'}
												<span class="badge badge-amber">REVISI</span>
											{:else}
												<span class="badge badge-primary">PENDING</span>
											{/if}
										</td>
										<td class="text-xs text-slate-600">{sub.feedback || '-'}</td>
										<td class="text-right type-mono text-xs text-slate-400">{formatDate(sub.submittedAt)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
</div>

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1280px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
			gap: 16px;
		}
	}

	/* Hero Section */
	.page-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.hero-top-bar {
		margin-bottom: 16px;
	}

	.btn-back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.btn-back-link:hover {
		background: #c7d2fe;
	}

	.hero-content-flex {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.student-avatar-lg {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-family: var(--font-macro);
		font-weight: 800;
		font-size: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.student-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.student-name {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.student-meta {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.meta-dot {
		color: #cbd5e1;
	}

	/* Alert Banner */
	.alert-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-lg, 12px);
		padding: 18px 22px;
	}

	.alert-banner-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.alert-banner-title {
		font-family: var(--font-macro);
		font-size: 1rem;
		font-weight: 800;
		color: #991b1b;
		margin: 0;
	}

	.alert-banner-desc {
		font-size: 12.5px;
		color: #7f1d1d;
		margin-top: 4px;
		margin-bottom: 10px;
	}

	.alert-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.alert-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #b91c1c;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-md, 10px);
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.stat-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-attendance { background: #e0f2fe; color: #0369a1; }
	.icon-task { background: #dcfce7; color: #166534; }
	.icon-streak { background: #ffedd5; color: #c2410c; }
	.icon-points { background: #f3e8ff; color: #7e22ce; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-muted, #64748b);
		font-weight: 600;
		margin-top: 2px;
	}

	.stat-subtext {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted, #94a3b8);
		margin-top: 2px;
	}

	/* Card Section & Tabs */
	.card-section {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.tab-navigation {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 1px solid var(--border-subtle, #e2e8f0);
		padding-bottom: 12px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tab-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.tab-btn--active {
		background: var(--primary, #4f46e5);
		color: #ffffff;
	}

	.tab-btn--active:hover {
		background: var(--primary, #4f46e5);
		color: #ffffff;
	}

	/* Add Note Box */
	.add-note-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 18px;
		margin-bottom: 24px;
	}

	.box-title {
		font-family: var(--font-macro);
		font-size: 1rem;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.form-error-banner {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		margin-top: 10px;
	}

	.form-success-banner {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		margin-top: 10px;
	}

	.btn-primary-action {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 150ms ease;
	}

	.btn-primary-action:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Timeline Notes */
	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.note-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 14px 16px;
	}

	.note-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 8px;
	}

	.note-body {
		font-size: 13px;
		color: #334155;
		line-height: 1.5;
		margin: 0;
		white-space: pre-wrap;
	}

	.avatar-xs {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-size: 10px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	/* Badges */
	.badge {
		padding: 3px 9px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		border-radius: 9999px;
	}

	.badge-primary { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
	.badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
	.badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
	.badge-warning { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
	.badge-subtle { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

	/* Tables */
	.table-responsive {
		width: 100%;
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 680px;
	}

	.data-table th {
		background: #f8fafc;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-hard, #e2e8f0);
		text-align: left;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
		font-size: 13px;
	}

	.type-mono {
		font-family: var(--font-mono);
	}

	.link-url {
		color: var(--primary, #4f46e5);
		text-decoration: underline;
		word-break: break-all;
	}
</style>

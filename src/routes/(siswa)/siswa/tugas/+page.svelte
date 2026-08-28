<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import { toast } from '$lib/stores/toast';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type TaskItem = (typeof data.tasks)[number];

	let selectedStatusFilter = $state<string>('all');
	let activeSubmitTask = $state<TaskItem | null>(null);
	let isSubmitDrawerOpen = $state(false);
	let submissionLink = $state('');
	let isSubmitting = $state(false);
	let hasHandledInitialUrl = false;

	// Auto-open drawer if navigated with ?taskId=... query param (one-time upon load)
	$effect(() => {
		if (typeof window === 'undefined') return;
		const targetTaskId = page.url.searchParams.get('taskId');
		if (targetTaskId && data.tasks && data.tasks.length > 0 && !hasHandledInitialUrl) {
			hasHandledInitialUrl = true;
			const found = data.tasks.find((t) => String(t.taskId) === targetTaskId);
			if (found) {
				openSubmitModal(found);
			}
			if (window.history && window.history.replaceState) {
				const url = new URL(window.location.href);
				url.searchParams.delete('taskId');
				window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
			}
		}
	});

	// Cancel submission modal state
	let showCancelConfirmModal = $state(false);
	let cancelTargetSubmission = $state<{ id: number; title: string } | null>(null);
	let isCancelling = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Tugas berhasil diproses!');
			closeSubmitModal();
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	function promptCancelSubmission(subId: number, taskTitle: string) {
		cancelTargetSubmission = { id: subId, title: taskTitle };
		showCancelConfirmModal = true;
	}

	function handleConfirmCancelSubmission() {
		const formEl = document.getElementById('cancel-submission-form') as HTMLFormElement;
		if (formEl) {
			formEl.requestSubmit();
		}
	}

	// Calculate counts for summary stats
	let allTasksList = $derived(data.tasks || []);
	let totalTasksCount = $derived(allTasksList.length);
	let unsubmittedCount = $derived(allTasksList.filter((t) => !t.submission).length);
	let pendingCount = $derived(allTasksList.filter((t) => t.submission?.status === 'pending').length);
	let revisiCount = $derived(allTasksList.filter((t) => t.submission?.status === 'revisi').length);
	let approvedCount = $derived(allTasksList.filter((t) => t.submission?.status === 'approved').length);

	let approvedPercentage = $derived(
		totalTasksCount > 0 ? Math.round((approvedCount / totalTasksCount) * 100) : 0
	);

	let filteredTasks = $derived(
		allTasksList.filter((task) => {
			if (selectedStatusFilter === 'all') return true;
			if (selectedStatusFilter === 'unsubmitted') return !task.submission;
			if (selectedStatusFilter === 'pending') return task.submission?.status === 'pending';
			if (selectedStatusFilter === 'approved') return task.submission?.status === 'approved';
			if (selectedStatusFilter === 'revisi') return task.submission?.status === 'revisi';
			return true;
		})
	);

	function openSubmitModal(task: TaskItem) {
		activeSubmitTask = task;
		submissionLink = task.submission?.link || '';
		isSubmitDrawerOpen = true;
	}

	function closeSubmitModal() {
		if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
			const url = new URL(window.location.href);
			if (url.searchParams.has('taskId')) {
				url.searchParams.delete('taskId');
				window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
			}
		}
		isSubmitDrawerOpen = false;
		activeSubmitTask = null;
		submissionLink = '';
	}

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';
		const d = new Date(dateVal);
		if (isNaN(d.getTime())) return String(dateVal);
		const months = [
			'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
			'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
		];
		return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
	}

	function getTaskPoints(taskSize: string): number {
		if (taskSize === 'kecil') return 50;
		if (taskSize === 'besar') return 200;
		return 100;
	}
</script>

<svelte:head>
	<title>Tugas Saya — NLC Siswa</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Card (Gold Standard Blueprint) -->
	<div class="header-card">
		<div class="page-header-row">
			<div>
				<nav class="breadcrumb" aria-label="Breadcrumb">
					<a href="/siswa" class="bc-link">Beranda</a>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<polyline points="9 18 15 12 9 6" />
					</svg>
					<span class="bc-current">Tugas Saya</span>
				</nav>
				<h1 class="page-title">Daftar Tugas Praktikum</h1>
				<p class="page-sub">
					Kirimkan tautan lembar kerja tugas (GitHub, Google Drive, Figma, dsb) untuk diperiksa oleh mentor dan kumpulkan poin keaktifan.
				</p>
			</div>
		</div>
	</div>

	<!-- 4 Key Metrics Stat Cards (Matches /siswa/pertemuan and /siswa/progress) -->
	<div class="stats-grid">
		<!-- Card 1: Total Tugas -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-total">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
					</svg>
				</div>
				<span class="stat-pill">{totalTasksCount} Total</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{totalTasksCount}</div>
				<div class="stat-label">Tugas Praktikum</div>
				<div class="stat-subtext">{unsubmittedCount} Belum Disubmit</div>
			</div>
		</div>

		<!-- Card 2: Disetujui (Approved) -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-approved">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<span class="stat-pill">{approvedPercentage}%</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{approvedCount}</div>
				<div class="stat-label">Tugas Approved</div>
				<div class="stat-subtext">{approvedCount}/{totalTasksCount} Selesai</div>
			</div>
		</div>

		<!-- Card 3: Pending Review -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-pending">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</div>
				<span class="stat-pill">{pendingCount} Antrean</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{pendingCount}</div>
				<div class="stat-label">Pending Review</div>
				<div class="stat-subtext">Menunggu Penilaian</div>
			</div>
		</div>

		<!-- Card 4: Perlu Revisi -->
		<div class="stat-card">
			<div class="stat-card-top">
				<div class="stat-icon icon-revisi">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<span class="stat-pill">{revisiCount} Tugas</span>
			</div>
			<div class="stat-info">
				<div class="stat-value">{revisiCount}</div>
				<div class="stat-label">Perlu Revisi</div>
				<div class="stat-subtext">{revisiCount > 0 ? 'Butuh Perbaikan' : 'Tidak Ada Revisi'}</div>
			</div>
		</div>
	</div>

	<!-- Status Tabs Bar (Single-Line Filter Panel with SVG Icons & Color Accent) -->
	<div class="filter-panel">
		<div class="tabs-row">
			<!-- Tab 1: Semua -->
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'all')}
				class="tab-btn {selectedStatusFilter === 'all' ? 'tab-btn--all-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7"/>
					<rect x="14" y="3" width="7" height="7"/>
					<rect x="14" y="14" width="7" height="7"/>
					<rect x="3" y="14" width="7" height="7"/>
				</svg>
				<span>Semua</span>
				<span class="tab-counter">{totalTasksCount}</span>
			</button>

			<!-- Tab 2: Belum Submit -->
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'unsubmitted')}
				class="tab-btn {selectedStatusFilter === 'unsubmitted' ? 'tab-btn--unsubmitted-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
				<span>Belum Submit</span>
				<span class="tab-counter">{unsubmittedCount}</span>
			</button>

			<!-- Tab 3: Pending Review -->
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'pending')}
				class="tab-btn {selectedStatusFilter === 'pending' ? 'tab-btn--pending-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
				<span>Pending</span>
				<span class="tab-counter">{pendingCount}</span>
			</button>

			<!-- Tab 4: Perlu Revisi -->
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'revisi')}
				class="tab-btn {selectedStatusFilter === 'revisi' ? 'tab-btn--revisi-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>Revisi</span>
				<span class="tab-counter">{revisiCount}</span>
			</button>

			<!-- Tab 5: Disetujui -->
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'approved')}
				class="tab-btn {selectedStatusFilter === 'approved' ? 'tab-btn--approved-active' : ''}"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="20 6 9 17 4 12" />
				</svg>
				<span>Disetujui</span>
				<span class="tab-counter">{approvedCount}</span>
			</button>
		</div>
	</div>

	<!-- Tasks List Grid -->
	{#if filteredTasks.length === 0}
		<div class="empty-card">
			<div class="empty-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
			</div>
			<div class="empty-title">Tidak Ada Tugas Ditemukan</div>
			<div class="empty-sub">Semua tugas sudah sesuai dengan filter kategori yang kamu pilih.</div>
		</div>
	{:else}
		<div class="tasks-grid">
			{#each filteredTasks as t (t.taskId)}
				<div
					class="task-card {t.submission
						? t.submission.status === 'approved'
							? 'task-card--approved'
							: t.submission.status === 'pending'
								? 'task-card--pending'
								: 'task-card--revisi'
						: 'task-card--unsubmitted'}"
				>
					<div class="task-card__body">
						<!-- Card Header Status & Size Badges -->
						<div class="card-top-row">
							<div class="badge-wrap-row">
								{#if !t.submission}
									<span class="badge badge-unsubmitted">BELUM SUBMIT</span>
								{:else if t.submission.status === 'pending'}
									<span class="badge badge-pending">PENDING REVIEW</span>
								{:else if t.submission.status === 'approved'}
									<span class="badge badge-approved">DISETUJUI (+{getTaskPoints(t.taskSize)} PTS)</span>
								{:else if t.submission.status === 'revisi'}
									<span class="badge badge-revisi">PERLU REVISI</span>
								{/if}
							</div>

							<span class="task-size-tag">
								SKALA {t.taskSize.toUpperCase()} (+{getTaskPoints(t.taskSize)} PTS)
							</span>
						</div>

						<!-- Task Title & Session Details -->
						<div class="task-title-block">
							<h3 class="task-title">{t.taskTitle}</h3>
							<p class="session-meta">Sesi: <strong>{t.pertemuanTitle}</strong> ({formatIndoDate(t.sessionDate)})</p>
							{#if t.phaseTitle && t.subPhaseTitle}
								<p class="phase-path-tag">
									{t.phaseTitle} &rsaquo; {t.subPhaseTitle}
								</p>
							{/if}

							<!-- Instruction Box -->
							{#if t.taskDescription}
								<div class="task-card-instruction">
									<div class="instruction-label">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
										</svg>
										<span>Petunjuk &amp; Deskripsi Tugas:</span>
									</div>
									<p class="task-desc">{t.taskDescription}</p>
								</div>
							{/if}
						</div>

						<!-- Submitted Link & Revision Feedback Alert -->
						{#if t.submission}
							<div class="submission-info-box">
								<div class="submission-link-line">
									<span class="info-label">Link Tautan Submisi:</span>
									<a href={t.submission.link} target="_blank" rel="noopener noreferrer" class="link-url">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
											<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
										</svg>
										<span>{t.submission.link}</span>
									</a>
								</div>

								{#if t.submission.status === 'revisi' && t.submission.feedback}
									<div class="feedback-alert">
										<div class="feedback-alert-head">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
												<circle cx="12" cy="12" r="10" />
												<line x1="12" y1="8" x2="12" y2="12" />
												<line x1="12" y1="16" x2="12.01" y2="16" />
											</svg>
											<span>Catatan Instruksi Revisi Mentor:</span>
										</div>
										<p class="feedback-alert-body">{t.submission.feedback}</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Card Action Footer Buttons -->
					<div class="task-card__footer">
						{#if !t.submission}
							<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-action btn-card-submit">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="22" y1="2" x2="11" y2="13" />
									<polygon points="22 2 15 22 11 13 2 9 22 2" />
								</svg>
								<span>Submit Link Tugas</span>
							</button>
						{:else if t.submission.status === 'revisi'}
							<div class="footer-btn-split">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-action btn-card-revisi">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
									</svg>
									<span>Perbaiki &amp; Kirim Ulang</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-card-action btn-card-cancel"
									title="Batal Submit / Tarik Submisi"
								>
									Batal
								</button>
							</div>
						{:else if t.submission.status === 'pending'}
							<div class="footer-btn-split">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-action btn-card-edit">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
									<span>Edit Link</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-card-action btn-card-cancel"
									title="Batal Submit / Tarik Submisi"
								>
									Batal Submit
								</button>
							</div>
						{:else}
							<div class="approved-notice">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>Tugas disetujui mentor &amp; poin telah diberikan.</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Konfirmasi Batal Submit -->
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
	id="cancel-submission-form"
	method="POST"
	action="?/cancel"
	use:enhance={() => {
		isCancelling = true;
		return async ({ update }) => {
			isCancelling = false;
			showCancelConfirmModal = false;
			cancelTargetSubmission = null;
			await update();
		};
	}}
	style="display: none;"
>
	<input type="hidden" name="submissionId" value={cancelTargetSubmission?.id || 0} />
</form>

<!-- ══════════════════════════════════════════════════════════
     FORM DRAWER SUBMIT / EDIT TUGAS (SLIDER BOTTOM SHEET)
     ══════════════════════════════════════════════════════════ -->
{#if activeSubmitTask}
	{@const t = activeSubmitTask}
	<FormDrawer
		bind:open={isSubmitDrawerOpen}
		title={t.submission ? 'Edit Link Submisi Tugas' : 'Submit Lembar Kerja Tugas'}
		subtitle={`Sesi: ${t.pertemuanTitle}`}
		onclose={closeSubmitModal}
	>
		{#snippet children()}
			{#if activeSubmitTask}
				{@const currentTask = activeSubmitTask}
				<div class="drawer-task-layout">
					<!-- Task Info Hero Box -->
					<div class="drawer-task-hero">
						<div class="flex items-center justify-between gap-2 flex-wrap mb-2.5">
							<span class="badge {currentTask.submission ? (currentTask.submission.status === 'revisi' ? 'badge-revisi' : currentTask.submission.status === 'pending' ? 'badge-pending' : 'badge-approved') : 'badge-unsubmitted'}">
								{currentTask.submission ? (currentTask.submission.status === 'revisi' ? 'PERLU REVISI' : currentTask.submission.status === 'pending' ? 'PENDING REVIEW' : 'DISETUJUI') : 'BELUM SUBMIT'}
							</span>
							<span class="task-size-tag">
								SKALA {currentTask.taskSize.toUpperCase()} (+{getTaskPoints(currentTask.taskSize)} PTS)
							</span>
						</div>

						<h3 class="drawer-task-title">{currentTask.taskTitle}</h3>

						{#if currentTask.taskDescription}
							<div class="drawer-task-desc-box">
								<div class="desc-heading">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
										<line x1="16" y1="13" x2="8" y2="13" />
										<line x1="16" y1="17" x2="8" y2="17" />
									</svg>
									<span>Petunjuk &amp; Instruksi Tugas:</span>
								</div>
								<p class="desc-content">{currentTask.taskDescription}</p>
							</div>
						{/if}

						{#if currentTask.submission?.status === 'revisi' && currentTask.submission.feedback}
							<div class="drawer-feedback-box">
								<div class="drawer-feedback-head">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" y1="8" x2="12" y2="12" />
										<line x1="12" y1="16" x2="12.01" y2="16" />
									</svg>
									<span>Catatan Instruksi Revisi Mentor:</span>
								</div>
								<p class="drawer-feedback-body">"{currentTask.submission.feedback}"</p>
							</div>
						{/if}
					</div>

					<!-- Form Submission Input Section -->
					<form
						id="task-submission-form"
						method="POST"
						action="?/submit"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ result, update }) => {
								isSubmitting = false;
								await update();
								if (result.type === 'success') {
									closeSubmitModal();
								}
							};
						}}
						class="drawer-form-card"
					>
						<input type="hidden" name="taskId" value={currentTask.taskId} />

						<div class="space-y-3">
							<TextInput
								id="link"
								name="link"
								label="Link Tautan Lembar Kerja (URL Publik)"
								placeholder="https://github.com/username/repo atau https://figma.com/..."
								bind:value={submissionLink}
								required
							/>

							<div class="submission-tips-box">
								<div class="tips-head">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" y1="16" x2="12" y2="12" />
										<line x1="12" y1="8" x2="12.01" y2="8" />
									</svg>
									<span>Panduan Tautan Submisi:</span>
								</div>
								<p class="tips-body">
									Pastikan akses link sudah diatur publik (Anyone with the link can view). Platform yang didukung: GitHub, GitLab, Google Drive, Google Docs, Figma, Notion, Vercel / Netlify.
								</p>
							</div>
						</div>
					</form>
				</div>
			{/if}
		{/snippet}

		{#snippet footer()}
			{#if activeSubmitTask}
				<div class="drawer-footer-actions">
					<button
						type="button"
						onclick={closeSubmitModal}
						disabled={isSubmitting}
						class="btn-drawer-cancel"
					>
						Batal
					</button>
					<button
						type="submit"
						form="task-submission-form"
						disabled={isSubmitting || !submissionLink.trim()}
						class="btn-drawer-submit"
					>
						{isSubmitting ? 'Mengirim...' : activeSubmitTask.submission ? 'Simpan Perubahan' : 'Kirim Tugas'}
					</button>
				</div>
			{/if}
		{/snippet}
	</FormDrawer>
{/if}

<style>
	/* ══════════════════════════════════════════════════════════
	   EXACT CONTENT AREA CONTAINER (Matches /siswa/pertemuan & /siswa/progress)
	   ══════════════════════════════════════════════════════════ */
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

	@media (max-width: 1023px) {
		.content-area {
			padding: 20px 24px 60px;
			gap: 16px;
		}
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}
	}

	/* Header Card Container */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		margin-bottom: 0;
	}

	.page-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
	}
	.bc-link:hover {
		color: var(--primary, #2563eb);
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--primary, #2563eb);
		font-weight: 700;
	}

	.page-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
		margin: 0 0 6px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary, #475569);
		max-width: 680px;
		line-height: 1.5;
		margin: 0;
	}

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 9px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		line-height: 1;
		border-radius: var(--radius-full, 9999px);
		box-sizing: border-box;
		white-space: nowrap;
	}

	.badge-unsubmitted {
		background: var(--bg-cell, #f1f5f9);
		color: var(--text-secondary, #64748b);
		border: 1px solid var(--border-hard, #cbd5e1);
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

	/* Key Metrics Stats Grid (Matches /siswa/pertemuan and /siswa/progress) */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
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

	/* Filter Panel Tabs Bar (Single Line with Color Accent & Micro Badges) */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 8px 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		margin-bottom: 0;
	}

	.tabs-row {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		white-space: nowrap;
		flex-wrap: nowrap;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}
	.tabs-row::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 12px;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		border: 1px solid var(--border-hard, #e2e8f0);
		background: var(--bg-inset, #f8fafc);
		color: var(--text-secondary, #64748b);
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.tab-btn:hover {
		background: var(--bg-hover, #f1f5f9);
		color: var(--text-primary, #0f172a);
		border-color: #cbd5e1;
	}

	.tab-counter {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 9999px;
		background: #e2e8f0;
		color: #475569;
		line-height: 1;
	}

	/* Active Color Accents Per Status */
	.tab-btn--all-active {
		background: #eff6ff;
		color: #1d4ed8;
		border-color: #bfdbfe;
	}
	.tab-btn--all-active .tab-counter {
		background: #dbeafe;
		color: #1e40af;
	}

	.tab-btn--unsubmitted-active {
		background: #f1f5f9;
		color: #334155;
		border-color: #cbd5e1;
	}
	.tab-btn--unsubmitted-active .tab-counter {
		background: #e2e8f0;
		color: #475569;
	}

	.tab-btn--pending-active {
		background: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}
	.tab-btn--pending-active .tab-counter {
		background: #fef3c7;
		color: #92400e;
	}

	.tab-btn--revisi-active {
		background: #fff1f2;
		color: #be123c;
		border-color: #fecdd3;
	}
	.tab-btn--revisi-active .tab-counter {
		background: #ffe4e6;
		color: #9f1239;
	}

	.tab-btn--approved-active {
		background: #f0fdf4;
		color: #15803d;
		border-color: #bbf7d0;
	}
	.tab-btn--approved-active .tab-counter {
		background: #dcfce7;
		color: #166534;
	}

	/* Empty State Card */
	.empty-card {
		background: #ffffff;
		border: 2px dashed var(--border-hard, #cbd5e1);
		border-radius: 14px;
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--primary-light, #eff6ff);
		color: var(--primary, #2563eb);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		max-width: 400px;
	}

	/* Tasks Grid & Responsive Cards */
	.tasks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}

	@media (max-width: 640px) {
		.tasks-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}
	}

	.task-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		overflow: hidden;
		transition: all 150ms ease;
	}

	.task-card:hover {
		border-color: #cbd5e1;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.task-card--approved { border-left: 4px solid #16a34a; }
	.task-card--pending { border-left: 4px solid #d97706; }
	.task-card--revisi { border-left: 4px solid #be123c; }
	.task-card--unsubmitted { border-left: 4px solid #94a3b8; }

	.task-card__body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.badge-wrap-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.task-size-tag {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		background: var(--bg-cell, #f1f5f9);
		padding: 2px 8px;
		border-radius: 6px;
		border: 1px solid var(--border-hard, #e2e8f0);
	}

	.task-title-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.task-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
		line-height: 1.3;
	}

	.session-meta {
		font-size: 12px;
		color: var(--text-secondary, #475569);
		margin: 0;
	}

	.phase-path-tag {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--primary, #2563eb);
		margin: 2px 0 0 0;
		font-weight: 600;
	}

	/* Task Instruction Box */
	.task-card-instruction {
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
		padding: 10px 12px;
		margin-top: 6px;
	}

	.instruction-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
		margin-bottom: 4px;
	}

	.task-desc {
		font-size: 12.5px;
		color: var(--text-secondary, #475569);
		line-height: 1.5;
		margin: 0;
		white-space: pre-wrap;
	}

	/* Submission Info Box */
	.submission-info-box {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
		padding: 10px 12px;
	}

	.submission-link-line {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.info-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
	}

	.link-url {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		color: var(--primary, #2563eb);
		text-decoration: underline;
		word-break: break-all;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	/* Revision Feedback Alert */
	.feedback-alert {
		background: #ffe4e6;
		border: 1px solid #fecdd3;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.feedback-alert-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11.5px;
		font-weight: 800;
		color: #9f1239;
	}

	.feedback-alert-body {
		font-size: 12.5px;
		color: #881337;
		margin: 0;
		line-height: 1.45;
		font-style: italic;
	}

	/* Footer Action Buttons */
	.task-card__footer {
		padding: 12px 16px;
		background: #ffffff;
		border-top: 1px solid var(--border-hard, #f1f5f9);
	}

	.footer-btn-split {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-card-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		border: 1px solid transparent;
		width: 100%;
		min-height: 38px;
	}

	.btn-card-submit {
		background: var(--primary, #2563eb);
		color: #ffffff;
	}
	.btn-card-submit:hover {
		background: #1d4ed8;
	}

	.btn-card-revisi {
		background: #be123c;
		color: #ffffff;
		flex: 1;
	}
	.btn-card-revisi:hover {
		background: #9f1239;
	}

	.btn-card-edit {
		background: var(--bg-inset, #f8fafc);
		color: var(--text-primary, #0f172a);
		border-color: var(--border-hard, #cbd5e1);
		flex: 1;
	}
	.btn-card-edit:hover {
		background: #f1f5f9;
	}

	.btn-card-cancel {
		background: #ffffff;
		color: #be123c;
		border-color: #fecdd3;
		padding: 8px 12px;
		width: auto;
		flex-shrink: 0;
	}
	.btn-card-cancel:hover {
		background: #ffe4e6;
	}

	.approved-notice {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: #15803d;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* Drawer Layout Customization */
	.drawer-task-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.drawer-task-hero {
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 14px 16px;
	}

	.drawer-task-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0 0 8px 0;
	}

	.drawer-task-desc-box {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 8px;
		padding: 10px 12px;
		margin-top: 8px;
	}

	.desc-heading {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
		margin-bottom: 4px;
	}

	.desc-content {
		font-size: 12.5px;
		color: var(--text-secondary, #475569);
		line-height: 1.5;
		margin: 0;
		white-space: pre-wrap;
	}

	.drawer-feedback-box {
		background: #ffe4e6;
		border: 1px solid #fecdd3;
		border-radius: 8px;
		padding: 10px 12px;
		margin-top: 8px;
	}

	.drawer-feedback-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		font-weight: 800;
		color: #9f1239;
	}

	.drawer-feedback-body {
		font-size: 12.5px;
		color: #881337;
		margin: 4px 0 0 0;
		font-style: italic;
		line-height: 1.45;
	}

	.drawer-form-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.submission-tips-box {
		background: var(--primary-light, #eff6ff);
		border: 1px solid var(--primary-border, #bfdbfe);
		border-radius: 8px;
		padding: 10px 12px;
	}

	.tips-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--primary, #2563eb);
		margin-bottom: 2px;
	}

	.tips-body {
		font-size: 11.5px;
		color: #1e40af;
		line-height: 1.45;
		margin: 0;
	}

	.drawer-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		width: 100%;
	}

	.btn-drawer-cancel {
		padding: 8px 16px;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-secondary, #64748b);
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		cursor: pointer;
	}

	.btn-drawer-submit {
		padding: 8px 18px;
		border-radius: 8px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: #ffffff;
		background: var(--primary, #2563eb);
		border: none;
		cursor: pointer;
	}
	.btn-drawer-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

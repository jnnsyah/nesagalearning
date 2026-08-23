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

	let filteredTasks = $derived(
		(data.tasks || []).filter((task) => {
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
</script>

<svelte:head>
	<title>Tugas Saya — NLC Siswa</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Card -->
	<div class="header-card">
		<div class="page-header-row" style="margin-bottom: 0;">
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
					Kirimkan link tugas (GitHub, Google Drive, Figma, dsb) untuk dinilai oleh mentor &amp; dapatkan poin keaktifan.
				</p>
			</div>
		</div>
	</div>

	<!-- Status Tabs Bar -->
	<div class="filter-panel">
		<div class="tabs-row">
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'all')}
				class="tab-btn {selectedStatusFilter === 'all' ? 'tab-btn--active' : ''}"
			>
				Semua Tugas ({data.tasks?.length || 0})
			</button>
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'unsubmitted')}
				class="tab-btn {selectedStatusFilter === 'unsubmitted' ? 'tab-btn--active' : ''}"
			>
				Belum Submit
			</button>
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'pending')}
				class="tab-btn {selectedStatusFilter === 'pending' ? 'tab-btn--active' : ''}"
			>
				Pending Review
			</button>
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'revisi')}
				class="tab-btn {selectedStatusFilter === 'revisi' ? 'tab-btn--active' : ''}"
			>
				Perlu Revisi
			</button>
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'approved')}
				class="tab-btn {selectedStatusFilter === 'approved' ? 'tab-btn--active' : ''}"
			>
				Disetujui
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
						<div class="card-top-row">
							{#if !t.submission}
								<span class="badge badge-unsubmitted">BELUM SUBMIT</span>
							{:else if t.submission.status === 'pending'}
								<span class="badge badge-pending">PENDING REVIEW</span>
							{:else if t.submission.status === 'approved'}
								<span class="badge badge-approved">DISETUJUI (+{t.taskSize === 'kecil' ? '50' : t.taskSize === 'besar' ? '200' : '100'} POIN)</span>
							{:else if t.submission.status === 'revisi'}
								<span class="badge badge-revisi">PERLU REVISI</span>
							{/if}

							<span class="task-size-tag">
								{t.taskSize.toUpperCase()}
							</span>
						</div>

						<div class="task-title-block">
							<h3 class="task-title">{t.taskTitle}</h3>
							<p class="session-meta">Sesi: <strong>{t.pertemuanTitle}</strong> ({formatIndoDate(t.sessionDate)})</p>
							{#if t.phaseTitle && t.subPhaseTitle}
								<p class="session-meta" style="font-family: var(--font-mono); font-size: 11px; color: var(--primary);">
									{t.phaseTitle} &rsaquo; {t.subPhaseTitle}
								</p>
							{/if}
							{#if t.taskDescription}
								<div class="task-card-instruction">
									<div class="instruction-label">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
										</svg>
										<span>Petunjuk Tugas:</span>
									</div>
									<p class="task-desc">{t.taskDescription}</p>
								</div>
							{/if}
						</div>

						{#if t.submission}
							<div class="submission-info-box">
								<div class="submission-link-line">
									<span class="info-label">Link Submisi Kamu:</span>
									<a href={t.submission.link} target="_blank" rel="noopener noreferrer" class="link-url">
										{t.submission.link}
									</a>
								</div>

								{#if t.submission.status === 'revisi' && t.submission.feedback}
									<div class="feedback-alert">
										<strong>Catatan Revisi Mentor:</strong>
										<p>{t.submission.feedback}</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<div class="task-card__footer">
						{#if !t.submission}
							<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-submit">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="22" y1="2" x2="11" y2="13" />
									<polygon points="22 2 15 22 11 13 2 9 22 2" />
								</svg>
								<span>Submit Link Tugas</span>
							</button>
						{:else if t.submission.status === 'revisi'}
							<div class="footer-btn-split">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-revisi">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
									</svg>
									<span>Perbaiki &amp; Kirim Ulang</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-card-cancel"
									title="Batal Submit / Tarik Submisi"
								>
									Batal
								</button>
							</div>
						{:else if t.submission.status === 'pending'}
							<div class="footer-btn-split">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-card-edit">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
									<span>Edit Link</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-card-cancel"
									title="Batal Submit / Tarik Submisi"
								>
									Batal Submit
								</button>
							</div>
						{:else}
							<div class="approved-notice">
								✓ Tugas disetujui mentor &amp; poin telah diberikan.
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
							<span class="badge {currentTask.submission ? (currentTask.submission.status === 'revisi' ? 'badge-revisi' : currentTask.submission.status === 'pending' ? 'badge-pending' : 'badge-approved') : 'badge-unsubmitted'} font-bold text-xs px-2.5 py-0.5">
								{currentTask.submission ? (currentTask.submission.status === 'revisi' ? 'PERLU REVISI' : currentTask.submission.status === 'pending' ? 'PENDING REVIEW' : 'DISETUJUI') : 'BELUM SUBMIT'}
							</span>
							<span class="task-size-tag">
								SKALA {currentTask.taskSize.toUpperCase()} (+{currentTask.taskSize === 'kecil' ? '50' : currentTask.taskSize === 'besar' ? '200' : '100'} POIN)
							</span>
						</div>

						<h3 class="drawer-task-title">{currentTask.taskTitle}</h3>

						{#if currentTask.taskDescription}
							<div class="drawer-task-desc-box">
								<div class="desc-heading">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
										<line x1="16" y1="13" x2="8" y2="13" />
										<line x1="16" y1="17" x2="8" y2="17" />
										<polyline points="10 9 9 9 8 9" />
									</svg>
									<span>Petunjuk &amp; Instruksi Tugas:</span>
								</div>
								<p class="desc-content">{currentTask.taskDescription}</p>
							</div>
						{/if}

						{#if currentTask.submission?.status === 'revisi' && currentTask.submission.feedback}
							<div class="drawer-feedback-box">
								<div class="flex items-center gap-1.5 font-bold text-rose-800 text-xs mb-1">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<circle cx="12" cy="12" r="10"/>
										<line x1="12" y1="8" x2="12" y2="12"/>
										<line x1="12" y1="16" x2="12.01" y2="16"/>
									</svg>
									<span>Catatan Revisi Mentor:</span>
								</div>
								<p class="italic text-xs text-rose-900 leading-relaxed">"{currentTask.submission.feedback}"</p>
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
								label="Link Hasil Tugas (URL Publik)"
								placeholder="https://github.com/username/repo atau https://figma.com/..."
								bind:value={submissionLink}
								required
							/>

							<div class="submission-tips-box">
								<div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
										<circle cx="12" cy="12" r="10"/>
										<line x1="12" y1="16" x2="12" y2="12"/>
										<line x1="12" y1="8" x2="12.01" y2="8"/>
									</svg>
									<span>Panduan Pengiriman Link:</span>
								</div>
								<p class="text-[11.5px] text-slate-500 leading-relaxed">
									Pastikan izin link sudah diatur publik (Anyone with the link can view). Platform yang didukung: GitHub, GitLab, Google Drive, Google Docs, Figma, Notion, Vercel/Netlify.
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
						class="btn-drawer-secondary"
					>
						Batal
					</button>

					<button
						type="submit"
						form="task-submission-form"
						disabled={isSubmitting || !submissionLink.trim()}
						class="btn-drawer-primary"
					>
						{#if isSubmitting}
							<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Mengirim...</span>
						{:else}
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<line x1="22" y1="2" x2="11" y2="13" />
								<polygon points="22 2 15 22 11 13 2 9 22 2" />
							</svg>
							<span>{activeSubmitTask.submission ? 'Perbarui Submisi' : 'Kirim Tugas Sekarang'}</span>
						{/if}
					</button>
				</div>
			{/if}
		{/snippet}
	</FormDrawer>
{/if}

<style>
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

	/* Header Card Container */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
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
		color: var(--primary);
		font-weight: 700;
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
		margin: 0 0 6px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 680px;
		line-height: 1.5;
	}

	/* Task Card Footer Buttons */
	.btn-card-submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
		padding: 10px 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
	}

	.btn-card-submit:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.btn-card-submit:active {
		transform: scale(0.98);
	}

	.btn-card-revisi {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		flex: 1;
		padding: 9px 14px;
		background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
		transition: all 150ms ease;
	}

	.btn-card-revisi:hover {
		background: linear-gradient(135deg, #b45309 0%, #d97706 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
	}

	.btn-card-revisi:active {
		transform: scale(0.98);
	}

	.btn-card-edit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		flex: 1;
		padding: 9px 14px;
		background: #ffffff;
		color: #475569;
		border: 1.5px solid #cbd5e1;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-card-edit:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
		transform: translateY(-1px);
	}

	.btn-card-edit:active {
		transform: scale(0.98);
	}

	.btn-card-cancel {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 9px 14px;
		background: #fff1f2;
		color: #e11d48;
		border: 1.5px solid #fecdd3;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-card-cancel:hover {
		background: #ffe4e6;
		border-color: #fda4af;
		color: #be123c;
		transform: translateY(-1px);
	}

	.btn-card-cancel:active {
		transform: scale(0.98);
	}

	.footer-btn-split {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	/* Filter Bar Tabs */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 12px;
		padding: 10px 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		margin-bottom: 0;
	}

	.tabs-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.tab-btn {
		padding: 6px 14px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tab-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.tab-btn--active {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	/* Tasks Grid */
	.tasks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 12px;
	}

	.task-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.task-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 14px rgba(0, 0, 0, 0.06);
	}

	.task-card--approved {
		border-left: 4px solid #16a34a;
	}

	.task-card--revisi {
		border-left: 4px solid #e11d48;
	}

	.task-card--pending {
		border-left: 4px solid #d97706;
	}

	.task-card--unsubmitted {
		border-left: 4px solid #94a3b8;
	}

	.task-card__body {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.task-size-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: var(--text-muted);
		background: var(--bg-cell);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.task-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
		line-height: 1.3;
	}

	.session-meta {
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	.task-card-instruction {
		margin-top: 8px;
		padding: 10px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 3px solid #4f46e5;
		border-radius: 8px;
	}

	.instruction-label {
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

	.task-desc {
		font-size: 12.5px;
		color: #334155;
		line-height: 1.55;
		margin: 0;
	}

	.submission-info-box {
		background: var(--bg-inset);
		border-radius: var(--radius-md);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12px;
	}

	.submission-link-line {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.info-label {
		color: var(--text-muted);
		font-size: 11px;
	}

	.link-url {
		font-family: var(--font-mono);
		color: var(--primary);
		text-decoration: underline;
		word-break: break-all;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.feedback-alert {
		background: #fff1f2;
		border: 1px solid #fecdd3;
		color: #be123c;
		padding: 8px 10px;
		border-radius: var(--radius-md);
	}

	.task-card__footer {
		background: var(--bg-inset);
		padding: 12px 20px;
		border-top: 1px solid var(--border-hard);
		border-bottom-left-radius: var(--radius-lg);
		border-bottom-right-radius: var(--radius-lg);
	}

	.approved-notice {
		font-size: 12px;
		font-weight: 700;
		color: #15803d;
		text-align: center;
	}

	/* Badges */
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

	/* Empty State */
	.empty-card {
		background: #ffffff;
		border: 2px dashed var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 48px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary-light);
		color: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 400px;
	}

	/* ══════════════════════════════════════════════════════════
	   DRAWER SUBMIT TUGAS STYLING
	   ══════════════════════════════════════════════════════════ */
	.drawer-task-layout {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.drawer-task-hero {
		padding: 14px 16px;
		border-radius: 12px;
		background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
		border: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.drawer-task-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.35;
	}

	.drawer-task-desc-box {
		margin-top: 10px;
		padding: 10px 12px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-left: 3.5px solid #4f46e5;
		border-radius: 8px;
	}

	.desc-heading {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 11px;
		font-weight: 700;
		color: #334155;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 4px;
	}

	.desc-content {
		font-size: 12.5px;
		color: #334155;
		line-height: 1.55;
		margin: 0;
		white-space: pre-line;
	}

	.drawer-feedback-box {
		margin-top: 10px;
		padding: 10px 12px;
		background: #fff1f2;
		border: 1px solid #fecdd3;
		border-radius: 10px;
	}

	.drawer-form-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	}

	.submission-tips-box {
		padding: 10px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	/* Drawer Footer Action Buttons */
	.drawer-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		width: 100%;
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

	.btn-drawer-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
	}

	.btn-drawer-primary:active:not(:disabled) {
		transform: scale(0.98);
	}

	.btn-drawer-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Mobile Responsiveness Enhancements */
	@media (max-width: 640px) {
		.content-area {
			padding: 16px 16px 84px;
			gap: 14px;
		}

		.header-card {
			padding: 16px;
			margin-bottom: 16px;
		}

		.filter-panel {
			padding: 8px 10px;
			margin-bottom: 16px;
		}

		.tabs-row {
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}

		.tasks-grid {
			grid-template-columns: 1fr;
		}

		.task-card__body {
			padding: 16px;
		}

		.task-card__footer {
			padding: 10px 16px;
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

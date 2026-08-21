<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type TaskItem = (typeof data.tasks)[number];

	let selectedStatusFilter = $state<string>('all');
	let activeSubmitTask = $state<TaskItem | null>(null);
	let submissionLink = $state('');
	let isSubmitting = $state(false);

	// Auto-open modal if navigated with ?taskId=... query param
	$effect(() => {
		const targetTaskId = page.url.searchParams.get('taskId');
		if (targetTaskId && data.tasks && data.tasks.length > 0 && !activeSubmitTask) {
			const found = data.tasks.find((t) => String(t.taskId) === targetTaskId);
			if (found) {
				openSubmitModal(found);
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
			activeSubmitTask = null;
			submissionLink = '';
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

	let openSubmitModal = (task: TaskItem) => {
		activeSubmitTask = task;
		submissionLink = task.submission?.link || '';
	};

	function closeSubmitModal() {
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
								<p class="task-desc">{t.taskDescription}</p>
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
							<button type="button" onclick={() => openSubmitModal(t)} class="btn-create" style="width:100%; justify-content:center;">
								<span>Submit Link Tugas</span>
							</button>
						{:else if t.submission.status === 'revisi'}
							<div style="display: flex; align-items: center; gap: 8px; width: 100%;">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-create" style="flex: 1; justify-content: center; background: #d97706;">
									<span>Perbaiki &amp; Kirim Ulang</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-cancel-sub"
									title="Batal Submit / Tarik Submisi"
								>
									Batal
								</button>
							</div>
						{:else if t.submission.status === 'pending'}
							<div style="display: flex; align-items: center; gap: 8px; width: 100%;">
								<button type="button" onclick={() => openSubmitModal(t)} class="btn-ghost" style="flex: 1; justify-content: center;">
									<span>Edit Link</span>
								</button>
								<button
									type="button"
									onclick={() => t.submission && promptCancelSubmission(t.submission.id, t.taskTitle)}
									class="btn-cancel-sub"
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

<!-- Modal Dialog Submit -->
{#if activeSubmitTask}
	<div class="form-scrim" role="dialog" aria-modal="true">
		<div class="submit-modal">
			<div class="modal-header">
				<div>
					<h3 class="modal-title">
						{activeSubmitTask.submission ? 'Edit Link Submisi Tugas' : 'Submit Link Tugas'}
					</h3>
					<p class="modal-sub">
						{activeSubmitTask.taskTitle} ({activeSubmitTask.pertemuanTitle})
					</p>
				</div>
				<button type="button" onclick={closeSubmitModal} class="modal-close-btn" aria-label="Tutup">✕</button>
			</div>

			<form
				method="POST"
				action="?/submit"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="modal-body"
			>
				<input type="hidden" name="taskId" value={activeSubmitTask.taskId} />

				<TextInput
					id="link"
					name="link"
					label="Link Hasil Tugas (URL)"
					placeholder="https://github.com/username/repository-tugas"
					bind:value={submissionLink}
					required
				/>
				<p class="hint-text">
					Masukkan URL publik ke hasil pekerjaan kamu (misal: GitHub, Figma, Google Docs/Drive, Notion, Vercel).
				</p>

				<div class="modal-footer">
					<button type="button" onclick={closeSubmitModal} class="btn-ghost">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !submissionLink.trim()} class="btn-create">
						{isSubmitting ? 'Mengirim...' : 'Kirim Tugas'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1100px;
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

	.btn-cancel-sub {
		background: #ffffff;
		border: 1px solid #fca5a5;
		color: #e11d48;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		padding: 9px 12px;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-cancel-sub:hover {
		background: #ffe4e6;
		border-color: #e11d48;
	}

	/* Filter Bar Tabs */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 12px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.tabs-row {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow-x: auto;
	}

	.tab-btn {
		font-family: var(--font-body);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		padding: 8px 16px;
		border-radius: var(--radius-md);
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.tab-btn:hover {
		background: var(--primary-light);
		color: var(--primary);
	}

	.tab-btn--active {
		background: var(--primary);
		color: #ffffff !important;
		border-color: var(--primary);
	}

	/* Tasks Grid */
	.tasks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}

	@media (max-width: 768px) {
		.tasks-grid {
			grid-template-columns: 1fr;
		}
	}

	.task-card {
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, opacity 200ms ease;
	}

	.task-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	/* Task Card Visual State Variants */
	.task-card--approved {
		background: #f8fafc;
		border: 1.5px solid #cbd5e1;
		opacity: 0.92;
	}

	.task-card--approved .task-title {
		color: #334155;
	}

	.task-card--pending {
		background: #fffdf5;
		border: 1.5px solid #fde68a;
	}

	.task-card--revisi {
		background: #fff5f5;
		border: 1.5px solid #fecdd3;
	}

	.task-card--unsubmitted {
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
	}

	.task-card__body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.task-size-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid var(--primary-border);
	}

	.task-title-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.task-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.session-meta {
		font-size: 12px;
		color: var(--text-muted);
	}

	.task-desc {
		font-size: 12.5px;
		color: var(--text-secondary);
		background: var(--bg-inset);
		padding: 10px 12px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-soft);
	}

	.submission-info-box {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12px;
	}

	.submission-link-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.info-label {
		color: var(--text-secondary);
		font-weight: 600;
	}

	.link-url {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--primary);
		text-decoration: underline;
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

	/* Modal Dialog */
	.form-scrim {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.submit-modal {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 520px;
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		padding: 18px 20px;
		border-bottom: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.modal-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.modal-sub {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.modal-close-btn {
		background: none;
		border: none;
		font-size: 16px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.modal-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.hint-text {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: -8px;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 8px;
	}

	/* Mobile Responsiveness Enhancements */
	@media (max-width: 640px) {
		.content-area {
			padding: 16px 12px 80px;
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
			scrollbar-width: none;
			padding-bottom: 2px;
		}

		.tabs-row::-webkit-scrollbar {
			display: none;
		}

		.tab-btn {
			flex-shrink: 0;
			white-space: nowrap;
			padding: 6px 12px;
			font-size: 11.5px;
		}

		.task-card__body {
			padding: 14px;
			gap: 10px;
		}

		.card-top-row {
			flex-wrap: wrap;
			gap: 6px;
		}

		.task-title {
			font-size: 1rem;
		}

		.task-card__footer {
			padding: 10px 14px;
		}

		.form-scrim {
			padding: 0;
			align-items: flex-end;
		}

		.submit-modal {
			max-height: 85vh;
			overflow-y: auto;
			border-radius: 16px 16px 0 0;
			max-width: 100%;
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

		.submission-link-line {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}

		.link-url {
			max-width: 100%;
			word-break: break-all;
			white-space: normal;
		}
	}
</style>

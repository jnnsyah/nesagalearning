<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = 'Konfirmasi Tindakan',
		message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
		confirmText = 'Ya, Konfirmasi',
		cancelText = 'Batal',
		saveText = '',
		variant = 'danger',
		loading = false,
		saveLoading = false,
		onconfirm,
		oncancel,
		onsave,
		children
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		saveText?: string;
		variant?: 'danger' | 'warning' | 'info';
		loading?: boolean;
		saveLoading?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
		onsave?: () => void;
		children?: Snippet;
	} = $props();

	function handleCancel() {
		if (loading || saveLoading) return;
		open = false;
		oncancel?.();
	}

	function handleConfirm() {
		if (loading || saveLoading) return;
		onconfirm?.();
	}

	function handleSave() {
		if (loading || saveLoading) return;
		onsave?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-scrim"
		onclick={(e) => e.target === e.currentTarget && handleCancel()}
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="confirm-card">
			<!-- Header Icon -->
			<div class="icon-wrap icon-wrap--{variant}">
				{#if variant === 'danger'}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
				{:else if variant === 'warning'}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				{:else}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				{/if}
			</div>

			<!-- Title & Message -->
			<div class="content-body">
				<h2 class="confirm-title">{title}</h2>
				<p class="confirm-msg">{message}</p>
				{#if children}
					<div class="confirm-children text-left mt-3">
						{@render children()}
					</div>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="confirm-actions" class:confirm-actions--triple={Boolean(saveText)}>
				<button
					type="button"
					onclick={handleCancel}
					disabled={loading || saveLoading}
					class="btn-cancel"
				>
					{cancelText}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={loading || saveLoading}
					class="btn-confirm btn-confirm--{variant}"
				>
					{#if loading}
						<svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
						Memproses...
					{:else}
						{confirmText}
					{/if}
				</button>
				{#if saveText}
					<button
						type="button"
						onclick={handleSave}
						disabled={loading || saveLoading}
						class="btn-save-modal"
					>
						{#if saveLoading}
							<svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
							Menyimpan...
						{:else}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							{saveText}
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-scrim {
		position: fixed;
		inset: 0;
		z-index: 100000;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.confirm-card {
		width: 100%;
		max-width: 420px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		padding: 28px 24px 24px;
		box-shadow: 0 24px 64px rgba(15, 23, 42, 0.16);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16px;
		animation: confirmPop 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes confirmPop {
		from { opacity: 0; transform: scale(0.94); }
		to   { opacity: 1; transform: scale(1); }
	}

	.icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-wrap--danger  { background: #fee2e2; color: #dc2626; }
	.icon-wrap--warning { background: #fef3c7; color: #d97706; }
	.icon-wrap--info    { background: #e0e7ff; color: #4f46e5; }

	.content-body {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.confirm-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.confirm-msg {
		font-size: 13.5px;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.confirm-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		margin-top: 4px;
	}
	.confirm-actions--triple {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}
	.confirm-actions--triple .btn-cancel,
	.confirm-actions--triple .btn-confirm,
	.confirm-actions--triple .btn-save-modal {
		flex: 1 1 auto;
		min-width: 110px;
	}

	.btn-save-modal {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: none;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		box-shadow: 0 4px 12px -2px rgba(79, 70, 229, 0.35);
		transition: all 150ms ease;
		white-space: nowrap;
	}
	.btn-save-modal:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.45);
	}
	.btn-save-modal:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel {
		flex: 1;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-cancel:hover:not(:disabled) {
		background: var(--bg-inset);
		color: var(--text-primary);
	}

	.btn-confirm {
		flex: 1.2;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: none;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-confirm--danger {
		background: linear-gradient(135deg, #dc2626, #ef4444);
		box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
	}

	.btn-confirm--danger:hover:not(:disabled) {
		box-shadow: 0 6px 18px rgba(220, 38, 38, 0.4);
		transform: translateY(-1px);
	}

	.btn-confirm--warning {
		background: linear-gradient(135deg, #d97706, #f59e0b);
		box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
	}

	.btn-confirm--warning:hover:not(:disabled) {
		box-shadow: 0 6px 18px rgba(217, 119, 6, 0.4);
		transform: translateY(-1px);
	}

	.btn-confirm--info {
		background: linear-gradient(135deg, #4338ca, #4f46e5);
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
	}

	.btn-confirm--info:hover:not(:disabled) {
		box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4);
		transform: translateY(-1px);
	}

	.btn-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spin-icon {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
</style>

<script lang="ts">
	import { toast } from '$lib/stores/toast';

	let touchStartY = 0;
	let touchStartX = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent, id: string) {
		const touchEndY = e.changedTouches[0].clientY;
		const touchEndX = e.changedTouches[0].clientX;
		const diffY = touchEndY - touchStartY;
		const diffX = Math.abs(touchEndX - touchStartX);

		// Swipe up (diffY < -30) or horizontal swipe (diffX > 60) dismisses toast on mobile
		if (diffY < -30 || diffX > 60) {
			toast.remove(id);
		}
	}
</script>

<div class="toast-container" aria-live="polite" aria-atomic="true">
	{#each $toast as item (item.id)}
		<div
			class="toast-card toast-card--{item.type}"
			role="status"
			ontouchstart={handleTouchStart}
			ontouchend={(e) => handleTouchEnd(e, item.id)}
		>
			<div class="toast-icon">
				{#if item.type === 'success'}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				{:else if item.type === 'error'}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
				{:else if item.type === 'warning'}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
				{/if}
			</div>

			<div class="toast-body">
				{#if item.title}
					<div class="toast-title">{item.title}</div>
				{/if}
				<div class="toast-msg">{item.message}</div>
			</div>

			<button
				type="button"
				onclick={() => toast.remove(item.id)}
				class="toast-close"
				aria-label="Tutup notifikasi"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 99990;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 380px;
		width: calc(100% - 32px);
		pointer-events: none;
	}

	/* Mobile Native Banner Adaptation (Floating below topbar header) */
	@media (max-width: 640px) {
		.toast-container {
			top: 68px;
			bottom: auto;
			left: 50%;
			right: auto;
			transform: translateX(-50%);
			width: calc(100vw - 24px);
			max-width: 440px;
			gap: 8px;
		}

		.toast-card {
			padding: 12px 14px;
			border-radius: 16px;
			box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08);
			animation: toastSlideInMobile 280ms cubic-bezier(0.16, 1, 0.3, 1) !important;
		}

		.toast-card:active {
			transform: scale(0.98);
		}

		@keyframes toastSlideInMobile {
			from { opacity: 0; transform: translateY(-24px) scale(0.92); }
			to   { opacity: 1; transform: translateY(0) scale(1); }
		}

		.toast-icon {
			width: 32px;
			height: 32px;
		}

		.toast-title {
			font-size: 12.5px;
		}

		.toast-msg {
			font-size: 12px;
		}
	}

	.toast-card {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		background: #ffffff;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-hard);
		box-shadow: 0 16px 36px -6px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08);
		animation: toastSlideInDesktop 240ms cubic-bezier(0.16, 1, 0.3, 1);
		transition: transform 180ms ease, opacity 180ms ease;
		user-select: none;
		-webkit-user-select: none;
	}

	@keyframes toastSlideInDesktop {
		from { opacity: 0; transform: translateY(16px) scale(0.95); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.toast-card--success { border-left: 4px solid #059669; }
	.toast-card--success .toast-icon { color: #059669; background: #dcfce7; }

	.toast-card--error { border-left: 4px solid #dc2626; }
	.toast-card--error .toast-icon { color: #dc2626; background: #fee2e2; }

	.toast-card--warning { border-left: 4px solid #d97706; }
	.toast-card--warning .toast-icon { color: #d97706; background: #fef3c7; }

	.toast-card--info { border-left: 4px solid #4f46e5; }
	.toast-card--info .toast-icon { color: #4f46e5; background: #e0e7ff; }

	.toast-icon {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.toast-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toast-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.toast-msg {
		font-size: 12.5px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.toast-close {
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 120ms ease;
		flex-shrink: 0;
	}

	.toast-close:hover {
		background: var(--bg-inset);
		color: var(--text-primary);
	}
</style>

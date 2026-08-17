<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = '',
		subtitle = '',
		onclose = () => {},
		children,
		footer
	}: {
		open: boolean;
		title?: string;
		subtitle?: string;
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	function handleOverlayClick() {
		open = false;
		onclose();
	}
</script>

{#if open}
	<div class="drawer-overlay" onclick={handleOverlayClick} role="presentation">
		<aside
			class="form-drawer"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="drawer-title"
		>
			<div class="form-drawer__header">
				<div>
					<h3 id="drawer-title" class="drawer-title">{title}</h3>
					{#if subtitle}
						<p class="drawer-subtitle">{subtitle}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={handleOverlayClick}
					class="btn-close-drawer"
					title="Tutup Modal"
				>
					&times;
				</button>
			</div>

			<div class="form-drawer__body">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				<div class="form-drawer__footer">
					{@render footer()}
				</div>
			{/if}
		</aside>
	</div>
{/if}

<style>
	.drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(4px);
		z-index: 999;
		display: flex;
		justify-content: flex-end;
		animation: fadeIn 200ms ease;
	}

	.form-drawer {
		width: 100%;
		max-width: 580px;
		height: 100vh;
		background: #ffffff;
		box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		animation: slideInRight 250ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideInRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.form-drawer__header {
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-inset);
	}

	.drawer-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.drawer-subtitle {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.btn-close-drawer {
		font-size: 24px;
		line-height: 1;
		color: var(--text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all 150ms ease;
	}

	.btn-close-drawer:hover {
		color: var(--text-primary);
		background: var(--border-subtle);
	}

	.form-drawer__body {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
	}

	.form-drawer__footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-subtle);
		background: #ffffff;
		display: flex;
		align-items: center;
		gap: 12px;
	}
</style>

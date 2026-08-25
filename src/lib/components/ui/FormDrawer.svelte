<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = '',
		subtitle = '',
		size = 'md',
		onclose = () => {},
		children,
		footer
	}: {
		open: boolean;
		title?: string;
		subtitle?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	function handleOverlayClick() {
		open = false;
		onclose();
	}

	// Lock body scroll when drawer is open to prevent page scrolling through overlay
	$effect(() => {
		if (open) {
			const scrollY = window.scrollY;
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.top = `-${scrollY}px`;
			document.body.style.width = '100%';
			return () => {
				document.body.style.overflow = '';
				document.body.style.position = '';
				document.body.style.top = '';
				document.body.style.width = '';
				window.scrollTo(0, scrollY);
			};
		}
	});
</script>

{#if open}
	<div
		class="drawer-overlay"
		onclick={handleOverlayClick}
		onwheel={(e) => e.stopPropagation()}
		role="presentation"
	>
		<aside
			class="form-drawer form-drawer--{size}"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="drawer-title"
		>
			<div class="drawer-handle-bar" aria-hidden="true"></div>
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
		overscroll-behavior: contain;
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

	.form-drawer--sm { max-width: 440px; }
	.form-drawer--md { max-width: 580px; }
	.form-drawer--lg { max-width: 780px; }
	.form-drawer--xl { max-width: 960px; }
	.form-drawer--full { max-width: 100vw; }

	.drawer-handle-bar {
		display: none;
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
		overscroll-behavior: contain;
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

	@media (max-width: 640px) {
		.drawer-overlay {
			align-items: flex-end;
			justify-content: center;
		}

		.form-drawer {
			max-width: 100%;
			height: auto;
			max-height: 88vh;
			border-radius: 20px 20px 0 0;
			animation: slideInUp 250ms cubic-bezier(0.16, 1, 0.3, 1);
		}

		@keyframes slideInUp {
			from {
				transform: translateY(100%);
			}
			to {
				transform: translateY(0);
			}
		}

		.drawer-handle-bar {
			display: block;
			width: 38px;
			height: 4.5px;
			background: #cbd5e1;
			border-radius: 9999px;
			margin: 10px auto 4px;
		}

		.form-drawer__header {
			padding: 14px 20px;
		}

		.form-drawer__body {
			padding: 16px 20px 24px;
		}
	}
</style>

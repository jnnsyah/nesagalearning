<script lang="ts">
	import type { Snippet } from 'svelte';

	interface BreadcrumbItem {
		label: string;
		href?: string;
	}

	interface Props {
		title: string;
		breadcrumbs?: BreadcrumbItem[];
		badges?: Snippet;
		actions?: Snippet;
	}

	let { title, breadcrumbs = [], badges, actions }: Props = $props();
</script>

<div class="page-header-card">
	<!-- Row 1: Header Top Row (Breadcrumbs on Left, Badges on Right) -->
	<div class="header-top-row">
		{#if breadcrumbs.length > 0}
			<nav class="header-breadcrumb" aria-label="Breadcrumb">
				{#each breadcrumbs as item, idx}
					{#if idx > 0}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bc-sep" aria-hidden="true">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					{/if}
					{#if item.href}
						<a href={item.href} class="bc-link">{item.label}</a>
					{:else}
						<span class="bc-current">{item.label}</span>
					{/if}
				{/each}
			</nav>
		{/if}

		{#if badges}
			<div class="header-badges">
				{@render badges()}
			</div>
		{/if}
	</div>

	<!-- Row 2: Main Content (Title on Left, Actions on Right) -->
	<div class="header-main-content">
		<div class="header-title-block">
			<h1 class="page-header-title">{title}</h1>
		</div>

		{#if actions}
			<div class="header-actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</div>

<style>
	.page-header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		box-sizing: border-box;
	}

	@media (max-width: 640px) {
		.page-header-card {
			padding: 12px 14px;
			gap: 8px;
		}
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.header-breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
		transition: color 150ms ease;
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

	.bc-sep {
		color: var(--text-sub, #94a3b8);
	}

	.header-badges {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.header-main-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.header-title-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 640px) {
		.header-title-block {
			gap: 3px;
		}
	}

	.page-header-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.25;
		margin: 0;
		letter-spacing: -0.01em;
	}

	@media (max-width: 640px) {
		.page-header-title {
			font-size: 1.25rem;
		}
	}

	.page-header-subtitle {
		font-size: 13.5px;
		color: var(--text-secondary, #475569);
		line-height: 1.5;
		margin: 0;
		max-width: 720px;
	}

	@media (max-width: 640px) {
		.page-header-subtitle {
			font-size: 12.5px;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>

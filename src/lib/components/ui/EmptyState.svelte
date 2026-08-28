<script lang="ts">
	import type { Snippet } from 'svelte';

	export type EmptyIconTheme = 'green' | 'indigo' | 'amber' | 'slate';

	interface Props {
		title: string;
		description?: string;
		iconTheme?: EmptyIconTheme;
		actionText?: string;
		actionHref?: string;
		onAction?: () => void;
		icon?: Snippet;
	}

	let {
		title,
		description,
		iconTheme = 'slate',
		actionText,
		actionHref,
		onAction,
		icon
	}: Props = $props();

	const themeClasses: Record<EmptyIconTheme, string> = {
		green: 'icon-wrap--green',
		indigo: 'icon-wrap--indigo',
		amber: 'icon-wrap--amber',
		slate: 'icon-wrap--slate'
	};
</script>

<div class="empty-state">
	<div class="empty-icon-wrap {themeClasses[iconTheme]}">
		{#if icon}
			{@render icon()}
		{:else}
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
		{/if}
	</div>

	<h3 class="empty-title">{title}</h3>
	{#if description}
		<p class="empty-sub">{description}</p>
	{/if}

	{#if actionText}
		<div class="empty-action-row">
			{#if actionHref}
				<a href={actionHref} class="btn-primary-gradient empty-btn">
					{actionText}
				</a>
			{:else if onAction}
				<button type="button" onclick={onAction} class="btn-primary-gradient empty-btn">
					{actionText}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		text-align: center;
		padding: 44px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		box-sizing: border-box;
	}

	.empty-icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
		flex-shrink: 0;
	}

	.icon-wrap--green  { background: #ecfdf5; color: #16a34a; }
	.icon-wrap--indigo { background: #e0e7ff; color: #4f46e5; }
	.icon-wrap--amber  { background: #fffbeb; color: #d97706; }
	.icon-wrap--slate  { background: #f1f5f9; color: #64748b; }

	.empty-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0 0 4px;
	}

	.empty-sub {
		font-family: var(--font-body, system-ui, sans-serif);
		font-size: 12.5px;
		color: var(--text-secondary, #475569);
		max-width: 320px;
		line-height: 1.5;
		margin: 0;
	}

	.empty-action-row {
		margin-top: 16px;
	}

	.empty-btn {
		font-size: 12.5px;
		padding: 8px 16px;
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';

	export type StatVariant = 'total' | 'approved' | 'pending' | 'revisi' | 'streak' | 'attendance' | 'track' | 'task';

	interface Props {
		label: string;
		value: string | number;
		subtext?: string;
		variant?: StatVariant;
		href?: string;
		tooltip?: string;
		pillText?: string;
		icon?: Snippet;
	}

	let {
		label,
		value,
		subtext,
		variant = 'total',
		href,
		tooltip,
		pillText,
		icon
	}: Props = $props();

	const variantClasses: Record<StatVariant, string> = {
		total: 'icon-total',
		approved: 'icon-approved',
		pending: 'icon-pending',
		revisi: 'icon-revisi',
		streak: 'icon-streak',
		attendance: 'icon-attendance',
		track: 'icon-track',
		task: 'icon-task'
	};
</script>

{#if href}
	<a {href} class="stat-card stat-card--link" title={tooltip}>
		<div class="stat-card-top">
			<div class="stat-icon {variantClasses[variant]}">
				{#if icon}
					{@render icon()}
				{/if}
			</div>
			{#if pillText}
				<span class="stat-pill">{pillText}</span>
			{/if}
		</div>

		<div class="stat-info">
			<div class="stat-value">{value}</div>
			<div class="stat-label">{label}</div>
			{#if subtext}
				<div class="stat-subtext">{subtext}</div>
			{/if}
		</div>
	</a>
{:else}
	<div class="stat-card" title={tooltip}>
		<div class="stat-card-top">
			<div class="stat-icon {variantClasses[variant]}">
				{#if icon}
					{@render icon()}
				{/if}
			</div>
			{#if pillText}
				<span class="stat-pill">{pillText}</span>
			{/if}
		</div>

		<div class="stat-info">
			<div class="stat-value">{value}</div>
			<div class="stat-label">{label}</div>
			{#if subtext}
				<div class="stat-subtext">{subtext}</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-md, 10px);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
		text-decoration: none;
		box-sizing: border-box;
	}

	.stat-card--link {
		cursor: pointer;
	}

	.stat-card--link:hover {
		transform: translateY(-2px);
		border-color: #a5b4fc;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.12);
	}

	.stat-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
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

	.icon-total      { background: #e0f2fe; color: #0284c7; }
	.icon-approved   { background: #dcfce7; color: #16a34a; }
	.icon-pending    { background: #fef3c7; color: #d97706; }
	.icon-revisi     { background: #ffe4e6; color: #be123c; }
	.icon-streak     { background: #e0e7ff; color: #6366f1; }
	.icon-attendance { background: #e0f2fe; color: #0284c7; }
	.icon-track      { background: #e0e7ff; color: #6366f1; }
	.icon-task       { background: #dcfce7; color: #16a34a; }

	.stat-pill {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: #475569;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-value {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.1;
	}

	.stat-label {
		font-family: var(--font-body, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary, #475569);
	}

	.stat-subtext {
		font-family: var(--font-body, system-ui, sans-serif);
		font-size: 11px;
		color: var(--text-muted, #64748b);
	}
</style>

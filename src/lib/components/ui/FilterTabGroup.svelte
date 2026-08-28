<script lang="ts">
	export interface TabItem {
		id: string;
		label: string;
		count?: number;
		variant?: 'all' | 'approved' | 'pending' | 'revisi' | 'absen' | 'unsubmitted' | 'default';
	}

	interface Props {
		tabs: TabItem[];
		activeTab: string;
		onSelect: (tabId: string) => void;
	}

	let { tabs, activeTab, onSelect }: Props = $props();
</script>

<div class="filter-panel">
	<div class="tabs-row">
		{#each tabs as tab}
			{@const isActive = tab.id === activeTab}
			{@const variantClass = tab.variant ? `tab-btn--${tab.variant}-active` : 'tab-btn--active'}
			<button
				type="button"
				class="tab-btn {isActive ? variantClass : ''}"
				onclick={() => onSelect(tab.id)}
			>
				<span>{tab.label}</span>
				{#if typeof tab.count === 'number'}
					<span class="tab-counter">{tab.count}</span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 8px 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		width: 100%;
		box-sizing: border-box;
	}

	.tabs-row {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
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
		color: var(--text-secondary, #475569);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 140ms ease;
		white-space: nowrap;
	}

	.tab-btn:hover:not(.tab-btn--active) {
		background: #ffffff;
		border-color: #cbd5e1;
		color: var(--text-primary, #0f172a);
	}

	/* Active variants */
	.tab-btn--active,
	.tab-btn--all-active {
		background: #eff6ff !important;
		color: #1d4ed8 !important;
		border-color: #bfdbfe !important;
	}

	.tab-btn--approved-active {
		background: #f0fdf4 !important;
		color: #15803d !important;
		border-color: #bbf7d0 !important;
	}

	.tab-btn--pending-active {
		background: #fffbeb !important;
		color: #b45309 !important;
		border-color: #fde68a !important;
	}

	.tab-btn--revisi-active {
		background: #fff1f2 !important;
		color: #be123c !important;
		border-color: #fecdd3 !important;
	}

	.tab-btn--absen-active {
		background: #fef2f2 !important;
		color: #991b1b !important;
		border-color: #fca5a5 !important;
	}

	.tab-btn--unsubmitted-active {
		background: #f1f5f9 !important;
		color: #334155 !important;
		border-color: #cbd5e1 !important;
	}

	.tab-counter {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 9999px;
		background: #e2e8f0;
		color: #475569;
	}

	.tab-btn--active .tab-counter,
	.tab-btn--all-active .tab-counter {
		background: #dbeafe;
		color: #1e40af;
	}

	.tab-btn--approved-active .tab-counter {
		background: #dcfce7;
		color: #166534;
	}

	.tab-btn--pending-active .tab-counter {
		background: #fef3c7;
		color: #92400e;
	}

	.tab-btn--revisi-active .tab-counter {
		background: #ffe4e6;
		color: #9f1239;
	}
</style>

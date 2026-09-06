<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		search,
		filters,
		stacked = false
	}: {
		search?: Snippet;
		filters?: Snippet;
		stacked?: boolean;
	} = $props();
</script>

<div class="filter-panel" class:filter-panel--stacked={stacked}>
	{#if stacked}
		<div class="filter-stacked-container">
			{#if search}
				<div class="filter-search-row">
					{@render search()}
				</div>
			{/if}
			{#if filters}
				<div class="filter-controls-row">
					{@render filters()}
				</div>
			{/if}
		</div>
	{:else}
		<div class="filter-grid">
			{#if search}
				<div class="filter-search-col">
					{@render search()}
				</div>
			{/if}
			{#if filters}
				{@render filters()}
			{/if}
		</div>
	{/if}
</div>

<style>
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 14px 16px;
		box-shadow: var(--shadow-sm);
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 12px;
		align-items: center;
	}

	.filter-search-col {
		grid-column: span 4;
	}

	.filter-stacked-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.filter-search-row {
		width: 100%;
	}

	.filter-controls-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		align-items: center;
	}

	@media (max-width: 1024px) {
		.filter-grid {
			grid-template-columns: repeat(6, 1fr);
		}
		.filter-search-col {
			grid-column: span 3;
		}
		.filter-controls-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.filter-grid {
			grid-template-columns: 1fr;
		}
		.filter-search-col {
			grid-column: 1 / -1;
		}
		.filter-controls-row {
			grid-template-columns: 1fr;
		}
	}
</style>

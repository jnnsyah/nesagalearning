<script lang="ts">
	import type { Snippet } from 'svelte';

	let { search, filters }: { search?: Snippet; filters?: Snippet } = $props();
</script>

<div class="filter-panel">
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
</div>

<style>
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 14px 16px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
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

	@media (max-width: 1024px) {
		.filter-grid {
			grid-template-columns: repeat(6, 1fr);
		}
		.filter-search-col {
			grid-column: span 3;
		}
	}

	@media (max-width: 640px) {
		.filter-grid {
			grid-template-columns: 1fr;
		}
		.filter-search-col {
			grid-column: 1 / -1;
		}
	}
</style>

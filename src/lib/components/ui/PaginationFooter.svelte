<script lang="ts">
	interface Props {
		currentPage: number;
		totalPages: number;
		totalItems?: number;
		pageSize?: number;
		onPageChange: (page: number) => void;
	}

	let { currentPage, totalPages, totalItems, pageSize, onPageChange }: Props = $props();

	let startItem = $derived(pageSize && totalItems ? (currentPage - 1) * pageSize + 1 : undefined);
	let endItem = $derived(pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : undefined);
</script>

{#if totalPages > 1}
	<div class="pagination-footer-bar">
		<div class="pagination-info">
			{#if startItem !== undefined && endItem !== undefined && totalItems !== undefined}
				<span>Menampilkan <strong class="text-slate-900">{startItem}-{endItem}</strong> dari <strong class="text-slate-900">{totalItems}</strong> data</span>
			{:else}
				<span>Halaman <strong class="text-slate-900">{currentPage}</strong> dari <strong class="text-slate-900">{totalPages}</strong></span>
			{/if}
		</div>

		<div class="pagination-controls">
			<button
				type="button"
				class="btn-pagination-nav"
				disabled={currentPage <= 1}
				onclick={() => onPageChange(currentPage - 1)}
			>
				&larr; Sebelum
			</button>

			<span class="pagination-page-indicator">
				{currentPage} / {totalPages}
			</span>

			<button
				type="button"
				class="btn-pagination-nav"
				disabled={currentPage >= totalPages}
				onclick={() => onPageChange(currentPage + 1)}
			>
				Selanjutnya &rarr;
			</button>
		</div>
	</div>
{/if}

<style>
	.pagination-footer-bar {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 12px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		width: 100%;
		box-sizing: border-box;
		flex-wrap: wrap;
	}

	.pagination-info {
		font-family: var(--font-body, system-ui, sans-serif);
		font-size: 12px;
		color: var(--text-secondary, #475569);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.btn-pagination-nav {
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 140ms ease;
	}

	.btn-pagination-nav:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.btn-pagination-nav:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-page-indicator {
		font-family: var(--font-mono, monospace);
		font-size: 11.5px;
		font-weight: 700;
		color: #475569;
	}
</style>

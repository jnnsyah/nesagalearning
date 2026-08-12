<script lang="ts">
	let {
		name = '',
		label = '',
		description = '',
		checked = $bindable(false),
		disabled = false,
		onLabel = 'Aktif',
		offLabel = 'Nonaktif',
		id = ''
	}: {
		name?: string;
		label?: string;
		description?: string;
		checked?: boolean;
		disabled?: boolean;
		onLabel?: string;
		offLabel?: string;
		id?: string;
	} = $props();
</script>

<div class="toggle-field">
	<!-- Hidden input for standard HTML form submission -->
	{#if name}
		<input type="hidden" {name} value={checked ? 'true' : 'false'} />
	{/if}

	<div class="toggle-row">
		<button
			type="button"
			id={id || name}
			class="toggle-track"
			class:toggle-track--checked={checked}
			{disabled}
			onclick={() => (checked = !checked)}
			role="switch"
			aria-checked={checked}
		>
			<span class="toggle-thumb" class:toggle-thumb--checked={checked}></span>
		</button>

		<div class="toggle-info">
			{#if label}
				<span class="toggle-label">{label}</span>
			{/if}
			<span class="toggle-status" class:toggle-status--on={checked}>
				{checked ? onLabel : offLabel}
			</span>
			{#if description}
				<p class="toggle-desc">{description}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.toggle-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.toggle-row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.toggle-track {
		width: 44px;
		height: 24px;
		border-radius: 9999px;
		background: #cbd5e1;
		border: none;
		cursor: pointer;
		position: relative;
		padding: 2px;
		transition: background 200ms ease;
		flex-shrink: 0;
		outline: none;
		margin-top: 2px;
	}

	.toggle-track:hover:not(:disabled) {
		background: #94a3b8;
	}

	.toggle-track--checked {
		background: #059669 !important;
	}

	.toggle-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		display: block;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
		transform: translateX(0);
	}

	.toggle-thumb--checked {
		transform: translateX(20px);
	}

	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toggle-label {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.toggle-status {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.toggle-status--on {
		color: #059669;
	}

	.toggle-desc {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>

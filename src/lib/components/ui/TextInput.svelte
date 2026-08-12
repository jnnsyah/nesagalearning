<script lang="ts">
	let {
		name = '',
		label = '',
		type = 'text',
		required = false,
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		error = '',
		hint = '',
		id = '',
		clearable = false
	}: {
		name?: string;
		label?: string;
		type?: string;
		required?: boolean;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		hint?: string;
		id?: string;
		clearable?: boolean;
	} = $props();
</script>

<div class="text-input-field">
	{#if label}
		<label for={id || name} class="field-label">
			{label}
			{#if required}<span class="req-star" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<div class="input-wrap">
		<input
			{type}
			{name}
			id={id || name}
			bind:value
			{placeholder}
			{disabled}
			{required}
			class="custom-input"
			class:custom-input--error={!!error}
		/>

		{#if clearable && value && !disabled}
			<button
				type="button"
				class="clear-btn"
				onclick={() => (value = '')}
				title="Hapus teks"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		{/if}
	</div>

	{#if error}
		<p class="field-error">{error}</p>
	{:else if hint}
		<p class="field-hint">{hint}</p>
	{/if}
</div>

<style>
	.text-input-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.field-label {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.req-star {
		color: var(--red);
	}

	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.custom-input {
		width: 100%;
		padding: 10px 14px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13.5px;
		color: var(--text-primary);
		outline: none;
		transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
	}

	.custom-input::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.custom-input:hover:not(:disabled) {
		border-color: var(--primary-border);
		background: #ffffff;
	}

	.custom-input:focus {
		border-color: var(--primary);
		background: #ffffff;
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.custom-input--error {
		border-color: var(--red-border);
		background: var(--red-dim);
	}

	.clear-btn {
		position: absolute;
		right: 12px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 50%;
		transition: color 120ms ease;
	}

	.clear-btn:hover {
		color: var(--red);
	}

	.field-error {
		font-size: 12px;
		font-weight: 600;
		color: var(--red);
	}

	.field-hint {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>

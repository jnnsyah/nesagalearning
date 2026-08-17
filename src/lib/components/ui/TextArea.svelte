<script lang="ts">
	let {
		name = '',
		label = '',
		required = false,
		value = $bindable(''),
		placeholder = '',
		rows = 4,
		maxlength = 0,
		disabled = false,
		error = '',
		hint = '',
		id = ''
	}: {
		name?: string;
		label?: string;
		required?: boolean;
		value?: string;
		placeholder?: string;
		rows?: number;
		maxlength?: number;
		disabled?: boolean;
		error?: string;
		hint?: string;
		id?: string;
	} = $props();

	let charCount = $derived(value ? value.length : 0);
</script>

<div class="textarea-field">
	<div class="label-row">
		{#if label}
			<label for={id || name} class="field-label">
				{label}
				{#if required}<span class="req-star" aria-hidden="true">*</span>{/if}
			</label>
		{/if}

		{#if maxlength > 0}
			<span class="char-count" class:char-count--max={charCount >= maxlength}>
				{charCount}/{maxlength}
			</span>
		{/if}
	</div>

	<textarea
		{name}
		id={id || name}
		bind:value
		{rows}
		{placeholder}
		{disabled}
		{required}
		maxlength={maxlength > 0 ? maxlength : undefined}
		class="custom-textarea"
		class:custom-textarea--error={!!error}
	></textarea>

	{#if error}
		<p class="field-error">{error}</p>
	{:else if hint}
		<p class="field-hint">{hint}</p>
	{/if}
</div>

<style>
	.textarea-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.char-count {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.char-count--max {
		color: var(--red);
	}

	.custom-textarea {
		width: 100%;
		padding: 10px 14px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13.5px;
		color: var(--text-primary);
		outline: none;
		resize: vertical;
		transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
		line-height: 1.55;
	}

	.custom-textarea::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.custom-textarea:hover:not(:disabled) {
		border-color: var(--primary-border);
		background: #ffffff;
	}

	.custom-textarea:focus {
		border-color: var(--primary);
		background: #ffffff;
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.custom-textarea--error {
		border-color: var(--red-border);
		background: var(--red-dim);
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

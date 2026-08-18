<script lang="ts">
	interface Option {
		value: string | number;
		label: string;
		description?: string;
		badge?: string;
	}

	let {
		name = '',
		label = '',
		required = false,
		options = [],
		value = $bindable(null),
		placeholder = 'Pilih opsi…',
		searchable = true,
		disabled = false,
		error = '',
		id = '',
		direction = 'down',
		onchange
	}: {
		name?: string;
		label?: string;
		required?: boolean;
		options: Option[];
		value?: string | number | null;
		placeholder?: string;
		searchable?: boolean;
		disabled?: boolean;
		error?: string;
		id?: string;
		direction?: 'down' | 'up';
		onchange?: (value: string | number | null) => void;
	} = $props();

	let isOpen       = $state(false);
	let searchQuery  = $state('');
	let containerEl  = $state<HTMLDivElement | null>(null);

	let selectedOption = $derived(
		options.find((o) => String(o.value) === String(value)) ?? null
	);

	let filteredOptions = $derived(
		searchable && searchQuery.trim()
			? options.filter((o) =>
					o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(o.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
			  )
			: options
	);

	function toggleOpen() {
		if (disabled) return;
		if (!isOpen) {
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('nlc:close-popovers', { detail: { source: containerEl } }));
			}
			isOpen = true;
		} else {
			isOpen = false;
		}
	}

	function selectOption(opt: Option) {
		value = opt.value;
		isOpen = false;
		searchQuery = '';
		if (onchange) {
			onchange(opt.value);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	// Single active popover enforcement: close when any other popover is opened
	$effect(() => {
		function handleClosePopovers(e: Event) {
			const customEvt = e as CustomEvent;
			if (customEvt.detail?.source !== containerEl) {
				isOpen = false;
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('nlc:close-popovers', handleClosePopovers);
			return () => {
				window.removeEventListener('nlc:close-popovers', handleClosePopovers);
			};
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div class="select-field" bind:this={containerEl}>
	{#if label}
		<label for={id || name} class="field-label">
			{label}
			{#if required}<span class="req-star" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<!-- Hidden input for standard HTML form POST compatibility -->
	{#if name}
		<input type="hidden" {name} value={value ?? ''} {required} />
	{/if}

	<!-- Trigger Button -->
	<button
		type="button"
		id={id || name}
		class="select-trigger"
		class:select-trigger--open={isOpen}
		class:select-trigger--error={!!error}
		{disabled}
		onclick={toggleOpen}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		<span class="trigger-label" class:trigger-placeholder={!selectedOption}>
			{selectedOption ? selectedOption.label : placeholder}
		</span>
		<span class="trigger-chevron" class:trigger-chevron--open={isOpen}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<polyline points="6 9 12 15 18 9"/>
			</svg>
		</span>
	</button>

	{#if error}
		<p class="field-error">{error}</p>
	{/if}

	<!-- Floating Dropdown Popover -->
	{#if isOpen}
		<div class="dropdown-popover" class:dropdown-popover--up={direction === 'up'} role="listbox" tabIndex={-1}>
			{#if searchable && options.length > 5}
				<div class="search-box">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
						<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
					</svg>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Cari..."
						class="search-input"
						autofocus
					/>
				</div>
			{/if}

			<div class="options-list">
				{#if filteredOptions.length === 0}
					<div class="no-options">Opsi tidak ditemukan</div>
				{:else}
					{#each filteredOptions as opt}
						{@const isSelected = String(opt.value) === String(value)}
						<button
							type="button"
							class="option-item"
							class:option-item--selected={isSelected}
							onclick={() => selectOption(opt)}
							role="option"
							aria-selected={isSelected}
						>
							<div class="option-text">
								<div class="option-label">
									{opt.label}
									{#if opt.badge}
										<span class="option-badge">{opt.badge}</span>
									{/if}
								</div>
								{#if opt.description}
									<div class="option-desc">{opt.description}</div>
								{/if}
							</div>
							{#if isSelected}
								<span class="check-mark">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.select-field {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
	}

	.field-label {
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: #475569;
		display: flex;
		align-items: center;
		gap: 4px;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0 !important;
	}

	.req-star {
		color: var(--red);
	}

	.select-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13.5px;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: all 180ms ease;
		outline: none;
	}

	.select-trigger:hover:not(:disabled) {
		border-color: var(--primary-border);
		background: #ffffff;
	}

	.select-trigger--open {
		border-color: var(--primary);
		background: #ffffff;
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.select-trigger--error {
		border-color: var(--red-border);
		background: var(--red-dim);
	}

	.trigger-label {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trigger-placeholder {
		color: var(--text-muted);
		font-weight: 500;
	}

	.trigger-chevron {
		color: var(--text-muted);
		display: flex;
		align-items: center;
		transition: transform 200ms ease;
	}

	.trigger-chevron--open {
		transform: rotate(180deg);
		color: var(--primary);
	}

	.field-error {
		font-size: 12px;
		font-weight: 600;
		color: var(--red);
		margin-top: 2px;
	}

	/* Popover */
	.dropdown-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 1000;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
		overflow: hidden;
		animation: popoverFade 180ms cubic-bezier(0.16, 1, 0.3, 1);
		max-height: 280px;
		display: flex;
		flex-direction: column;
	}

	.dropdown-popover--up {
		top: auto;
		bottom: calc(100% + 6px);
		box-shadow: 0 -12px 32px rgba(15, 23, 42, 0.16);
		animation: popoverFadeUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes popoverFade {
		from { opacity: 0; transform: translateY(-6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	@keyframes popoverFadeUp {
		from { opacity: 0; transform: translateY(6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.search-box {
		padding: 8px 10px;
		border-bottom: 1px solid var(--border-hard);
		position: relative;
		display: flex;
		align-items: center;
		background: var(--bg-inset);
	}

	.search-icon {
		position: absolute;
		left: 18px;
		color: var(--text-muted);
	}

	.search-input {
		width: 100%;
		padding: 6px 10px 6px 30px;
		border: 1px solid var(--border-hard);
		border-radius: 6px;
		font-size: 12px;
		color: var(--text-primary);
		outline: none;
	}

	.search-input:focus {
		border-color: var(--primary);
		background: #ffffff;
	}

	.options-list {
		overflow-y: auto;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.no-options {
		padding: 16px;
		text-align: center;
		font-size: 12.5px;
		color: var(--text-muted);
	}

	.option-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 9px 12px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 13px;
		text-align: left;
		cursor: pointer;
		transition: background 120ms ease;
	}

	.option-item:hover {
		background: var(--primary-light);
		color: var(--primary);
	}

	.option-item--selected {
		background: var(--primary-light);
		color: var(--primary);
		font-weight: 700;
	}

	.option-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.option-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--bg-cell);
		color: var(--text-muted);
	}

	.option-desc {
		font-size: 11.5px;
		color: var(--text-muted);
		font-weight: 400;
	}

	.check-mark {
		color: var(--primary);
		display: flex;
		align-items: center;
	}
</style>

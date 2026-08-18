<script lang="ts">
	let {
		name = '',
		label = '',
		required = false,
		value = $bindable(''),
		placeholder = 'Pilih tanggal…',
		disabled = false,
		error = '',
		id = '',
		onchange
	}: {
		name?: string;
		label?: string;
		required?: boolean;
		value?: string; // YYYY-MM-DD format
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		id?: string;
		onchange?: (val: string) => void;
	} = $props();

	let isOpen     = $state(false);
	let containerEl = $state<HTMLDivElement | null>(null);

	// Calendar view state (Month 0-11, Year)
	let viewDate = $state(value ? new Date(value) : new Date());
	let viewYear = $state(viewDate.getFullYear());
	let viewMonth = $state(viewDate.getMonth());

	const monthsIndo = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];
	const daysIndo = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

	// Format display date (e.g. "12 Agustus 2026")
	let formattedDisplay = $derived(() => {
		if (!value) return '';
		const [y, m, d] = value.split('-').map(Number);
		if (!y || !m || !d) return value;
		return `${d} ${monthsIndo[m - 1]} ${y}`;
	});

	// Days in current month grid
	let calendarDays = $derived(() => {
		const firstDay = new Date(viewYear, viewMonth, 1).getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

		const days = [];

		// Padding from prev month
		for (let i = firstDay - 1; i >= 0; i--) {
			days.push({ day: prevMonthDays - i, currentMonth: false });
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			days.push({ day: d, currentMonth: true });
		}

		// Padding to complete grid rows
		const totalCells = Math.ceil(days.length / 7) * 7;
		for (let d = 1; days.length < totalCells; d++) {
			days.push({ day: d, currentMonth: false });
		}

		return days;
	});

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

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear -= 1;
		} else {
			viewMonth -= 1;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear += 1;
		} else {
			viewMonth += 1;
		}
	}

	function selectDay(d: number, isCurrentMonth: boolean) {
		if (!isCurrentMonth) return;
		const mStr = String(viewMonth + 1).padStart(2, '0');
		const dStr = String(d).padStart(2, '0');
		value = `${viewYear}-${mStr}-${dStr}`;
		isOpen = false;
		onchange?.(value);
	}

	function setPreset(offsetDays: number) {
		const target = new Date();
		target.setDate(target.getDate() + offsetDays);
		const y = target.getFullYear();
		const m = String(target.getMonth() + 1).padStart(2, '0');
		const d = String(target.getDate()).padStart(2, '0');
		value = `${y}-${m}-${d}`;
		viewYear = y;
		viewMonth = target.getMonth();
		isOpen = false;
		onchange?.(value);
	}

	function clearValue() {
		value = '';
		isOpen = false;
		onchange?.('');
	}

	function isSelectedDate(day: number, isCurrentMonth: boolean) {
		if (!isCurrentMonth || !value) return false;
		const [y, m, d] = value.split('-').map(Number);
		return y === viewYear && m === viewMonth + 1 && d === day;
	}

	function isToday(day: number, isCurrentMonth: boolean) {
		if (!isCurrentMonth) return false;
		const today = new Date();
		return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) isOpen = false;
	}

	let popoverAlign = $state<'left' | 'right'>('left');
	let popoverVAlign = $state<'bottom' | 'top'>('bottom');

	$effect(() => {
		if (isOpen && containerEl) {
			const rect = containerEl.getBoundingClientRect();
			popoverAlign = rect.left + 300 > window.innerWidth - 16 ? 'right' : 'left';
			popoverVAlign = rect.bottom + 340 > window.innerHeight && rect.top > 340 ? 'top' : 'bottom';
		}
	});

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

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="datepicker-field" bind:this={containerEl}>
	{#if label}
		<label for={id || name} class="field-label">
			{label}
			{#if required}<span class="req-star" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<!-- Hidden input for standard HTML form submission -->
	{#if name}
		<input type="hidden" {name} value={value ?? ''} {required} />
	{/if}

	<!-- Input Trigger -->
	<div class="input-wrap">
		<button
			type="button"
			id={id || name}
			class="datepicker-trigger"
			class:datepicker-trigger--open={isOpen}
			class:datepicker-trigger--error={!!error}
			{disabled}
			onclick={toggleOpen}
		>
			<span class="calendar-icon" class:calendar-icon--active={!!value}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
			</span>
			<span class="value-text" class:value-placeholder={!value}>
				{formattedDisplay() || placeholder}
			</span>
		</button>

		{#if value && !disabled}
			<button type="button" class="clear-btn" onclick={clearValue} title="Hapus tanggal">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		{/if}
	</div>

	{#if error}
		<p class="field-error">{error}</p>
	{/if}

	<!-- Calendar Popover Overlay -->
	{#if isOpen}
		<div
			class="calendar-popover"
			class:popover-right={popoverAlign === 'right'}
			class:popover-top={popoverVAlign === 'top'}
			role="dialog"
			aria-label="Kalender Pemilih Tanggal"
		>
			<!-- Calendar Header -->
			<div class="calendar-header">
				<button type="button" class="nav-btn" onclick={prevMonth} title="Bulan sebelumnya">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="15 18 9 12 15 6"/>
					</svg>
				</button>
				<span class="month-year-label">
					{monthsIndo[viewMonth]} {viewYear}
				</span>
				<button type="button" class="nav-btn" onclick={nextMonth} title="Bulan berikutnya">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</button>
			</div>

			<!-- Days of Week Header -->
			<div class="weekdays-grid">
				{#each daysIndo as day}
					<span class="weekday-cell">{day}</span>
				{/each}
			</div>

			<!-- Calendar Days Grid -->
			<div class="days-grid">
				{#each calendarDays() as cell}
					<button
						type="button"
						class="day-btn"
						class:day-btn--other-month={!cell.currentMonth}
						class:day-btn--selected={isSelectedDate(cell.day, cell.currentMonth)}
						class:day-btn--today={isToday(cell.day, cell.currentMonth)}
						disabled={!cell.currentMonth}
						onclick={() => selectDay(cell.day, cell.currentMonth)}
					>
						{cell.day}
					</button>
				{/each}
			</div>

			<!-- Quick Presets Footer -->
			<div class="presets-footer">
				<button type="button" class="preset-chip" onclick={() => setPreset(0)}>Hari Ini</button>
				<button type="button" class="preset-chip" onclick={() => setPreset(1)}>Besok</button>
				<button type="button" class="preset-chip" onclick={() => setPreset(7)}>7 Hari Lagi</button>
				<button type="button" class="preset-chip" onclick={() => setPreset(30)}>30 Hari Lagi</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.datepicker-field {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
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

	.datepicker-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 36px 10px 14px;
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

	.datepicker-trigger:hover:not(:disabled) {
		border-color: var(--primary-border);
		background: #ffffff;
	}

	.datepicker-trigger--open {
		border-color: var(--primary);
		background: #ffffff;
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.datepicker-trigger--error {
		border-color: var(--red-border);
		background: var(--red-dim);
	}

	.calendar-icon {
		color: var(--text-muted);
		display: flex;
		align-items: center;
		flex-shrink: 0;
		transition: color 150ms ease;
	}

	.calendar-icon--active {
		color: var(--primary);
	}

	.value-text {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value-placeholder {
		color: var(--text-muted);
		font-weight: 500;
	}

	.clear-btn {
		position: absolute;
		right: 10px;
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 4px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 120ms ease;
	}

	.clear-btn:hover {
		color: var(--red);
		background: var(--red-dim);
	}

	.field-error {
		font-size: 12px;
		font-weight: 600;
		color: var(--red);
		margin-top: 2px;
	}

	/* Calendar Popover Overlay */
	.calendar-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 1000;
		width: 300px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		animation: popoverFade 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.calendar-popover.popover-right {
		left: auto;
		right: 0;
	}

	.calendar-popover.popover-top {
		top: auto;
		bottom: calc(100% + 6px);
	}

	@keyframes popoverFade {
		from { opacity: 0; transform: translateY(-6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-light, #f1f5f9);
	}

	.month-year-label {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.nav-btn {
		width: 30px;
		height: 30px;
		border-radius: 6px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.nav-btn:hover {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	.weekdays-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
	}

	.weekday-cell {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		padding: 4px 0;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.day-btn {
		height: 34px;
		border-radius: 8px;
		border: none;
		background: transparent;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.day-btn:hover:not(:disabled) {
		background: var(--primary-light);
		color: var(--primary);
	}

	.day-btn--other-month {
		color: #cbd5e1;
		cursor: default;
	}

	.day-btn--today {
		font-weight: 800;
		color: var(--primary);
		background: #e0e7ff;
	}

	.day-btn--selected {
		background: var(--primary) !important;
		color: #ffffff !important;
		font-weight: 800;
		box-shadow: var(--shadow-sm);
	}

	.presets-footer {
		display: flex;
		align-items: center;
		gap: 6px;
		padding-top: 8px;
		border-top: 1px solid var(--border-light, #f1f5f9);
		overflow-x: auto;
	}

	.preset-chip {
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid var(--border-hard);
		background: var(--bg-inset);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: all 120ms ease;
	}

	.preset-chip:hover {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}
</style>

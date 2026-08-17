<script lang="ts">
	let {
		name = '',
		label = '',
		required = false,
		value = $bindable(''),
		placeholder = 'Pilih tanggal…',
		disabled = false,
		error = '',
		id = ''
	}: {
		name?: string;
		label?: string;
		required?: boolean;
		value?: string; // YYYY-MM-DD format
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		id?: string;
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
	}

	function clearValue() {
		value = '';
		isOpen = false;
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
			onclick={() => (isOpen = !isOpen)}
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
		>
			<!-- Presets row -->
			<div class="preset-row">
				<button type="button" class="preset-chip" onclick={() => setPreset(0)}>Hari ini</button>
				<button type="button" class="preset-chip" onclick={() => setPreset(1)}>Besok</button>
				<button type="button" class="preset-chip" onclick={() => setPreset(7)}>+7 Hari</button>
			</div>

			<!-- Month/Year Navigation -->
			<div class="calendar-header">
				<button type="button" class="nav-btn" onclick={prevMonth} aria-label="Bulan sebelumnya">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
				<div class="month-year-title">
					{monthsIndo[viewMonth]} {viewYear}
				</div>
				<button type="button" class="nav-btn" onclick={nextMonth} aria-label="Bulan berikutnya">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 9 12 15 6"/></svg>
				</button>
			</div>

			<!-- Weekday Headers -->
			<div class="weekdays-grid">
				{#each daysIndo as day}
					<div class="weekday-cell">{day}</div>
				{/each}
			</div>

			<!-- Days Grid -->
			<div class="days-grid">
				{#each calendarDays() as d}
					<button
						type="button"
						class="day-cell"
						class:day-cell--other={!d.currentMonth}
						class:day-cell--today={isToday(d.day, d.currentMonth)}
						class:day-cell--selected={isSelectedDate(d.day, d.currentMonth)}
						disabled={!d.currentMonth}
						onclick={() => selectDay(d.day, d.currentMonth)}
					>
						{d.day}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.datepicker-field {
		position: relative;
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

	/* Calendar Popover */
	.calendar-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 70;
		width: 300px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
		padding: 14px;
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

	.preset-row {
		display: flex;
		gap: 6px;
		border-bottom: 1px solid var(--border-hard);
		padding-bottom: 10px;
	}

	.preset-chip {
		flex: 1;
		padding: 4px 8px;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-hard);
		background: var(--bg-inset);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 120ms ease;
		text-align: center;
	}

	.preset-chip:hover {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--primary-light);
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month-year-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.nav-btn {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.nav-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--primary-light);
	}

	.weekdays-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
	}

	.weekday-cell {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.day-cell {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: none;
		background: transparent;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.day-cell:hover:not(:disabled) {
		background: var(--primary-light);
		color: var(--primary);
	}

	.day-cell--other {
		color: var(--text-ghost);
		cursor: default;
	}

	.day-cell--today {
		border: 1.5px solid var(--primary-border);
		color: var(--primary);
		font-weight: 800;
	}

	.day-cell--selected {
		background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
		color: #ffffff !important;
		font-weight: 800;
		box-shadow: 0 2px 8px rgba(79,70,229,0.3);
	}
</style>

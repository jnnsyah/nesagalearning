<script lang="ts">
	import { enhance } from '$app/forms';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// Search & Filter state
	let searchQuery = $state('');
	let categoryFilter = $state<'semua' | 'presensi' | 'streak' | 'tugas'>('semua');

	// Local editable values map (configKey -> value)
	let configValues = $state<Record<string, number>>({});

	// Confirm Modals
	let isResetModalOpen = $state(false);
	let isBulkSaveModalOpen = $state(false);

	// Sync data items into local reactive state
	$effect(() => {
		if (data.items) {
			const map: Record<string, number> = {};
			for (const item of data.items) {
				map[item.configKey] = item.configValue;
			}
			configValues = map;
		}
	});

	// Sync server responses to toast notifications
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message);
		} else if (form?.message && !form?.success) {
			toast.error(form.message);
		}
	});

	// Derived filtered items
	let filteredItems = $derived.by(() => {
		let list = [...(data.items || [])];

		// Search query
		if (searchQuery.trim() !== '') {
			const term = searchQuery.toLowerCase().trim();
			list = list.filter(
				(item) =>
					item.label.toLowerCase().includes(term) ||
					item.configKey.toLowerCase().includes(term) ||
					(item.description && item.description.toLowerCase().includes(term))
			);
		}

		// Category filter
		if (categoryFilter === 'presensi') {
			list = list.filter((item) => item.category === 'Presensi & Kehadiran');
		} else if (categoryFilter === 'streak') {
			list = list.filter((item) => item.category === 'Bonus Milestone Streak');
		} else if (categoryFilter === 'tugas') {
			list = list.filter((item) => item.category === 'Penilaian Tugas');
		}

		return list;
	});

	// Group items by category for clear presentation
	let presensiItems = $derived(filteredItems.filter((i) => i.category === 'Presensi & Kehadiran'));
	let streakItems = $derived(filteredItems.filter((i) => i.category === 'Bonus Milestone Streak'));
	let tugasItems = $derived(filteredItems.filter((i) => i.category === 'Penilaian Tugas'));
	let otherItems = $derived(filteredItems.filter((i) => i.category === 'Lainnya'));

	function updatePointValue(key: string, delta: number) {
		const current = Number(configValues[key] ?? 0);
		const next = Math.max(0, current + delta);
		configValues[key] = next;
	}

	function formatDateIndo(dateInput: Date | string | null): string {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		if (isNaN(d.getTime())) return '-';
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     1. HEADER / HERO TITLE BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-content-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Konfigurasi Poin & Rules Sistem</h1>
					<span class="badge badge-primary">
						{data.stats?.totalConfigsCount ?? 0} Parameter Sistem
					</span>
				</div>
				<p class="hero-subtitle">
					Atur perolehan poin presensi, bonus milestone streak, dan penghargaan tugas secara fleksibel.
				</p>
			</div>
			<div class="hero-actions-group">
				<button
					type="button"
					class="btn-warning-action"
					onclick={() => (isResetModalOpen = true)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
						<path d="M3 3v5h5"/>
					</svg>
					<span>Reset Default</span>
				</button>

				<button
					type="button"
					class="btn-primary-action"
					onclick={() => (isBulkSaveModalOpen = true)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
						<polyline points="17 21 17 13 7 13 7 21"/>
						<polyline points="7 3 7 8 15 8"/>
					</svg>
					<span>Simpan Semua Perubahan</span>
				</button>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (.stats-grid)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Statistik Konfigurasi Poin">
		<div class="stat-card">
			<div class="stat-icon-box icon-params">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3"/>
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalConfigsCount ?? 0} Item</span>
				<span class="stat-label">Total Rule Poin Sistem</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-presensi">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">+{data.stats?.weekdayAttendancePoints ?? 100} / +{data.stats?.weekendAttendancePoints ?? 150}</span>
				<span class="stat-label">Poin Presensi (Wk / Wkd)</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-streak">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">+{data.stats?.maxStreakBonus ?? 1000} Poin</span>
				<span class="stat-label">Bonus Streak Maksimal</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-tugas">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 11 12 14 22 4"/>
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">+{data.stats?.maxTaskPoints ?? 200} Poin</span>
				<span class="stat-label">Poin Tugas Maksimal</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     3. FILTER BAR ($lib/components/ui/FilterBar.svelte)
	     ══════════════════════════════════════════════════════════ -->
	<FilterBar>
		{#snippet search()}
			<TextInput
				name="search"
				placeholder="Cari nama parameter atau deskripsi konfigurasi…"
				bind:value={searchQuery}
				clearable
			/>
		{/snippet}

		{#snippet filters()}
			<CustomSelect
				name="categoryFilter"
				bind:value={categoryFilter}
				options={[
					{ value: 'semua', label: 'Semua Kategori' },
					{ value: 'presensi', label: 'Presensi & Kehadiran' },
					{ value: 'streak', label: 'Bonus Milestone Streak' },
					{ value: 'tugas', label: 'Penilaian Tugas' }
				]}
			/>
		{/snippet}
	</FilterBar>

	<!-- ══════════════════════════════════════════════════════════
	     4. BULK CONFIG FORM & CATEGORIZED CARDS
	     ══════════════════════════════════════════════════════════ -->
	<form
		id="bulk-config-form"
		action="?/bulkUpdate"
		method="POST"
		use:enhance
		class="config-sections-stack"
	>
		<!-- Section 1: Presensi & Kehadiran -->
		{#if presensiItems.length > 0}
			<div class="card config-card">
				<div class="card-header-flex">
					<div class="card-header-title-group">
						<div class="card-header-icon text-indigo-600 bg-indigo-50">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
							</svg>
						</div>
						<div>
							<h2 class="card-title">1. Poin Presensi & Kehadiran</h2>
							<p class="card-subtitle">Pengaturan dasar poin saat siswa melakukan scan presensi QR per sesi.</p>
						</div>
					</div>
				</div>

				<div class="config-rows-list">
					{#each presensiItems as item}
						<div class="config-row-item">
							<div class="config-row-info">
								<div class="config-row-title-row">
									<span class="config-label">{item.label}</span>
									<span class="config-key-tag">`{item.configKey}`</span>
								</div>
								<p class="config-desc">{item.description || '-'}</p>
							</div>

							<div class="config-row-input-group">
								<div class="stepper-input-group">
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--minus"
										onclick={() => updatePointValue(item.configKey, -10)}
										title="Kurangi 10 Poin"
									>
										&minus;
									</button>
									<div class="unit-input-wrap">
										<input
											type="number"
											min="0"
											step="5"
											name={`config_${item.configKey}`}
											bind:value={configValues[item.configKey]}
											class="number-input no-spinner"
										/>
										<span class="unit-tag">Poin</span>
									</div>
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--plus"
										onclick={() => updatePointValue(item.configKey, 10)}
										title="Tambah 10 Poin"
									>
										&#43;
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Section 2: Bonus Milestone Streak -->
		{#if streakItems.length > 0}
			<div class="card config-card">
				<div class="card-header-flex">
					<div class="card-header-title-group">
						<div class="card-header-icon text-orange-600 bg-orange-50">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/>
							</svg>
						</div>
						<div>
							<h2 class="card-title">2. Bonus Milestone Streak</h2>
							<p class="card-subtitle">Bonus poin yang didapatkan siswa ketika mencapai rekor kehadiran beruntun.</p>
						</div>
					</div>
				</div>

				<div class="config-rows-list">
					{#each streakItems as item}
						<div class="config-row-item">
							<div class="config-row-info">
								<div class="config-row-title-row">
									<span class="config-label">{item.label}</span>
									<span class="config-key-tag">`{item.configKey}`</span>
								</div>
								<p class="config-desc">{item.description || '-'}</p>
							</div>

							<div class="config-row-input-group">
								<div class="stepper-input-group">
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--minus"
										onclick={() => updatePointValue(item.configKey, -50)}
										title="Kurangi 50 Poin"
									>
										&minus;
									</button>
									<div class="unit-input-wrap">
										<input
											type="number"
											min="0"
											step="10"
											name={`config_${item.configKey}`}
											bind:value={configValues[item.configKey]}
											class="number-input no-spinner"
										/>
										<span class="unit-tag">Poin</span>
									</div>
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--plus"
										onclick={() => updatePointValue(item.configKey, 50)}
										title="Tambah 50 Poin"
									>
										&#43;
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Section 3: Penilaian Tugas -->
		{#if tugasItems.length > 0}
			<div class="card config-card">
				<div class="card-header-flex">
					<div class="card-header-title-group">
						<div class="card-header-icon text-sky-600 bg-sky-50">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="9 11 12 14 22 4"/>
								<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
							</svg>
						</div>
						<div>
							<h2 class="card-title">3. Poin Penilaian Tugas</h2>
							<p class="card-subtitle">Penghargaan poin otomatis setelah tugas siswa disetujui (*approved*) oleh mentor.</p>
						</div>
					</div>
				</div>

				<div class="config-rows-list">
					{#each tugasItems as item}
						<div class="config-row-item">
							<div class="config-row-info">
								<div class="config-row-title-row">
									<span class="config-label">{item.label}</span>
									<span class="config-key-tag">`{item.configKey}`</span>
								</div>
								<p class="config-desc">{item.description || '-'}</p>
							</div>

							<div class="config-row-input-group">
								<div class="stepper-input-group">
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--minus"
										onclick={() => updatePointValue(item.configKey, -10)}
										title="Kurangi 10 Poin"
									>
										&minus;
									</button>
									<div class="unit-input-wrap">
										<input
											type="number"
											min="0"
											step="10"
											name={`config_${item.configKey}`}
											bind:value={configValues[item.configKey]}
											class="number-input no-spinner"
										/>
										<span class="unit-tag">Poin</span>
									</div>
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--plus"
										onclick={() => updatePointValue(item.configKey, 10)}
										title="Tambah 10 Poin"
									>
										&#43;
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Section 4: Lainnya (jika ada custom config tambahan) -->
		{#if otherItems.length > 0}
			<div class="card config-card">
				<div class="card-header-flex">
					<div class="card-header-title-group">
						<div class="card-header-icon text-emerald-600 bg-emerald-50">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
							</svg>
						</div>
						<div>
							<h2 class="card-title">4. Konfigurasi Tambahan</h2>
							<p class="card-subtitle">Parameter poin sistem lainnya.</p>
						</div>
					</div>
				</div>

				<div class="config-rows-list">
					{#each otherItems as item}
						<div class="config-row-item">
							<div class="config-row-info">
								<div class="config-row-title-row">
									<span class="config-label">{item.label}</span>
									<span class="config-key-tag">`{item.configKey}`</span>
								</div>
								<p class="config-desc">{item.description || '-'}</p>
							</div>

							<div class="config-row-input-group">
								<div class="stepper-input-group">
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--minus"
										onclick={() => updatePointValue(item.configKey, -10)}
										title="Kurangi 10 Poin"
									>
										&minus;
									</button>
									<div class="unit-input-wrap">
										<input
											type="number"
											min="0"
											name={`config_${item.configKey}`}
											bind:value={configValues[item.configKey]}
											class="number-input no-spinner"
										/>
										<span class="unit-tag">Poin</span>
									</div>
									<button
										type="button"
										class="stepper-ctrl-btn stepper-ctrl-btn--plus"
										onclick={() => updatePointValue(item.configKey, 10)}
										title="Tambah 10 Poin"
									>
										&#43;
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</form>

	<!-- Empty state if search/filter returns 0 items -->
	{#if filteredItems.length === 0}
		<div class="card empty-state-box">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
				<circle cx="12" cy="12" r="3"/>
				<path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
			</svg>
			<h3 class="empty-title">Tidak Ada Konfigurasi Poin</h3>
			<p class="empty-desc">
				{searchQuery ? `Tidak ditemukan parameter poin dengan kata kunci "${searchQuery}".` : 'Belum ada parameter poin terdaftar.'}
			</p>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     5. CONFIRM MODALS
	     ══════════════════════════════════════════════════════════ -->
	<!-- Bulk Save Confirmation Modal -->
	{#if isBulkSaveModalOpen}
		<ConfirmModal
			bind:open={isBulkSaveModalOpen}
			title="Simpan Perubahan Konfigurasi Poin?"
			message="Apakah Anda yakin ingin memperbarui nilai parameter poin sistem? Seluruh perolehan poin presensi, streak, dan tugas mendatang akan mengikuti skema baru ini."
			confirmText="Ya, Simpan Perubahan"
			cancelText="Batal"
			variant="warning"
			onconfirm={() => {
				const formEl = document.getElementById('bulk-config-form') as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				isBulkSaveModalOpen = false;
			}}
		/>
	{/if}

	<!-- Reset Defaults Confirmation Modal -->
	{#if isResetModalOpen}
		<ConfirmModal
			bind:open={isResetModalOpen}
			title="Kembalikan Ke Setting Default Sistem?"
			message="Apakah Anda yakin ingin mengembalikan seluruh parameter poin ke nilai standar awal sistem (Weekday: 100, Weekend: 150, Task: 50-200)? Perubahan manual Anda akan ditimpa."
			confirmText="Ya, Reset Default"
			cancelText="Batal"
			variant="danger"
			onconfirm={() => {
				const formEl = document.getElementById('reset-defaults-form') as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				isResetModalOpen = false;
			}}
		/>

		<form
			id="reset-defaults-form"
			action="?/resetDefaults"
			method="POST"
			use:enhance
			class="hidden"
		></form>
	{/if}
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px 20px 40px;
	}

	/* Hero Section */
	.page-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm);
	}

	.hero-content-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	@media (max-width: 768px) {
		.hero-content-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.hero-title-group {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.hero-subtitle {
		font-size: 13.5px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.hero-actions-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn-primary-action {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: var(--primary);
		color: #ffffff;
		border: 1px solid transparent;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-primary-action:hover {
		background: var(--primary-hover, #4338ca);
	}

	.btn-warning-action {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: #ffffff;
		color: #b45309;
		border: 1px solid #fde68a;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.btn-warning-action:hover {
		background: #fef3c7;
		border-color: #f59e0b;
	}

	/* Key Metrics Grid (.stats-grid) */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 10px);
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-params { background: #e0e7ff; color: #4f46e5; }
	.icon-presensi { background: #dcfce7; color: #166534; }
	.icon-streak { background: #ffedd5; color: #c2410c; }
	.icon-tugas { background: #e0f2fe; color: #0369a1; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 600;
		margin-top: 2px;
	}

	/* Config Cards & List Layout */
	.config-sections-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.config-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm);
	}

	.card-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-hard);
		margin-bottom: 16px;
	}

	.card-header-title-group {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.card-header-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.card-subtitle {
		font-size: 12.5px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.config-rows-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.config-row-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 14px 16px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 10px);
		transition: background 120ms ease;
	}

	.config-row-item:hover {
		background: #ffffff;
		border-color: var(--primary-border);
	}

	@media (max-width: 640px) {
		.config-row-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.config-row-input-group {
			width: 100%;
		}

		.unit-input-wrap {
			width: 100%;
		}

		.number-input {
			flex: 1;
		}
	}

	.config-row-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.config-row-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.config-label {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.config-key-tag {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.04);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.config-desc {
		font-size: 12.5px;
		color: var(--text-muted);
		margin: 0;
	}

	.unit-input-wrap {
		display: flex;
		align-items: center;
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	.unit-input-wrap:focus-within {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.number-input {
		width: 110px;
		padding: 8px 12px;
		border: none;
		outline: none;
		font-family: var(--font-mono);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		text-align: right;
		background: transparent;
	}

	.unit-tag {
		padding: 8px 12px;
		background: var(--bg-inset, #f8fafc);
		border-left: 1px solid var(--border-hard);
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.badge {
		padding: 3px 9px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		border-radius: 9999px;
	}

	.badge-primary {
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
	}

	/* Empty State */
	.empty-state-box {
		padding: 48px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 12px 0 4px;
	}

	.empty-desc {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 360px;
	}

	/* Stepper Input Group & Custom +/- Buttons */
	.stepper-input-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.stepper-ctrl-btn {
		width: 36px;
		height: 38px;
		border-radius: var(--radius-md, 8px);
		border: 1.5px solid var(--border-hard);
		background: #ffffff;
		font-family: var(--font-macro);
		font-size: 18px;
		font-weight: 800;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 120ms ease;
		box-shadow: var(--shadow-sm);
		user-select: none;
	}

	.stepper-ctrl-btn:hover {
		transform: scale(1.05);
	}

	.stepper-ctrl-btn:active {
		transform: scale(0.95);
	}

	.stepper-ctrl-btn--minus:hover {
		background: #fef2f2;
		color: #dc2626;
		border-color: #fca5a5;
	}

	.stepper-ctrl-btn--plus:hover {
		background: #f0fdf4;
		color: #16a34a;
		border-color: #86efac;
	}

	/* Hide default browser spinners on number inputs */
	.no-spinner::-webkit-outer-spin-button,
	.no-spinner::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.no-spinner[type='number'] {
		-moz-appearance: textfield;
	}
</style>

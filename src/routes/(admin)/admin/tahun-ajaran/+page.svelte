<script lang="ts">
	import { enhance } from '$app/forms';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// Search & Filter state
	let searchQuery = $state('');
	let statusFilter = $state<'semua' | 'aktif' | 'nonaktif'>('semua');
	let sortOption = $state<'terbaru' | 'terlama' | 'nama-asc'>('terbaru');

	// Drawer state
	let isFormDrawerOpen = $state(false);
	let editingTa = $state<any | null>(null);

	// Form inputs
	let formName = $state('');
	let formStartedAt = $state('');
	let formEndedAt = $state('');
	let formIsActive = $state(false);

	// Confirm Modal states
	let isDeleteModalOpen = $state(false);
	let targetDeleteTa = $state<any | null>(null);

	let isSetActiveModalOpen = $state(false);
	let targetActiveTa = $state<any | null>(null);

	// Promotion Preview Drawer states
	let isPromotionPreviewOpen = $state(false);
	let previewSearchQuery = $state('');
	let previewFilterStatus = $state<'all' | 'promote' | 'graduate' | 'unchanged'>('all');
	let isSubmittingPromotion = $state(false);

	// Derived filtered promotion preview items
	let filteredPreviewItems = $derived.by(() => {
		let list = [...(data.promotionPreview?.items || [])];

		if (previewSearchQuery.trim() !== '') {
			const term = previewSearchQuery.toLowerCase().trim();
			list = list.filter(
				(item) =>
					item.fullName.toLowerCase().includes(term) ||
					item.username.toLowerCase().includes(term) ||
					(item.currentRombel && item.currentRombel.toLowerCase().includes(term)) ||
					item.nextRombel.toLowerCase().includes(term)
			);
		}

		if (previewFilterStatus !== 'all') {
			list = list.filter((item) => item.status === previewFilterStatus);
		}

		return list;
	});

	// Sync server form responses to toast notifications
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message);
		} else if (form?.message && !form?.success) {
			toast.error(form.message);
		}
	});

	// Derived filtered & sorted items
	let filteredItems = $derived.by(() => {
		let list = [...(data.items || [])];

		// 1. Search query filter
		if (searchQuery.trim() !== '') {
			const term = searchQuery.toLowerCase().trim();
			list = list.filter((item) => item.name.toLowerCase().includes(term));
		}

		// 2. Status filter
		if (statusFilter === 'aktif') {
			list = list.filter((item) => item.isActive);
		} else if (statusFilter === 'nonaktif') {
			list = list.filter((item) => !item.isActive);
		}

		// 3. Sorting
		if (sortOption === 'terbaru') {
			list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} else if (sortOption === 'terlama') {
			list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		} else if (sortOption === 'nama-asc') {
			list.sort((a, b) => a.name.localeCompare(b.name));
		}

		return list;
	});

	// Dynamic year helper functions
	function parseStartYear(nameStr: string): number {
		const match = nameStr.match(/(\d{4})/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return new Date().getFullYear();
	}

	function formatTaName(startYear: number): string {
		return `${startYear}/${startYear + 1}`;
	}

	function applyDateTemplate(template: 'full' | 'ganjil' | 'genap', overrideYear?: number) {
		const startY = overrideYear ?? parseStartYear(formName);
		const endY = startY + 1;

		if (template === 'full') {
			formStartedAt = `${startY}-07-15`;
			formEndedAt = `${endY}-06-30`;
			toast.info(`Preset Tanggal Penuh: 15 Jul ${startY} – 30 Jun ${endY}`);
		} else if (template === 'ganjil') {
			formStartedAt = `${startY}-07-15`;
			formEndedAt = `${startY}-12-31`;
			toast.info(`Preset Ganjil: 15 Jul ${startY} – 31 Des ${startY}`);
		} else if (template === 'genap') {
			formStartedAt = `${endY}-01-05`;
			formEndedAt = `${endY}-06-30`;
			toast.info(`Preset Genap: 5 Jan ${endY} – 30 Jun ${endY}`);
		}
	}

	function incrementYear() {
		const currY = parseStartYear(formName);
		const nextY = currY + 1;
		formName = formatTaName(nextY);
		if (!editingTa) {
			applyDateTemplate('full', nextY);
		}
	}

	function decrementYear() {
		const currY = parseStartYear(formName);
		const prevY = currY - 1;
		formName = formatTaName(prevY);
		if (!editingTa) {
			applyDateTemplate('full', prevY);
		}
	}

	function setYearPreset(startYear: number) {
		formName = formatTaName(startYear);
		if (!editingTa) {
			applyDateTemplate('full', startYear);
		}
	}

	function handleNameBlur() {
		const trimmed = formName.trim();
		if (/^\d{4}$/.test(trimmed)) {
			const y = parseInt(trimmed, 10);
			formName = formatTaName(y);
			if (!formStartedAt) {
				applyDateTemplate('full', y);
			}
		}
	}

	let realCurrentYear = new Date().getFullYear();
	let baseYear = $derived(parseStartYear(formName));

	// Auto-format 4-digit input into academic year format e.g. "2026" -> "2026/2027"
	$effect(() => {
		const trimmed = formName.trim();
		if (/^\d{4}$/.test(trimmed)) {
			const y = parseInt(trimmed, 10);
			formName = formatTaName(y);
			if (!formStartedAt) {
				applyDateTemplate('full', y);
			}
		}
	});

	function openCreateDrawer() {
		editingTa = null;
		const currentY = new Date().getFullYear();
		formName = formatTaName(currentY);
		formStartedAt = `${currentY}-07-15`;
		formEndedAt = `${currentY + 1}-06-30`;
		formIsActive = false;
		isFormDrawerOpen = true;
	}

	function openEditDrawer(ta: any) {
		editingTa = ta;
		formName = ta.name;
		formStartedAt = ta.startedAt ? new Date(ta.startedAt).toISOString().split('T')[0] : '';
		formEndedAt = ta.endedAt ? new Date(ta.endedAt).toISOString().split('T')[0] : '';
		formIsActive = ta.isActive;
		isFormDrawerOpen = true;
	}

	function closeFormDrawer() {
		isFormDrawerOpen = false;
		editingTa = null;
	}

	function formatDateIndo(dateInput: Date | string | null): string {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		if (isNaN(d.getTime())) return '-';
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function openDeleteModal(ta: any) {
		targetDeleteTa = ta;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		targetDeleteTa = null;
	}

	function openSetActiveModal(ta: any) {
		targetActiveTa = ta;
		isSetActiveModalOpen = true;
	}

	function closeSetActiveModal() {
		isSetActiveModalOpen = false;
		targetActiveTa = null;
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
					<h1 class="hero-title">Manajemen Periode Komunitas</h1>
					<span class="badge badge-primary">
						{data.stats?.totalTahunAjaran ?? 0} Periode
					</span>
				</div>
				<p class="hero-subtitle">
					Kelola periode komunitas aktif, jadwalkan pergantian periode, dan jalankan proses kenaikan kelas rombel otomatis.
				</p>
			</div>
			<div class="hero-actions-group">
				<button
					type="button"
					class="btn-secondary-action"
					onclick={() => (isPromotionPreviewOpen = true)}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/>
					</svg>
					<span>Preview & Kenaikan Kelas</span>
				</button>

				<button type="button" class="btn-primary-action" onclick={openCreateDrawer}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
					</svg>
					<span>Tambah Periode Baru</span>
				</button>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (.stats-grid)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Statistik Periode Komunitas">
		<div class="stat-card">
			<div class="stat-icon-box icon-ta">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalTahunAjaran ?? 0}</span>
				<span class="stat-label">Total Periode Komunitas</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-active">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value text-ellipsis">{data.stats?.activeTahunAjaranName ?? '-'}</span>
				<span class="stat-label">Periode Aktif</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-classes">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalClassesAcrossAll ?? 0} Kelas</span>
				<span class="stat-label">Total Kelas Berjalan</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-students">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalStudentsAcrossAll ?? 0} Siswa</span>
				<span class="stat-label">Total Siswa Aktif</span>
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
				placeholder="Cari nama tahun ajaran (contoh: 2026/2027)…"
				bind:value={searchQuery}
				clearable
			/>
		{/snippet}

		{#snippet filters()}
			<CustomSelect
				name="statusFilter"
				bind:value={statusFilter}
				options={[
					{ value: 'semua', label: 'Semua Status' },
					{ value: 'aktif', label: 'Hanya Aktif' },
					{ value: 'nonaktif', label: 'Hanya Non-aktif' }
				]}
			/>

			<CustomSelect
				name="sortOption"
				bind:value={sortOption}
				options={[
					{ value: 'terbaru', label: 'Urutan: Terbaru' },
					{ value: 'terlama', label: 'Urutan: Terlama' },
					{ value: 'nama-asc', label: 'Urutan: Nama (A-Z)' }
				]}
			/>
		{/snippet}
	</FilterBar>

	<!-- ══════════════════════════════════════════════════════════
	     4. DATA TABLE / LIST VIEW
	     ══════════════════════════════════════════════════════════ -->
	<div class="card card-table">
		<div class="card-header-flex">
			<div>
				<h2 class="card-title">Daftar Periode Komunitas</h2>
				<p class="card-subtitle">
					Menampilkan {filteredItems.length} dari total {data.items?.length ?? 0} periode terdaftar.
				</p>
			</div>
		</div>

		{#if filteredItems.length > 0}
			<div class="table-responsive">
				<table class="data-table">
					<thead>
						<tr>
							<th>NAMA PERIODE</th>
							<th>RENTANG TANGGAL</th>
							<th>KELAS TERHUBUNG</th>
							<th>SISWA AKTIF</th>
							<th>STATUS AKTIFAKAN</th>
							<th class="text-right">AKSI</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredItems as ta}
							<tr class:row-active={ta.isActive}>
								<td>
									<div class="ta-name-cell">
										<span class="font-bold text-base">{ta.name}</span>
										{#if ta.isActive}
											<span class="badge badge-success">AKTIF SEKARANG</span>
										{/if}
									</div>
								</td>
								<td class="cell-period">
									{#if ta.startedAt || ta.endedAt}
										<span>{formatDateIndo(ta.startedAt)} — {formatDateIndo(ta.endedAt)}</span>
									{:else}
										<span class="text-muted italic">Periode belum diatur</span>
									{/if}
								</td>
								<td>
									<span class="count-pill count-pill-indigo">
										{ta.totalClasses} Kelas
									</span>
								</td>
								<td>
									<span class="count-pill count-pill-sky">
										{ta.totalStudents} Siswa
									</span>
								</td>
								<td>
									{#if ta.isActive}
										<span class="status-pill status-pill--active">
											<svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>
											<span>Aktif</span>
										</span>
									{:else if ta.dateStatus === 'belum_mulai'}
										<span class="status-pill status-pill--pending" title="Akan aktif secara otomatis saat tanggal mulai tiba">
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
											<span>Belum Mulai</span>
										</span>
									{:else if ta.dateStatus === 'selesai'}
										<span class="status-pill status-pill--expired">
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
											<span>Selesai</span>
										</span>
									{:else}
										<button
											type="button"
											class="btn-set-active"
											onclick={() => openSetActiveModal(ta)}
											title="Setel sebagai Tahun Ajaran Aktif"
										>
											Setel Aktif
										</button>
									{/if}
								</td>
								<td class="text-right">
									<div class="actions-flex">
										<button
											type="button"
											class="action-btn action-btn--edit"
											onclick={() => openEditDrawer(ta)}
											title="Edit Data Tahun Ajaran"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
											</svg>
										</button>

										<button
											type="button"
											class="action-btn action-btn--delete"
											onclick={() => openDeleteModal(ta)}
											title="Hapus Tahun Ajaran"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3 6 5 6 21 6"/>
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-state-box">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
					<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
				<h3 class="empty-title">Tidak Ada Tahun Ajaran</h3>
				<p class="empty-desc">
					{searchQuery ? `Tidak ada hasil pencarian untuk "${searchQuery}".` : 'Belum ada data tahun ajaran terdaftar. Klik tombol Tambah untuk membuat periode baru.'}
				</p>
			</div>
		{/if}
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     5. FORM DRAWER (CREATE / EDIT)
	     ══════════════════════════════════════════════════════════ -->
	<FormDrawer
		bind:open={isFormDrawerOpen}
		title={editingTa ? 'Edit Periode' : 'Tambah Periode Baru'}
		subtitle={editingTa ? `Perbarui informasi periode ${editingTa.name}` : 'Buat periode komunitas baru untuk Nesaga Learning Community.'}
		size="lg"
		onclose={closeFormDrawer}
	>
		{#snippet children()}
			<form
				id="ta-drawer-form"
				action={editingTa ? '?/update' : '?/create'}
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeFormDrawer();
						}
					};
				}}
				class="drawer-form-layout"
			>
				{#if editingTa}
					<input type="hidden" name="id" value={editingTa.id} />
				{/if}

				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">Informasi Periode Komunitas</h4>
							<p class="drawer-card__desc">Nama dan rentang tanggal berjalannya tahun ajaran</p>
						</div>
					</div>
					<div class="drawer-card__body">
						<!-- Auto-format & Stepper Input Row -->
						<div class="name-stepper-wrap">
							<div class="flex-1">
								<TextInput
									name="name"
									label="Nama Periode"
									required
									bind:value={formName}
									placeholder="Contoh: 2026/2027"
									hint="Ketik 4 angka (misal 2026) -> otomatis 2026/2027"
								/>
							</div>
							<div class="stepper-actions-col">
								<span class="stepper-label">Tahun</span>
								<div class="stepper-btn-group">
									<button
										type="button"
										class="stepper-btn"
										onclick={decrementYear}
										title="Kurangi 1 Tahun"
									>
										&minus;
									</button>
									<button
										type="button"
										class="stepper-btn"
										onclick={incrementYear}
										title="Tambah 1 Tahun"
									>
										&#43;
									</button>
								</div>
							</div>
						</div>

						<!-- Quick Year Presets Chips -->
						<div class="quick-presets-box">
							<span class="presets-title">Pilihan Cepat Tahun (Dinamis):</span>
							<div class="presets-chips-row">
								{#each [baseYear - 1, baseYear, baseYear + 1, baseYear + 2] as yr}
									{@const presetName = `${yr}/${yr + 1}`}
									<button
										type="button"
										class="preset-chip-btn"
										class:preset-chip-btn--active={formName === presetName}
										onclick={() => setYearPreset(yr)}
									>
										{presetName} {yr === realCurrentYear ? '(Tahun Ini)' : ''}
									</button>
								{/each}
							</div>
						</div>

						<!-- Smart Date Range Templates -->
						<div class="date-template-card">
							<div class="date-template-header">
								<span class="template-icon">⚡</span>
								<span class="template-title">Template Tanggal Otomatis</span>
							</div>
							<div class="date-template-chips">
								<button
									type="button"
									class="template-chip"
									onclick={() => applyDateTemplate('full')}
									title="Setel 15 Juli ke 30 Juni tahun berikutnya"
								>
									📅 Satu Tahun Penuh (Juli – Juni)
								</button>

								<button
									type="button"
									class="template-chip"
									onclick={() => applyDateTemplate('ganjil')}
									title="Setel 15 Juli ke 31 Desember"
								>
									📘 Sem. Ganjil (Juli – Des)
								</button>

								<button
									type="button"
									class="template-chip"
									onclick={() => applyDateTemplate('genap')}
									title="Setel 5 Januari ke 30 Juni tahun berikutnya"
								>
									📙 Sem. Genap (Jan – Juni)
								</button>
							</div>
						</div>

						<!-- Date Pickers Row -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
							<DatePicker
								name="startedAt"
								label="Tanggal Mulai (Opsional)"
								bind:value={formStartedAt}
								placeholder="Pilih tanggal mulai…"
							/>

							<DatePicker
								name="endedAt"
								label="Tanggal Selesai (Opsional)"
								bind:value={formEndedAt}
								placeholder="Pilih tanggal selesai…"
							/>
						</div>

						<div class="pt-2">
							<ToggleSwitch
								name="isActive"
								label="Setel Sebagai Tahun Ajaran Aktif"
								description="Jika diaktifkan, tahun ajaran aktif saat ini akan dinonaktifkan secara otomatis."
								bind:checked={formIsActive}
								onLabel="Aktif"
								offLabel="Non-aktif"
							/>
						</div>
					</div>
				</div>
			</form>
		{/snippet}

		{#snippet footer()}
			<div class="flex items-center justify-end gap-3 w-full">
				<button type="button" onclick={closeFormDrawer} class="btn-secondary-sm px-4 py-2">
					Batal
				</button>
				<button
					type="button"
					onclick={() => {
						const formEl = document.getElementById('ta-drawer-form') as HTMLFormElement;
						if (formEl) formEl.requestSubmit();
					}}
					class="btn-primary-sm px-5 py-2"
				>
					{editingTa ? 'Simpan Perubahan' : 'Tambah Tahun Ajaran'}
				</button>
			</div>
		{/snippet}
	</FormDrawer>

	<!-- ══════════════════════════════════════════════════════════
	     6. CONFIRM MODALS
	     ══════════════════════════════════════════════════════════ -->
	<!-- Set Active Confirmation Modal -->
	{#if isSetActiveModalOpen && targetActiveTa}
		<ConfirmModal
			bind:open={isSetActiveModalOpen}
			title={`Aktifkan Tahun Ajaran: ${targetActiveTa.name}?`}
			message={`Mengaktifkan periode ${targetActiveTa.name} akan menonaktifkan tahun ajaran aktif yang sedang berjalan. Apakah Anda yakin ingin melanjutkan?`}
			confirmText="Ya, Setel Sebagai Aktif"
			cancelText="Batal"
			variant="warning"
			oncancel={closeSetActiveModal}
			onconfirm={() => {
				const formEl = document.getElementById(`set-active-form-${targetActiveTa.id}`) as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				closeSetActiveModal();
			}}
		/>

		<form
			id={`set-active-form-${targetActiveTa.id}`}
			action="?/setActive"
			method="POST"
			use:enhance
			class="hidden"
		>
			<input type="hidden" name="id" value={targetActiveTa.id} />
		</form>
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if isDeleteModalOpen && targetDeleteTa}
		<ConfirmModal
			bind:open={isDeleteModalOpen}
			title={`Hapus Tahun Ajaran: ${targetDeleteTa.name}?`}
			message={`Apakah Anda yakin ingin menghapus data tahun ajaran ${targetDeleteTa.name}? Tindakan ini tidak dapat dibatalkan.`}
			confirmText="Hapus Permanen"
			cancelText="Batal"
			variant="danger"
			oncancel={closeDeleteModal}
			onconfirm={() => {
				const formEl = document.getElementById(`delete-form-${targetDeleteTa.id}`) as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				closeDeleteModal();
			}}
		/>

		<form
			id={`delete-form-${targetDeleteTa.id}`}
			action="?/delete"
			method="POST"
			use:enhance
			class="hidden"
		>
			<input type="hidden" name="id" value={targetDeleteTa.id} />
		</form>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     7. PROMOTION PREVIEW FORM DRAWER
	     ══════════════════════════════════════════════════════════ -->
	<FormDrawer
		bind:open={isPromotionPreviewOpen}
		title="Preview Kenaikan Kelas (Rombel) Massal"
		subtitle="Tinjau pemetaan kenaikan label kelas seluruh siswa sebelum diproses secara permanen."
		size="xl"
		onclose={() => (isPromotionPreviewOpen = false)}
	>
		{#snippet children()}
			<div class="drawer-preview-content py-1">
				{#if data.promotionPreview?.canPromote === false}
					<div class="drawer-preview-banner p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 text-xs flex items-start gap-3 shadow-xs mb-6">
						<div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
								<line x1="12" y1="9" x2="12" y2="13"/>
								<line x1="12" y1="17" x2="12.01" y2="17"/>
							</svg>
						</div>
						<div class="flex-1 min-w-0 pt-0.5">
							<h5 class="font-bold text-amber-950 text-xs uppercase tracking-wider mb-1">
								Kenaikan Kelas Dikunci (Kriteria Rentang Waktu Periode)
							</h5>
							<p class="text-amber-800 leading-relaxed font-medium">
								{data.promotionPreview.timeframeNotice}
							</p>
						</div>
					</div>
				{/if}

				<!-- Section 1: Stat Cards -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div class="stat-card">
						<div class="stat-icon-box icon-ta">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
							</svg>
						</div>
						<div class="stat-info">
							<span class="stat-value">{data.promotionPreview?.summary.totalStudents ?? 0}</span>
							<span class="stat-label">Total Evaluasi</span>
						</div>
					</div>

					<div class="stat-card">
						<div class="stat-icon-box icon-active">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/>
							</svg>
						</div>
						<div class="stat-info">
							<span class="stat-value">{data.promotionPreview?.summary.willPromoteCount ?? 0}</span>
							<span class="stat-label">Naik Tingkat</span>
						</div>
					</div>

					<div class="stat-card">
						<div class="stat-icon-box icon-classes">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
							</svg>
						</div>
						<div class="stat-info">
							<span class="stat-value">{data.promotionPreview?.summary.willGraduateCount ?? 0}</span>
							<span class="stat-label">Lulus Alumni</span>
						</div>
					</div>

					<div class="stat-card">
						<div class="stat-icon-box icon-students">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
							</svg>
						</div>
						<div class="stat-info">
							<span class="stat-value">{data.promotionPreview?.summary.unchangedCount ?? 0}</span>
							<span class="stat-label">Tetap / Manual</span>
						</div>
					</div>
				</div>

				<!-- Section 2: Standard FilterBar with TextInput & CustomSelect -->
				<div class="mb-6">
					<FilterBar>
						{#snippet search()}
							<TextInput
								name="previewSearch"
								placeholder="Cari nama siswa, angkatan, atau rombel…"
								bind:value={previewSearchQuery}
								clearable
							/>
						{/snippet}

						{#snippet filters()}
							<CustomSelect
								name="previewFilterStatus"
								bind:value={previewFilterStatus}
								options={[
									{ value: 'all', label: `Semua (${data.promotionPreview?.summary.totalStudents ?? 0})` },
									{ value: 'promote', label: `Naik Kelas (${data.promotionPreview?.summary.willPromoteCount ?? 0})` },
									{ value: 'graduate', label: `Lulus Alumni (${data.promotionPreview?.summary.willGraduateCount ?? 0})` },
									{ value: 'unchanged', label: `Tetap (${data.promotionPreview?.summary.unchangedCount ?? 0})` }
								]}
							/>
						{/snippet}
					</FilterBar>
				</div>

				<!-- Section 3: Standard Data Table (.card-table & .data-table) -->
				<div class="card card-table overflow-hidden">
					<div class="table-responsive max-h-[460px] overflow-y-auto">
						<table class="data-table">
							<thead class="sticky top-0 z-10 bg-slate-100">
								<tr>
									<th>NAMA SISWA</th>
									<th>ANGKATAN</th>
									<th>ROMBEL SAAT INI</th>
									<th class="text-center"></th>
									<th>ROMBEL PROYEKSI BARU</th>
									<th class="text-right">STATUS</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredPreviewItems as item}
									<tr>
										<td>
											<div class="font-bold text-slate-800">{item.fullName}</div>
											<div class="text-xs text-slate-400 font-mono">@{item.username}</div>
										</td>
										<td>
											<span class="badge badge-neutral">
												{item.angkatan ? `Angkatan ${item.angkatan}` : '-'}
											</span>
										</td>
										<td>
											<span class="font-semibold text-slate-700">{item.currentRombel || '-'}</span>
										</td>
										<td class="text-center text-slate-400">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mx-auto">
												<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
											</svg>
										</td>
										<td>
											<span class="font-bold text-slate-900">{item.nextRombel}</span>
										</td>
										<td class="text-right">
											{#if item.status === 'promote'}
												<span class="badge badge-success">NAIK KELAS</span>
											{:else if item.status === 'graduate'}
												<span class="badge badge-primary">LULUS ALUMNI</span>
											{:else}
												<span class="badge badge-neutral">TETAP</span>
											{/if}
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="6" class="text-center text-slate-400 py-8 italic">
											Tidak ditemukan siswa yang cocok dengan kriteria pencarian.
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/snippet}

		{#snippet footer()}
			<div class="flex items-center justify-between gap-3 w-full">
				<button
					type="button"
					class="btn-secondary-action"
					onclick={() => (isPromotionPreviewOpen = false)}
				>
					Batal
				</button>

				<form
					method="POST"
					action="?/bulkPromote"
					use:enhance={() => {
						isSubmittingPromotion = true;
						return async ({ result, update }) => {
							isSubmittingPromotion = false;
							await update();
							if (result.type === 'success') {
								isPromotionPreviewOpen = false;
							}
						};
					}}
				>
					<button
						type="submit"
						disabled={isSubmittingPromotion || data.promotionPreview?.canPromote === false || (data.promotionPreview?.summary.willPromoteCount === 0 && data.promotionPreview?.summary.willGraduateCount === 0)}
						class="btn-primary-action"
					>
						{#if isSubmittingPromotion}
							<span>Memproses...</span>
						{:else}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
							<span>Konfirmasi & Eksekusi Kenaikan Kelas</span>
						{/if}
					</button>
				</form>
			</div>
		{/snippet}
	</FormDrawer>
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

	@media (max-width: 640px) {
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
		flex-wrap: nowrap;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.hero-actions-group {
			width: 100%;
			flex-wrap: wrap;
			gap: 8px;
		}
	}

	.btn-primary-action,
	.btn-secondary-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
		box-sizing: border-box;
	}

	.btn-primary-action {
		background: var(--primary);
		color: #ffffff;
		border: 1px solid transparent;
	}

	.btn-primary-action:hover {
		background: var(--primary-hover, #4338ca);
	}

	.btn-secondary-action {
		background: #ffffff;
		color: #334155;
		border: 1px solid var(--border-hard, #cbd5e1);
	}

	.btn-secondary-action:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #94a3b8;
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

	.icon-ta { background: #e0e7ff; color: #4f46e5; }
	.icon-active { background: #dcfce7; color: #166534; }
	.icon-classes { background: #e0f2fe; color: #0369a1; }
	.icon-students { background: #fef9c3; color: #a16207; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.25rem;
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

	/* Card & Data Table */
	.card-table {
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
		margin-bottom: 16px;
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
		margin-top: 4px;
	}

	.table-responsive {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table {
		width: 100%;
		min-width: 680px;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 13px;
	}

	.data-table th {
		background: var(--bg-inset, #f8fafc);
		padding: 12px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-align: left;
		border-bottom: 1.5px solid var(--border-hard);
		letter-spacing: 0.03em;
	}

	.data-table td {
		padding: 14px;
		border-bottom: 1px solid var(--border-light, #f1f5f9);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.data-table tr:hover td {
		background: #f8fafc;
	}

	.row-active td {
		background: #f0fdf4 !important;
	}

	.ta-name-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cell-period {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.count-pill {
		display: inline-flex;
		align-items: center;
		padding: 3px 9px;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-weight: 700;
	}

	.count-pill-indigo {
		background: #e0e7ff;
		color: #3730a3;
		border: 1px solid #c7d2fe;
	}

	.count-pill-sky {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
	}

	.status-pill--active {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #86efac;
	}

	.status-pill--pending {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
	}

	.status-pill--expired {
		background: #f1f5f9;
		color: #64748b;
		border: 1px solid #cbd5e1;
	}

	.btn-set-active {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.btn-set-active:hover {
		background: #fde68a;
		color: #78350f;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 26px;
		padding: 0 10px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		line-height: 1;
		border-radius: 9999px;
		white-space: nowrap;
		box-sizing: border-box;
	}

	.badge-primary {
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
	}

	.badge-success {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.badge-warning {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
	}

	.badge-neutral {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
	}

	.badge-danger {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.badge-info {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	.text-right { text-align: right; }

	.actions-flex {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.action-btn--edit:hover {
		background: #e0e7ff;
		color: #4338ca;
		border-color: #c7d2fe;
	}

	.action-btn--delete:hover {
		background: #fee2e2;
		color: #dc2626;
		border-color: #fca5a5;
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

	/* Drawer Form Layout */
	.drawer-form-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Crucial fix: overflow: visible so DatePicker popovers overflow cleanly */
	.drawer-card {
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 10px);
		background: #ffffff;
		overflow: visible;
	}

	.drawer-card__header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: var(--bg-inset, #f8fafc);
		border-bottom: 1px solid var(--border-hard);
		border-top-left-radius: var(--radius-md, 10px);
		border-top-right-radius: var(--radius-md, 10px);
	}

	.drawer-card__icon {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.drawer-card__title {
		font-family: var(--font-macro);
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.drawer-card__desc {
		font-size: 11.5px;
		color: var(--text-muted);
		margin: 0;
	}

	.drawer-card__body {
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		overflow: visible;
	}

	/* Stepper & Preset Controls */
	.name-stepper-wrap {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.stepper-actions-col {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.stepper-label {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stepper-btn-group {
		display: flex;
		align-items: center;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		background: var(--bg-inset);
		height: 42px;
	}

	.stepper-btn {
		width: 38px;
		height: 100%;
		border: none;
		background: transparent;
		font-family: var(--font-macro);
		font-size: 18px;
		font-weight: 800;
		color: var(--text-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 120ms ease, color 120ms ease;
	}

	.stepper-btn:hover {
		background: var(--primary-light);
		color: var(--primary);
	}

	.stepper-btn:first-child {
		border-right: 1px solid var(--border-hard);
	}

	/* Quick Presets Box */
	.quick-presets-box {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
	}

	.presets-title {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.presets-chips-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.preset-chip-btn {
		padding: 4px 10px;
		border-radius: 9999px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.preset-chip-btn:hover {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	.preset-chip-btn--active {
		background: var(--primary) !important;
		color: #ffffff !important;
		border-color: var(--primary) !important;
	}

	/* Smart Date Template Card */
	.date-template-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: var(--radius-md, 8px);
	}

	.date-template-header {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.template-icon { font-size: 14px; }

	.template-title {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
		color: #0369a1;
	}

	.date-template-chips {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.template-chip {
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid #7dd3fc;
		background: #ffffff;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #0284c7;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.template-chip:hover {
		background: #0284c7;
		color: #ffffff;
		border-color: #0284c7;
	}

	.btn-secondary-sm {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		color: var(--text-secondary);
		border-radius: var(--radius-md, 6px);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.btn-secondary-sm:hover {
		background: var(--bg-inset);
		color: var(--text-primary);
	}

	.btn-primary-sm {
		background: var(--primary);
		border: 1px solid transparent;
		color: #ffffff;
		border-radius: var(--radius-md, 6px);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: all 120ms ease;
	}

	.btn-primary-sm:hover {
		background: var(--primary-hover, #4338ca);
	}
</style>

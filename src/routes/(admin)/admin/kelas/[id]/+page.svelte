<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// Search queries
	let memberSearch = $state('');
	let availableSearch = $state('');

	// Checkbox selection states
	let selectedMemberUserIds = $state<number[]>([]);
	let selectedAddUserIds = $state<number[]>([]);

	// Confirm Modal states
	let isRemoveModalOpen = $state(false);

	// Sync toast notification
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message);
			selectedMemberUserIds = [];
			selectedAddUserIds = [];
		} else if (form?.message && !form?.success) {
			toast.error(form.message);
		}
	});

	// Filtered Current / Historical Members
	let filteredMembers = $derived.by(() => {
		let list = [...(data.members || [])];
		if (memberSearch.trim() !== '') {
			const term = memberSearch.toLowerCase().trim();
			list = list.filter(
				(m) =>
					m.fullName.toLowerCase().includes(term) ||
					m.username.toLowerCase().includes(term) ||
					(m.nisn && m.nisn.includes(term))
			);
		}
		return list;
	});

	// Filtered Available Students (Unassigned)
	let filteredAvailableStudents = $derived.by(() => {
		let list = [...(data.availableStudents || [])];
		if (availableSearch.trim() !== '') {
			const term = availableSearch.toLowerCase().trim();
			list = list.filter(
				(s) =>
					s.fullName.toLowerCase().includes(term) ||
					s.username.toLowerCase().includes(term) ||
					(s.nisn && s.nisn.includes(term))
			);
		}
		return list;
	});

	// Member selection helpers
	let isAllMembersSelected = $derived(
		filteredMembers.length > 0 && filteredMembers.every((m) => selectedMemberUserIds.includes(m.id))
	);

	function toggleSelectAllMembers() {
		if (isAllMembersSelected) {
			selectedMemberUserIds = [];
		} else {
			selectedMemberUserIds = filteredMembers.map((m) => m.id);
		}
	}

	function toggleSelectMember(id: number) {
		if (selectedMemberUserIds.includes(id)) {
			selectedMemberUserIds = selectedMemberUserIds.filter((uId) => uId !== id);
		} else {
			selectedMemberUserIds = [...selectedMemberUserIds, id];
		}
	}

	// Add selection helpers
	let isAllAvailableSelected = $derived(
		filteredAvailableStudents.length > 0 &&
			filteredAvailableStudents.every((s) => selectedAddUserIds.includes(s.id))
	);

	function toggleSelectAllAvailable() {
		if (isAllAvailableSelected) {
			selectedAddUserIds = [];
		} else {
			selectedAddUserIds = filteredAvailableStudents.map((s) => s.id);
		}
	}

	function toggleSelectAvailable(id: number) {
		if (selectedAddUserIds.includes(id)) {
			selectedAddUserIds = selectedAddUserIds.filter((uId) => uId !== id);
		} else {
			selectedAddUserIds = [...selectedAddUserIds, id];
		}
	}
</script>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     1. HEADER / HERO BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<a href="/admin/kelas" class="btn-back">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
			</svg>
			<span>Kembali ke Master Data Kelas</span>
		</a>

		<div class="hero-content-row mt-3">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Kelola Anggota: {data.kelas.name}</h1>
					<span class="badge badge-primary">
						{data.members?.length ?? 0} Siswa Terdaftar
					</span>
					{#if data.kelas.isActive}
						<span class="badge badge-success">Kelas Aktif</span>
					{:else}
						<span class="badge badge-warning">Terarsip (Read-Only)</span>
					{/if}
				</div>
				<p class="hero-subtitle">
					{data.kelas.tahunAjaranName} • Tingkat {data.kelas.tingkatName} • Track Pembelajaran: {data.kelas.curriculumTrackTitle}
				</p>
			</div>
		</div>
	</header>

	<!-- Read-Only Banner for Archived Classes -->
	{#if !data.kelas.isActive}
		<div class="archive-banner">
			<div class="archive-banner__icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
				</svg>
			</div>
			<div>
				<h4 class="archive-banner__title">Rombel Kelas Berstatus Terarsip / Non-aktif (Read-Only)</h4>
				<p class="archive-banner__desc">
					Rombel kelas ini telah dinonaktifkan/selesai setelah proses kenaikan kelas. Seluruh daftar siswa dan riwayat kelulusan di bawah ini tersimpan secara permanen untuk arsip rekam jejak akademis.
				</p>
			</div>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     2. MAIN DUAL-COLUMN / SINGLE-COLUMN PANELS
	     ══════════════════════════════════════════════════════════ -->
	<div class="split-grid" class:split-grid--single={!data.kelas.isActive}>
		<!-- COLUMN 1: ANGGOTA & RIWAYAT KELAS -->
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">
						{data.kelas.isActive ? '1. Anggota Kelas Saat Ini' : 'Riwayat Siswa Anggota Kelas'} ({filteredMembers.length})
					</h2>
					<p class="card-subtitle">
						{data.kelas.isActive ? `Siswa yang terdaftar secara aktif di rombel ${data.kelas.name}` : `Daftar historis seluruh siswa yang pernah terdaftar di rombel ${data.kelas.name}`}
					</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="memberSearch"
					placeholder="Cari riwayat siswa (Nama / NISN / Username)…"
					bind:value={memberSearch}
					clearable
				/>
			</div>

			{#if data.kelas.isActive && selectedMemberUserIds.length > 0}
				<div class="bulk-action-bar">
					<span class="bulk-select-count">
						{selectedMemberUserIds.length} Siswa Terpilih
					</span>
					<button
						type="button"
						onclick={() => (isRemoveModalOpen = true)}
						class="btn-danger-action"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
						</svg>
						<span>Keluarkan ({selectedMemberUserIds.length}) Siswa</span>
					</button>
				</div>
			{/if}

			{#if filteredMembers.length > 0}
				<div class="table-responsive">
					<table class="data-table text-xs">
						<thead>
							<tr>
								{#if data.kelas.isActive}
									<th class="w-8 text-center">
										<input
											type="checkbox"
											checked={isAllMembersSelected}
											onchange={toggleSelectAllMembers}
											class="checkbox-input"
										/>
									</th>
								{/if}
								<th>NAMA SISWA</th>
								<th>USERNAME / NISN</th>
								<th>STATUS RIWAYAT</th>
								{#if data.kelas.isActive}
									<th class="text-right">AKSI</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each filteredMembers as m}
								{@const isSelected = selectedMemberUserIds.includes(m.id)}
								<tr class:row-selected={isSelected}>
									{#if data.kelas.isActive}
										<td class="text-center">
											<input
												type="checkbox"
												checked={isSelected}
												onchange={() => toggleSelectMember(m.id)}
												class="checkbox-input"
											/>
										</td>
									{/if}
									<td>
										<span class="font-bold text-slate-900 text-sm block">{m.fullName}</span>
									</td>
									<td>
										<div class="flex flex-col gap-0.5">
											<span class="font-bold text-slate-800">@{m.username}</span>
											<span class="text-slate-500">{m.nisn ? `NISN: ${m.nisn}` : 'Tanpa NISN'}</span>
										</div>
									</td>
									<td>
										{#if m.status === 'naik'}
											<span class="badge badge-success">Naik Kelas</span>
										{:else if m.status === 'tinggal'}
											<span class="badge badge-warning">Tinggal Kelas</span>
										{:else if m.status === 'keluar'}
											<span class="badge badge-neutral text-rose-700 bg-rose-50 border-rose-200">Keluar / Lulus</span>
										{:else}
											<span class="badge badge-primary">Aktif di Kelas</span>
										{/if}
									</td>
									{#if data.kelas.isActive}
										<td class="text-right">
											<form
												action="?/bulkRemoveMembers"
												method="POST"
												use:enhance
											>
												<input type="hidden" name="userIdsJson" value={JSON.stringify([m.id])} />
												<button
													type="submit"
													class="btn-row-danger"
													title="Keluarkan dari kelas"
												>
													<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
														<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
													</svg>
													<span>Keluarkan</span>
												</button>
											</form>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="empty-state-box py-10">
					<p class="text-xs text-slate-500 italic">
						{memberSearch ? `Tidak ada anggota cocok dengan kata kunci "${memberSearch}".` : 'Belum ada siswa terdaftar di kelas ini.'}
					</p>
				</div>
			{/if}
		</section>

		<!-- COLUMN 2: TAMBAH SISWA (HANYA DITAMPILKAN JIKA KELAS AKTIF) -->
		{#if data.kelas.isActive}
			<section class="card card-table">
				<div class="card-header-flex">
					<div>
						<h2 class="card-title">2. Tambahkan Siswa (Belum Punya Kelas)</h2>
						<p class="card-subtitle">Daftar siswa di sekolah yang belum memiliki kelas aktif (Unassigned)</p>
					</div>
				</div>

				<div class="mb-4">
					<TextInput
						name="availableSearch"
						placeholder="Cari siswa unassigned (Nama / NISN / Username)…"
						bind:value={availableSearch}
						clearable
					/>
				</div>

				<form
					action="?/bulkAddMembers"
					method="POST"
					use:enhance
					class="flex flex-col gap-3"
				>
					<input type="hidden" name="userIdsJson" value={JSON.stringify(selectedAddUserIds)} />

					<div class="bulk-add-banner">
						<span class="bulk-add-count">
							{selectedAddUserIds.length} Siswa Terpilih
						</span>
						<button
							type="submit"
							disabled={selectedAddUserIds.length === 0}
							class="btn-primary-action"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							<span>Daftarkan {selectedAddUserIds.length} Siswa</span>
						</button>
					</div>

					{#if filteredAvailableStudents.length > 0}
						<div class="table-responsive max-h-[460px] overflow-y-auto">
							<table class="data-table text-xs">
								<thead>
									<tr>
										<th class="w-8 text-center">
											<input
												type="checkbox"
												checked={isAllAvailableSelected}
												onchange={toggleSelectAllAvailable}
												class="checkbox-input"
											/>
										</th>
										<th>NAMA SISWA</th>
										<th>USERNAME / NISN</th>
										<th>STATUS</th>
									</tr>
								</thead>
								<tbody>
									{#each filteredAvailableStudents as s}
										{@const isSelected = selectedAddUserIds.includes(s.id)}
										<tr class:row-selected={isSelected}>
											<td class="text-center">
												<input
													type="checkbox"
													checked={isSelected}
													onchange={() => toggleSelectAvailable(s.id)}
													class="checkbox-input"
												/>
											</td>
											<td>
												<span class="font-bold text-slate-900 text-sm block">{s.fullName}</span>
											</td>
											<td>
												<div class="flex flex-col gap-0.5">
													<span class="font-bold text-slate-800">@{s.username}</span>
													<span class="text-slate-500">{s.nisn ? `NISN: ${s.nisn}` : 'Tanpa NISN'}</span>
												</div>
											</td>
											<td>
												<span class="badge badge-neutral text-[10px] text-slate-500">
													Unassigned
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="empty-state-box py-10">
							<p class="text-xs text-slate-500 italic">
								{availableSearch ? `Tidak ada siswa cocok dengan kata kunci "${availableSearch}".` : 'Semua siswa terdaftar di sekolah sudah memiliki kelas aktif.'}
							</p>
						</div>
					{/if}
				</form>
			</section>
		{/if}
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     3. CONFIRM MODAL (BULK REMOVE MEMBERS)
	     ══════════════════════════════════════════════════════════ -->
	{#if isRemoveModalOpen}
		<ConfirmModal
			bind:open={isRemoveModalOpen}
			title={`Keluarkan ${selectedMemberUserIds.length} Siswa dari ${data.kelas.name}?`}
			message={`Apakah Anda yakin ingin mengeluarkan ${selectedMemberUserIds.length} siswa terpilih dari kelas ${data.kelas.name}? Status siswa akan kembali menjadi unassigned.`}
			confirmText="Keluarkan Siswa"
			cancelText="Batal"
			variant="danger"
			oncancel={() => (isRemoveModalOpen = false)}
			onconfirm={() => {
				const formEl = document.getElementById('bulk-remove-form') as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				isRemoveModalOpen = false;
			}}
		/>

		<form
			id="bulk-remove-form"
			action="?/bulkRemoveMembers"
			method="POST"
			use:enhance
			class="hidden"
		>
			<input type="hidden" name="userIdsJson" value={JSON.stringify(selectedMemberUserIds)} />
		</form>
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

	.btn-back {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: #ffffff;
		color: var(--primary, #4f46e5);
		border: 1.5px solid #c7d2fe;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-back:hover {
		background: #e0e7ff;
		border-color: #818cf8;
		color: var(--primary-hover, #4338ca);
	}

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

	/* Archive Banner */
	.archive-banner {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 16px 20px;
		background: #fffbeb;
		border: 1.5px solid #fde68a;
		border-radius: var(--radius-md, 10px);
		box-shadow: var(--shadow-sm);
	}

	.archive-banner__icon {
		width: 38px;
		height: 38px;
		border-radius: 8px;
		background: #fef3c7;
		color: #b45309;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.archive-banner__title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: #92400e;
		margin: 0 0 2px;
	}

	.archive-banner__desc {
		font-size: 12.5px;
		color: #b45309;
		margin: 0;
		line-height: 1.45;
	}

	/* Split Grid Layout */
	.split-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
	}

	.split-grid--single {
		grid-template-columns: 1fr;
	}

	@media (max-width: 900px) {
		.split-grid {
			grid-template-columns: 1fr;
		}
	}

	.card-table {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		box-shadow: var(--shadow-sm);
	}

	.card-header-flex {
		margin-bottom: 14px;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.card-subtitle {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	/* Bulk Action Banners */
	.bulk-action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #fff1f2;
		border: 1px solid #fecdd3;
		border-radius: var(--radius-md, 8px);
		margin-bottom: 12px;
	}

	.bulk-select-count {
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		color: #9f1239;
	}

	.bulk-add-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		border-radius: var(--radius-md, 8px);
	}

	.bulk-add-count {
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		color: #3730a3;
	}

	/* Standardized Action Buttons */
	.btn-primary-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 38px;
		padding: 0 18px;
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border: 1px solid transparent;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		transition: all 150ms ease;
	}

	.btn-primary-action:hover:not(:disabled) {
		background: var(--primary-hover, #4338ca);
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
	}

	.btn-primary-action:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}

	.btn-danger-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		background: #ffffff;
		color: #dc2626;
		border: 1.5px solid #fca5a5;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.btn-danger-action:hover {
		background: #fee2e2;
		border-color: #f87171;
	}

	.btn-row-danger {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		background: #ffffff;
		color: #dc2626;
		border: 1px solid #fca5a5;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-row-danger:hover {
		background: #fee2e2;
		border-color: #f87171;
	}

	/* Table Styling */
	.table-responsive {
		width: 100%;
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.data-table th {
		background: var(--bg-inset, #f8fafc);
		padding: 10px 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-align: left;
		border-bottom: 1.5px solid var(--border-hard);
	}

	.data-table td {
		padding: 10px 12px;
		border-bottom: 1px solid var(--border-light, #f1f5f9);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.data-table tr:hover td {
		background: #f8fafc;
	}

	.row-selected td {
		background: #eef2ff !important;
	}

	.checkbox-input {
		width: 16px;
		height: 16px;
		accent-color: var(--primary);
		cursor: pointer;
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

	.empty-state-box {
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.text-center { text-align: center; }
	.text-right { text-align: right; }
</style>

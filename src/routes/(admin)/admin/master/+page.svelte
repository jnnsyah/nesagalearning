<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';

	let { data, form } = $props();

	// Tab selection state: 'rooms' | 'activities' | 'avatars' | 'badges' | 'angkatan' | 'rombel'
	let activeTab = $state<'rooms' | 'activities' | 'avatars' | 'badges' | 'angkatan' | 'rombel'>('angkatan');

	// Search queries per tab
	let roomSearch = $state('');
	let badgeSearch = $state('');
	let activitySearch = $state('');
	let angkatanSearch = $state('');
	let rombelSearch = $state('');

	// Drawer modal states
	let isRoomDrawerOpen = $state(false);
	let isEditRoomDrawerOpen = $state(false);
	let isActivityDrawerOpen = $state(false);
	let isEditActivityDrawerOpen = $state(false);
	let isAvatarDrawerOpen = $state(false);
	let isBadgeDrawerOpen = $state(false);
	let isEditBadgeDrawerOpen = $state(false);
	let isAngkatanDrawerOpen = $state(false);
	let isRombelDrawerOpen = $state(false);
	let isEditRombelDrawerOpen = $state(false);

	let newAngkatanYear = $state(new Date().getFullYear().toString());
	let newAngkatanName = $derived(newAngkatanYear ? `Angkatan ${newAngkatanYear.trim()}` : '');

	function incrementAngkatanYear() {
		const yr = parseInt(newAngkatanYear, 10) || new Date().getFullYear();
		newAngkatanYear = (yr + 1).toString();
	}

	function decrementAngkatanYear() {
		const yr = parseInt(newAngkatanYear, 10) || new Date().getFullYear();
		newAngkatanYear = (yr - 1).toString();
	}

	let newRombelName = $state('');
	let newRombelLevelOrder = $state('1');
	let newRombelNextId = $state('');

	let targetEditRombel = $state<{ id: number; name: string; levelOrder: number } | null>(null);
	let editRombelName = $state('');
	let editRombelLevelOrder = $state('1');

	function openEditRombelDrawer(r: { id: number; name: string; levelOrder: number }) {
		targetEditRombel = r;
		editRombelName = r.name;
		editRombelLevelOrder = r.levelOrder.toString();
		isEditRombelDrawerOpen = true;
	}

	// Form input states
	let targetEditRoom = $state<{ id: number; name: string; description: string | null } | null>(null);
	let roomName = $state('');
	let roomDescription = $state('');

	let targetEditActivity = $state<{ id: number; code: string; name: string; description: string | null } | null>(null);
	let activityCode = $state('');
	let activityName = $state('');
	let activityDescription = $state('');

	let avatarName = $state('');
	let avatarImageUrl = $state('');

	let targetEditBadge = $state<{ id: number; name: string; description: string | null; criteria: string | null; iconUrl: string | null; triggerType?: string; triggerThreshold?: number } | null>(null);
	let badgeName = $state('');
	let badgeDescription = $state('');
	let badgeCriteria = $state('');
	let badgeIconUrl = $state('');
	let badgeTriggerType = $state('manual_award');
	let badgeTriggerThreshold = $state('0');

	const badgeTriggerOptions = [
		{ value: 'manual_award', label: 'Pemberian Manual / Khusus' },
		{ value: 'streak_milestone', label: 'Otomatis: Milestone Streak (Hari)' },
		{ value: 'total_points', label: 'Otomatis: Total Akumulasi Poin' },
		{ value: 'attendance_count', label: 'Otomatis: Jumlah Kehadiran Presensi' },
		{ value: 'tasks_approved', label: 'Otomatis: Jumlah Tugas Approved' }
	];

	function getTriggerLabel(type: string | undefined, threshold: number | undefined) {
		const thresh = threshold || 0;
		switch (type) {
			case 'streak_milestone':
				return `Streak ${thresh} Hari`;
			case 'total_points':
				return `${thresh} Poin`;
			case 'attendance_count':
				return `${thresh}x Presensi`;
			case 'tasks_approved':
				return `${thresh} Tugas Approved`;
			default:
				return 'Manual';
		}
	}

	// Delete Modal states
	let isDeleteModalOpen = $state(false);
	let deleteTarget = $state<{ type: 'room' | 'avatar' | 'badge' | 'activity'; id: number; name: string } | null>(null);

	// Sync toast notifications
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message);
			closeDrawers();
		} else if (form?.message && !form?.success) {
			toast.error(form.message);
		}
	});

	function closeDrawers() {
		isAngkatanDrawerOpen = false;
		isRombelDrawerOpen = false;
		isEditRombelDrawerOpen = false;
		isRoomDrawerOpen = false;
		isEditRoomDrawerOpen = false;
		isActivityDrawerOpen = false;
		isEditActivityDrawerOpen = false;
		isAvatarDrawerOpen = false;
		isBadgeDrawerOpen = false;
		isEditBadgeDrawerOpen = false;
		targetEditRombel = null;
		targetEditRoom = null;
		targetEditActivity = null;
		targetEditBadge = null;
		newRombelName = '';
		editRombelName = '';
		roomName = '';
		roomDescription = '';
		activityCode = '';
		activityName = '';
		activityDescription = '';
		avatarName = '';
		avatarImageUrl = '';
		badgeName = '';
		badgeDescription = '';
		badgeCriteria = '';
		badgeIconUrl = '';
		badgeTriggerType = 'manual_award';
		badgeTriggerThreshold = '0';
	}

	function handleFormEnhance() {
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			await update();
			if (result.type === 'success') {
				closeDrawers();
			}
		};
	}

	function openEditRoomDrawer(r: any) {
		targetEditRoom = r;
		roomName = r.name;
		roomDescription = r.description || '';
		isEditRoomDrawerOpen = true;
	}

	function openEditActivityDrawer(act: any) {
		targetEditActivity = act;
		activityCode = act.code;
		activityName = act.name;
		activityDescription = act.description || '';
		isEditActivityDrawerOpen = true;
	}

	function openEditBadgeDrawer(b: any) {
		targetEditBadge = b;
		badgeName = b.name;
		badgeDescription = b.description || '';
		badgeCriteria = b.criteria || '';
		badgeIconUrl = b.iconUrl || '';
		badgeTriggerType = b.triggerType || 'manual_award';
		badgeTriggerThreshold = String(b.triggerThreshold || 0);
		isEditBadgeDrawerOpen = true;
	}

	function confirmDelete(type: 'room' | 'avatar' | 'badge' | 'activity', id: number, name: string) {
		deleteTarget = { type, id, name };
		isDeleteModalOpen = true;
	}

	// Filtered lists
	let filteredRooms = $derived.by(() => {
		let list = [...(data.rooms || [])];
		if (roomSearch.trim() !== '') {
			const term = roomSearch.toLowerCase().trim();
			list = list.filter((r) => r.name.toLowerCase().includes(term) || (r.description && r.description.toLowerCase().includes(term)));
		}
		return list;
	});

	let filteredActivities = $derived.by(() => {
		let list = [...(data.activityTypes || [])];
		if (activitySearch.trim() !== '') {
			const term = activitySearch.toLowerCase().trim();
			list = list.filter((a) => a.name.toLowerCase().includes(term) || a.code.toLowerCase().includes(term) || (a.description && a.description.toLowerCase().includes(term)));
		}
		return list;
	});

	let filteredBadges = $derived.by(() => {
		let list = [...(data.badges || [])];
		if (badgeSearch.trim() !== '') {
			const term = badgeSearch.toLowerCase().trim();
			list = list.filter((b) => b.name.toLowerCase().includes(term) || (b.description && b.description.toLowerCase().includes(term)));
		}
		return list;
	});

	let filteredAngkatan = $derived.by(() => {
		let list = [...(data.angkatanList || [])];
		if (angkatanSearch.trim() !== '') {
			const term = angkatanSearch.toLowerCase().trim();
			list = list.filter((a) => a.name.toLowerCase().includes(term) || a.year.toString().includes(term));
		}
		return list;
	});

	let filteredRombel = $derived.by(() => {
		let list = [...(data.rombelList || [])];
		if (rombelSearch.trim() !== '') {
			const term = rombelSearch.toLowerCase().trim();
			list = list.filter((r) => r.name.toLowerCase().includes(term) || r.levelOrder.toString().includes(term));
		}
		return list;
	});
</script>

<div class="page-container">
	<!-- ══════════════════════════════════════════════════════════
	     1. HERO HEADER BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="page-hero">
		<div class="hero-content-row">
			<div>
				<div class="hero-title-group">
					<h1 class="hero-title">Master Data Operasional</h1>
					<span class="badge badge-primary">
						{data.stats?.totalRooms ?? 0} Ruangan
					</span>
				</div>
				<p class="hero-subtitle">
					Kelola data master operasional sekolah: Ruangan Kelas, Tipe Aktivitas Sesi, Avatar Profil, dan Katalog Badge.
				</p>
			</div>
			<div class="hero-actions-group">
				{#if activeTab === 'rooms'}
					<button type="button" class="btn-primary-action" onclick={() => (isRoomDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Ruangan</span>
					</button>
				{:else if activeTab === 'activities'}
					<button type="button" class="btn-primary-action" onclick={() => (isActivityDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Tipe Aktivitas</span>
					</button>
				{:else if activeTab === 'avatars'}
					<button type="button" class="btn-primary-action" onclick={() => (isAvatarDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Avatar</span>
					</button>
				{:else if activeTab === 'badges'}
					<button type="button" class="btn-primary-action" onclick={() => (isBadgeDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Badge</span>
					</button>
				{:else if activeTab === 'angkatan'}
					<button type="button" class="btn-primary-action" onclick={() => (isAngkatanDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Angkatan</span>
					</button>
				{:else if activeTab === 'rombel'}
					<button type="button" class="btn-primary-action" onclick={() => (isRombelDrawerOpen = true)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						<span>Tambah Rombel</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- TAB STRIP NAVIGATION -->
		<div class="tab-strip-container mt-6">
			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'angkatan'}
				onclick={() => (activeTab = 'angkatan')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
				<span>Master Angkatan ({data.angkatanList?.length ?? 0})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'rombel'}
				onclick={() => (activeTab = 'rombel')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
				</svg>
				<span>Master Rombel Kelas ({data.rombelList?.length ?? 0})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'rooms'}
				onclick={() => (activeTab = 'rooms')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
				</svg>
				<span>Ruangan Kelas ({data.stats?.totalRooms ?? 0})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'activities'}
				onclick={() => (activeTab = 'activities')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
				</svg>
				<span>Tipe Aktivitas ({data.stats?.totalActivityTypes ?? 0})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'avatars'}
				onclick={() => (activeTab = 'avatars')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
				</svg>
				<span>Avatar Profil ({data.stats?.totalAvatars ?? 0})</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'badges'}
				onclick={() => (activeTab = 'badges')}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 15l-2 5l3 -1l3 1l-2 -5"/><circle cx="12" cy="9" r="6"/>
				</svg>
				<span>Badge & Lencana ({data.stats?.totalBadges ?? 0})</span>
			</button>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     TAB CONTENT: MASTER ANGKATAN
	     ══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'angkatan'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Daftar Master Angkatan ({filteredAngkatan.length})</h2>
					<p class="card-subtitle">Master angkatan (cohort) komunitas untuk siswa Nesaga Learning Community</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="angkatanSearch"
					placeholder="Cari angkatan (Tahun / Nama cohort)…"
					bind:value={angkatanSearch}
					clearable
				/>
			</div>

			{#if filteredAngkatan.length > 0}
				<div class="table-responsive">
					<table class="data-table text-xs">
						<thead>
							<tr>
								<th>TAHUN ANGKATAN</th>
								<th>NAMA ANGKATAN (COHORT)</th>
								<th>STATUS ANGKATAN</th>
								<th class="text-right">AKSI</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredAngkatan as a}
								<tr>
									<td>
										<span class="font-bold text-slate-900 text-sm block">{a.year}</span>
									</td>
									<td>
										<span class="font-semibold text-slate-700">{a.name}</span>
									</td>
									<td>
										<span class="text-slate-600 font-semibold">{a.isActive ? 'Aktif' : 'Non-Aktif'}</span>
									</td>
									<td class="text-right">
										<div class="inline-flex items-center gap-1">
											<form method="POST" action="?/toggleAngkatan" use:enhance class="inline-block">
												<input type="hidden" name="id" value={a.id} />
												<input type="hidden" name="isActive" value={(!a.isActive).toString()} />
												<button
													type="submit"
													class={a.isActive ? 'btn-row-secondary' : 'btn-row-primary'}
													title={a.isActive ? 'Nonaktifkan Angkatan' : 'Aktifkan Angkatan'}
												>
													<span class="text-xs font-bold">{a.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
												</button>
											</form>
											<form method="POST" action="?/deleteAngkatan" use:enhance class="inline-block" onsubmit={(e) => { if (!confirm(`Hapus master angkatan '${a.name}'?`)) e.preventDefault(); }}>
												<input type="hidden" name="id" value={a.id} />
												<button
													type="submit"
													class="btn-row-danger"
													title="Hapus Angkatan"
												>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
													</svg>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">
						{angkatanSearch ? `Tidak ada angkatan cocok dengan kata kunci "${angkatanSearch}".` : 'Belum ada data master angkatan terdaftar.'}
					</p>
				</div>
			{/if}
		</section>

	<!-- ══════════════════════════════════════════════════════════
	     TAB CONTENT: MASTER ROMBEL KELAS
	     ══════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'rombel'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Daftar Master Rombel Kelas ({filteredRombel.length})</h2>
					<p class="card-subtitle">Master opsi label kelas formal sekolah untuk sinkronisasi rombel fisik</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="rombelSearch"
					placeholder="Cari rombel label (Nama / Tingkat)…"
					bind:value={rombelSearch}
					clearable
				/>
			</div>

			{#if filteredRombel.length > 0}
				<div class="table-responsive">
					<table class="data-table text-xs">
						<thead>
							<tr>
								<th>NAMA ROMBEL KELAS</th>
								<th>TINGKAT LEVEL SEKOAH</th>
								<th class="text-right">AKSI</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredRombel as r}
								<tr>
									<td>
										<span class="font-bold text-slate-900 text-sm block">{r.name}</span>
									</td>
									<td>
										<span class="text-slate-600 font-semibold">Tingkat {r.levelOrder}</span>
									</td>
									<td class="text-right">
										<div class="inline-flex items-center gap-1">
											<button
												type="button"
												onclick={() => openEditRombelDrawer(r)}
												class="btn-row-secondary"
												title="Edit Rombel"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
												</svg>
											</button>
											<form method="POST" action="?/deleteRombel" use:enhance class="inline-block" onsubmit={(e) => { if (!confirm(`Hapus master rombel '${r.name}'?`)) e.preventDefault(); }}>
												<input type="hidden" name="id" value={r.id} />
												<button
													type="submit"
													class="btn-row-danger"
													title="Hapus Rombel"
												>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
													</svg>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">
						{rombelSearch ? `Tidak ada rombel cocok dengan kata kunci "${rombelSearch}".` : 'Belum ada data master rombel terdaftar.'}
					</p>
				</div>
			{/if}
		</section>

	<!-- ══════════════════════════════════════════════════════════
	     TAB CONTENT: RUANGAN KELAS (ROOMS)
	     ══════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'rooms'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Daftar Ruangan Terdaftar ({filteredRooms.length})</h2>
					<p class="card-subtitle">Master lokasi ruangan pelaksanaan sesi kelas di Nesaga Learning Community</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="roomSearch"
					placeholder="Cari ruangan kelas (Nama / Deskripsi)…"
					bind:value={roomSearch}
					clearable
				/>
			</div>

			{#if filteredRooms.length > 0}
				<div class="table-responsive">
					<table class="data-table text-xs">
						<thead>
							<tr>
								<th>NAMA RUANGAN</th>
								<th>DESKRIPSI & LOKASI</th>
								<th>TANGGAL DIBUAT</th>
								<th class="text-right">AKSI</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredRooms as r}
								<tr>
									<td>
										<span class="font-bold text-slate-900 text-sm block">{r.name}</span>
									</td>
									<td>
										<span class="text-slate-600">{r.description || 'Tidak ada deskripsi'}</span>
									</td>
									<td>
										<span class="text-slate-500">{new Date(r.createdAt).toLocaleDateString('id-ID')}</span>
									</td>
									<td class="text-right">
										<div class="inline-flex items-center gap-1">
											<button
												type="button"
												onclick={() => openEditRoomDrawer(r)}
												class="btn-row-secondary"
												title="Edit Ruangan"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
												</svg>
											</button>
											<button
												type="button"
												onclick={() => confirmDelete('room', r.id, r.name)}
												class="btn-row-danger"
												title="Hapus Ruangan"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">
						{roomSearch ? `Tidak ada ruangan cocok dengan kata kunci "${roomSearch}".` : 'Belum ada ruangan kelas terdaftar.'}
					</p>
				</div>
			{/if}
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     3. TAB CONTENT 2: TIPE AKTIVITAS (ACTIVITY TYPES)
	     ══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'activities'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Katalog Tipe Aktivitas Sesi Pertemuan ({filteredActivities.length})</h2>
					<p class="card-subtitle">Daftar tipe aktivitas sesi pertemuan yang tersimpan di database dan dapat dikelola penuh</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="activitySearch"
					placeholder="Cari tipe aktivitas (Kode / Nama / Deskripsi)…"
					bind:value={activitySearch}
					clearable
				/>
			</div>

			{#if filteredActivities.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
					{#each filteredActivities as act}
						<div class="p-4 border border-slate-200 rounded-lg bg-white flex items-start gap-3 relative group">
							<div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-mono font-bold text-xs">
								{act.code.slice(0, 3).toUpperCase()}
							</div>
							<div class="flex-1 pr-14">
								<h3 class="font-bold text-slate-900 text-sm mb-1">{act.name}</h3>
								<p class="text-xs text-slate-600 leading-relaxed">{act.description || 'Tidak ada deskripsi'}</p>
								<span class="inline-block mt-2 badge badge-neutral text-[10px]">
									Kode: {act.code}
								</span>
							</div>

							<div class="flex items-center gap-1 absolute top-3 right-3">
								<button
									type="button"
									onclick={() => openEditActivityDrawer(act)}
									class="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-all cursor-pointer"
									title="Edit Tipe Aktivitas"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
									</svg>
								</button>
								<button
									type="button"
									onclick={() => confirmDelete('activity', act.id, act.name)}
									class="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-all cursor-pointer"
									title="Hapus Tipe Aktivitas"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">
						{activitySearch ? `Tidak ada tipe aktivitas cocok dengan kata kunci "${activitySearch}".` : 'Belum ada tipe aktivitas terdaftar.'}
					</p>
				</div>
			{/if}
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     4. TAB CONTENT 3: AVATAR PROFIL (AVATARS)
	     ══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'avatars'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Katalog Avatar Profil ({data.avatars?.length ?? 0})</h2>
					<p class="card-subtitle">Pilihan avatar resmi yang dapat dipilih siswa dan pengguna di profil mereka</p>
				</div>
			</div>

			{#if data.avatars && data.avatars.length > 0}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-2">
					{#each data.avatars as av}
						<div class="p-3 border border-slate-200 rounded-lg bg-white flex flex-col items-center text-center relative group">
							<img src={av.imageUrl} alt={av.name} class="w-16 h-16 rounded-full object-cover mb-2 border-2 border-indigo-100" />
							<span class="font-bold text-xs text-slate-800">{av.name}</span>
							<button
								type="button"
								onclick={() => confirmDelete('avatar', av.id, av.name)}
								class="absolute top-2 right-2 p-1 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
								title="Hapus Avatar"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">Belum ada pilihan avatar terdaftar.</p>
				</div>
			{/if}
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     5. TAB CONTENT 4: BADGE & LENCANA (BADGE TYPES)
	     ══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'badges'}
		<section class="card card-table">
			<div class="card-header-flex">
				<div>
					<h2 class="card-title">Katalog Badge & Achievement ({filteredBadges.length})</h2>
					<p class="card-subtitle">Master data lencana pencapaian yang diperoleh siswa dari aktivitas pembelajaran</p>
				</div>
			</div>

			<div class="mb-4">
				<TextInput
					name="badgeSearch"
					placeholder="Cari badge & lencana (Nama / Deskripsi)…"
					bind:value={badgeSearch}
					clearable
				/>
			</div>

			{#if filteredBadges.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each filteredBadges as b}
						<div class="p-4 border border-slate-200 rounded-lg bg-white flex items-start gap-3 relative">
							<div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
								{#if b.iconUrl}
									<img src={b.iconUrl} alt={b.name} class="w-8 h-8 object-contain" />
								{:else}
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M12 15l-2 5l3 -1l3 1l-2 -5"/><circle cx="12" cy="9" r="6"/>
									</svg>
								{/if}
							</div>
							<div class="flex-1 pr-14">
								<h3 class="font-bold text-slate-900 text-sm mb-1">{b.name}</h3>
								<p class="text-xs text-slate-600 mb-2">{b.description || 'Tanpa deskripsi'}</p>
								<div class="flex flex-wrap gap-1 mb-2">
									{#if b.criteria}
										<span class="badge badge-warning text-[10px]">
											Kriteria: {b.criteria}
										</span>
									{/if}
									<span class="badge badge-info text-[10px]">
										Pemicu: {getTriggerLabel(b.triggerType, b.triggerThreshold)}
									</span>
								</div>
							</div>

							<div class="flex items-center gap-1 absolute top-3 right-3">
								<button
									type="button"
									onclick={() => openEditBadgeDrawer(b)}
									class="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-all cursor-pointer"
									title="Edit Badge"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
									</svg>
								</button>
								<button
									type="button"
									onclick={() => confirmDelete('badge', b.id, b.name)}
									class="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-all cursor-pointer"
									title="Hapus Badge"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state-box py-12 text-center">
					<p class="text-xs text-slate-500 italic">
						{badgeSearch ? `Tidak ada badge cocok dengan kata kunci "${badgeSearch}".` : 'Belum ada badge terdaftar.'}
					</p>
				</div>
			{/if}
		</section>
	{/if}

	<!-- DRAWERS (ADD ANGKATAN & ROMBEL) -->
	{#if isAngkatanDrawerOpen}
		<FormDrawer
			bind:open={isAngkatanDrawerOpen}
			title="Tambah Angkatan Baru"
			subtitle="Masukkan tahun angkatan cohort komunitas (contoh: 2025)"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="angkatan-form" action="?/createAngkatan" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="angkatan-year-input" class="text-xs font-bold text-slate-700">Tahun Angkatan</label>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={decrementAngkatanYear}
								class="h-10 w-11 flex items-center justify-center rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-lg cursor-pointer"
								title="Kurangi Tahun"
							>
								-
							</button>
							<input
								id="angkatan-year-input"
								name="year"
								type="number"
								required
								bind:value={newAngkatanYear}
								class="h-10 flex-1 px-3 text-center text-sm font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder="Contoh: 2026"
							/>
							<button
								type="button"
								onclick={incrementAngkatanYear}
								class="h-10 w-11 flex items-center justify-center rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-lg cursor-pointer"
								title="Tambah Tahun"
							>
								+
							</button>
						</div>
						<p class="text-[11px] text-slate-500">Tahun angkatan cohort komunitas (default: tahun saat ini).</p>
					</div>

					<TextInput
						name="name"
						label="Nama Angkatan (Otomatis)"
						readonly
						value={newAngkatanName}
						placeholder="Contoh: Angkatan 2026"
						hint="Nama angkatan otomatis disesuaikan berdasarkan tahun angkatan."
					/>
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button type="submit" form="angkatan-form" class="btn-drawer-primary">Simpan Angkatan</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isRombelDrawerOpen}
		<FormDrawer
			bind:open={isRombelDrawerOpen}
			title="Tambah Master Rombel Kelas"
			subtitle="Masukkan nama label kelas formal sekolah"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="rombel-form" action="?/createRombel" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<TextInput name="name" label="Nama Label Rombel" required bind:value={newRombelName} placeholder="Contoh: X TKJ 1, XI TKJ 2" />
					<TextInput name="levelOrder" label="Tingkat Level (1=X, 2=XI, 3=XII, 4=Alumni)" type="number" required bind:value={newRombelLevelOrder} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button type="submit" form="rombel-form" class="btn-drawer-primary">Simpan Rombel</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isEditRombelDrawerOpen && targetEditRombel}
		<FormDrawer
			bind:open={isEditRombelDrawerOpen}
			title="Edit Master Rombel Kelas"
			subtitle="Perbarui nama label rombel & tingkat level"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="edit-rombel-form" action="?/updateRombel" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<input type="hidden" name="id" value={targetEditRombel.id} />
					<TextInput name="name" label="Nama Label Rombel" required bind:value={editRombelName} placeholder="Contoh: X TKJ 1, XI TKJ 2" />
					<TextInput name="levelOrder" label="Tingkat Level (1=X, 2=XI, 3=XII, 4=Alumni)" type="number" required bind:value={editRombelLevelOrder} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button type="submit" form="edit-rombel-form" class="btn-drawer-primary">Simpan Perubahan</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isRoomDrawerOpen}
		<FormDrawer
			bind:open={isRoomDrawerOpen}
			title="Tambah Ruangan Baru"
			subtitle="Masukkan nama ruangan & lokasi tempat pelaksanaan sesi pembelajaran"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="room-form" action="?/createRoom" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<TextInput name="name" label="Nama Ruangan" required bind:value={roomName} placeholder="Contoh: Lab Komputer 1, Ruang Teori A" />
					<TextArea name="description" label="Deskripsi / Catatan Lokasi" bind:value={roomDescription} placeholder="Keterangan gedung / lantai" rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('room-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Simpan Ruangan</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isEditRoomDrawerOpen && targetEditRoom}
		<FormDrawer
			bind:open={isEditRoomDrawerOpen}
			title={`Edit Ruangan: ${targetEditRoom.name}`}
			subtitle="Ubah nama ruangan atau catatan lokasi"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="edit-room-form" action="?/updateRoom" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<input type="hidden" name="id" value={targetEditRoom?.id} />
					<TextInput name="name" label="Nama Ruangan" required bind:value={roomName} placeholder="Contoh: Lab Komputer 1, Ruang Teori A" />
					<TextArea name="description" label="Deskripsi / Catatan Lokasi" bind:value={roomDescription} placeholder="Keterangan gedung / lantai" rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('edit-room-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Perbarui Ruangan</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isActivityDrawerOpen}
		<FormDrawer
			bind:open={isActivityDrawerOpen}
			title="Tambah Tipe Aktivitas Baru"
			subtitle="Masukkan kode identifikasi & nama tipe aktivitas sesi pertemuan"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="activity-form" action="?/createActivityType" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<TextInput name="code" label="Kode Aktivitas (Unik)" required bind:value={activityCode} placeholder="Contoh: workshop, teori, quiz" hint="Kode huruf kecil tanpa spasi (contoh: 'workshop')" />
					<TextInput name="name" label="Nama Tipe Aktivitas" required bind:value={activityName} placeholder="Contoh: Workshop & Coding Lab" />
					<TextArea name="description" label="Deskripsi Sesi" bind:value={activityDescription} placeholder="Keterangan singkat jenis aktivitas..." rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('activity-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Simpan Tipe Aktivitas</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isEditActivityDrawerOpen && targetEditActivity}
		<FormDrawer
			bind:open={isEditActivityDrawerOpen}
			title={`Edit Tipe Aktivitas: ${targetEditActivity.name}`}
			subtitle="Ubah kode identifikasi, nama tipe, atau deskripsi aktivitas"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="edit-activity-form" action="?/updateActivityType" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<input type="hidden" name="id" value={targetEditActivity?.id} />
					<TextInput name="code" label="Kode Aktivitas (Unik)" required bind:value={activityCode} placeholder="Contoh: workshop, teori, quiz" hint="Kode huruf kecil tanpa spasi" />
					<TextInput name="name" label="Nama Tipe Aktivitas" required bind:value={activityName} placeholder="Contoh: Workshop & Coding Lab" />
					<TextArea name="description" label="Deskripsi Sesi" bind:value={activityDescription} placeholder="Keterangan singkat jenis aktivitas..." rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('edit-activity-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Perbarui Tipe Aktivitas</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isAvatarDrawerOpen}
		<FormDrawer
			bind:open={isAvatarDrawerOpen}
			title="Tambah Avatar Baru"
			subtitle="Masukkan nama avatar dan URL gambar avatar resmi"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="avatar-form" action="?/createAvatar" method="POST" enctype="multipart/form-data" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<TextInput name="name" label="Nama Avatar" required bind:value={avatarName} placeholder="Contoh: Cyber Explorer, Pixel Wizard" />
					
					<div class="flex flex-col gap-1.5">
						<label for="avatarFile" class="field-label font-bold text-xs text-slate-700">Upload Berkas Gambar Avatar</label>
						<input
							type="file"
							id="avatarFile"
							name="avatarFile"
							accept="image/*"
							class="w-full p-2 text-xs border border-slate-300 rounded-md bg-slate-50 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
						/>
					</div>

					<div class="flex items-center gap-2 my-1">
						<div class="h-px bg-slate-200 flex-1"></div>
						<span class="text-[11px] font-bold text-slate-400 uppercase">atau via URL</span>
						<div class="h-px bg-slate-200 flex-1"></div>
					</div>

					<TextInput name="imageUrl" label="URL Gambar Avatar" bind:value={avatarImageUrl} placeholder="https://api.dicebear.com/7.x/bottts/svg?seed=..." hint="Digunakan jika tidak memilih berkas upload" />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('avatar-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Simpan Avatar</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isBadgeDrawerOpen}
		<FormDrawer
			bind:open={isBadgeDrawerOpen}
			title="Tambah Badge Baru"
			subtitle="Definisikan nama lencana pencapaian, kriteria pemicu otomatis, dan deskripsi"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="badge-form" action="?/createBadgeType" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<TextInput name="name" label="Nama Badge" required bind:value={badgeName} placeholder="Contoh: Streak Warrior, Code Ninja" />
					
					<CustomSelect
						name="triggerType"
						label="Jenis Pemicu Otomatis (Trigger Engine)"
						options={badgeTriggerOptions}
						bind:value={badgeTriggerType}
					/>

					{#if badgeTriggerType !== 'manual_award'}
						<TextInput
							type="number"
							name="triggerThreshold"
							label="Target Pencapaian (Threshold)"
							bind:value={badgeTriggerThreshold}
							placeholder="Contoh: 7 untuk 7 hari streak, 500 untuk 500 poin"
						/>
					{/if}

					<TextInput name="criteria" label="Kriteria Kelulusan (Teks)" bind:value={badgeCriteria} placeholder="Contoh: Menyelesaikan 5 tugas berturut-turut" />
					<TextInput name="iconUrl" label="URL Icon Badge (Opsional)" bind:value={badgeIconUrl} placeholder="https://..." />
					<TextArea name="description" label="Deskripsi Badge" bind:value={badgeDescription} placeholder="Penjelasan pencapaian..." rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('badge-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Simpan Badge</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	{#if isEditBadgeDrawerOpen && targetEditBadge}
		<FormDrawer
			bind:open={isEditBadgeDrawerOpen}
			title={`Edit Badge: ${targetEditBadge.name}`}
			subtitle="Ubah nama lencana pencapaian, kriteria pemicu, atau icon"
			onclose={closeDrawers}
		>
			{#snippet children()}
				<form id="edit-badge-form" action="?/updateBadgeType" method="POST" use:enhance={handleFormEnhance} class="flex flex-col gap-4">
					<input type="hidden" name="id" value={targetEditBadge?.id} />
					<TextInput name="name" label="Nama Badge" required bind:value={badgeName} placeholder="Contoh: Streak Warrior, Code Ninja" />

					<CustomSelect
						name="triggerType"
						label="Jenis Pemicu Otomatis (Trigger Engine)"
						options={badgeTriggerOptions}
						bind:value={badgeTriggerType}
					/>

					{#if badgeTriggerType !== 'manual_award'}
						<TextInput
							type="number"
							name="triggerThreshold"
							label="Target Pencapaian (Threshold)"
							bind:value={badgeTriggerThreshold}
							placeholder="Contoh: 7 untuk 7 hari streak, 500 untuk 500 poin"
						/>
					{/if}

					<TextInput name="criteria" label="Kriteria Kelulusan (Teks)" bind:value={badgeCriteria} placeholder="Contoh: Menyelesaikan 5 tugas berturut-turut" />
					<TextInput name="iconUrl" label="URL Icon Badge (Opsional)" bind:value={badgeIconUrl} placeholder="https://..." />
					<TextArea name="description" label="Deskripsi Badge" bind:value={badgeDescription} placeholder="Penjelasan pencapaian..." rows={3} />
				</form>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrawers} class="btn-drawer-secondary">Batal</button>
					<button
						type="button"
						onclick={() => {
							const el = document.getElementById('edit-badge-form') as HTMLFormElement;
							if (el) el.requestSubmit();
						}}
						class="btn-drawer-primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
						<span>Perbarui Badge</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     7. CONFIRM MODAL DELETE
	     ══════════════════════════════════════════════════════════ -->
	{#if isDeleteModalOpen && deleteTarget}
		<ConfirmModal
			bind:open={isDeleteModalOpen}
			title={`Hapus ${deleteTarget.name}?`}
			message={`Apakah Anda yakin ingin menghapus ${deleteTarget.name}? Data ini tidak dapat dikembalikan.`}
			confirmText="Hapus Permanen"
			cancelText="Batal"
			variant="danger"
			oncancel={() => (isDeleteModalOpen = false)}
			onconfirm={() => {
				const formId = `delete-${deleteTarget?.type}-form`;
				const el = document.getElementById(formId) as HTMLFormElement;
				if (el) el.requestSubmit();
				isDeleteModalOpen = false;
			}}
		/>

		{#if deleteTarget.type === 'room'}
			<form id="delete-room-form" action="?/deleteRoom" method="POST" use:enhance class="hidden">
				<input type="hidden" name="id" value={deleteTarget.id} />
			</form>
		{:else if deleteTarget.type === 'activity'}
			<form id="delete-activity-form" action="?/deleteActivityType" method="POST" use:enhance class="hidden">
				<input type="hidden" name="id" value={deleteTarget.id} />
			</form>
		{:else if deleteTarget.type === 'avatar'}
			<form id="delete-avatar-form" action="?/deleteAvatar" method="POST" use:enhance class="hidden">
				<input type="hidden" name="id" value={deleteTarget.id} />
			</form>
		{:else if deleteTarget.type === 'badge'}
			<form id="delete-badge-form" action="?/deleteBadgeType" method="POST" use:enhance class="hidden">
				<input type="hidden" name="id" value={deleteTarget.id} />
			</form>
		{/if}
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

	.hero-actions-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* Tab Strip Styling */
	.tab-strip-container {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px;
		background: #f1f5f9;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-md, 10px);
		overflow-x: auto;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.tab-btn:hover {
		color: var(--text-primary, #0f172a);
		background: #ffffff;
	}

	.tab-btn--active {
		background: #ffffff;
		color: var(--primary, #4f46e5);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

	/* Action Buttons */
	.btn-primary-action {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border: 1px solid transparent;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-primary-action:hover {
		background: var(--primary-hover, #4338ca);
	}

	.btn-row-primary {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: #4f46e5;
		color: #ffffff;
		border: 1px solid #4338ca;
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-row-primary:hover {
		background: #4338ca;
		border-color: #3730a3;
	}

	.btn-row-secondary {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: #ffffff;
		color: #4f46e5;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-row-secondary:hover {
		background: #e0e7ff;
		border-color: #a5b4fc;
	}

	.btn-row-danger {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: #ffffff;
		color: #dc2626;
		border: 1px solid #fca5a5;
		border-radius: 6px;
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

	.text-right { text-align: right; }

	/* Drawer Footers & Actions */
	.drawer-footer-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		width: 100%;
	}

	.btn-drawer-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		padding: 0 18px;
		background: #ffffff;
		color: var(--text-muted, #475569);
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-drawer-secondary:hover {
		background: var(--bg-inset, #f8fafc);
		color: var(--text-primary, #0f172a);
		border-color: #94a3b8;
	}

	.btn-drawer-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		padding: 0 22px;
		background: var(--primary, #4f46e5);
		color: #ffffff;
		border: 1px solid transparent;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		transition: all 150ms ease;
	}

	.btn-drawer-primary:hover:not(:disabled) {
		background: var(--primary-hover, #4338ca);
		box-shadow: 0 3px 10px rgba(79, 70, 229, 0.3);
	}

	.btn-drawer-primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}
</style>

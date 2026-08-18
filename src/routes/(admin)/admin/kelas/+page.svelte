<script lang="ts">
	import { enhance, deserialize } from '$app/forms';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// Search & Filter state
	let searchQuery = $state('');
	let activeTaId = data.options?.tahunAjaranList?.find((ta: any) => ta.isActive)?.id;
	let filterTa = $state<string>(activeTaId ? String(activeTaId) : '0');
	let filterTingkat = $state<string>('0');
	let filterStatus = $state<'semua' | 'aktif' | 'nonaktif'>('semua');
	let sortOption = $state<'terbaru' | 'terlama' | 'nama-asc'>('terbaru');

	// Form Drawer state (CRUD Kelas)
	let isFormDrawerOpen = $state(false);
	let editingKelas = $state<any | null>(null);

	// Form inputs
	let formName = $state('');
	let formTahunAjaranId = $state<string>('');
	let formTingkatId = $state<string>('');
	let formTrackId = $state<string>('');
	let selectedMentorIds = $state<number[]>([]);
	let formIsActive = $state(true);

	// Confirm Modal states
	let isDeleteModalOpen = $state(false);
	let targetDeleteKelas = $state<any | null>(null);

	// Academic Year Matrix Promotion Wizard State
	let isPromoteDrawerOpen = $state(false);
	let promoteSourceTaId = $state<string>('');
	let promoteTargetTaId = $state<string>('');
	let isMatrixLoading = $state(false);

	// Matrix State: Array of class mappings
	let promotionMatrix = $state<
		Array<{
			sourceKelasId: number;
			sourceKelasName: string;
			sourceTingkatName: string;
			totalStudents: number;
			targetKelasId: string; // '0' = Lulus, or string of target class ID
			overrides: Record<number, 'naik' | 'tinggal' | 'keluar'>;
		}>
	>([]);

	let targetClassOptions = $state<Array<{ value: string; label: string }>>([]);

	// Drill-down Student Exception Modal State
	let isStudentModalOpen = $state(false);
	let activeDrillDownSourceKelas = $state<any | null>(null);
	let drillDownStudents = $state<Array<{ id: number; fullName: string; username: string; nisn: string | null }>>([]);
	let isDrillDownLoading = $state(false);

	// Student Enrollment Drawer State
	let isMemberDrawerOpen = $state(false);
	let activeMemberKelas = $state<any | null>(null);
	let classMembers = $state<Array<{ id: number; fullName: string; username: string; nisn: string | null }>>([]);
	let isMemberLoading = $state(false);
	let selectedAddStudentId = $state<string>('');
	let memberSearchQuery = $state('');

	// Sync server responses to toast notifications
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

		if (searchQuery.trim() !== '') {
			const term = searchQuery.toLowerCase().trim();
			list = list.filter(
				(item) =>
					item.name.toLowerCase().includes(term) ||
					item.tahunAjaranName.toLowerCase().includes(term) ||
					item.tingkatName.toLowerCase().includes(term) ||
					item.curriculumTrackTitle.toLowerCase().includes(term)
			);
		}

		const taIdNum = Number(filterTa);
		if (taIdNum > 0) {
			list = list.filter((item) => item.tahunAjaranId === taIdNum);
		}

		const tingkatIdNum = Number(filterTingkat);
		if (tingkatIdNum > 0) {
			list = list.filter((item) => item.tingkatId === tingkatIdNum);
		}

		if (filterStatus === 'aktif') {
			list = list.filter((item) => item.isActive);
		} else if (filterStatus === 'nonaktif') {
			list = list.filter((item) => !item.isActive);
		}

		if (sortOption === 'terbaru') {
			list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} else if (sortOption === 'terlama') {
			list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		} else if (sortOption === 'nama-asc') {
			list.sort((a, b) => a.name.localeCompare(b.name));
		}

		return list;
	});

	// Options data formatted for CustomSelect
	let taOptions = $derived([
		{ value: '0', label: 'Semua Tahun Ajaran' },
		...(data.options?.tahunAjaranList || []).map((ta: any) => ({
			value: String(ta.id),
			label: `${ta.name} ${ta.isActive ? '(Aktif)' : ''}`
		}))
	]);

	let tingkatOptions = $derived([
		{ value: '0', label: 'Semua Tingkat' },
		...(data.options?.tingkatList || []).map((t: any) => ({
			value: String(t.id),
			label: t.name
		}))
	]);

	let formTaOptions = $derived(
		(data.options?.tahunAjaranList || []).map((ta: any) => ({
			value: String(ta.id),
			label: `${ta.name} ${ta.isActive ? '(Aktif)' : ''}`
		}))
	);

	let formTingkatOptions = $derived(
		(data.options?.tingkatList || []).map((t: any) => ({
			value: String(t.id),
			label: t.name
		}))
	);

	let formTrackOptions = $derived.by(() => {
		const selectedTingkatId = Number(formTingkatId);
		const tracks = data.options?.trackList || [];

		const filtered = selectedTingkatId > 0
			? tracks.filter((tr: any) => tr.tingkatId === selectedTingkatId)
			: tracks;

		return filtered.map((tr: any) => ({
			value: String(tr.id),
			label: tr.title
		}));
	});

	$effect(() => {
		if (formTingkatId && formTrackOptions.length > 0) {
			const validCurrent = formTrackOptions.some((o: any) => o.value === formTrackId);
			if (!validCurrent) {
				formTrackId = formTrackOptions[0].value;
			}
		}
	});

	// Member enrollment derived calculations
	let availableStudentsForSelect = $derived.by(() => {
		const allStudents = data.options?.studentsList || [];
		const memberUserIds = new Set(classMembers.map((m) => m.id));
		const available = allStudents.filter((s: any) => !memberUserIds.has(s.id));
		return available.map((s: any) => ({
			value: String(s.id),
			label: `${s.fullName} (@${s.username})${s.nisn ? ` • NISN: ${s.nisn}` : ''}`
		}));
	});

	let filteredClassMembers = $derived.by(() => {
		if (!memberSearchQuery.trim()) return classMembers;
		const q = memberSearchQuery.toLowerCase().trim();
		return classMembers.filter(
			(m) =>
				m.fullName.toLowerCase().includes(q) ||
				m.username.toLowerCase().includes(q) ||
				(m.nisn && m.nisn.includes(q))
		);
	});

	// Fetch promotion matrix whenever sourceTaId or targetTaId changes
	async function loadPromotionMatrix(sourceId: string, targetId: string) {
		const sId = Number(sourceId);
		const tId = Number(targetId);
		if (!sId) {
			promotionMatrix = [];
			targetClassOptions = [];
			return;
		}

		isMatrixLoading = true;
		const formData = new FormData();
		formData.append('sourceTaId', String(sId));
		if (tId) formData.append('targetTaId', String(tId));

		try {
			const res = await fetch('?/getPromotionMatrix', {
				method: 'POST',
				body: formData
			});

			const text = await res.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.matrixData) {
				const md = result.data.matrixData as any;

				targetClassOptions = [
					{ value: '0', label: '🎓 LULUS / ALUMNI' },
					...(md.targetClassesOptions || []).map((tc: any) => ({
						value: String(tc.id),
						label: `${tc.name} (${tc.tingkatName})`
					}))
				];

				promotionMatrix = (md.matrix || []).map((m: any) => ({
					sourceKelasId: m.sourceKelasId,
					sourceKelasName: m.sourceKelasName,
					sourceTingkatName: m.sourceTingkatName,
					totalStudents: m.totalStudents,
					targetKelasId: String(m.suggestedTargetKelasId),
					overrides: {}
				}));
			} else {
				promotionMatrix = [];
				targetClassOptions = [];
			}
		} catch (err) {
			console.error('Error fetching promotion matrix:', err);
			promotionMatrix = [];
			targetClassOptions = [];
		} finally {
			isMatrixLoading = false;
		}
	}

	async function openMemberDrawer(kelasItem: any) {
		activeMemberKelas = kelasItem;
		isMemberDrawerOpen = true;
		selectedAddStudentId = '';
		memberSearchQuery = '';
		await loadClassMembers(kelasItem.id);
	}

	async function loadClassMembers(kelasId: number) {
		isMemberLoading = true;
		const formData = new FormData();
		formData.append('kelasId', String(kelasId));

		try {
			const res = await fetch('?/getStudents', {
				method: 'POST',
				body: formData
			});

			const text = await res.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.students) {
				classMembers = result.data.students as any;
			} else {
				classMembers = [];
			}
		} catch (err) {
			console.error('Error fetching class members:', err);
			classMembers = [];
		} finally {
			isMemberLoading = false;
		}
	}

	function closeMemberDrawer() {
		isMemberDrawerOpen = false;
		activeMemberKelas = null;
		classMembers = [];
		selectedAddStudentId = '';
	}

	function openCreateDrawer() {
		editingKelas = null;
		formName = '';

		const activeTa = data.options?.tahunAjaranList?.find((ta: any) => ta.isActive);
		formTahunAjaranId = activeTa ? String(activeTa.id) : (data.options?.tahunAjaranList?.[0] ? String(data.options.tahunAjaranList[0].id) : '');

		formTingkatId = data.options?.tingkatList?.[0] ? String(data.options.tingkatList[0].id) : '';
		formTrackId = formTrackOptions?.[0] ? formTrackOptions[0].value : '';
		selectedMentorIds = [];
		formIsActive = true;
		isFormDrawerOpen = true;
	}

	function openEditDrawer(kelasItem: any) {
		editingKelas = kelasItem;
		formName = kelasItem.name;
		formTahunAjaranId = String(kelasItem.tahunAjaranId);
		formTingkatId = String(kelasItem.tingkatId);
		formTrackId = String(kelasItem.curriculumTrackId);
		selectedMentorIds = (kelasItem.mentors || []).map((m: any) => m.id);
		formIsActive = kelasItem.isActive;
		isFormDrawerOpen = true;
	}

	function closeFormDrawer() {
		isFormDrawerOpen = false;
		editingKelas = null;
	}

	function openPromoteDrawer() {
		const taList = data.options?.tahunAjaranList || [];
		const activeTa = taList.find((ta: any) => ta.isActive);
		promoteSourceTaId = activeTa ? String(activeTa.id) : (taList[0] ? String(taList[0].id) : '');

		const nextTa = taList.find((ta: any) => ta.id !== Number(promoteSourceTaId));
		promoteTargetTaId = nextTa ? String(nextTa.id) : promoteSourceTaId;

		isPromoteDrawerOpen = true;
		if (promoteSourceTaId) {
			loadPromotionMatrix(promoteSourceTaId, promoteTargetTaId);
		}
	}

	function closePromoteDrawer() {
		isPromoteDrawerOpen = false;
		promotionMatrix = [];
		targetClassOptions = [];
	}

	// Drill-down exception management
	async function openDrillDownModal(matrixItem: any) {
		activeDrillDownSourceKelas = matrixItem;
		isDrillDownLoading = true;
		isStudentModalOpen = true;

		const formData = new FormData();
		formData.append('kelasId', String(matrixItem.sourceKelasId));

		try {
			const res = await fetch('?/getStudents', {
				method: 'POST',
				body: formData
			});

			const text = await res.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.students) {
				drillDownStudents = result.data.students as any;
			} else {
				drillDownStudents = [];
			}
		} catch (err) {
			console.error('Error fetching students:', err);
			drillDownStudents = [];
		} finally {
			isDrillDownLoading = false;
		}
	}

	function closeDrillDownModal() {
		isStudentModalOpen = false;
		activeDrillDownSourceKelas = null;
		drillDownStudents = [];
	}

	function setStudentOverrideAction(userId: number, action: 'naik' | 'tinggal' | 'keluar') {
		if (!activeDrillDownSourceKelas) return;
		const row = promotionMatrix.find((m) => m.sourceKelasId === activeDrillDownSourceKelas.sourceKelasId);
		if (row) {
			if (action === 'naik') {
				delete row.overrides[userId];
			} else {
				row.overrides[userId] = action;
			}
		}
	}

	let matrixSummary = $derived.by(() => {
		let totalStudents = 0;
		let totalPromoted = 0;
		let totalGraduated = 0;
		let totalRepeated = 0;
		let totalExited = 0;

		for (const row of promotionMatrix) {
			totalStudents += row.totalStudents;
			const targetId = Number(row.targetKelasId);

			let classPromoted = 0;
			let classGraduated = 0;
			let classRepeated = 0;
			let classExited = 0;

			const overrideCount = Object.keys(row.overrides).length;
			const defaultNaikCount = Math.max(0, row.totalStudents - overrideCount);

			if (targetId === 0) {
				classGraduated += defaultNaikCount;
			} else {
				classPromoted += defaultNaikCount;
			}

			for (const action of Object.values(row.overrides)) {
				if (action === 'naik') {
					if (targetId === 0) classGraduated++;
					else classPromoted++;
				} else if (action === 'tinggal') {
					classRepeated++;
				} else if (action === 'keluar') {
					classExited++;
				}
			}

			totalPromoted += classPromoted;
			totalGraduated += classGraduated;
			totalRepeated += classRepeated;
			totalExited += classExited;
		}

		return { totalStudents, totalPromoted, totalGraduated, totalRepeated, totalExited };
	});

	function toggleMentorSelection(mentorId: number) {
		if (selectedMentorIds.includes(mentorId)) {
			selectedMentorIds = selectedMentorIds.filter((id) => id !== mentorId);
		} else {
			selectedMentorIds = [...selectedMentorIds, mentorId];
		}
	}

	function openDeleteModal(kelasItem: any) {
		targetDeleteKelas = kelasItem;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		targetDeleteKelas = null;
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
					<h1 class="hero-title">Manajemen Kelas & Master Data</h1>
					<span class="badge badge-primary">
						{data.stats?.totalKelas ?? 0} Kelas
					</span>
				</div>
				<p class="hero-subtitle">
					Kelola rombongan belajar (kelas), tingkat/jenjang, penugasan mentor, serta proses kenaikan kelas.
				</p>
			</div>
			<div class="hero-actions-group">
				<button type="button" class="btn-secondary-action" onclick={openPromoteDrawer}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/>
					</svg>
					<span>Kenaikan Kelas (Bulk TA)</span>
				</button>

				<button type="button" class="btn-primary-action" onclick={openCreateDrawer}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
					</svg>
					<span>Tambah Kelas Baru</span>
				</button>
			</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (.stats-grid)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Statistik Master Kelas">
		<div class="stat-card">
			<div class="stat-icon-box icon-kelas">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalKelas ?? 0} Kelas</span>
				<span class="stat-label">Total Rombel Kelas</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-active">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.activeKelasCount ?? 0} Kelas</span>
				<span class="stat-label">Kelas Aktif Berjalan</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-siswa">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalStudentsAcrossClasses ?? 0} Siswa</span>
				<span class="stat-label">Total Siswa Terhubung</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-mentor">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats?.totalAssignedMentors ?? 0} Mentor</span>
				<span class="stat-label">Total Mentor Bertugas</span>
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
				placeholder="Cari nama kelas (contoh: X TKJ 1, XI RPL)…"
				bind:value={searchQuery}
				clearable
			/>
		{/snippet}

		{#snippet filters()}
			<CustomSelect
				name="filterTa"
				bind:value={filterTa}
				options={taOptions}
			/>

			<CustomSelect
				name="filterTingkat"
				bind:value={filterTingkat}
				options={tingkatOptions}
			/>

			<CustomSelect
				name="filterStatus"
				bind:value={filterStatus}
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
				<h2 class="card-title">Daftar Kelas</h2>
				<p class="card-subtitle">
					Menampilkan {filteredItems.length} dari total {data.items?.length ?? 0} kelas terdaftar.
				</p>
			</div>
		</div>

		{#if filteredItems.length > 0}
			<div class="table-responsive">
				<table class="data-table">
					<thead>
						<tr>
							<th>NAMA KELAS</th>
							<th>TAHUN AJARAN</th>
							<th>TINGKAT &amp; TRACK PEMBELAJARAN</th>
							<th>MENTOR PENANGGUNG JAWAB</th>
							<th>SISWA AKTIF</th>
							<th>STATUS</th>
							<th class="text-right">AKSI</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredItems as item}
							<tr class:row-active={item.isActive}>
								<td>
									<div class="kelas-name-cell">
										<span class="font-bold text-base">{item.name}</span>
									</div>
								</td>
								<td>
									<span class="badge" class:badge-success={item.isTahunAjaranActive} class:badge-neutral={!item.isTahunAjaranActive}>
										{item.tahunAjaranName} {item.isTahunAjaranActive ? '(TA Aktif)' : ''}
									</span>
								</td>
								<td>
									<div class="flex flex-col gap-0.5">
										<span class="font-bold text-xs text-slate-800">{item.tingkatName}</span>
										<span class="text-xs text-slate-500">{item.curriculumTrackTitle}</span>
									</div>
								</td>
								<td>
									{#if item.mentors && item.mentors.length > 0}
										<div class="mentors-chips-wrap">
											{#each item.mentors as mentor}
												<span class="mentor-chip">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
													<span>{mentor.fullName}</span>
												</span>
											{/each}
										</div>
									{:else}
										<span class="text-muted text-xs italic">Belum ada mentor</span>
									{/if}
								</td>
								<td>
									<a
										href={`/admin/kelas/${item.id}`}
										class="count-pill count-pill-sky hover:bg-sky-100 transition-all cursor-pointer flex items-center gap-1.5 no-underline"
										title="Kelola Anggota Siswa (Halaman Dedicated)"
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
										<span>{item.totalStudents} Siswa</span>
									</a>
								</td>
								<td>
									{#if item.isActive}
										<span class="status-pill status-pill--active">
											<svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>
											<span>Aktif</span>
										</span>
									{:else}
										<span class="status-pill status-pill--inactive">
											Non-aktif
										</span>
									{/if}
								</td>
								<td class="text-right">
									<div class="actions-flex">
										<a
											href={`/admin/kelas/${item.id}`}
											class="action-btn action-btn--members"
											title="Kelola Anggota Siswa Kelas (Bulk Page)"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
											</svg>
										</a>

										<button
											type="button"
											class="action-btn action-btn--edit"
											onclick={() => openEditDrawer(item)}
											title="Edit Data Kelas & Assignment"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
											</svg>
										</button>

										<button
											type="button"
											class="action-btn action-btn--delete"
											onclick={() => openDeleteModal(item)}
											title="Hapus Kelas"
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
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
				</svg>
				<h3 class="empty-title">Tidak Ada Kelas</h3>
				<p class="empty-desc">
					{searchQuery ? `Tidak ditemukan kelas dengan kata kunci "${searchQuery}".` : 'Belum ada data kelas terdaftar. Klik tombol Tambah untuk membuat rombel kelas baru.'}
				</p>
			</div>
		{/if}
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     5. FORM DRAWER (CREATE / EDIT KELAS)
	     ══════════════════════════════════════════════════════════ -->
	<FormDrawer
		bind:open={isFormDrawerOpen}
		title={editingKelas ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
		subtitle={editingKelas ? `Perbarui rombel ${editingKelas.name}` : 'Buat rombongan belajar (kelas) baru untuk Nesaga Learning Community.'}
		onclose={closeFormDrawer}
	>
		{#snippet children()}
			<form
				id="kelas-drawer-form"
				action={editingKelas ? '?/updateKelas' : '?/createKelas'}
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
				{#if editingKelas}
					<input type="hidden" name="id" value={editingKelas.id} />
				{/if}

				<!-- Card 1: Struktur Akademik Kelas -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">1. Struktur Akademik Kelas</h4>
							<p class="drawer-card__desc">Tentukan tahun ajaran, tingkat, dan track pembelajaran</p>
						</div>
					</div>
					<div class="drawer-card__body space-y-3.5">
						<CustomSelect
							name="tahunAjaranId"
							label="Tahun Ajaran"
							required
							bind:value={formTahunAjaranId}
							options={formTaOptions}
						/>

						<CustomSelect
							name="tingkatId"
							label="Tingkat / Jenjang Kelas"
							required
							bind:value={formTingkatId}
							options={formTingkatOptions}
						/>

						<CustomSelect
							name="curriculumTrackId"
							label="Track Pembelajaran"
							required
							bind:value={formTrackId}
							options={formTrackOptions}
						/>

						<TextInput
							name="name"
							label="Nama Kelas"
							required
							bind:value={formName}
							placeholder="Contoh: X TKJ 1, XI RPL 2"
							hint="Sertakan jenjang dan urutan rombel (misal X TKJ 1)."
						/>
					</div>
				</div>

				<!-- Card 2: Penugasan Mentor Penanggung Jawab -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-amber-600 bg-amber-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">2. Penugasan Mentor Kelas</h4>
							<p class="drawer-card__desc">Pilih mentor yang bertanggung jawab mengajar kelas ini</p>
						</div>
					</div>
					<div class="drawer-card__body space-y-2">
						{#if data.options?.mentorsList && data.options.mentorsList.length > 0}
							<div class="mentors-checkbox-grid">
								{#each data.options.mentorsList as m}
									{@const checked = selectedMentorIds.includes(m.id)}
									<label class="mentor-select-card" class:mentor-select-card--checked={checked}>
										<input
											type="checkbox"
											name="mentorIds"
											value={m.id}
											{checked}
											onchange={() => toggleMentorSelection(m.id)}
											class="checkbox-input"
										/>
										<div class="mentor-select-info">
											<span class="mentor-select-name">{m.fullName}</span>
											<span class="mentor-select-user">@{m.username}</span>
										</div>
									</label>
								{/each}
							</div>
						{:else}
							<p class="text-xs text-slate-500 italic">Belum ada user ber-role Mentor terdaftar.</p>
						{/if}
					</div>
				</div>

				<!-- Card 3: Status Operasional -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-emerald-600 bg-emerald-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">3. Status Operasional Kelas</h4>
							<p class="drawer-card__desc">Izin akses pembelajaran aktif</p>
						</div>
					</div>
					<div class="drawer-card__body">
						<ToggleSwitch
							name="isActive"
							label="Status Kelas Aktif"
							description="Jika non-aktif, kelas tidak dapat diakses oleh siswa & mentor untuk pembelajaran."
							bind:checked={formIsActive}
							onLabel="Aktif"
							offLabel="Non-aktif"
						/>
					</div>
				</div>
			</form>
		{/snippet}

		{#snippet footer()}
			<div class="drawer-footer-row">
				<button type="button" onclick={closeFormDrawer} class="btn-drawer-secondary">
					Batal
				</button>
				<button
					type="button"
					onclick={() => {
						const formEl = document.getElementById('kelas-drawer-form') as HTMLFormElement;
						if (formEl) formEl.requestSubmit();
					}}
					class="btn-drawer-primary"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
						<polyline points="17 21 17 13 7 13 7 21"/>
						<polyline points="7 3 7 8 15 8"/>
					</svg>
					<span>{editingKelas ? 'Simpan Perubahan' : 'Daftarkan Kelas Baru'}</span>
				</button>
			</div>
		{/snippet}
	</FormDrawer>

	<!-- ══════════════════════════════════════════════════════════
	     6. FORM DRAWER (KELOLA ANGGOTA SISWA KELAS)
	     ══════════════════════════════════════════════════════════ -->
	{#if isMemberDrawerOpen && activeMemberKelas}
		<FormDrawer
			bind:open={isMemberDrawerOpen}
			title={`Kelola Siswa: ${activeMemberKelas.name}`}
			subtitle={`Tambah atau keluarkan siswa dari rombongan belajar ${activeMemberKelas.name} (${activeMemberKelas.tahunAjaranName}).`}
			onclose={closeMemberDrawer}
		>
			{#snippet children()}
				<div class="drawer-form-layout">
					<!-- Card 1: Tambahkan Siswa Baru -->
					<div class="drawer-card">
						<div class="drawer-card__header">
							<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
								</svg>
							</div>
							<div>
								<h4 class="drawer-card__title">1. Tambahkan Siswa Baru ke Kelas</h4>
								<p class="drawer-card__desc">Pilih siswa terdaftar untuk dimasukkan ke kelas ini</p>
							</div>
						</div>
						<div class="drawer-card__body">
							<form
								id="add-student-form"
								action="?/addStudent"
								method="POST"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (result.type === 'success') {
											selectedAddStudentId = '';
											if (activeMemberKelas) loadClassMembers(activeMemberKelas.id);
										}
									};
								}}
								class="flex items-end gap-2"
							>
								<input type="hidden" name="kelasInstanceId" value={activeMemberKelas.id} />
								<div class="flex-1">
									<CustomSelect
										name="userId"
										label="Pilih Siswa"
										required
										bind:value={selectedAddStudentId}
										options={availableStudentsForSelect}
										placeholder="Cari nama atau NISN siswa…"
									/>
								</div>
								<button
									type="submit"
									disabled={!selectedAddStudentId}
									class="btn-drawer-primary text-xs h-[40px] px-4 whitespace-nowrap disabled:opacity-50"
								>
									+ Tambahkan
								</button>
							</form>
						</div>
					</div>

					<!-- Card 2: Anggota Siswa Terdaftar Saat Ini -->
					<div class="drawer-card">
						<div class="drawer-card__header">
							<div class="drawer-card__icon text-sky-600 bg-sky-50">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
								</svg>
							</div>
							<div class="flex items-center justify-between w-full">
								<div>
									<h4 class="drawer-card__title">2. Anggota Siswa Terdaftar ({classMembers.length})</h4>
									<p class="drawer-card__desc">Daftar siswa aktif di rombel {activeMemberKelas.name}</p>
								</div>
							</div>
						</div>

						<div class="drawer-card__body space-y-3">
							<TextInput
								name="memberSearch"
								placeholder="Cari anggota kelas (Nama / NISN)…"
								bind:value={memberSearchQuery}
								clearable
							/>

							{#if isMemberLoading}
								<div class="py-8 text-center text-xs text-slate-500">
									Memuat anggota kelas…
								</div>
							{:else if filteredClassMembers.length > 0}
								<div class="students-promote-stack">
									{#each filteredClassMembers as m}
										<div class="student-promote-row">
											<div class="student-info-col">
												<span class="student-name">{m.fullName}</span>
												<span class="student-nisn">@{m.username} {m.nisn ? `• NISN: ${m.nisn}` : ''}</span>
											</div>

											<form
												action="?/removeStudent"
												method="POST"
												use:enhance={() => {
													return async ({ result, update }) => {
														await update();
														if (result.type === 'success' && activeMemberKelas) {
															loadClassMembers(activeMemberKelas.id);
														}
													};
												}}
											>
												<input type="hidden" name="kelasInstanceId" value={activeMemberKelas.id} />
												<input type="hidden" name="userId" value={m.id} />
												<button
													type="submit"
													class="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded transition-all cursor-pointer"
													title="Keluarkan siswa dari kelas"
												>
													Keluarkan
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div class="py-8 text-center text-xs text-slate-500 italic">
									{memberSearchQuery ? `Tidak ditemukan anggota dengan kata kunci "${memberSearchQuery}".` : 'Belum ada siswa terdaftar di kelas ini.'}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/snippet}

			{#snippet footer()}
				<div class="flex items-center justify-end w-full">
					<button type="button" onclick={closeMemberDrawer} class="btn-drawer-secondary">
						Selesai
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     7. FORM DRAWER (MATRIKS KENAIKAN KELAS TAHUNAN)
	     ══════════════════════════════════════════════════════════ -->
	<FormDrawer
		bind:open={isPromoteDrawerOpen}
		title="Matriks Kenaikan Kelas (Bulk TA Promotion)"
		subtitle="Pilih Tahun Ajaran Asal & Tujuan untuk memetakan seluruh rombel kelas dan mempromosikan siswa secara holistik."
		onclose={closePromoteDrawer}
	>
		{#snippet children()}
			<form
				id="ta-promote-matrix-form"
				action="?/executeTaPromotion"
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closePromoteDrawer();
						}
					};
				}}
				class="drawer-form-layout"
			>
				<input type="hidden" name="sourceTaId" value={promoteSourceTaId} />
				<input type="hidden" name="targetTaId" value={promoteTargetTaId} />
				<input
					type="hidden"
					name="mappingsJson"
					value={JSON.stringify(
						promotionMatrix.map((m) => ({
							sourceKelasId: m.sourceKelasId,
							targetKelasId: Number(m.targetKelasId),
							overrides: Object.entries(m.overrides).map(([uId, act]) => ({
								userId: Number(uId),
								action: act
							}))
						}))
					)}
				/>

				<!-- Card 1: Pemilihan Periode Transisi Tahun Ajaran -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/>
							</svg>
						</div>
						<div>
							<h4 class="drawer-card__title">1. Periode Transisi Tahun Ajaran</h4>
							<p class="drawer-card__desc">Pilih Tahun Ajaran Asal (Lama) dan Tahun Ajaran Tujuan (Baru)</p>
						</div>
					</div>
					<div class="drawer-card__body">
						<div class="ta-selection-grid">
							<CustomSelect
								name="promoteSourceTaSelect"
								label="Tahun Ajaran Asal (Lama)"
								required
								bind:value={promoteSourceTaId}
								options={formTaOptions}
								onchange={(val) => {
									if (val && promoteTargetTaId) loadPromotionMatrix(String(val), promoteTargetTaId);
								}}
							/>

							<CustomSelect
								name="promoteTargetTaSelect"
								label="Tahun Ajaran Tujuan (Baru)"
								required
								bind:value={promoteTargetTaId}
								options={formTaOptions}
								onchange={(val) => {
									if (promoteSourceTaId && val) loadPromotionMatrix(promoteSourceTaId, String(val));
								}}
							/>
						</div>
					</div>
				</div>

				<!-- Card 2: Matriks Pemetaan Seluruh Kelas di Tahun Ajaran Asal -->
				<div class="drawer-card matrix-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-sky-600 bg-sky-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							</svg>
						</div>
						<div>
							<h4 class="drawer-card__title">2. Matriks Pemetaan Kelas &amp; Target Tujuan</h4>
							<p class="drawer-card__desc">Seluruh kelas dari Tahun Ajaran Asal akan dipetakan ke kelas target di TA Tujuan</p>
						</div>
					</div>

					<div class="drawer-card__body p-0 matrix-card-body">
						{#if isMatrixLoading}
							<div class="py-10 text-center text-xs text-slate-500">
								Memuat matriks kelas Tahun Ajaran…
							</div>
						{:else if promotionMatrix.length > 0}
							<div class="table-responsive matrix-table-wrap">
								<table class="data-table text-xs">
									<thead>
										<tr>
											<th>KELAS ASAL (TA ASAL)</th>
											<th>TARGET KELAS TUJUAN (TA BARU)</th>
											<th>PENGECUALIAN</th>
											<th class="text-right">AKSI DETAIL</th>
										</tr>
									</thead>
									<tbody>
										{#each promotionMatrix as row}
											{@const overrideCount = Object.keys(row.overrides).length}
											<tr>
												<td>
													<div class="flex flex-col gap-0.5">
														<span class="font-bold text-slate-900">{row.sourceKelasName}</span>
														<span class="text-muted text-[11px]">{row.sourceTingkatName} • {row.totalStudents} Siswa</span>
													</div>
												</td>
												<td>
													<div class="min-w-[200px]">
														<CustomSelect
															name={`target_kelas_${row.sourceKelasId}`}
															bind:value={row.targetKelasId}
															options={targetClassOptions}
														/>
													</div>
												</td>
												<td>
													{#if overrideCount > 0}
														<span class="badge badge-warning">
															{overrideCount} Siswa Disesuaikan
														</span>
													{:else}
														<span class="badge badge-neutral">
															100% Mengikuti Target
														</span>
													{/if}
												</td>
												<td class="text-right">
													<button
														type="button"
														class="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-all"
														onclick={() => openDrillDownModal(row)}
													>
														Atur Siswa ({row.totalStudents})
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="py-10 text-center text-xs text-slate-500 italic">
								{#if promoteSourceTaId === promoteTargetTaId}
									Tahun Ajaran Asal dan Tujuan harus berbeda.
								{:else}
									Tidak ada rombel kelas terdaftar di Tahun Ajaran Asal yang dipilih.
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Ringkasan Kenaikan Kelas Total -->
				{#if promotionMatrix.length > 0}
					<div class="promotion-summary-banner">
						<span class="font-bold">Total Rekapitulasi:</span>
						<span><strong class="text-emerald-700">{matrixSummary.totalPromoted}</strong> Siswa Naik</span>
						<span>•</span>
						<span><strong class="text-sky-700">{matrixSummary.totalGraduated}</strong> Siswa Lulus</span>
						{#if matrixSummary.totalRepeated > 0}
							<span>•</span>
							<span><strong class="text-amber-700">{matrixSummary.totalRepeated}</strong> Tinggal</span>
						{/if}
						{#if matrixSummary.totalExited > 0}
							<span>•</span>
							<span><strong class="text-rose-700">{matrixSummary.totalExited}</strong> Keluar</span>
						{/if}
					</div>
				{/if}
			</form>
		{/snippet}

		{#snippet footer()}
			<div class="drawer-footer-row">
				<button type="button" onclick={closePromoteDrawer} class="btn-drawer-secondary">
					Batal
				</button>
				<button
					type="button"
					disabled={promotionMatrix.length === 0 || isMatrixLoading}
					onclick={() => {
						const formEl = document.getElementById('ta-promote-matrix-form') as HTMLFormElement;
						if (formEl) formEl.requestSubmit();
					}}
					class="btn-drawer-primary"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M5 12l5 5L20 7"/>
					</svg>
					<span>Proses Kenaikan Kelas Seluruh TA ({matrixSummary.totalStudents} Siswa)</span>
				</button>
			</div>
		{/snippet}
	</FormDrawer>

	<!-- ══════════════════════════════════════════════════════════
	     8. MODAL DRILL-DOWN SISWA (PENGECUALIAN INDIVIDUAL)
	     ══════════════════════════════════════════════════════════ -->
	{#if isStudentModalOpen && activeDrillDownSourceKelas}
		<FormDrawer
			bind:open={isStudentModalOpen}
			title={`Pengecualian Siswa: ${activeDrillDownSourceKelas.sourceKelasName}`}
			subtitle="Setel status siswa yang tinggal kelas atau keluar. Siswa lainnya akan otomatis mengikuti target kelas tujuan."
			onclose={closeDrillDownModal}
		>
			{#snippet children()}
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-sky-600 bg-sky-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
							</svg>
						</div>
						<div>
							<h4 class="drawer-card__title">Daftar Siswa Rombel {activeDrillDownSourceKelas.sourceKelasName}</h4>
							<p class="drawer-card__desc">Pilih status khusus jika siswa tinggal kelas atau keluar</p>
						</div>
					</div>
					<div class="drawer-card__body">
						{#if isDrillDownLoading}
							<div class="py-8 text-center text-xs text-slate-500">
								Memuat siswa rombel…
							</div>
						{:else if drillDownStudents.length > 0}
							<div class="students-promote-stack">
								{#each drillDownStudents as s}
									{@const currentAction = activeDrillDownSourceKelas.overrides[s.id] || 'naik'}
									<div class="student-promote-row">
										<div class="student-info-col">
											<span class="student-name">{s.fullName}</span>
											<span class="student-nisn">@{s.username} {s.nisn ? `• NISN: ${s.nisn}` : ''}</span>
										</div>

										<div class="student-action-selector">
											<label class="action-radio-option" class:action-radio-option--active={currentAction === 'naik'}>
												<input
													type="radio"
													name={`drill_action_${s.id}`}
													value="naik"
													checked={currentAction === 'naik'}
													onchange={() => setStudentOverrideAction(s.id, 'naik')}
												/>
												<span>Ikuti Target</span>
											</label>

											<label class="action-radio-option" class:action-radio-option--warning={currentAction === 'tinggal'}>
												<input
													type="radio"
													name={`drill_action_${s.id}`}
													value="tinggal"
													checked={currentAction === 'tinggal'}
													onchange={() => setStudentOverrideAction(s.id, 'tinggal')}
												/>
												<span>Tinggal</span>
											</label>

											<label class="action-radio-option" class:action-radio-option--danger={currentAction === 'keluar'}>
												<input
													type="radio"
													name={`drill_action_${s.id}`}
													value="keluar"
													checked={currentAction === 'keluar'}
													onchange={() => setStudentOverrideAction(s.id, 'keluar')}
												/>
												<span>Keluar</span>
											</label>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center text-xs text-slate-500 italic">
								Tidak ada siswa aktif terdaftar di rombel ini.
							</div>
						{/if}
					</div>
				</div>
			{/snippet}

			{#snippet footer()}
				<div class="drawer-footer-row">
					<button type="button" onclick={closeDrillDownModal} class="btn-drawer-primary">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<span>Selesai Menyetel Pengecualian</span>
					</button>
				</div>
			{/snippet}
		</FormDrawer>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     9. CONFIRM MODAL (DELETE KELAS)
	     ══════════════════════════════════════════════════════════ -->
	{#if isDeleteModalOpen && targetDeleteKelas}
		<ConfirmModal
			bind:open={isDeleteModalOpen}
			title={`Hapus Kelas: ${targetDeleteKelas.name}?`}
			message={`Apakah Anda yakin ingin menghapus data kelas ${targetDeleteKelas.name}? Tindakan ini tidak dapat dibatalkan.`}
			confirmText="Hapus Permanen"
			cancelText="Batal"
			variant="danger"
			oncancel={closeDeleteModal}
			onconfirm={() => {
				const formEl = document.getElementById(`delete-form-${targetDeleteKelas.id}`) as HTMLFormElement;
				if (formEl) formEl.requestSubmit();
				closeDeleteModal();
			}}
		/>

		<form
			id={`delete-form-${targetDeleteKelas.id}`}
			action="?/deleteKelas"
			method="POST"
			use:enhance
			class="hidden"
		>
			<input type="hidden" name="id" value={targetDeleteKelas.id} />
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

		.hero-actions-group {
			width: 100%;
			flex-direction: column;
		}

		.btn-primary-action, .btn-secondary-action {
			width: 100%;
			justify-content: center;
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

	.btn-secondary-action {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: #ffffff;
		color: #4338ca;
		border: 1.5px solid #c7d2fe;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms ease;
	}

	.btn-secondary-action:hover {
		background: #e0e7ff;
		border-color: #818cf8;
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

	.icon-kelas { background: #e0e7ff; color: #4f46e5; }
	.icon-active { background: #dcfce7; color: #166534; }
	.icon-siswa { background: #e0f2fe; color: #0369a1; }
	.icon-mentor { background: #fef9c3; color: #a16207; }

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

	.kelas-name-cell {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mentors-chips-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.mentor-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
		border-radius: 6px;
		font-size: 11.5px;
		font-weight: 600;
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

	.count-pill-sky {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
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

	.status-pill--inactive {
		background: #f1f5f9;
		color: #64748b;
		border: 1px solid #cbd5e1;
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

	.action-btn--members:hover {
		background: #e0f2fe;
		color: #0369a1;
		border-color: #bae6fd;
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
		padding: 16px;
		overflow: visible;
	}

	.ta-selection-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	@media (max-width: 640px) {
		.ta-selection-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Mentors Checkbox Selection Grid */
	.mentors-checkbox-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	@media (max-width: 640px) {
		.mentors-checkbox-grid {
			grid-template-columns: 1fr;
		}
	}

	.mentor-select-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
		background: var(--bg-inset, #f8fafc);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.mentor-select-card:hover {
		border-color: var(--primary-border);
		background: #ffffff;
	}

	.mentor-select-card--checked {
		border-color: var(--primary);
		background: #e0e7ff;
	}

	.checkbox-input {
		width: 16px;
		height: 16px;
		accent-color: var(--primary);
		cursor: pointer;
	}

	.mentor-select-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.mentor-select-name {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mentor-select-user {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	/* Promotion Wizard Row Styles */
	.students-promote-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 360px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.student-promote-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
	}

	@media (max-width: 640px) {
		.student-promote-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.student-action-selector {
			width: 100%;
			justify-content: space-between;
		}
	}

	.student-info-col {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.student-name {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.student-nisn {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.student-action-selector {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.action-radio-option {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border: 1px solid var(--border-hard);
		border-radius: 6px;
		background: #ffffff;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.action-radio-option--active {
		background: #dcfce7;
		color: #166534;
		border-color: #86efac;
	}

	.action-radio-option--warning {
		background: #fef3c7;
		color: #92400e;
		border-color: #fde68a;
	}

	.action-radio-option--danger {
		background: #ffe4e6;
		color: #9f1239;
		border-color: #fecdd3;
	}

	.promotion-summary-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background: #f8fafc;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
		font-size: 12.5px;
		color: var(--text-primary);
		flex-wrap: wrap;
	}

	.matrix-card {
		overflow: visible !important;
	}

	.matrix-card-body {
		overflow: visible !important;
	}

	.matrix-table-wrap {
		width: 100%;
		overflow-x: auto;
		overflow-y: visible;
		min-height: 260px;
		padding-bottom: 90px;
	}

	.matrix-table-wrap td {
		position: relative;
	}

	.matrix-table-wrap tr:hover td {
		z-index: 10;
	}

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
		padding: 0 20px;
		background: #ffffff;
		color: var(--text-secondary);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-drawer-secondary:hover {
		background: var(--bg-inset, #f8fafc);
		color: var(--text-primary);
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

	.btn-primary-sm:hover:not(:disabled) {
		background: var(--primary-hover, #4338ca);
	}

	.btn-primary-sm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

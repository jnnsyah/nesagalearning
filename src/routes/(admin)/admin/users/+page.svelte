<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let rawItems = $derived(data.usersResult?.items ?? []);
	let stats = $derived(data.usersResult?.stats ?? { totalUsers: 0, siswaCount: 0, mentorCount: 0, guruCount: 0, adminCount: 0 });

	// Instant reactive filter state
	let searchVal = $state('');
	let roleFilter = $state('all');
	let statusFilter = $state('all');

	// Derived filtered items (Instant 0ms reactivity without page reload)
	let filteredItems = $derived.by(() => {
		return rawItems.filter((u) => {
			if (searchVal && searchVal.trim() !== '') {
				const q = searchVal.trim().toLowerCase();
				const matchName = u.fullName.toLowerCase().includes(q);
				const matchUser = u.username.toLowerCase().includes(q);
				const matchEmail = u.email?.toLowerCase().includes(q) ?? false;
				if (!matchName && !matchUser && !matchEmail) return false;
			}
			if (roleFilter !== 'all' && u.role !== roleFilter) return false;
			if (statusFilter === 'active' && !u.isActive) return false;
			if (statusFilter === 'inactive' && u.isActive) return false;
			return true;
		});
	});

	// Drawer state for Create / Edit
	let isFormDrawerOpen = $state(false);
	let editingUser = $state<any | null>(null);

	let formUsername = $state('');
	let formNisn = $state('');
	let formFullName = $state('');
	let formEmail = $state('');
	let formRole = $state('siswa');
	let formPassword = $state('');
	let formIsActive = $state(true);
	let formAngkatan = $state('');
	let formRombelLabel = $state('');

	// Reset Password Modal state
	let isResetModalOpen = $state(false);
	let targetResetUser = $state<any | null>(null);
	let resetNewPassword = $state('');

	// Toggle Status Confirm Modal state
	let isToggleStatusModalOpen = $state(false);
	let targetToggleUser = $state<any | null>(null);

	// Bulk Import Drawer state
	let isBulkDrawerOpen = $state(false);
	let bulkCsvText = $state('');
	let uploadedFileName = $state<string | null>(null);
	let uploadedFileSize = $state<string | null>(null);
	let bulkDefaultPassword = $state('NesagaSiswa2026!');
	let parsedBulkUsers = $state<Array<{ username: string; nisn?: string; fullName: string; email?: string; isDuplicate?: boolean }>>([]);

	// Sync form result toast notifications
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message);
		} else if (form?.message && !form?.success) {
			toast.error(form.message);
		}
	});

	// Clear NISN when role changes to guru or admin (NISN only applies to siswa/mentor)
	$effect(() => {
		if (formRole === 'guru' || formRole === 'admin') {
			formNisn = '';
		}
	});

	function openCreateDrawer() {
		editingUser = null;
		formUsername = '';
		formNisn = '';
		formFullName = '';
		formEmail = '';
		formRole = 'siswa';
		formPassword = '';
		formIsActive = true;
		formAngkatan = '';
		formRombelLabel = '';
		isFormDrawerOpen = true;
	}

	function openEditDrawer(userItem: any) {
		editingUser = userItem;
		formUsername = userItem.username;
		formNisn = userItem.nisn || '';
		formFullName = userItem.fullName;
		formEmail = userItem.email || '';
		formRole = userItem.role;
		formPassword = '';
		formIsActive = userItem.isActive;
		formAngkatan = userItem.angkatan ? userItem.angkatan.toString() : '';
		formRombelLabel = userItem.rombelLabel || '';
		isFormDrawerOpen = true;
	}

	function closeFormDrawer() {
		isFormDrawerOpen = false;
		editingUser = null;
	}

	function promptResetPassword(userItem: any) {
		targetResetUser = userItem;
		resetNewPassword = '';
		isResetModalOpen = true;
	}

	function closeResetModal() {
		isResetModalOpen = false;
		targetResetUser = null;
	}

	function promptToggleStatus(userItem: any) {
		targetToggleUser = userItem;
		isToggleStatusModalOpen = true;
	}

	function closeToggleStatusModal() {
		isToggleStatusModalOpen = false;
		targetToggleUser = null;
	}

	function openBulkDrawer() {
		bulkCsvText = '';
		parsedBulkUsers = [];
		isBulkDrawerOpen = true;
	}

	function closeBulkDrawer() {
		isBulkDrawerOpen = false;
		bulkCsvText = '';
		uploadedFileName = null;
		uploadedFileSize = null;
		parsedBulkUsers = [];
	}

	function removeUploadedFile() {
		uploadedFileName = null;
		uploadedFileSize = null;
		bulkCsvText = '';
		parsedBulkUsers = [];
		const fileInput = document.getElementById('csv-file-upload') as HTMLInputElement;
		if (fileInput) fileInput.value = '';
		toast.info('File lampiran dihapus.');
	}

	function downloadCsvTemplate() {
		const csvContent = 'nisn,username,nama_lengkap,email\n0081234501,siswa_01,Ahmad Fauzi,ahmad@nesaga.sch.id\n0081234502,siswa_02,Budi Santoso,budi@nesaga.sch.id\n0081234503,siswa_03,Citra Dewi Lestari,\n0081234504,siswa_04,Doni Pratama,doni@nesaga.sch.id';
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'template_impor_siswa_nlc.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success('Template CSV berhasil diunduh!');
	}

	function downloadExcelTemplate() {
		const excelXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Horizontal="Left"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Daftar Siswa NLC">
  <Table>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
   <Column ss:Width="200"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">nisn</Data></Cell>
    <Cell><Data ss:Type="String">username</Data></Cell>
    <Cell><Data ss:Type="String">nama_lengkap</Data></Cell>
    <Cell><Data ss:Type="String">email</Data></Cell>
   </Row>
   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="String">0081234501</Data></Cell>
    <Cell><Data ss:Type="String">siswa_01</Data></Cell>
    <Cell><Data ss:Type="String">Ahmad Fauzi</Data></Cell>
    <Cell><Data ss:Type="String">ahmad@nesaga.sch.id</Data></Cell>
   </Row>
   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="String">0081234502</Data></Cell>
    <Cell><Data ss:Type="String">siswa_02</Data></Cell>
    <Cell><Data ss:Type="String">Budi Santoso</Data></Cell>
    <Cell><Data ss:Type="String">budi@nesaga.sch.id</Data></Cell>
   </Row>
   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="String">0081234503</Data></Cell>
    <Cell><Data ss:Type="String">siswa_03</Data></Cell>
    <Cell><Data ss:Type="String">Citra Dewi Lestari</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="String">0081234504</Data></Cell>
    <Cell><Data ss:Type="String">siswa_04</Data></Cell>
    <Cell><Data ss:Type="String">Doni Pratama</Data></Cell>
    <Cell><Data ss:Type="String">doni@nesaga.sch.id</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

		const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'template_impor_siswa_nlc.xls');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success('Template Excel (.xls) berhasil diunduh!');
	}

	function fillSampleCsv() {
		bulkCsvText = `nisn,username,nama_lengkap,email
0081234501, siswa_01, Ahmad Fauzi, ahmad@nesaga.sch.id
0081234502, siswa_02, Budi Santoso, budi@nesaga.sch.id
0081234503, siswa_03, Citra Dewi Lestari, citra@nesaga.sch.id
0081234504, siswa_04, Doni Pratama, doni@nesaga.sch.id
0081234505, siswa_05, Eka Nurul Hidayah,`;
		parseCsvInput();
		toast.success('Contoh data berhasil dimuat!');
	}

	function handleCsvFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target?.files?.[0];
		if (!file) return;

		uploadedFileName = file.name;
		uploadedFileSize = (file.size / 1024).toFixed(1) + ' KB';

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			if (text) {
				bulkCsvText = text;
				parseCsvInput();
				toast.success(`File ${file.name} berhasil dibaca!`);
			}
		};
		reader.readAsText(file);
	}

	function parseCsvInput() {
		if (!bulkCsvText || bulkCsvText.trim() === '') {
			parsedBulkUsers = [];
			return;
		}

		const results: Array<{ username: string; nisn?: string; fullName: string; email?: string; isDuplicate?: boolean }> = [];
		const existingUsernames = new Set(rawItems.map((u) => u.username.toLowerCase()));
		const existingNisns = new Set(rawItems.filter((u) => u.nisn).map((u) => String(u.nisn)));
		const seenUsernames = new Set<string>();
		const seenNisns = new Set<string>();

		// If XML Spreadsheet (.xls) format detected
		if (bulkCsvText.includes('<Workbook') || bulkCsvText.includes('<Table>')) {
			const rowMatches = bulkCsvText.match(/<Row[^>]*>([\s\S]*?)<\/Row>/gi) || [];
			for (const rowXml of rowMatches) {
				const cellMatches = rowXml.match(/<Data[^>]*>([\s\S]*?)<\/Data>/gi) || [];
				const cells = cellMatches.map((c) => c.replace(/<\/?Data[^>]*>/gi, '').trim());
				if (cells.length >= 2) {
					let nisnVal = '';
					let userVal = '';
					let nameVal = '';
					let emailVal = '';

					if (cells.length >= 4) {
						nisnVal = cells[0].trim();
						userVal = cells[1].replace(/^@/, '').toLowerCase().trim();
						nameVal = cells[2].trim();
						emailVal = cells[3].trim();
					} else if (cells.length === 3) {
						userVal = cells[0].replace(/^@/, '').toLowerCase().trim();
						nameVal = cells[1].trim();
						emailVal = cells[2].trim();
					} else {
						userVal = cells[0].replace(/^@/, '').toLowerCase().trim();
						nameVal = cells[1].trim();
					}

					// Skip header
					if (userVal === 'username' || nisnVal.toLowerCase() === 'nisn') continue;

					if (userVal && nameVal) {
						const isDup = existingUsernames.has(userVal) ||
							seenUsernames.has(userVal) ||
							(nisnVal ? (existingNisns.has(nisnVal) || seenNisns.has(nisnVal)) : false);
						seenUsernames.add(userVal);
						if (nisnVal) seenNisns.add(nisnVal);
						results.push({ username: userVal, nisn: nisnVal || undefined, fullName: nameVal, email: emailVal, isDuplicate: isDup });
					}
				}
			}
			parsedBulkUsers = results;
			return;
		}

		// Standard CSV / Tab-delimited parsing
		const lines = bulkCsvText.trim().split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
			if (parts.length >= 2) {
				let nisnVal = '';
				let userVal = '';
				let nameVal = '';
				let emailVal = '';

				if (parts.length >= 4) {
					nisnVal = parts[0].trim();
					userVal = parts[1].replace(/^@/, '').toLowerCase().trim();
					nameVal = parts[2].trim();
					emailVal = parts[3].trim();
				} else if (parts.length === 3) {
					// Check if first col is a 8-12 digit NISN
					if (/^\d{8,12}$/.test(parts[0])) {
						nisnVal = parts[0];
						userVal = `siswa_${parts[0].slice(-4)}`;
						nameVal = parts[1];
						emailVal = parts[2];
					} else {
						userVal = parts[0].replace(/^@/, '').toLowerCase().trim();
						nameVal = parts[1];
						emailVal = parts[2];
					}
				} else {
					userVal = parts[0].replace(/^@/, '').toLowerCase().trim();
					nameVal = parts[1];
				}

				// Skip header row if detected
				if (userVal === 'username' || nisnVal.toLowerCase() === 'nisn' || nameVal.toLowerCase().includes('nama')) {
					continue;
				}

				if (userVal && nameVal) {
					const isDup = existingUsernames.has(userVal) ||
						seenUsernames.has(userVal) ||
						(nisnVal ? (existingNisns.has(nisnVal) || seenNisns.has(nisnVal)) : false);
					seenUsernames.add(userVal);
					if (nisnVal) seenNisns.add(nisnVal);
					results.push({ username: userVal, nisn: nisnVal || undefined, fullName: nameVal, email: emailVal, isDuplicate: isDup });
				}
			}
		}

		parsedBulkUsers = results;
	}

	function handleSearchSubmit(e: Event) {
		e.preventDefault();
		applyFilters();
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchVal && searchVal.trim() !== '') params.set('search', searchVal.trim());
		if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
		if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
		
		const url = `/admin/users${params.toString() ? '?' + params.toString() : ''}`;
		goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}
</script>

<svelte:head>
	<title>Manajemen User & Akun — Admin NLC</title>
</svelte:head>

<div class="page-container">
	<!-- Hero Title Banner -->
	<header class="hero-banner">
		<div class="hero-banner__inner">
			<div>
				<div class="flex items-center gap-2 mb-1.5">
					<span class="badge badge-live">CONTROL CENTER</span>
					<span class="type-mono text-muted">ADMINISTRATION</span>
				</div>
				<h1 class="hero-title">Manajemen User &amp; Akun Sistem</h1>
				<p class="hero-desc">
					Kelola akun Siswa, Mentor, Guru Supervisor, dan Administrator Nesaga Learning Community.
				</p>
			</div>
			<div class="flex items-center gap-2 flex-wrap mt-4 sm:mt-0">
				<button
					type="button"
					onclick={openBulkDrawer}
					class="btn-secondary-sm flex items-center gap-1.5"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
					<span>Impor Massal Siswa</span>
				</button>
				<button
					type="button"
					onclick={openCreateDrawer}
					class="btn-primary-sm flex items-center gap-1.5"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					<span>Tambah User Baru</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Key Metrics Grid -->
	<section class="stats-grid mt-6">
		<div class="stat-card">
			<div class="stat-card__icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Total User Terdaftar</div>
				<div class="stat-card__value">{stats.totalUsers}</div>
				<div class="stat-card__meta">Semua Pengguna Terregistrasi</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-card__icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Siswa (Learner)</div>
				<div class="stat-card__value">{stats.siswaCount}</div>
				<div class="stat-card__meta">Anggota Pembelajar TKJ</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-card__icon" style="background: #fef3c7; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Mentor &amp; Guru</div>
				<div class="stat-card__value">{stats.mentorCount + stats.guruCount}</div>
				<div class="stat-card__meta">{stats.mentorCount} Mentor · {stats.guruCount} Guru Supervisor</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-card__icon" style="background: #f3e8ff; color: #9333ea;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			</div>
			<div class="stat-card__body">
				<div class="stat-card__label">Administrator</div>
				<div class="stat-card__value">{stats.adminCount}</div>
				<div class="stat-card__meta">Super Admin Sistem</div>
			</div>
		</div>
	</section>

	<!-- Filter Bar -->
	<section class="mt-6">
		<FilterBar>
			{#snippet search()}
				<form onsubmit={handleSearchSubmit} class="w-full">
					<TextInput
						bind:value={searchVal}
						placeholder="Cari berdasarkan Username, Nama Lengkap, atau Email..."
						clearable
					/>
				</form>
			{/snippet}

			{#snippet filters()}
				<CustomSelect
					bind:value={roleFilter}
					options={[
						{ value: 'all', label: 'Semua Role' },
						{ value: 'siswa', label: 'Siswa' },
						{ value: 'mentor', label: 'Mentor' },
						{ value: 'guru', label: 'Guru' },
						{ value: 'admin', label: 'Admin' }
					]}
				/>

				<CustomSelect
					bind:value={statusFilter}
					options={[
						{ value: 'all', label: 'Semua Status' },
						{ value: 'active', label: 'Aktif' },
						{ value: 'inactive', label: 'Nonaktif' }
					]}
				/>
			{/snippet}
		</FilterBar>
	</section>

	<!-- Data Table View -->
	<section class="panel mt-6">
		<div class="table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Pengguna</th>
						<th>Username</th>
						<th>NISN</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Terdaftar Pada</th>
						<th class="text-right">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredItems.length === 0}
						<tr>
							<td colspan="8" class="empty-table-cell">
								<div class="empty-state-box">
									<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
									<p class="font-bold text-slate-800 text-sm mt-2">User Tidak Ditemukan</p>
									<p class="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau filter role/status.</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each filteredItems as u}
							<tr class="table-row hover:bg-slate-50 transition">
								<td>
									<div class="flex items-center gap-3">
										<div class="avatar-sm">
											{u.fullName.charAt(0).toUpperCase()}
										</div>
										<div>
											<span class="font-bold text-slate-800 text-sm block">{u.fullName}</span>
											<span class="type-mono text-muted text-xs">ID #{u.id}</span>
										</div>
									</div>
								</td>
								<td class="type-mono font-medium text-slate-700">@{u.username}</td>
								<td class="type-mono text-xs text-slate-700">{u.nisn || '-'}</td>
								<td class="text-slate-600 text-xs">{u.email || '-'}</td>
								<td>
									{#if u.role === 'admin'}
										<span class="badge badge-purple">ADMIN</span>
									{:else if u.role === 'guru'}
										<span class="badge badge-amber">GURU</span>
									{:else if u.role === 'mentor'}
										<span class="badge badge-live">MENTOR</span>
									{:else}
										<span class="badge badge-hadir">SISWA</span>
									{/if}
								</td>
								<td>
									<div
										onclick={() => promptToggleStatus(u)}
										role="presentation"
										class="inline-block cursor-pointer"
										title="Klik slider untuk mengubah status aktif/nonaktif akun"
									>
										<div class="pointer-events-none">
											<ToggleSwitch
												checked={u.isActive}
												onLabel="Aktif"
												offLabel="Nonaktif"
											/>
										</div>
									</div>
								</td>
								<td class="type-mono text-slate-500 text-xs">
									{new Date(u.createdAt).toLocaleDateString('id-ID', {
										day: '2-digit',
										month: 'short',
										year: 'numeric'
									})}
								</td>
								<td class="text-right">
									<div class="flex items-center justify-end gap-1.5">
										<button
											type="button"
											onclick={() => promptResetPassword(u)}
											class="btn-ghost-icon text-amber-600 hover:bg-amber-50"
											title="Reset Password User"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openEditDrawer(u)}
											class="btn-ghost-icon text-indigo-600 hover:bg-indigo-50"
											title="Edit Data User"
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Footer Count Info -->
		<div class="pagination-footer">
			<span class="text-xs text-slate-500">
				Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{rawItems.length}</strong> user terdaftar
			</span>
		</div>
	</section>
</div>

<!-- Drawer Create / Edit User -->
{#if isFormDrawerOpen}
	<FormDrawer
		open={isFormDrawerOpen}
		title={editingUser ? `Edit User: @${editingUser.username}` : 'Tambah Pengguna Baru'}
		subtitle={editingUser ? 'Perbarui informasi profil, role, atau ubah password akun.' : 'Daftarkan akun pengguna baru ke dalam platform NLC.'}
		size="lg"
		onclose={closeFormDrawer}
	>
		{#snippet children()}
			<form
				id="user-drawer-form"
				action={editingUser ? '?/update' : '?/create'}
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
				{#if editingUser}
					<input type="hidden" name="id" value={editingUser.id} />
					<input type="hidden" name="username" value={formUsername} />
				{/if}

				<!-- Card 1: Identitas & Peran Pengguna -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">1. Identitas &amp; Peran Pengguna</h4>
							<p class="drawer-card__desc">Pilih role, username, NISN, dan detail profil akun</p>
						</div>
					</div>
					<div class="drawer-card__body flex flex-col gap-3.5 p-4">
						<CustomSelect
							name="role"
							label="Pilih Role Pengguna"
							bind:value={formRole}
							options={[
								{ value: 'siswa', label: 'Siswa (Peserta Belajar)', description: 'Akses modul materi, presensi QR, tugas, dan poin' },
								{ value: 'mentor', label: 'Mentor (Senior/Pengajar)', description: 'Akses manajemen sesi, QR scanner, dan review tugas' },
								{ value: 'guru', label: 'Guru (Pembimbing)', description: 'Akses monitoring presensi, laporan, dan evaluasi' },
								{ value: 'admin', label: 'Admin (System Administrator)', description: 'Akses penuh seluruh pengaturan dan manajemen data' }
							]}
						/>

						<TextInput
							name="username"
							label="Username"
							required
							bind:value={formUsername}
							placeholder="contoh: ahmad_tkj"
							disabled={!!editingUser}
							hint={editingUser ? 'Username tidak dapat diubah setelah dibuat.' : 'Gunakan huruf kecil, angka, atau underscore.'}
						/>

						{#if formRole === 'siswa' || formRole === 'mentor'}
							<TextInput
								name="nisn"
								label="NISN (Nomor Induk Siswa Nasional)"
								required={formRole === 'siswa'}
								bind:value={formNisn}
								placeholder="Contoh: 0081234567 (10 Digit)"
								clearable
								hint={formRole === 'siswa' ? 'Nomor identitas siswa (wajib diisi).' : 'Opsional — diisi jika mentor merupakan alumni dengan NISN.'}
							/>
						{/if}

						<TextInput
							name="fullName"
							label="Nama Lengkap"
							required
							bind:value={formFullName}
							placeholder="Contoh: Ahmad Fauzi"
						/>

						<TextInput
							name="email"
							label="Email Sekolah / Pribadi"
							type="email"
							bind:value={formEmail}
							placeholder="ahmad@nesaga.sch.id"
							clearable
							hint="Opsional, digunakan untuk notifikasi akun."
						/>

						{#if formRole === 'siswa' || formRole === 'mentor'}
							<CustomSelect
								name="angkatan"
								label="Tahun Angkatan (Cohort)"
								bind:value={formAngkatan}
								options={(data.options?.angkatanList || []).map((a) => ({
									value: String(a.year),
									label: `Angkatan ${a.year}`
								}))}
							/>

							<CustomSelect
								name="rombelLabel"
								label="Label Kelas Formal (Rombel Sekolah)"
								bind:value={formRombelLabel}
								options={(data.options?.rombelList || []).map((r) => ({
									value: r.name,
									label: r.name
								}))}
							/>
						{/if}
					</div>
				</div>

				<!-- Card 2: Keamanan & Status Akun -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-emerald-600 bg-emerald-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">2. Keamanan &amp; Status Akun</h4>
							<p class="drawer-card__desc">Password dan izin login sistem</p>
						</div>
					</div>
					<div class="drawer-card__body flex flex-col gap-3.5 p-4">
						<TextInput
							name="password"
							label={editingUser ? 'Ubah Password (Opsional)' : 'Password Akun'}
							type="password"
							required={!editingUser}
							bind:value={formPassword}
							placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
						/>

						<div class="pt-1">
							<ToggleSwitch
								name="isActive"
								label="Status Akun Aktif"
								description="Jika dinonaktifkan, user tidak akan dapat login ke sistem."
								bind:checked={formIsActive}
								onLabel="Aktif"
								offLabel="Nonaktif"
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
						const formEl = document.getElementById('user-drawer-form') as HTMLFormElement;
						if (formEl) formEl.requestSubmit();
					}}
					class="btn-primary-sm px-5 py-2"
				>
					{editingUser ? 'Simpan Perubahan' : 'Daftarkan User Baru'}
				</button>
			</div>
		{/snippet}
	</FormDrawer>
{/if}

<!-- Reset Password Modal -->
{#if isResetModalOpen && targetResetUser}
	<ConfirmModal
		open={isResetModalOpen}
		title={`Reset Password: @${targetResetUser.username}`}
		message={`Masukkan password baru untuk user ${targetResetUser.fullName}. User dapat langsung login dengan password baru ini.`}
		confirmText="Setel Password Baru"
		cancelText="Batal"
		variant="warning"
		oncancel={closeResetModal}
		onconfirm={() => {
			const formEl = document.getElementById('reset-password-form') as HTMLFormElement;
			if (formEl) formEl.requestSubmit();
		}}
	>
		<form
			id="reset-password-form"
			action="?/resetPassword"
			method="POST"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						closeResetModal();
					}
				};
			}}
			class="mt-3 space-y-3"
		>
			<input type="hidden" name="userId" value={targetResetUser.id} />
			<TextInput
				name="newPassword"
				label="Password Baru"
				type="password"
				required
				bind:value={resetNewPassword}
				placeholder="Minimal 6 karakter"
			/>
		</form>
	</ConfirmModal>
{/if}

<!-- Toggle Status Confirm Modal -->
{#if isToggleStatusModalOpen && targetToggleUser}
	<ConfirmModal
		open={isToggleStatusModalOpen}
		title={targetToggleUser.isActive ? `Nonaktifkan Akun: @${targetToggleUser.username}` : `Aktifkan Akun: @${targetToggleUser.username}`}
		message={targetToggleUser.isActive
			? `Apakah Anda yakin ingin MENONAKTIFKAN akun ${targetToggleUser.fullName} (@${targetToggleUser.username})? User yang nonaktif tidak akan dapat melakukan login ke sistem.`
			: `Apakah Anda yakin ingin MENGAKTIFKAN kembali akun ${targetToggleUser.fullName} (@${targetToggleUser.username})? User akan dapat kembali login ke sistem.`}
		confirmText={targetToggleUser.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
		cancelText="Batal"
		variant={targetToggleUser.isActive ? 'danger' : 'info'}
		oncancel={closeToggleStatusModal}
		onconfirm={() => {
			const formEl = document.getElementById('toggle-status-form') as HTMLFormElement;
			if (formEl) formEl.requestSubmit();
		}}
	/>
	<div class="hidden">
		<form
			id="toggle-status-form"
			action="?/toggleStatus"
			method="POST"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update({ reset: false });
					closeToggleStatusModal();
				};
			}}
		>
			<input type="hidden" name="userId" value={targetToggleUser.id} />
		</form>
	</div>
{/if}

<!-- Bulk Import Siswa Drawer -->
{#if isBulkDrawerOpen}
	<FormDrawer
		open={isBulkDrawerOpen}
		title="Impor Massal Akun Siswa"
		subtitle="Daftarkan akun siswa sekaligus dengan mudah menggunakan file CSV atau salin-tempel Excel."
		onclose={closeBulkDrawer}
	>
		{#snippet children()}
			<form
				id="bulk-import-form"
				action="?/bulkImport"
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeBulkDrawer();
						}
					};
				}}
				class="drawer-form-layout"
			>
				<!-- Section 1: Template & Panduan -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-indigo-600 bg-indigo-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">1. Panduan & Template Format</h4>
							<p class="drawer-card__desc">Format kolom: <code>username, nama_lengkap, email(opsional)</code></p>
						</div>
					</div>
					<div class="drawer-card__body space-y-3">
						<div class="flex items-center flex-wrap gap-2">
							<button
								type="button"
								onclick={downloadExcelTemplate}
								class="btn-template-action text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/></svg>
								<span>Unduh Template .XLS (Excel)</span>
							</button>
							<button
								type="button"
								onclick={downloadCsvTemplate}
								class="btn-template-action text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								<span>Unduh Template .CSV</span>
							</button>
							<button
								type="button"
								onclick={fillSampleCsv}
								class="btn-template-action text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
								<span>Salin Contoh Data</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Section 2: Input CSV / File Lampiran -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-emerald-600 bg-emerald-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">2. {uploadedFileName ? 'File Terlampir' : 'Unggah File atau Ketik Data'}</h4>
							<p class="drawer-card__desc">
								{uploadedFileName ? 'File berhasil dibaca & data otomatis di-parsing ke tabel preview' : 'Pilih file .CSV/.XLS atau tempelkan teks langsung dari Excel'}
							</p>
						</div>
					</div>
					<div class="drawer-card__body space-y-3.5">
						{#if uploadedFileName}
							<!-- Attached File Card Pill -->
							<div class="attached-file-box">
								<div class="flex items-center gap-3">
									<div class="file-badge-icon">
										<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
											<path d="M9 15l2 2 4-4" />
										</svg>
									</div>
									<div>
										<div class="flex items-center gap-2">
											<span class="font-bold text-slate-800 text-xs">{uploadedFileName}</span>
											{#if uploadedFileSize}
												<span class="type-mono text-[10px] text-slate-400">({uploadedFileSize})</span>
											{/if}
										</div>
										<div class="flex items-center gap-2 mt-0.5">
											<span class="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												{parsedBulkUsers.filter((u) => !u.isDuplicate).length} calon siswa siap ditambah
											</span>
										</div>
									</div>
								</div>
								<button
									type="button"
									onclick={removeUploadedFile}
									class="btn-remove-file"
									title="Hapus / Ganti File"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
									<span>Ganti File</span>
								</button>
							</div>
						{:else}
							<!-- File Upload Drop Box -->
							<div class="file-dropzone">
								<input
									id="csv-file-upload"
									type="file"
									accept=".csv,.xls,.xlsx,.txt"
									onchange={handleCsvFileUpload}
									class="file-dropzone__input"
								/>
								<label for="csv-file-upload" class="file-dropzone__label">
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
									<span class="text-xs font-semibold text-slate-700">Klik untuk memilih file <strong>.CSV</strong> atau <strong>.XLS (Excel)</strong> dari komputer</span>
								</label>
							</div>

							<!-- Textarea Editor -->
							<div>
								<label for="bulk-csv-input" class="field-label-sm mb-1 block">
									Atau Tempelkan Teks CSV / Excel di sini:
								</label>
								<textarea
									id="bulk-csv-input"
									rows={5}
									bind:value={bulkCsvText}
									oninput={parseCsvInput}
									placeholder="siswa_01, Ahmad Fauzi, ahmad@nesaga.sch.id&#10;siswa_02, Budi Santoso, budi@nesaga.sch.id"
									class="csv-textarea"
								></textarea>
							</div>
						{/if}
					</div>
				</div>

				<!-- Section 3: Konfigurasi Password & Live Preview -->
				<div class="drawer-card">
					<div class="drawer-card__header">
						<div class="drawer-card__icon text-purple-600 bg-purple-50">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						</div>
						<div>
							<h4 class="drawer-card__title">3. Password Default & Live Preview</h4>
							<p class="drawer-card__desc">Password standar awal & verifikasi baris data</p>
						</div>
					</div>
					<div class="drawer-card__body space-y-3.5">
						<TextInput
							name="defaultPassword"
							type="password"
							label="Password Default Akun Baru"
							required
							bind:value={bulkDefaultPassword}
							placeholder="NesagaSiswa2026!"
							hint="Siswa dapat mengubah password ini setelah login pertama kali."
						/>

						<!-- Live Preview Table -->
						{#if parsedBulkUsers.length > 0}
							<div class="preview-panel mt-2">
								<div class="preview-panel__header">
									<span class="font-bold text-slate-800 text-xs">
										Calon Akun: <strong>{parsedBulkUsers.filter((u) => !u.isDuplicate).length} Siswa Siap Ditambah</strong>
									</span>
									{#if parsedBulkUsers.some((u) => u.isDuplicate)}
										<span class="badge-status-duplikat">
											{parsedBulkUsers.filter((u) => u.isDuplicate).length} Duplikat (Diabaikan)
										</span>
									{:else}
										<span class="badge-status-valid">
											Semua Valid
										</span>
									{/if}
								</div>

								<div class="preview-table-wrap">
									<table class="preview-table">
										<thead>
											<tr>
												<th class="w-8 text-center">#</th>
												<th>Username</th>
												<th>NISN</th>
												<th>Nama Lengkap</th>
												<th>Email</th>
												<th class="text-center">Status</th>
											</tr>
										</thead>
										<tbody>
											{#each parsedBulkUsers as pu, idx}
												<tr class={pu.isDuplicate ? 'row-duplikat' : ''}>
													<td class="text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
													<td class="font-mono text-indigo-700 font-bold">@{pu.username}</td>
													<td class="font-mono text-slate-600 text-[11px]">{pu.nisn || '-'}</td>
													<td class="font-semibold text-slate-800">{pu.fullName}</td>
													<td class="text-slate-500 font-mono text-[11px]">{pu.email || '-'}</td>
													<td class="text-center">
														{#if pu.isDuplicate}
															<span class="badge-row-duplikat">Duplikat</span>
														{:else}
															<span class="badge-row-ready">Siap Dibuat</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<input type="hidden" name="usersJson" value={JSON.stringify(parsedBulkUsers.filter((u) => !u.isDuplicate))} />
			</form>
		{/snippet}

		{#snippet footer()}
			<div class="flex items-center justify-end gap-3 w-full">
				<button type="button" onclick={closeBulkDrawer} class="btn-secondary-sm px-4 py-2">
					Batal
				</button>
				<button
					type="button"
					onclick={() => {
						const formEl = document.getElementById('bulk-import-form') as HTMLFormElement;
						if (formEl) formEl.requestSubmit();
					}}
					disabled={parsedBulkUsers.filter((u) => !u.isDuplicate).length === 0}
					class="btn-primary-sm px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Impor {parsedBulkUsers.filter((u) => !u.isDuplicate).length} Akun Siswa
				</button>
			</div>
		{/snippet}
	</FormDrawer>
{/if}

<style>
	.page-container {
		padding: 24px 28px 48px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.hero-banner {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		padding: 24px 28px;
		box-shadow: var(--shadow-sm);
	}

	.hero-banner__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: 1.65rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.hero-desc {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 540px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
	}

	.stat-card__icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
		margin-top: 2px;
	}

	.stat-card__meta {
		font-size: 10px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	/* Table */
	.table-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	.data-table th {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.data-table td {
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-hard);
		vertical-align: middle;
	}

	.avatar-sm {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
		color: #ffffff;
		font-weight: 800;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-primary-sm {
		background: #4f46e5;
		color: #ffffff;
		font-size: 12px;
		font-weight: 700;
		padding: 8px 14px;
		border-radius: var(--radius-md);
		transition: background 150ms ease;
	}

	.btn-primary-sm:hover {
		background: #4338ca;
	}

	.btn-secondary-sm {
		background: #f1f5f9;
		color: #334155;
		font-size: 12px;
		font-weight: 700;
		padding: 8px 14px;
		border-radius: var(--radius-md);
		border: 1px solid #cbd5e1;
		transition: background 150ms ease;
	}

	.btn-secondary-sm:hover {
		background: #e2e8f0;
	}

	.btn-ghost-sm {
		font-size: 12px;
		font-weight: 600;
		color: #64748b;
		padding: 8px 14px;
		border-radius: var(--radius-md);
	}

	.btn-ghost-sm:hover {
		background: #f1f5f9;
	}

	.btn-ghost-icon {
		padding: 6px;
		border-radius: var(--radius-sm);
		transition: background 150ms ease;
	}

	.badge-purple {
		background: #f3e8ff;
		color: #7e22ce;
	}

	.badge-amber {
		background: #fef3c7;
		color: #b45309;
	}

	.empty-table-cell {
		padding: 48px 24px;
		text-align: center;
	}

	.empty-state-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: #94a3b8;
	}

	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-top: 1px solid var(--border-hard);
		background: #ffffff;
	}

	.page-nav-btn {
		font-size: 12px;
		font-weight: 700;
		color: #4f46e5;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		background: #e0e7ff;
	}

	.page-nav-btn:hover {
		background: #c7d2fe;
	}

	/* Premium Drawer Form Layout Styles */
	.drawer-form-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.drawer-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 18px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.drawer-card__header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.drawer-card__icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.drawer-card__title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.drawer-card__desc {
		font-size: 11.5px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.drawer-card__desc code {
		background: #f1f5f9;
		color: #475569;
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 11px;
	}

	.drawer-card__body {
		width: 100%;
	}

	.btn-template-action {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		padding: 7px 12px;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.file-dropzone {
		position: relative;
		border: 1.5px dashed #cbd5e1;
		border-radius: var(--radius-md);
		background: #f8fafc;
		transition: all 150ms ease;
	}

	.file-dropzone:hover {
		border-color: #6366f1;
		background: #f5f3ff;
	}

	.file-dropzone__input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.file-dropzone__label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px 20px;
		cursor: pointer;
	}

	.field-label-sm {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.csv-textarea {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.5;
		padding: 10px 12px;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		outline: none;
		transition: border-color 150ms ease, background 150ms ease;
	}

	.csv-textarea:focus {
		border-color: var(--primary);
		background: #ffffff;
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.preview-panel {
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: #ffffff;
	}

	.preview-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		background: #f8fafc;
		border-bottom: 1px solid var(--border-hard);
	}

	.badge-status-duplikat {
		font-size: 10px;
		font-weight: 800;
		color: #e11d48;
		background: #ffe4e6;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.badge-status-valid {
		font-size: 10px;
		font-weight: 800;
		color: #059669;
		background: #d1fae5;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.preview-table-wrap {
		max-height: 200px;
		overflow-y: auto;
	}

	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.preview-table th {
		position: sticky;
		top: 0;
		background: #f1f5f9;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		padding: 8px 10px;
		border-bottom: 1px solid var(--border-hard);
		z-index: 1;
	}

	.preview-table td {
		padding: 8px 10px;
		border-bottom: 1px solid var(--border-subtle);
		vertical-align: middle;
	}

	.row-duplikat {
		background: #fff1f2;
	}

	.badge-row-duplikat {
		font-size: 10px;
		font-weight: 700;
		color: #be123c;
		background: #ffe4e6;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge-row-ready {
		font-size: 10px;
		font-weight: 700;
		color: #047857;
		background: #d1fae5;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.attached-file-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		background: #f0fdf4;
		border: 1.5px solid #86efac;
		border-radius: var(--radius-md);
		animation: fadeIn 150ms ease;
	}

	.file-badge-icon {
		width: 36px;
		height: 36px;
		background: #ffffff;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.btn-remove-file {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11.5px;
		font-weight: 700;
		color: #e11d48;
		background: #ffffff;
		border: 1px solid #fecdd3;
		padding: 5px 10px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 120ms ease;
	}

	.btn-remove-file:hover {
		background: #ffe4e6;
		color: #be123c;
	}
</style>

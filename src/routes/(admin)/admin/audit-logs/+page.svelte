<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import { toast } from '$lib/stores/toast';

	let { data } = $props();

	let searchVal = $state(data.filters.search || '');
	let selectedRole = $state(data.filters.role || 'all');
	let selectedAction = $state(data.filters.action || 'all');
	let dateFrom = $state(data.filters.dateFrom || '');
	let dateTo = $state(data.filters.dateTo || '');

	let selectedLog = $state<any>(null);
	let isDetailDrawerOpen = $state(false);

	const roleOptions = [
		{ value: 'all', label: 'Semua Peran Aktor' },
		{ value: 'admin', label: 'Administrator' },
		{ value: 'mentor', label: 'Mentor' },
		{ value: 'guru', label: 'Guru Supervisi' },
		{ value: 'siswa', label: 'Siswa / Peserta' },
		{ value: 'system', label: 'Sistem Otomatis' }
	];

	const actionOptions = [
		{ value: 'all', label: 'Semua Jenis Aksi' },
		{ value: 'LOGIN_FAILED', label: 'Login Gagal' },
		{ value: 'RESET_PASSWORD', label: 'Reset Password' },
		{ value: 'MANUAL_ATTENDANCE_EDIT', label: 'Edit Presensi Manual' },
		{ value: 'DELETE_MATERIAL', label: 'Hapus Materi' },
		{ value: 'CREATE_USER', label: 'Tambah User Baru' },
		{ value: 'UPDATE_MASTER_DATA', label: 'Update Master Data' },
		{ value: 'DATABASE_SEED', label: 'Database Seed' }
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchVal.trim()) params.set('search', searchVal.trim());
		if (selectedRole !== 'all') params.set('role', selectedRole);
		if (selectedAction !== 'all') params.set('action', selectedAction);
		if (dateFrom) params.set('dateFrom', dateFrom);
		if (dateTo) params.set('dateTo', dateTo);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function resetFilters() {
		searchVal = '';
		selectedRole = 'all';
		selectedAction = 'all';
		dateFrom = '';
		dateTo = '';
		goto('/admin/audit-logs');
	}

	function openDetailDrawer(item: any) {
		selectedLog = item;
		isDetailDrawerOpen = true;
	}

	function getActionMeta(action: string) {
		switch (action) {
			case 'LOGIN_FAILED':
			case 'UNAUTHORIZED_ACCESS':
				return { label: 'Login Gagal', bg: '#fee2e2', color: '#dc2626' };
			case 'RESET_PASSWORD':
				return { label: 'Reset Password', bg: '#ffedd5', color: '#c2410c' };
			case 'DELETE_MATERIAL':
			case 'DELETE_USER':
				return { label: 'Hapus Entitas', bg: '#fef2f2', color: '#991b1b' };
			case 'MANUAL_ATTENDANCE_EDIT':
				return { label: 'Edit Presensi Manual', bg: '#fef9c3', color: '#a16207' };
			case 'CREATE_USER':
				return { label: 'Tambah User', bg: '#dcfce7', color: '#15803d' };
			case 'UPDATE_MASTER_DATA':
				return { label: 'Update Master Data', bg: '#e0f2fe', color: '#0369a1' };
			case 'DATABASE_SEED':
				return { label: 'Database Seed', bg: '#f3e8ff', color: '#7e22ce' };
			default:
				return { label: action || 'Aktivitas Sistem', bg: '#f1f5f9', color: '#475569' };
		}
	}

	function formatDateTime(dateInput: Date | string): string {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatKeyLabel(key: string): string {
		return key
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, (str) => str.toUpperCase())
			.replace(/_/g, ' ');
	}

	function copyToClipboard(text: string) {
		if (typeof window !== 'undefined' && navigator?.clipboard) {
			navigator.clipboard.writeText(text);
			toast.success('Payload audit log berhasil disalin ke clipboard!');
		}
	}
</script>

<svelte:head>
	<title>Audit Log Stream | Admin Console NLC</title>
	<meta name="description" content="Riwayat pemantauan audit log stream aktivitas penting sistem NLC" />
</svelte:head>

<div class="audit-logs-page">
	<!-- ══════════════════════════════════════════════════════════
	     1. HEADER / HERO TITLE BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="audit-hero">
		<div class="hero-content">
			<div class="hero-text-area">
				<div class="hero-title-row">
					<h1 class="hero-title">Audit Log Stream System</h1>
					<span class="badge badge--live">
						● LIVE AUDIT STREAM
					</span>
				</div>
				<p class="hero-subtitle">
					Pemantauan & jejak audit real-time seluruh aktivitas penting sistem (login, presensi manual, reset password, & master data).
				</p>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (.stats-grid)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Statistik Audit Log">
		<div class="stat-card">
			<div class="stat-icon-box icon-logs">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
					<line x1="16" y1="13" x2="8" y2="13"/>
					<line x1="16" y1="17" x2="8" y2="17"/>
					<polyline points="10 9 9 9 8 9"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.auditLogsData.stats.totalLogsCount}</span>
				<span class="stat-label">Total Log Sistem</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-today">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
					<line x1="16" y1="2" x2="16" y2="6"/>
					<line x1="8" y1="2" x2="8" y2="6"/>
					<line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.auditLogsData.stats.todayLogsCount} Log</span>
				<span class="stat-label">Aktivitas Hari Ini</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-security">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.auditLogsData.stats.securityAlertsCount} Event</span>
				<span class="stat-label">Peringatan Keamanan</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon-box icon-admin">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
					<circle cx="12" cy="7" r="4"/>
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.auditLogsData.stats.adminActionsCount} Aksi</span>
				<span class="stat-label">Aktivitas Administrator</span>
			</div>
		</div>
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     3. FILTER BAR ($lib/components/ui/FilterBar.svelte)
	     ══════════════════════════════════════════════════════════ -->
	<FilterBar>
		{#snippet search()}
			<div class="flex items-center gap-2">
				<div class="flex-1">
					<TextInput
						name="search"
						placeholder="Cari log (Nama Aktor / Username / Jenis Aksi / Entitas)…"
						bind:value={searchVal}
						clearable
					/>
				</div>
				<button type="button" onclick={applyFilters} class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<span>Terapkan</span>
				</button>
				<button type="button" onclick={resetFilters} class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer flex-shrink-0">
					Reset
				</button>
			</div>
		{/snippet}

		{#snippet filters()}
			<CustomSelect
				name="role"
				options={roleOptions}
				bind:value={selectedRole}
			/>

			<CustomSelect
				name="action"
				options={actionOptions}
				bind:value={selectedAction}
			/>

			<DatePicker
				name="dateFrom"
				placeholder="Tanggal Mulai"
				bind:value={dateFrom}
			/>

			<DatePicker
				name="dateTo"
				placeholder="Tanggal Akhir"
				bind:value={dateTo}
			/>
		{/snippet}
	</FilterBar>

	<!-- ══════════════════════════════════════════════════════════
	     4. DATA TABLE / LIST VIEW
	     ══════════════════════════════════════════════════════════ -->
	<section class="card card-table">
		<div class="card-header-flex">
			<div>
				<h2 class="card-title">Jejak Audit Stream ({data.auditLogsData.total})</h2>
				<p class="card-subtitle">Menampilkan riwayat pencatatan log aktivitas sistem terlengkap</p>
			</div>
		</div>

		{#if data.auditLogsData.items.length > 0}
			<div class="table-responsive">
				<table class="data-table">
					<thead>
						<tr>
							<th>Waktu & Tanggal</th>
							<th>Aktor (Pengguna)</th>
							<th>Jenis Aktivitas</th>
							<th>Entitas Target</th>
							<th>Alamat IP</th>
							<th class="text-right">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.auditLogsData.items as item}
							{@const actMeta = getActionMeta(item.action)}
							<tr>
								<td class="font-mono text-xs text-slate-600 whitespace-nowrap">
									{formatDateTime(item.createdAt)}
								</td>

								<td>
									<div class="actor-info-cell">
										<div class="actor-avatar-sm">
											{#if item.actorAvatarUrl}
												<img src={item.actorAvatarUrl} alt={item.actorName} class="w-full h-full object-cover rounded-full" />
											{:else}
												<span>{item.actorName ? item.actorName.charAt(0).toUpperCase() : 'S'}</span>
											{/if}
										</div>
										<div class="actor-text">
											<span class="actor-name font-bold text-slate-800 text-xs">{item.actorName}</span>
											<span class="actor-meta text-[11px] text-slate-500 font-mono">
												@{item.actorUsername} • <span class="capitalize font-semibold">{item.actorRole}</span>
											</span>
										</div>
									</div>
								</td>

								<td>
									<span class="action-pill" style="background: {actMeta.bg}; color: {actMeta.color};">
										{actMeta.label}
									</span>
								</td>

								<td>
									<div class="flex flex-col gap-0.5">
										<span class="font-bold text-xs text-slate-800">{item.entityLabel}</span>
										<span class="font-mono text-[11px] text-slate-500 font-semibold">
											{item.entityType.toUpperCase()}{item.entityId ? ` #${item.entityId}` : ''}
										</span>
									</div>
								</td>

								<td class="font-mono text-xs text-slate-500">
									{item.ipAddress || '127.0.0.1'}
								</td>

								<td class="text-right">
									<button
										type="button"
										onclick={() => openDetailDrawer(item)}
										class="btn-detail-log"
										title="Lihat Detail Log"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
											<circle cx="12" cy="12" r="3"/>
										</svg>
										<span>Detail</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			<div class="pagination-footer">
				<div class="pagination-info">
					Menampilkan <strong>{((data.auditLogsData.page - 1) * data.auditLogsData.limit) + 1}</strong> - <strong>{Math.min(data.auditLogsData.page * data.auditLogsData.limit, data.auditLogsData.total)}</strong> dari <strong>{data.auditLogsData.total}</strong> log
				</div>
				<div class="pagination-buttons">
					{#if data.auditLogsData.page > 1}
						<a href="?page={data.auditLogsData.page - 1}&search={searchVal}&role={selectedRole}&action={selectedAction}" class="page-nav-btn">
							&larr; Sebelumnya
						</a>
					{:else}
						<span class="page-nav-btn page-nav-btn--disabled">&larr; Sebelumnya</span>
					{/if}

					<div class="page-numbers">
						{#each Array.from({ length: data.auditLogsData.totalPages }, (_, i) => i + 1) as pNum}
							{#if pNum === data.auditLogsData.page}
								<span class="page-num page-num--active">{pNum}</span>
							{:else if Math.abs(pNum - data.auditLogsData.page) <= 2 || pNum === 1 || pNum === data.auditLogsData.totalPages}
								<a href="?page={pNum}&search={searchVal}&role={selectedRole}&action={selectedAction}" class="page-num">{pNum}</a>
							{:else if Math.abs(pNum - data.auditLogsData.page) === 3}
								<span class="page-num-dots">...</span>
							{/if}
						{/each}
					</div>

					{#if data.auditLogsData.page < data.auditLogsData.totalPages}
						<a href="?page={data.auditLogsData.page + 1}&search={searchVal}&role={selectedRole}&action={selectedAction}" class="page-nav-btn">
							Selanjutnya &rarr;
						</a>
					{:else}
						<span class="page-nav-btn page-nav-btn--disabled">Selanjutnya &rarr;</span>
					{/if}
				</div>
			</div>
		{:else}
			<div class="empty-state-box">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted);">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<circle cx="12" cy="14" r="3"/>
				</svg>
				<h3 class="empty-title">Tidak Ada Audit Log Ditemukan</h3>
				<p class="empty-desc">Tidak ada riwayat aktivitas log yang cocok dengan filter atau kata kunci pencarian Anda.</p>
			</div>
		{/if}
	</section>
</div>

<!-- ══════════════════════════════════════════════════════════
     5. DETAIL AUDIT LOG DRAWER
     ══════════════════════════════════════════════════════════ -->
{#if isDetailDrawerOpen && selectedLog}
	{@const actMeta = getActionMeta(selectedLog.action)}
	<FormDrawer
		bind:open={isDetailDrawerOpen}
		title="Rincian Transaksi Audit"
		subtitle={`ID Log #${selectedLog.id} • ${formatDateTime(selectedLog.createdAt)}`}
		onclose={() => (isDetailDrawerOpen = false)}
	>
		{#snippet children()}
			<div class="audit-detail-container flex flex-col gap-5">
				<!-- 1. Actor Profile Banner Card -->
				<div class="actor-banner-card">
					<div class="actor-avatar-lg">
						{#if selectedLog.actorAvatarUrl}
							<img src={selectedLog.actorAvatarUrl} alt={selectedLog.actorName} class="w-full h-full object-cover rounded-full" />
						{:else}
							<span>{selectedLog.actorName ? selectedLog.actorName.charAt(0).toUpperCase() : 'S'}</span>
						{/if}
					</div>
					<div class="actor-banner-info">
						<div class="flex items-center gap-2">
							<h3 class="actor-banner-name">{selectedLog.actorName}</h3>
							<span class="role-pill role-pill--{selectedLog.actorRole}">
								{selectedLog.actorRole.toUpperCase()}
							</span>
						</div>
						<p class="actor-banner-username">
							@{selectedLog.actorUsername}
							{#if selectedLog.actorId}
								<span class="text-slate-400 font-mono text-[11px] ml-1">(ID: #{selectedLog.actorId})</span>
							{/if}
						</p>
					</div>
				</div>

				<!-- 2. Action & Metadata Grid -->
				<div class="meta-spec-grid">
					<div class="meta-spec-card">
						<span class="meta-spec-label">JENIS AKSI SISTEM</span>
						<div class="flex items-center gap-1.5 mt-1">
							<span class="action-pill font-bold" style="background: {actMeta.bg}; color: {actMeta.color};">
								{actMeta.label}
							</span>
						</div>
					</div>

					<div class="meta-spec-card">
						<span class="meta-spec-label">ENTITAS TARGET</span>
						<div class="flex flex-col gap-0.5 mt-1">
							<span class="font-bold text-xs text-slate-900">{selectedLog.entityLabel}</span>
							<span class="font-mono text-[11px] text-slate-500 font-semibold">
								{selectedLog.entityType.toUpperCase()}{selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}
							</span>
						</div>
					</div>

					<div class="meta-spec-card">
						<span class="meta-spec-label">ALAMAT IP</span>
						<span class="font-mono text-xs font-semibold text-slate-700 block mt-1">
							{selectedLog.ipAddress || '127.0.0.1'}
						</span>
					</div>

					<div class="meta-spec-card">
						<span class="meta-spec-label">WAKTU AUDIT</span>
						<span class="font-mono text-xs font-semibold text-slate-700 block mt-1">
							{formatDateTime(selectedLog.createdAt)}
						</span>
					</div>
				</div>

				<!-- 3. Formatted New Values Card -->
				{#if selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0}
					<div class="values-card values-card--new">
						<div class="values-card-header">
							<div class="flex items-center gap-2">
								<span class="dot-indicator bg-emerald-500"></span>
								<h4 class="values-card-title text-emerald-800">Perubahan / Nilai Baru (newValues)</h4>
							</div>
						</div>
						<div class="values-card-body">
							<div class="flex flex-col gap-2">
								{#each Object.entries(selectedLog.newValues) as [key, val]}
									<div class="value-row">
										<span class="value-key">{formatKeyLabel(key)}:</span>
										<span class="value-val font-mono text-emerald-900 bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded">
											{typeof val === 'object' ? JSON.stringify(val) : String(val)}
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- 4. Formatted Old Values Card -->
				{#if selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0}
					<div class="values-card values-card--old">
						<div class="values-card-header">
							<div class="flex items-center gap-2">
								<span class="dot-indicator bg-amber-500"></span>
								<h4 class="values-card-title text-amber-800">Nilai Sebelumnya (oldValues)</h4>
							</div>
						</div>
						<div class="values-card-body">
							<div class="flex flex-col gap-2">
								{#each Object.entries(selectedLog.oldValues) as [key, val]}
									<div class="value-row">
										<span class="value-key">{formatKeyLabel(key)}:</span>
										<span class="value-val font-mono text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded">
											{typeof val === 'object' ? JSON.stringify(val) : String(val)}
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- 5. Raw JSON Accordion -->
				<details class="json-accordion">
					<summary class="json-summary">
						<span class="font-bold text-xs text-slate-700">Inspect Payload JSON Raw</span>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
					</summary>
					<pre class="json-code-block">{JSON.stringify(selectedLog, null, 2)}</pre>
				</details>
			</div>
		{/snippet}

		{#snippet footer()}
			<div class="drawer-footer-row flex justify-between items-center w-full">
				<button
					type="button"
					onclick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
					class="btn-copy-json"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
					<span>Salin Payload JSON</span>
				</button>
				<button type="button" onclick={() => (isDetailDrawerOpen = false)} class="btn-drawer-secondary">
					Tutup
				</button>
			</div>
		{/snippet}
	</FormDrawer>
{/if}

<style>
	.audit-logs-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1280px;
		margin: 0 auto;
		width: 100%;
	}

	.audit-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
	}

	.hero-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.hero-subtitle {
		font-size: 12.5px;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.badge--live {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
		font-size: 11px;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: 9999px;
	}

	/* Stats Grid */
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
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}

		.stat-card {
			padding: 12px 10px !important;
			gap: 10px !important;
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

	.icon-logs { background: #e0e7ff; color: #4f46e5; }
	.icon-today { background: #dcfce7; color: #166534; }
	.icon-security { background: #fee2e2; color: #dc2626; }
	.icon-admin { background: #fef9c3; color: #ca8a04; }

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-muted);
	}

	/* Card Table */
	.card-table {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 20px;
		box-shadow: var(--shadow-sm);
	}

	.card-header-flex {
		margin-bottom: 16px;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.card-subtitle {
		font-size: 12px;
		color: var(--text-muted);
	}

	.table-responsive {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 680px;
	}

	.data-table th {
		padding: 12px 14px;
		text-align: left;
		font-size: 11.5px;
		font-weight: 800;
		color: var(--text-muted);
		border-bottom: 2px solid var(--border-hard);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.data-table td {
		padding: 14px;
		border-bottom: 1px solid var(--border-soft);
		vertical-align: middle;
	}

	.actor-info-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.actor-avatar-sm {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		font-weight: 800;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	}

	.actor-text {
		display: flex;
		flex-direction: column;
	}

	.action-pill {
		font-size: 11px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 6px;
		display: inline-block;
		white-space: nowrap;
	}

	.btn-detail-log {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 6px;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-detail-log:hover {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #4f46e5;
	}

	/* Pagination */
	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 16px;
		margin-top: 16px;
		border-top: 1px solid var(--border-soft);
		flex-wrap: wrap;
		gap: 12px;
	}

	.pagination-info {
		font-size: 12px;
		color: var(--text-muted);
	}

	.pagination-buttons {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.page-nav-btn {
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-hard);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
		text-decoration: none;
		background: #ffffff;
	}

	.page-nav-btn--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.page-num {
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid var(--border-soft);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
		text-decoration: none;
	}

	.page-num--active {
		background: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}

	.empty-state-box {
		padding: 48px 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 12px;
	}

	.empty-desc {
		font-size: 12.5px;
		color: var(--text-muted);
		max-width: 360px;
		margin-top: 4px;
	}

	.drawer-footer-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.btn-drawer-secondary {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid #cbd5e1;
		font-weight: 700;
		font-size: 13px;
		color: #334155;
		background: #ffffff;
		cursor: pointer;
	}

	/* Audit Drawer Styling */
	.actor-banner-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 14px 16px;
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.actor-avatar-lg {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		font-weight: 800;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	}

	.actor-banner-name {
		font-weight: 800;
		font-size: 14px;
		color: #0f172a;
	}

	.actor-banner-username {
		font-size: 12px;
		color: #64748b;
		margin-top: 1px;
	}

	.role-pill {
		font-size: 10px;
		font-weight: 800;
		padding: 2px 7px;
		border-radius: 9999px;
		text-transform: uppercase;
	}

	.role-pill--admin { background: #fee2e2; color: #dc2626; }
	.role-pill--mentor { background: #dcfce7; color: #166534; }
	.role-pill--guru { background: #fef9c3; color: #854d0e; }
	.role-pill--siswa { background: #e0f2fe; color: #0369a1; }
	.role-pill--system { background: #f3e8ff; color: #6b21a8; }

	.meta-spec-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.meta-spec-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
	}

	.meta-spec-label {
		font-size: 10px;
		font-weight: 800;
		color: #64748b;
		letter-spacing: 0.04em;
	}

	.values-card {
		border-radius: 10px;
		border: 1px solid;
		overflow: hidden;
	}

	.values-card--new {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.values-card--old {
		background: #fffbeb;
		border-color: #fde68a;
	}

	.values-card-header {
		padding: 10px 12px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	.values-card-title {
		font-size: 12px;
		font-weight: 800;
	}

	.dot-indicator {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		display: inline-block;
	}

	.values-card-body {
		padding: 12px;
	}

	.value-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 12px;
	}

	.value-key {
		font-weight: 700;
		color: #334155;
	}

	.value-val {
		font-size: 11.5px;
	}

	.json-accordion {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		background: #ffffff;
	}

	.json-summary {
		padding: 10px 14px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		user-select: none;
	}

	.json-summary:hover {
		background: #f8fafc;
	}

	.json-code-block {
		padding: 12px;
		background: #0f172a;
		color: #38bdf8;
		font-size: 11px;
		font-family: monospace;
		margin: 0;
		overflow-x: auto;
		max-height: 220px;
		border-top: 1px solid #1e293b;
	}

	.btn-copy-json {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-copy-json:hover {
		background: #e2e8f0;
		color: #0f172a;
	}</style>

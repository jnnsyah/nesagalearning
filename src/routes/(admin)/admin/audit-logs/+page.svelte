<script lang="ts">
	import { goto } from '$app/navigation';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';

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
									<span class="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
										{item.entityType}{item.entityId ? ` #${item.entityId}` : ''}
									</span>
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
		title="Rincian Detail Audit Log"
		subtitle={`ID Log #${selectedLog.id} • ${formatDateTime(selectedLog.createdAt)}`}
		onclose={() => (isDetailDrawerOpen = false)}
	>
		{#snippet children()}
			<div class="flex flex-col gap-4">
				<!-- Actor Box -->
				<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
						{#if selectedLog.actorAvatarUrl}
							<img src={selectedLog.actorAvatarUrl} alt={selectedLog.actorName} class="w-full h-full object-cover rounded-full" />
						{:else}
							{selectedLog.actorName ? selectedLog.actorName.charAt(0).toUpperCase() : 'S'}
						{/if}
					</div>
					<div>
						<h4 class="font-bold text-slate-800 text-xs">{selectedLog.actorName}</h4>
						<p class="text-[11px] text-slate-500 font-mono">@{selectedLog.actorUsername} • <span class="capitalize font-semibold">{selectedLog.actorRole}</span></p>
					</div>
				</div>

				<!-- Event Meta -->
				<div class="grid grid-cols-2 gap-3 text-xs">
					<div class="p-2.5 bg-white border border-slate-200 rounded-md">
						<span class="text-slate-500 block text-[10.5px] font-bold mb-1">JENIS AKSI</span>
						<span class="action-pill inline-block" style="background: {actMeta.bg}; color: {actMeta.color};">
							{actMeta.label}
						</span>
					</div>
					<div class="p-2.5 bg-white border border-slate-200 rounded-md">
						<span class="text-slate-500 block text-[10.5px] font-bold mb-1">ENTITAS TARGET</span>
						<span class="font-mono font-bold text-slate-800">{selectedLog.entityType}{selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}</span>
					</div>
				</div>

				<!-- Values JSON Viewer -->
				{#if selectedLog.newValues}
					<div>
						<span class="font-bold text-xs text-slate-700 block mb-1.5">Nilai Baru / Perubahan (newValues):</span>
						<pre class="p-3 bg-slate-900 text-emerald-400 text-xs font-mono rounded-lg overflow-x-auto max-h-48">{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
					</div>
				{/if}

				{#if selectedLog.oldValues}
					<div>
						<span class="font-bold text-xs text-slate-700 block mb-1.5">Nilai Sebelumnya (oldValues):</span>
						<pre class="p-3 bg-slate-900 text-amber-300 text-xs font-mono rounded-lg overflow-x-auto max-h-48">{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
					</div>
				{/if}

				<!-- IP & Timestamp -->
				<div class="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex justify-between">
					<span>IP Address: <strong class="font-mono text-slate-700">{selectedLog.ipAddress || '127.0.0.1'}</strong></span>
					<span>Waktu: <strong class="font-mono text-slate-700">{formatDateTime(selectedLog.createdAt)}</strong></span>
				</div>
			</div>
		{/snippet}

		{#snippet footer()}
			<div class="drawer-footer-row">
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
		justify-content: flex-end;
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
</style>

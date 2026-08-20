<script lang="ts">
	import { enhance } from '$app/forms';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// ──── Reactive State ────
	let searchQuery = $state('');
	let statusFilter = $state<'semua' | 'sent' | 'failed'>('semua');

	// Email Viewer Drawer State
	let selectedLog = $state<(typeof data.logs)[0] | null>(null);
	let isViewerOpen = $state(false);

	// Action State
	let deleteTargetId = $state<number | null>(null);
	let isResending = $state(false);

	const statusOptions = [
		{ value: 'semua', label: 'Semua Status' },
		{ value: 'sent', label: 'Terkirim (Sent)' },
		{ value: 'failed', label: 'Gagal (Failed)' }
	];

	// Toast Feedback Effect
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message as string);
		} else if (form?.error) {
			toast.error(form.error as string);
		}
	});

	// Derived Filtered Outbox Logs
	let filteredLogs = $derived.by(() => {
		let list = [...(data.logs || [])];

		if (searchQuery.trim() !== '') {
			const term = searchQuery.toLowerCase().trim();
			list = list.filter(
				(l) =>
					l.recipientEmail.toLowerCase().includes(term) ||
					l.subject.toLowerCase().includes(term) ||
					l.senderEmail.toLowerCase().includes(term)
			);
		}

		if (statusFilter !== 'semua') {
			list = list.filter((l) => l.status === statusFilter);
		}

		return list;
	});

	function openViewer(log: (typeof data.logs)[0]) {
		selectedLog = log;
		isViewerOpen = true;
	}

	function closeViewer() {
		isViewerOpen = false;
		selectedLog = null;
	}

	function formatDate(dateInput: Date | string): string {
		const d = new Date(dateInput);
		return d.toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Manajemen Email & Outbox Log — Admin Console</title>
</svelte:head>

<div class="content-area">
	<!-- 1. Header / Hero Title Banner -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/admin" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Manajemen Email</span>
		</nav>

		<div class="header-content-row">
			<div>
				<div class="flex items-center gap-2 mb-1">
					<h1 class="page-title">Manajemen Email & Outbox Log</h1>
					<span class="status-live-pill">
						<span class="status-live-dot"></span>
						Live Monitoring
					</span>
				</div>
				<p class="page-sub">
					Pantau riwayat pengiriman email terkirim, pratinjau pesan HTML, dan atur konfigurasi server SMTP pengirim.
				</p>
			</div>

			<!-- Header Action Button: Konfigurasi Email -->
			<a href="/admin/konfigurasi/email" class="btn btn-primary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
				</svg>
				Konfigurasi Email SMTP
			</a>
		</div>

		<!-- 2. Key Metrics Grid (`.stats-grid`) -->
		<div class="stats-overview-grid mt-5">
			<div class="stat-card">
				<div class="stat-card-header">
					<span class="stat-label">Total Outbox Log</span>
					<div class="stat-icon-wrap icon-blue">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
							<polyline points="22,6 12,13 2,6"/>
						</svg>
					</div>
				</div>
				<strong class="stat-value">{data.stats.total}</strong>
				<span class="stat-hint">Riwayat pengiriman tersimpan</span>
			</div>

			<div class="stat-card stat-card--success">
				<div class="stat-card-header">
					<span class="stat-label">Berhasil Terkirim</span>
					<div class="stat-icon-wrap icon-emerald">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
							<polyline points="22 4 12 14.01 9 11.01"/>
						</svg>
					</div>
				</div>
				<strong class="stat-value">{data.stats.sent}</strong>
				<span class="stat-hint">Status OK / Delivered</span>
			</div>

			<div class="stat-card stat-card--danger">
				<div class="stat-card-header">
					<span class="stat-label">Gagal Terkirim</span>
					<div class="stat-icon-wrap icon-rose">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="12" y1="8" x2="12" y2="12"/>
							<line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
					</div>
				</div>
				<strong class="stat-value">{data.stats.failed}</strong>
				<span class="stat-hint">Perlu perhatian / SMTP Error</span>
			</div>

			<div class="stat-card stat-card--info">
				<div class="stat-card-header">
					<span class="stat-label">Terkirim Hari Ini</span>
					<div class="stat-icon-wrap icon-indigo">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
							<line x1="16" y1="2" x2="16" y2="6"/>
							<line x1="8" y1="2" x2="8" y2="6"/>
							<line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
					</div>
				</div>
				<strong class="stat-value">{data.stats.today}</strong>
				<span class="stat-hint">Aktivitas 24 jam terakhir</span>
			</div>
		</div>
	</div>

	<!-- 3. Filter Bar ($lib/components/ui/FilterBar.svelte) -->
	<FilterBar>
		{#snippet search()}
			<div class="filter-search-full">
				<TextInput
					label=""
					name="searchQuery"
					bind:value={searchQuery}
					placeholder="Cari email penerima, pengirim, atau subjek pesan..."
					clearable
				/>
			</div>
		{/snippet}

		{#snippet filters()}
			<div class="filter-select-col">
				<CustomSelect
					label=""
					name="statusFilter"
					options={statusOptions}
					bind:value={statusFilter}
				/>
			</div>
		{/snippet}
	</FilterBar>

	<!-- 4. Data Table / List View -->
	<div class="table-card">
		<div class="table-header-info">
			<span class="table-results-counter">
				Menampilkan <strong>{filteredLogs.length}</strong> dari <strong>{data.logs.length}</strong> log outbox
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="outbox-table" style="min-width: 680px;">
				<thead>
					<tr>
						<th>Waktu</th>
						<th>Penerima (To)</th>
						<th>Subjek Email</th>
						<th>Pengirim (From)</th>
						<th class="text-center">Status</th>
						<th class="text-right">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredLogs.length === 0}
						<tr>
							<td colspan="6" class="empty-state-cell">
								<div class="empty-state-wrap">
									<svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									<p class="empty-title">Tidak ada log outbox yang cocok</p>
									<p class="empty-sub">Coba ubah kata kunci pencarian atau filter status email Anda.</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each filteredLogs as log}
							<tr class="outbox-row">
								<td class="cell-time">
									{formatDate(log.createdAt)}
								</td>
								<td class="cell-email">
									<span class="email-badge">{log.recipientEmail}</span>
								</td>
								<td class="cell-subject">
									{log.subject}
								</td>
								<td class="cell-sender">
									{log.senderEmail}
								</td>
								<td class="cell-status text-center">
									{#if log.status === 'sent'}
										<span class="badge badge-success">
											<span class="badge-dot dot-emerald"></span>
											TERKIRIM
										</span>
									{:else}
										<span class="badge badge-danger" title={log.errorMessage ?? ''}>
											<span class="badge-dot dot-rose"></span>
											GAGAL
										</span>
									{/if}
								</td>
								<td class="cell-actions text-right">
									<div class="actions-flex">
										<button
											type="button"
											class="btn btn-secondary btn-sm"
											onclick={() => openViewer(log)}
										>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
												<circle cx="12" cy="12" r="3"/>
											</svg>
											Lihat Email
										</button>

										<form method="POST" action="?/resend" use:enhance={() => {
											isResending = true;
											return async ({ update }) => {
												isResending = false;
												await update();
											};
										}} class="inline-block">
											<input type="hidden" name="id" value={log.id} />
											<button type="submit" class="btn btn-success-outline btn-sm" title="Kirim Ulang Email Ini">
												<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
												</svg>
												Kirim Ulang
											</button>
										</form>

										<button
											type="button"
											class="btn btn-danger-outline btn-sm"
											onclick={() => (deleteTargetId = log.id)}
											title="Hapus Log Ini"
										>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- 5. Form Drawer for Email HTML Viewer ($lib/components/ui/FormDrawer.svelte) -->
<FormDrawer
	bind:open={isViewerOpen}
	title={selectedLog?.subject ?? 'Pratinjau HTML Email'}
	subtitle="Detail metadata dan tampilan lengkap HTML pesan email terkirim"
	onclose={closeViewer}
>
	{#if selectedLog}
		<div class="drawer-viewer-content">
			<!-- Meta Info Card -->
			<div class="meta-header-box">
				<div class="meta-row">
					<span class="meta-label">Kepada (To):</span>
					<strong class="meta-val font-mono">{selectedLog.recipientEmail}</strong>
				</div>
				<div class="meta-row">
					<span class="meta-label">Pengirim (From):</span>
					<span class="meta-val font-mono">{selectedLog.senderEmail}</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Waktu Pengiriman:</span>
					<span class="meta-val">{formatDate(selectedLog.createdAt)}</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Status:</span>
					{#if selectedLog.status === 'sent'}
						<span class="badge badge-success">TERKIRIM</span>
					{:else}
						<span class="badge badge-danger">GAGAL</span>
					{/if}
				</div>
			</div>

			{#if selectedLog.status === 'failed' && selectedLog.errorMessage}
				<div class="error-alert-box mt-3">
					<div class="flex items-center gap-2 mb-1">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						<strong>Detail Error Pengiriman:</strong>
					</div>
					<p>{selectedLog.errorMessage}</p>
				</div>
			{/if}

			<!-- HTML Render Frame -->
			<div class="preview-frame-wrap mt-4">
				<div class="preview-frame-bar">
					<span class="bar-dot dot-red"></span>
					<span class="bar-dot dot-yellow"></span>
					<span class="bar-dot dot-green"></span>
					<span class="bar-title">HTML Email Render Output</span>
				</div>
				<iframe
					title="Pratinjau HTML Email"
					srcdoc={selectedLog.bodyHtml}
					class="email-iframe-render"
				></iframe>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<div class="drawer-footer-actions">
			{#if selectedLog}
				<form method="POST" action="?/resend" use:enhance class="inline-block">
					<input type="hidden" name="id" value={selectedLog.id} />
					<button type="submit" class="btn btn-primary btn-sm">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
						</svg>
						Kirim Ulang Email Ini
					</button>
				</form>
			{/if}
			<button type="button" class="btn btn-secondary btn-sm" onclick={closeViewer}>
				Tutup Pratinjau
			</button>
		</div>
	{/snippet}
</FormDrawer>

<!-- Destructive Action Safety: Confirm Modal ($lib/components/ui/ConfirmModal.svelte) -->
<ConfirmModal
	open={deleteTargetId !== null}
	title="Hapus Log Email Outbox"
	message="Apakah Anda yakin ingin menghapus catatan log email ini? Tindakan ini tidak dapat dibatalkan."
	confirmText="Hapus Log"
	variant="danger"
	onconfirm={() => {
		if (deleteTargetId === null) return;
		const targetId = deleteTargetId;
		deleteTargetId = null;

		const formNode = document.createElement('form');
		formNode.method = 'POST';
		formNode.action = '?/delete';
		const inputNode = document.createElement('input');
		inputNode.name = 'id';
		inputNode.value = String(targetId);
		formNode.appendChild(inputNode);
		document.body.appendChild(formNode);
		formNode.submit();
	}}
	oncancel={() => (deleteTargetId = null)}
/>

<style>
	.content-area {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		width: 100%;
		max-width: 100%;
	}

	@media (max-width: 640px) {
		.content-area { padding: 16px; gap: 16px; }
	}

	/* Header Card */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
	}

	.header-content-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 14px;
		font-size: 12.5px;
		color: var(--text-muted, #64748b);
	}
	.bc-link { color: var(--primary, #4f46e5); text-decoration: none; font-weight: 600; }
	.bc-link:hover { text-decoration: underline; }
	.bc-current { color: var(--text-secondary, #334155); font-weight: 600; }

	.page-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.page-sub { font-size: 13px; color: var(--text-secondary, #475569); margin-top: 4px; line-height: 1.5; }

	.status-live-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 9999px;
		font-size: 11.5px;
		font-weight: 700;
		color: #166534;
	}

	.status-live-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #22c55e;
		animation: pulse-dot 1.8s infinite;
	}

	@keyframes pulse-dot {
		0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
		70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
		100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
	}

	/* Stats Grid */
	.stats-overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.stat-card {
		background: #ffffff;
		border: 1.5px solid #e2e8f0;
		border-radius: 12px;
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		box-shadow: 0 1px 2px rgba(0,0,0,0.03);
	}

	.stat-card--success { border-color: #bbf7d0; background: #f0fdf4; }
	.stat-card--danger { border-color: #fecaca; background: #fff5f5; }
	.stat-card--info { border-color: #e0e7ff; background: #f5f3ff; }

	.stat-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.stat-label {
		font-size: 11.5px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.stat-icon-wrap {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.icon-blue { background: #eff6ff; color: #2563eb; }
	.icon-emerald { background: #dcfce7; color: #166534; }
	.icon-rose { background: #fee2e2; color: #991b1b; }
	.icon-indigo { background: #e0e7ff; color: #4338ca; }

	.stat-value {
		font-size: 1.6rem;
		font-weight: 900;
		color: #0f172a;
		line-height: 1;
	}

	.stat-hint { font-size: 11.5px; color: #64748b; }

	/* Filter Bar Layout */
	.filter-search-full { grid-column: 1 / -1; width: 100%; }
	.filter-select-col { grid-column: span 2; }

	@media (max-width: 640px) {
		.filter-select-col { grid-column: 1 / -1; }
	}

	/* Table Card */
	.table-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05);
		overflow: hidden;
	}

	.table-header-info {
		padding: 14px 20px;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		font-size: 12.5px;
		color: #64748b;
	}

	.outbox-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.outbox-table th {
		background: #f8fafc;
		padding: 12px 16px;
		font-size: 11.5px;
		font-weight: 700;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid #e2e8f0;
	}

	.outbox-row {
		border-bottom: 1px solid #f1f5f9;
		transition: background-color 120ms ease;
	}
	.outbox-row:hover { background-color: #f8fafc; }

	.outbox-row td {
		padding: 14px 16px;
		font-size: 12.5px;
		color: #334155;
		vertical-align: middle;
	}

	.cell-time {
		font-family: var(--font-mono, monospace);
		font-size: 12px;
		color: #64748b;
		white-space: nowrap;
	}

	.cell-email { white-space: nowrap; }

	.email-badge {
		font-family: var(--font-mono, monospace);
		font-weight: 600;
		color: #0f172a;
		background: #f1f5f9;
		padding: 3px 8px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}

	.cell-subject { font-weight: 600; color: #1e293b; }
	.cell-sender { font-family: var(--font-mono, monospace); font-size: 12px; color: #64748b; }

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.02em;
	}
	.badge-success { background: #dcfce7; color: #166534; }
	.badge-danger { background: #fee2e2; color: #991b1b; }

	.badge-dot { width: 6px; height: 6px; border-radius: 50%; }
	.dot-emerald { background: #16a34a; }
	.dot-rose { background: #dc2626; }

	/* Empty State */
	.empty-state-cell { padding: 48px 16px; text-align: center; }
	.empty-state-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
	.empty-icon { width: 44px; height: 44px; color: #94a3b8; }
	.empty-title { font-size: 14px; font-weight: 700; color: #334155; margin: 0; }
	.empty-sub { font-size: 12.5px; color: #94a3b8; margin: 0; }

	/* Actions */
	.actions-flex { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 9px 18px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 150ms ease;
		text-decoration: none;
		white-space: nowrap;
	}
	.btn-sm { padding: 6px 12px; font-size: 12px; }

	.btn-primary { background: #4f46e5; color: #ffffff; }
	.btn-primary:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }

	.btn-secondary { background: #ffffff; color: #334155; border-color: #cbd5e1; }
	.btn-secondary:hover:not(:disabled) { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }

	.btn-success-outline { background: #ffffff; color: #166534; border-color: #86efac; }
	.btn-success-outline:hover:not(:disabled) { background: #dcfce7; }

	.btn-danger-outline { background: #ffffff; color: #b91c1c; border-color: #fca5a5; }
	.btn-danger-outline:hover:not(:disabled) { background: #fee2e2; }

	/* Drawer HTML Viewer Styles */
	.drawer-viewer-content { display: flex; flex-direction: column; gap: 16px; }

	.meta-header-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12.5px;
	}

	.meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
	.meta-label { color: #64748b; font-weight: 600; }
	.meta-val { color: #0f172a; word-break: break-all; }

	.error-alert-box {
		padding: 12px 14px;
		background: #fff5f5;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #991b1b;
		font-size: 12.5px;
	}
	.error-alert-box p { margin: 2px 0 0; font-family: var(--font-mono, monospace); }

	.preview-frame-wrap {
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		overflow: hidden;
		background: #ffffff;
	}

	.preview-frame-bar {
		background: #0f172a;
		padding: 8px 14px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.bar-dot { width: 9px; height: 9px; border-radius: 50%; }
	.dot-red { background: #ef4444; }
	.dot-yellow { background: #f59e0b; }
	.dot-green { background: #10b981; }
	.bar-title { margin-left: 6px; font-family: var(--font-mono, monospace); font-size: 11px; color: #94a3b8; }

	.email-iframe-render {
		width: 100%;
		height: 440px;
		border: none;
		background: #ffffff;
	}

	.drawer-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		width: 100%;
	}
</style>

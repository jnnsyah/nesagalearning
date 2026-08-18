<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'gallery' | 'leaderboard'>('gallery');
	let selectedBadge = $state<(typeof data.badgeGallery)[number] | null>(null);

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';
		let d: Date;
		if (dateVal instanceof Date) {
			d = dateVal;
		} else {
			const str = String(dateVal).trim();
			const dateOnly = str.includes('T') ? str.split('T')[0] : str;
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
				const [y, m, day] = dateOnly.split('-').map(Number);
				d = new Date(y, m - 1, day);
			} else {
				d = new Date(str);
			}
		}
		if (isNaN(d.getTime())) return String(dateVal);
		const bulanIndo = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];
		return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
	}
</script>

<svelte:head>
	<title>Galeri Badge & Leaderboard — Siswa Hub</title>
</svelte:head>

<div class="content-area">
	<!-- Header Card -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Badge &amp; Leaderboard</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Galeri Badge &amp; Peringkat Kelas</h1>
				<p class="page-sub">
					Kumpulkan lencana pencapaian, tingkatkan perolehan poin, dan raih posisi puncak di leaderboard kelas.
				</p>
			</div>
			{#if data.membership}
				<span class="kelas-badge">Kelas: {data.membership.kelasName}</span>
			{/if}
		</div>
	</div>

	<!-- Overview Stats Grid -->
	<div class="stats-grid mb-6">
		<div class="stat-card">
			<div class="stat-icon" style="background: #fef3c7; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Peringkat Kelas</div>
				<div class="stat-value" style="color: #d97706;">
					{data.userRank > 0 ? `#${data.userRank}` : '-'}
				</div>
				<div class="stat-meta">Posisi Leaderboard Kelas</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="1" x2="12" y2="23" />
					<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Poin Terkumpul</div>
				<div class="stat-value" style="color: #4f46e5;">{data.userTotalPoints} <span class="text-xs font-normal text-slate-500">PTS</span></div>
				<div class="stat-meta">Akumulasi Poin Kehadiran &amp; Task</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="8" r="7" />
					<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Badge Diraih</div>
				<div class="stat-value" style="color: #16a34a;">
					{data.earnedBadgesCount} / {data.totalBadgesCount}
				</div>
				<div class="stat-meta">Lencana Milestone Terbuka</div>
			</div>
		</div>
	</div>

	<!-- Main Container with Tabs -->
	<div class="main-panel">
		<div class="panel-tab-header">
			<button
				type="button"
				onclick={() => (activeTab = 'gallery')}
				class="panel-tab {activeTab === 'gallery' ? 'panel-tab-active' : ''}"
			>
				<span>Galeri Badge ({data.earnedBadgesCount}/{data.totalBadgesCount})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'leaderboard')}
				class="panel-tab {activeTab === 'leaderboard' ? 'panel-tab-active' : ''}"
			>
				<span>Leaderboard Kelas ({data.leaderboard.length} Siswa)</span>
			</button>
		</div>

		<div class="panel-body p-6">
			{#if activeTab === 'gallery'}
				<!-- BADGE GALLERY GRID -->
				{#if data.badgeGallery.length === 0}
					<div class="empty-state">
						<p class="empty-title">Belum Ada Badge Tersedia</p>
						<p class="empty-sub">Sistem badge sedang dikonfigurasi oleh administrator.</p>
					</div>
				{:else}
					<div class="badge-grid">
						{#each data.badgeGallery as b}
							<button
								type="button"
								onclick={() => (selectedBadge = b)}
								class="badge-card {b.isUnlocked ? 'badge-card-unlocked' : 'badge-card-locked'}"
							>
								<div class="badge-icon-wrap">
									{#if b.isUnlocked}
										<div class="badge-glowing-icon">
											<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<circle cx="12" cy="8" r="7" />
												<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
											</svg>
										</div>
									{:else}
										<div class="badge-locked-icon">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
												<path d="M7 11V7a5 5 0 0 1 10 0v4" />
											</svg>
										</div>
									{/if}
								</div>

								<h4 class="badge-name">{b.name}</h4>
								<p class="badge-desc">{b.description || 'Pencapaian khusus siswa.'}</p>

								<div class="badge-status-footer">
									{#if b.isUnlocked}
										<span class="unlocked-tag">TERBUKA &bull; {formatIndoDate(b.earnedAt)}</span>
									{:else}
										<span class="locked-tag">TERKUNCI</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- LEADERBOARD TABLE -->
				{#if data.leaderboard.length === 0}
					<div class="empty-state">
						<p class="empty-title">Leaderboard Belum Tersedia</p>
						<p class="empty-sub">Belum ada data perolehan poin tercatat pada kelas ini.</p>
					</div>
				{:else}
					<div class="table-responsive">
						<table class="leaderboard-table">
							<thead>
								<tr>
									<th style="width: 70px;">Peringkat</th>
									<th>Siswa</th>
									<th style="text-align: right;">Total Poin</th>
								</tr>
							</thead>
							<tbody>
								{#each data.leaderboard as row}
									<tr class={row.isCurrentUser ? 'row-current-user' : ''}>
										<td>
											{#if row.rank === 1}
												<span class="rank-badge rank-1">#1 GOLD</span>
											{:else if row.rank === 2}
												<span class="rank-badge rank-2">#2 SILVER</span>
											{:else if row.rank === 3}
												<span class="rank-badge rank-3">#3 BRONZE</span>
											{:else}
												<span class="rank-badge rank-def">#{row.rank}</span>
											{/if}
										</td>
										<td>
											<div class="flex items-center gap-3">
												<div class="avatar-circle">
													{row.fullName.charAt(0).toUpperCase()}
												</div>
												<div>
													<div class="font-bold text-slate-900 flex items-center gap-2">
														<span>{row.fullName}</span>
														{#if row.isCurrentUser}
															<span class="you-pill">ANDA</span>
														{/if}
													</div>
												</div>
											</div>
										</td>
										<td style="text-align: right;">
											<span class="points-val">{row.totalPoints} PTS</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Badge Detail Modal -->
{#if selectedBadge}
	<div class="modal-backdrop" onclick={() => (selectedBadge = null)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="text-center p-6">
				<div class="modal-icon-wrap mb-3">
					{#if selectedBadge.isUnlocked}
						<div class="modal-glowing-icon">
							<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="8" r="7" />
								<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
							</svg>
						</div>
					{:else}
						<div class="modal-locked-icon">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
						</div>
					{/if}
				</div>

				<h3 class="modal-badge-name">{selectedBadge.name}</h3>
				<p class="modal-badge-desc mb-4">{selectedBadge.description || 'Pencapaian khusus siswa.'}</p>

				<div class="criteria-box mb-6 text-left">
					<div class="criteria-label">Persyaratan Klaim:</div>
					<div class="criteria-value">{selectedBadge.criteria || 'Pencapaian aktif dalam aktivitas komunitas.'}</div>
					{#if selectedBadge.isUnlocked}
						<div class="earned-date-text mt-2">
							Tanggal Didapat: <strong>{formatIndoDate(selectedBadge.earnedAt)}</strong>
						</div>
					{/if}
				</div>

				<button type="button" onclick={() => (selectedBadge = null)} class="btn-close-modal">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1100px;
		margin: 0 auto;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.3rem, 2.5vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.page-sub {
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.kelas-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-label {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
	}

	.stat-meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	.main-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.panel-tab-header {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.panel-tab {
		padding: 14px 20px;
		border: none;
		background: transparent;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 150ms ease;
	}

	.panel-tab:hover {
		color: var(--primary);
	}

	.panel-tab-active {
		color: #4f46e5 !important;
		border-bottom-color: #4f46e5 !important;
		background: #ffffff !important;
	}

	.badge-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
	}

	.badge-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.badge-card-unlocked {
		border-color: #a5b4fc;
		box-shadow: 0 0 12px rgba(79, 70, 229, 0.1);
	}

	.badge-card-unlocked:hover {
		transform: translateY(-2px);
		box-shadow: 0 0 16px rgba(79, 70, 229, 0.2);
	}

	.badge-card-locked {
		opacity: 0.65;
		background: #f8fafc;
	}

	.badge-card-locked:hover {
		opacity: 0.85;
	}

	.badge-glowing-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
		box-shadow: 0 0 12px rgba(79, 70, 229, 0.3);
	}

	.badge-locked-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #94a3b8;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.badge-name {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.badge-desc {
		font-size: 11.5px;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-bottom: 12px;
	}

	.unlocked-tag {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.locked-tag {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #64748b;
		background: #f1f5f9;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.table-responsive {
		overflow-x: auto;
	}

	.leaderboard-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.leaderboard-table th {
		padding: 12px 16px;
		text-align: left;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 800;
		color: var(--text-secondary);
		border-bottom: 2px solid var(--border-hard);
		background: var(--bg-inset);
	}

	.leaderboard-table td {
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-soft);
	}

	.row-current-user {
		background: #eff6ff !important;
	}

	.rank-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: 4px;
	}

	.rank-1 { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
	.rank-2 { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
	.rank-3 { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
	.rank-def { background: #f8fafc; color: #64748b; }

	.avatar-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #4f46e5;
		color: #ffffff;
		font-family: var(--font-macro);
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.you-pill {
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 800;
		background: #2563eb;
		color: #ffffff;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.points-val {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: #4f46e5;
	}

	/* Modal Backdrop & Card */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
		padding: 16px;
	}

	.modal-card {
		background: #ffffff;
		border-radius: var(--radius-lg);
		max-width: 420px;
		width: 100%;
		box-shadow: var(--shadow-lg);
	}

	.modal-badge-name {
		font-family: var(--font-macro);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.modal-badge-desc {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.criteria-box {
		background: #f8fafc;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px 14px;
		font-size: 12px;
	}

	.criteria-label {
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 2px;
	}

	.criteria-value {
		color: var(--text-secondary);
	}

	.earned-date-text {
		font-size: 11.5px;
		color: #15803d;
	}

	.btn-close-modal {
		width: 100%;
		padding: 10px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-close-modal:hover {
		background: #4338ca;
	}

	.empty-state {
		text-align: center;
		padding: 40px 20px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px;
		}
	}
</style>

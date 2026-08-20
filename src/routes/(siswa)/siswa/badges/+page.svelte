<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
	<title>Galeri Badge & Prestasi — Siswa Hub</title>
</svelte:head>

<div class="content-area">
	<!-- Header Card -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Beranda</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Galeri Badge</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Galeri Badge &amp; Lencana Prestasi</h1>
				<p class="page-sub">
					Kumpulkan lencana pencapaian, kembangkan keterampilan, dan tingkatkan perolehan poin Anda.
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
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
					<path d="M4 22h16" />
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
					<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Poin Terkumpul</div>
				<div class="stat-value" style="color: #4f46e5;">{data.userTotalPoints} <span class="text-xs font-normal text-slate-500">PTS</span></div>
				<div class="stat-meta">Akumulasi Poin Kehadiran &amp; Tugas</div>
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

	<!-- Main Container with Badge Gallery -->
	<div class="main-panel">
		<div class="panel-header">
			<div class="flex items-center gap-2">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
					<circle cx="12" cy="8" r="7" />
					<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
				</svg>
				<h2 class="panel-title">Katalog Lencana Prestasi</h2>
			</div>
			<span class="badge-count-pill">{data.earnedBadgesCount} dari {data.totalBadgesCount} Terbuka</span>
		</div>

		<div class="panel-body p-6">
			{#if data.badgeGallery.length === 0}
				<div class="empty-state">
					<div class="empty-icon-wrap" style="background: #f1f5f9; color: #64748b;">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="8" r="7" />
							<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
						</svg>
					</div>
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
		padding: 24px 28px 80px;
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
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	@media (max-width: 640px) {
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

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
		gap: 12px;
		flex-wrap: wrap;
	}

	.panel-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.badge-count-pill {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4f46e5;
		background: #e0e7ff;
		padding: 3px 10px;
		border-radius: 9999px;
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

	.modal-icon-wrap {
		display: flex;
		justify-content: center;
	}

	.modal-glowing-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 16px rgba(79, 70, 229, 0.35);
	}

	.modal-locked-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #94a3b8;
		display: flex;
		align-items: center;
		justify-content: center;
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

	.empty-icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
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
			padding: 16px 12px 80px;
		}

		.badge-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

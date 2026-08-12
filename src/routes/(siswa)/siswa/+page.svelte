<script lang="ts">
	let { data } = $props();

	let role = $derived(data.user?.role ?? 'siswa');
	let uid = $derived(`USR/S-${String(data.user?.id ?? '000').padStart(3, '0')}`);
</script>

<svelte:head>
	<title>DASHBOARD SISWA — NLC</title>
</svelte:head>

<div class="shell">
	<!-- TOPBAR -->
	<header class="topbar">
		<div class="flex items-center gap-3">
			<span class="type-mono" style="font-size: 11px; color: var(--text-primary); font-weight: 700;"
				>NLC</span
			>
			<span class="type-mono text-muted" style="font-size: 9px;">//</span>
			<span class="type-mono text-muted" style="font-size: 9px;">PORTAL SISWA</span>
		</div>
		<div class="flex items-center gap-3">
			<span class="type-mono text-muted" style="font-size: 9px;">{uid}</span>
			<a href="/logout" class="btn-ghost" style="padding: 5px 10px; font-size: 10px;">KELUAR</a>
		</div>
	</header>

	<!-- MAIN -->
	<main class="shell__main pb-safe">
		<!-- Identity banner -->
		<section class="identity-banner">
			<div class="identity-banner__inner">
				<div class="type-mono text-muted mb-2" style="font-size: 9px;">
					[ AKSES AKTIF ] &nbsp; {uid} &nbsp; /// &nbsp; TA 2026/2027 &nbsp; /// &nbsp; KLS-01
				</div>
				<h1 class="identity-banner__name">{data.user?.fullName ?? '—'}</h1>
				<div class="mt-2 flex items-center gap-3">
					<span class="badge badge-hadir">{role.toUpperCase()}</span>
					<span class="type-mono text-muted" style="font-size: 9px;">@{data.user?.username}</span>
				</div>
			</div>
			<div class="identity-banner__accent"></div>
		</section>

		<!-- Stats grid -->
		<section class="stats-grid">
			<div class="stat-block">
				<div class="stat-block__label">[ POIN TOTAL ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">TA 2026/2027 · KLS-01</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ STREAK ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">PERTEMUAN BERTURUT</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ KEHADIRAN ]</div>
				<data class="stat-block__value" value="0">0%</data>
				<div class="stat-block__meta">DARI TOTAL PERTEMUAN</div>
			</div>
		</section>

		<!-- Tugas pending -->
		<section class="section-block">
			<div class="section-header">[ TUGAS PENDING ]</div>
			<div class="empty-state">
				<span class="type-mono text-muted" style="font-size: 10px;">
					&gt;&gt; TIDAK ADA TUGAS AKTIF
				</span>
			</div>
		</section>

		<!-- Progress fase -->
		<section class="section-block">
			<div class="section-header">[ PROGRESS FASE ]</div>
			<div class="phase-list">
				<div class="phase-item">
					<div class="phase-item__header">
						<span class="type-mono" style="font-size: 11px;">FASE 1 — MENGOPERASIKAN KOMPUTER</span>
						<span class="badge badge-pending">IN PROGRESS</span>
					</div>
					<div class="phase-item__bar">
						<div class="phase-item__bar-fill" style="width: 0%;"></div>
					</div>
					<div class="type-mono text-muted mt-1" style="font-size: 9px;">
						0 / 0 SUB-FASE SELESAI
					</div>
				</div>

				<div class="phase-item">
					<div class="phase-item__header">
						<span class="type-mono" style="font-size: 11px;">FASE 2 — RAKIT PC</span>
						<span class="badge badge-pending">LOCKED</span>
					</div>
					<div class="phase-item__bar">
						<div class="phase-item__bar-fill" style="width: 0%;"></div>
					</div>
					<div class="type-mono text-muted mt-1" style="font-size: 9px;">
						0 / 0 SUB-FASE SELESAI
					</div>
				</div>

				<div class="phase-item">
					<div class="phase-item__header">
						<span class="type-mono" style="font-size: 11px;">FASE 3 — DASAR JARINGAN</span>
						<span class="badge badge-pending">LOCKED</span>
					</div>
					<div class="phase-item__bar">
						<div class="phase-item__bar-fill" style="width: 0%;"></div>
					</div>
					<div class="type-mono text-muted mt-1" style="font-size: 9px;">
						0 / 0 SUB-FASE SELESAI
					</div>
				</div>

				<div class="phase-item">
					<div class="phase-item__header">
						<span class="type-mono" style="font-size: 11px;">FASE 4 — CISCO PACKET TRACER</span>
						<span class="badge badge-pending">LOCKED</span>
					</div>
					<div class="phase-item__bar">
						<div class="phase-item__bar-fill" style="width: 0%;"></div>
					</div>
					<div class="type-mono text-muted mt-1" style="font-size: 9px;">
						0 / 0 SUB-FASE SELESAI
					</div>
				</div>
			</div>
		</section>
	</main>

	<!-- BOTTOM NAV (mobile) -->
	<nav class="bottom-nav hide-desktop">
		<a href="/siswa" class="bottom-nav__item active">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect
					x="14"
					y="14"
					width="7"
					height="7"
				/><rect x="3" y="14" width="7" height="7" /></svg
			>
			HOME
		</a>
		<a href="/siswa/kurikulum" class="bottom-nav__item">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path
					d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
				/></svg
			>
			MATERI
		</a>
		<a href="/siswa/jadwal" class="bottom-nav__item">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><rect x="3" y="4" width="18" height="18" rx="0" ry="0" /><line
					x1="16"
					y1="2"
					x2="16"
					y2="6"
				/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg
			>
			JADWAL
		</a>
		<a href="/siswa/progress" class="bottom-nav__item">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line
					x1="6"
					y1="20"
					x2="6"
					y2="14"
				/></svg
			>
			PROGRESS
		</a>
	</nav>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg-base);
	}

	.shell__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0;
		padding-bottom: 72px; /* bottom nav height */
	}

	/* Identity Banner */
	.identity-banner {
		position: relative;
		padding: 24px 20px 20px;
		border-bottom: 1px solid var(--border-hard);
		overflow: hidden;
	}

	.identity-banner__inner {
		position: relative;
		z-index: 1;
	}

	.identity-banner__name {
		font-family: var(--font-macro);
		font-size: clamp(1.8rem, 6vw, 3.5rem);
		line-height: 0.95;
		letter-spacing: -0.03em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.identity-banner__accent {
		position: absolute;
		top: 0;
		right: -40px;
		bottom: 0;
		width: 200px;
		font-family: var(--font-macro);
		font-size: 160px;
		line-height: 1;
		letter-spacing: -0.06em;
		color: var(--border-soft);
		pointer-events: none;
		user-select: none;
		display: flex;
		align-items: center;
		z-index: 0;
	}

	.identity-banner__accent::after {
		content: 'NLC';
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--border-hard);
		border-bottom: 1px solid var(--border-hard);
	}

	.stats-grid .stat-block {
		border: none;
	}

	/* Section blocks */
	.section-block {
		border-bottom: 1px solid var(--border-hard);
	}

	.section-header {
		padding: 10px 20px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: var(--bg-panel);
		border-bottom: 1px solid var(--border-hard);
	}

	.empty-state {
		padding: 24px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Phase list */
	.phase-list {
		display: flex;
		flex-direction: column;
	}

	.phase-item {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-soft);
	}

	.phase-item:last-child {
		border-bottom: none;
	}

	.phase-item__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 10px;
	}

	.phase-item__bar {
		height: 2px;
		background: var(--border-hard);
		width: 100%;
	}

	.phase-item__bar-fill {
		height: 100%;
		background: var(--red);
		transition: width 300ms;
	}
</style>

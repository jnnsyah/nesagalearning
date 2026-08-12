<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>DASHBOARD GURU — NLC</title>
</svelte:head>

<div class="guru-shell">
	<!-- SIDEBAR -->
	<aside class="sidebar hide-mobile">
		<div class="sidebar__brand">
			<div class="type-mono" style="font-size: 11px; font-weight: 700; color: var(--text-primary);">NLC</div>
			<div class="type-mono text-muted mt-1" style="font-size: 9px;">PORTAL GURU</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/guru" class="sidebar__nav-item active">/// OVERVIEW</a>
			<a href="/guru/kehadiran" class="sidebar__nav-item">/// KEHADIRAN</a>
			<a href="/guru/progress" class="sidebar__nav-item">/// PROGRESS KELAS</a>
			<a href="/guru/pertemuan" class="sidebar__nav-item">/// DAFTAR PERTEMUAN</a>
		</nav>
		<div style="margin-top: auto;">
			<hr class="rule" />
			<div style="padding: 16px 20px;">
				<div class="type-mono text-muted mb-1" style="font-size: 9px;">OBSERVER</div>
				<div class="type-mono" style="font-size: 11px;">{data.user?.fullName}</div>
				<a href="/logout" class="btn-ghost mt-3" style="display: block; text-align: center; font-size: 10px;">KELUAR</a>
			</div>
		</div>
	</aside>

	<!-- MAIN -->
	<div class="guru-main">
		<header class="topbar hide-desktop">
			<div class="flex items-center gap-3">
				<span class="type-mono" style="font-size: 11px; font-weight: 700;">NLC</span>
				<span class="type-mono text-muted" style="font-size: 9px;">// GURU</span>
			</div>
			<a href="/logout" class="btn-ghost" style="padding: 5px 10px; font-size: 10px;">KELUAR</a>
		</header>

		<!-- Page header -->
		<div class="page-header">
			<div>
				<div class="type-mono text-muted mb-1" style="font-size: 9px;">
					[ READ-ONLY OBSERVER ] &nbsp;/// &nbsp; TA 2026/2027
				</div>
				<h1 class="page-title">MONITORING<br />KELAS</h1>
			</div>
			<div class="type-mono text-muted hide-mobile" style="font-size: 9px; text-align: right; line-height: 2;">
				<div>{data.user?.fullName}</div>
				<div>@{data.user?.username}</div>
			</div>
		</div>

		<hr class="rule" />

		<!-- Aggregate stats -->
		<div class="guru-stats">
			<div class="stat-block">
				<div class="stat-block__label">[ TOTAL SISWA ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">TERDAFTAR AKTIF</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ RATA-RATA HADIR ]</div>
				<data class="stat-block__value" value="0">0%</data>
				<div class="stat-block__meta">SELURUH PERTEMUAN</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ FASE SELESAI ]</div>
				<data class="stat-block__value" value="0">0/4</data>
				<div class="stat-block__meta">CHECKPOINT KURIKULUM</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ TOTAL PERTEMUAN ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">SEPANJANG TA INI</div>
			</div>
		</div>

		<hr class="rule" />

		<!-- Kehadiran chart (CSS-only bars) -->
		<section class="chart-section">
			<div class="section-header-block">
				<span>[ GRAFIK KEHADIRAN PER FASE ]</span>
				<span class="type-mono text-muted" style="font-size: 9px;">KLS-01 · TA 2026/2027</span>
			</div>
			<div class="chart-bars">
				{#each [
					{ label: 'FASE 1', value: 0 },
					{ label: 'FASE 2', value: 0 },
					{ label: 'FASE 3', value: 0 },
					{ label: 'FASE 4', value: 0 },
				] as fase}
					<div class="chart-bar-item">
						<div class="chart-bar-track">
							<div class="chart-bar-fill" style="height: {fase.value}%;"></div>
						</div>
						<div class="type-mono text-muted mt-1" style="font-size: 9px;">{fase.label}</div>
						<div class="type-mono" style="font-size: 10px;">{fase.value}%</div>
					</div>
				{/each}
			</div>
		</section>

		<hr class="rule" />

		<!-- Progress checkpoint grid -->
		<section>
			<div class="section-header-block">
				<span>[ PROGRESS CHECKPOINT ]</span>
			</div>
			<div class="checkpoint-grid">
				{#each [
					{ id: 'CP-01', label: 'MENGOPERASIKAN KOMPUTER', status: 'pending' },
					{ id: 'CP-02', label: 'RAKIT PC', status: 'pending' },
					{ id: 'CP-03', label: 'DASAR JARINGAN', status: 'pending' },
					{ id: 'CP-04', label: 'CISCO PACKET TRACER', status: 'pending' },
				] as cp}
					<div class="checkpoint-item">
						<div class="type-mono text-muted mb-1" style="font-size: 9px;">{cp.id}</div>
						<div class="type-mono" style="font-size: 11px;">{cp.label}</div>
						<span class="badge badge-pending mt-2">{cp.status.toUpperCase()}</span>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.guru-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	.guru-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 24px 24px 20px;
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(2rem, 5vw, 4rem);
		line-height: 0.9;
		letter-spacing: -0.04em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.guru-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--border-hard);
	}

	.guru-stats .stat-block {
		border: none;
	}

	@media (max-width: 767px) {
		.guru-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.section-header-block {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		background: var(--bg-panel);
		border-bottom: 1px solid var(--border-hard);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.chart-section {
		border-bottom: 1px solid var(--border-hard);
	}

	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 1px;
		background: var(--border-hard);
		padding: 0;
		height: 140px;
		position: relative;
	}

	.chart-bar-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: 8px;
		background: var(--bg-base);
		height: 100%;
	}

	.chart-bar-track {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		background: var(--bg-cell);
	}

	.chart-bar-fill {
		width: 100%;
		background: var(--red);
		min-height: 2px;
		transition: height 400ms;
	}

	.checkpoint-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--border-hard);
	}

	.checkpoint-item {
		background: var(--bg-base);
		padding: 20px;
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 767px) {
		.checkpoint-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>

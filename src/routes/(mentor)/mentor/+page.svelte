<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>DASHBOARD MENTOR — NLC</title>
</svelte:head>

<div class="mentor-shell">
	<!-- SIDEBAR (desktop) -->
	<aside class="sidebar hide-mobile">
		<div class="sidebar__brand">
			<div class="type-mono" style="font-size: 11px; font-weight: 700; color: var(--text-primary);">
				NLC
			</div>
			<div class="type-mono text-muted mt-1" style="font-size: 9px;">PORTAL MENTOR</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/mentor" class="sidebar__nav-item active">/// DASHBOARD</a>
			<a href="/mentor/kurikulum" class="sidebar__nav-item">/// KURIKULUM</a>
			<a href="/mentor/pertemuan" class="sidebar__nav-item">/// PERTEMUAN</a>
			<a href="/mentor/siswa" class="sidebar__nav-item">/// DATA SISWA</a>
			<a href="/mentor/grading" class="sidebar__nav-item">/// GRADING TUGAS</a>
		</nav>
		<div class="sidebar__footer">
			<hr class="rule" />
			<div style="padding: 16px 20px;">
				<div class="type-mono text-muted mb-1" style="font-size: 9px;">LOGGED IN AS</div>
				<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
					{data.user?.fullName}
				</div>
				<div class="type-mono text-muted" style="font-size: 9px;">@{data.user?.username}</div>
				<a
					href="/logout"
					class="btn-ghost mt-3"
					style="display: block; text-align: center; font-size: 10px;"
				>
					KELUAR
				</a>
			</div>
		</div>
	</aside>

	<!-- MAIN CONTENT -->
	<div class="mentor-main">
		<!-- Topbar (mobile) -->
		<header class="topbar hide-desktop">
			<div class="flex items-center gap-3">
				<span class="type-mono" style="font-size: 11px; font-weight: 700;">NLC</span>
				<span class="type-mono text-muted" style="font-size: 9px;">// MENTOR</span>
			</div>
			<a href="/logout" class="btn-ghost" style="padding: 5px 10px; font-size: 10px;">KELUAR</a>
		</header>

		<!-- Page header -->
		<div class="mentor-header">
			<div>
				<div class="type-mono text-muted mb-1" style="font-size: 9px;">
					[ MENTOR PANEL ] &nbsp;/// &nbsp; TA 2026/2027
				</div>
				<h1 class="mentor-title">{data.user?.fullName}</h1>
			</div>
			<div
				class="mentor-header__meta type-mono text-muted hide-mobile"
				style="font-size: 9px; text-align: right; line-height: 2;"
			>
				<div>KLS-01 &nbsp;/// &nbsp;MENTOR AKTIF</div>
				<div>@{data.user?.username}</div>
			</div>
		</div>

		<hr class="rule" />

		<!-- Overview stats -->
		<div class="mentor-stats">
			<div class="stat-block">
				<div class="stat-block__label">[ SISWA AKTIF ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">KLS-01 · TA 2026/2027</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ TUGAS MENUNGGU ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">PENDING APPROVAL</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ SESI BERIKUTNYA ]</div>
				<data class="stat-block__value" value="—">—</data>
				<div class="stat-block__meta">BELUM DIJADWALKAN</div>
			</div>
		</div>

		<hr class="rule" />

		<!-- Two-column content -->
		<div class="mentor-content">
			<!-- Grading queue -->
			<section class="mentor-section">
				<div class="section-header-block">
					<span>[ SUBMISSION PENDING APPROVAL ]</span>
					<span class="badge badge-pending">0 ITEM</span>
				</div>

				<div class="grading-table">
					<div class="grading-table__header">
						<span class="type-mono" style="font-size: 9px;">ID TUGAS</span>
						<span class="type-mono" style="font-size: 9px;">SISWA</span>
						<span class="type-mono" style="font-size: 9px;">DIKIRIM</span>
						<span class="type-mono hide-mobile" style="font-size: 9px;">STATUS</span>
					</div>
					<div class="grading-table__empty">
						<span class="type-mono text-muted" style="font-size: 10px;"
							>&gt;&gt; TIDAK ADA SUBMISSION</span
						>
					</div>
				</div>
			</section>

			<!-- Recent sessions -->
			<section class="mentor-section">
				<div class="section-header-block">
					<span>[ PERTEMUAN TERBARU ]</span>
				</div>
				<div class="session-list">
					<div class="grading-table__empty">
						<span class="type-mono text-muted" style="font-size: 10px;"
							>&gt;&gt; BELUM ADA PERTEMUAN</span
						>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.mentor-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	.sidebar__footer {
		margin-top: auto;
	}

	.mentor-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.mentor-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 24px 24px 20px;
	}

	.mentor-title {
		font-family: var(--font-macro);
		font-size: clamp(1.5rem, 4vw, 3rem);
		line-height: 0.95;
		letter-spacing: -0.03em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.mentor-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--border-hard);
	}

	.mentor-stats .stat-block {
		border: none;
	}

	.mentor-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border-hard);
		flex: 1;
	}

	@media (max-width: 767px) {
		.mentor-content {
			grid-template-columns: 1fr;
		}

		.mentor-stats {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.mentor-section {
		background: var(--bg-base);
		display: flex;
		flex-direction: column;
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

	.grading-table {
		display: flex;
		flex-direction: column;
	}

	.grading-table__header {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 1px;
		background: var(--border-soft);
		padding: 8px 20px;
		background: var(--bg-inset);
		border-bottom: 1px solid var(--border-soft);
		color: var(--text-muted);
	}

	.grading-table__empty {
		padding: 32px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.session-list {
		flex: 1;
	}
</style>

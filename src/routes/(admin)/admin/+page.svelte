<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>DASHBOARD ADMIN — NLC</title>
</svelte:head>

<div class="admin-shell">
	<!-- SIDEBAR -->
	<aside class="sidebar hide-mobile">
		<div class="sidebar__brand">
			<div class="type-mono" style="font-size: 11px; font-weight: 700; color: var(--text-primary);">
				NLC
			</div>
			<div
				class="type-mono mt-1"
				style="font-size: 9px; color: var(--red); letter-spacing: 0.08em;"
			>
				ADMIN PANEL
			</div>
		</div>
		<nav class="sidebar__nav">
			<a href="/admin" class="sidebar__nav-item active">/// OVERVIEW</a>
			<a href="/admin/users" class="sidebar__nav-item">/// MANAJEMEN USER</a>
			<a href="/admin/tahun-ajaran" class="sidebar__nav-item">/// TAHUN AJARAN</a>
			<a href="/admin/konfigurasi" class="sidebar__nav-item">/// KONFIGURASI POIN</a>
			<a href="/admin/audit" class="sidebar__nav-item">/// AUDIT LOG</a>
			<a href="/admin/master" class="sidebar__nav-item">/// MASTER DATA</a>
		</nav>
		<div style="margin-top: auto;">
			<hr class="rule" />
			<div style="padding: 16px 20px;">
				<div class="type-mono" style="font-size: 9px; color: var(--red);">⚠ ADMIN ACCESS</div>
				<div class="type-mono mt-1" style="font-size: 11px;">{data.user?.fullName}</div>
				<a
					href="/logout"
					class="btn-ghost mt-3"
					style="display: block; text-align: center; font-size: 10px; color: var(--red); border-color: var(--red-dim);"
				>
					TERMINATE SESSION
				</a>
			</div>
		</div>
	</aside>

	<!-- MAIN -->
	<div class="admin-main">
		<!-- Topbar mobile -->
		<header class="topbar hide-desktop" style="border-bottom: 2px solid var(--red);">
			<div class="flex items-center gap-3">
				<span class="type-mono" style="font-size: 11px; font-weight: 700;">NLC</span>
				<span class="type-mono" style="font-size: 9px; color: var(--red);">// ADMIN</span>
			</div>
			<a
				href="/logout"
				class="btn-ghost"
				style="padding: 5px 10px; font-size: 10px; color: var(--red); border-color: var(--red-dim);"
				>KELUAR</a
			>
		</header>

		<!-- Command header -->
		<div class="admin-header">
			<div>
				<div
					class="type-mono mb-1"
					style="font-size: 9px; color: var(--red); letter-spacing: 0.1em;"
				>
					[ PRIVILEGED ACCESS ] &nbsp;/// &nbsp; SYSTEM ADMINISTRATION
				</div>
				<h1 class="admin-title">SYSTEM<br />CONTROL</h1>
			</div>
			<div
				class="admin-header__sys type-mono text-muted hide-mobile"
				style="font-size: 9px; line-height: 2; text-align: right;"
			>
				<div style="color: var(--green-live);">● SYSTEM ONLINE</div>
				<div>TA 2026/2027</div>
				<div>@{data.user?.username}</div>
			</div>
		</div>

		<!-- Accent divider -->
		<hr class="rule-accent" />

		<!-- System status stats -->
		<div class="admin-stats">
			<div class="stat-block" style="border-left: 2px solid var(--red);">
				<div class="stat-block__label" style="color: var(--red);">[ TOTAL USER ]</div>
				<data class="stat-block__value" value="5">5</data>
				<div class="stat-block__meta">TERDAFTAR DI SISTEM</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ TAHUN AJARAN ]</div>
				<data class="stat-block__value" value="1">1</data>
				<div class="stat-block__meta">2026/2027 AKTIF</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ KELAS AKTIF ]</div>
				<data class="stat-block__value" value="1">1</data>
				<div class="stat-block__meta">KELAS 1 TA 2026/2027</div>
			</div>
			<div class="stat-block">
				<div class="stat-block__label">[ AUDIT LOG ]</div>
				<data class="stat-block__value" value="0">0</data>
				<div class="stat-block__meta">ENTRI TERBARU</div>
			</div>
		</div>

		<hr class="rule" />

		<!-- Two column: Quick actions + Audit stream -->
		<div class="admin-content">
			<!-- Quick actions -->
			<section class="admin-section">
				<div class="section-header-block">
					<span>[ QUICK ACTIONS ]</span>
				</div>
				<div class="action-grid">
					<a href="/admin/users/create" class="action-item">
						<div class="type-mono" style="font-size: 9px; color: var(--red); margin-bottom: 6px;">
							CMD/USER
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							+ TAMBAH USER
						</div>
					</a>
					<a href="/admin/tahun-ajaran/create" class="action-item">
						<div
							class="type-mono"
							style="font-size: 9px; color: var(--text-muted); margin-bottom: 6px;"
						>
							CMD/COHORT
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							+ BUKA TAHUN AJARAN
						</div>
					</a>
					<a href="/admin/master/room" class="action-item">
						<div
							class="type-mono"
							style="font-size: 9px; color: var(--text-muted); margin-bottom: 6px;"
						>
							CMD/MASTER
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							KELOLA RUANGAN
						</div>
					</a>
					<a href="/admin/konfigurasi" class="action-item">
						<div
							class="type-mono"
							style="font-size: 9px; color: var(--text-muted); margin-bottom: 6px;"
						>
							CMD/CONFIG
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							KONFIGURASI POIN
						</div>
					</a>
					<a href="/admin/audit" class="action-item">
						<div
							class="type-mono"
							style="font-size: 9px; color: var(--text-muted); margin-bottom: 6px;"
						>
							CMD/AUDIT
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							LIHAT AUDIT LOG
						</div>
					</a>
					<a href="/admin/users" class="action-item">
						<div
							class="type-mono"
							style="font-size: 9px; color: var(--text-muted); margin-bottom: 6px;"
						>
							CMD/RESET
						</div>
						<div class="type-mono" style="font-size: 11px; color: var(--text-primary);">
							RESET PASSWORD
						</div>
					</a>
				</div>
			</section>

			<!-- Audit log stream -->
			<section class="admin-section">
				<div class="section-header-block">
					<span>[ AUDIT LOG STREAM ]</span>
					<span class="type-mono text-muted" style="font-size: 9px;">REAL-TIME</span>
				</div>
				<div class="audit-stream">
					<div class="audit-stream__empty">
						<span class="type-mono text-muted" style="font-size: 10px;">
							&gt;&gt; LOG STREAM KOSONG<br />
							&gt;&gt; MENUNGGU AKTIVITAS SISTEM
						</span>
					</div>
				</div>
			</section>
		</div>

		<!-- System info footer -->
		<div class="admin-footer">
			<div class="type-mono text-muted" style="font-size: 9px;">
				NLC SYSTEM &nbsp;/// &nbsp;REV 2.0 &nbsp;/// &nbsp;BUILD 2026-08
			</div>
			<div class="type-mono" style="font-size: 9px; color: var(--green-live);">
				● ALL SYSTEMS OPERATIONAL
			</div>
		</div>
	</div>
</div>

<style>
	.admin-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	.admin-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.admin-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 24px 24px 20px;
	}

	.admin-title {
		font-family: var(--font-macro);
		font-size: clamp(2.5rem, 6vw, 5rem);
		line-height: 0.88;
		letter-spacing: -0.05em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.admin-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--border-hard);
	}

	.admin-stats .stat-block {
		border: none;
	}

	@media (max-width: 767px) {
		.admin-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.admin-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border-hard);
		flex: 1;
	}

	@media (max-width: 767px) {
		.admin-content {
			grid-template-columns: 1fr;
		}
	}

	.admin-section {
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

	.action-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border-hard);
	}

	.action-item {
		background: var(--bg-base);
		padding: 20px;
		display: flex;
		flex-direction: column;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 100ms;
	}

	.action-item:hover {
		background: var(--bg-cell);
	}

	.action-item:hover .type-mono[style*='text-primary'] {
		color: var(--red) !important;
	}

	.audit-stream {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		overflow-y: auto;
		max-height: 400px;
	}

	.audit-stream__empty {
		padding: 32px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		line-height: 2;
	}

	.admin-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 24px;
		border-top: 1px solid var(--border-hard);
		background: var(--bg-panel);
	}

	hr.rule-accent {
		border: none;
		border-top: 2px solid var(--red);
	}
</style>

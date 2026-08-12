<script lang="ts">
	import { page } from '$app/stores';
	import { NavigationRegistry } from '$lib/navigation/registry';
	import type { Snippet } from 'svelte';

	interface User {
		id?: number | string;
		fullName?: string;
		username?: string;
		role?: 'siswa' | 'mentor' | 'guru' | 'admin' | string;
	}

	let {
		user = undefined,
		children
	}: {
		user?: User;
		children: Snippet;
	} = $props();

	// Fallback to $page.data.user if user prop is not passed directly
	let currentUser = $derived(user ?? $page.data.user);
	let pathname = $derived($page.url.pathname);
	let role = $derived(NavigationRegistry.deriveRole(currentUser?.role?.toLowerCase(), pathname));

	// Sidebar collapsed state
	let sidebarCollapsed = $state(false);

	// Keyboard shortcut '[' to toggle sidebar collapse
	function handleKeyDown(e: KeyboardEvent) {
		const tgt = e.target;
		if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || tgt instanceof HTMLSelectElement) return;
		if (e.key === '[') {
			e.preventDefault();
			sidebarCollapsed = !sidebarCollapsed;
		}
	}

	// Role titles and badges
	const roleMeta: Record<string, { label: string; badge: string; color: string; bg: string }> = {
		siswa: { label: 'Portal Siswa', badge: 'SISWA', color: '#4f46e5', bg: '#e0e7ff' },
		mentor: { label: 'Portal Mentor', badge: 'MENTOR AKTIF', color: '#4f46e5', bg: '#e0e7ff' },
		guru: { label: 'Portal Guru', badge: 'GURU OBSERVER', color: '#0d9488', bg: '#ccfbf1' },
		admin: { label: 'Panel Admin', badge: 'ADMINISTRATOR', color: '#dc2626', bg: '#fee2e2' }
	};

	let currentRoleMeta = $derived(roleMeta[role] ?? roleMeta.siswa);

	// Nav items for each role
	let navItems = $derived(() => {
		if (role === 'mentor') {
			return [
				{
					href: '/mentor',
					label: 'Dashboard',
					exact: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/mentor/kurikulum',
					label: 'Kurikulum',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
				},
				{
					href: '/mentor/pertemuan',
					label: 'Pertemuan',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/mentor/siswa',
					label: 'Data Siswa',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				},
				{
					href: '/mentor/grading',
					label: 'Grading Tugas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
				}
			];
		}

		if (role === 'guru') {
			return [
				{
					href: '/guru',
					label: 'Overview',
					exact: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/guru/kehadiran',
					label: 'Kehadiran',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
				},
				{
					href: '/guru/progress',
					label: 'Progress Kelas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
				},
				{
					href: '/guru/pertemuan',
					label: 'Daftar Pertemuan',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				}
			];
		}

		if (role === 'admin') {
			return [
				{
					href: '/admin',
					label: 'Overview',
					exact: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/admin/users',
					label: 'Manajemen User',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				},
				{
					href: '/admin/tahun-ajaran',
					label: 'Tahun Ajaran',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/admin/konfigurasi',
					label: 'Konfigurasi Poin',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`
				},
				{
					href: '/admin/audit',
					label: 'Audit Log Stream',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
				},
				{
					href: '/admin/master',
					label: 'Master Data',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
				}
			];
		}

		// Default: Siswa
		return [
			{
				href: '/siswa',
				label: 'Beranda',
				exact: true,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
			},
			{
				href: '/siswa/kurikulum',
				label: 'Materi & Kurikulum',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
			},
			{
				href: '/siswa/jadwal',
				label: 'Jadwal Pertemuan',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
			},
			{
				href: '/siswa/progress',
				label: 'Progress Belajar',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
			}
		];
	});

	function isItemActive(item: { href: string; exact: boolean }) {
		if (item.exact) return pathname === item.href;
		return pathname.startsWith(item.href);
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="nlc-app-shell">
	<!-- ══════════════════════════════════════════════════════════
	     DESKTOP & TABLET UNIFIED SIDEBAR (COLLAPSIBLE)
	     ══════════════════════════════════════════════════════════ -->
	<aside class="app-sidebar hide-mobile" class:app-sidebar--collapsed={sidebarCollapsed} aria-label="Navigasi Utama">
		<!-- Brand Header -->
		<div class="sidebar__brand">
			{#if !sidebarCollapsed}
				<a href="/{role}" class="brand-link">
					<span class="brand-logo">NLC</span>
					<span class="brand-sub">{currentRoleMeta.label}</span>
				</a>
			{:else}
				<a href="/{role}" class="brand-link-collapsed" title="Nesaga Learning Community">
					<span class="brand-logo-sm">N</span>
				</a>
			{/if}
		</div>

		<!-- Nav Items -->
		<nav class="sidebar__nav">
			{#each navItems() as item}
				{@const active = isItemActive(item)}
				<a
					href={item.href}
					class="nav-item"
					class:nav-item--active={active}
					title={sidebarCollapsed ? item.label : undefined}
					aria-current={active ? 'page' : undefined}
				>
					<span class="nav-item__icon">{@html item.icon}</span>
					{#if !sidebarCollapsed}
						<span class="nav-item__label">{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- User Section Pinned to Bottom -->
		<div class="sidebar__user">
			<div class="sidebar-user-divider"></div>
			{#if sidebarCollapsed}
				<div class="user-avatar-sm" title="{currentUser?.fullName ?? 'Pengguna'} ({currentRoleMeta.badge})">
					{currentUser?.fullName?.charAt(0) ?? 'U'}
				</div>
			{:else}
				<div class="user-profile-box">
					<div class="user-avatar">{currentUser?.fullName?.charAt(0) ?? 'U'}</div>
					<div class="user-profile-info">
						<div class="user-name">{currentUser?.fullName ?? 'Pengguna'}</div>
						<div class="user-badge" style="color: {currentRoleMeta.color};">{currentRoleMeta.badge}</div>
					</div>
				</div>
				<a href="/logout" class="logout-btn" aria-label="Keluar dari akun">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
						<polyline points="16 17 21 12 16 7"/>
						<line x1="21" y1="12" x2="9" y2="12"/>
					</svg>
					<span>Keluar</span>
				</a>
			{/if}
		</div>

		<!-- Collapse Toggle Button -->
		<button
			type="button"
			class="sidebar-collapse-toggle"
			onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
			aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
			title="Toggle sidebar [ ]"
		>
			{#if sidebarCollapsed}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="9 18 15 12 9 6"/>
				</svg>
			{:else}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="15 18 9 12 15 6"/>
				</svg>
			{/if}
		</button>
	</aside>

	<!-- ══════════════════════════════════════════════════════════
	     MAIN CONTENT AREA
	     ══════════════════════════════════════════════════════════ -->
	<div class="app-main-area">
		<!-- Topbar Header (Mobile & Desktop) -->
		<header class="app-topbar">
			<div class="topbar-left">
				<a href="/{role}" class="topbar-brand hide-desktop">
					<span class="brand-logo" style="font-size: 1.25rem;">NLC</span>
					<span class="topbar-role-tag">{currentRoleMeta.label}</span>
				</a>

				<div class="topbar-badge-desktop hide-mobile">
					<span class="badge" style="background: {currentRoleMeta.bg}; color: {currentRoleMeta.color};">
						{currentRoleMeta.badge}
					</span>
					<span class="type-mono text-muted" style="font-size: 11px;">TA 2026/2027</span>
				</div>
			</div>

			<div class="topbar-right">
				<div class="user-pill hide-mobile">
					<div class="user-pill-avatar">{currentUser?.fullName?.charAt(0) ?? 'U'}</div>
					<span class="user-pill-name">{currentUser?.fullName ?? 'User'}</span>
				</div>
				<a href="/logout" class="btn-ghost hide-desktop" style="padding: 6px 12px; font-size: 12px;">
					Keluar
				</a>
			</div>
		</header>

		<!-- Page Content Injection -->
		<main class="app-content pb-safe">
			{@render children()}
		</main>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     MOBILE BOTTOM NAVIGATION BAR
	     ══════════════════════════════════════════════════════════ -->
	<nav class="app-bottom-nav hide-desktop" aria-label="Navigasi Bawah Seluler">
		{#each navItems().slice(0, 4) as item}
			{@const active = isItemActive(item)}
			<a href={item.href} class="bottom-nav-item" class:bottom-nav-item--active={active} aria-current={active ? 'page' : undefined}>
				<span class="bottom-nav-icon">{@html item.icon}</span>
				<span class="bottom-nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.nlc-app-shell {
		display: flex;
		min-height: 100vh;
		background-color: var(--bg-base);
	}

	/* ── Sidebar ── */
	.app-sidebar {
		width: 260px;
		min-height: 100vh;
		background: #ffffff;
		border-right: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 40;
		flex-shrink: 0;
	}

	.app-sidebar--collapsed {
		width: 68px;
	}

	/* Brand Header */
	.sidebar__brand {
		padding: 20px 18px 16px;
		border-bottom: 1px solid var(--border-hard);
		min-height: 72px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow: hidden;
	}

	.brand-link {
		text-decoration: none;
		display: flex;
		flex-direction: column;
	}

	.brand-logo {
		font-family: var(--font-macro);
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--primary);
		letter-spacing: -0.035em;
		line-height: 1.1;
	}

	.brand-sub {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--text-muted);
		margin-top: 3px;
		letter-spacing: 0.02em;
	}

	.brand-link-collapsed {
		text-decoration: none;
		display: flex;
		justify-content: center;
	}

	.brand-logo-sm {
		font-family: var(--font-macro);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--primary);
	}

	/* Nav List */
	.sidebar__nav {
		flex: 1;
		padding: 12px 10px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		overflow-y: auto;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		white-space: nowrap;
		transition: background 150ms ease, color 150ms ease, transform 150ms ease;
		min-height: 40px;
	}

	.nav-item:hover {
		background: var(--primary-light);
		color: var(--primary);
	}

	.nav-item--active {
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff !important;
		box-shadow: var(--shadow-glow);
	}

	.nav-item--active:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		color: #ffffff !important;
	}

	.nav-item__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
	}

	.nav-item__label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* User Section Pinned to Bottom */
	.sidebar__user {
		padding: 12px 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow: hidden;
		background: #ffffff;
	}

	.sidebar-user-divider {
		height: 1px;
		background: var(--border-hard);
		margin-bottom: 4px;
	}

	.user-profile-box {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px;
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: white;
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
	}

	.user-avatar-sm {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: white;
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 4px auto;
		cursor: default;
	}

	.user-profile-info {
		overflow: hidden;
		min-width: 0;
	}

	.user-name {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.03em;
		margin-top: 1px;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--radius-md);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		border: 1px solid var(--border-hard);
		background: var(--bg-inset);
		transition: all 150ms ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.logout-btn:hover {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
	}

	/* Collapse Toggle Button */
	.sidebar-collapse-toggle {
		position: absolute;
		top: 22px;
		right: -13px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1.5px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: color 150ms ease, background 150ms ease, transform 150ms ease;
		z-index: 10;
	}

	.sidebar-collapse-toggle:hover {
		background: var(--primary-light);
		color: var(--primary);
		transform: scale(1.1);
	}

	/* ── Main Area ── */
	.app-main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Topbar */
	.app-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 28px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-hard);
		position: sticky;
		top: 0;
		z-index: 30;
	}

	@media (max-width: 768px) {
		.app-topbar {
			padding: 12px 16px;
		}
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.topbar-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}

	.topbar-role-tag {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.topbar-badge-desktop {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.user-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--bg-cell);
		border: 1px solid var(--border-hard);
		border-radius: 9999px;
		padding: 4px 12px 4px 4px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.user-pill-avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--primary);
		color: white;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.user-pill-name {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.app-content {
		flex: 1;
		min-width: 0;
	}

	/* ── Bottom Nav (Mobile) ── */
	.app-bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		background: rgba(255, 255, 255, 0.98);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid var(--border-hard);
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
		box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06);
	}

	.bottom-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 6px 2px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 10px;
		font-weight: 600;
		transition: color 150ms ease;
		border-radius: 8px;
	}

	.bottom-nav-item:hover,
	.bottom-nav-item--active {
		color: var(--primary);
	}

	.bottom-nav-item--active .bottom-nav-icon {
		color: var(--primary);
		transform: scale(1.1);
	}

	.bottom-nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 150ms ease, color 150ms ease;
	}

	.bottom-nav-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 72px;
	}
</style>

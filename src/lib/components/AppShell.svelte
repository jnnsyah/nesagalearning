<script lang="ts">
	import { page } from '$app/stores';
	import { NavigationRegistry } from '$lib/navigation/registry';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import type { Snippet } from 'svelte';

	interface User {
		id?: number | string;
		fullName?: string;
		username?: string;
		role?: 'siswa' | 'mentor' | 'guru' | 'admin' | string;
		avatarUrl?: string | null;
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

	// Focus mode / Reading mode detection (Materi Reader for Siswa & Modul Builder for Mentor)
	let isFocusMode = $derived.by(() => {
		if (pathname.startsWith('/siswa/materi/') && pathname !== '/siswa/materi') {
			return true;
		}
		if (/\/mentor\/kurikulum\/[^\/]+\/materi\/[^\/]+/.test(pathname)) {
			return true;
		}
		return false;
	});

	// Sidebar collapsed state
	let sidebarCollapsed = $state(false);

	// Logout confirmation modal state
	let showLogoutModal = $state(false);

	// Mobile More navigation drawer sheet state
	let showMoreDrawer = $state(false);

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

	// Desktop Sidebar Navigation Items
	let desktopNavItems = $derived(() => {
		if (role === 'mentor') {
			return [
				{
					href: '/mentor',
					label: 'Dashboard',
					exact: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/mentor/progress',
					label: 'Progress Pembelajaran',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
				},
				{
					href: '/mentor/siswa',
					label: 'Data Siswa',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				},
				{
					href: '/mentor/kurikulum',
					label: 'Track Pembelajaran',
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
					href: '/mentor/jadwal',
					label: 'Kalender Jadwal',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`
				},
				{
					href: '/mentor/tugas',
					label: 'Penilaian Tugas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
				},
				{
					href: '/mentor/profile',
					label: 'Profil Saya',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
				}
			];
		}

		if (role === 'guru') {
			return [
				{
					href: '/guru',
					label: 'Dashboard',
					exact: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/guru/monitoring',
					label: 'Health Monitoring',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
				},
				{
					href: '/guru/kurikulum',
					label: 'Pantau Track Pembelajaran',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
				},
				{
					href: '/guru/presensi',
					label: 'Rekap Presensi',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/guru/profile',
					label: 'Profil Saya',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
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
					href: '/admin/kelas',
					label: 'Manajemen Roster & Kelas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
				},
				{
					href: '/admin/tahun-ajaran',
					label: 'Periode Komunitas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/admin/master',
					label: 'Master Data Operasional',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"/></svg>`
				},
				{
					href: '/admin/konfigurasi',
					label: 'Konfigurasi Poin',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 1 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`
				},
				{
					href: '/admin/email',
					label: 'Manajemen Email',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
				},
				{
					href: '/admin/audit-logs',
					label: 'Audit Log Stream',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
				},
				{
					href: '/admin/profile',
					label: 'Profil Saya',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
				}
			];
		}

		// Siswa Desktop Sidebar: Beranda is #1 (Top)
		return [
			{
				href: '/siswa',
				label: 'Beranda',
				exact: true,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
			},
			{
				href: '/siswa/materi',
				label: 'Materi',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
			},
			{
				href: '/siswa/tugas',
				label: 'Tugas',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
			},
			{
				href: '/siswa/pertemuan',
				label: 'Pertemuan',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
			},
			{
				href: '/siswa/progress',
				label: 'Progress',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
			},
			{
				href: '/siswa/profile',
				label: 'Profil',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
			}
		];
	});

	// Items for Mobile Bottom Sheet "Lainnya" Drawer (Mentor & Admin)
	let moreNavItems = $derived(() => {
		if (role === 'mentor') {
			return [
				{
					href: '/mentor/kurikulum',
					label: 'Track Pembelajaran',
					desc: 'Pantau modul & bab pembelajaran siswa',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
				},
				{
					href: '/mentor/jadwal',
					label: 'Kalender Jadwal',
					desc: 'Lihat & atur jadwal pertemuan mentor',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`
				},
				{
					href: '/mentor/tugas',
					label: 'Penilaian Tugas',
					desc: 'Review & beri nilai kiriman tugas siswa',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
				},
				{
					href: '/mentor/profile',
					label: 'Profil Saya',
					desc: 'Kelola akun & detail profil mentor',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
				}
			];
		}

		if (role === 'admin') {
			return [
				{
					href: '/admin/tahun-ajaran',
					label: 'Periode Komunitas',
					desc: 'Kelola tahun ajaran & periode aktif',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/admin/konfigurasi',
					label: 'Konfigurasi Poin',
					desc: 'Pengaturan XP, streak, & poin presensi',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 1 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`
				},
				{
					href: '/admin/email',
					label: 'Manajemen Email',
					desc: 'Template & Log pengiriman email sistem',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
				},
				{
					href: '/admin/audit-logs',
					label: 'Audit Log Stream',
					desc: 'Monitor aktivitas & histori aksi sistem',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
				},
				{
					href: '/admin/profile',
					label: 'Profil Saya',
					desc: 'Kelola kredensial & akun admin',
					icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
				}
			];
		}

		return [];
	});

	// Mobile Bottom Navigation Items (Unified Sweet Spot 5-Item Architecture)
	let mobileNavItems = $derived(() => {
		if (role === 'mentor') {
			return [
				{
					href: '/mentor/progress',
					label: 'Progress',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
				},
				{
					href: '/mentor/siswa',
					label: 'Siswa',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				},
				{
					href: '/mentor',
					label: 'Dashboard',
					exact: true,
					isCenter: true,
					icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/mentor/pertemuan',
					label: 'Pertemuan',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '#more',
					label: 'Lainnya',
					exact: false,
					isMore: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>`
				}
			];
		}

		if (role === 'admin') {
			return [
				{
					href: '/admin/users',
					label: 'User',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				},
				{
					href: '/admin/kelas',
					label: 'Kelas',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
				},
				{
					href: '/admin',
					label: 'Overview',
					exact: true,
					isCenter: true,
					icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/admin/master',
					label: 'Master',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"/></svg>`
				},
				{
					href: '#more',
					label: 'Lainnya',
					exact: false,
					isMore: true,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>`
				}
			];
		}

		if (role === 'guru') {
			return [
				{
					href: '/guru/monitoring',
					label: 'Monitoring',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
				},
				{
					href: '/guru/kurikulum',
					label: 'Kurikulum',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
				},
				{
					href: '/guru',
					label: 'Dashboard',
					exact: true,
					isCenter: true,
					icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`
				},
				{
					href: '/guru/presensi',
					label: 'Presensi',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
				},
				{
					href: '/guru/profile',
					label: 'Profil',
					exact: false,
					icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
				}
			];
		}

		// Siswa Mobile Bottom Nav: Beranda is 3rd item in the center (floating)
		return [
			{
				href: '/siswa/materi',
				label: 'Materi',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
			},
			{
				href: '/siswa/tugas',
				label: 'Tugas',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
			},
			{
				href: '/siswa',
				label: 'Beranda',
				exact: true,
				isCenter: true,
				icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
			},
			{
				href: '/siswa/pertemuan',
				label: 'Pertemuan',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
			},
			{
				href: '/siswa/progress',
				label: 'Progress',
				exact: false,
				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
			}
		];
	});

	function isItemActive(item: { href: string; exact: boolean; isMore?: boolean }) {
		if (item.isMore) {
			return moreNavItems().some((sub) => pathname.startsWith(sub.href));
		}
		if (item.exact) return pathname === item.href;
		return pathname.startsWith(item.href);
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="nlc-app-shell" class:focus-mode-active={isFocusMode}>
	<!-- ══════════════════════════════════════════════════════════
	     DESKTOP & TABLET UNIFIED SIDEBAR (COLLAPSIBLE)
	     ══════════════════════════════════════════════════════════ -->
	{#if !isFocusMode}
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
				{#each desktopNavItems() as item}
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
					<a href="/{role}/profile" class="user-avatar-sm" title="{currentUser?.fullName ?? 'Pengguna'} ({currentRoleMeta.badge})">
							{#if currentUser?.avatarUrl}
								<img src={currentUser.avatarUrl} alt={currentUser?.fullName} class="user-avatar-img" referrerpolicy="no-referrer" />
							{:else}
							{currentUser?.fullName?.charAt(0) ?? 'U'}
						{/if}
					</a>
				{:else}
					<a href="/{role}/profile" class="user-profile-box user-profile-box--link" title="Lihat Profil Saya">
						<div class="user-avatar">
							{#if currentUser?.avatarUrl}
								<img src={currentUser.avatarUrl} alt={currentUser?.fullName} class="user-avatar-img" referrerpolicy="no-referrer" />
							{:else}
								{currentUser?.fullName?.charAt(0) ?? 'U'}
							{/if}
						</div>
						<div class="user-profile-info">
							<div class="user-name">{currentUser?.fullName ?? 'Pengguna'}</div>
							<div class="user-badge" style="color: {currentRoleMeta.color};">{currentRoleMeta.badge}</div>
						</div>
					</a>
					<button
						type="button"
						onclick={() => (showLogoutModal = true)}
						class="logout-btn"
						aria-label="Keluar dari akun"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
							<polyline points="16 17 21 12 16 7"/>
							<line x1="21" y1="12" x2="9" y2="12"/>
						</svg>
						<span>Keluar</span>
					</button>
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
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     MAIN CONTENT AREA
	     ══════════════════════════════════════════════════════════ -->
	<div class="app-main-area">
		{#if !isFocusMode}
			<!-- Topbar Header (Mobile & Desktop) -->
			<header class="app-topbar">
				<div class="topbar-left">
					<a href="/{role}" class="topbar-brand">
						<span class="brand-logo" style="font-size: 1.25rem;">NLC</span>
						<span class="topbar-role-tag">{currentRoleMeta.label}</span>
					</a>
				</div>

				<div class="topbar-right">
					<a href="/{role}/profile" class="user-pill" title="Lihat Profil Saya">
						<div class="user-pill-avatar">
							{#if currentUser?.avatarUrl}
								<img src={currentUser.avatarUrl} alt={currentUser?.fullName} class="user-avatar-img" referrerpolicy="no-referrer" />
							{:else}
								{currentUser?.fullName?.charAt(0) ?? 'U'}
							{/if}
						</div>
						<span class="user-pill-name">{currentUser?.fullName ?? 'User'}</span>
					</a>
					<NotificationBell />
					<button
						type="button"
						onclick={() => (showLogoutModal = true)}
						class="btn-logout-icon"
						aria-label="Keluar dari akun"
						title="Keluar dari Akun"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
							<polyline points="16 17 21 12 16 7"/>
							<line x1="21" y1="12" x2="9" y2="12"/>
						</svg>
					</button>
				</div>
			</header>
		{/if}

		<!-- Page Content Injection -->
		<main class="app-content pb-safe">
			{@render children()}
		</main>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     MOBILE BOTTOM NAVIGATION BAR
	     ══════════════════════════════════════════════════════════ -->
	{#if !isFocusMode}
		<nav class="app-bottom-nav hide-desktop" aria-label="Navigasi Bawah Seluler">
			{#each mobileNavItems() as item}
				{@const active = isItemActive(item)}
				<a
					href={item.href}
					class="bottom-nav-item {item.isCenter ? 'bottom-nav-item--center' : ''}"
					class:bottom-nav-item--active={active}
					aria-current={active ? 'page' : undefined}
					onclick={(e) => {
						if (item.isMore) {
							e.preventDefault();
							showMoreDrawer = true;
						}
					}}
				>
					<span class="bottom-nav-icon">{@html item.icon}</span>
					<span class="bottom-nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     MOBILE BOTTOM SHEET DRAWER (MENU LAINNYA)
	     ══════════════════════════════════════════════════════════ -->
	{#if showMoreDrawer}
		<div
			class="more-drawer-overlay hide-desktop"
			onclick={() => (showMoreDrawer = false)}
			role="presentation"
		>
			<div
				class="more-drawer-sheet"
				onclick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="more-drawer-title"
			>
				<div class="more-drawer-handle" aria-hidden="true"></div>

				<div class="more-drawer-header">
					<div class="more-drawer-header-info">
						<h3 id="more-drawer-title" class="more-drawer-title">Menu Lainnya</h3>
						<span
							class="more-drawer-role-badge"
							style="color: {currentRoleMeta.color}; background: {currentRoleMeta.bg};"
						>
							{currentRoleMeta.badge}
						</span>
					</div>
					<button
						type="button"
						class="btn-close-more-drawer"
						onclick={() => (showMoreDrawer = false)}
						aria-label="Tutup menu"
					>
						&times;
					</button>
				</div>

				<div class="more-drawer-body">
					<div class="more-drawer-grid">
						{#each moreNavItems() as subItem}
							{@const subActive = pathname.startsWith(subItem.href)}
							<a
								href={subItem.href}
								class="more-drawer-item"
								class:more-drawer-item--active={subActive}
								onclick={() => (showMoreDrawer = false)}
							>
								<div class="more-drawer-icon">{@html subItem.icon}</div>
								<div class="more-drawer-text">
									<div class="more-drawer-label">{subItem.label}</div>
									{#if subItem.desc}
										<div class="more-drawer-desc">{subItem.desc}</div>
									{/if}
								</div>
								<svg
									class="more-drawer-arrow"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="9 18 15 12 9 6" />
								</svg>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Confirm Modal Logout -->
	<ConfirmModal
		bind:open={showLogoutModal}
		title="Keluar dari Akun?"
		message="Apakah Anda yakin ingin keluar dari akun? Sesi Anda akan diakhiri."
		confirmText="Ya, Keluar"
		cancelText="Batal"
		variant="danger"
		onconfirm={() => {
			showLogoutModal = false;
			window.location.href = '/logout';
		}}
	/>
</div>

<style>
	.nlc-app-shell {
		display: flex;
		min-height: 100vh;
		background-color: var(--bg-base);
	}

	.btn-logout-topbar {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #ffffff;
		border: 1px solid #fca5a5;
		color: #e11d48;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-logout-topbar:hover {
		background: #ffe4e6;
		border-color: #e11d48;
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
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: background 150ms ease;
	}

	.user-profile-box--link:hover {
		background: var(--primary-light);
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
		overflow: hidden;
	}

	.user-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
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
		cursor: pointer;
		text-decoration: none;
		overflow: hidden;
	}

	.user-avatar-sm:hover {
		transform: scale(1.05);
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
		text-decoration: none;
		transition: all 150ms ease;
	}

	.user-pill:hover {
		background: var(--primary-light);
		border-color: var(--primary-border);
		color: var(--primary);
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
		overflow: hidden;
	}

	.user-pill-name {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-logout-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: #ffffff;
		border: 1px solid #fca5a5;
		color: #e11d48;
		border-radius: 8px;
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.btn-logout-icon:hover {
		background: #ffe4e6;
		border-color: #e11d48;
	}

	@media (max-width: 640px) {
		.user-pill-name {
			max-width: 84px;
			font-size: 11.5px;
		}
		.topbar-role-tag {
			display: none;
		}
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
		height: 58px;
		box-sizing: content-box;
		z-index: 999;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		align-items: center;
		padding: 0 0 env(safe-area-inset-bottom, 0px);
	}

	.app-bottom-nav::before {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid var(--border-hard);
		box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
		z-index: 0;
		pointer-events: none;
	}

	.bottom-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 2px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 10px;
		font-weight: 600;
		transition: color 150ms ease;
		position: relative;
		z-index: 1;
	}

	.bottom-nav-item:hover,
	.bottom-nav-item--active {
		color: var(--primary);
	}

	.bottom-nav-item--active .bottom-nav-icon {
		color: var(--primary);
	}

	.bottom-nav-item--center {
		justify-content: flex-end;
		padding-bottom: 6px;
	}

	.bottom-nav-item--center .bottom-nav-icon {
		position: absolute;
		top: -18px;
		left: 50%;
		transform: translateX(-50%);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
		color: #ffffff !important;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
		border: 3px solid #ffffff;
		transition: transform 150ms ease, background 150ms ease;
	}

	.bottom-nav-item--center.bottom-nav-item--active .bottom-nav-icon {
		background: linear-gradient(135deg, #4338ca 0%, #312e81 100%);
		transform: translateX(-50%) scale(1.06);
	}

	.bottom-nav-item--center .bottom-nav-label {
		font-weight: 800;
		color: #4f46e5;
		font-size: 9.5px;
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
		max-width: 68px;
		font-size: 10px;
		line-height: 1;
	}

	/* ── Mobile Bottom Sheet Drawer (Menu Lainnya) ── */
	.more-drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		animation: fadeInDrawerOverlay 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes fadeInDrawerOverlay {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.more-drawer-sheet {
		width: 100%;
		max-width: 540px;
		background: #ffffff;
		border-radius: 20px 20px 0 0;
		padding: 12px 18px 24px 18px;
		box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.18);
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		animation: slideUpDrawerSheet 250ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}

	@keyframes slideUpDrawerSheet {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.more-drawer-handle {
		width: 38px;
		height: 4px;
		background: #cbd5e1;
		border-radius: 9999px;
		margin: 0 auto 12px auto;
	}

	.more-drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 12px;
		margin-bottom: 12px;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
	}

	.more-drawer-header-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.more-drawer-title {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
	}

	.more-drawer-role-badge {
		font-size: 10px;
		font-weight: 800;
		padding: 2px 8px;
		border-radius: 9999px;
		letter-spacing: 0.5px;
	}

	.btn-close-more-drawer {
		background: #f1f5f9;
		border: none;
		color: #64748b;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.btn-close-more-drawer:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.more-drawer-body {
		overflow-y: auto;
		max-height: 60vh;
	}

	.more-drawer-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.more-drawer-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		text-decoration: none;
		color: var(--text-main, #0f172a);
		transition: all 150ms ease;
	}

	.more-drawer-item:hover,
	.more-drawer-item--active {
		background: #eef2ff;
		border-color: #c7d2fe;
		color: #4f46e5;
	}

	.more-drawer-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #ffffff;
		color: #4f46e5;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		border: 1px solid #e0e7ff;
		flex-shrink: 0;
	}

	.more-drawer-item--active .more-drawer-icon {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.more-drawer-text {
		flex: 1;
		min-width: 0;
	}

	.more-drawer-label {
		font-size: 13.5px;
		font-weight: 700;
		line-height: 1.3;
	}

	.more-drawer-desc {
		font-size: 11px;
		color: #64748b;
		margin-top: 1px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.more-drawer-arrow {
		color: #94a3b8;
		flex-shrink: 0;
		transition: transform 150ms ease;
	}

	.more-drawer-item:hover .more-drawer-arrow {
		transform: translateX(2px);
		color: #4f46e5;
	}
</style>

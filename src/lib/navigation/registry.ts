export type Role = 'siswa' | 'mentor' | 'guru' | 'admin';

export interface NavItem {
	label: string;
	href: string;
	icon: string;
	badge?: string;
}

export const ROLE_NAV_ITEMS: Record<Role, NavItem[]> = {
	siswa: [
		{ label: 'Dashboard', href: '/siswa', icon: 'dashboard' },
		{ label: 'Presensi QR', href: '/siswa/presensi', icon: 'calendar' },
		{ label: 'Kurikulum Saya', href: '/siswa/kurikulum', icon: 'book' },
		{ label: 'Jadwal & Pertemuan', href: '/siswa/pertemuan', icon: 'calendar' },
		{ label: 'Tugas Saya', href: '/siswa/tugas', icon: 'task' },
		{ label: 'Poin & Ranking', href: '/siswa/leaderboard', icon: 'trophy' },
		{ label: 'Profil Saya', href: '/siswa/profile', icon: 'user' }
	],
	mentor: [
		{ label: 'Dashboard', href: '/mentor', icon: 'dashboard' },
		{ label: 'Pertemuan Sesi', href: '/mentor/pertemuan', icon: 'calendar' },
		{ label: 'Kelola Presensi', href: '/mentor/presensi', icon: 'users' },
		{ label: 'Kurikulum', href: '/mentor/kurikulum', icon: 'book' },
		{ label: 'Data Siswa', href: '/mentor/siswa', icon: 'users' },
		{ label: 'Grading Tugas', href: '/mentor/grading', icon: 'task', badge: 'PENDING' },
		{ label: 'Profil Saya', href: '/mentor/profile', icon: 'user' }
	],
	guru: [
		{ label: 'Dashboard Overview', href: '/guru', icon: 'dashboard' },
		{ label: 'Pantau Kurikulum', href: '/guru/kurikulum', icon: 'book' },
		{ label: 'Rekap Presensi', href: '/guru/presensi', icon: 'calendar' },
		{ label: 'Laporan Siswa', href: '/guru/siswa', icon: 'users' },
		{ label: 'Profil Saya', href: '/guru/profile', icon: 'user' }
	],
	admin: [
		{ label: 'Control Center', href: '/admin', icon: 'dashboard' },
		{ label: 'Kelola User', href: '/admin/users', icon: 'users' },
		{ label: 'Master Operasional', href: '/admin/master', icon: 'database' },
		{ label: 'Audit Log System', href: '/admin/audit-logs', icon: 'activity' },
		{ label: 'Profil Saya', href: '/admin/profile', icon: 'user' }
	]
};

export const ROLE_LABELS: Record<Role, { title: string; badgeClass: string }> = {
	siswa: { title: 'Portal Siswa', badgeClass: 'badge-live' },
	mentor: { title: 'Portal Mentor', badgeClass: 'badge-hadir' },
	guru: { title: 'Supervisi Guru', badgeClass: 'badge-pending' },
	admin: { title: 'Admin Console', badgeClass: 'badge-excused' }
};

/**
 * NavigationRegistry — Deep module for resolving role navigation items, active path matching, and role badges.
 */
export const NavigationRegistry = {
	/**
	 * Derives role from user object or URL pathname prefix fallback
	 */
	deriveRole(userRole?: string, pathname: string = ''): Role {
		if (userRole && ['admin', 'guru', 'mentor', 'siswa'].includes(userRole)) {
			return userRole as Role;
		}
		if (pathname.startsWith('/mentor')) return 'mentor';
		if (pathname.startsWith('/guru')) return 'guru';
		if (pathname.startsWith('/admin')) return 'admin';
		return 'siswa';
	},

	/**
	 * Gets navigation menu items for a specific role
	 */
	getNavItems(role: Role): NavItem[] {
		return ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.siswa;
	},

	/**
	 * Gets role header label & badge configuration
	 */
	getRoleConfig(role: Role) {
		return ROLE_LABELS[role] || ROLE_LABELS.siswa;
	},

	/**
	 * Checks if a given nav item href is active for the current pathname
	 */
	isItemActive(itemHref: string, pathname: string): boolean {
		if (itemHref === '/siswa' || itemHref === '/mentor' || itemHref === '/guru' || itemHref === '/admin') {
			return pathname === itemHref;
		}
		return pathname.startsWith(itemHref);
	}
};

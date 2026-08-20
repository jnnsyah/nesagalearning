<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';

	interface User {
		id: number;
		username: string;
		email: string | null;
		fullName: string;
		role: string;
		avatarUrl: string | null;
		isActive: boolean;
		createdAt: Date | string;
		nisn?: string | null;
	}

	interface ProfileStats {
		role: string;
		// Siswa
		totalPoints?: number;
		currentStreak?: number;
		maxStreak?: number;
		earnedBadges?: { id: number; name: string; description: string | null; iconUrl: string | null; earnedAt: Date | string }[];
		kelasName?: string;
		tahunAjaranName?: string;
		trackName?: string;
		submissionsCount?: number;
		approvedSubmissionsCount?: number;
		attendanceCount?: number;
		// Mentor
		assignedClasses?: { id: number; name: string; tahunAjaran: string; track: string; studentCount: number }[];
		totalStudentsCount?: number;
		totalMeetingsConducted?: number;
		reviewedSubmissionsCount?: number;
		// Guru
		monitoredClassesCount?: number;
		monitoredStudentsCount?: number;
		activeTracksCount?: number;
		totalSessionsHeld?: number;
		// Admin
		totalUsersCount?: number;
		roleBreakdown?: Record<string, number>;
		activeTahunAjaranName?: string;
		totalActiveClasses?: number;
		activeSessionsCount?: number;
	}

	interface PointLogItem {
		id: number;
		source: string;
		amount: number;
		referenceId: number | null;
		referenceType: string | null;
		description: string | null;
		createdAt: Date | string;
	}

	interface PaginatedPointLogs {
		items: PointLogItem[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}

	let {
		user,
		stats,
		pointLogs = undefined,
		availableAvatars = [],
		formErrors = undefined
	}: {
		user: User;
		stats: ProfileStats;
		pointLogs?: PaginatedPointLogs;
		availableAvatars?: { id: number; name: string; imageUrl: string }[];
		formErrors?: { [key: string]: string[] | string };
	} = $props();

	// Selected Avatar State
	let selectedAvatarUrl = $state(user.avatarUrl || '');

	// Derive tab from URL searchParams (e.g. ?tab=points or ?page=2)
	let tabFromUrl = $derived(
		($page.url.searchParams.get('tab') as 'info' | 'points' | 'edit' | 'security') ||
		($page.url.searchParams.has('page') ? 'points' : 'info')
	);

	// Tab control
	let activeTab = $state<'info' | 'points' | 'edit' | 'security'>('info');

	$effect(() => {
		if (tabFromUrl) {
			activeTab = tabFromUrl;
		}
	});

	// Editable profile fields
	let fullName = $state(user.fullName || '');
	let email = $state(user.email || '');

	// File Upload & 1:1 Image Crop Modal State
	let filePreviewUrl = $state<string | null>(null);
	let showCropModal = $state(false);
	let rawImageSrc = $state<string | null>(null);

	let cropZoom = $state(1);
	let cropOffsetX = $state(0);
	let cropOffsetY = $state(0);

	let isDraggingCrop = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let initialOffsetX = $state(0);
	let initialOffsetY = $state(0);

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
			rawImageSrc = URL.createObjectURL(file);
			cropZoom = 1;
			cropOffsetX = 0;
			cropOffsetY = 0;
			showCropModal = true;
		}
	}

	function startCropDrag(clientX: number, clientY: number) {
		isDraggingCrop = true;
		dragStartX = clientX;
		dragStartY = clientY;
		initialOffsetX = cropOffsetX;
		initialOffsetY = cropOffsetY;
	}

	function moveCropDrag(clientX: number, clientY: number) {
		if (!isDraggingCrop) return;
		const deltaX = clientX - dragStartX;
		const deltaY = clientY - dragStartY;
		cropOffsetX = initialOffsetX + deltaX;
		cropOffsetY = initialOffsetY + deltaY;
	}

	function endCropDrag() {
		isDraggingCrop = false;
	}

	function resetCropView() {
		cropZoom = 1;
		cropOffsetX = 0;
		cropOffsetY = 0;
	}

	function cancelCrop() {
		showCropModal = false;
		if (rawImageSrc) {
			URL.revokeObjectURL(rawImageSrc);
			rawImageSrc = null;
		}
		if (typeof document !== 'undefined') {
			const fileInput = document.getElementById('userAvatarFile') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
		}
	}

	function applyCrop() {
		if (!rawImageSrc) return;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			const size = 400; // 1:1 Output Square Canvas (400x400)
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			// Background fill
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, size, size);

			const modalViewportSize = 280;
			const displayScale = size / modalViewportSize;

			const imgAspect = img.width / img.height;
			let baseW = modalViewportSize;
			let baseH = modalViewportSize;

			if (imgAspect > 1) {
				baseW = modalViewportSize;
				baseH = modalViewportSize / imgAspect;
			} else {
				baseH = modalViewportSize;
				baseW = modalViewportSize * imgAspect;
			}

			const scaledW = baseW * cropZoom * displayScale;
			const scaledH = baseH * cropZoom * displayScale;

			const drawX = (size - scaledW) / 2 + cropOffsetX * displayScale;
			const drawY = (size - scaledH) / 2 + cropOffsetY * displayScale;

			ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

			canvas.toBlob((blob) => {
				if (!blob) return;
				const croppedFile = new File([blob], 'avatar-cropped.png', { type: 'image/png' });
				
				if (typeof document !== 'undefined') {
					const container = new DataTransfer();
					container.items.add(croppedFile);
					const fileInput = document.getElementById('userAvatarFile') as HTMLInputElement;
					if (fileInput) {
						fileInput.files = container.files;
					}
				}

				if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
				filePreviewUrl = URL.createObjectURL(croppedFile);
				showCropModal = false;
				toast.success('Area foto 1:1 berhasil disesuaikan!');
			}, 'image/png');
		};
		img.src = rawImageSrc;
	}

	function selectDefaultAvatar(url: string) {
		selectedAvatarUrl = url;
		if (filePreviewUrl) {
			URL.revokeObjectURL(filePreviewUrl);
			filePreviewUrl = null;
		}
		if (typeof document !== 'undefined') {
			const fileInput = document.getElementById('userAvatarFile') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
		}
	}

	// Sync state whenever user prop is updated from server load
	$effect(() => {
		fullName = user.fullName || '';
		email = user.email || '';
		selectedAvatarUrl = user.avatarUrl || '';
		filePreviewUrl = null;
	});

	// Password fields
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Loading state
	let isSubmittingProfile = $state(false);
	let isSubmittingPassword = $state(false);

	// Confirmation modal for password change
	let showPasswordConfirmModal = $state(false);
	let passwordFormElement: HTMLFormElement | null = $state(null);

	// Role visual styling mapping
	const roleMetaMap: Record<string, { label: string; badgeText: string; color: string; bg: string; description: string }> = {
		siswa: {
			label: 'Siswa / Peserta',
			badgeText: 'SISWA AKTIF',
			color: '#4f46e5',
			bg: '#e0e7ff',
			description: 'Peserta aktif dalam program pembelajaran Nesaga Learning Community.'
		},
		mentor: {
			label: 'Mentor Pendamping',
			badgeText: 'MENTOR AKTIF',
			color: '#0284c7',
			bg: '#e0f2fe',
			description: 'Fasilitator & pendamping sesi belajar serta reviewer tugas kelas.'
		},
		guru: {
			label: 'Guru Supervisi',
			badgeText: 'SUPERVISI GURU',
			color: '#0d9488',
			bg: '#ccfbf1',
			description: 'Supervisor utama pemantau track pembelajaran, presensi, & progres siswa.'
		},
		admin: {
			label: 'Administrator Sistem',
			badgeText: 'SYSTEM ADMIN',
			color: '#dc2626',
			bg: '#fee2e2',
			description: 'Administrator pengelola master data, pengguna, & konfigurasi sistem.'
		}
	};

	let roleMeta = $derived(roleMetaMap[user.role] || roleMetaMap.siswa);

	// Formatted creation date
	let joinedDateFormatted = $derived(() => {
		if (!user.createdAt) return 'Baru saja';
		const d = new Date(user.createdAt);
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	});

	function getSourceMeta(source: string) {
		switch (source) {
			case 'attendance_weekday':
				return { label: 'Presensi Weekday', bg: '#dcfce7', color: '#15803d' };
			case 'attendance_weekend':
				return { label: 'Presensi Weekend (+50%)', bg: '#fef9c3', color: '#a16207' };
			case 'streak_milestone':
				return { label: 'Bonus Streak Milestone', bg: '#ffedd5', color: '#c2410c' };
			case 'task_approved':
			case 'task_kecil':
			case 'task_sedang':
			case 'task_besar':
				return { label: 'Tugas Disetujui', bg: '#e0f2fe', color: '#0369a1' };
			default:
				return { label: source || 'Poin Sistem', bg: '#f1f5f9', color: '#475569' };
		}
	}

	function formatLogDate(dateInput: Date | string): string {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleConfirmPasswordSubmit() {
		showPasswordConfirmModal = false;
		if (passwordFormElement) {
			passwordFormElement.requestSubmit();
		}
	}
</script>

<div class="profile-page">
	<!-- ══════════════════════════════════════════════════════════
	     1. HEADER / HERO TITLE BANNER
	     ══════════════════════════════════════════════════════════ -->
	<header class="profile-hero">
		<div class="hero-content">
			<div class="user-avatar-hero" style="border-color: {roleMeta.color};">
				{#if user.avatarUrl}
					<img src={user.avatarUrl} alt={user.fullName} class="hero-avatar-img" />
				{:else}
					<span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
				{/if}
			</div>
			<div class="user-hero-details">
				<div class="hero-title-row">
					<h1 class="hero-name">{user.fullName}</h1>
					<span class="badge" style="background: {roleMeta.bg}; color: {roleMeta.color}; border: 1px solid {roleMeta.color}40;">
						{roleMeta.badgeText}
					</span>
					<span class="badge badge--active">
						● {user.isActive ? 'Akun Aktif' : 'Non-aktif'}
					</span>
				</div>
				<p class="hero-username">@{user.username} {user.email ? `• ${user.email}` : ''}{(user.role === 'siswa' || user.role === 'mentor') && user.nisn ? ` • NISN ${user.nisn}` : ''}</p>
				<p class="hero-meta">
					<span>{roleMeta.description}</span>
					<span class="meta-sep">•</span>
					<span>Bergabung sejak {joinedDateFormatted()}</span>
				</p>
			</div>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. KEY METRICS GRID (.stats-grid)
	     ══════════════════════════════════════════════════════════ -->
	<section class="stats-grid" aria-label="Statistik Pengguna">
		{#if user.role === 'siswa'}
			<div class="stat-card">
				<div class="stat-icon-box icon-points">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
						<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
						<path d="M4 22h16"/>
						<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
						<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
						<path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalPoints ?? 0}</span>
					<span class="stat-label">Total Poin</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-streak">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.currentStreak ?? 0} Hari</span>
					<span class="stat-label">Streak Saat Ini</span>
				</div>
			</div>

			<a href="/siswa/badges" class="stat-card stat-card--link" title="Lihat Halaman Lencana & Prestasi">
				<div class="stat-icon-box icon-badges">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="8" r="7"/>
						<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value flex items-center gap-1">
						{stats.earnedBadges?.length ?? 0}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="stat-link-arrow">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					</span>
					<span class="stat-label">Lencana Diterima</span>
				</div>
			</a>

			<div class="stat-card">
				<div class="stat-icon-box icon-tasks">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/>
						<line x1="16" y1="17" x2="8" y2="17"/>
						<polyline points="10 9 9 9 8 9"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.approvedSubmissionsCount ?? 0} / {stats.submissionsCount ?? 0}</span>
					<span class="stat-label">Tugas Disetujui</span>
				</div>
			</div>
		{:else if user.role === 'mentor'}
			<div class="stat-card">
				<div class="stat-icon-box icon-classes">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.assignedClasses?.length ?? 0} Kelas</span>
					<span class="stat-label">Kelas Didampingi</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-students">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<path d="M12 6v6l4 2"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalStudentsCount ?? 0} Orang</span>
					<span class="stat-label">Total Siswa Binaan</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-meetings">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalMeetingsConducted ?? 0} Sesi</span>
					<span class="stat-label">Pertemuan Sesi</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-grading">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 11 12 14 22 4"/>
						<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.reviewedSubmissionsCount ?? 0} Tugas</span>
					<span class="stat-label">Tugas Telah Dinilai</span>
				</div>
			</div>
		{:else if user.role === 'guru'}
			<div class="stat-card">
				<div class="stat-icon-box icon-classes">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.monitoredClassesCount ?? 0} Kelas</span>
					<span class="stat-label">Kelas Dipantau</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-students">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.monitoredStudentsCount ?? 0} Siswa</span>
					<span class="stat-label">Siswa Aktif Terpantau</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-tracks">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="20" x2="18" y2="10"/>
						<line x1="12" y1="20" x2="12" y2="4"/>
						<line x1="6" y1="20" x2="6" y2="14"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.activeTracksCount ?? 0} Track</span>
					<span class="stat-label">Track Pembelajaran</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-meetings">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalSessionsHeld ?? 0} Sesi</span>
					<span class="stat-label">Total Sesi Pertemuan</span>
				</div>
			</div>
		{:else if user.role === 'admin'}
			<div class="stat-card">
				<div class="stat-icon-box icon-users">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalUsersCount ?? 0} User</span>
					<span class="stat-label">Total Akun Sistem</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-ta">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.activeTahunAjaranName ?? '-'}</span>
					<span class="stat-label">Tahun Ajaran Aktif</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-classes">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.totalActiveClasses ?? 0} Kelas</span>
					<span class="stat-label">Kelas Aktif Berjalan</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon-box icon-sessions">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
				</div>
				<div class="stat-info">
					<span class="stat-value">{stats.activeSessionsCount ?? 0} Sesi</span>
					<span class="stat-label">Total Pertemuan Sistem</span>
				</div>
			</div>
		{/if}
	</section>

	<!-- ══════════════════════════════════════════════════════════
	     3. TABBED CONTENT SECTION
	     ══════════════════════════════════════════════════════════ -->
	<div class="profile-tabs-wrap">
		<div class="profile-tabs-header" role="tablist">
			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'info'}
				onclick={() => (activeTab = 'info')}
				role="tab"
				aria-selected={activeTab === 'info'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
					<circle cx="12" cy="7" r="4"/>
				</svg>
				<span>Detail Akun & Peran</span>
			</button>

			{#if user.role === 'siswa'}
				<button
					type="button"
					class="tab-btn"
					class:tab-btn--active={activeTab === 'points'}
					onclick={() => (activeTab = 'points')}
					role="tab"
					aria-selected={activeTab === 'points'}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
						<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
						<path d="M4 22h16"/>
						<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
						<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
						<path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
					</svg>
					<span>Riwayat Poin</span>
					{#if pointLogs?.total}
						<span class="tab-badge">{pointLogs.total}</span>
					{/if}
				</button>
			{/if}

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'edit'}
				onclick={() => (activeTab = 'edit')}
				role="tab"
				aria-selected={activeTab === 'edit'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
				<span>Edit Informasi</span>
			</button>

			<button
				type="button"
				class="tab-btn"
				class:tab-btn--active={activeTab === 'security'}
				onclick={() => (activeTab = 'security')}
				role="tab"
				aria-selected={activeTab === 'security'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<span>Keamanan & Password</span>
			</button>
		</div>

		<!-- TAB 1: Detail Akun & Peran -->
		{#if activeTab === 'info'}
			<div class="tab-panel">
				<div class="detail-cards-grid">
					<!-- Main Detail Card -->
					<div class="card card-detail">
						<div class="card-header">
							<h2 class="card-title">Informasi Dasar Pengguna</h2>
							<span class="badge" style="background: {roleMeta.bg}; color: {roleMeta.color};">
								{roleMeta.badgeText}
							</span>
						</div>

						<div class="detail-rows">
							<div class="detail-row">
								<span class="detail-label">Nama Lengkap</span>
								<span class="detail-value font-bold">{user.fullName}</span>
							</div>

							<div class="detail-row">
								<span class="detail-label">Username</span>
								<span class="detail-value font-mono">@{user.username}</span>
							</div>

							<div class="detail-row">
								<span class="detail-label">Alamat Email</span>
								<span class="detail-value">{user.email || 'Belum diatur'}</span>
							</div>

							{#if user.role === 'siswa' || (user.role === 'mentor' && user.nisn)}
								<div class="detail-row">
									<span class="detail-label">NISN</span>
									<span class="detail-value font-mono">
										{#if user.nisn}
											{user.nisn}
										{:else}
											<span class="detail-value--muted">Belum diatur</span>
										{/if}
									</span>
								</div>
							{/if}

							<div class="detail-row">
								<span class="detail-label">Peran (Role)</span>
								<span class="detail-value capitalize">{user.role}</span>
							</div>

							<div class="detail-row">
								<span class="detail-label">Status Akun</span>
								<span class="detail-value">
									<span class="status-pill status-pill--active">
										{user.isActive ? 'Aktif' : 'Non-aktif'}
									</span>
								</span>
							</div>

							<div class="detail-row">
								<span class="detail-label">Tanggal Terdaftar</span>
								<span class="detail-value">{joinedDateFormatted()}</span>
							</div>
						</div>
					</div>

					<!-- Role-Specific Detail Card -->
					<div class="card card-detail">
						{#if user.role === 'siswa'}
							<div class="card-header">
								<h2 class="card-title">Informasi Kelas & Akademik</h2>
								<span class="badge badge--info">TA 2026/2027</span>
							</div>

							<div class="detail-rows">
								<div class="detail-row">
									<span class="detail-label">Kelas Terdaftar</span>
									<span class="detail-value font-bold">{stats.kelasName || 'Belum terdaftar di kelas'}</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Tahun Ajaran</span>
									<span class="detail-value">{stats.tahunAjaranName || '-'}</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Track Pembelajaran</span>
									<span class="detail-value">{stats.trackName || '-'}</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Total Kehadiran Presensi</span>
									<span class="detail-value font-bold">{stats.attendanceCount ?? 0} Sesi</span>
								</div>
							</div>

							{#if stats.earnedBadges && stats.earnedBadges.length > 0}
								<div class="badges-section">
									<div class="badges-section-header">
										<h3 class="sub-title" style="margin: 0;">Lencana Prestasi Saya</h3>
										<a href="/siswa/badges" class="badges-see-all-btn">
											<span>Lihat Semua Badges</span>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
												<polyline points="9 18 15 12 9 6" />
											</svg>
										</a>
									</div>
									<div class="badges-flex">
										{#each stats.earnedBadges as b}
											<a href="/siswa/badges" class="badge-item badge-item--link" title={b.description || b.name}>
												<span class="badge-icon">🏅</span>
												<span class="badge-name">{b.name}</span>
											</a>
										{/each}
									</div>
								</div>
							{:else if user.role === 'siswa'}
								<div class="badges-section">
									<div class="badges-section-header">
										<h3 class="sub-title" style="margin: 0;">Lencana Prestasi Saya</h3>
										<a href="/siswa/badges" class="badges-see-all-btn">
											<span>Lihat Katalog Lencana</span>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
												<polyline points="9 18 15 12 9 6" />
											</svg>
										</a>
									</div>
									<div class="badges-empty-box">
										<p class="text-xs text-slate-500 m-0">Belum ada lencana yang diraih. Selesaikan tugas dan dapatkan poin untuk membuka lencana!</p>
										<a href="/siswa/badges" class="badges-empty-btn">Jelajahi Lencana &rsaquo;</a>
									</div>
								</div>
							{/if}
						{:else if user.role === 'mentor'}
							<div class="card-header">
								<h2 class="card-title">Daftar Kelas Pendampingan</h2>
								<span class="badge badge--info">{stats.assignedClasses?.length ?? 0} Kelas</span>
							</div>

							{#if stats.assignedClasses && stats.assignedClasses.length > 0}
								<div class="class-list-stack">
									{#each stats.assignedClasses as cls}
										<div class="class-list-item">
											<div class="class-info">
												<span class="class-name">{cls.name}</span>
												<span class="class-sub">{cls.tahunAjaran} • {cls.track}</span>
											</div>
											<span class="badge badge-neutral">{cls.studentCount} Siswa</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="empty-text">Belum ada kelas yang ditugaskan ke mentor ini.</p>
							{/if}
						{:else if user.role === 'guru'}
							<div class="card-header">
								<h2 class="card-title">Cakupan Supervisi Akademik</h2>
								<span class="badge badge--success">GURU SUPERVISOR</span>
							</div>

							<div class="detail-rows">
								<div class="detail-row">
									<span class="detail-label">Total Kelas Dipantau</span>
									<span class="detail-value font-bold">{stats.monitoredClassesCount ?? 0} Kelas</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Total Siswa Aktif System</span>
									<span class="detail-value font-bold">{stats.monitoredStudentsCount ?? 0} Siswa</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Track Pembelajaran</span>
									<span class="detail-value">{stats.activeTracksCount ?? 0} Track</span>
								</div>

								<div class="detail-row">
									<span class="detail-label">Total Pertemuan Diselenggarakan</span>
									<span class="detail-value">{stats.totalSessionsHeld ?? 0} Sesi</span>
								</div>
							</div>
						{:else if user.role === 'admin'}
							<div class="card-header">
								<h2 class="card-title">Ringkasan Distribusi Pengguna Sistem</h2>
								<span class="badge badge--danger">ADMIN CONSOLE</span>
							</div>

							<div class="detail-rows">
								{#if stats.roleBreakdown}
									{#each Object.entries(stats.roleBreakdown) as [r, countNum]}
										<div class="detail-row">
											<span class="detail-label capitalize">Role {r}</span>
											<span class="detail-value font-bold">{countNum} Akun</span>
										</div>
									{/each}
								{/if}

								<div class="detail-row">
									<span class="detail-label">Total Pengguna Terdaftar</span>
									<span class="detail-value font-bold">{stats.totalUsersCount ?? 0} Akun</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- TAB: Riwayat Poin (Siswa Only) -->
		{#if activeTab === 'points' && user.role === 'siswa'}
			<div class="tab-panel">
				<div class="card card-table">
					<div class="card-header">
						<div>
							<h2 class="card-title">Riwayat Perolehan Poin</h2>
							<p class="card-subtitle">Daftar log perolehan poin dari presensi, milestone streak, dan pengerjaan tugas.</p>
						</div>
						<div class="points-total-pill">
							<span class="total-label">Total Akumulasi</span>
							<span class="total-amount">+{stats.totalPoints ?? 0} Poin</span>
						</div>
					</div>

					{#if pointLogs?.items && pointLogs.items.length > 0}
						<!-- Table Wrapper with horizontal scrolling for mobile (<640px) -->
						<div class="table-responsive">
							<table class="data-table">
								<thead>
									<tr>
										<th>WAKTU & TANGGAL</th>
										<th>SUMBER AKTIVITAS</th>
										<th>DESKRIPSI / KETERANGAN</th>
										<th class="text-right">JUMLAH POIN</th>
									</tr>
								</thead>
								<tbody>
									{#each pointLogs.items as log}
										{@const srcMeta = getSourceMeta(log.source)}
										<tr>
											<td class="cell-date">{formatLogDate(log.createdAt)}</td>
											<td>
												<span class="badge" style="background: {srcMeta.bg}; color: {srcMeta.color};">
													{srcMeta.label}
												</span>
											</td>
											<td class="cell-desc">{log.description || '-'}</td>
											<td class="text-right">
												<span class="amount-pill" class:amount-pill--positive={log.amount >= 0} class:amount-pill--negative={log.amount < 0}>
													{log.amount >= 0 ? `+${log.amount}` : log.amount} Poin
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Pagination Footer -->
						<div class="pagination-footer">
							<div class="pagination-info">
								Menampilkan <strong>{((pointLogs.page - 1) * pointLogs.limit) + 1}</strong> - <strong>{Math.min(pointLogs.page * pointLogs.limit, pointLogs.total)}</strong> dari <strong>{pointLogs.total}</strong> riwayat poin
							</div>
							<div class="pagination-buttons">
								{#if pointLogs.page > 1}
									<a href="?tab=points&page={pointLogs.page - 1}" class="page-nav-btn">
										&larr; Sebelumnya
									</a>
								{:else}
									<span class="page-nav-btn page-nav-btn--disabled">&larr; Sebelumnya</span>
								{/if}

								<div class="page-numbers">
									{#each Array.from({ length: pointLogs.totalPages }, (_, i) => i + 1) as pNum}
										{#if pNum === pointLogs.page}
											<span class="page-num page-num--active">{pNum}</span>
										{:else if Math.abs(pNum - pointLogs.page) <= 2 || pNum === 1 || pNum === pointLogs.totalPages}
											<a href="?tab=points&page={pNum}" class="page-num">{pNum}</a>
										{:else if Math.abs(pNum - pointLogs.page) === 3}
											<span class="page-num-dots">...</span>
										{/if}
									{/each}
								</div>

								{#if pointLogs.page < pointLogs.totalPages}
									<a href="?tab=points&page={pointLogs.page + 1}" class="page-nav-btn">
										Selanjutnya &rarr;
									</a>
								{:else}
									<span class="page-nav-btn page-nav-btn--disabled">Selanjutnya &rarr;</span>
								{/if}
							</div>
						</div>
					{:else}
						<div class="empty-state-box">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted);">
								<circle cx="12" cy="12" r="10"/>
								<path d="M12 8v4"/>
								<path d="M12 16h.01"/>
							</svg>
							<h3 class="empty-title">Belum Ada Riwayat Poin</h3>
							<p class="empty-desc">Riwayat perolehan poin Anda dari presensi dan tugas akan muncul di sini.</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- TAB: Edit Informasi -->
		{#if activeTab === 'edit'}
			<div class="tab-panel">
				<div class="card card-form">
					<div class="card-header">
						<h2 class="card-title">Perbarui Informasi Profil</h2>
						<p class="card-subtitle">Ubah nama lengkap atau alamat email akun Anda di bawah ini.</p>
					</div>

					<form
						method="POST"
						action="?/updateProfile"
						enctype="multipart/form-data"
						use:enhance={() => {
							isSubmittingProfile = true;
							return async ({ result, update }) => {
								isSubmittingProfile = false;
								if (result.type === 'success') {
									toast.success('Profil berhasil diperbarui!');
								} else if (result.type === 'failure') {
									const msg = (result.data as any)?.message || 'Gagal memperbarui profil.';
									toast.error(msg);
								}
								await update({ reset: false });
							};
						}}
						class="form-stack"
					>
						<!-- Avatar Selection -->
						<div class="avatar-picker-box">
							<input type="hidden" name="avatarUrl" bind:value={selectedAvatarUrl} />

							<!-- Preview Avatar saat ini / yang dipilih -->
							<div class="avatar-preview-header-card mb-4 p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3">
								<div class="w-14 h-14 rounded-full overflow-hidden bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center flex-shrink-0 shadow-sm">
									{#if filePreviewUrl}
										<img src={filePreviewUrl} alt="Preview Foto Upload" class="w-full h-full object-cover" />
									{:else if selectedAvatarUrl}
										<img src={selectedAvatarUrl} alt="Preview Avatar" class="w-full h-full object-cover" />
									{:else}
										<span class="font-extrabold text-indigo-700 text-xl">{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="font-bold text-xs text-slate-800">Preview Avatar Profil</h4>
									<p class="text-[11px] text-slate-500 font-medium truncate">
										{#if filePreviewUrl}
											Mengunggah foto baru dari perangkat
										{:else if selectedAvatarUrl}
											Menggunakan avatar resmi pilihan
										{:else}
											Menggunakan inisial nama standar
										{/if}
									</p>
								</div>
							</div>

							{#if availableAvatars && availableAvatars.length > 0}
								<label class="field-label font-bold text-xs text-slate-700 block mb-2">Pilih Avatar dari Katalog Resmi</label>
								<div class="avatar-grid-picker">
									<button
										type="button"
										class="avatar-pick-card"
										class:avatar-pick-card--selected={!selectedAvatarUrl && !filePreviewUrl}
										onclick={() => selectDefaultAvatar('')}
									>
										<div class="avatar-fallback-initial">
											{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
										</div>
										<span class="avatar-pick-name">Inisial</span>
										{#if !selectedAvatarUrl && !filePreviewUrl}
											<div class="avatar-check-badge">✓</div>
										{/if}
									</button>

									{#each availableAvatars as av}
										<button
											type="button"
											class="avatar-pick-card"
											class:avatar-pick-card--selected={selectedAvatarUrl === av.imageUrl && !filePreviewUrl}
											onclick={() => selectDefaultAvatar(av.imageUrl)}
										>
											<img src={av.imageUrl} alt={av.name} class="avatar-pick-img" />
											<span class="avatar-pick-name">{av.name}</span>
											{#if selectedAvatarUrl === av.imageUrl && !filePreviewUrl}
												<div class="avatar-check-badge">✓</div>
											{/if}
										</button>
									{/each}
								</div>
							{/if}

							<div class="mt-3 pt-3 border-t border-slate-200">
								<label for="userAvatarFile" class="field-label font-bold text-xs text-slate-700 block mb-1">
									Atau Upload Foto Profil Sendiri
								</label>
								<input
									type="file"
									id="userAvatarFile"
									name="avatarFile"
									accept="image/*"
									onchange={handleFileChange}
									class="w-full p-2 text-xs border border-slate-300 rounded-md bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
								/>
							</div>
						</div>

						<TextInput
							name="fullName"
							label="Nama Lengkap"
							type="text"
							required={true}
							bind:value={fullName}
							placeholder="Masukkan nama lengkap"
							error={typeof formErrors?.fullName === 'string' ? formErrors.fullName : formErrors?.fullName?.[0]}
						/>

						<TextInput
							name="email"
							label="Alamat Email"
							type="email"
							bind:value={email}
							placeholder="contoh@email.com"
							hint="Email dapat digunakan untuk pemberitahuan dan pemulihan akun."
							error={typeof formErrors?.email === 'string' ? formErrors.email : formErrors?.email?.[0]}
						/>

						<div class="form-actions">
							<button
								type="submit"
								class="btn btn-primary"
								disabled={isSubmittingProfile}
							>
								{#if isSubmittingProfile}
									<span class="spinner"></span> Menyimpan...
								{:else}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
										<polyline points="17 21 17 13 7 13 7 21"/>
										<polyline points="7 3 7 8 15 8"/>
									</svg>
									Simpan Perubahan
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- TAB: Keamanan & Password -->
		{#if activeTab === 'security'}
			<div class="tab-panel">
				<div class="card card-form">
					<div class="card-header">
						<h2 class="card-title">Ganti Password Akun</h2>
						<p class="card-subtitle">Pastikan menggunakan kombinasi password yang kuat dan mudah Anda ingat.</p>
					</div>

					<form
						bind:this={passwordFormElement}
						method="POST"
						action="?/updatePassword"
						use:enhance={() => {
							isSubmittingPassword = true;
							return async ({ result, update }) => {
								isSubmittingPassword = false;
								if (result.type === 'success') {
									toast.success('Password berhasil diperbarui!');
									currentPassword = '';
									newPassword = '';
									confirmPassword = '';
								} else if (result.type === 'failure') {
									const msg = (result.data as any)?.message || 'Gagal mengubah password.';
									toast.error(msg);
								}
								await update();
							};
						}}
						class="form-stack"
					>
						<TextInput
							name="currentPassword"
							label="Password Saat Ini"
							type="password"
							required={true}
							bind:value={currentPassword}
							placeholder="Masukkan password saat ini"
							error={typeof formErrors?.currentPassword === 'string' ? formErrors.currentPassword : formErrors?.currentPassword?.[0]}
						/>

						<TextInput
							name="newPassword"
							label="Password Baru"
							type="password"
							required={true}
							bind:value={newPassword}
							placeholder="Minimal 6 karakter"
							error={typeof formErrors?.newPassword === 'string' ? formErrors.newPassword : formErrors?.newPassword?.[0]}
						/>

						<TextInput
							name="confirmPassword"
							label="Konfirmasi Password Baru"
							type="password"
							required={true}
							bind:value={confirmPassword}
							placeholder="Ulangi password baru"
							error={typeof formErrors?.confirmPassword === 'string' ? formErrors.confirmPassword : formErrors?.confirmPassword?.[0]}
						/>

						<div class="form-actions">
							<button
								type="button"
								class="btn btn-warning"
								disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmPassword}
								onclick={() => (showPasswordConfirmModal = true)}
							>
								{#if isSubmittingPassword}
									<span class="spinner"></span> Memproses...
								{:else}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
										<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
									</svg>
									Ubah Password
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>

	<!-- Modal Konfirmasi Ganti Password -->
	<ConfirmModal
		bind:open={showPasswordConfirmModal}
		title="Konfirmasi Ganti Password"
		message="Apakah Anda yakin ingin mengubah password akun Anda? Pastikan Anda telah mencatat password baru dengan benar."
		confirmText="Ya, Ubah Password"
		cancelText="Batal"
		variant="warning"
		onconfirm={handleConfirmPasswordSubmit}
	/>

	<!-- Modal Crop Foto Profil (1:1 Aspect Ratio) -->
	{#if showCropModal && rawImageSrc}
		<div class="crop-modal-overlay" role="dialog" aria-modal="true" aria-label="Atur Posisi Foto Profil">
			<div class="crop-modal-card">
				<div class="crop-modal-header">
					<div>
						<h3 class="crop-modal-title">Atur Posisi Foto Profil (1:1)</h3>
						<p class="crop-modal-subtitle">Geser foto & atur zoom untuk menentukan area 1:1 sempurna.</p>
					</div>
					<button type="button" class="btn-close-crop" onclick={cancelCrop} aria-label="Tutup">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>

				<div class="crop-modal-body">
					<!-- 1:1 Crop Viewport Area (280px x 280px) -->
					<div
						class="crop-viewport-container"
						onmousedown={(e) => startCropDrag(e.clientX, e.clientY)}
						onmousemove={(e) => moveCropDrag(e.clientX, e.clientY)}
						onmouseup={endCropDrag}
						onmouseleave={endCropDrag}
						ontouchstart={(e) => {
							if (e.touches[0]) startCropDrag(e.touches[0].clientX, e.touches[0].clientY);
						}}
						ontouchmove={(e) => {
							if (e.touches[0]) moveCropDrag(e.touches[0].clientX, e.touches[0].clientY);
						}}
						ontouchend={endCropDrag}
					>
						<div class="crop-image-wrapper" style="transform: translate({cropOffsetX}px, {cropOffsetY}px) scale({cropZoom});">
							<img src={rawImageSrc} alt="Pilih Area Crop" class="crop-source-img" draggable="false" />
						</div>

						<!-- 1:1 Circle & Grid Overlay Guide -->
						<div class="crop-overlay-guide">
							<div class="crop-grid-line crop-grid-v1"></div>
							<div class="crop-grid-line crop-grid-v2"></div>
							<div class="crop-grid-line crop-grid-h1"></div>
							<div class="crop-grid-line crop-grid-h2"></div>
							<div class="crop-circle-mask"></div>
						</div>
					</div>

					<div class="crop-hint-drag">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 9l-3 3 3 3"/>
							<path d="M9 5l3-3 3 3"/>
							<path d="M19 9l3 3-3 3"/>
							<path d="M9 19l3 3 3-3"/>
							<path d="M2 12h20"/>
							<path d="M12 2v20"/>
						</svg>
						<span>Tahan & geser untuk menyesuaikan posisi foto</span>
					</div>

					<!-- Zoom Controls -->
					<div class="crop-controls-box">
						<div class="zoom-slider-row">
							<span class="zoom-label font-bold text-xs">Zoom</span>
							<button type="button" class="btn-zoom-step" onclick={() => (cropZoom = Math.max(0.8, cropZoom - 0.2))}>-</button>
							<input type="range" min="0.8" max="3" step="0.05" bind:value={cropZoom} class="zoom-range-input" />
							<button type="button" class="btn-zoom-step" onclick={() => (cropZoom = Math.min(3, cropZoom + 0.2))}>+</button>
							<button type="button" class="btn-reset-crop" onclick={resetCropView} title="Reset">Reset</button>
						</div>
					</div>
				</div>

				<div class="crop-modal-footer">
					<button type="button" class="btn btn-secondary" onclick={cancelCrop}>Batal</button>
					<button type="button" class="btn btn-primary" onclick={applyCrop}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						Gunakan Area Foto Ini (1:1)
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 20px 40px;
	}

	@media (max-width: 640px) {
		.profile-page {
			padding: 16px 12px 80px;
			gap: 14px;
		}
	}

	/* ── Hero Banner ── */
	.profile-hero {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.hero-content {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	@media (max-width: 640px) {
		.hero-content {
			flex-direction: column;
			text-align: center;
			align-items: center;
		}
	}

	.user-avatar-hero {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		font-family: var(--font-macro);
		font-size: 32px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3.5px solid #ffffff;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
		flex-shrink: 0;
	}

	.user-hero-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.hero-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.hero-title-row {
			justify-content: center;
		}
	}

	.hero-name {
		font-family: var(--font-macro);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
		margin: 0;
	}

	.hero-username {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0;
	}

	.hero-meta {
		font-size: 12.5px;
		color: var(--text-muted);
		margin-top: 4px;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.hero-meta {
			justify-content: center;
		}
	}

	.meta-sep {
		color: var(--border-hard);
	}

	.badge {
		padding: 4px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		border-radius: 9999px;
		white-space: nowrap;
	}

	.badge--active {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #86efac;
	}

	.badge--info {
		background: #e0f2fe;
		color: #0369a1;
	}

	.badge--success {
		background: #ccfbf1;
		color: #0f766e;
	}

	.badge--danger {
		background: #fee2e2;
		color: #b91c1c;
	}

	.badge-neutral {
		background: var(--bg-inset);
		color: var(--text-secondary);
		border: 1px solid var(--border-hard);
	}

	/* ── Key Metrics Grid (.stats-grid) ── */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}

		.stat-card {
			padding: 12px 10px;
			gap: 10px;
		}

		.stat-icon-box {
			width: 36px;
			height: 36px;
		}

		.stat-icon-box svg {
			width: 18px;
			height: 18px;
		}

		.stat-value {
			font-size: 15px;
		}

		.stat-label {
			font-size: 10.5px;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 10px);
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.08));
	}

	.stat-card--link {
		text-decoration: none;
		border-color: #fde047;
		background: #fffdf5;
	}

	.stat-card--link:hover {
		border-color: #ca8a04;
		background: #fef9c3;
	}

	.stat-link-arrow {
		color: #ca8a04;
		transition: transform 150ms ease;
	}

	.stat-card--link:hover .stat-link-arrow {
		transform: translateX(2px);
	}

	.badges-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.badges-see-all-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: #4f46e5;
		text-decoration: none;
		transition: color 150ms ease;
	}

	.badges-see-all-btn:hover {
		color: #3730a3;
		text-decoration: underline;
	}

	.badge-item--link {
		text-decoration: none;
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.badge-item--link:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.1));
	}

	.badges-empty-box {
		padding: 14px;
		background: #fffdf5;
		border: 1px dashed #fde047;
		border-radius: var(--radius-md, 8px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.badges-empty-btn {
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: #ffffff;
		background: #d97706;
		padding: 6px 12px;
		border-radius: 6px;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.badges-empty-btn:hover {
		background: #b45309;
	}

	.stat-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-points { background: #e0e7ff; color: #4f46e5; }
	.icon-streak { background: #ffedd5; color: #ea580c; }
	.icon-badges { background: #fef9c3; color: #ca8a04; }
	.icon-tasks { background: #dcfce7; color: #166534; }
	.icon-classes { background: #e0f2fe; color: #0284c7; }
	.icon-students { background: #f3e8ff; color: #9333ea; }
	.icon-meetings { background: #ccfbf1; color: #0d9488; }
	.icon-grading { background: #fce7f3; color: #db2777; }
	.icon-tracks { background: #fae8ff; color: #c026d3; }
	.icon-users { background: #e0e7ff; color: #4f46e5; }
	.icon-ta { background: #fee2e2; color: #dc2626; }
	.icon-sessions { background: #ccfbf1; color: #0d9488; }

	.stat-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 600;
		margin-top: 2px;
	}

	/* ── Tabbed Section ── */
	.profile-tabs-wrap {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.profile-tabs-header {
		display: flex;
		gap: 8px;
		border-bottom: 2px solid var(--border-hard);
		padding-bottom: 2px;
		overflow-x: auto;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border: none;
		background: transparent;
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		border-bottom: 3px solid transparent;
		margin-bottom: -4px;
		transition: all 150ms ease;
		white-space: nowrap;
		border-radius: var(--radius-sm, 6px) var(--radius-sm, 6px) 0 0;
		min-height: 44px;
	}

	@media (max-width: 640px) {
		.profile-tabs-header {
			gap: 4px;
			padding-bottom: 2px;
			-webkit-overflow-scrolling: touch;
		}
		.tab-btn {
			padding: 8px 12px;
			font-size: 12px;
			gap: 6px;
			flex-shrink: 0;
		}
		.tab-btn span {
			display: inline-block;
		}
		.tab-btn svg {
			width: 16px;
			height: 16px;
		}
	}

	.tab-btn:hover {
		color: var(--primary);
		background: var(--primary-light);
	}

	.tab-btn--active {
		color: var(--primary) !important;
		border-bottom-color: var(--primary) !important;
		background: #ffffff;
	}

	.tab-badge {
		padding: 2px 7px;
		background: #e0e7ff;
		color: #4f46e5;
		font-size: 10.5px;
		font-weight: 800;
		border-radius: 9999px;
	}

	.tab-panel {
		animation: fadeIn 200ms ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Detail Cards Grid */
	.detail-cards-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
	}

	@media (max-width: 768px) {
		.detail-cards-grid {
			grid-template-columns: 1fr;
		}
	}

	.card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-hard);
		margin-bottom: 16px;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.card-subtitle {
		font-size: 12.5px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	/* Points Total Pill */
	.points-total-pill {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		background: #e0e7ff;
		padding: 6px 14px;
		border-radius: 10px;
		border: 1px solid #c7d2fe;
	}

	.total-label {
		font-size: 10px;
		font-weight: 700;
		color: #4338ca;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.total-amount {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: #3730a3;
	}

	/* Data Table & Responsive */
	.table-responsive {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin-top: 8px;
	}

	.data-table {
		width: 100%;
		min-width: 640px;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 13px;
	}

	.data-table th {
		background: var(--bg-inset, #f8fafc);
		padding: 10px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-align: left;
		border-bottom: 1.5px solid var(--border-hard);
		letter-spacing: 0.03em;
	}

	.data-table td {
		padding: 14px;
		border-bottom: 1px solid var(--border-light, #f1f5f9);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.data-table tr:hover td {
		background: #f8fafc;
	}

	.cell-date {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.cell-desc {
		color: var(--text-secondary);
		max-width: 280px;
	}

	.amount-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 9999px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
	}

	.amount-pill--positive {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.amount-pill--negative {
		background: #fee2e2;
		color: #b91c1c;
		border: 1px solid #fca5a5;
	}

	.text-right {
		text-align: right;
	}

	/* Pagination Footer */
	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 18px;
		margin-top: 14px;
		border-top: 1px solid var(--border-hard);
		gap: 12px;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.pagination-footer {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}
	}

	.pagination-info {
		font-size: 12.5px;
		color: var(--text-muted);
	}

	.pagination-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.pagination-buttons {
			justify-content: center;
		}
	}

	.page-nav-btn {
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md, 6px);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		text-decoration: none;
		transition: all 120ms ease;
	}

	.page-nav-btn:hover:not(.page-nav-btn--disabled) {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	.page-nav-btn--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--bg-inset);
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.page-num {
		min-width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		text-decoration: none;
		transition: background 120ms ease;
	}

	.page-num:hover:not(.page-num--active) {
		background: var(--primary-light);
		color: var(--primary);
	}

	.page-num--active {
		background: var(--primary);
		color: #ffffff;
	}

	.page-num-dots {
		font-size: 12px;
		color: var(--text-muted);
		padding: 0 4px;
	}

	/* Empty State Box */
	.empty-state-box {
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 10px 0 4px;
	}

	.empty-desc {
		font-size: 12.5px;
		color: var(--text-muted);
		max-width: 320px;
	}

	/* Forms */
	.card-form {
		max-width: 680px;
		margin: 0 auto;
		width: 100%;
	}

	.form-stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 8px;
	}

	@media (max-width: 640px) {
		.card {
			padding: 16px 14px;
		}
		.card-header {
			flex-wrap: wrap;
			gap: 8px;
			padding-bottom: 12px;
		}
		.card-title {
			font-size: 1rem;
		}
		.card-form {
			max-width: 100%;
		}
		.form-actions {
			justify-content: stretch;
		}
		.form-actions .btn {
			width: 100%;
			justify-content: center;
		}
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border-radius: var(--radius-md, 8px);
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 150ms ease;
	}

	.btn-primary {
		background: var(--primary);
		color: #ffffff;
		box-shadow: var(--shadow-sm);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-hover, #4338ca);
	}

	.btn-warning {
		background: #d97706;
		color: #ffffff;
		box-shadow: var(--shadow-sm);
	}

	.btn-warning:hover:not(:disabled) {
		background: #b45309;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Muted detail value (e.g. "Belum diatur" placeholder text) */
	.detail-value--muted {
		color: var(--text-muted);
		font-style: italic;
	}

	/* Avatar Hero & Picker Styling */
	.hero-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 9999px;
	}

	.avatar-picker-box {
		padding: 16px;
		background: #f8fafc;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: var(--radius-lg, 10px);
		margin-bottom: 12px;
	}

	.avatar-grid-picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: 10px;
		margin-bottom: 10px;
	}

	.avatar-pick-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px;
		background: #ffffff;
		border: 2px solid #cbd5e1;
		border-radius: 10px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.avatar-pick-card:hover {
		border-color: #818cf8;
		background: #f5f3ff;
	}

	.avatar-pick-card--selected {
		border-color: #4f46e5 !important;
		background: #e0e7ff !important;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
	}

	.avatar-pick-img {
		width: 44px;
		height: 44px;
		border-radius: 9999px;
		object-fit: cover;
		margin-bottom: 4px;
	}

	.avatar-fallback-initial {
		width: 44px;
		height: 44px;
		border-radius: 9999px;
		background: #cbd5e1;
		color: #334155;
		font-family: var(--font-macro);
		font-weight: 800;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
	}

	.avatar-pick-name {
		font-size: 10.5px;
		font-weight: 700;
		color: #334155;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.avatar-check-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 18px;
		height: 18px;
		background: #4f46e5;
		color: #ffffff;
		font-size: 11px;
		font-weight: 800;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #ffffff;
	}

	/* Crop Modal Styling */
	.crop-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(15, 23, 42, 0.75);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.crop-modal-card {
		background: #ffffff;
		border-radius: var(--radius-xl, 16px);
		width: 100%;
		max-width: 440px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.crop-modal-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-soft, #e2e8f0);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.crop-modal-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}

	.crop-modal-subtitle {
		font-size: 11.5px;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	.btn-close-crop {
		background: transparent;
		border: none;
		color: #64748b;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
	}

	.btn-close-crop:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.crop-modal-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #f8fafc;
	}

	.crop-viewport-container {
		position: relative;
		width: 280px;
		height: 280px;
		background: #090d16;
		border-radius: 12px;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		user-select: none;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
	}

	.crop-viewport-container:active {
		cursor: grabbing;
	}

	.crop-image-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 50ms ease-out;
		pointer-events: none;
	}

	.crop-source-img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.crop-overlay-guide {
		position: absolute;
		inset: 0;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.8);
		border-radius: 12px;
	}

	.crop-circle-mask {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
		border: 2px dashed rgba(255, 255, 255, 0.9);
	}

	.crop-grid-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.25);
	}

	.crop-grid-v1 { left: 33.33%; top: 0; bottom: 0; width: 1px; }
	.crop-grid-v2 { left: 66.66%; top: 0; bottom: 0; width: 1px; }
	.crop-grid-h1 { top: 33.33%; left: 0; right: 0; height: 1px; }
	.crop-grid-h2 { top: 66.66%; left: 0; right: 0; height: 1px; }

	.crop-hint-drag {
		margin-top: 10px;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		color: #64748b;
	}

	.crop-controls-box {
		width: 100%;
		margin-top: 14px;
		background: #ffffff;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
	}

	.zoom-slider-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.zoom-range-input {
		flex: 1;
		accent-color: #4f46e5;
		cursor: pointer;
	}

	.btn-zoom-step {
		width: 28px;
		height: 28px;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-weight: 800;
		font-size: 14px;
		color: #334155;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-zoom-step:hover {
		background: #e2e8f0;
	}

	.btn-reset-crop {
		background: transparent;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 11px;
		font-weight: 700;
		color: #475569;
		cursor: pointer;
	}

	.btn-reset-crop:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.crop-modal-footer {
		padding: 14px 20px;
		border-top: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		background: #ffffff;
	}
</style>

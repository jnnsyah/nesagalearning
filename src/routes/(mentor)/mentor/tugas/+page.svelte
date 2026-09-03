<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData, ActionData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

type SubmissionItem = (typeof data.submissions)[number];
type MeetingSummaryItem = (typeof data.meetingSummaries)[number];

// Master-Detail Navigation State
let selectedPertemuanId = $state<number | null>(data.initialPertemuanId ?? null);
let selectedSubmissionId = $state<number | null>(data.initialSubmissionId ?? null);

// Level 1 Filters & Sorting State
let selectedKelasFilter = $state<string>('all');
let selectedTrackFilter = $state<string>('all');
let selectedActivityFilter = $state<string>('all');
let selectedSortLevel1 = $state<
	'pending_banyak' | 'terbaru' | 'terlama' | 'tugas_az' | 'poin_tertinggi'
>('pending_banyak');

let sortOptionsLevel1 = [
	{ value: 'pending_banyak', label: 'Urutkan: Pending Periksa Terbanyak' },
	{ value: 'terbaru', label: 'Urutkan: Tanggal Sesi Terbaru' },
	{ value: 'terlama', label: 'Urutkan: Tanggal Sesi Terlama' },
	{ value: 'tugas_az', label: 'Urutkan: Judul Pertemuan (A - Z)' },
	{ value: 'poin_tertinggi', label: 'Urutkan: Bobot Poin Terbesar' }
];

// Level 2 Studio Filters & Sorting (Pane 1 Roster Search, Filter & Sort)
let rosterSearchQuery = $state('');
let rosterStatusFilter = $state<'all' | 'pending' | 'approved' | 'revisi'>('all');
let rosterSort = $state<'urgensi' | 'terbaru' | 'terlama' | 'nama_az' | 'nama_za'>('urgensi');

let rosterSortOptions = [
	{ value: 'urgensi', label: 'Urutkan: Status Urgensi (Pending → Revisi → Disetujui)' },
	{ value: 'terbaru', label: 'Urutkan: Waktu Dikumpul Terbaru' },
	{ value: 'terlama', label: 'Urutkan: Waktu Dikumpul Terlama' },
	{ value: 'nama_az', label: 'Urutkan: Nama Siswa (A - Z)' },
	{ value: 'nama_za', label: 'Urutkan: Nama Siswa (Z - A)' }
];

	// Level 1 Search Query
	let searchQuery = $state('');

	// Assessment form state
	let reviewStatus = $state<'approved' | 'revisi'>('approved');
	let reviewFeedback = $state('');
	let isSubmitting = $state(false);

	// Key to force re-render iframe on Refresh click
	let iframeKey = $state(0);

	let activeMeetingSummary = $derived(
		(data.meetingSummaries || []).find((m) => m.pertemuanId === selectedPertemuanId) || null
	);

	let meetingSubmissions = $derived(
		selectedPertemuanId === null
			? []
			: (data.submissions || []).filter((sub) => sub.pertemuanId === selectedPertemuanId)
	);

	let filteredRosterSubmissions = $derived(
		meetingSubmissions.filter((sub) => {
			if (rosterStatusFilter !== 'all' && sub.status !== rosterStatusFilter) {
				return false;
			}
			if (rosterSearchQuery.trim() !== '') {
				const q = rosterSearchQuery.toLowerCase();
				const nameMatch = sub.studentName?.toLowerCase().includes(q);
				const usernameMatch = sub.studentUsername?.toLowerCase().includes(q);
				return nameMatch || usernameMatch;
			}
			return true;
		})
	);

	let sortedRosterSubmissions = $derived.by(() => {
		const list = [...filteredRosterSubmissions];
		if (rosterSort === 'urgensi') {
			const statusWeight: Record<string, number> = { pending: 1, revisi: 2, approved: 3 };
			list.sort((a, b) => {
				const diff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
				if (diff !== 0) return diff;
				return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
			});
		} else if (rosterSort === 'terbaru') {
			list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
		} else if (rosterSort === 'terlama') {
			list.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
		} else if (rosterSort === 'nama_az') {
			list.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
		} else if (rosterSort === 'nama_za') {
			list.sort((a, b) => (b.studentName || '').localeCompare(a.studentName || ''));
		}
		return list;
	});

	let activeSubmission = $derived.by(() => {
		if (selectedSubmissionId !== null) {
			const found = meetingSubmissions.find((s) => s.id === selectedSubmissionId);
			if (found) return found;
		}
		return sortedRosterSubmissions[0] || meetingSubmissions[0] || null;
	});

	// Whenever activeSubmission changes, sync local form state
	$effect(() => {
		if (activeSubmission) {
			if (activeSubmission.status === 'approved') {
				reviewStatus = 'revisi';
			} else {
				reviewStatus = 'approved';
			}
			reviewFeedback = activeSubmission.feedback || '';
		}
	});



	function advanceToNextStudent() {
		if (!activeSubmission || sortedRosterSubmissions.length <= 1) return;
		const currentIndex = sortedRosterSubmissions.findIndex((s) => s.id === activeSubmission?.id);
		if (currentIndex !== -1 && currentIndex < sortedRosterSubmissions.length - 1) {
			const nextSub = sortedRosterSubmissions[currentIndex + 1];
			selectSubmission(nextSub.id);
		}
	}

	function advanceToPrevStudent() {
		if (!activeSubmission || sortedRosterSubmissions.length <= 1) return;
		const currentIndex = sortedRosterSubmissions.findIndex((s) => s.id === activeSubmission?.id);
		if (currentIndex > 0) {
			const prevSub = sortedRosterSubmissions[currentIndex - 1];
			selectSubmission(prevSub.id);
		}
	}

	function refreshPreview() {
		iframeKey++;
		toast.success('Preview diperbarui');
	}

	let kelasOptions = $derived([
		{ value: 'all', label: 'Semua Kelas' },
		...Array.from(
			new Set((data.meetingSummaries || []).map((m) => m.kelasName).filter(Boolean))
		).map((k) => ({ value: String(k), label: String(k) }))
	]);

	let trackOptions = $derived([
		{ value: 'all', label: 'Semua Track Pembelajaran' },
		...Array.from(
			new Set(
				(data.meetingSummaries || [])
					.map((m) => (m.phaseTitle ? `${m.phaseTitle} › ${m.subPhaseTitle}` : null))
					.filter(Boolean)
			)
		).map((t) => ({ value: String(t), label: String(t) }))
	]);

	let activityOptions = $derived([
		{ value: 'all', label: 'Semua Tipe Aktivitas' },
		{ value: 'teori', label: 'Teori & Pemahaman' },
		{ value: 'praktik', label: 'Praktik & Coding' },
		{ value: 'teori_praktik', label: 'Teori & Praktik' },
		{ value: 'games', label: 'Quiz / Challenge' }
	]);

	// Level 1: Filtered & Sorted Meeting Summaries Grid
	let filteredMeetingSummaries = $derived(
		(data.meetingSummaries || []).filter((m) => {
			if (selectedKelasFilter !== 'all' && m.kelasName !== selectedKelasFilter) {
				return false;
			}
			if (selectedTrackFilter !== 'all') {
				const fullTrack = `${m.phaseTitle} › ${m.subPhaseTitle}`;
				if (fullTrack !== selectedTrackFilter) return false;
			}
			if (selectedActivityFilter !== 'all' && m.activityType !== selectedActivityFilter) {
				return false;
			}
			if (searchQuery.trim() !== '') {
				const q = searchQuery.toLowerCase();
				const titleMatch = m.pertemuanTitle?.toLowerCase().includes(q);
				const taskMatch = m.taskTitle?.toLowerCase().includes(q);
				const phaseMatch = m.phaseTitle?.toLowerCase().includes(q);
				const subPhaseMatch = m.subPhaseTitle?.toLowerCase().includes(q);
				return titleMatch || taskMatch || phaseMatch || subPhaseMatch;
			}
			return true;
		})
	);

	let sortedMeetingSummaries = $derived.by(() => {
		const list = [...filteredMeetingSummaries];
		if (selectedSortLevel1 === 'pending_banyak') {
			list.sort(
				(a, b) =>
					b.stats.pending - a.stats.pending ||
					new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
			);
		} else if (selectedSortLevel1 === 'terbaru') {
			list.sort(
				(a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
			);
		} else if (selectedSortLevel1 === 'terlama') {
			list.sort(
				(a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
			);
		} else if (selectedSortLevel1 === 'tugas_az') {
			list.sort((a, b) => (a.pertemuanTitle || '').localeCompare(b.pertemuanTitle || ''));
		} else if (selectedSortLevel1 === 'poin_tertinggi') {
			const pointsMap: Record<string, number> = { kecil: 50, sedang: 100, besar: 200 };
			list.sort((a, b) => (pointsMap[b.taskSize] || 100) - (pointsMap[a.taskSize] || 100));
		}
		return list;
	});

	// Level 1 Pagination
	let currentPage = $state(1);
	let itemsPerPage = $state<number>(10); // Default 10 cards per page (selectable: 5, 10, 25, 50)

	let pageSizeOptions = [
		{ value: 5, label: '5 Data' },
		{ value: 10, label: '10 Data' },
		{ value: 25, label: '25 Data' },
		{ value: 50, label: '50 Data' }
	];

	let totalPages = $derived(Math.ceil(sortedMeetingSummaries.length / itemsPerPage) || 1);

	let paginatedMeetingSummaries = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return sortedMeetingSummaries.slice(start, start + itemsPerPage);
	});

	$effect(() => {
		selectedKelasFilter;
		selectedTrackFilter;
		selectedActivityFilter;
		selectedSortLevel1;
		searchQuery;
		itemsPerPage;
		untrack(() => {
			currentPage = 1;
		});
	});

	let isLevel1FilterActive = $derived(
		selectedKelasFilter !== 'all' ||
		selectedTrackFilter !== 'all' ||
		selectedActivityFilter !== 'all' ||
		selectedSortLevel1 !== 'pending_banyak' ||
		searchQuery.trim() !== ''
	);

	function resetLevel1Filters() {
		selectedKelasFilter = 'all';
		selectedTrackFilter = 'all';
		selectedActivityFilter = 'all';
		selectedSortLevel1 = 'pending_banyak';
		searchQuery = '';
		currentPage = 1;
	}

	let pendingCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'pending').length
	);
	let approvedCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'approved').length
	);
	let revisiCountTotal = $derived(
		(data.submissions || []).filter((s) => s.status === 'revisi').length
	);

	let activeMeetingApprovedCount = $derived(
		meetingSubmissions.filter((s) => s.status === 'approved').length
	);

	function selectMeeting(pertemuanId: number, targetSubmissionId?: number | null) {
		selectedPertemuanId = pertemuanId;
		rosterSearchQuery = '';
		rosterStatusFilter = 'all';
		const subs = (data.submissions || []).filter((s) => s.pertemuanId === pertemuanId);
		const firstPending = subs.find((s) => s.status === 'pending');
		const chosenSubId = targetSubmissionId ?? (firstPending ? firstPending.id : (subs[0]?.id || null));
		selectedSubmissionId = chosenSubId;

		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('pertemuanId', String(pertemuanId));
			if (chosenSubId) {
				url.searchParams.set('submissionId', String(chosenSubId));
			} else {
				url.searchParams.delete('submissionId');
			}
			goto(url.search, { replaceState: true, keepFocus: true, noScroll: true });
		}
	}

	function selectSubmission(subId: number) {
		selectedSubmissionId = subId;
		if (selectedPertemuanId !== null && typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('pertemuanId', String(selectedPertemuanId));
			url.searchParams.set('submissionId', String(subId));
			goto(url.search, { replaceState: true, keepFocus: true, noScroll: true });
		}
	}

	$effect(() => {
		const paramPid = $page.url.searchParams.get('pertemuanId');
		const paramSubId = $page.url.searchParams.get('submissionId');

		if (paramPid && !isNaN(Number(paramPid))) {
			const pid = Number(paramPid);
			const exists = (data.meetingSummaries || []).some((m) => m.pertemuanId === pid);
			if (exists) {
				untrack(() => {
					if (selectedPertemuanId !== pid) {
						selectedPertemuanId = pid;
					}
					if (paramSubId && !isNaN(Number(paramSubId))) {
						const subId = Number(paramSubId);
						if (selectedSubmissionId !== subId) {
							selectedSubmissionId = subId;
						}
					} else if (selectedSubmissionId === null) {
						const subs = (data.submissions || []).filter((s) => s.pertemuanId === pid);
						const firstPending = subs.find((s) => s.status === 'pending');
						selectedSubmissionId = firstPending ? firstPending.id : (subs[0]?.id || null);
					}
				});
			} else {
				untrack(() => {
					selectedPertemuanId = null;
					selectedSubmissionId = null;
				});
			}
		} else {
			untrack(() => {
				if (selectedPertemuanId !== null) {
					selectedPertemuanId = null;
					selectedSubmissionId = null;
				}
			});
		}
	});

	function closeStudioView() {
		const fromSource = $page.url.searchParams.get('from');
		selectedPertemuanId = null;
		selectedSubmissionId = null;
		rosterSearchQuery = '';
		rosterStatusFilter = 'all';

		if (fromSource === 'dashboard') {
			goto('/mentor');
			return;
		}
		if (typeof window !== 'undefined') {
			goto('/mentor/tugas', { replaceState: true, keepFocus: true, noScroll: true });
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && selectedPertemuanId !== null) {
			closeStudioView();
		}
	}

	function isIframeEmbeddable(url: string | null | undefined): boolean {
		if (!url) return false;
		const lower = url.toLowerCase();
		// GitHub links show external inspector card directly
		if (lower.includes('github.com')) {
			return false;
		}
		return url.startsWith('http://') || url.startsWith('https://');
	}

	function getEmbeddableUrl(rawUrl: string | null | undefined): string {
		if (!rawUrl) return '';
		const url = rawUrl.trim();
		if (!url.startsWith('http://') && !url.startsWith('https://')) return url;

		try {
			const lower = url.toLowerCase();

			// 1. Google Drive Files
			if (lower.includes('drive.google.com/file/d/')) {
				const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
				if (match && match[1]) {
					return `https://drive.google.com/file/d/${match[1]}/preview`;
				}
			}

			// Google Drive open link: https://drive.google.com/open?id=FILE_ID
			if (lower.includes('drive.google.com/open') && url.includes('id=')) {
				const u = new URL(url);
				const fileId = u.searchParams.get('id');
				if (fileId) {
					return `https://drive.google.com/file/d/${fileId}/preview`;
				}
			}

			// 3. Google Docs / Sheets / Slides
			if (lower.includes('docs.google.com/')) {
				if (lower.includes('/preview')) return url;
				return url.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview');
			}

			// 4. Figma Design & Prototype
			if (lower.includes('figma.com/')) {
				if (lower.includes('figma.com/embed')) return url;
				return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
			}

			// 5. YouTube Video
			if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) {
				let videoId = '';
				if (lower.includes('youtu.be/')) {
					videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
				} else {
					const u = new URL(url);
					videoId = u.searchParams.get('v') || '';
				}
				if (videoId) {
					return `https://www.youtube.com/embed/${videoId}`;
				}
			}

			// 6. External PDF / Document Files
			if (lower.endsWith('.pdf') || lower.endsWith('.docx') || lower.endsWith('.pptx') || lower.endsWith('.xlsx')) {
				return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
			}

			return url;
		} catch {
			return url;
		}
	}

	function getDomainFromUrl(url: string | null | undefined): string {
		if (!url) return 'Link Proyek Eksternal';
		try {
			const u = new URL(url);
			return u.hostname.replace('www.', '');
		} catch {
			return 'Link Proyek Eksternal';
		}
	}

	function formatIndoDate(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '-';
		const d = new Date(dateVal);
		if (isNaN(d.getTime())) return String(dateVal);
		const months = [
			'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
			'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
		];
		const hours = String(d.getHours()).padStart(2, '0');
		const mins = String(d.getMinutes()).padStart(2, '0');
		return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hours}:${mins}`;
	}
</script>

<svelte:head>
	<title>Penilaian Tugas Siswa — Portal Mentor NLC</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if selectedPertemuanId === null}
	<!-- LEVEL 1: MASTER GRID VIEW (PILIH PERTEMUAN) -->
	<div class="page-container">
		<PageHeaderCard
			title="Daftar Pertemuan Ber-Tugas"
			subtitle="Pilih sesi pertemuan di bawah ini untuk memeriksa hasil submisi tugas dari siswa dalam antarmuka Studio 3-Pane Review."
			breadcrumbs={[
				{ label: 'Dashboard', href: '/mentor' },
				{ label: 'Penilaian Tugas' }
			]}
		>
			{#snippet badges()}
				<span class="badge badge-pending">ANTREAN REVIEW</span>
			{/snippet}
		</PageHeaderCard>

		<!-- Overview Stats Grid -->
		<div class="stats-row">
			<div class="stat-card">
				<div class="stat-card__icon" style="background: #e0e7ff; color: #4f46e5;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Sesi Pertemuan</div>
					<div class="stat-card__value">{(data.meetingSummaries || []).length}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #fef3c7; color: #d97706;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Pending Review</div>
					<div class="stat-card__value" style="color: #d97706;">{pendingCountTotal}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #dcfce7; color: #16a34a;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Total Disetujui</div>
					<div class="stat-card__value" style="color: #16a34a;">{approvedCountTotal}</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-card__icon" style="background: #ffe4e6; color: #e11d48;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<div>
					<div class="stat-card__label">Perlu Revisi</div>
					<div class="stat-card__value" style="color: #e11d48;">{revisiCountTotal}</div>
				</div>
			</div>
		</div>

		<!-- Filter Card Level 1 (Master Grid View) -->
		<div class="page-filter-card mb-8">
			<!-- Row 1: Search Bar & Conditional Reset -->
			<div class="filter-row-top">
				<div class="flex-1">
					<TextInput
						id="search-l1-input"
						label="Cari Pertemuan / Task"
						placeholder="Ketik nama sesi pertemuan, judul tugas, atau track pembelajaran..."
						bind:value={searchQuery}
					/>
				</div>

				{#if isLevel1FilterActive}
					<div class="flex-shrink-0">
						<button
							type="button"
							class="btn-reset-filters-active"
							onclick={resetLevel1Filters}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							<span>Reset Filter</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Row 2: Filter Kelas, Track, Aktivitas, Urutkan -->
			<div class="filter-row-bottom">
				<div>
					<CustomSelect
						id="kelas-filter-l1"
						label="Filter Kelas"
						bind:value={selectedKelasFilter}
						options={kelasOptions}
					/>
				</div>

				<div>
					<CustomSelect
						id="track-filter-l1"
						label="Filter Track Pembelajaran"
						bind:value={selectedTrackFilter}
						options={trackOptions}
					/>
				</div>

				<div>
					<CustomSelect
						id="activity-filter-l1"
						label="Tipe Aktivitas Sesi"
						bind:value={selectedActivityFilter}
						options={activityOptions}
					/>
				</div>

				<div>
					<CustomSelect
						id="sort-filter-l1"
						label="Urutkan Sesi Pertemuan"
						bind:value={selectedSortLevel1}
						options={sortOptionsLevel1}
					/>
				</div>
			</div>
		</div>

		<!-- Grid Cards Pertemuan (Master View) -->
		{#if sortedMeetingSummaries.length === 0}
			<div class="empty-card">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<div class="empty-title">Tidak Ada Pertemuan Ber-Tugas Ditemukan</div>
				<div class="empty-sub">Belum ada sesi pertemuan yang memiliki penugasan task sesuai kriteria pencarian.</div>
			</div>
		{:else}
			<div class="meeting-summary-grid">
				{#each paginatedMeetingSummaries as m (m.pertemuanId)}
					<div class="meeting-summary-card">
						<div class="card-top-row mb-2">
							<span class="track-badge">
								{m.phaseTitle || 'Track Pembelajaran'} &rsaquo; {m.subPhaseTitle || 'Sub-Phase'}
							</span>
							<span class="task-size-pill">
								{m.taskSize.toUpperCase()} (+{m.taskSize === 'kecil' ? '50' : m.taskSize === 'besar' ? '200' : '100'} Poin)
							</span>
						</div>

						<h3 class="meeting-card-title">{m.pertemuanTitle}</h3>
						<p class="meeting-card-date">
							Sesi: <strong>{formatIndoDate(m.sessionDate)}</strong> · {m.kelasName}
						</p>

						<div class="task-info-box">
							<span class="task-info-label">Judul Task:</span>
							<strong class="task-info-title">{m.taskTitle}</strong>
							{#if m.taskDescription}
								<p class="task-info-desc">{m.taskDescription}</p>
							{/if}
						</div>

						<!-- Live Submission Stats Grid -->
						<div class="submission-stats-grid">
							<div class="stat-pill stat-pending">
								<span class="stat-num">{m.stats.pending}</span>
								<span class="stat-txt">Pending</span>
							</div>
							<div class="stat-pill stat-approved">
								<span class="stat-num">{m.stats.approved}</span>
								<span class="stat-txt">Disetujui</span>
							</div>
							<div class="stat-pill stat-revisi">
								<span class="stat-num">{m.stats.revisi}</span>
								<span class="stat-txt">Revisi</span>
							</div>
							<div class="stat-pill stat-total">
								<span class="stat-num">{m.stats.total}</span>
								<span class="stat-txt">Total Submisi</span>
							</div>
						</div>

						<div class="card-action-bar">
							<button
								type="button"
								onclick={() => selectMeeting(m.pertemuanId)}
								class="btn-create"
								style="width: 100%; justify-content: center;"
							>
								<span>Buka Studio Penilaian ({m.stats.total}) &rsaquo;</span>
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination Control Bar -->
			{#if sortedMeetingSummaries.length > 0}
				<div class="pagination-bar">
					<div class="flex items-center gap-4 flex-wrap">
						<div class="pagination-info">
							Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedMeetingSummaries.length)}</strong> dari <strong>{sortedMeetingSummaries.length}</strong> Sesi Pertemuan
						</div>

						<div class="page-size-selector w-32">
							<CustomSelect
								id="page-size-select-l1"
								bind:value={itemsPerPage}
								options={pageSizeOptions}
								searchable={false}
								direction="up"
							/>
						</div>
					</div>

					{#if totalPages > 1}
						<div class="pagination-actions">
							<button
								type="button"
								class="btn-pagination-nav"
								disabled={currentPage === 1}
								onclick={() => currentPage--}
							>
								‹ Prev
							</button>

							{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
								<button
									type="button"
									class="btn-pagination-num"
									class:btn-pagination-num--active={currentPage === pageNum}
									onclick={() => (currentPage = pageNum)}
								>
									{pageNum}
								</button>
							{/each}

							<button
								type="button"
								class="btn-pagination-nav"
								disabled={currentPage === totalPages}
								onclick={() => currentPage++}
							>
								Next ›
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

{:else}
	<!-- LEVEL 2: DEDICATED FULL-VIEWPORT 3-PANE STUDIO WORKSPACE (LIGHT MODE) -->
	<div class="studio-workspace-scrim" role="region" aria-label="Studio Penilaian Task">
		<!-- Studio Top Header Bar (54px - Light Mode) -->
		<header class="studio-topbar">
			<div class="studio-topbar-left">
				<button type="button" onclick={closeStudioView} class="btn-studio-back" title="Kembali ke Daftar Pertemuan">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="19" y1="12" x2="5" y2="12" />
						<polyline points="12 19 5 12 12 5" />
					</svg>
					<span>Keluar Studio (Esc)</span>
				</button>

				<div class="studio-topbar-divider"></div>

				<div class="studio-topbar-meta">
					<h2 class="studio-topbar-title">{activeMeetingSummary?.pertemuanTitle || 'Penilaian Sesi'}</h2>
					<span class="studio-topbar-sub">
						{activeMeetingSummary?.kelasName} · Task: <strong>{activeMeetingSummary?.taskTitle}</strong>
					</span>
				</div>
			</div>

			<div class="studio-topbar-center">
				<div class="studio-progress-badge">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
					<span>Progres Evaluasi: <strong>{activeMeetingApprovedCount} / {meetingSubmissions.length} Disetujui</strong></span>
				</div>
			</div>

			<div class="studio-topbar-right">
				{#if activeSubmission}
					<button
						type="button"
						onclick={refreshPreview}
						class="btn-studio-refresh"
						title="Muat Ulang Preview Proyek"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M21.5 2v6h-6M2.5 22v-6h6" />
							<path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16" />
						</svg>
						<span>Refresh</span>
					</button>

					<a
						href={activeSubmission.link}
						target="_blank"
						rel="noopener noreferrer"
						class="btn-studio-link"
						title="Buka Proyek Siswa di Tab Baru"
					>
						<span>Buka Tab Baru</span>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
							<polyline points="15 3 21 3 21 9" />
							<line x1="10" y1="14" x2="21" y2="3" />
						</svg>
					</a>
				{/if}

				<button type="button" onclick={closeStudioView} class="btn-studio-close" aria-label="Tutup Studio">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</header>

		<!-- 3-PANE CONTAINER (1/6 : 4/6 : 1/6 LEBAR LAYAR) -->
		<div class="studio-panes-container">
			<!-- PANE 1: DAFTAR SISWA SUBMISI (1/6 LEBAR, MIN-WIDTH 240px) -->
			<aside class="pane-roster">
				<!-- Roster Search & Filter Header -->
				<div class="pane-roster-header">
					<div class="roster-search-wrap mb-2">
						<input
							type="text"
							placeholder="Cari nama / username..."
							bind:value={rosterSearchQuery}
							class="roster-search-input"
						/>
					</div>

					<!-- Roster Sort Dropdown -->
					<div class="mb-2">
						<CustomSelect
							id="roster-sort-select"
							bind:value={rosterSort}
							options={rosterSortOptions}
							searchable={false}
						/>
					</div>

					<!-- Status Filter Pills -->
					<div class="roster-filter-pills">
						<button
							type="button"
							class="roster-pill"
							class:roster-pill--active={rosterStatusFilter === 'all'}
							onclick={() => (rosterStatusFilter = 'all')}
						>
							Semua ({meetingSubmissions.length})
						</button>
						<button
							type="button"
							class="roster-pill pill-pending"
							class:roster-pill--active={rosterStatusFilter === 'pending'}
							onclick={() => (rosterStatusFilter = 'pending')}
						>
							Pending
						</button>
						<button
							type="button"
							class="roster-pill pill-approved"
							class:roster-pill--active={rosterStatusFilter === 'approved'}
							onclick={() => (rosterStatusFilter = 'approved')}
						>
							Disetujui
						</button>
						<button
							type="button"
							class="roster-pill pill-revisi"
							class:roster-pill--active={rosterStatusFilter === 'revisi'}
							onclick={() => (rosterStatusFilter = 'revisi')}
						>
							Revisi
						</button>
					</div>
				</div>

				<!-- Student Submissions Roster List -->
				<div class="pane-roster-list">
					{#if sortedRosterSubmissions.length === 0}
						<div class="roster-empty">
							<p>Tidak ada siswa ditemukan.</p>
						</div>
					{:else}
						{#each sortedRosterSubmissions as sub (sub.id)}
							<button
								type="button"
								class="roster-item"
								class:roster-item--active={activeSubmission?.id === sub.id}
								onclick={() => selectSubmission(sub.id)}
							>
								<div class="roster-avatar">
									{sub.studentName.substring(0, 2).toUpperCase()}
								</div>

								<div class="roster-info">
									<div class="roster-name-row">
										<span class="roster-student-name">{sub.studentName}</span>
										{#if sub.status === 'approved'}
											<span class="roster-badge badge-approved">✓</span>
										{:else if sub.status === 'revisi'}
											<span class="roster-badge badge-revisi">!</span>
										{:else}
											<span class="roster-badge badge-pending">•</span>
										{/if}
									</div>
									<span class="roster-username">@{sub.studentUsername}</span>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</aside>

			<!-- PANE 2: REVIEW WORKSPACE & LIVE PREVIEW (4/6 LEBAR) -->
			<main class="pane-review">
				{#if !activeSubmission}
					<div class="pane-review-empty">
						<p>Pilih siswa dari daftar roster di sebelah kiri untuk meninjau proyek/pekerjaan.</p>
					</div>
				{:else}
					<!-- Top URL Header Bar -->
					<div class="pane-review-url-bar">
						<div class="flex items-center gap-2 overflow-hidden flex-1">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400 flex-shrink-0">
								<circle cx="12" cy="12" r="10" />
								<line x1="2" y1="12" x2="22" y2="12" />
								<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
							</svg>
							<span class="url-text" title={activeSubmission.link}>{activeSubmission.link}</span>
						</div>

						<div class="flex items-center gap-1.5 flex-shrink-0">
							<button
								type="button"
								onclick={refreshPreview}
								class="btn-open-tab-mini"
								title="Muat Ulang Preview Proyek"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<path d="M21.5 2v6h-6M2.5 22v-6h6" />
									<path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16" />
								</svg>
								<span>Refresh</span>
							</button>

							<a
								href={activeSubmission.link}
								target="_blank"
								rel="noopener noreferrer"
								class="btn-open-tab-mini"
							>
								<span>Buka Tab Baru</span>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" y1="14" x2="21" y2="3" />
								</svg>
							</a>
						</div>
					</div>

					<!-- Preview Frame Wrap -->
					<div class="pane-review-frame-wrap">
						{#if isIframeEmbeddable(activeSubmission.link)}
							{#key iframeKey}
								<iframe
									src={getEmbeddableUrl(activeSubmission.link)}
									title="Preview Pekerjaan Siswa"
									class="pane-review-iframe"
									sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								></iframe>
							{/key}
						{:else}
							<!-- External Inspector Card for GitHub / Drive / Figma / Canva / Replit -->
							<div class="pane-review-external">
								<div class="external-link-card">
									<div class="external-icon">
										<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
											<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
										</svg>
									</div>
									<h4 class="external-domain">{getDomainFromUrl(activeSubmission.link)}</h4>
									<p class="external-sub">
										Tautan eksternal proyek siswa (GitHub / Figma / Canva / Drive). Klik tombol di bawah untuk memeriksa kode / dokumen di tab baru.
									</p>
									<div class="external-url-box">{activeSubmission.link}</div>
									<a
										href={activeSubmission.link}
										target="_blank"
										rel="noopener noreferrer"
										class="btn-visit-external"
									>
										<span>Buka Proyek Siswa &rsaquo;</span>
									</a>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</main>

			<!-- PANE 3: ASSESSMENT & GRADING FORM (1/6 LEBAR, MIN-WIDTH 260px) -->
			<aside class="pane-assessment">
				{#if !activeSubmission}
					<div class="pane-assessment-empty">
						<p>Pilih siswa untuk melakukan penilaian.</p>
					</div>
				{:else}
					<div class="pane-assessment-inner">
						<!-- Student & Task Summary -->
						<div class="assessment-summary-card">
							<div class="summary-head">
								<h3 class="summary-student-name">{activeSubmission.studentName}</h3>
								<span class="summary-student-meta">@{activeSubmission.studentUsername} · {activeSubmission.kelasName}</span>
							</div>

							<div class="summary-divider"></div>

							<div class="summary-row">
								<span class="info-label">Judul Task:</span>
								<strong class="info-val">{activeSubmission.taskTitle}</strong>
							</div>
							<div class="summary-row">
								<span class="info-label">Bobot Poin:</span>
								<span class="size-reward-badge">
									{activeSubmission.taskSize.toUpperCase()} (+{activeSubmission.taskSize === 'kecil' ? '50' : activeSubmission.taskSize === 'besar' ? '200' : '100'} Poin)
								</span>
							</div>
							<div class="summary-row">
								<span class="info-label">Waktu Kirim:</span>
								<span class="info-val">{formatIndoDate(activeSubmission.submittedAt)}</span>
							</div>
						</div>

						<!-- Status Context Banner -->
						{#if activeSubmission.status === 'approved'}
							<div class="status-context-banner banner-approved">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
									<polyline points="22 4 12 14.01 9 11.01" />
								</svg>
								<span>Tugas ini saat ini <strong>SUDAH DISETUJUI</strong> (+poin aktif).</span>
							</div>
						{:else if activeSubmission.status === 'revisi'}
							<div class="status-context-banner banner-revisi">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<span>Tugas ini saat ini <strong>PERLU REVISI</strong>.</span>
							</div>
						{/if}

						<!-- Form Penilaian & Feedback -->
						<form
							method="POST"
							action="?/review"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ result, update }) => {
									isSubmitting = false;
									if (result.type === 'success') {
										const msg = (result.data as any)?.message || 'Penilaian tugas berhasil disimpan.';
										toast.success(msg);
										advanceToNextStudent();
									} else if (result.type === 'failure') {
										const msg = (result.data as any)?.message || 'Gagal menyimpan penilaian tugas.';
										toast.error(msg);
									}
									await update();
								};
							}}
							class="assessment-form"
						>
							<input type="hidden" name="submissionId" value={activeSubmission.id} />
							<input type="hidden" name="status" value={reviewStatus} />

							<!-- Action Type Switcher -->
							<div class="status-action-tabs">
								{#if activeSubmission.status !== 'approved'}
									<button
										type="button"
										class="tab-action-btn tab-approve"
										class:tab-action-btn--active={reviewStatus === 'approved'}
										onclick={() => (reviewStatus = 'approved')}
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<polyline points="20 6 9 17 4 12" />
										</svg>
										<span>Setujui &amp; Beri Poin</span>
									</button>
								{/if}

								<button
									type="button"
									class="tab-action-btn tab-revisi"
									class:tab-action-btn--active={reviewStatus === 'revisi'}
									onclick={() => (reviewStatus = 'revisi')}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" y1="8" x2="12" y2="12" />
										<line x1="12" y1="16" x2="12.01" y2="16" />
									</svg>
									<span>{activeSubmission.status === 'approved' ? 'Ubah ke Minta Revisi' : 'Minta Revisi'}</span>
								</button>
							</div>

							<!-- Feedback Input -->
							<div class="mt-3 mb-4">
								<TextArea
									id="feedback-studio"
									name="feedback"
									label={reviewStatus === 'approved' ? 'Catatan Umpan Balik / Catatan Mentor (Opsional)' : 'Catatan Instruksi Revisi (Wajib)'}
									placeholder={reviewStatus === 'approved' ? 'Contoh: Konfigurasi BGP tepat, penataan kabel & struktur dokumen sangat baik.' : 'Contoh: Mohon lengkapi screencast pengujian ping IP router dan upload ulang link...'}
									bind:value={reviewFeedback}
									rows={5}
									required={reviewStatus === 'revisi'}
								/>
							</div>

							<!-- Submit Action Button -->
							<div class="mb-4">
								{#if reviewStatus === 'approved'}
									<button type="submit" disabled={isSubmitting} class="btn-submit-approve w-full justify-center">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<polyline points="20 6 9 17 4 12" />
										</svg>
										<span>{isSubmitting ? 'Menyimpan...' : 'Setujui & Siswa Lanjut ›'}</span>
									</button>
								{:else}
									<button type="submit" disabled={isSubmitting} class="btn-submit-revisi w-full justify-center">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<circle cx="12" cy="12" r="10" />
											<line x1="12" y1="8" x2="12" y2="12" />
											<line x1="12" y1="16" x2="12.01" y2="16" />
										</svg>
										<span>{isSubmitting ? 'Menyimpan...' : 'Kirim Catatan Revisi ›'}</span>
									</button>
								{/if}
							</div>
						</form>

						<!-- Roster Navigation Shortcut Buttons -->
						<div class="studio-nav-buttons">
							<button
								type="button"
								onclick={advanceToPrevStudent}
								class="btn-nav-prev"
								disabled={sortedRosterSubmissions.findIndex(s => s.id === activeSubmission?.id) <= 0}
							>
								‹ Siswa Sblm
							</button>

							<button
								type="button"
								onclick={advanceToNextStudent}
								class="btn-nav-next"
								disabled={sortedRosterSubmissions.findIndex(s => s.id === activeSubmission?.id) >= sortedRosterSubmissions.length - 1}
							>
								Siswa Lanjut ›
							</button>
						</div>
					</div>
				{/if}
			</aside>
		</div>
	</div>
{/if}

<style>
	.content-area {
		padding: 24px 28px 48px;
		max-width: 1280px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}

	/* Header Card Container */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms ease;
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
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
		line-height: 1.2;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 680px;
		line-height: 1.5;
	}

	.btn-create {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: white;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		padding: 10px 18px;
		border: none;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-glow);
		transition: transform 150ms ease, box-shadow 150ms ease;
		white-space: nowrap;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(79, 70, 229, 0.45);
	}

	/* Stats Row */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 0;
	}

	@media (max-width: 1024px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 18px 20px;
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.stat-card__icon {
		width: 42px;
		height: 42px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-card__label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.stat-card__value {
		font-family: var(--font-macro);
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.1;
	}

	/* Filter Card Layout Standard */
	.page-filter-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.filter-row-top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 14px;
	}

	.filter-row-bottom {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		align-items: flex-start;
	}

	@media (max-width: 1024px) {
		.filter-row-bottom {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.filter-row-bottom {
			grid-template-columns: 1fr;
		}
	}

	/* Pagination Bar */
	.pagination-bar {
		margin-top: 24px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		position: relative;
		z-index: 20;
	}

	.pagination-info {
		font-size: 13px;
		color: #64748b;
	}

	.pagination-info strong {
		color: #0f172a;
	}

	.page-size-selector {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.page-size-select {
		padding: 4px 8px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: #0f172a;
		cursor: pointer;
		outline: none;
		transition: border-color 150ms ease;
	}

	.page-size-select:focus,
	.page-size-select:hover {
		border-color: #4f46e5;
	}

	.pagination-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-pagination-nav {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-pagination-nav:hover:not(:disabled) {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.btn-pagination-nav:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-pagination-num {
		min-width: 32px;
		height: 32px;
		padding: 0 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: #475569;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-pagination-num:hover {
		background: #f8fafc;
		border-color: #cbd5e1;
	}

	.btn-pagination-num--active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
	}

	.btn-reset-filters-active {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: #fee2e2;
		color: #b91c1c;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.btn-reset-filters-active:hover {
		background: #fecaca;
	}

	/* Meeting Summary Grid (Level 1) */
	.meeting-summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
	}

	@media (max-width: 1024px) {
		.meeting-summary-grid {
			grid-template-columns: 1fr;
		}
	}

	.meeting-summary-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 22px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: transform 180ms ease, box-shadow 180ms ease;
	}

	.meeting-summary-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.track-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid var(--primary-border);
	}

	.task-size-pill {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #047857;
		background: #d1fae5;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #6ee7b7;
	}

	.meeting-card-title {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 8px;
		margin-bottom: 2px;
	}

	.meeting-card-date {
		font-size: 12.5px;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.task-info-box {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px 14px;
		margin-bottom: 16px;
	}

	.task-info-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		display: block;
		margin-bottom: 2px;
	}

	.task-info-title {
		font-size: 13.5px;
		color: var(--text-primary);
	}

	.task-info-desc {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 4px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.submission-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 18px;
	}

	.stat-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8px 4px;
		border-radius: var(--radius-md);
		text-align: center;
	}

	.stat-pill .stat-num {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		line-height: 1;
	}

	.stat-pill .stat-txt {
		font-size: 10px;
		font-weight: 700;
		margin-top: 2px;
	}

	.stat-pending {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
	}

	.stat-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.stat-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.stat-total {
		background: var(--bg-inset);
		color: var(--text-primary);
		border: 1px solid var(--border-hard);
	}

	/* Empty State Card */
	.empty-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 48px 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--bg-inset);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 420px;
	}

	/* STUDIO WORKSPACE LAYOUT (FULL-VIEWPORT 3-PANE LIGHT MODE) */
	.studio-workspace-scrim {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	.studio-topbar {
		height: 54px;
		background: #ffffff;
		border-bottom: 1px solid #e2e8f0;
		color: #0f172a;
		padding: 0 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.studio-topbar-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.btn-studio-back {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-studio-back:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.studio-topbar-divider {
		width: 1px;
		height: 22px;
		background: #e2e8f0;
	}

	.studio-topbar-meta {
		display: flex;
		flex-direction: column;
	}

	.studio-topbar-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.studio-topbar-sub {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #64748b;
	}

	.studio-topbar-center {
		display: flex;
		align-items: center;
	}

	.studio-progress-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		background: #e0e7ff;
		color: #3730a3;
		border: 1px solid #c7d2fe;
		border-radius: 20px;
		font-family: var(--font-mono);
		font-size: 11.5px;
	}

	.studio-topbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-studio-refresh {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-studio-refresh:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.btn-studio-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #eef2ff;
		color: #4f46e5;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.btn-studio-link:hover {
		background: #e0e7ff;
		color: #3730a3;
	}

	.btn-studio-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		background: #ffffff;
		color: #64748b;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-studio-close:hover {
		background: #fee2e2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	/* 3-PANE CONTAINER (1/6 : 4/6 : 1/6) */
	.studio-panes-container {
		flex: 1;
		display: flex;
		width: 100%;
		height: calc(100vh - 54px);
		overflow: hidden;
		background: #f8fafc;
	}

	@media (max-width: 960px) {
		.studio-panes-container {
			flex-direction: column;
			overflow-y: auto;
		}
	}

	/* PANE 1: ROSTER SISWA (1/6 LEBAR, MIN-WIDTH 240px) */
	.pane-roster {
		flex: 1;
		min-width: 240px;
		max-width: 320px;
		background: #ffffff;
		border-right: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.pane-roster-header {
		padding: 14px 14px 10px;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
	}

	.roster-search-input {
		width: 100%;
		padding: 7px 12px;
		font-size: 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		outline: none;
		transition: border-color 150ms ease;
	}

	.roster-search-input:focus {
		border-color: #4f46e5;
	}

	.roster-filter-pills {
		display: flex;
		gap: 4px;
		overflow-x: auto;
	}

	.roster-pill {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #64748b;
		cursor: pointer;
		white-space: nowrap;
	}

	.roster-pill--active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4338ca;
	}

	.pane-roster-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.roster-empty {
		padding: 24px 12px;
		text-align: center;
		font-size: 12px;
		color: #94a3b8;
	}

	.roster-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: #ffffff;
		text-align: left;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.roster-item:hover {
		background: #f1f5f9;
	}

	.roster-item--active {
		background: #eff6ff !important;
		border-color: #bfdbfe !important;
		box-shadow: inset 3px 0 0 #3b82f6;
	}

	.roster-avatar {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #e0e7ff;
		color: #4f46e5;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.roster-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.roster-name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
	}

	.roster-student-name {
		font-size: 12.5px;
		font-weight: 700;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.roster-username {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: #64748b;
	}

	.roster-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.badge-approved {
		background: #dcfce7;
		color: #15803d;
	}

	.badge-revisi {
		background: #ffe4e6;
		color: #be123c;
	}

	.badge-pending {
		background: #fef3c7;
		color: #b45309;
	}

	/* PANE 2: REVIEW WORKSPACE & LIVE PREVIEW (4/6 LEBAR) */
	.pane-review {
		flex: 4;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-right: 1px solid #e2e8f0;
	}

	.pane-review-empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px;
		color: #64748b;
		font-size: 14px;
		text-align: center;
	}

	.pane-review-url-bar {
		padding: 10px 16px;
		background: #ffffff;
		border-bottom: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-shrink: 0;
	}

	.url-text {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: #334155;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.btn-open-tab-mini {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4f46e5;
		background: #eef2ff;
		padding: 4px 10px;
		border-radius: 5px;
		text-decoration: none;
		flex-shrink: 0;
		border: 1px solid #c7d2fe;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.btn-open-tab-mini:hover {
		background: #e0e7ff;
	}

	.pane-review-frame-wrap {
		flex: 1;
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
	}

	.pane-review-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: #ffffff;
	}

	.pane-review-external {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
	}

	/* PANE 3: ASSESSMENT & GRADING FORM (1/6 LEBAR, MIN-WIDTH 260px) */
	.pane-assessment {
		flex: 1;
		min-width: 270px;
		max-width: 340px;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.pane-assessment-empty {
		padding: 32px;
		text-align: center;
		color: #94a3b8;
		font-size: 13px;
	}

	.pane-assessment-inner {
		padding: 16px;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.assessment-summary-card {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px;
		margin-bottom: 12px;
	}

	.summary-head {
		margin-bottom: 8px;
	}

	.summary-student-name {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.summary-student-meta {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.summary-divider {
		height: 1px;
		background: var(--border-hard);
		margin: 8px 0;
	}

	.summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		margin-bottom: 4px;
	}

	.summary-row:last-child {
		margin-bottom: 0;
	}

	.size-reward-badge {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 800;
		color: #047857;
		background: #d1fae5;
		padding: 2px 6px;
		border-radius: 5px;
	}

	.status-context-banner {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 11.5px;
		margin-bottom: 12px;
	}

	.banner-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	.banner-revisi {
		background: #ffe4e6;
		color: #be123c;
		border: 1px solid #fecdd3;
	}

	.status-action-tabs {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 10px;
	}

	.tab-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 10px;
		border-radius: 8px;
		border: 1.5px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tab-action-btn--active.tab-approve {
		background: #dcfce7;
		color: #15803d;
		border-color: #86efac;
		box-shadow: 0 2px 6px rgba(22, 163, 74, 0.15);
	}

	.tab-action-btn--active.tab-revisi {
		background: #ffe4e6;
		color: #be123c;
		border-color: #fda4af;
		box-shadow: 0 2px 6px rgba(225, 29, 72, 0.15);
	}

	.btn-submit-approve {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 14px;
		background: #16a34a;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: background 150ms ease;
		box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
	}

	.btn-submit-approve:hover {
		background: #15803d;
	}

	.btn-submit-revisi {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 14px;
		background: #e11d48;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: background 150ms ease;
		box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);
	}

	.btn-submit-revisi:hover {
		background: #be123c;
	}

	.studio-nav-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid var(--border-soft);
	}

	.btn-nav-prev, .btn-nav-next {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		padding: 7px 10px;
		border-radius: 6px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-nav-prev:hover:not(:disabled), .btn-nav-next:hover:not(:disabled) {
		background: var(--bg-inset);
		color: var(--primary);
	}

	.btn-nav-prev:disabled, .btn-nav-next:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* External Link Card Inspector */
	.external-link-card {
		padding: 28px 20px;
		text-align: center;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		box-shadow: var(--shadow-sm);
	}

	.external-icon {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.external-domain {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.external-sub {
		font-size: 12.5px;
		color: var(--text-muted);
		margin-bottom: 14px;
		line-height: 1.4;
	}

	.external-url-box {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #475569;
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px 12px;
		width: 100%;
		word-break: break-all;
		margin-bottom: 16px;
	}

	.btn-visit-external {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 10px 18px;
		background: #4f46e5;
		color: white;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
		transition: transform 150ms ease, background 150ms ease;
	}

	.btn-visit-external:hover {
		background: #4338ca;
		transform: translateY(-1px);
	}
</style>

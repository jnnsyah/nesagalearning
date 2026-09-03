<script lang="ts">
	import { enhance } from '$app/forms';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import FormDrawer from '$lib/components/ui/FormDrawer.svelte';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import { toast } from '$lib/stores/toast';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type MeetingItem = (typeof data.meetings)[number];

	let selectedKelas = $state<string | number | null>('all');
	let selectedActivity = $state<string | number | null>('all');
	let selectedTimeFilter = $state<string | number | null>('all');
	let sortBy = $state<string>('date_desc');
	let searchQuery = $state<string>('');
	let startDate = $state<string>('');
	let endDate = $state<string>('');

	// ── Slider Drawer state ─────────────────────────────────────────────
	let showFormDrawer = $state(false);
	let editingMeeting = $state<MeetingItem | null>(null);

	// ── Delete Confirm Modal state ──────────────────────────────────────
	let deleteTarget = $state<MeetingItem | null>(null);
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);

	// Form field bindings
	let formKelasInstanceId = $state<number | string | null>('');
	let formTrackId = $state<number | string | null>('');
	let formSubPhaseId = $state<number | string | null>('');
	let formTitle = $state('');
	let formActivityType = $state<string | number | null>('teori');
	let formSessionDate = $state('');
	let formStartTime = $state('');
	let formEndTime = $state('');
	let formLocation = $state('');
	let formMaterialUrl = $state('');
	let formIsWeekend = $state(false);
	let formHasTask = $state(false);
	let formTaskTitle = $state('');
	let formTaskDescription = $state('');
	let formTaskSize = $state<string | number | null>('sedang');
	let formMateriId = $state<number | string | null>('');

	let filteredMateriOptions = $derived.by(() => {
		if (!formSubPhaseId) return [];
		const list = (data.materis || []).filter((m) => Number(m.subPhaseId) === Number(formSubPhaseId));
		if (list.length > 0) {
			return [
				{ value: '', label: '-- Pilih Materi Sub-Fase --' },
				...list.map((m) => ({ value: String(m.id), label: m.title }))
			];
		}
		const currentSubPhase = (data.subPhases || []).find((sp) => Number(sp.id) === Number(formSubPhaseId));
		const subTitle = currentSubPhase?.title || 'Sub-Fase';
		return [
			{ value: '', label: '-- Pilih Materi Sub-Fase --' },
			{ value: 'materi-1', label: `${subTitle} — Modul Utama & Slide Teori` },
			{ value: 'materi-2', label: `${subTitle} — Hands-on Lab & Latihan Coding` },
			{ value: 'materi-3', label: `${subTitle} — Case Study & Project Review` }
		];
	});

	$effect(() => {
		if (formMateriId) {
			const selectedOption = filteredMateriOptions.find((opt) => String(opt.value) === String(formMateriId));
			if (selectedOption && selectedOption.value) {
				untrack(() => {
					if (!formTitle || formTitle === selectedOption.label) {
						formTitle = selectedOption.label;
					}

					const matObj = (data.materis || []).find((m) => String(m.id) === String(formMateriId));
					if (matObj) {
						let matUrl = '';
						if (matObj.attachments && Array.isArray(matObj.attachments) && matObj.attachments.length > 0) {
							matUrl = matObj.attachments[0]?.url || '';
						} else if (matObj.content && (matObj.content.startsWith('http') || matObj.content.startsWith('/uploads/'))) {
							matUrl = matObj.content.trim();
						}
						if (matUrl && !formMaterialUrl) {
							formMaterialUrl = matUrl;
							uploadedFileName = getFileNameFromUrl(matUrl);
						}
					}
				});
			}
		}
	});

	let isUploading = $state(false);
	let isDragging = $state(false);
	let uploadError = $state('');
	let uploadedFileName = $state('');

	let sessionUploadedFiles = $state<string[]>([]);
	let isFormSubmitted = $state(false);

	function getFileNameFromUrl(url: string): string {
		if (!url) return '';
		const parts = url.split('/');
		const filename = parts[parts.length - 1] || url;
		return filename.replace(/^\d+-/, '');
	}

	function formatTimeOnly(timeStr: string | null | undefined): string {
		if (!timeStr) return '-';
		const parts = String(timeStr).trim().split(':');
		if (parts.length >= 2) {
			return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
		}
		return String(timeStr);
	}

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

	function getMeetingStatus(m: MeetingItem): 'live' | 'upcoming' | 'completed' {
		const todayIsoStr = new Date().toISOString().slice(0, 10);
		if (m.sessionDate < todayIsoStr) return 'completed';
		if (m.sessionDate > todayIsoStr) return 'upcoming';

		const now = new Date();
		const currentMinutes = now.getHours() * 60 + now.getMinutes();

		const [startH, startM] = (m.startTime || '00:00').split(':').map(Number);
		const [endH, endM] = (m.endTime || '23:59').split(':').map(Number);

		const startMinutes = (startH || 0) * 60 + (startM || 0);
		const endMinutes = (endH || 0) * 60 + (endM || 0);

		if (currentMinutes >= startMinutes - 15 && currentMinutes <= endMinutes + 30) {
			return 'live';
		}

		if (currentMinutes < startMinutes - 15) {
			return 'upcoming';
		}

		return 'completed';
	}

	// Auto-detect weekend (Saturday = 6, Sunday = 0) whenever session date changes
	$effect(() => {
		if (formSessionDate) {
			const [y, m, d] = formSessionDate.split('-').map(Number);
			if (y && m && d) {
				const dayOfWeek = new Date(y, m - 1, d).getDay();
				formIsWeekend = dayOfWeek === 0 || dayOfWeek === 6;
			}
		}
	});

	function findDefaultLab3Room(rooms: any[]): string {
		if (!rooms || rooms.length === 0) return 'Lab 3';
		const found = rooms.find((r) => /lab.*3/i.test(r.value) || /lab.*3/i.test(r.label));
		return found ? String(found.value) : (rooms[0]?.value ? String(rooms[0].value) : 'Lab 3');
	}

	function openCreateForm() {
		editingMeeting = null;
		sessionUploadedFiles = [];
		isFormSubmitted = false;
		uploadedFileName = '';
		formKelasInstanceId = data.kelases[0]?.id ?? '';
		formTrackId = data.kelases[0]?.curriculumTrackId ?? data.tracks[0]?.id ?? '';
		formSubPhaseId = data.subPhases[0]?.id ?? '';
		formMateriId = '';
		formTitle = '';
		formActivityType = 'teori';
		formSessionDate = new Date().toISOString().slice(0, 10);
		formStartTime = '15:20';
		formEndTime = '16:55';
		formLocation = findDefaultLab3Room(data.roomsOptions);
		formMaterialUrl = '';
		formIsWeekend = false;
		formHasTask = false;
		formTaskTitle = '';
		formTaskDescription = '';
		formTaskSize = 'sedang';
		showFormDrawer = true;
	}

	function normalizeDateIso(dateVal: Date | string | null | undefined): string {
		if (!dateVal) return '';
		if (dateVal instanceof Date) {
			const y = dateVal.getFullYear();
			const m = String(dateVal.getMonth() + 1).padStart(2, '0');
			const d = String(dateVal.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		}
		const str = String(dateVal).trim();
		if (str.includes('T')) return str.split('T')[0];
		if (str.includes(' ')) return str.split(' ')[0];
		return str;
	}

	function openEditForm(meeting: MeetingItem) {
		editingMeeting = meeting;
		sessionUploadedFiles = [];
		isFormSubmitted = false;
		uploadedFileName = getFileNameFromUrl(meeting.materialUrl ?? '');
		formKelasInstanceId = meeting.kelasInstanceId;
		const foundSub = (data.subPhases || []).find((sp) => Number(sp.id) === Number(meeting.subPhaseId));
		formTrackId = foundSub?.curriculumTrackId ?? data.tracks[0]?.id ?? '';
		formSubPhaseId = meeting.subPhaseId;

		const matchingMateri = (data.materis || []).find(
			(m) =>
				Number(m.subPhaseId) === Number(meeting.subPhaseId) &&
				(m.title.trim().toLowerCase() === meeting.title.trim().toLowerCase() ||
					meeting.title.toLowerCase().includes(m.title.toLowerCase()) ||
					m.title.toLowerCase().includes(meeting.title.toLowerCase()))
		);

		if (matchingMateri) {
			formMateriId = String(matchingMateri.id);
		} else {
			const matchedOpt = filteredMateriOptions.find(
				(opt) => opt.value && opt.label.trim().toLowerCase() === meeting.title.trim().toLowerCase()
			);
			if (matchedOpt) {
				formMateriId = String(matchedOpt.value);
			} else {
				const firstSubMateri = (data.materis || []).find((m) => Number(m.subPhaseId) === Number(meeting.subPhaseId));
				formMateriId = firstSubMateri ? String(firstSubMateri.id) : '';
			}
		}

		formTitle = meeting.title;
		formActivityType = meeting.activityType;
		formSessionDate = normalizeDateIso(meeting.sessionDate);
		formStartTime = formatTimeOnly(meeting.startTime);
		formEndTime = formatTimeOnly(meeting.endTime);
		formLocation = meeting.location ?? '';
		formMaterialUrl = meeting.materialUrl ?? '';
		if (meeting.materialUrl) {
			uploadedFileName = getFileNameFromUrl(meeting.materialUrl);
		}
		formIsWeekend = Boolean(meeting.isWeekend);
		
		if (meeting.tasks && meeting.tasks.length > 0) {
			formHasTask = true;
			formTaskTitle = meeting.tasks[0].title || '';
			formTaskDescription = meeting.tasks[0].description || '';
			formTaskSize = meeting.tasks[0].taskSize || 'sedang';
		} else {
			formHasTask = false;
			formTaskTitle = '';
			formTaskDescription = '';
			formTaskSize = 'sedang';
		}
		showFormDrawer = true;
	}

	async function closeFormDrawer() {
		// If user cancels without saving, delete any newly uploaded temporary files
		if (!isFormSubmitted && sessionUploadedFiles.length > 0) {
			const initialUrl = editingMeeting?.materialUrl ?? '';
			for (const url of sessionUploadedFiles) {
				if (url && url !== initialUrl) {
					try {
						await fetch('/api/storage/delete', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ url })
						});
					} catch (e) {
						console.error('Failed to delete temp file:', e);
					}
				}
			}
		}

		sessionUploadedFiles = [];
		isFormSubmitted = false;
		showFormDrawer = false;
		editingMeeting = null;
	}

	function promptDelete(meeting: MeetingItem) {
		deleteTarget = meeting;
		showDeleteModal = true;
	}

	async function uploadSelectedFile(file: File) {
		if (!file) return;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('folder', 'materials');

		isUploading = true;
		uploadError = '';

		try {
			const res = await fetch('/api/storage/upload', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (res.ok && result.url) {
				formMaterialUrl = result.url;
				uploadedFileName = file.name;
				sessionUploadedFiles.push(result.url);
				toast.success(`File "${file.name}" berhasil diunggah!`);
			} else {
				uploadError = result.error || 'Gagal mengunggah file';
				toast.error(uploadError);
			}
		} catch (err) {
			uploadError = 'Terjadi kesalahan jaringan saat mengunggah';
			toast.error(uploadError);
		} finally {
			isUploading = false;
			isDragging = false;
		}
	}

	async function removeAttachedFile() {
		if (formMaterialUrl) {
			const targetUrl = formMaterialUrl;
			formMaterialUrl = '';
			uploadedFileName = '';
			const initialUrl = editingMeeting?.materialUrl ?? '';
			if (targetUrl && targetUrl !== initialUrl) {
				try {
					await fetch('/api/storage/delete', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ url: targetUrl })
					});
					toast.info('File terlampir telah dihapus dari server');
				} catch (e) {
					console.error('Failed to delete file:', e);
				}
			}
		}
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			uploadSelectedFile(target.files[0]);
		}
	}

	function handleFileDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			uploadSelectedFile(e.dataTransfer.files[0]);
		}
	}

	// Dynamic Form Options for Drawer
	let formKelasOptions = $derived(
		(data.kelases || []).map((k) => ({
			value: k.id,
			label: k.name
		}))
	);

	let formTrackOptions = $derived(
		(data.tracks || []).map((t) => ({
			value: t.id,
			label: t.title
		}))
	);

	// Sync trackId when class changes
	$effect(() => {
		if (formKelasInstanceId) {
			const found = (data.kelases || []).find((k) => String(k.id) === String(formKelasInstanceId));
			if (found?.curriculumTrackId) {
				untrack(() => {
					formTrackId = found.curriculumTrackId;
				});
			}
		}
	});

	let filteredSubPhasesForForm = $derived.by(() => {
		if (!formTrackId) return data.subPhases || [];
		const list = (data.subPhases || []).filter(
			(sp) => Number(sp.curriculumTrackId) === Number(formTrackId)
		);
		return list.length > 0 ? list : data.subPhases || [];
	});

	let formSubPhaseOptions = $derived(
		filteredSubPhasesForForm.map((sp) => ({
			value: sp.id,
			label: sp.phaseTitle ? `${sp.phaseTitle} › ${sp.title}` : sp.title
		}))
	);

	// Auto-select valid sub-phase when track changes
	$effect(() => {
		if (formTrackId && filteredSubPhasesForForm.length > 0) {
			const isValid = filteredSubPhasesForForm.some((sp) => String(sp.id) === String(formSubPhaseId));
			if (!isValid) {
				untrack(() => {
					formSubPhaseId = filteredSubPhasesForForm[0].id;
				});
			}
		}
	});

	let totalCount = $derived(data.meetings.length);
	let teoriCount = $derived(data.meetings.filter((m) => m.activityType === 'teori' || m.activityType === 'teori_praktik').length);
	let praktikCount = $derived(data.meetings.filter((m) => m.activityType === 'praktik' || m.activityType === 'games').length);
	let weekendCount = $derived(data.meetings.filter((m) => m.isWeekend).length);

	let todayStr = new Date().toISOString().slice(0, 10);

	function isThisWeek(dateStr: string): boolean {
		if (!dateStr) return false;
		const now = new Date();
		const d = new Date(dateStr);
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);
		return d >= startOfWeek && d <= endOfWeek;
	}

	function isThisMonth(dateStr: string): boolean {
		if (!dateStr) return false;
		const now = new Date();
		const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		return dateStr.startsWith(yearMonth);
	}

	let isFilterActive = $derived(
		(selectedKelas !== null && selectedKelas !== 'all') ||
		(selectedActivity !== null && selectedActivity !== 'all') ||
		(selectedTimeFilter !== null && selectedTimeFilter !== 'all') ||
		sortBy !== 'date_desc' ||
		searchQuery.trim() !== '' ||
		startDate !== '' ||
		endDate !== ''
	);

	function resetFilters() {
		selectedKelas = 'all';
		selectedActivity = 'all';
		selectedTimeFilter = 'all';
		sortBy = 'date_desc';
		searchQuery = '';
		startDate = '';
		endDate = '';
		currentPage = 1;
	}

	let filteredMeetings = $derived(
		data.meetings
			.filter((m) => {
				const matchKelas = !selectedKelas || selectedKelas === 'all' || m.kelasInstanceId.toString() === String(selectedKelas);
				const matchActivity = !selectedActivity || selectedActivity === 'all' || m.activityType === String(selectedActivity);
				const matchSearch = searchQuery === '' || m.title.toLowerCase().includes(searchQuery.toLowerCase());

				let matchTime = true;
				if (selectedTimeFilter === 'upcoming') {
					matchTime = m.sessionDate >= todayStr;
				} else if (selectedTimeFilter === 'today') {
					matchTime = m.sessionDate === todayStr;
				} else if (selectedTimeFilter === 'this_week') {
					matchTime = isThisWeek(m.sessionDate);
				} else if (selectedTimeFilter === 'this_month') {
					matchTime = isThisMonth(m.sessionDate);
				} else if (selectedTimeFilter === 'past') {
					matchTime = m.sessionDate < todayStr;
				} else if (selectedTimeFilter === 'weekend') {
					matchTime = m.isWeekend;
				}

				let matchRange = true;
				if (startDate) {
					matchRange = matchRange && m.sessionDate >= startDate;
				}
				if (endDate) {
					matchRange = matchRange && m.sessionDate <= endDate;
				}

				return matchKelas && matchActivity && matchSearch && matchTime && matchRange;
			})
			.sort((a, b) => {
				if (sortBy === 'date_asc') {
					return a.sessionDate.localeCompare(b.sessionDate);
				} else if (sortBy === 'title_asc') {
					return a.title.localeCompare(b.title);
				} else if (sortBy === 'title_desc') {
					return b.title.localeCompare(a.title);
				} else if (sortBy === 'kelas_asc') {
					return (a.kelasName ?? '').localeCompare(b.kelasName ?? '');
				}
				return b.sessionDate.localeCompare(a.sessionDate);
			})
	);

	// Pagination State
	let currentPage = $state(1);
	let itemsPerPage = $state<number>(10); // Selectable page size: 5, 10, 25, 50

	let pageSizeOptions = [
		{ value: 5, label: '5 Data' },
		{ value: 10, label: '10 Data' },
		{ value: 25, label: '25 Data' },
		{ value: 50, label: '50 Data' }
	];

	let totalPages = $derived(Math.ceil(filteredMeetings.length / itemsPerPage) || 1);

	let paginatedMeetings = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredMeetings.slice(start, start + itemsPerPage);
	});

	$effect(() => {
		selectedKelas;
		selectedActivity;
		selectedTimeFilter;
		sortBy;
		searchQuery;
		startDate;
		endDate;
		itemsPerPage;
		untrack(() => {
			currentPage = 1;
		});
	});

	function getActivityBadgeStyle(type: string): { bg: string; text: string; border: string; label: string } {
		switch (type) {
			case 'teori':
				return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'TEORI' };
			case 'praktik':
				return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'PRAKTIK' };
			case 'teori_praktik':
				return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'TEORI & PRAKTIK' };
			case 'games':
				return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'GAMES' };
			case 'quiz':
				return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'QUIZ' };
			default:
				return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'SANTAI' };
		}
	}
</script>

<svelte:head>
	<title>Manajemen Pertemuan — Portal Mentor NLC</title>
</svelte:head>

<div class="page-container">
	<PageHeaderCard
		title="Manajemen Pertemuan"
		subtitle="Jadwalkan sesi kelas, distribusikan slide materi PPT, dan kelola presensi QR siswa secara real-time."
		breadcrumbs={[
			{ label: 'Dashboard', href: '/mentor' },
			{ label: 'Pertemuan & Sesi QR' }
		]}
	>
		{#snippet badges()}
			<span class="badge badge-neutral">{totalCount} SESI TOTAL</span>
		{/snippet}

		{#snippet actions()}
			<button type="button" onclick={openCreateForm} class="btn-create-pill border-none cursor-pointer" aria-label="Buat sesi pertemuan baru">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Buat Sesi Pertemuan</span>
			</button>
		{/snippet}
	</PageHeaderCard>

	<!-- Overview Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Total Pertemuan</div>
				<div class="stat-value">{totalCount}</div>
				<div class="stat-meta">Sesi Komunitas</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #ccfbf1; color: #0d9488;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Sesi Teori</div>
				<div class="stat-value" style="color: #0d9488;">{teoriCount}</div>
				<div class="stat-meta">Pendalaman Konsep</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #ecfdf5; color: #059669;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Praktik &amp; Games</div>
				<div class="stat-value" style="color: #059669;">{praktikCount}</div>
				<div class="stat-meta">Hands-on Lab</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fffbeb; color: #d97706;">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			</div>
			<div>
				<div class="stat-label">Sesi Weekend</div>
				<div class="stat-value" style="color: #d97706;">{weekendCount}</div>
				<div class="stat-meta">+50% Bonus Poin</div>
			</div>
		</div>
	</div>

	<!-- Filter Card 2-Row Layout Standard -->
	<div class="page-filter-card mb-8">
		<!-- Row 1: Search Bar & Conditional Reset -->
		<div class="filter-row-top">
			<div class="flex-1">
				<TextInput
					id="search-pertemuan-input"
					label="Cari Sesi Pertemuan"
					placeholder="Ketik kata kunci judul atau topik pertemuan..."
					bind:value={searchQuery}
				/>
			</div>

			{#if isFilterActive}
				<div class="flex-shrink-0">
					<button
						type="button"
						class="btn-reset-filters-active"
						onclick={resetFilters}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						<span>Reset Filter</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Row 2: Select Controls Grid -->
		<div class="filter-row-bottom">
			<div>
				<CustomSelect
					id="kelas-select-filter"
					label="Filter Kelas"
					bind:value={selectedKelas}
					options={[
						{ value: 'all', label: 'Semua Kelas Instance' },
						...data.kelases.map((k) => ({ value: k.id.toString(), label: k.name }))
					]}
					searchable={false}
				/>
			</div>

			<div>
				<CustomSelect
					id="activity-select-filter"
					label="Tipe Aktivitas"
					bind:value={selectedActivity}
					options={[
						{ value: 'all', label: 'Semua Tipe Aktivitas' },
						{ value: 'teori', label: 'Teori' },
						{ value: 'praktik', label: 'Praktik' },
						{ value: 'teori_praktik', label: 'Teori & Praktik' },
						{ value: 'games', label: 'Games' },
						{ value: 'quiz', label: 'Quiz' },
						{ value: 'santai', label: 'Santai' }
					]}
					searchable={false}
				/>
			</div>

			<div>
				<CustomSelect
					id="time-select-filter"
					label="Periode Waktu"
					bind:value={selectedTimeFilter}
					options={[
						{ value: 'all', label: 'Semua Periode' },
						{ value: 'upcoming', label: 'Mendatang (>= Hari Ini)' },
						{ value: 'today', label: 'Hari Ini' },
						{ value: 'this_week', label: 'Minggu Ini' },
						{ value: 'this_month', label: 'Bulan Ini' },
						{ value: 'past', label: 'Terlewat / Lampau' },
						{ value: 'weekend', label: 'Khusus Weekend' }
					]}
					searchable={false}
				/>
			</div>

			<div>
				<CustomSelect
					id="sort-select-filter"
					label="Urutkan Sesi"
					bind:value={sortBy}
					options={[
						{ value: 'date_desc', label: 'Urutkan: Tanggal (Terbaru)' },
						{ value: 'date_asc', label: 'Urutkan: Tanggal (Terlama)' },
						{ value: 'title_asc', label: 'Urutkan: Judul (A - Z)' },
						{ value: 'title_desc', label: 'Urutkan: Judul (Z - A)' },
						{ value: 'kelas_asc', label: 'Urutkan: Kelas (A - Z)' }
					]}
					searchable={false}
				/>
			</div>
		</div>
	</div>

	<!-- Meetings High-Density Data Table -->
	{#if filteredMeetings.length === 0}
		<div class="empty-card">
			<div class="empty-icon">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<h3 class="empty-title">Belum ada sesi pertemuan ditemukan</h3>
			<p class="empty-sub">Coba sesuaikan kata kunci pencarian, rentang tanggal, atau kriteria filter di atas.</p>
			<button type="button" onclick={openCreateForm} class="btn-create" style="margin-top: 16px;">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Buat Pertemuan Baru</span>
			</button>
		</div>
	{:else}
		<div class="table-panel">
			<table class="data-table">
				<thead>
					<tr>
						<th style="width: 48px;">#</th>
						<th>Judul Pertemuan &amp; Sub-Fase</th>
						<th>Kelas</th>
						<th>Tanggal &amp; Waktu</th>
						<th>Tipe Aktivitas</th>
						<th>Slide Materi</th>
						<th>Kehadiran</th>
						<th style="text-align: right;">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedMeetings as m, idx (m.id)}
						{@const badge = getActivityBadgeStyle(m.activityType)}
						{@const status = getMeetingStatus(m)}
						<tr>
							<td class="font-mono text-xs text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
							<td>
								<div class="flex flex-col gap-0.5">
									<a href={`/mentor/pertemuan/${m.id}`} class="font-bold text-slate-900 hover:text-indigo-600">
										{m.title}
									</a>
									<span class="text-xs text-slate-500">{m.subPhaseTitle}</span>
								</div>
							</td>
							<td>
								<span class="kelas-tag">{m.kelasName}</span>
							</td>
							<td>
								<div class="flex flex-col gap-1 text-xs">
									<div>
										{#if status === 'live'}
											<span class="status-pill-live">LIVE HARI INI</span>
										{:else if status === 'upcoming'}
											<span class="status-pill-upcoming">AKAN DATANG</span>
										{:else}
											<span class="status-pill-completed">SELESAI</span>
										{/if}
									</div>
									<div class="flex items-center gap-1.5 font-semibold text-slate-800">
										<span>{formatIndoDate(m.sessionDate)}</span>
										{#if m.isWeekend}
											<span class="weekend-tag">WEEKEND</span>
										{/if}
									</div>
									<span class="text-slate-500 font-mono">{formatTimeOnly(m.startTime)} - {formatTimeOnly(m.endTime)} WIB</span>
								</div>
							</td>
							<td>
								<span class="activity-badge {badge.bg} {badge.text} {badge.border}">
									{badge.label}
								</span>
							</td>
							<td>
								{#if m.materialUrl}
									<a href={m.materialUrl} target="_blank" rel="noopener noreferrer" class="material-link text-xs">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
										</svg>
										PPT Slide
									</a>
								{:else}
									<span class="no-material text-xs">Belum ada</span>
								{/if}
							</td>
							<td>
								{#if (m.totalHadir ?? 0) > 0}
									<span class="badge badge-hadir">{m.totalHadir} Hadir</span>
								{:else}
									<span class="badge badge-absen">0 Hadir</span>
								{/if}
							</td>
							<td style="text-align: right;">
								<div class="flex items-center justify-end gap-2">
									<a href={`/mentor/presensi?pertemuanId=${m.id}`} class="btn-presensi" title="Buka Presensi Sesi">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<rect x="3" y="3" width="7" height="7" />
											<rect x="14" y="3" width="7" height="7" />
											<rect x="14" y="14" width="7" height="7" />
											<rect x="3" y="14" width="7" height="7" />
										</svg>
										<span>Presensi</span>
									</a>

									<button type="button" onclick={() => openEditForm(m)} class="btn-ghost-sm" title="Edit Pertemuan">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
										</svg>
										<span>Edit</span>
									</button>

									<button type="button" onclick={() => promptDelete(m)} class="btn-danger-ghost-sm" title="Hapus Pertemuan">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6" />
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
										</svg>
										<span>Hapus</span>
									</button>

									<a href={`/mentor/pertemuan/${m.id}`} class="btn-detail" title="Detail Pertemuan">
										<span>Detail</span>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="9 18 15 12 9 6" />
										</svg>
									</a>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Control Bar -->
		{#if filteredMeetings.length > 0}
			<div class="pagination-bar" style="margin-top: 16px;">
				<div class="flex items-center gap-4 flex-wrap">
					<div class="pagination-info">
						Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMeetings.length)}</strong> dari <strong>{filteredMeetings.length}</strong> Pertemuan
					</div>

					<div class="page-size-selector w-32">
						<CustomSelect
							id="page-size-select-pertemuan"
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

<!-- ══════════════════════════════════════════════════════════
     SLIDER DRAWER FOR CREATE & EDIT PERTEMUAN (CUSTOM UI COMPONENTS)
     ══════════════════════════════════════════════════════════ -->
{#if showFormDrawer}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="form-scrim"
		onclick={(e) => e.target === e.currentTarget && closeFormDrawer()}
		role="dialog"
		aria-modal="true"
		aria-label={editingMeeting ? 'Edit Sesi Pertemuan' : 'Buat Sesi Pertemuan'}
	>
		<aside class="form-drawer">
			<!-- Mobile drag handle -->
			<div class="mobile-drag-handle hide-desktop" aria-hidden="true"></div>

			<!-- Drawer Header -->
			<div class="form-drawer__header">
				<div>
					<span class="badge {editingMeeting ? 'badge-hadir' : 'badge-live'} mb-1">
						{editingMeeting ? 'EDIT PERTEMUAN' : 'PERTEMUAN BARU'}
					</span>
					<h2 class="form-drawer__title">
						{editingMeeting ? 'Edit Sesi Pertemuan' : 'Buat Sesi Pertemuan Baru'}
					</h2>
					<p class="form-drawer__sub">
						{editingMeeting ? 'Perbarui jadwal, kelas, lokasi, atau slide materi.' : 'Jadwalkan sesi kelas dan distribusikan slide materi.'}
					</p>
				</div>
				<button type="button" onclick={closeFormDrawer} class="form-drawer__close" aria-label="Tutup panel">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<!-- Form -->
			<form
				method="POST"
				action={editingMeeting ? '?/update' : '?/create'}
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isFormSubmitted = true;
							toast.success(editingMeeting ? 'Pertemuan berhasil diperbarui!' : 'Pertemuan baru berhasil dibuat!');
							closeFormDrawer();
						} else if (result.type === 'failure') {
							toast.error((result.data as any)?.message || 'Gagal menyimpan pertemuan');
						}
					};
				}}
				class="form-drawer__form"
			>
				{#if editingMeeting}
					<input type="hidden" name="id" value={editingMeeting.id} />
				{/if}

				<div class="form-drawer__body">
					<!-- Section 1: Informasi Sesi & Kelompok -->
					<div class="drawer-section">
						<h4 class="section-title">1. Informasi Kelompok & Sesi</h4>

						<!-- Row 1: Pilih Kelompok (Dedicated Row) -->
						<div class="mb-4">
							<CustomSelect
								name="kelasInstanceId"
								label="Pilih Kelompok Kelas *"
								required
								bind:value={formKelasInstanceId}
								options={formKelasOptions}
								placeholder="-- Pilih Kelompok Kelas --"
							/>
						</div>

						<!-- Row 2: Track Pembelajaran & Sub-Fase Track -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<CustomSelect
								name="trackId"
								label="Track Pembelajaran *"
								bind:value={formTrackId}
								options={formTrackOptions}
								placeholder="-- Pilih Track Pembelajaran --"
							/>

							<CustomSelect
								name="subPhaseId"
								label="Sub-Fase Track Pembelajaran *"
								required
								bind:value={formSubPhaseId}
								options={formSubPhaseOptions}
								placeholder="-- Pilih Sub-Fase --"
							/>
						</div>

						<div class="mt-4">
							<CustomSelect
								id="form-materi-select"
								label="Pilih Materi Kurikulum (Sub-Fase)"
								bind:value={formMateriId}
								options={filteredMateriOptions}
								placeholder="-- Pilih Materi Kurikulum --"
								searchable={false}
							/>
						</div>

						<div class="mt-4">
							<TextInput
								name="title"
								label="Judul Pertemuan"
								required
								bind:value={formTitle}
								placeholder="Contoh: Sesi 1 — Pengenalan HTML & CSS"
								clearable
							/>
						</div>

						<div class="mt-4">
							<CustomSelect
								name="activityType"
								label="Tipe Aktivitas"
								required
								bind:value={formActivityType}
								options={data.activityTypesOptions && data.activityTypesOptions.length > 0
									? data.activityTypesOptions
									: [
											{ value: 'teori', label: 'Teori (Pendalaman Konsep)' },
											{ value: 'praktik', label: 'Praktik (Hands-on Lab)' },
											{ value: 'teori_praktik', label: 'Teori & Praktik' },
											{ value: 'games', label: 'Games / Challenge' },
											{ value: 'quiz', label: 'Quiz / Evaluasi' },
											{ value: 'santai', label: 'Santai / Networking' }
										]}
								placeholder="-- Pilih Tipe Aktivitas --"
							/>
						</div>
					</div>

					<!-- Section 2: Jadwal Execution & Waktu -->
					<div class="drawer-section">
						<h4 class="section-title">2. Jadwal & Waktu Execution</h4>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<DatePicker
								name="sessionDate"
								label="Tanggal Sesi"
								required
								bind:value={formSessionDate}
								placeholder="Pilih tanggal..."
							/>

							<TextInput
								name="startTime"
								type="time"
								label="Jam Mulai"
								required
								bind:value={formStartTime}
							/>

							<TextInput
								name="endTime"
								type="time"
								label="Jam Selesai"
								required
								bind:value={formEndTime}
							/>
						</div>

						<div class="mt-4">
							<CustomSelect
								name="location"
								label="Lokasi / Ruangan Master Data"
								bind:value={formLocation}
								options={data.roomsOptions && data.roomsOptions.length > 0
									? data.roomsOptions
									: [
											{ value: 'Lab Komputer 1', label: 'Lab Komputer 1' },
											{ value: 'Lab Komputer 2', label: 'Lab Komputer 2' },
											{ value: 'Ruang Teori A', label: 'Ruang Teori A' },
											{ value: 'Ruang Teori B', label: 'Ruang Teori B' },
											{ value: 'Online / Google Meet', label: 'Online / Google Meet' }
										]}
								placeholder="-- Pilih Ruangan / Lokasi --"
								searchable={false}
							/>
						</div>

						<div class="mt-4">
							<ToggleSwitch
								name="isWeekend"
								label="Pertemuan Akhir Pekan (Weekend)"
								description="Siswa mendapatkan +50% bonus poin keaktifan sesi."
								bind:checked={formIsWeekend}
								onLabel="Weekend (+50%)"
								offLabel="Reguler"
							/>
						</div>
					</div>

					<!-- Section 3: PPT & Slide Materi -->
					<div class="drawer-section">
						<h4 class="section-title">3. Slide PPT & Material Sesi</h4>

						<div
							class="upload-drop-zone {isDragging ? 'is-dragging' : ''} {formMaterialUrl ? 'has-file' : ''}"
							ondragover={(e) => { e.preventDefault(); isDragging = true; }}
							ondragleave={() => (isDragging = false)}
							ondrop={handleFileDrop}
							role="region"
							aria-label="Area unggah file slide"
						>
							<input
								id="drawer-file"
								type="file"
								onchange={handleFileUpload}
								disabled={isUploading}
								class="file-input-hidden"
								accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar,.png,.jpg,.jpeg"
							/>
							<label for="drawer-file" class="drop-zone-content">
								{#if isUploading}
									<div class="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-xs py-1">
										<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" />
										</svg>
										<span>Mengunggah file ke server...</span>
									</div>
								{:else if formMaterialUrl}
									<div class="uploaded-file-box">
										<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
											<path d="M9 15l2 2 4-4" />
										</svg>
										<div class="file-details">
											<span class="file-status">File Berhasil Terlampir</span>
											<span class="file-url-preview">{uploadedFileName || getFileNameFromUrl(formMaterialUrl)}</span>
										</div>
										<button
											type="button"
											onclick={(e) => { e.preventDefault(); e.stopPropagation(); removeAttachedFile(); }}
											class="remove-file-btn"
											title="Hapus / Ganti File"
										>
											&times;
										</button>
									</div>
								{:else}
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="17 8 12 3 7 8" />
										<line x1="12" y1="3" x2="12" y2="15" />
									</svg>
									<span><strong>Klik di sini</strong> atau drag &amp; drop file PPT / PDF Materi ke kotak ini</span>
								{/if}
							</label>
						</div>

						{#if uploadError}
							<p class="text-xs text-red mt-1.5 font-medium">{uploadError}</p>
						{/if}

						<input type="hidden" name="materialUrl" value={formMaterialUrl} />

						{#if !formMaterialUrl.startsWith('/uploads/')}
							<div class="mt-4">
								<TextInput
									label="Atau Direct Link PPT / Google Slides"
									bind:value={formMaterialUrl}
									placeholder="https://drive.google.com/... atau https://..."
									clearable
								/>
							</div>
						{/if}
					</div>

					<!-- Section 4: Task Nempel -->
					<div class="drawer-section">
						<div class="flex items-center justify-between mb-2">
							<h4 class="section-title mb-0">4. Penugasan Task (Opsional)</h4>
							<ToggleSwitch
								name="hasTask"
								bind:checked={formHasTask}
								onLabel="Aktif"
								offLabel="Nonaktif"
							/>
						</div>

						{#if formHasTask}
							<div class="task-form-panel mt-4 space-y-4">
								<TextInput
									name="taskTitle"
									label="Judul Task"
									required
									bind:value={formTaskTitle}
									placeholder="Contoh: Latihan Layout Responsive Tailwind"
									clearable
								/>

								<CustomSelect
									name="taskSize"
									label="Skala Poin Task"
									bind:value={formTaskSize}
									options={[
										{ value: 'kecil', label: 'Kecil (+ Poin Standar)' },
										{ value: 'sedang', label: 'Sedang (+ Poin Sedang)' },
										{ value: 'besar', label: 'Besar (+ Poin Maksimal)' }
									]}
								/>

								<TextArea
									name="taskDescription"
									label="Instruksi Pengerjaan"
									bind:value={formTaskDescription}
									rows={3}
									placeholder="Tuliskan instruksi pengerjaan untuk siswa..."
								/>
							</div>
						{/if}
					</div>
				</div>

				<div class="form-drawer__footer">
					{#if editingMeeting}
						<button
							type="button"
							onclick={() => promptDelete(editingMeeting!)}
							class="btn-ghost-sm text-red hover:bg-red-50"
							title="Hapus Sesi Pertemuan"
						>
							Hapus
						</button>
					{/if}
					<button type="button" onclick={closeFormDrawer} class="btn-ghost" style="flex: 1;">
						Batal
					</button>
					<button type="submit" class="btn-create" style="flex: 2; justify-content: center;">
						{editingMeeting ? 'Simpan Perubahan' : 'Simpan Pertemuan'}
					</button>
				</div>
			</form>
		</aside>
	</div>
{/if}

<!-- Confirm Delete Modal -->
<ConfirmModal
	bind:open={showDeleteModal}
	title="Hapus Sesi Pertemuan"
	message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.title || 'sesi ini'}"? Data yang dihapus tidak dapat dikembalikan.`}
	confirmText="Hapus Sesi"
	cancelText="Batal"
	variant="danger"
	loading={isDeleting}
	onconfirm={async () => {
		if (!deleteTarget) return;
		isDeleting = true;
		const formData = new FormData();
		formData.append('id', String(deleteTarget.id));
		try {
			const res = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				toast.success('Sesi pertemuan berhasil dihapus!');
				closeFormDrawer();
				window.location.reload();
			} else {
				toast.error('Gagal menghapus sesi pertemuan');
			}
		} catch (e) {
			toast.error('Terjadi kesalahan saat menghapus sesi');
		} finally {
			isDeleting = false;
			showDeleteModal = false;
		}
	}}
/>

<style>


	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 24px !important;
		max-width: 100%;
		word-break: break-word;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 26px;
	}

	.header-badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.header-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 14px;
		background: #eef2ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}

	.btn-create-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 18px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 13.5px;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-create-pill:hover {
		transform: translateY(-1px);
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
	}

	.btn-create-pill:active {
		transform: scale(0.98);
	}

	.header-main-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	@media (max-width: 640px) {
		.header-card {
			padding: 12px 14px;
			gap: 8px;
		}
		.header-main-content {
			gap: 3px;
		}
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
	}

	.bc-link {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: var(--text-muted, #64748b);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.bc-link:hover {
		color: var(--primary, #4f46e5);
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
	}

	.page-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.3rem, 2.5vw, 1.65rem);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.page-sub {
		font-size: 13.5px;
		color: var(--text-secondary, #64748b);
		max-width: 680px;
		line-height: 1.45;
		margin: 0;
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
	}

	.btn-create:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 24px -4px rgba(79, 70, 229, 0.45);
	}

	.btn-ghost-sm {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 4px 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-ghost-sm:hover {
		background: var(--primary-light);
		color: var(--primary);
		border-color: var(--primary-border);
	}

	.btn-danger-ghost-sm {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		border: 1px solid #fecaca;
		border-radius: var(--radius-md, 8px);
		font-size: 11px;
		font-weight: 600;
		color: #dc2626;
		padding: 4px 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-danger-ghost-sm:hover {
		background: #fef2f2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-top: 0 !important;
		margin-bottom: 24px !important;
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: var(--shadow-sm);
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 2px;
	}

	.stat-value {
		font-family: var(--font-macro);
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.stat-meta {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-muted);
		margin-top: 4px;
	}

	/* Filter Panel */
	.filter-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 14px 16px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 12px;
		align-items: center;
	}

	.filter-search-col {
		grid-column: 1 / -1;
	}

	@media (max-width: 1024px) {
		.filter-grid {
			grid-template-columns: repeat(3, 1fr);
		}
		.filter-search-col {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 640px) {
		.filter-grid {
			grid-template-columns: 1fr;
		}
		.filter-search-col {
			grid-column: 1 / -1;
		}
	}

	/* High-Density Data Table Styles */
	.table-panel {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.data-table th {
		background: var(--bg-inset);
		padding: 14px 18px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-hard);
		white-space: nowrap;
	}

	.data-table td {
		padding: 14px 18px;
		border-bottom: 1px solid var(--border-soft);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table tr:hover td {
		background: var(--bg-inset);
	}

	@media (max-width: 768px) {
		.filter-grid {
			grid-template-columns: 1fr;
		}
	}

	.search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: var(--text-ghost);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 9px 34px;
		background: var(--bg-panel);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	.search-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.search-clear-btn {
		position: absolute;
		right: 10px;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 12px;
		cursor: pointer;
		padding: 4px;
	}

	.filter-select {
		width: 100%;
		padding: 9px 12px;
		background: var(--bg-panel);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		outline: none;
		cursor: pointer;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	.filter-select:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	/* Meetings Grid */
	.meetings-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	@media (max-width: 1024px) {
		.meetings-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.meetings-grid {
			grid-template-columns: 1fr;
		}
	}

	.meeting-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
	}

	.meeting-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--primary-border);
	}

	.meeting-card__body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.activity-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 3px 10px;
		border-radius: var(--radius-full);
		border: 1px solid;
	}

	.tag-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.weekend-tag {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		color: #b45309;
		background: #fffbeb;
		border: 1px solid #fde68a;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.kelas-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-cell);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.card-title-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.meeting-title {
		font-family: var(--font-macro);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.35;
	}

	.meeting-title a {
		color: inherit;
		text-decoration: none;
		transition: color 150ms ease;
	}

	.meeting-card:hover .meeting-title a {
		color: var(--primary);
	}

	.subphase-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.subphase-label {
		color: var(--text-ghost);
		font-size: 11px;
	}

	.subphase-text {
		font-weight: 600;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-info-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 12px;
		border-top: 1px solid var(--border-soft);
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary);
	}

	.info-item svg {
		color: var(--text-ghost);
		flex-shrink: 0;
	}

	.info-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.info-dot {
		color: var(--text-ghost);
	}

	.status-pill-live {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
	}

	.status-pill-upcoming {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: #e0e7ff;
		color: #3730a3;
		border: 1px solid #a5b4fc;
	}

	.status-pill-completed {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
	}

	.info-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Card Footer */
	.meeting-card__footer {
		background: var(--bg-inset);
		padding: 12px 20px;
		border-top: 1px solid var(--border-hard);
		border-bottom-left-radius: var(--radius-lg);
		border-bottom-right-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
	}

	.material-link {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #0d9488;
		font-weight: 700;
		text-decoration: none;
		transition: color 150ms ease;
	}

	.material-link:hover {
		color: #0f766e;
	}

	.no-material {
		color: var(--text-ghost);
		font-style: italic;
	}

	.btn-detail {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		padding: 6px 12px;
		border-radius: var(--radius-md);
		font-weight: 700;
		color: var(--text-primary);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-detail:hover {
		background: var(--primary-light);
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.btn-presensi {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--primary);
		color: white;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
	}

	.btn-presensi:hover {
		background: #4338ca;
		color: white;
		transform: translateY(-1px);
	}

	/* Empty State */
	.empty-card {
		background: #ffffff;
		border: 2px dashed var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 48px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary-light);
		color: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 400px;
	}

	/* Slider Form Drawer Styles (Spacious & Clean) */
	.form-scrim {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
		animation: fadeIn 180ms ease-out;
	}

	.form-drawer {
		width: 100%;
		max-width: 640px;
		height: 100vh;
		background: #f8fafc;
		box-shadow: -8px 0 36px rgba(15, 23, 42, 0.18);
		display: flex;
		flex-direction: column;
		animation: slideInRight 220ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}

	@media (max-width: 640px) {
		.form-drawer {
			max-width: 100%;
			height: 92vh;
			margin-top: auto;
			border-top-left-radius: var(--radius-lg);
			border-top-right-radius: var(--radius-lg);
			animation: slideInUp 220ms cubic-bezier(0.16, 1, 0.3, 1);
		}
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideInRight {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	@keyframes slideInUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.form-drawer__header {
		padding: 24px 28px 20px;
		background: #ffffff;
		border-bottom: 1px solid var(--border-hard);
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.form-drawer__title {
		font-family: var(--font-macro);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.form-drawer__sub {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.form-drawer__close {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: 50%;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.form-drawer__close:hover {
		background: var(--red-dim);
		color: var(--red);
		border-color: var(--red-border);
	}

	.form-drawer__form {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.form-drawer__body {
		flex: 1;
		padding: 24px 28px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.drawer-section {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px;
		box-shadow: var(--shadow-sm);
	}

	.section-title {
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--primary);
		margin-bottom: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.checkbox-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 12px 14px;
	}

	.checkbox-card-label {
		cursor: pointer;
		font-size: 13px;
		line-height: 1.4;
	}

	.upload-drop-zone {
		border: 2px dashed var(--primary-border);
		border-radius: var(--radius-md);
		background: var(--primary-light);
		transition: all 180ms ease;
		cursor: pointer;
	}

	.upload-drop-zone:hover,
	.upload-drop-zone.is-dragging {
		border-color: var(--primary);
		background: #e0e7ff;
	}

	.upload-drop-zone.has-file {
		border-style: solid;
		border-color: #10b981;
		background: #ecfdf5;
	}

	.file-input-hidden {
		display: none;
	}

	.drop-zone-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px;
		cursor: pointer;
		color: var(--primary);
		font-size: 13px;
		font-weight: 600;
	}

	.uploaded-file-box {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		text-align: left;
	}

	.file-details {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.file-status {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		color: #047857;
	}

	.file-url-preview {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #065f46;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-file-btn {
		background: #ffffff;
		border: 1px solid #a7f3d0;
		color: #047857;
		font-size: 16px;
		font-weight: 700;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.remove-file-btn:hover {
		background: #fee2e2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	.task-form-panel {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 16px;
	}

	.form-drawer__footer {
		padding: 20px 28px;
		background: #ffffff;
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		gap: 14px;
	}

	/* Pagination Bar */
	.pagination-bar {
		padding: 12px 20px;
		background: #ffffff;
		border: 1px solid var(--border-subtle, #e2e8f0);
		border-radius: var(--radius-lg, 12px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
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
		font-family: var(--font-macro, sans-serif);
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

	.btn-pagination-num.active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
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

	.btn-reset-filters-active {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-reset-filters-active:hover {
		background: #fca5a5;
		color: #991b1b;
	}

	.btn-pagination-num--active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
	}
</style>

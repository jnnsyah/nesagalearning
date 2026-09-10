<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { enhance, deserialize } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/stores/toast';
	import {
		sanitizeFilename,
		isAllowedAttachmentExtension,
		sanitizeUrl,
		formatFileSize
	} from '$lib/utils/sanitizer';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(data.materi?.title || '');
	let content = $state(data.materi?.content || '');
	type AttachmentItem = { name: string; url: string; size: number };
	let globalAttachments = $state<AttachmentItem[]>(data.materi?.attachments || []);
	
	type VideoRecommendation = {
		id: string;
		title: string;
		url: string;
		youtubeId: string;
		duration?: string;
	};
	let videoRecommendations = $state<VideoRecommendation[]>(data.materi?.videoRecommendations || []);
	let originalVideosJson = $state(JSON.stringify(data.materi?.videoRecommendations || []));

	let newYtUrl = $state('');
	let isFetchingYt = $state(false);
	let ytError = $state('');
	let videoToDeleteIndex = $state<number | null>(null);
	let showConfirmDeleteVideo = $state(false);

	let isSaving = $state(false);
	let isUploadingGlobal = $state(false);
	let isDraggingGlobal = $state(false);
	let globalUploadError = $state('');

	let originalTitle = $state(data.materi?.title || '');
	let originalContent = $state(data.materi?.content || '');
	let originalAttachmentsJson = $state(JSON.stringify(data.materi?.attachments || []));
	let isInitialized = $state(false);

	// Sync originalContent once Tiptap formats initial HTML on mount
	$effect(() => {
		if (!isInitialized && content) {
			untrack(() => {
				originalContent = content;
				isInitialized = true;
			});
		}
	});

	// Auto-activate Clear View / Focus Mode (hides topbar & sidebar)
	$effect(() => {
		if (browser) {
			document.body.classList.add('focus-mode-active');
			return () => {
				document.body.classList.remove('focus-mode-active');
			};
		}
	});

	let isDirty = $derived(
		title !== originalTitle ||
			content !== originalContent ||
			JSON.stringify(globalAttachments) !== originalAttachmentsJson ||
			JSON.stringify(videoRecommendations) !== originalVideosJson
	);

	// Autosave reactive state
	let saveStatus = $state<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
	let lastSavedAt = $state<Date | null>(null);

	// Confirmation modal state for leaving page with unsaved changes
	let showLeaveModal = $state(false);
	let pendingNavigateUrl = $state<string | null>(null);
	let allowNavigation = $state(false);
	let isModalSaving = $state(false);

	let activeTab = $state<'edit' | 'preview' | 'split'>('edit');

	// Telemetry calculations
	let plainText = $derived(content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
	let wordCount = $derived(plainText ? plainText.split(' ').length : 0);
	let readingTimeMin = $derived(Math.max(1, Math.ceil(wordCount / 200)));

	let subPhaseTitle = $derived(data.materi?.subPhase?.title || '');
	let phaseTitle = $derived(data.materi?.subPhase?.phase?.title || '');
	let trackTitle = $derived(data.materi?.subPhase?.phase?.curriculumTrack?.title || '');

	// Debounced autosave implementation
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	const DEBOUNCE_MS = 2000;

	function getFileExt(filename: string): string {
		const parts = filename.split('.');
		return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
	}

	function getFileBadgeClass(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		if (['pdf'].includes(ext)) return 'bg-rose-50 text-rose-700 border-rose-200';
		if (['pkt', 'gns3', 'pcap', 'pcapng', 'json', 'yaml', 'yml', 'conf', 'cfg', 'log'].includes(ext))
			return 'bg-cyan-50 text-cyan-700 border-cyan-200';
		if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'bg-amber-50 text-amber-700 border-amber-200';
		if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext))
			return 'bg-emerald-50 text-emerald-700 border-emerald-200';
		return 'bg-indigo-50 text-indigo-700 border-indigo-200';
	}

	async function processFile(file: File) {
		globalUploadError = '';
		if (!isAllowedAttachmentExtension(file.name)) {
			globalUploadError = 'Ekstensi file tidak diizinkan demi alasan keamanan.';
			return;
		}

		if (file.size > 20 * 1024 * 1024) {
			globalUploadError = 'Ukuran file lampiran tidak boleh melebihi 20MB.';
			return;
		}

		isUploadingGlobal = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('folder', 'materials');

			const res = await fetch('/api/storage/upload', {
				method: 'POST',
				body: formData
			});

			const resData = await res.json();
			if (!res.ok || resData.error) {
				globalUploadError = resData.error || 'Gagal mengunggah file lampiran.';
				isUploadingGlobal = false;
				return;
			}

			const newAtt: AttachmentItem = {
				name: sanitizeFilename(file.name),
				url: sanitizeUrl(resData.url),
				size: file.size
			};

			globalAttachments = [...globalAttachments, newAtt];
			isUploadingGlobal = false;
			toast.success('Lampiran berkas berhasil ditambahkan!');
		} catch (err: any) {
			console.error('Global attachment upload error:', err);
			globalUploadError = 'Gagal mengunggah file lampiran.';
			isUploadingGlobal = false;
		}
	}

	function handleGlobalAttachmentUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) processFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingGlobal = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingGlobal = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingGlobal = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) processFile(file);
	}

	function removeGlobalAttachment(index: number) {
		globalAttachments = globalAttachments.filter((_, i) => i !== index);
		toast.success('Lampiran dihapus');
	}

	let editingAttachmentIndex = $state<number | null>(null);
	let editingAttachmentName = $state('');

	function startRenameAttachment(index: number) {
		editingAttachmentIndex = index;
		editingAttachmentName = globalAttachments[index]?.name || '';
	}

	function saveRenameAttachment(index: number) {
		const trimmed = editingAttachmentName.trim();
		if (trimmed && globalAttachments[index]) {
			globalAttachments[index] = {
				...globalAttachments[index],
				name: trimmed
			};
			toast.success('Nama berkas berhasil diperbarui!');
		}
		editingAttachmentIndex = null;
	}

	function cancelRenameAttachment() {
		editingAttachmentIndex = null;
		editingAttachmentName = '';
	}

	async function addVideoRecommendation() {
		ytError = '';
		if (!newYtUrl.trim()) {
			ytError = 'Link YouTube tidak boleh kosong.';
			return;
		}

		isFetchingYt = true;
		try {
			const res = await fetch(`/api/youtube/info?url=${encodeURIComponent(newYtUrl.trim())}`);
			const resData = await res.json();

			if (!res.ok || resData.error) {
				ytError = resData.error || 'Gagal mengambil informasi video dari YouTube.';
				isFetchingYt = false;
				return;
			}

			// Check for duplicate
			const existingIndex = videoRecommendations.findIndex((v) => v.youtubeId === resData.youtubeId);
			if (existingIndex !== -1) {
				ytError = 'Video YouTube ini sudah ada dalam daftar rekomendasi materi.';
				isFetchingYt = false;
				return;
			}

			const newVideoItem: VideoRecommendation = {
				id: crypto.randomUUID(),
				title: resData.title,
				url: resData.url,
				youtubeId: resData.youtubeId,
				duration: resData.duration || ''
			};

			videoRecommendations = [...videoRecommendations, newVideoItem];
			newYtUrl = '';
			isFetchingYt = false;
			toast.success('Rekomendasi video YouTube berhasil ditambahkan!');
		} catch (err: any) {
			ytError = 'Gagal terhubung ke layanan YouTube. Periksa koneksi internet Anda.';
			isFetchingYt = false;
		}
	}

	async function pasteYtUrlFromClipboard() {
		ytError = '';
		try {
			if (navigator.clipboard && navigator.clipboard.readText) {
				const text = await navigator.clipboard.readText();
				if (text && text.trim()) {
					newYtUrl = text.trim();
					toast.success('Link dari clipboard berhasil ditempel!');
				} else {
					ytError = 'Clipboard kosong atau tidak berisi teks link.';
				}
			} else {
				const inputEl = document.getElementById('yt-url-input') as HTMLInputElement;
				if (inputEl) inputEl.focus();
				toast.info('Gunakan tombol pintas Ctrl+V / Cmd+V untuk menempelkan link.');
			}
		} catch (err) {
			const inputEl = document.getElementById('yt-url-input') as HTMLInputElement;
			if (inputEl) inputEl.focus();
			toast.info('Gunakan tombol pintas Ctrl+V / Cmd+V untuk menempelkan link.');
		}
	}

	let previewVideoModal = $state<VideoRecommendation | null>(null);
	let previewVideoDisplayMode = $state<'mini' | 'expanded' | 'minimized'>('mini');
	let previewVideoStartTime = $state(0);

	function openPreviewVideoModal(video: VideoRecommendation) {
		let savedTime = 0;
		if (typeof localStorage !== 'undefined') {
			const raw = localStorage.getItem(`yt_progress_${video.youtubeId}`);
			if (raw) {
				const parsed = parseInt(raw, 10);
				if (!isNaN(parsed) && parsed > 3) {
					savedTime = parsed;
				}
			}
		}
		previewVideoStartTime = savedTime;
		previewVideoModal = video;
		previewVideoDisplayMode = 'mini';
	}

	function closePreviewVideoModal() {
		previewVideoModal = null;
		previewVideoDisplayMode = 'mini';
	}

	function restartPreviewFromStart() {
		previewVideoStartTime = 0;
		if (previewVideoModal && typeof localStorage !== 'undefined') {
			localStorage.removeItem(`yt_progress_${previewVideoModal.youtubeId}`);
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		function handleYtMessage(event: MessageEvent) {
			if (!previewVideoModal || !event.origin.includes('youtube.com')) return;
			try {
				const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
				if (data?.event === 'infoDelivery' && typeof data?.info?.currentTime === 'number') {
					const currentTime = Math.floor(data.info.currentTime);
					if (currentTime > 3) {
						localStorage.setItem(`yt_progress_${previewVideoModal.youtubeId}`, currentTime.toString());
					}
				}
			} catch {
				// ignore non-json messages
			}
		}
		window.addEventListener('message', handleYtMessage);

		const timer = setInterval(() => {
			if (!previewVideoModal) return;
			const iframe = document.querySelector('.inline-video-player-box iframe') as HTMLIFrameElement | null;
			if (iframe && iframe.contentWindow) {
				iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
			}
		}, 1000);

		return () => {
			window.removeEventListener('message', handleYtMessage);
			clearInterval(timer);
		};
	});

	function promptDeleteVideo(index: number) {
		videoToDeleteIndex = index;
		showConfirmDeleteVideo = true;
	}

	function confirmDeleteVideo() {
		if (videoToDeleteIndex !== null) {
			videoRecommendations = videoRecommendations.filter((_, i) => i !== videoToDeleteIndex);
			toast.success('Rekomendasi video berhasil dihapus');
		}
		videoToDeleteIndex = null;
		showConfirmDeleteVideo = false;
	}

	function moveVideo(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= videoRecommendations.length) return;
		const updated = [...videoRecommendations];
		const temp = updated[index];
		updated[index] = updated[targetIndex];
		updated[targetIndex] = temp;
		videoRecommendations = updated;
	}

	let draggedVideoIndex = $state<number | null>(null);
	let dragOverVideoIndex = $state<number | null>(null);

	function handleVideoDragStart(e: DragEvent, index: number) {
		draggedVideoIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', index.toString());
		}
	}

	function handleVideoDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		if (dragOverVideoIndex !== index) {
			dragOverVideoIndex = index;
		}
	}

	function handleVideoDragLeave(index: number) {
		if (dragOverVideoIndex === index) {
			dragOverVideoIndex = null;
		}
	}

	function handleVideoDragEnd() {
		draggedVideoIndex = null;
		dragOverVideoIndex = null;
	}

	function handleVideoDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (draggedVideoIndex === null || draggedVideoIndex === dropIndex) {
			draggedVideoIndex = null;
			dragOverVideoIndex = null;
			return;
		}

		const updated = [...videoRecommendations];
		const [movedItem] = updated.splice(draggedVideoIndex, 1);
		updated.splice(dropIndex, 0, movedItem);

		videoRecommendations = updated;
		draggedVideoIndex = null;
		dragOverVideoIndex = null;
		toast.success('Urutan video rekomendasi diperbarui');
	}

	async function performAutosave() {
		if (!isDirty || isSaving || !title.trim()) return;

		saveStatus = 'saving';
		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('content', content);
			formData.append('attachments', JSON.stringify(globalAttachments));
			formData.append('videoRecommendations', JSON.stringify(videoRecommendations));

			const res = await fetch('?/updateMateri', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			const result = deserialize(await res.text());

			if (result.type === 'success') {
				originalTitle = title;
				originalContent = content;
				originalAttachmentsJson = JSON.stringify(globalAttachments);
				originalVideosJson = JSON.stringify(videoRecommendations);
				saveStatus = 'saved';
				lastSavedAt = new Date();
			} else {
				saveStatus = 'error';
			}
		} catch (err) {
			console.error('Autosave failed:', err);
			saveStatus = 'error';
		}
	}

	$effect(() => {
		const currTitle = title;
		const currContent = content;

		untrack(() => {
			if (currTitle !== originalTitle || currContent !== originalContent) {
				if (currTitle.trim().length < 3) return;

				if (saveStatus !== 'saving' && saveStatus !== 'error') {
					saveStatus = 'unsaved';
				}
				if (saveStatus !== 'error') {
					if (autosaveTimer) clearTimeout(autosaveTimer);
					autosaveTimer = setTimeout(() => {
						performAutosave();
					}, DEBOUNCE_MS);
				}
			} else {
				if (autosaveTimer) clearTimeout(autosaveTimer);
				if (saveStatus !== 'saving' && saveStatus !== 'error') {
					saveStatus = 'saved';
				}
			}
		});
	});

	onDestroy(() => {
		if (autosaveTimer) clearTimeout(autosaveTimer);
	});

	// Intercept client-side navigation if there are unsaved changes
	beforeNavigate((navigation) => {
		if (allowNavigation) return;

		if (isDirty || saveStatus === 'unsaved' || saveStatus === 'saving') {
			navigation.cancel();
			pendingNavigateUrl = navigation.to?.url.href || null;
			showLeaveModal = true;
		}
	});

	async function saveAndLeave() {
		if (!title.trim()) {
			toast.error('Judul materi tidak boleh kosong');
			return;
		}
		isModalSaving = true;
		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('content', content);
			formData.append('attachments', JSON.stringify(globalAttachments));

			const res = await fetch('?/updateMateri', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			const result = deserialize(await res.text());

			if (result.type === 'success') {
				originalTitle = title;
				originalContent = content;
				originalAttachmentsJson = JSON.stringify(globalAttachments);
				saveStatus = 'saved';
				lastSavedAt = new Date();
				toast.success('Materi berhasil disimpan!');
				showLeaveModal = false;
				allowNavigation = true;
				isModalSaving = false;
				if (pendingNavigateUrl) {
					goto(pendingNavigateUrl);
				} else {
					window.history.back();
				}
			} else {
				toast.error((result as any)?.data?.error || 'Gagal menyimpan materi');
				isModalSaving = false;
			}
		} catch (err: any) {
			toast.error(err?.message || 'Terjadi kesalahan saat menyimpan');
			isModalSaving = false;
		}
	}

	function enhancePreviewCodeBlocks() {
		if (typeof document === 'undefined') return;
		setTimeout(() => {
			const pres = document.querySelectorAll('.preview-canvas pre');
			pres.forEach((pre) => {
				const preEl = pre as HTMLElement;
				if (preEl.parentElement?.classList.contains('tiptap-code-block-wrapper')) return;

				const wrapper = document.createElement('div');
				wrapper.className = 'tiptap-code-block-wrapper';

				const header = document.createElement('div');
				header.className = 'code-block-header';

				const dots = document.createElement('div');
				dots.className = 'mac-dots';
				dots.innerHTML = `
					<span class="mac-dot mac-dot--red"></span>
					<span class="mac-dot mac-dot--yellow"></span>
					<span class="mac-dot mac-dot--green"></span>
				`;

				const langWrapper = document.createElement('div');
				langWrapper.className = 'code-block-lang';
				const lang = preEl.getAttribute('data-language') || preEl.querySelector('code')?.className.replace('language-', '') || 'code';
				langWrapper.innerHTML = `<span class="code-block-lang__tag">${lang}</span>`;

				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'code-copy-btn';
				btn.setAttribute('aria-label', 'Salin Kode');
				btn.innerHTML = `
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
					<span>Salin</span>
				`;

				let timer: ReturnType<typeof setTimeout> | null = null;
				btn.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const targetEl = preEl.querySelector('code') || preEl;
					let text = targetEl.innerText || '';
					if ((!text || !text.includes('\n')) && targetEl.innerHTML) {
						const temp = document.createElement('div');
						temp.innerHTML = targetEl.innerHTML
							.replace(/<br\s*\/?>/gi, '\n')
							.replace(/<\/p>/gi, '\n')
							.replace(/<\/div>/gi, '\n');
						text = temp.textContent || '';
					}
					if (!text) text = targetEl.textContent || '';
					text = text.replace(/\r\n/g, '\n').trim();
					if (!text) return;
					navigator.clipboard.writeText(text).then(() => {
						btn.classList.add('code-copy-btn--copied');
						btn.innerHTML = `
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							<span>Tersalin!</span>
						`;
						if (timer) clearTimeout(timer);
						timer = setTimeout(() => {
							btn.classList.remove('code-copy-btn--copied');
							btn.innerHTML = `
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
								<span>Salin</span>
							`;
						}, 2000);
					});
				});

				header.appendChild(dots);
				header.appendChild(langWrapper);
				header.appendChild(btn);

				preEl.parentNode?.insertBefore(wrapper, preEl);
				wrapper.appendChild(header);
				wrapper.appendChild(preEl);
			});
		}, 50);
	}

	$effect(() => {
		const c = content;
		const tab = activeTab;
		if (tab === 'preview' || tab === 'split') {
			untrack(() => {
				enhancePreviewCodeBlocks();
			});
		}
	});

	function confirmLeave() {
		showLeaveModal = false;
		allowNavigation = true;
		if (pendingNavigateUrl) {
			goto(pendingNavigateUrl);
		} else {
			window.history.back();
		}
	}

	function cancelLeave() {
		showLeaveModal = false;
		pendingNavigateUrl = null;
	}

	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (isDirty || saveStatus === 'unsaved' || saveStatus === 'saving') {
			e.preventDefault();
			e.returnValue = 'Ada perubahan yang belum disimpan.';
		}
	}

	// Keyboard shortcut Ctrl+S / Cmd+S handler
	function handleKeyDown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			const formEl = document.getElementById('materi-form') as HTMLFormElement;
			if (formEl && !isSaving) {
				if (autosaveTimer) clearTimeout(autosaveTimer);
				formEl.requestSubmit();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} onbeforeunload={handleBeforeUnload} />

<svelte:head>
	<title>Edit Materi: {title} — NLC</title>
</svelte:head>

<div class="builder-root">
	<form
		id="materi-form"
		method="POST"
		action="?/updateMateri"
		use:enhance={() => {
			if (autosaveTimer) clearTimeout(autosaveTimer);
			isSaving = true;
			saveStatus = 'saving';
			return async ({ result, update }) => {
				await update({ reset: false });
				isSaving = false;
				if (result.type === 'success') {
					originalTitle = title;
					originalContent = content;
					originalAttachmentsJson = JSON.stringify(globalAttachments);
					originalVideosJson = JSON.stringify(videoRecommendations);
					saveStatus = 'saved';
					lastSavedAt = new Date();
					toast.success('Materi berhasil disimpan!');
				} else if (result.type === 'failure') {
					saveStatus = 'error';
					toast.error((result.data as any)?.error || 'Gagal menyimpan materi');
				}
			};
		}}
	>
		<!-- === TOPBAR === -->
		<header class="builder-topbar">
			<!-- Left: Breadcrumb + Title -->
			<div class="topbar-left">
				<nav class="breadcrumb" aria-label="Breadcrumb">
					<a href="/mentor/kurikulum" class="breadcrumb-link">Track Pembelajaran</a>
					<svg class="breadcrumb-sep" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<a href="/mentor/kurikulum/{data.trackId}" class="breadcrumb-link">{trackTitle || 'Track'}</a>
					<svg class="breadcrumb-sep" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<span class="breadcrumb-current">{phaseTitle}</span>
				</nav>

				<div class="topbar-title-row">
					<h1 class="topbar-title">
						<span class="materi-order">M-{data.materi?.sortOrder || 1}</span>
						{title || 'Untitled Materi'}
					</h1>
					<span class="autosave-pill autosave-pill--{saveStatus}">
						{#if saveStatus === 'saving'}
							<svg class="spin-icon" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
							<span>Menyimpan...</span>
						{:else if saveStatus === 'saved'}
							<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							<span>Tersimpan {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
						{:else if saveStatus === 'unsaved'}
							<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
							<span>Ada Perubahan</span>
						{:else if saveStatus === 'error'}
							<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
							<span>Gagal Simpan</span>
						{/if}
					</span>
				</div>
			</div>

			<!-- Right: Controls -->
			<div class="topbar-right">
				<!-- View mode switcher -->
				<div class="view-switcher" role="group" aria-label="View Mode">
					<button
						type="button"
						class="view-btn"
						class:view-btn--active={activeTab === 'edit'}
						onclick={() => (activeTab = 'edit')}
						title="Editor mode"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						Editor
					</button>
					<button
						type="button"
						class="view-btn hide-mobile"
						class:view-btn--active={activeTab === 'split'}
						onclick={() => (activeTab = 'split')}
						title="Split view"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
						Split
					</button>
					<button
						type="button"
						class="view-btn"
						class:view-btn--active={activeTab === 'preview'}
						onclick={() => (activeTab = 'preview')}
						title="Preview mode"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						Preview
					</button>
				</div>

				<div class="topbar-divider hide-mobile"></div>

				<a href="/mentor/kurikulum/{data.trackId}" class="btn-back">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
					Kembali
				</a>

				<button
					type="submit"
					disabled={isSaving}
					class="btn-save"
					class:btn-save--saving={isSaving}
				>
					{#if isSaving}
						<svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
						Menyimpan…
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
						Simpan Materi
					{/if}
				</button>
			</div>
		</header>

		<!-- === MAIN WORKSPACE === -->
		<div class="builder-workspace">

			<!-- LEFT SIDEBAR -->
			<aside class="builder-sidebar hide-mobile">
				<!-- Materi info card -->
				<div class="sidebar-card">
					<div class="sidebar-card__header">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						Informasi Modul
					</div>
					<dl class="info-list">
						<div class="info-row">
							<dt class="info-label">Track</dt>
							<dd class="info-value">{trackTitle || '—'}</dd>
						</div>
						<div class="info-row">
							<dt class="info-label">Phase</dt>
							<dd class="info-value">{phaseTitle || '—'}</dd>
						</div>
						<div class="info-row">
							<dt class="info-label">Sub-Phase</dt>
							<dd class="info-value">{subPhaseTitle || '—'}</dd>
						</div>
						<div class="info-row">
							<dt class="info-label">Urutan</dt>
							<dd class="info-value info-value--badge">M-{data.materi?.sortOrder || 1}</dd>
						</div>
					</dl>
				</div>

				<!-- Metrics card -->
				<div class="sidebar-card">
					<div class="sidebar-card__header">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
						Statistik Konten
					</div>
					<div class="metrics-grid">
						<div class="metric-item">
							<div class="metric-value">{wordCount}</div>
							<div class="metric-label">Kata</div>
						</div>
						<div class="metric-item">
							<div class="metric-value">~{readingTimeMin}m</div>
							<div class="metric-label">Baca</div>
						</div>
					</div>
				</div>

				<!-- Tips card -->
				<div class="sidebar-card sidebar-card--tips">
					<div class="sidebar-card__header">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
						Shortcuts
					</div>
					<ul class="tips-list">
						<li>
							<kbd>Ctrl</kbd><kbd>S</kbd>
							<span>Quick Save</span>
						</li>
						<li>
							<kbd>Ctrl</kbd><kbd>B</kbd>
							<span>Bold</span>
						</li>
						<li>
							<kbd>Ctrl</kbd><kbd>I</kbd>
							<span>Italic</span>
						</li>
						<li>
							<kbd>Ctrl</kbd><kbd>Z</kbd>
							<span>Undo</span>
						</li>
					</ul>
				</div>
			</aside>

			<!-- MAIN CONTENT AREA -->
			<main class="builder-main">
				<!-- Form error / success notifications -->
				{#if form?.error}
					<div class="flex items-center gap-2.5 p-3 mb-4 rounded-lg bg-rose-50/80 border border-rose-200/90 text-rose-700" role="alert">
						<span class="badge border-rose-300 bg-rose-100 text-rose-700 font-mono flex-shrink-0">
							⚠️ FORM ERROR
						</span>
						<span class="text-xs font-bold text-rose-800 min-w-0">{form.error}</span>
					</div>
				{/if}

				<!-- Hidden content & attachments field -->
				<input type="hidden" name="content" value={content} />
				<input type="hidden" name="attachments" value={JSON.stringify(globalAttachments)} />
				<input type="hidden" name="videoRecommendations" value={JSON.stringify(videoRecommendations)} />

				<!-- Title field -->
				<div class="content-block">
					<label for="materi-title-input" class="content-block__label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
						Judul Modul Materi
						<span class="required-star">*</span>
					</label>
					<input
						id="materi-title-input"
						type="text"
						name="title"
						bind:value={title}
						required
						placeholder="Masukkan judul modul materi…"
						class="title-input"
					/>
				</div>

				<!-- Editor area by mode -->
				{#if activeTab === 'edit'}
					<!-- 1. Konten Materi (Tiptap Editor) -->
					<div class="content-block content-block--editor mb-5">
						<div class="content-block__label-row">
							<label class="content-block__label">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
								Konten Materi
							</label>
							<span class="format-tag">Rich Text · HTML</span>
						</div>
						<TiptapEditor
							bind:value={content}
							{saveStatus}
							{lastSavedAt}
							placeholder="Ketik modul pembelajaran, penjelasan konsep, snippet command Cisco/Linux..."
						/>
					</div>

					<!-- 2. Rekomendasi Video Pembelajaran (YouTube) -->
					<div class="content-block materi-global-attachments-card mb-5">
						<div class="content-block__label-row">
							<span class="content-block__label">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="text-indigo-600">
									<polygon points="6 3 20 12 6 21 6 3"/>
								</svg>
								Rekomendasi Video Pembelajaran (YouTube)
							</span>
							<span class="badge border-indigo-200 bg-indigo-50 text-indigo-700 font-mono flex-shrink-0">
								{videoRecommendations.length} Video
							</span>
						</div>

						<div class="p-5 sm:p-6 flex flex-col gap-4">
							<!-- Form Input Tambah Link Video (Persis 2 Baris, Gap Vertical flex flex-col gap-3.5, Padding Kiri/Kanan 16px) -->
							<div class="flex flex-col gap-3.5">
								{#if ytError}
									<div class="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50/80 border border-rose-200/90 text-rose-700">
										<span class="badge border-rose-300 bg-rose-100 text-rose-700 font-mono flex-shrink-0">
											⚠️ ERROR
										</span>
										<span class="text-xs font-bold text-rose-800 min-w-0">{ytError}</span>
									</div>
								{/if}

								<!-- Form Input Link YouTube (Single Row) -->
								<div class="flex items-center gap-2.5 sm:gap-3 w-full">
									<div class="flex-1 min-w-0">
										<input
											id="yt-url-input"
											type="url"
											bind:value={newYtUrl}
											placeholder="Masukkan URL YouTube (misal: https://youtu.be/...)"
											class="yt-input-field font-mono text-xs"
											onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoRecommendation(); } }}
										/>
									</div>
									<button
										type="button"
										onclick={pasteYtUrlFromClipboard}
										class="px-4 sm:px-5 py-2.5 h-10 min-w-[125px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg border border-slate-200/90 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 shadow-2xs whitespace-nowrap"
										title="Tempel link dari clipboard"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
										<span>Tempel Link</span>
									</button>
									<button
										type="button"
										onclick={addVideoRecommendation}
										disabled={isFetchingYt || !newYtUrl.trim()}
										class="px-4 sm:px-5 py-2.5 h-10 min-w-[135px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 shadow-2xs whitespace-nowrap"
									>
										{#if isFetchingYt}
											<svg class="spin-icon text-white" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
											<span>Proses...</span>
										{:else}
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
											<span>Tambah Video</span>
										{/if}
									</button>
								</div>
							</div>

							<!-- Existing Video Cards List -->
							{#if videoRecommendations.length > 0}
								<div class="mt-2 border-t border-slate-200/80 pt-4">
									<div class="flex items-center justify-between mb-3">
										<span class="text-xs font-bold text-slate-700 uppercase tracking-wider">
											Daftar Video Rekomendasi ({videoRecommendations.length})
										</span>
									</div>
									<div class="flex flex-col gap-3">
										{#each videoRecommendations as video, i (video.id || i)}
											<div
												draggable="true"
												ondragstart={(e) => handleVideoDragStart(e, i)}
												ondragover={(e) => handleVideoDragOver(e, i)}
												ondragleave={() => handleVideoDragLeave(i)}
												ondragend={handleVideoDragEnd}
												ondrop={(e) => handleVideoDrop(e, i)}
												class="pl-3.5 pr-12 py-3 sm:pl-4 sm:pr-20 sm:py-3.5 rounded-md border transition-all duration-200 flex items-center justify-between gap-4 group {draggedVideoIndex === i ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/20' : dragOverVideoIndex === i ? 'border-2 border-indigo-500 bg-indigo-50/50 shadow-md scale-[1.005]' : 'border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-2xs'}"
											>
												<!-- Left: Drag Handle, Thumbnail & Details -->
												<div class="flex items-center gap-3.5 min-w-0 flex-1">
													<!-- 6-Dot Grip Handle Icon -->
													<div class="text-slate-400 group-hover:text-slate-600 cursor-grab active:cursor-grabbing flex-shrink-0 p-1 rounded-md hover:bg-slate-100 transition-colors" title="Tarik untuk menggeser urutan video">
														<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.75"/><circle cx="15" cy="5" r="1.75"/><circle cx="9" cy="12" r="1.75"/><circle cx="15" cy="12" r="1.75"/><circle cx="9" cy="19" r="1.75"/><circle cx="15" cy="19" r="1.75"/></svg>
													</div>

													<!-- Video Thumbnail -->
													<div class="relative w-24 sm:w-28 aspect-video rounded-md overflow-hidden bg-slate-900 border border-slate-200 flex-shrink-0 shadow-2xs">
														<img
															src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
															alt={video.title}
															class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
															onerror={(e) => {
																(e.currentTarget as HTMLImageElement).src = 'https://img.youtube.com/vi/' + video.youtubeId + '/mqdefault.jpg';
															}}
														/>
														{#if video.duration}
															<span class="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 py-0.2 rounded font-bold">
																{video.duration}
															</span>
														{/if}
													</div>

													<!-- Video Details -->
													<div class="min-w-0 flex-1 space-y-0.5">
														<a href={video.url} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors truncate block" title={video.title}>
															{video.title}
														</a>
														<div class="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
															{#if video.duration}
																<span class="flex items-center gap-1 text-slate-700 font-mono font-bold">
																	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
																	<span>{video.duration}</span>
																</span>
																<span class="text-slate-300">•</span>
															{/if}
															<span class="font-mono text-[10.5px] text-slate-400 truncate">https://youtu.be/{video.youtubeId}</span>
														</div>
													</div>
												</div>

												<!-- Right: Action Box (Move Up, Move Down & Delete) -->
												<div class="flex items-center gap-1 flex-shrink-0 border border-slate-200/90 rounded-md p-1 bg-white shadow-2xs mr-6 sm:mr-12">
													<button
														type="button"
														onclick={() => moveVideo(i, 'up')}
														disabled={i === 0}
														class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 rounded transition-all cursor-pointer"
														title="Naikkan Urutan"
													>
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
													</button>
													<button
														type="button"
														onclick={() => moveVideo(i, 'down')}
														disabled={i === videoRecommendations.length - 1}
														class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 rounded transition-all cursor-pointer"
														title="Turunkan Urutan"
													>
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
													</button>
													<div class="w-px h-4 bg-slate-200 my-auto mx-0.5"></div>
													<button
														type="button"
														onclick={() => promptDeleteVideo(i)}
														class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
														title="Hapus Rekomendasi Video"
													>
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- 3. Global Lampiran Berkas Modul -->
					<div class="content-block materi-global-attachments-card">
						<div class="content-block__label-row bg-slate-50/80 px-5 py-4 border-b border-slate-200/90 flex items-center justify-between">
							<span class="content-block__label text-slate-800 font-bold text-xs flex items-center gap-2.5">
								<div class="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
								</div>
								Lampiran Berkas Modul (Global)
							</span>
							<span class="badge border-indigo-200 bg-indigo-50 text-indigo-700 font-mono flex-shrink-0">
								{globalAttachments.length} Berkas
							</span>
						</div>

						<div class="p-6 sm:p-7 flex flex-col gap-6">
							{#if globalUploadError}
								<div class="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50/80 border border-rose-200/90 text-rose-700">
									<span class="badge border-rose-300 bg-rose-100 text-rose-700 font-mono flex-shrink-0">
										⚠️ UPLOAD ERROR
									</span>
									<span class="text-xs font-bold text-rose-800 min-w-0">{globalUploadError}</span>
								</div>
							{/if}

							{#if globalAttachments.length > 0}
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
									{#each globalAttachments as att, i}
										<div class="materi-attachment-item-card p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all duration-200 flex items-center justify-between gap-3 group">
											<div class="flex items-center gap-3 min-w-0 flex-1">
												<span class="badge uppercase tracking-wider flex-shrink-0 {getFileBadgeClass(att.name)}">
													{getFileExt(att.name)}
												</span>
												<div class="min-w-0 flex-1">
													{#if editingAttachmentIndex === i}
														<input
															type="text"
															bind:value={editingAttachmentName}
															onkeydown={(e) => {
																if (e.key === 'Enter') saveRenameAttachment(i);
																if (e.key === 'Escape') cancelRenameAttachment();
															}}
															class="w-full px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															placeholder="Nama berkas..."
														/>
													{:else}
														<div class="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={att.name}>
															{att.name}
														</div>
														<div class="text-[10px] font-mono text-slate-500 font-medium mt-0.5">
															{formatFileSize(att.size)} · Lampiran Modul
														</div>
													{/if}
												</div>
											</div>
											<div class="flex items-center gap-1.5 flex-shrink-0">
												{#if editingAttachmentIndex === i}
													<button
														type="button"
														onclick={() => saveRenameAttachment(i)}
														class="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
														title="Simpan Nama"
													>
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
													</button>
													<button
														type="button"
														onclick={cancelRenameAttachment}
														class="w-9 h-9 rounded-lg border border-slate-200/90 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
														title="Batal"
													>
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
													</button>
												{:else}
													<button
														type="button"
														onclick={() => startRenameAttachment(i)}
														class="w-9 h-9 rounded-lg border border-slate-200/90 bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
														title="Ubah Nama Berkas"
													>
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
													</button>
													<a
														href={att.url}
														download={att.name}
														target="_blank"
														rel="noopener noreferrer"
														class="w-9 h-9 rounded-lg border border-slate-200/90 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
														title={`Unduh ${att.name}`}
													>
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
													</a>
													<button
														type="button"
														onclick={() => removeGlobalAttachment(i)}
														class="w-9 h-9 rounded-lg border border-slate-200/90 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
														title="Hapus Lampiran"
													>
														<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
													</button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Drag and Drop Dropzone -->
							<div
								class="upload-dropzone relative border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer group {isDraggingGlobal ? 'border-indigo-500 bg-indigo-50/80 ring-4 ring-indigo-500/10 scale-[1.005]' : ''}"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								role="region"
								aria-label="Area Drag & Drop File Lampiran"
							>
								<input id="global-att-input" type="file" class="sr-only" onchange={handleGlobalAttachmentUpload} disabled={isUploadingGlobal} />
								<label for="global-att-input" class="cursor-pointer block">
									{#if isUploadingGlobal}
										<div class="flex flex-col items-center justify-center py-6 space-y-3">
											<div class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
												<svg class="animate-spin text-indigo-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
											</div>
											<span class="text-xs font-bold text-indigo-700 tracking-wide">Mengunggah berkas lampiran...</span>
										</div>
									{:else}
										<div class="flex flex-col items-center justify-center space-y-3">
											<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
											</div>
											<div class="space-y-1">
												<div class="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
													Tarik &amp; lepas berkas ke sini, atau <span class="text-indigo-600 underline underline-offset-4 decoration-indigo-300 font-semibold">pilih dari komputer</span>
												</div>
												<p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
													Mendukung berkas praktikum, slide PDF, paket lab Cisco Packet Tracer, atau arsip ZIP.
												</p>
											</div>
											<div class="flex items-center gap-1.5 flex-wrap justify-center pt-1">
												<span class="badge border-slate-200 bg-white text-slate-700 font-mono">PDF</span>
												<span class="badge border-cyan-200 bg-cyan-50 text-cyan-700 font-mono">PKT</span>
												<span class="badge border-cyan-200 bg-cyan-50 text-cyan-700 font-mono">GNS3</span>
												<span class="badge border-amber-200 bg-amber-50 text-amber-700 font-mono">ZIP</span>
												<span class="badge border-indigo-200 bg-indigo-50 text-indigo-700 font-mono">DOCX</span>
												<span class="badge border-amber-300 bg-amber-100/80 text-amber-800 font-mono">Maks 20MB</span>
											</div>
										</div>
									{/if}
								</label>
							</div>
						</div>
					</div>

				{:else if activeTab === 'preview'}
					<div class="content-block">
						<div class="content-block__label-row">
							<span class="content-block__label">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
								Live Preview
							</span>
							<span class="badge-live-sm">
								<span class="live-dot"></span>
								Live Render
							</span>
						</div>
						<div class="preview-canvas">
							{@html content || '<p class="preview-empty">Belum ada konten materi. Beralih ke mode Editor untuk mulai menulis.</p>'}
						</div>
					</div>

					<!-- Dedicated YouTube Video Recommendations Section (Student Viewer Preview - Compact Cards) -->
					{#if videoRecommendations.length > 0}
						<section class="materi-video-recommendations-section mt-5 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
							<div class="video-section-header flex items-center justify-between mb-4">
								<div class="flex items-center gap-2.5">
									<div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs flex-shrink-0">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
											<polygon points="6 3 20 12 6 21 6 3"/>
										</svg>
									</div>
									<div>
										<h3 class="font-bold text-slate-800 text-sm tracking-tight m-0 leading-tight">Rekomendasi Video Pembelajaran</h3>
										<p class="text-[11px] text-slate-500 font-medium m-0 mt-0.5">Tonton video penjelasan dari YouTube untuk memperdalam materi ini</p>
									</div>
								</div>
								<span class="badge border-indigo-200 bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-md flex-shrink-0">
									{videoRecommendations.length} Video
								</span>
							</div>

							<!-- Full Width Top Active Video Player (Opens when any card is clicked) -->
							{#if previewVideoModal}
								<div class="inline-video-player-box mt-5 mb-0 relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
									<!-- Floating Close Button -->
									<button
										type="button"
										onclick={closePreviewVideoModal}
										class="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-xs"
										title="Tutup Pemutar Video"
									>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
									</button>

									<!-- Floating Resume Progress Pill (Top Left) -->
									{#if previewVideoStartTime > 0}
										<div class="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white text-xs font-medium shadow-lg select-none">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-amber-400 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
											<span class="font-mono text-[11px] text-slate-200">Melanjutkan: {Math.floor(previewVideoStartTime / 60)}m {previewVideoStartTime % 60}s</span>
											<button
												type="button"
												onclick={restartPreviewFromStart}
												class="ml-1 text-amber-400 hover:text-amber-300 underline text-[11px] font-semibold cursor-pointer transition-colors"
												title="Putar dari 0:00"
											>
												Reset
											</button>
										</div>
									{/if}

									<!-- 16:9 Youtube Iframe Canvas -->
									<div class="relative aspect-video w-full">
										<iframe
											src={`https://www.youtube.com/embed/${previewVideoModal.youtubeId}?enablejsapi=1&autoplay=1&rel=0${previewVideoStartTime > 0 ? `&start=${previewVideoStartTime}` : ''}`}
											title={previewVideoModal.title}
											class="absolute inset-0 w-full h-full border-0"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
											allowfullscreen
										></iframe>
									</div>
								</div>

								<!-- Physical un-collapsible spacer between iframe player and video card list -->
								<div class="h-10 sm:h-14 lg:h-16 w-full flex-shrink-0" aria-hidden="true"></div>
							{/if}

							<!-- Card List Below Player -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
								{#each videoRecommendations as video}
									<div
										class="group bg-slate-50/60 hover:bg-white border rounded-xl p-3.5 sm:p-4 transition-all duration-200 flex items-center justify-between gap-3.5 cursor-pointer min-w-0 {previewVideoModal?.youtubeId === video.youtubeId ? 'border-indigo-400 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-300' : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'}"
										onclick={() => openPreviewVideoModal(video)}
										role="button"
										tabindex="0"
										onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreviewVideoModal(video); } }}
									>
										<!-- Compact Video Thumbnail Container -->
										<div class="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 shadow-2xs border border-slate-200/80">
											<img
												src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
												alt={video.title}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												onerror={(e) => {
													(e.currentTarget as HTMLImageElement).src = 'https://img.youtube.com/vi/' + video.youtubeId + '/mqdefault.jpg';
												}}
											/>
											<div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>

											<!-- Play Button Overlay -->
											<div class="absolute inset-0 flex items-center justify-center">
												<div class="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-200 ring-2 ring-white/30">
													<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="translate-x-0.5">
														<polygon points="5 3 19 12 5 21 5 3"/>
													</svg>
												</div>
											</div>

											{#if video.duration}
												<span class="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
													{video.duration}
												</span>
											{/if}
										</div>

										<!-- Compact Video Details -->
										<div class="min-w-0 flex-1 space-y-1">
											{#if previewVideoModal?.youtubeId === video.youtubeId}
												<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase tracking-wider mb-1">
													<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
													<span>Sedang Diputar</span>
												</div>
											{/if}
											<h4 class="font-bold text-slate-800 text-xs line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug m-0" title={video.title}>
												{video.title}
											</h4>
											{#if video.duration}
												<div class="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 mt-1">
													<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
													<span>Durasi: {video.duration}</span>
												</div>
											{/if}
											{#if video.note}
												<p class="text-[10.5px] text-slate-500 italic truncate mt-0.5 m-0" title={video.note}>
													&ldquo;{video.note}&rdquo;
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}

					<!-- Dedicated Material Attachments Section (Student Viewer Preview) -->
					{#if globalAttachments.length > 0}
						<section class="materi-attachments-section mt-5 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
							<div class="attachments-header flex items-center justify-between mb-4">
								<div class="attachments-title-group flex items-center gap-2.5">
									<div class="attachments-icon-badge w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs flex-shrink-0">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
											<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
										</svg>
									</div>
									<div>
										<h3 class="attachments-heading font-bold text-slate-800 text-sm tracking-tight m-0 leading-tight">Lampiran & Berkas Materi</h3>
										<p class="attachments-subheading text-[11px] text-slate-500 font-medium m-0 mt-0.5">Unduh berkas pendukung pembelajaran ini</p>
									</div>
								</div>
								<span class="attachments-count-badge font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
									{globalAttachments.length} Berkas
								</span>
							</div>

							<div class="attachments-grid grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
								{#each globalAttachments as att}
									<a
										href={att.url}
										download={att.name}
										target="_blank"
										rel="noopener noreferrer"
										class="attachment-card p-3 sm:p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3 group text-decoration-none min-w-0"
										title={`Unduh ${att.name}`}
									>
										<div class="flex items-center gap-3 min-w-0 flex-1">
											<span class="badge uppercase tracking-wider flex-shrink-0 {getFileBadgeClass(att.name)}">
												{getFileExt(att.name)}
											</span>
											<div class="min-w-0 flex-1">
												<div class="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={att.name}>
													{att.name}
												</div>
												<div class="text-[10px] font-mono text-slate-500 font-medium mt-0.5">
													{formatFileSize(att.size)} &bull; Berkas Lampiran
												</div>
											</div>
										</div>
										<div class="attachment-card-action inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200 shadow-2xs">
											<span>Unduh</span>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
												<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
												<polyline points="7 10 12 15 17 10" />
												<line x1="12" y1="15" x2="12" y2="3" />
											</svg>
										</div>
									</a>
								{/each}
							</div>
						</section>
					{/if}

				{:else}
					<!-- Split mode -->
					<div class="split-layout">
						<div class="content-block content-block--editor split-pane">
							<div class="content-block__label-row">
								<span class="content-block__label">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
									Editor
								</span>
							</div>
							<TiptapEditor
								bind:value={content}
								{saveStatus}
								{lastSavedAt}
								placeholder="Ketik modul pembelajaran…"
							/>
						</div>
						<div class="content-block split-pane">
							<div class="content-block__label-row">
								<span class="content-block__label">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
									Preview
								</span>
								<span class="badge-live-sm"><span class="live-dot"></span>Live</span>
							</div>
							<div class="preview-canvas preview-canvas--split">
								{@html content || '<p class="preview-empty">Belum ada konten.</p>'}
							</div>

							{#if videoRecommendations.length > 0}
								<div class="mt-4 pt-4 border-t border-slate-200">
									<div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
										<span>Rekomendasi Video ({videoRecommendations.length})</span>
									</div>
									<div class="space-y-2">
										{#each videoRecommendations as video}
											<div
												class="flex items-center gap-2 p-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer transition-colors"
												onclick={() => openPreviewVideoModal(video)}
												role="button"
												tabindex="0"
												onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreviewVideoModal(video); } }}
											>
												<img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.title} class="w-12 aspect-video object-cover rounded flex-shrink-0" />
												<div class="min-w-0 flex-1">
													<div class="text-[11px] font-bold text-slate-800 truncate">{video.title}</div>
													<div class="text-[9.5px] text-slate-500 font-mono">YouTube</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if globalAttachments.length > 0}
								<div class="mt-4 pt-4 border-t border-slate-200">
									<div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
										<span>Lampiran Berkas ({globalAttachments.length})</span>
									</div>
									<div class="space-y-2">
										{#each globalAttachments as att}
											<a
												href={att.url}
												download={att.name}
												target="_blank"
												rel="noopener noreferrer"
												class="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
												title={`Unduh ${att.name}`}
											>
												<div class="flex items-center gap-2 min-w-0 flex-1">
													<span class="badge uppercase text-[9px] flex-shrink-0 {getFileBadgeClass(att.name)}">
														{getFileExt(att.name)}
													</span>
													<span class="text-[11px] font-bold text-slate-800 truncate">{att.name}</span>
												</div>
												<span class="text-[10px] font-bold text-indigo-600 flex-shrink-0 ml-2">Unduh</span>
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</main>
		</div>
	</form>
	<!-- Leave Confirmation Modal -->
	<ConfirmModal
		bind:open={showLeaveModal}
		title="Perubahan Belum Disimpan"
		message="Modul materi yang Anda edit belum disimpan secara penuh. Pilihlah Simpan & Keluar untuk menyimpan perubahan Anda terlebih dahulu."
		saveText="Simpan & Keluar"
		saveLoading={isModalSaving}
		onsave={saveAndLeave}
		confirmText="Buang Perubahan"
		cancelText="Batal"
		variant="warning"
		onconfirm={confirmLeave}
		oncancel={cancelLeave}
	/>

	<!-- Delete Video Confirmation Modal -->
	<ConfirmModal
		bind:open={showConfirmDeleteVideo}
		title="Hapus Rekomendasi Video?"
		message="Apakah Anda yakin ingin menghapus video ini dari daftar rekomendasi materi?"
		confirmText="Hapus Video"
		cancelText="Batal"
		variant="danger"
		onconfirm={confirmDeleteVideo}
		oncancel={() => (showConfirmDeleteVideo = false)}
	/>


</div>

<style>
	/* === ROOT === */
	.builder-root {
		min-height: 100vh;
		background: var(--bg-base);
		display: flex;
		flex-direction: column;
	}

	/* === TOPBAR === */
	.builder-topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 20px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border-hard);
		box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
		min-height: 64px;
	}

	.topbar-left {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		flex: 1;
	}

	/* Breadcrumb */
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-wrap: nowrap;
		overflow: hidden;
	}
	.breadcrumb-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		transition: color 150ms ease;
	}
	.breadcrumb-link:hover {
		color: var(--primary);
	}
	.breadcrumb-sep {
		width: 14px;
		height: 14px;
		color: var(--border-hard);
		flex-shrink: 0;
	}
	.breadcrumb-current {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Title row */
	.topbar-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.topbar-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.015em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.materi-order {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		border: 1px solid var(--primary-border);
		border-radius: var(--radius-sm);
		padding: 2px 8px;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}
	.autosave-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.04em;
		border-radius: var(--radius-full);
		padding: 3px 10px;
		white-space: nowrap;
		transition: all 180ms ease;
		animation: fadeIn 200ms ease;
	}
	.autosave-pill--saved {
		color: #047857;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
	}
	.autosave-pill--unsaved {
		color: #b45309;
		background: var(--amber-dim);
		border: 1px solid var(--amber-border);
	}
	.autosave-pill--saving {
		color: var(--primary);
		background: var(--primary-light);
		border: 1px solid var(--primary-border);
	}
	.autosave-pill--error {
		color: #b91c1c;
		background: #fef2f2;
		border: 1px solid #fecaca;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}

	/* Right controls */
	.topbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
	.topbar-divider {
		width: 1px;
		height: 24px;
		background: var(--border-hard);
	}

	/* View switcher */
	.view-switcher {
		display: flex;
		align-items: center;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 3px;
		gap: 2px;
	}
	.view-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 8px;
		border: none;
		background: transparent;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}
	.view-btn:hover {
		color: var(--text-primary);
		background: white;
	}
	.view-btn--active {
		background: white !important;
		color: var(--primary) !important;
		box-shadow: var(--shadow-sm);
	}

	/* Back button */
	.btn-back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: white;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
		transition: all 150ms ease;
		box-shadow: var(--shadow-sm);
		white-space: nowrap;
	}
	.btn-back:hover {
		border-color: #cbd5e1;
		color: var(--text-primary);
		transform: translateY(-1px);
	}

	/* Save button */
	.btn-save {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 18px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: white;
		cursor: pointer;
		box-shadow: 0 4px 12px -2px rgba(79, 70, 229, 0.3);
		transition: all 150ms ease;
		white-space: nowrap;
	}
	.btn-save:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.4);
		transform: translateY(-1px);
	}
	.btn-save:active {
		transform: scale(0.98);
	}
	.btn-save:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}
	.btn-save--saving {
		background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%) !important;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.spin-icon {
		animation: spin 0.8s linear infinite;
	}

	/* === WORKSPACE LAYOUT === */
	.builder-workspace {
		display: flex;
		flex: 1;
		gap: 0;
		height: calc(100vh - 64px);
		overflow: hidden;
	}

	/* === LEFT SIDEBAR === */
	.builder-sidebar {
		width: 240px;
		flex-shrink: 0;
		background: white;
		border-right: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 12px;
		overflow-y: auto;
	}

	.sidebar-card {
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.sidebar-card--tips {
		background: var(--primary-light);
		border-color: var(--primary-border);
	}
	.sidebar-card__header {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 12px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		background: white;
		border-bottom: 1px solid var(--border-hard);
	}
	.sidebar-card--tips .sidebar-card__header {
		background: rgba(79, 70, 229, 0.06);
		border-color: var(--primary-border);
		color: var(--primary);
	}

	/* Info list */
	.info-list {
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.info-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.info-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-ghost);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.info-value {
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
		word-break: break-word;
	}
	.info-value--badge {
		display: inline-flex;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
		background: var(--primary-light);
		border: 1px solid var(--primary-border);
		border-radius: var(--radius-sm);
		padding: 2px 8px;
		letter-spacing: 0.04em;
	}

	/* Metrics grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border-hard);
	}
	.metric-item {
		background: white;
		padding: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.metric-value {
		font-family: var(--font-macro);
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.metric-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	/* Tips list */
	.tips-list {
		list-style: none;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.tips-list li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tips-list li span {
		font-family: var(--font-body);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary);
		margin-left: 4px;
	}
	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		background: white;
		border: 1px solid var(--primary-border);
		border-radius: 5px;
		color: var(--primary);
		box-shadow: 0 1px 2px rgba(0,0,0,0.06);
		min-width: 28px;
	}

	/* === MAIN CONTENT AREA === */
	.builder-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0;
		overflow-y: auto;
		padding: 20px 24px 32px;
		background: var(--bg-base);
	}

	/* Inline alert */
	.inline-alert {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 16px;
	}
	.inline-alert--error {
		background: var(--red-dim);
		border: 1px solid var(--red-border);
		color: var(--red);
	}

	/* Content blocks */
	.content-block {
		background: white;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		margin-bottom: 16px;
		flex-shrink: 0;
	}
	.content-block--editor {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 480px;
	}
	.content-block--editor :global(.editor-root) {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		min-height: 0 !important;
		background: transparent !important;
	}
	.content-block--editor :global(.editor-content) {
		flex: 1;
		min-height: 340px;
	}
	.content-block__label {
		display: flex;
		align-items: center;
		gap: 7px;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.content-block__label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}
	.content-block__label-row .content-block__label {
		border-bottom: none;
		background: transparent;
		flex: 1;
	}
	.required-star {
		color: var(--red);
		margin-left: 2px;
	}
	.format-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		padding: 0 16px;
	}

	/* Title input */
	.title-input {
		display: block;
		width: 100%;
		box-sizing: border-box;
		padding: 14px 20px;
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 700;
		line-height: 1.4;
		color: var(--text-primary);
		background: white;
		border: none;
		outline: none;
		letter-spacing: -0.01em;
		transition: background 150ms ease;
	}
	.title-input::placeholder {
		color: var(--text-ghost);
		font-weight: 400;
		font-family: var(--font-body);
	}
	.title-input:focus {
		background: #fefefe;
		box-shadow: inset 0 -2px 0 var(--primary);
	}

	/* Preview canvas */
	.preview-canvas {
		padding: 24px 28px;
		font-family: var(--font-body);
		font-size: 15px;
		line-height: 1.75;
		color: var(--text-secondary);
		min-height: 320px;
		max-height: 580px;
		overflow-y: auto;
	}
	.preview-canvas--split {
		min-height: 200px;
		max-height: 520px;
		padding: 16px 20px;
		overflow-y: auto;
	}
	:global(.preview-empty) {
		color: var(--text-ghost);
		font-style: italic;
		font-size: 13px;
	}

	/* Split layout */
	.split-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-bottom: 16px;
	}
	.split-pane {
		margin-bottom: 0;
	}

	/* Live badge */
	.badge-live-sm {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: #059669;
		background: var(--green-dim);
		border: 1px solid var(--green-border);
		border-radius: var(--radius-full);
		padding: 3px 10px;
		margin-right: 12px;
		white-space: nowrap;
	}
	.live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #059669;
		animation: pulse-live 1.8s infinite ease-in-out;
	}
	@keyframes pulse-live {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.8); }
	}

	/* Hide on mobile */
	@media (max-width: 767px) {
		.hide-mobile {
			display: none !important;
		}
		.builder-workspace {
			height: auto;
			overflow: visible;
		}
		.builder-main {
			padding: 14px 14px 24px;
		}
		.split-layout {
			grid-template-columns: 1fr;
		}
		.builder-topbar {
			flex-wrap: wrap;
			padding: 10px 14px;
		}
		.topbar-title {
			font-size: 14px;
		}
	}

	/* Preview HTML content styles */
	:global(.preview-canvas h1) {
		font-family: var(--font-macro);
		font-size: 1.7rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 0.5em;
		margin-top: 1.2em;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}
	:global(.preview-canvas h2) {
		font-family: var(--font-macro);
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 0.4em;
		margin-top: 1.1em;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border-hard);
		letter-spacing: -0.02em;
	}
	:global(.preview-canvas h3) {
		font-family: var(--font-macro);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 0.4em;
		margin-top: 1em;
	}
	:global(.preview-canvas p) {
		margin-bottom: 0.9em;
	}
	:global(.preview-canvas ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
	:global(.preview-canvas ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
	:global(.preview-canvas li) {
		margin-bottom: 0.3em;
	}
	:global(.preview-canvas code) {
		font-family: var(--font-mono);
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: 5px;
		padding: 2px 6px;
		color: #4338ca;
		font-size: 0.88em;
		font-weight: 600;
	}
	:global(.preview-canvas pre) {
		position: relative;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: var(--radius-md);
		padding: 16px;
		font-family: var(--font-mono);
		font-size: 13px;
		color: #f8fafc;
		overflow-x: auto;
		margin-bottom: 1em;
		line-height: 1.55;
	}
	:global(.preview-canvas pre code) {
		background: transparent;
		border: none;
		color: inherit;
		padding: 0;
		font-size: inherit;
	}
	:global(.preview-canvas blockquote) {
		border-left: 4px solid var(--primary);
		padding: 8px 16px;
		color: var(--text-secondary);
		font-style: italic;
		margin-bottom: 1rem;
		background: var(--primary-light);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	/* Image & alignment preview styles */
	:global(.preview-canvas figure),
	:global(.preview-canvas .tiptap-image-figure) {
		display: flex;
		margin: 1em 0;
	}
	:global(.preview-canvas figure[data-alignment='left']),
	:global(.preview-canvas .tiptap-image-figure[data-alignment='left']) {
		justify-content: flex-start;
	}
	:global(.preview-canvas figure[data-alignment='center']),
	:global(.preview-canvas .tiptap-image-figure[data-alignment='center']) {
		justify-content: center;
	}
	:global(.preview-canvas figure[data-alignment='right']),
	:global(.preview-canvas .tiptap-image-figure[data-alignment='right']) {
		justify-content: flex-end;
	}
	:global(.preview-canvas figure[data-alignment='full']),
	:global(.preview-canvas .tiptap-image-figure[data-alignment='full']) {
		display: block;
		width: 100%;
	}
	:global(.preview-canvas figure img),
	:global(.preview-canvas img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		display: inline-block;
	}
	:global(.preview-canvas figure[data-alignment='full'] img),
	:global(.preview-canvas .tiptap-image-figure[data-alignment='full'] img) {
		width: 100% !important;
	}

	/* ── Code block box (preview) ── */
	:global(.preview-canvas .tiptap-code-block-wrapper) {
		margin: 1.25em 0;
		border-radius: var(--radius-md);
		border: 1px solid #334155;
		background: #0f172a;
		overflow: hidden;
		box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.25);
	}
	:global(.preview-canvas .code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 14px;
		background: #1e293b;
		border-bottom: 1px solid #334155;
		user-select: none;
	}
	:global(.preview-canvas .mac-dots) {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	:global(.preview-canvas .mac-dot) {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}
	:global(.preview-canvas .mac-dot--red)    { background: #ff5f56; border: 1px solid #e0443e; }
	:global(.preview-canvas .mac-dot--yellow) { background: #ffbd2e; border: 1px solid #dea123; }
	:global(.preview-canvas .mac-dot--green)  { background: #27c93f; border: 1px solid #1aab29; }

	:global(.preview-canvas .code-block-lang) {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #94a3b8;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	:global(.preview-canvas .code-block-lang__tag) {
		background: rgba(255, 255, 255, 0.06);
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	:global(.preview-canvas .code-copy-btn) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		color: #94a3b8;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		cursor: pointer;
		transition: all 140ms ease;
		user-select: none;
	}
	:global(.preview-canvas .code-copy-btn:hover) {
		color: #f8fafc;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}
	:global(.preview-canvas .code-copy-btn--copied) {
		color: #34d399 !important;
		background: rgba(6, 78, 59, 0.8) !important;
		border-color: rgba(52, 211, 153, 0.4) !important;
		transform: none !important;
	}

	:global(.preview-canvas .tiptap-code-block-wrapper pre) {
		margin: 0 !important;
		padding: 16px 18px !important;
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		font-family: var(--font-mono);
		font-size: 13.5px;
		line-height: 1.65;
		color: #e2e8f0;
		overflow-x: auto;
	}
	:global(.preview-canvas .tiptap-code-block-wrapper pre code) {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		color: inherit !important;
		font-size: inherit !important;
	}

	/* YouTube Form Input Styling */
	.yt-input-field {
		box-sizing: border-box;
		display: block;
		width: 100%;
		height: 40px;
		padding: 0 16px !important;
		font-size: 12px;
		line-height: 40px;
		background-color: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		color: #0f172a;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
		outline: none;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.yt-input-field:focus {
		border-color: #f43f5e;
		box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15);
	}
	.yt-input-field::placeholder {
		color: #94a3b8;
		opacity: 1;
	}
</style>

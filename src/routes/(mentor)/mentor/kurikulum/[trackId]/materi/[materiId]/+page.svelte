<script lang="ts">
	import { onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(data.materi.title);
	let content = $state(data.materi.content || '');
	let isSaving = $state(false);

	let originalTitle = data.materi.title;
	let originalContent = data.materi.content || '';

	let isDirty = $derived(title !== originalTitle || content !== originalContent);

	// Autosave reactive state
	let saveStatus = $state<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
	let lastSavedAt = $state<Date | null>(null);

	// Confirmation modal state for leaving page with unsaved changes
	let showLeaveModal = $state(false);
	let pendingNavigateUrl = $state<string | null>(null);
	let allowNavigation = $state(false);

	let activeTab = $state<'edit' | 'preview' | 'split'>('edit');

	// Telemetry calculations
	let plainText = $derived(content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
	let wordCount = $derived(plainText ? plainText.split(' ').length : 0);
	let readingTimeMin = $derived(Math.max(1, Math.ceil(wordCount / 200)));

	let subPhaseTitle = $derived(data.materi.subPhase?.title || '');
	let phaseTitle = $derived(data.materi.subPhase?.phase?.title || '');
	let trackTitle = $derived(data.materi.subPhase?.phase?.curriculumTrack?.title || '');

	// Debounced autosave implementation
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	const DEBOUNCE_MS = 2000;

	async function performAutosave() {
		if (!isDirty || isSaving || !title.trim()) return;

		saveStatus = 'saving';
		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('content', content);

			const res = await fetch('?/updateMateri', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (res.ok) {
				const json = await res.json();
				if (json.type === 'success' || res.status === 200) {
					originalTitle = title;
					originalContent = content;
					saveStatus = 'saved';
					lastSavedAt = new Date();
					return;
				}
			}
			saveStatus = 'error';
		} catch (err) {
			console.error('Autosave failed:', err);
			saveStatus = 'error';
		}
	}

	$effect(() => {
		const currTitle = title;
		const currContent = content;

		if (currTitle !== originalTitle || currContent !== originalContent) {
			if (saveStatus !== 'saving') {
				saveStatus = 'unsaved';
			}
			if (autosaveTimer) clearTimeout(autosaveTimer);
			autosaveTimer = setTimeout(() => {
				performAutosave();
			}, DEBOUNCE_MS);
		} else {
			if (autosaveTimer) clearTimeout(autosaveTimer);
			if (saveStatus !== 'saving') {
				saveStatus = 'saved';
			}
		}
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
				await update();
				isSaving = false;
				if (result.type === 'success') {
					originalTitle = title;
					originalContent = content;
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
					<a href="/mentor/kurikulum" class="breadcrumb-link">Kurikulum</a>
					<svg class="breadcrumb-sep" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<a href="/mentor/kurikulum/{data.trackId}" class="breadcrumb-link">{trackTitle || 'Track'}</a>
					<svg class="breadcrumb-sep" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<span class="breadcrumb-current">{phaseTitle}</span>
				</nav>

				<div class="topbar-title-row">
					<h1 class="topbar-title">
						<span class="materi-order">M-{data.materi.sortOrder}</span>
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
							<dd class="info-value info-value--badge">M-{data.materi.sortOrder}</dd>
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
					<div class="inline-alert inline-alert--error" role="alert">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						{form.error}
					</div>
				{/if}

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

				<!-- Hidden content field -->
				<input type="hidden" name="content" value={content} />

				<!-- Editor area by mode -->
				{#if activeTab === 'edit'}
					<div class="content-block content-block--editor">
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
						</div>
					</div>
				{/if}
			</main>
		</div>
	<!-- Leave Confirmation Modal -->
	<ConfirmModal
		bind:open={showLeaveModal}
		title="Perubahan Belum Disimpan"
		message="Modul materi yang Anda edit memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?"
		confirmText="Tinggalkan Halaman"
		cancelText="Lanjut Edit"
		variant="warning"
		onconfirm={confirmLeave}
		oncancel={cancelLeave}
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
		z-index: 80;
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
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
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
</style>

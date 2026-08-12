<script lang="ts">
	import { enhance } from '$app/forms';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(data.materi.title);
	let content = $state(data.materi.content || '');
	let isSaving = $state(false);

	let originalTitle = data.materi.title;
	let originalContent = data.materi.content || '';

	let isDirty = $derived(title !== originalTitle || content !== originalContent);

	let activeTab = $state<'edit' | 'preview' | 'split'>('edit');

	// Telemetry calculations
	let plainText = $derived(content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
	let wordCount = $derived(plainText ? plainText.split(' ').length : 0);
	let readingTimeMin = $derived(Math.max(1, Math.ceil(wordCount / 200)));

	let subPhaseTitle = $derived(data.materi.subPhase?.title || '');
	let phaseTitle = $derived(data.materi.subPhase?.phase?.title || '');
	let trackTitle = $derived(data.materi.subPhase?.phase?.curriculumTrack?.title || '');

	// Keyboard shortcut Ctrl+S / Cmd+S handler
	function handleKeyDown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			const formEl = document.getElementById('materi-form') as HTMLFormElement;
			if (formEl && !isSaving) {
				formEl.requestSubmit();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<svelte:head>
	<title>Edit Materi: {title} — NLC</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-8">
	<form
		id="materi-form"
		method="POST"
		action="?/updateMateri"
		use:enhance={() => {
			isSaving = true;
			return async ({ result, update }) => {
				await update();
				isSaving = false;
				if (result.type === 'success') {
					originalTitle = title;
					originalContent = content;
				}
			};
		}}
	>
		<!-- HEADER NAV -->
		<header class="panel p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 mb-2 flex-wrap">
					<a href="/mentor/kurikulum" class="type-mono hover:text-[var(--text-primary)]">Kurikulum</a>
					<span class="type-mono text-muted">•</span>
					<a href="/mentor/kurikulum/{data.trackId}" class="type-mono hover:text-[var(--text-primary)]">{trackTitle}</a>
					<span class="type-mono text-muted">•</span>
					<span class="type-mono text-muted">{phaseTitle}</span>
					<span class="type-mono text-muted">•</span>
					<span class="badge badge-hadir">{subPhaseTitle}</span>
				</div>
				<h1 style="font-family: var(--font-macro); font-size: 1.75rem; font-weight: 800; color: var(--text-primary);" class="flex items-center gap-3 flex-wrap">
					<span>Editor Materi: M-{data.materi.sortOrder}</span>
					{#if isDirty}
						<span class="badge badge-pending">
							Unsaved Changes (Ctrl+S)
						</span>
					{/if}
				</h1>
			</div>

			<div class="flex items-center gap-3 flex-wrap">
				<!-- VIEW MODE SWITCHER -->
				<div class="flex items-center panel-inset p-1">
					<button
						type="button"
						onclick={() => (activeTab = 'edit')}
						class="btn-ghost"
						style="padding: 4px 12px; font-size: 12px; {activeTab === 'edit' ? 'background: var(--primary); color: white;' : ''}"
					>
						Editor
					</button>
					<button
						type="button"
						onclick={() => (activeTab = 'split')}
						class="btn-ghost hidden lg:block"
						style="padding: 4px 12px; font-size: 12px; {activeTab === 'split' ? 'background: var(--primary); color: white;' : ''}"
					>
						Split
					</button>
					<button
						type="button"
						onclick={() => (activeTab = 'preview')}
						class="btn-ghost"
						style="padding: 4px 12px; font-size: 12px; {activeTab === 'preview' ? 'background: var(--primary); color: white;' : ''}"
					>
						Preview
					</button>
				</div>

				<a
					href="/mentor/kurikulum/{data.trackId}"
					class="btn-ghost"
					style="padding: 8px 16px; font-size: 13px;"
				>
					← Kembali
				</a>

				<button
					type="submit"
					disabled={isSaving}
					class="btn-primary"
					style="width: auto; padding: 8px 20px; font-size: 13px;"
				>
					{isSaving ? 'Menyimpan...' : 'Simpan Materi'}
				</button>
			</div>
		</header>

		<!-- TELEMETRY METRICS STRIP -->
		<div class="panel p-4 mb-6 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
			<div class="flex items-center gap-4 text-[var(--text-secondary)]">
				<span>METRIK:</span>
				<span class="text-[var(--text-primary)] font-bold">{wordCount} <strong class="text-[var(--text-muted)] font-normal">Kata</strong></span>
				<span>•</span>
				<span class="text-[var(--text-primary)] font-bold">~{readingTimeMin} <strong class="text-[var(--text-muted)] font-normal">Menit Baca</strong></span>
			</div>

			<div class="text-[var(--text-muted)]">
				Tekan <kbd class="px-1.5 py-0.5 bg-[var(--bg-inset)] border border-[var(--border-hard)] text-[var(--text-primary)] rounded">Ctrl + S</kbd> untuk quick save
			</div>
		</div>

		<!-- NOTIFICATIONS -->
		{#if form?.error}
			<div class="alert-error mb-6">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="panel p-4 mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-sm">
				{form.message}
			</div>
		{/if}

		<!-- MAIN INPUT & EDITOR AREA -->
		<div class="space-y-6">
			<!-- TITLE INPUT -->
			<div class="panel p-5">
				<label for="materi-title-input" class="field-label">Judul Modul Materi *</label>
				<input
					id="materi-title-input"
					type="text"
					name="title"
					bind:value={title}
					required
					class="field-input"
				/>
			</div>

			<!-- Hidden input for form submission -->
			<input type="hidden" name="content" value={content} />

			<!-- EDITOR / PREVIEW LAYOUT -->
			{#if activeTab === 'edit'}
				<div class="panel p-5">
					<div class="flex items-center justify-between text-[var(--text-secondary)] text-sm font-semibold mb-3">
						<span>Konten Isi Materi (Tiptap Editor)</span>
						<span class="type-mono text-muted">Format: HTML</span>
					</div>
					<TiptapEditor bind:value={content} placeholder="Ketik modul pembelajaran, penjelasan konsep, snippet command Cisco/Linux..." />
				</div>
			{:else if activeTab === 'preview'}
				<div class="panel p-6">
					<div class="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
						<span class="font-semibold text-[var(--text-primary)]">Live Preview</span>
						<span class="badge badge-hadir">Live Render</span>
					</div>

					<div class="panel-inset p-6 font-sans text-[var(--text-secondary)] text-base leading-relaxed min-h-[400px]">
						{@html content || '<p class="type-mono text-muted">Belum ada konten materi.</p>'}
					</div>
				</div>
			{:else}
				<!-- SPLIT VIEW MODE -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- LEFT: EDITOR -->
					<div class="panel p-5">
						<div class="font-semibold text-[var(--text-primary)] text-sm mb-3">Editor Tiptap</div>
						<TiptapEditor bind:value={content} placeholder="Ketik modul pembelajaran..." />
					</div>

					<!-- RIGHT: LIVE PREVIEW -->
					<div class="panel p-5">
						<div class="flex justify-between items-center pb-3 mb-3 border-b border-[var(--border-soft)]">
							<span class="font-semibold text-[var(--text-primary)] text-sm">Preview</span>
							<span class="badge badge-hadir">Live</span>
						</div>
						<div class="panel-inset p-4 font-sans text-[var(--text-secondary)] text-sm leading-relaxed min-h-[350px]">
							{@html content || '<p class="type-mono text-muted">Belum ada konten.</p>'}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</form>
</div>

<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { ResizableImage } from '$lib/tiptap/ResizableImage';

import { CustomCodeBlock } from '$lib/tiptap/CustomCodeBlock';

	let {
		value = $bindable(''),
		placeholder = 'Ketik materi pembelajaran, penjelasan konsep, atau snippet kode...',
		disabled = false,
		saveStatus = 'saved',
		lastSavedAt = null,
		onchange
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		saveStatus?: 'saved' | 'unsaved' | 'saving' | 'error';
		lastSavedAt?: Date | null;
		onchange?: (html: string) => void;
	} = $props();

	let element    = $state<HTMLDivElement | null>(null);
	let editor     = $state<Editor | null>(null);
	let editorRoot = $state<HTMLDivElement | null>(null);

	// ── Main toolbar active states ──
	let isBold        = $state(false);
	let isItalic      = $state(false);
	let isCode        = $state(false);
	let isCodeBlock   = $state(false);
	let isHeading1    = $state(false);
	let isHeading2    = $state(false);
	let isHeading3    = $state(false);
	let isBulletList  = $state(false);
	let isOrderedList = $state(false);
	let isBlockquote  = $state(false);
	let isImage       = $state(false);
	let canUndo       = $state(false);
	let canRedo       = $state(false);

	// ── Stats ──
	let charCount = $state(0);
	let wordCount = $state(0);

	// ── Image INSERT dialog ──
	let showInsertDialog = $state(false);
	let insertUrl        = $state('');
	let insertAlt        = $state('');
	let insertInputEl    = $state<HTMLInputElement | null>(null);

	// ── Image EDIT dialog ──
	let showEditDialog = $state(false);
	let editUrl        = $state('');
	let editAlt        = $state('');
	let editInputEl    = $state<HTMLInputElement | null>(null);

	// ── Floating image toolbar ──
	// position: fixed → viewport coords
	let imgToolbarVisible = $state(false);
	let imgToolbarX       = $state(0);
	let imgToolbarY       = $state(0);
	let activeImageAlign  = $state<'left' | 'center' | 'right' | 'full'>('center');

	// ── Text selection bubble menu ──
	// position: fixed → viewport coords → never overlaps selected text
	let bubbleVisible = $state(false);
	let bubbleX       = $state(0);
	let bubbleY       = $state(0);

	function syncActiveStates() {
		if (!editor) return;
		isBold        = editor.isActive('bold');
		isItalic      = editor.isActive('italic');
		isCode        = editor.isActive('code');
		isCodeBlock   = editor.isActive('codeBlock');
		isHeading1    = editor.isActive('heading', { level: 1 });
		isHeading2    = editor.isActive('heading', { level: 2 });
		isHeading3    = editor.isActive('heading', { level: 3 });
		isBulletList  = editor.isActive('bulletList');
		isOrderedList = editor.isActive('orderedList');
		isBlockquote  = editor.isActive('blockquote');
		isImage       = editor.isActive('resizableImage');
		canUndo       = editor.can().undo();
		canRedo       = editor.can().redo();

		if (isImage) {
			const attrs = editor.getAttributes('resizableImage');
			activeImageAlign = attrs.alignment || 'center';
		}

		const text = editor.getText();
		charCount  = text.length;
		wordCount  = text.trim() ? text.trim().split(/\s+/).length : 0;
	}

	// ── Position bubble menu using VIEWPORT (fixed) coords ──
	// The menu appears ABOVE the selection, not on it.
	function positionBubble() {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
			bubbleVisible = false;
			return;
		}
		const range   = sel.getRangeAt(0);
		const selRect = range.getBoundingClientRect();

		if (selRect.width === 0 && selRect.height === 0) {
			bubbleVisible = false;
			return;
		}

		// Center on selection, place ABOVE with 12px gap so caret doesn't touch text
		bubbleX = selRect.left + selRect.width / 2;
		bubbleY = selRect.top - 12;  // 12px above selection top
		bubbleVisible = true;
	}

	// ── Position image toolbar using VIEWPORT (fixed) coords ──
	function positionImageToolbar() {
		if (!editor || !editorRoot) return;
		const selected = editorRoot.querySelector('.ProseMirror-selectednode') as HTMLElement | null;
		if (!selected) { imgToolbarVisible = false; return; }
		const rect = selected.getBoundingClientRect();
		// Center on image, sit above it with 12px gap
		imgToolbarX = rect.left + rect.width / 2;
		imgToolbarY = rect.top - 12;
		imgToolbarVisible = true;
	}

	let blurTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (!browser || !element) return;

		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({ codeBlock: false }),
				CustomCodeBlock,
				ResizableImage
			],
			content: value,
			editable: !disabled,
			onUpdate: ({ editor: ed }) => {
				const html = ed.getHTML();
				value = html;
				onchange?.(html);
				syncActiveStates();
			},
			onSelectionUpdate: () => {
				syncActiveStates();
				tick().then(() => {
					// Image toolbar is shown ONLY on click (see click handler below)
					// Bubble menu shown on text selection
					if (!isImage) {
						imgToolbarVisible = false;
						positionBubble();
					} else {
						// User may have selected image via keyboard — hide bubble
						bubbleVisible = false;
					}
				});
			},
			onTransaction: () => { syncActiveStates(); },
			onFocus: () => {
				if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
			},
			onBlur: () => {
				blurTimer = setTimeout(() => {
					bubbleVisible    = false;
					imgToolbarVisible = false;
				}, 200);
			}
		});

		syncActiveStates();

		// ── Image click handler: show toolbar ONLY on left click on image ──
		const onEditorClick = (e: MouseEvent) => {
			if (e.button !== 0) return; // left click only
			const target = e.target as HTMLElement;
			if (target.closest('.tiptap-image-wrapper') || target.closest('.tiptap-image-figure')) {
				bubbleVisible = false;
				// small tick so ProseMirror has processed the click selection
				tick().then(positionImageToolbar);
			} else {
				imgToolbarVisible = false;
			}
		};
		element.addEventListener('click', onEditorClick);

		// ── Outside click closes both menus ──
		const onOutside = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (!t.closest('.editor-float-menu') && !t.closest('.tiptap-image-wrapper')) {
				imgToolbarVisible = false;
			}
			if (!t.closest('.editor-float-menu') && !t.closest('.editor-content')) {
				bubbleVisible = false;
			}
		};
		document.addEventListener('mousedown', onOutside);

		// ── Re-position on scroll so fixed menus stay aligned ──
		const onScroll = () => {
			if (imgToolbarVisible) positionImageToolbar();
			if (bubbleVisible)     positionBubble();
		};
		window.addEventListener('scroll', onScroll, true);

		return () => {
			element?.removeEventListener('click', onEditorClick);
			document.removeEventListener('mousedown', onOutside);
			window.removeEventListener('scroll', onScroll, true);
		};
	});

	onDestroy(() => {
		editor?.destroy();
		if (blurTimer) clearTimeout(blurTimer);
	});

	$effect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value);
		}
	});

	$effect(() => {
		if (editor) editor.setEditable(!disabled);
	});

	// ── Image alignment & delete ──
	function setImageAlignment(align: 'left' | 'center' | 'right' | 'full') {
		editor?.chain().focus().updateImageAlignment(align).run();
		activeImageAlign = align;
		tick().then(positionImageToolbar);
	}
	function deleteImage() {
		editor?.chain().focus().deleteSelection().run();
		imgToolbarVisible = false;
	}

	// ── Open edit dialog for selected image ──
	function openEditDialog() {
		if (!editor) return;
		const attrs = editor.getAttributes('resizableImage');
		editUrl = attrs.src || '';
		editAlt = attrs.alt || '';
		showEditDialog = true;
		imgToolbarVisible = false;
		setTimeout(() => editInputEl?.focus(), 50);
	}
	function closeEditDialog() { showEditDialog = false; editUrl = ''; editAlt = ''; }
	function applyEditImage() {
		const url = editUrl.trim();
		if (!url || !editor) return;
		editor.chain().focus().updateAttributes('resizableImage', { src: url, alt: editAlt }).run();
		closeEditDialog();
	}

	// ── Image INSERT dialog ──
	function openInsertDialog() {
		insertUrl = ''; insertAlt = '';
		showInsertDialog = true;
		setTimeout(() => insertInputEl?.focus(), 50);
	}
	function closeInsertDialog() { showInsertDialog = false; insertUrl = ''; insertAlt = ''; }
	function insertImage() {
		const url = insertUrl.trim();
		if (!url || !editor) return;
		editor.chain().focus().setResizableImage({ src: url, alt: insertAlt, alignment: 'center' }).run();
		closeInsertDialog();
	}
	function handleFileUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => { insertUrl = ev.target?.result as string; };
		reader.readAsDataURL(file);
	}
</script>

<!-- ══════════════ INSERT DIALOG ══════════════ -->
{#if showInsertDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={closeInsertDialog} role="dialog" aria-modal="true" aria-label="Insert Image">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="dialog-panel" onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Enter') insertImage(); if (e.key === 'Escape') closeInsertDialog(); }}>
			<div class="dialog-header">
				<div class="dialog-title">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan Gambar
				</div>
				<button type="button" class="dialog-close" onclick={closeInsertDialog} aria-label="Tutup">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="dialog-body">
				<div class="form-field">
					<label for="ins-url" class="form-label">URL Gambar</label>
					<input id="ins-url" bind:this={insertInputEl} type="url" bind:value={insertUrl}
						placeholder="https://example.com/image.png" class="form-input" />
				</div>
				<div class="or-row"><span class="or-line"></span><span class="or-text">atau unggah file</span><span class="or-line"></span></div>
				<div class="upload-zone">
					<label for="ins-file" class="upload-label">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Pilih dari Komputer
					</label>
					<input id="ins-file" type="file" accept="image/*" class="sr-only" onchange={handleFileUpload} />
				</div>
				{#if insertUrl}
					<div class="img-preview"><img src={insertUrl} alt={insertAlt || 'preview'} class="img-preview__thumb" /></div>
				{/if}
				<div class="form-field">
					<label for="ins-alt" class="form-label">Teks Alt <span class="form-optional">opsional</span></label>
					<input id="ins-alt" type="text" bind:value={insertAlt} placeholder="Deskripsi gambar..." class="form-input" />
				</div>
			</div>
			<div class="dialog-footer">
				<button type="button" class="btn-ghost-sm" onclick={closeInsertDialog}>Batal</button>
				<button type="button" class="btn-primary-sm" onclick={insertImage} disabled={!insertUrl.trim()}>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ══════════════ EDIT IMAGE DIALOG ══════════════ -->
{#if showEditDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={closeEditDialog} role="dialog" aria-modal="true" aria-label="Edit Image">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="dialog-panel" onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Enter') applyEditImage(); if (e.key === 'Escape') closeEditDialog(); }}>
			<div class="dialog-header">
				<div class="dialog-title">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
					Edit Gambar
				</div>
				<button type="button" class="dialog-close" onclick={closeEditDialog} aria-label="Tutup">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="dialog-body">
				<div class="form-field">
					<label for="edit-url" class="form-label">URL Gambar</label>
					<input id="edit-url" bind:this={editInputEl} type="url" bind:value={editUrl}
						placeholder="https://example.com/image.png" class="form-input" />
				</div>
				{#if editUrl}
					<div class="img-preview"><img src={editUrl} alt={editAlt || 'preview'} class="img-preview__thumb" /></div>
				{/if}
				<div class="form-field">
					<label for="edit-alt" class="form-label">Teks Alt <span class="form-optional">opsional</span></label>
					<input id="edit-alt" type="text" bind:value={editAlt} placeholder="Deskripsi gambar..." class="form-input" />
				</div>
			</div>
			<div class="dialog-footer">
				<button type="button" class="btn-ghost-sm" onclick={closeEditDialog}>Batal</button>
				<button type="button" class="btn-primary-sm" onclick={applyEditImage} disabled={!editUrl.trim()}>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
					Simpan
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ══════════════ EDITOR ROOT ══════════════ -->
<div class="editor-root" class:editor-root--disabled={disabled} bind:this={editorRoot}>

	<!-- ── MAIN TOOLBAR ── -->
	{#if editor && !disabled}
		<div class="toolbar" role="toolbar" aria-label="Format teks">
			<div class="toolbar-group">
				<button type="button" class="tb-btn" class:tb-btn--on={isBold}
					onclick={() => editor?.chain().focus().toggleBold().run()}
					aria-label="Bold" aria-pressed={isBold} data-tooltip="Bold ⌘B">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
				</button>
				<button type="button" class="tb-btn" class:tb-btn--on={isItalic}
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					aria-label="Italic" aria-pressed={isItalic} data-tooltip="Italic ⌘I">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
				</button>
				<button type="button" class="tb-btn" class:tb-btn--on={isCode}
					onclick={() => editor?.chain().focus().toggleCode().run()}
					aria-label="Inline code" aria-pressed={isCode} data-tooltip="Code ⌘E">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
				</button>
			</div>

			<div class="toolbar-sep"></div>

			<div class="toolbar-group">
				{#each [1, 2, 3] as level}
					<button type="button" class="tb-btn tb-btn--text"
						class:tb-btn--on={level === 1 ? isHeading1 : level === 2 ? isHeading2 : isHeading3}
						onclick={() => editor?.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()}
						aria-label="Heading {level}" data-tooltip="Heading {level}">H{level}</button>
				{/each}
			</div>

			<div class="toolbar-sep"></div>

			<div class="toolbar-group">
				<button type="button" class="tb-btn" class:tb-btn--on={isBulletList}
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					aria-label="Bullet list" data-tooltip="Bullet list">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
				</button>
				<button type="button" class="tb-btn" class:tb-btn--on={isOrderedList}
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					aria-label="Numbered list" data-tooltip="Numbered list">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
				</button>
				<button type="button" class="tb-btn" class:tb-btn--on={isCodeBlock}
					onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
					aria-label="Code block" data-tooltip="Code block">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>
				</button>
				<button type="button" class="tb-btn" class:tb-btn--on={isBlockquote}
					onclick={() => editor?.chain().focus().toggleBlockquote().run()}
					aria-label="Quote" data-tooltip="Quote">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				</button>
			</div>

			<div class="toolbar-sep"></div>

			<div class="toolbar-group">
				<button type="button" class="tb-btn tb-btn--img"
					onclick={openInsertDialog} aria-label="Insert image" data-tooltip="Insert image">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
				</button>
			</div>

			<div class="toolbar-group toolbar-group--end">
				<button type="button" class="tb-btn" onclick={() => editor?.chain().focus().undo().run()}
					disabled={!canUndo} aria-label="Undo" data-tooltip="Undo ⌘Z">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
				</button>
				<button type="button" class="tb-btn" onclick={() => editor?.chain().focus().redo().run()}
					disabled={!canRedo} aria-label="Redo" data-tooltip="Redo ⌘Y">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- ProseMirror canvas (no wrapper needed — menus use position:fixed) -->
	<div bind:this={element} class="editor-content"></div>

	<!-- ── STATUS BAR ── -->
	<div class="statusbar">
		<div class="statusbar-left">
			<span class="statusbar-brand">TipTap</span>
			<span class="statusbar-dot">·</span>
			<span class="statusbar-autosave statusbar-autosave--{saveStatus}">
				{#if saveStatus === 'saving'}
					<svg class="spin-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
					<span>Menyimpan otomatis...</span>
				{:else if saveStatus === 'saved'}
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
					<span>Tersimpan {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
				{:else if saveStatus === 'unsaved'}
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<span>Belum disimpan</span>
				{:else if saveStatus === 'error'}
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
					<span>Gagal menyimpan otomatis</span>
				{/if}
			</span>
		</div>
		<div class="statusbar-stats">
			<span>{wordCount} kata</span>
			<span class="statusbar-dot">·</span>
			<span>{charCount} kar.</span>
		</div>
	</div>
</div>

<!-- ══════════════ FLOATING: TEXT BUBBLE MENU (position:fixed) ══════════════ -->
<!-- Rendered OUTSIDE editor-root so overflow:hidden can't clip it -->
{#if bubbleVisible && !isImage}
	<div
		class="editor-float-menu bubble-menu"
		style="left:{bubbleX}px; top:{bubbleY}px;"
		role="toolbar"
		aria-label="Text formatting"
	>
		<div class="float-caret float-caret--down"></div>

		<div class="float-group">
			<button type="button" class="float-btn" class:float-btn--on={isBold}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
				aria-label="Bold" title="Bold ⌘B">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={isItalic}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
				aria-label="Italic" title="Italic ⌘I">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={isCode}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }}
				aria-label="Inline Code" title="Inline Code ⌘E">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
			</button>
		</div>

		<div class="float-sep"></div>

		<div class="float-group">
			<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading1}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }}
				title="H1">H1</button>
			<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading2}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}
				title="H2">H2</button>
			<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading3}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 3 }).run(); }}
				title="H3">H3</button>
		</div>

		<div class="float-sep"></div>

		<div class="float-group">
			<button type="button" class="float-btn" class:float-btn--on={isBulletList}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
				title="Bullet list">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={isOrderedList}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
				title="Numbered list">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={isCodeBlock}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run(); }}
				aria-label="Code Block" title="Code Block">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={isBlockquote}
				onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}
				title="Quote">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
			</button>
		</div>
	</div>
{/if}

<!-- ══════════════ FLOATING: IMAGE TOOLBAR (position:fixed, click-only) ══════════════ -->
{#if imgToolbarVisible && isImage}
	<div
		class="editor-float-menu image-menu"
		style="left:{imgToolbarX}px; top:{imgToolbarY}px;"
		role="toolbar"
		aria-label="Image options"
	>
		<div class="float-caret float-caret--down"></div>

		<!-- Context chip -->
		<span class="image-chip" aria-hidden="true">
			<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
			Gambar
		</span>

		<div class="float-sep"></div>

		<!-- Alignment group -->
		<div class="float-group" role="group" aria-label="Alignment">
			<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'left'}
				onmousedown={(e) => { e.preventDefault(); setImageAlignment('left'); }} title="Kiri">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'center'}
				onmousedown={(e) => { e.preventDefault(); setImageAlignment('center'); }} title="Tengah">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'right'}
				onmousedown={(e) => { e.preventDefault(); setImageAlignment('right'); }} title="Kanan">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
			</button>
			<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'full'}
				onmousedown={(e) => { e.preventDefault(); setImageAlignment('full'); }} title="Full width">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><rect x="3" y="10" width="18" height="4" rx="1"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
			</button>
		</div>

		<div class="float-sep"></div>

		<!-- Edit button -->
		<button type="button" class="float-btn float-btn--edit"
			onmousedown={(e) => { e.preventDefault(); openEditDialog(); }} title="Edit gambar">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
		</button>

		<!-- Delete button -->
		<button type="button" class="float-btn float-btn--del"
			onmousedown={(e) => { e.preventDefault(); deleteImage(); }} title="Hapus gambar">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
		</button>
	</div>
{/if}

<style>
	/* Z-INDEX SCALE: toolbar=10 | floating=20 | dialog=30 */

	/* ── Editor root ── */
	.editor-root {
		background: #fff;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: border-color 180ms ease, box-shadow 180ms ease;
	}
	.editor-root:focus-within {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}
	.editor-root--disabled { opacity: 0.6; pointer-events: none; }

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 2px;
		padding: 6px 10px;
		background: var(--bg-inset);
		border-bottom: 1px solid var(--border-hard);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.toolbar-group { display: flex; align-items: center; gap: 1px; }
	.toolbar-group--end { margin-left: auto; }
	.toolbar-sep { width: 1px; height: 18px; background: var(--border-hard); margin: 0 6px; flex-shrink: 0; }

	.tb-btn {
		position: relative;
		display: inline-flex; align-items: center; justify-content: center;
		width: 30px; height: 30px;
		border-radius: 8px; border: 1.5px solid transparent;
		background: transparent; color: var(--text-muted);
		cursor: pointer; transition: background 120ms, color 120ms, border-color 120ms;
		font-family: var(--font-macro); font-size: 11.5px; font-weight: 800;
	}
	.tb-btn:hover:not(:disabled) { background: white; border-color: var(--border-hard); color: var(--text-primary); }
	.tb-btn--on { background: var(--primary-light) !important; border-color: var(--primary-border) !important; color: var(--primary) !important; }
	.tb-btn--img:hover:not(:disabled) { background: #ecfdf5 !important; border-color: #a7f3d0 !important; color: #059669 !important; }
	.tb-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.tb-btn--text { font-size: 11px; }

	.tb-btn[data-tooltip]::after {
		content: attr(data-tooltip);
		position: absolute; bottom: calc(100% + 6px); left: 50%;
		transform: translateX(-50%) scale(0.9);
		white-space: nowrap; background: #0f172a; color: #f8fafc;
		font-family: var(--font-body); font-size: 11px; font-weight: 500;
		padding: 4px 8px; border-radius: 6px; pointer-events: none;
		opacity: 0; transition: opacity 120ms, transform 120ms;
		z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}
	.tb-btn[data-tooltip]:hover::after { opacity: 1; transform: translateX(-50%) scale(1); }

	/* ── Status bar ── */
	.statusbar {
		padding: 6px 14px; background: var(--bg-inset); border-top: 1px solid var(--border-hard);
		display: flex; align-items: center; justify-content: space-between;
		font-family: var(--font-mono); font-size: 10.5px; color: var(--text-ghost); flex-shrink: 0;
	}
	.statusbar-left { display: flex; align-items: center; gap: 6px; }
	.statusbar-brand { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.statusbar-stats { display: flex; align-items: center; gap: 5px; }
	.statusbar-dot { opacity: 0.4; }

	.statusbar-autosave {
		display: inline-flex; align-items: center; gap: 4px;
		font-family: var(--font-body); font-size: 11px; font-weight: 500;
		transition: color 150ms ease;
	}
	.statusbar-autosave--saved { color: #059669; }
	.statusbar-autosave--unsaved { color: #d97706; }
	.statusbar-autosave--saving { color: var(--primary); }
	.statusbar-autosave--error { color: #dc2626; }

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.spin-icon { animation: spin 1s linear infinite; }

	/* ══════════════════════════════════════════
	   FLOATING MENUS — position:fixed
	   Rendered outside editor-root in DOM so
	   overflow:hidden cannot clip them.
	   Coordinates are viewport-relative.
	══════════════════════════════════════════ */
	:global(.editor-float-menu) {
		position: fixed;
		z-index: 20;
		/* Center on X, sit above Y with caret pointing down */
		transform: translate(-50%, -100%);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 5px 6px;
		border-radius: 10px;
		pointer-events: auto;
		white-space: nowrap;
		animation: floatIn 160ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes floatIn {
		from { opacity: 0; transform: translate(-50%, calc(-100% + 8px)) scale(0.94); }
		to   { opacity: 1; transform: translate(-50%, -100%)             scale(1);    }
	}

	/* Down caret */
	:global(.float-caret) {
		position: absolute;
		bottom: -5px;
		left: 50%;
		transform: translateX(-50%);
		width: 0; height: 0;
		border-style: solid;
		border-width: 5px 5px 0 5px;
	}

	/* ── Light bubble menu (text selection) ── */
	:global(.bubble-menu) {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06);
	}
	:global(.bubble-menu .float-caret) {
		border-color: #e2e8f0 transparent transparent transparent;
		/* inner caret to fill white */
		filter: drop-shadow(0 1px 0 #e2e8f0);
	}
	/* White fill for caret */
	:global(.bubble-menu::after) {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 50%;
		transform: translateX(-50%);
		width: 0; height: 0;
		border-style: solid;
		border-width: 4px 4px 0 4px;
		border-color: #ffffff transparent transparent transparent;
	}

	/* ── Light image menu ── */
	:global(.image-menu) {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06);
	}
	:global(.image-menu .float-caret) {
		border-color: #e2e8f0 transparent transparent transparent;
	}
	:global(.image-menu::after) {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 50%;
		transform: translateX(-50%);
		width: 0; height: 0;
		border-style: solid;
		border-width: 4px 4px 0 4px;
		border-color: #ffffff transparent transparent transparent;
	}

	/* ── Image chip label ── */
	:global(.image-chip) {
		display: inline-flex; align-items: center; gap: 4px;
		font-family: var(--font-mono); font-size: 9.5px; font-weight: 700;
		color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;
		padding: 0 4px; flex-shrink: 0; border-right: 1px solid #e2e8f0; padding-right: 8px; margin-right: 2px;
	}

	/* Float group + separator */
	:global(.float-group) { display: flex; align-items: center; gap: 1px; }
	:global(.float-sep) { width: 1px; height: 16px; background: #e2e8f0; margin: 0 4px; flex-shrink: 0; }

	/* Float button — light mode */
	:global(.float-btn) {
		display: inline-flex; align-items: center; justify-content: center;
		width: 26px; height: 26px;
		border-radius: 6px; border: 1px solid transparent;
		background: transparent; color: #475569;
		cursor: pointer; transition: background 100ms, color 100ms;
		flex-shrink: 0;
		font-family: var(--font-macro); font-size: 10.5px; font-weight: 800;
	}
	:global(.float-btn:hover) { background: #f1f5f9; color: #0f172a; }
	:global(.float-btn--on) {
		background: var(--primary-light) !important;
		color: var(--primary) !important;
		border-color: var(--primary-border) !important;
	}
	:global(.float-btn--label) { width: 22px; }
	:global(.float-btn--edit:hover) { background: #eff6ff !important; color: #2563eb !important; }
	:global(.float-btn--del:hover)  { background: #fef2f2 !important; color: #dc2626 !important; }

	/* ── ProseMirror ── */
	.editor-content {
		max-height: 520px;
		overflow-y: auto;
	}
	:global(.editor-content .ProseMirror) {
		outline: none; padding: 20px 24px; min-height: 280px;
		font-family: var(--font-body); font-size: 14.5px; color: var(--text-primary); line-height: 1.75;
	}
	:global(.editor-content .ProseMirror > * + *) { margin-top: 0.75em; }
	:global(.editor-content .ProseMirror p) { margin: 0; }
	:global(.editor-content .ProseMirror h1) { font-family: var(--font-macro); font-size: 1.75rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.025em; line-height: 1.2; }
	:global(.editor-content .ProseMirror h2) { font-family: var(--font-macro); font-size: 1.3rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; padding-bottom: 6px; border-bottom: 1px solid var(--border-hard); }
	:global(.editor-content .ProseMirror h3) { font-family: var(--font-macro); font-size: 1.1rem; font-weight: 700; color: var(--text-secondary); }
	:global(.editor-content .ProseMirror code) { font-family: var(--font-mono); background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 5px; padding: 1px 5px; color: #4338ca; font-size: 0.88em; font-weight: 600; }
	/* ══════════════════════════════════════════
	   PRO CODE BLOCK BOX (UI-UX-Pro-Max)
	══════════════════════════════════════════ */
	:global(.tiptap-code-block-wrapper) {
		margin: 1.25em 0;
		border-radius: var(--radius-md);
		border: 1px solid #334155;
		background: #0f172a;
		overflow: hidden;
		box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.25), 0 2px 6px -1px rgba(15, 23, 42, 0.15);
	}
	:global(.code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 14px;
		background: #1e293b;
		border-bottom: 1px solid #334155;
		user-select: none;
	}
	:global(.mac-dots) {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	:global(.mac-dot) {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}
	:global(.mac-dot--red)    { background: #ff5f56; border: 1px solid #e0443e; }
	:global(.mac-dot--yellow) { background: #ffbd2e; border: 1px solid #dea123; }
	:global(.mac-dot--green)  { background: #27c93f; border: 1px solid #1aab29; }

	:global(.code-block-lang) {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #94a3b8;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	:global(.code-block-lang__tag) {
		background: rgba(255, 255, 255, 0.06);
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	:global(.code-copy-btn) {
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
	:global(.code-copy-btn:hover) {
		color: #f8fafc;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}
	:global(.code-copy-btn--copied) {
		color: #34d399 !important;
		background: rgba(6, 78, 59, 0.8) !important;
		border-color: rgba(52, 211, 153, 0.4) !important;
		transform: none !important;
	}

	:global(.tiptap-code-block-wrapper pre) {
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
	:global(.tiptap-code-block-wrapper pre code) {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		color: inherit !important;
		font-size: inherit !important;
	}

	/* ══════════════════════════════════════════
	   DIALOG
	══════════════════════════════════════════ */
	.dialog-backdrop {
		position: fixed; inset: 0; background: rgba(15,23,42,0.5);
		backdrop-filter: blur(8px); z-index: 30;
		display: flex; align-items: center; justify-content: center; padding: 20px;
		animation: fadeIn 150ms ease both;
	}
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.dialog-panel {
		background: white; border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		box-shadow: 0 24px 48px -8px rgba(15,23,42,0.18), 0 8px 16px rgba(15,23,42,0.08);
		width: 100%; max-width: 440px; overflow: hidden;
		animation: slideUp 180ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes slideUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
	.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px; border-bottom: 1px solid var(--border-hard); background: var(--bg-inset); }
	.dialog-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-macro); font-size: 14px; font-weight: 800; color: var(--text-primary); }
	.dialog-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-hard); background: white; color: var(--text-muted); cursor: pointer; transition: all 120ms ease; }
	.dialog-close:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
	.dialog-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
	.dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border-hard); background: var(--bg-inset); }

	.form-field { display: flex; flex-direction: column; gap: 5px; }
	.form-label { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: 11.5px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase; }
	.form-optional { font-weight: 400; font-size: 10.5px; color: var(--text-ghost); text-transform: lowercase; background: var(--bg-inset); border: 1px solid var(--border-hard); border-radius: var(--radius-full); padding: 1px 7px; }
	.form-input { width: 100%; padding: 9px 12px; background: var(--bg-inset); border: 1.5px solid var(--border-hard); border-radius: var(--radius-md); font-family: var(--font-body); font-size: 13px; color: var(--text-primary); outline: none; transition: border-color 150ms, box-shadow 150ms, background 150ms; }
	.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); background: white; }
	.form-input::placeholder { color: var(--text-ghost); }

	.or-row { display: flex; align-items: center; gap: 10px; }
	.or-line { flex: 1; border: none; border-top: 1px solid var(--border-hard); }
	.or-text { font-family: var(--font-mono); font-size: 10px; color: var(--text-ghost); font-weight: 600; white-space: nowrap; }

	.upload-zone { display: flex; }
	.upload-label { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px; background: var(--bg-inset); border: 1.5px dashed var(--border-hard); border-radius: var(--radius-md); font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 150ms ease; }
	.upload-label:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	.img-preview { background: var(--bg-inset); border: 1px solid var(--border-hard); border-radius: var(--radius-md); padding: 8px; display: flex; align-items: center; justify-content: center; max-height: 150px; overflow: hidden; }
	.img-preview__thumb { max-width: 100%; max-height: 134px; border-radius: 8px; object-fit: contain; }

	.btn-ghost-sm { padding: 7px 14px; background: white; border: 1.5px solid var(--border-hard); border-radius: var(--radius-md); font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 150ms ease; }
	.btn-ghost-sm:hover { border-color: #cbd5e1; color: var(--text-primary); }
	.btn-primary-sm { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border: none; border-radius: var(--radius-md); font-family: var(--font-macro); font-size: 12.5px; font-weight: 700; color: white; cursor: pointer; box-shadow: 0 3px 10px -2px rgba(79,70,229,0.35); transition: all 150ms ease; }
	.btn-primary-sm:hover:not(:disabled) { background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%); transform: translateY(-1px); }
	.btn-primary-sm:active { transform: scale(0.98); }
	.btn-primary-sm:disabled { opacity: 0.45; cursor: not-allowed; }
</style>

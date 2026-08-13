<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { ResizableImage } from '$lib/tiptap/ResizableImage';

	let {
		value = $bindable(''),
		placeholder = 'Ketik materi pembelajaran, penjelasan konsep, atau snippet kode...',
		disabled = false,
		onchange
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
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

	// ── Image insert dialog ──
	let showImageDialog = $state(false);
	let imageUrl        = $state('');
	let imageAlt        = $state('');
	let imageInputEl    = $state<HTMLInputElement | null>(null);

	// ── Floating image toolbar ──
	let imgToolbarVisible = $state(false);
	let imgToolbarX       = $state(0);
	let imgToolbarY       = $state(0);
	let activeImageAlign  = $state<'left' | 'center' | 'right' | 'full'>('center');

	// ── Text selection bubble menu ──
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
		charCount   = text.length;
		wordCount   = text.trim() ? text.trim().split(/\s+/).length : 0;
	}

	// Position the text bubble menu above the current selection
	function positionBubble() {
		if (!editorRoot) return;
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
			bubbleVisible = false;
			return;
		}
		const range   = sel.getRangeAt(0);
		const selRect = range.getBoundingClientRect();
		const rootRect = editorRoot.getBoundingClientRect();

		if (selRect.width === 0 && selRect.height === 0) {
			bubbleVisible = false;
			return;
		}

		// Center bubble over the midpoint of the selection
		bubbleX = selRect.left - rootRect.left + selRect.width / 2;
		// Sit bubble 10px above the top of the selection
		bubbleY = selRect.top - rootRect.top - 10;
		bubbleVisible = true;
	}

	// Position the image toolbar above the selected image wrapper
	function positionImageToolbar() {
		if (!editorRoot) return;
		if (!isImage) { imgToolbarVisible = false; return; }
		const selected = editorRoot.querySelector('.ProseMirror-selectednode') as HTMLElement | null;
		if (!selected) { imgToolbarVisible = false; return; }
		const rect = selected.getBoundingClientRect();
		const rootRect = editorRoot.getBoundingClientRect();
		imgToolbarX = rect.left - rootRect.left + rect.width / 2;
		imgToolbarY = rect.top  - rootRect.top  - 10;
		imgToolbarVisible = true;
	}

	let blurTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (!browser || !element) return;

		editor = new Editor({
			element,
			extensions: [StarterKit, ResizableImage],
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
					if (isImage) {
						bubbleVisible = false;
						positionImageToolbar();
					} else {
						imgToolbarVisible = false;
						positionBubble();
					}
				});
			},
			onTransaction: () => { syncActiveStates(); },
			onFocus: () => {
				if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
			},
			onBlur: () => {
				// Generous delay so floating menu button clicks register first
				blurTimer = setTimeout(() => {
					bubbleVisible    = false;
					imgToolbarVisible = false;
				}, 200);
			}
		});

		syncActiveStates();

		// Close menus on outside click
		const onOutsideClick = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (
				!t.closest('.editor-float-menu') &&
				!t.closest('.editor-content') &&
				!t.closest('.tiptap-image-wrapper')
			) {
				bubbleVisible    = false;
				imgToolbarVisible = false;
			}
		};
		document.addEventListener('mousedown', onOutsideClick);
		return () => document.removeEventListener('mousedown', onOutsideClick);
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

	// ── Image dialog ──
	function openImageDialog() {
		imageUrl = ''; imageAlt = '';
		showImageDialog = true;
		setTimeout(() => imageInputEl?.focus(), 50);
	}
	function closeImageDialog() { showImageDialog = false; imageUrl = ''; imageAlt = ''; }
	function insertImage() {
		const url = imageUrl.trim();
		if (!url || !editor) return;
		editor.chain().focus().setResizableImage({ src: url, alt: imageAlt, alignment: 'center' }).run();
		closeImageDialog();
	}
	function handleDialogKey(e: KeyboardEvent) {
		if (e.key === 'Enter') insertImage();
		if (e.key === 'Escape') closeImageDialog();
	}
	function handleFileUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => { imageUrl = ev.target?.result as string; };
		reader.readAsDataURL(file);
	}

	// Tooltip helpers
	type TooltipItem = { label: string; kbd?: string };
	const TOOLBAR_TOOLTIPS: Record<string, TooltipItem> = {
		bold:        { label: 'Bold',       kbd: '⌘B' },
		italic:      { label: 'Italic',     kbd: '⌘I' },
		code:        { label: 'Code',       kbd: '⌘E' },
		h1:          { label: 'Heading 1'           },
		h2:          { label: 'Heading 2'           },
		h3:          { label: 'Heading 3'           },
		bullet:      { label: 'Bullet list'         },
		ordered:     { label: 'Numbered list'       },
		codeblock:   { label: 'Code block'          },
		blockquote:  { label: 'Quote'               },
		image:       { label: 'Insert image'        },
		undo:        { label: 'Undo',       kbd: '⌘Z' },
		redo:        { label: 'Redo',       kbd: '⌘Y' },
	};
</script>

<!-- ══════════════ IMAGE INSERT DIALOG ══════════════ -->
{#if showImageDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={closeImageDialog} role="dialog" aria-modal="true">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="dialog-panel" onclick={(e) => e.stopPropagation()} onkeydown={handleDialogKey}>
			<div class="dialog-header">
				<div class="dialog-title">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan Gambar
				</div>
				<button type="button" class="dialog-close" onclick={closeImageDialog} aria-label="Tutup">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="dialog-body">
				<div class="form-field">
					<label for="img-url" class="form-label">URL Gambar</label>
					<input id="img-url" bind:this={imageInputEl} type="url" bind:value={imageUrl}
						placeholder="https://example.com/image.png" class="form-input" />
				</div>

				<div class="or-row">
					<span class="or-line"></span>
					<span class="or-text">atau unggah file</span>
					<span class="or-line"></span>
				</div>

				<div class="upload-zone">
					<label for="img-file" class="upload-label">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Pilih dari Komputer
					</label>
					<input id="img-file" type="file" accept="image/*" class="sr-only" onchange={handleFileUpload} />
				</div>

				{#if imageUrl}
					<div class="img-preview">
						<img src={imageUrl} alt={imageAlt || 'preview'} class="img-preview__thumb" />
					</div>
				{/if}

				<div class="form-field">
					<label for="img-alt" class="form-label">
						Teks Alt
						<span class="form-optional">opsional</span>
					</label>
					<input id="img-alt" type="text" bind:value={imageAlt}
						placeholder="Deskripsi singkat gambar..." class="form-input" />
				</div>
			</div>

			<div class="dialog-footer">
				<button type="button" class="btn-ghost-sm" onclick={closeImageDialog}>Batal</button>
				<button type="button" class="btn-primary-sm" onclick={insertImage} disabled={!imageUrl.trim()}>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan
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
			<!-- Inline formatting -->
			<div class="toolbar-group">
				<button type="button"
					class="tb-btn" class:tb-btn--on={isBold}
					onclick={() => editor?.chain().focus().toggleBold().run()}
					aria-label={TOOLBAR_TOOLTIPS.bold.label}
					aria-pressed={isBold}
					data-tooltip="{TOOLBAR_TOOLTIPS.bold.label} {TOOLBAR_TOOLTIPS.bold.kbd}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
				</button>
				<button type="button"
					class="tb-btn" class:tb-btn--on={isItalic}
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					aria-label={TOOLBAR_TOOLTIPS.italic.label}
					aria-pressed={isItalic}
					data-tooltip="{TOOLBAR_TOOLTIPS.italic.label} {TOOLBAR_TOOLTIPS.italic.kbd}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
				</button>
				<button type="button"
					class="tb-btn" class:tb-btn--on={isCode}
					onclick={() => editor?.chain().focus().toggleCode().run()}
					aria-label={TOOLBAR_TOOLTIPS.code.label}
					aria-pressed={isCode}
					data-tooltip="{TOOLBAR_TOOLTIPS.code.label} {TOOLBAR_TOOLTIPS.code.kbd}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
				</button>
			</div>

			<div class="toolbar-sep" aria-hidden="true"></div>

			<!-- Headings -->
			<div class="toolbar-group">
				{#each [1, 2, 3] as level}
					<button type="button"
						class="tb-btn tb-btn--text" class:tb-btn--on={level === 1 ? isHeading1 : level === 2 ? isHeading2 : isHeading3}
						onclick={() => editor?.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()}
						aria-label="Heading {level}"
						data-tooltip="Heading {level}">
						H{level}
					</button>
				{/each}
			</div>

			<div class="toolbar-sep" aria-hidden="true"></div>

			<!-- Block formats -->
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

			<div class="toolbar-sep" aria-hidden="true"></div>

			<!-- Image -->
			<div class="toolbar-group">
				<button type="button" class="tb-btn tb-btn--img"
					onclick={openImageDialog}
					aria-label="Insert image" data-tooltip="Insert image">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
				</button>
			</div>

			<!-- History (right-aligned) -->
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

	<!-- ── CANVAS AREA ── -->
	<div class="canvas-wrap">

		<!-- FLOATING: Text selection bubble menu -->
		{#if bubbleVisible && !isImage}
			<div
				class="editor-float-menu bubble-menu"
				style="left:{bubbleX}px; top:{bubbleY}px;"
				role="toolbar"
				aria-label="Text formatting"
			>
				<!-- Arrow caret -->
				<div class="float-caret float-caret--down" aria-hidden="true"></div>

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
						aria-label="Code" title="Inline code ⌘E">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
					</button>
				</div>

				<div class="float-sep" aria-hidden="true"></div>

				<div class="float-group">
					<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading1}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }}
						aria-label="H1" title="Heading 1">H1</button>
					<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading2}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}
						aria-label="H2" title="Heading 2">H2</button>
					<button type="button" class="float-btn float-btn--label" class:float-btn--on={isHeading3}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 3 }).run(); }}
						aria-label="H3" title="Heading 3">H3</button>
				</div>

				<div class="float-sep" aria-hidden="true"></div>

				<div class="float-group">
					<button type="button" class="float-btn" class:float-btn--on={isBulletList}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
						aria-label="Bullet list" title="Bullet list">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
					</button>
					<button type="button" class="float-btn" class:float-btn--on={isOrderedList}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
						aria-label="Numbered list" title="Numbered list">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
					</button>
					<button type="button" class="float-btn" class:float-btn--on={isBlockquote}
						onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}
						aria-label="Quote" title="Quote">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
					</button>
				</div>
			</div>
		{/if}

		<!-- FLOATING: Image click toolbar -->
		{#if imgToolbarVisible && isImage}
			<div
				class="editor-float-menu image-menu"
				style="left:{imgToolbarX}px; top:{imgToolbarY}px;"
				role="toolbar"
				aria-label="Image options"
			>
				<!-- Arrow caret -->
				<div class="float-caret float-caret--down" aria-hidden="true"></div>

				<!-- Label chip -->
				<span class="image-menu__chip" aria-hidden="true">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Gambar
				</span>

				<div class="float-sep" aria-hidden="true"></div>

				<!-- Alignment -->
				<div class="float-group" role="group" aria-label="Alignment">
					<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'left'}
						onmousedown={(e) => { e.preventDefault(); setImageAlignment('left'); }}
						aria-label="Kiri" title="Align kiri">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
					</button>
					<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'center'}
						onmousedown={(e) => { e.preventDefault(); setImageAlignment('center'); }}
						aria-label="Tengah" title="Tengah">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
					</button>
					<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'right'}
						onmousedown={(e) => { e.preventDefault(); setImageAlignment('right'); }}
						aria-label="Kanan" title="Align kanan">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
					</button>
					<button type="button" class="float-btn" class:float-btn--on={activeImageAlign === 'full'}
						onmousedown={(e) => { e.preventDefault(); setImageAlignment('full'); }}
						aria-label="Full width" title="Full width">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><rect x="3" y="10" width="18" height="4" rx="1"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
					</button>
				</div>

				<div class="float-sep" aria-hidden="true"></div>

				<!-- Delete -->
				<button type="button" class="float-btn float-btn--del"
					onmousedown={(e) => { e.preventDefault(); deleteImage(); }}
					aria-label="Hapus gambar" title="Hapus gambar">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
				</button>
			</div>
		{/if}

		<!-- ProseMirror mount -->
		<div bind:this={element} class="editor-content"></div>
	</div>

	<!-- ── STATUS BAR ── -->
	<div class="statusbar">
		<span class="statusbar-brand">TipTap</span>
		<div class="statusbar-stats">
			<span>{wordCount} kata</span>
			<span class="statusbar-dot">·</span>
			<span>{charCount} kar.</span>
		</div>
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════
	   Z-INDEX SCALE
	   10 = toolbar / sticky
	   20 = floating menus
	   30 = dialogs / modals
	══════════════════════════════════════════════ */

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
	.editor-root--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	/* ── Main toolbar ── */
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
	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 1px;
	}
	.toolbar-group--end { margin-left: auto; }
	.toolbar-sep {
		width: 1px;
		height: 18px;
		background: var(--border-hard);
		margin: 0 6px;
		flex-shrink: 0;
	}

	/* Toolbar button */
	.tb-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		border: 1.5px solid transparent;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 800;
	}
	.tb-btn:hover:not(:disabled) {
		background: white;
		border-color: var(--border-hard);
		color: var(--text-primary);
	}
	.tb-btn--on {
		background: var(--primary-light) !important;
		border-color: var(--primary-border) !important;
		color: var(--primary) !important;
	}
	.tb-btn--img:hover:not(:disabled) {
		background: var(--green-dim) !important;
		border-color: var(--green-border) !important;
		color: var(--green-live) !important;
	}
	.tb-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	/* Tooltip via data-tooltip + CSS */
	.tb-btn[data-tooltip]::after {
		content: attr(data-tooltip);
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%) scale(0.9);
		white-space: nowrap;
		background: #0f172a;
		color: #f8fafc;
		font-family: var(--font-body);
		font-size: 11px;
		font-weight: 500;
		padding: 4px 8px;
		border-radius: 6px;
		pointer-events: none;
		opacity: 0;
		transition: opacity 120ms ease, transform 120ms ease;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}
	.tb-btn[data-tooltip]:hover::after {
		opacity: 1;
		transform: translateX(-50%) scale(1);
	}

	/* ── Canvas wrap ── */
	.canvas-wrap {
		position: relative;
		overflow: visible; /* floating menus can escape upward */
		flex: 1;
	}

	/* ═══════════════════════════════════════════
	   FLOATING MENUS — shared base
	══════════════════════════════════════════ */
	.editor-float-menu {
		position: absolute;
		z-index: 20; /* above toolbar (10), below dialog (30) */
		transform: translate(-50%, -100%);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 5px 6px;
		border-radius: 10px;
		pointer-events: auto;
		white-space: nowrap;
		/* Entrance animation */
		animation: floatIn 160ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes floatIn {
		from { opacity: 0; transform: translate(-50%, calc(-100% + 6px)) scale(0.94); }
		to   { opacity: 1; transform: translate(-50%, -100%)             scale(1);    }
	}

	/* Downward arrow caret (pointing at selection/image) */
	.float-caret {
		position: absolute;
		bottom: -5px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-style: solid;
	}

	/* ── Text selection bubble menu ── */
	.bubble-menu {
		background: #0f172a;
		border: 1px solid rgba(255,255,255,0.08);
		box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15);
	}
	.bubble-menu .float-caret--down {
		border-width: 5px 5px 0 5px;
		border-color: #0f172a transparent transparent transparent;
	}

	/* ── Image menu ── */
	.image-menu {
		background: #1e293b;
		border: 1px solid rgba(255,255,255,0.1);
		box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2);
	}
	.image-menu .float-caret--down {
		border-width: 5px 5px 0 5px;
		border-color: #1e293b transparent transparent transparent;
	}
	.image-menu__chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: #94a3b8;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0 4px;
		flex-shrink: 0;
	}

	/* Float group + separator */
	.float-group {
		display: flex;
		align-items: center;
		gap: 1px;
	}
	.float-sep {
		width: 1px;
		height: 16px;
		background: rgba(255,255,255,0.1);
		margin: 0 4px;
		flex-shrink: 0;
	}

	/* Float button */
	.float-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease;
		flex-shrink: 0;
		font-family: var(--font-macro);
		font-size: 10.5px;
		font-weight: 800;
	}
	.float-btn:hover {
		background: rgba(255,255,255,0.1);
		color: #f1f5f9;
	}
	.float-btn--on {
		background: var(--primary) !important;
		color: white !important;
		border-color: rgba(255,255,255,0.15) !important;
	}
	.float-btn--del:hover {
		background: rgba(220,38,38,0.2) !important;
		color: #fca5a5 !important;
	}
	/* Label-only float button */
	.float-btn--label { width: 22px; }

	/* ── Status bar ── */
	.statusbar {
		padding: 6px 14px;
		background: var(--bg-inset);
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-ghost);
		flex-shrink: 0;
	}
	.statusbar-brand { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.statusbar-stats { display: flex; align-items: center; gap: 5px; }
	.statusbar-dot { opacity: 0.4; }

	/* ── ProseMirror content ── */
	:global(.editor-content .ProseMirror) {
		outline: none;
		padding: 20px 24px;
		min-height: 280px;
		font-family: var(--font-body);
		font-size: 14.5px;
		color: var(--text-primary);
		line-height: 1.75;
	}
	:global(.editor-content .ProseMirror > * + *) { margin-top: 0.75em; }
	:global(.editor-content .ProseMirror p) { margin: 0; }
	:global(.editor-content .ProseMirror h1) {
		font-family: var(--font-macro); font-size: 1.75rem; font-weight: 800;
		color: var(--text-primary); letter-spacing: -0.025em; line-height: 1.2;
	}
	:global(.editor-content .ProseMirror h2) {
		font-family: var(--font-macro); font-size: 1.3rem; font-weight: 800;
		color: var(--text-primary); letter-spacing: -0.02em;
		padding-bottom: 6px; border-bottom: 1px solid var(--border-hard);
	}
	:global(.editor-content .ProseMirror h3) {
		font-family: var(--font-macro); font-size: 1.1rem; font-weight: 700; color: var(--text-secondary);
	}
	:global(.editor-content .ProseMirror code) {
		font-family: var(--font-mono); background: #eef2ff; border: 1px solid #c7d2fe;
		border-radius: 5px; padding: 1px 5px; color: #4338ca; font-size: 0.88em; font-weight: 600;
	}
	:global(.editor-content .ProseMirror pre) {
		background: #1e293b; border: 1px solid #334155; border-radius: var(--radius-md);
		padding: 14px 18px; font-family: var(--font-mono); font-size: 13px; color: #e2e8f0;
		overflow-x: auto; line-height: 1.6;
	}
	:global(.editor-content .ProseMirror pre code) { background: transparent; border: none; color: inherit; padding: 0; font-size: inherit; }
	:global(.editor-content .ProseMirror ul) { list-style: disc; padding-left: 1.5em; }
	:global(.editor-content .ProseMirror ol) { list-style: decimal; padding-left: 1.5em; }
	:global(.editor-content .ProseMirror li + li) { margin-top: 0.2em; }
	:global(.editor-content .ProseMirror blockquote) {
		border-left: 3px solid var(--primary); padding: 8px 16px;
		color: var(--text-secondary); font-style: italic;
		background: var(--primary-light); border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}
	:global(.editor-content .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--text-ghost); content: attr(data-placeholder);
		float: left; height: 0; pointer-events: none;
	}
	/* Image selection */
	:global(.editor-content .ProseMirror .ProseMirror-selectednode .tiptap-image-figure img) {
		outline: 2px solid var(--primary);
		outline-offset: 3px;
	}

	/* ═══════════════════════════════════════════
	   DIALOG
	══════════════════════════════════════════ */
	.dialog-backdrop {
		position: fixed; inset: 0;
		background: rgba(15,23,42,0.5);
		backdrop-filter: blur(8px);
		z-index: 30;
		display: flex; align-items: center; justify-content: center;
		padding: 20px;
		animation: fadeIn 150ms ease both;
	}
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

	.dialog-panel {
		background: white;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl);
		box-shadow: 0 24px 48px -8px rgba(15,23,42,0.18), 0 8px 16px rgba(15,23,42,0.08);
		width: 100%; max-width: 440px;
		overflow: hidden;
		animation: slideUp 180ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes slideUp {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to   { opacity: 1; transform: scale(1)   translateY(0);     }
	}

	.dialog-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 16px 18px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-inset);
	}
	.dialog-title {
		display: flex; align-items: center; gap: 8px;
		font-family: var(--font-macro); font-size: 14px; font-weight: 800;
		color: var(--text-primary);
	}
	.dialog-close {
		display: flex; align-items: center; justify-content: center;
		width: 28px; height: 28px;
		border-radius: 8px; border: 1px solid var(--border-hard);
		background: white; color: var(--text-muted); cursor: pointer;
		transition: all 120ms ease;
	}
	.dialog-close:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

	.dialog-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
	.dialog-footer {
		display: flex; align-items: center; justify-content: flex-end; gap: 8px;
		padding: 14px 18px;
		border-top: 1px solid var(--border-hard); background: var(--bg-inset);
	}

	/* Form fields */
	.form-field { display: flex; flex-direction: column; gap: 5px; }
	.form-label {
		display: flex; align-items: center; gap: 6px;
		font-family: var(--font-body); font-size: 11.5px; font-weight: 700;
		color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase;
	}
	.form-optional {
		font-weight: 400; font-size: 10.5px; color: var(--text-ghost);
		text-transform: lowercase; background: var(--bg-inset);
		border: 1px solid var(--border-hard); border-radius: var(--radius-full);
		padding: 1px 7px;
	}
	.form-input {
		width: 100%; padding: 9px 12px;
		background: var(--bg-inset); border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md); font-family: var(--font-body); font-size: 13px;
		color: var(--text-primary); outline: none;
		transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
	}
	.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); background: white; }
	.form-input::placeholder { color: var(--text-ghost); }

	/* Or divider */
	.or-row { display: flex; align-items: center; gap: 10px; }
	.or-line { flex: 1; border: none; border-top: 1px solid var(--border-hard); }
	.or-text { font-family: var(--font-mono); font-size: 10px; color: var(--text-ghost); font-weight: 600; white-space: nowrap; }

	/* Upload zone */
	.upload-zone { display: flex; }
	.upload-label {
		display: inline-flex; align-items: center; justify-content: center; gap: 8px;
		width: 100%; padding: 10px;
		background: var(--bg-inset); border: 1.5px dashed var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
		color: var(--text-secondary); cursor: pointer;
		transition: all 150ms ease;
	}
	.upload-label:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	/* Preview */
	.img-preview {
		background: var(--bg-inset); border: 1px solid var(--border-hard);
		border-radius: var(--radius-md); padding: 8px;
		display: flex; align-items: center; justify-content: center;
		max-height: 150px; overflow: hidden;
	}
	.img-preview__thumb { max-width: 100%; max-height: 134px; border-radius: 8px; object-fit: contain; }

	/* Buttons */
	.btn-ghost-sm {
		padding: 7px 14px; background: white; border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md); font-family: var(--font-body); font-size: 12.5px;
		font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 150ms ease;
	}
	.btn-ghost-sm:hover { border-color: #cbd5e1; color: var(--text-primary); }

	.btn-primary-sm {
		display: inline-flex; align-items: center; gap: 6px;
		padding: 7px 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		border: none; border-radius: var(--radius-md);
		font-family: var(--font-macro); font-size: 12.5px; font-weight: 700; color: white;
		cursor: pointer; box-shadow: 0 3px 10px -2px rgba(79,70,229,0.35);
		transition: all 150ms ease;
	}
	.btn-primary-sm:hover:not(:disabled) { background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%); transform: translateY(-1px); }
	.btn-primary-sm:active { transform: scale(0.98); }
	.btn-primary-sm:disabled { opacity: 0.45; cursor: not-allowed; }
</style>

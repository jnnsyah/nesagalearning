<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { Editor } from '@tiptap/core';
	import BubbleMenu from '@tiptap/extension-bubble-menu';
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

	let element        = $state<HTMLDivElement | null>(null);
	let editor         = $state<Editor | null>(null);
	let editorRoot     = $state<HTMLDivElement | null>(null);

	// Toolbar active states
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

	// History
	let canUndo = $state(false);
	let canRedo = $state(false);

	// Stats
	let charCount = $state(0);
	let wordCount = $state(0);

	// Image dialog
	let showImageDialog = $state(false);
	let imageUrl        = $state('');
	let imageAlt        = $state('');
	let imageInputEl    = $state<HTMLInputElement | null>(null);

	// Active image alignment state
	let activeImageAlign = $state<'left' | 'center' | 'right' | 'full' | null>(null);

	// ===== FLOATING IMAGE TOOLBAR =====
	let imgToolbarVisible = $state(false);
	let imgToolbarX       = $state(0);
	let imgToolbarY       = $state(0);

	// ===== TEXT BUBBLE MENU =====
	// We use TipTap's BubbleMenu extension — it needs a DOM element to render into
	let bubbleMenuEl = $state<HTMLDivElement | null>(null);
	// Reactive flags for bubble menu buttons
	let bubbleBold        = $state(false);
	let bubbleItalic      = $state(false);
	let bubbleCode        = $state(false);
	let bubbleH1          = $state(false);
	let bubbleH2          = $state(false);
	let bubbleH3          = $state(false);
	let bubbleBulletList  = $state(false);
	let bubbleOrderedList = $state(false);
	let bubbleBlockquote  = $state(false);

	function updateToolbarState() {
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

		// bubble mirror
		bubbleBold        = isBold;
		bubbleItalic      = isItalic;
		bubbleCode        = isCode;
		bubbleH1          = isHeading1;
		bubbleH2          = isHeading2;
		bubbleH3          = isHeading3;
		bubbleBulletList  = isBulletList;
		bubbleOrderedList = isOrderedList;
		bubbleBlockquote  = isBlockquote;

		if (isImage) {
			const attrs = editor.getAttributes('resizableImage');
			activeImageAlign = attrs.alignment || 'center';
		} else {
			activeImageAlign = null;
		}

		canUndo = editor.can().undo();
		canRedo = editor.can().redo();

		const text = editor.getText();
		charCount = text.length;
		wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	}

	onMount(async () => {
		if (!element || !bubbleMenuEl) return;

		editor = new Editor({
			element,
			extensions: [
				StarterKit,
				ResizableImage,
				BubbleMenu.configure({
					element: bubbleMenuEl,
					tippyOptions: { duration: 120, placement: 'top' },
					// Show bubble menu only when text (not image) is selected
					shouldShow: ({ editor: ed, state }) => {
						const { selection } = state;
						const isEmptySelection = selection.empty;
						if (isEmptySelection) return false;
						// Don't show for image node selections
						if (ed.isActive('resizableImage')) return false;
						return true;
					}
				})
			],
			content: value,
			editable: !disabled,
			onUpdate: ({ editor: ed }) => {
				const html = ed.getHTML();
				value = html;
				onchange?.(html);
				updateToolbarState();
			},
			onSelectionUpdate: ({ editor: ed }) => {
				updateToolbarState();
				updateImageToolbar(ed);
			},
			onTransaction: () => {
				updateToolbarState();
			}
		});

		updateToolbarState();

		// Listen for clicks on images inside the editor to show the image toolbar
		element.addEventListener('click', onEditorClick);
		// Hide image toolbar when clicking outside editor
		document.addEventListener('click', onDocClick);
	});

	onDestroy(() => {
		editor?.destroy();
		element?.removeEventListener('click', onEditorClick);
		document.removeEventListener('click', onDocClick);
	});

	$effect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value);
		}
	});

	$effect(() => {
		if (editor) {
			editor.setEditable(!disabled);
		}
	});

	// ===== IMAGE CLICK TOOLBAR LOGIC =====
	function updateImageToolbar(ed: Editor) {
		if (!editorRoot) return;
		if (!ed.isActive('resizableImage')) {
			imgToolbarVisible = false;
			return;
		}
		// Find the selected image node's DOM element
		const selected = editorRoot.querySelector('.ProseMirror-selectednode');
		if (!selected) {
			imgToolbarVisible = false;
			return;
		}
		const imgFigure = selected.querySelector('.tiptap-image-figure') as HTMLElement | null;
		const target = imgFigure || (selected as HTMLElement);
		const rect = target.getBoundingClientRect();
		const rootRect = editorRoot.getBoundingClientRect();

		imgToolbarX = rect.left - rootRect.left + rect.width / 2;
		imgToolbarY = rect.top  - rootRect.top - 8; // 8px above
		imgToolbarVisible = true;
	}

	function onEditorClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// Check if click was on an image or its wrapper
		const imgWrapper = target.closest('.tiptap-image-wrapper');
		if (!imgWrapper) {
			imgToolbarVisible = false;
		}
	}

	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.tiptap-image-toolbar') && !target.closest('.tiptap-image-wrapper')) {
			imgToolbarVisible = false;
		}
	}

	function setImageAlignment(align: 'left' | 'center' | 'right' | 'full') {
		editor?.chain().focus().updateImageAlignment(align).run();
		activeImageAlign = align;
		// Keep toolbar open, reposition
		tick().then(() => {
			if (editor) updateImageToolbar(editor);
		});
	}

	function deleteImage() {
		editor?.chain().focus().deleteSelection().run();
		imgToolbarVisible = false;
	}

	// ===== IMAGE INSERT DIALOG =====
	function openImageDialog() {
		imageUrl = '';
		imageAlt = '';
		showImageDialog = true;
		setTimeout(() => imageInputEl?.focus(), 50);
	}

	function closeImageDialog() {
		showImageDialog = false;
		imageUrl = '';
		imageAlt = '';
	}

	function insertImage() {
		const url = imageUrl.trim();
		if (!url || !editor) return;
		editor.chain().focus().setResizableImage({ src: url, alt: imageAlt, alignment: 'center' }).run();
		closeImageDialog();
	}

	function handleImageDialogKey(e: KeyboardEvent) {
		if (e.key === 'Enter') insertImage();
		if (e.key === 'Escape') closeImageDialog();
	}

	function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			imageUrl = ev.target?.result as string;
		};
		reader.readAsDataURL(file);
	}
</script>

<!-- ===== TEXT SELECTION BUBBLE MENU ===== -->
<!-- This div is the mount point for TipTap BubbleMenu -->
<div bind:this={bubbleMenuEl} class="bubble-menu">
	<div class="bubble-group">
		<button
			type="button"
			class="bubble-btn"
			class:bubble-btn--active={bubbleBold}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
			title="Bold"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
		</button>
		<button
			type="button"
			class="bubble-btn"
			class:bubble-btn--active={bubbleItalic}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
			title="Italic"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
		</button>
		<button
			type="button"
			class="bubble-btn"
			class:bubble-btn--active={bubbleCode}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }}
			title="Inline Code"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
		</button>
	</div>
	<div class="bubble-divider"></div>
	<div class="bubble-group">
		<button type="button" class="bubble-btn bubble-btn--text" class:bubble-btn--active={bubbleH1}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }} title="H1">H1</button>
		<button type="button" class="bubble-btn bubble-btn--text" class:bubble-btn--active={bubbleH2}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }} title="H2">H2</button>
		<button type="button" class="bubble-btn bubble-btn--text" class:bubble-btn--active={bubbleH3}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 3 }).run(); }} title="H3">H3</button>
	</div>
	<div class="bubble-divider"></div>
	<div class="bubble-group">
		<button type="button" class="bubble-btn" class:bubble-btn--active={bubbleBulletList}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }} title="Bullet List">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
		</button>
		<button type="button" class="bubble-btn" class:bubble-btn--active={bubbleOrderedList}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }} title="Numbered List">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
		</button>
		<button type="button" class="bubble-btn" class:bubble-btn--active={bubbleBlockquote}
			onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }} title="Blockquote">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
		</button>
	</div>
</div>

<!-- ===== IMAGE INSERT DIALOG ===== -->
{#if showImageDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="img-dialog-backdrop" onclick={closeImageDialog} role="dialog" aria-modal="true" aria-label="Insert Image">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="img-dialog" onclick={(e) => e.stopPropagation()} onkeydown={handleImageDialogKey}>
			<div class="img-dialog__header">
				<span class="img-dialog__title">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan Gambar
				</span>
				<button type="button" class="img-dialog__close" onclick={closeImageDialog} aria-label="Tutup">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="img-dialog__body">
				<div class="img-field">
					<label for="img-url-input" class="img-field__label">URL Gambar</label>
					<input id="img-url-input" bind:this={imageInputEl} type="url" bind:value={imageUrl}
						placeholder="https://example.com/image.png" class="img-field__input" />
				</div>

				<div class="img-divider-row">
					<hr class="img-divider-line" />
					<span class="img-divider-text">atau unggah file</span>
					<hr class="img-divider-line" />
				</div>

				<div class="img-upload-zone">
					<label for="img-file-upload" class="img-upload-label">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Pilih Gambar dari Komputer
					</label>
					<input id="img-file-upload" type="file" accept="image/*" class="img-file-hidden" onchange={handleFileUpload} />
				</div>

				{#if imageUrl}
					<div class="img-preview-box">
						<img src={imageUrl} alt={imageAlt || 'preview'} class="img-preview-thumb" />
					</div>
				{/if}

				<div class="img-field">
					<label for="img-alt-input" class="img-field__label">Teks Alt <span class="img-field__optional">(opsional)</span></label>
					<input id="img-alt-input" type="text" bind:value={imageAlt}
						placeholder="Deskripsi singkat gambar..." class="img-field__input" />
				</div>
			</div>

			<div class="img-dialog__footer">
				<button type="button" class="img-btn-cancel" onclick={closeImageDialog}>Batal</button>
				<button type="button" class="img-btn-insert" onclick={insertImage} disabled={!imageUrl.trim()}>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
					Sisipkan Gambar
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ===== EDITOR ROOT ===== -->
<div class="editor-container" class:editor-container--disabled={disabled} bind:this={editorRoot}>
	{#if editor && !disabled}
		<!-- === MAIN TOOLBAR === -->
		<div class="editor-toolbar" role="toolbar" aria-label="Format Teks">
			<div class="tool-group">
				<button type="button" class="tool-btn" class:tool-btn--active={isBold}
					onclick={() => editor?.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
				</button>
				<button type="button" class="tool-btn" class:tool-btn--active={isItalic}
					onclick={() => editor?.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
				</button>
				<button type="button" class="tool-btn" class:tool-btn--active={isCode}
					onclick={() => editor?.chain().focus().toggleCode().run()} title="Inline Code">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
				</button>
			</div>

			<div class="tool-divider"></div>

			<div class="tool-group">
				<button type="button" class="tool-btn text-btn" class:tool-btn--active={isHeading1}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="H1">H1</button>
				<button type="button" class="tool-btn text-btn" class:tool-btn--active={isHeading2}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">H2</button>
				<button type="button" class="tool-btn text-btn" class:tool-btn--active={isHeading3}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="H3">H3</button>
			</div>

			<div class="tool-divider"></div>

			<div class="tool-group">
				<button type="button" class="tool-btn" class:tool-btn--active={isBulletList}
					onclick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet List">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
				</button>
				<button type="button" class="tool-btn" class:tool-btn--active={isOrderedList}
					onclick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered List">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
				</button>
				<button type="button" class="tool-btn" class:tool-btn--active={isCodeBlock}
					onclick={() => editor?.chain().focus().toggleCodeBlock().run()} title="Code Block">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>
				</button>
				<button type="button" class="tool-btn" class:tool-btn--active={isBlockquote}
					onclick={() => editor?.chain().focus().toggleBlockquote().run()} title="Blockquote">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				</button>
			</div>

			<div class="tool-divider"></div>

			<!-- Image -->
			<div class="tool-group">
				<button type="button" class="tool-btn tool-btn--image" onclick={openImageDialog} title="Sisipkan Gambar">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
				</button>
			</div>

			<!-- History -->
			<div class="tool-group" style="margin-left:auto">
				<button type="button" class="tool-btn" onclick={() => editor?.chain().focus().undo().run()}
					disabled={!canUndo} title="Undo (Ctrl+Z)">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
				</button>
				<button type="button" class="tool-btn" onclick={() => editor?.chain().focus().redo().run()}
					disabled={!canRedo} title="Redo (Ctrl+Y)">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- === EDITOR CANVAS (with floating image toolbar) === -->
	<div class="editor-canvas-wrap">
		<!-- Floating image toolbar -->
		{#if imgToolbarVisible && isImage}
			<div
				class="tiptap-image-toolbar"
				style="left:{imgToolbarX}px; top:{imgToolbarY}px;"
				role="toolbar"
				aria-label="Image options"
			>
				<!-- Alignment -->
				<button type="button" class="img-tb-btn" class:img-tb-btn--active={activeImageAlign === 'left'}
					onmousedown={(e) => { e.preventDefault(); setImageAlignment('left'); }} title="Align Kiri">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
				</button>
				<button type="button" class="img-tb-btn" class:img-tb-btn--active={activeImageAlign === 'center'}
					onmousedown={(e) => { e.preventDefault(); setImageAlignment('center'); }} title="Tengah">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
				</button>
				<button type="button" class="img-tb-btn" class:img-tb-btn--active={activeImageAlign === 'right'}
					onmousedown={(e) => { e.preventDefault(); setImageAlignment('right'); }} title="Align Kanan">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
				</button>
				<button type="button" class="img-tb-btn" class:img-tb-btn--active={activeImageAlign === 'full'}
					onmousedown={(e) => { e.preventDefault(); setImageAlignment('full'); }} title="Full Width">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><rect x="3" y="10" width="18" height="4" rx="1"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
				</button>

				<div class="img-tb-divider"></div>

				<!-- Delete -->
				<button type="button" class="img-tb-btn img-tb-btn--danger"
					onmousedown={(e) => { e.preventDefault(); deleteImage(); }} title="Hapus Gambar">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
				</button>
			</div>
		{/if}

		<div bind:this={element} class="editor-content"></div>
	</div>

	<!-- Status bar -->
	<div class="editor-statusbar">
		<span class="status-brand">TipTap Rich Editor</span>
		<div class="status-counts">
			<span>{wordCount} kata</span>
			<span class="status-dot">•</span>
			<span>{charCount} karakter</span>
		</div>
	</div>
</div>

<style>
	/* ===== BUBBLE MENU (text selection) ===== */
	.bubble-menu {
		display: flex;
		align-items: center;
		gap: 3px;
		background: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 10px;
		padding: 5px 7px;
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3), 0 2px 8px rgba(15, 23, 42, 0.2);
		pointer-events: auto;
	}

	.bubble-group {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.bubble-divider {
		width: 1px;
		height: 18px;
		background: #334155;
		margin: 0 4px;
	}

	.bubble-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid transparent;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.bubble-btn:hover {
		background: #1e293b;
		color: #f1f5f9;
	}

	.bubble-btn--active {
		background: #4f46e5 !important;
		color: white !important;
		border-color: #6366f1 !important;
	}

	.bubble-btn--text {
		font-family: var(--font-macro);
		font-size: 11px;
		font-weight: 800;
		width: 24px;
	}

	/* ===== FLOATING IMAGE TOOLBAR ===== */
	.editor-canvas-wrap {
		position: relative;
	}

	.tiptap-image-toolbar {
		position: absolute;
		transform: translate(-50%, -100%);
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 3px;
		background: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 10px;
		padding: 5px 7px;
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
		animation: popIn 140ms cubic-bezier(0.34, 1.56, 0.64, 1);
		pointer-events: auto;
		white-space: nowrap;
	}

	@keyframes popIn {
		from { opacity: 0; transform: translate(-50%, -90%) scale(0.9); }
		to   { opacity: 1; transform: translate(-50%, -100%) scale(1); }
	}

	.img-tb-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid transparent;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: all 120ms ease;
	}

	.img-tb-btn:hover {
		background: #1e293b;
		color: #f1f5f9;
	}

	.img-tb-btn--active {
		background: #4f46e5 !important;
		color: white !important;
	}

	.img-tb-btn--danger:hover {
		background: #450a0a !important;
		color: #fca5a5 !important;
	}

	.img-tb-divider {
		width: 1px;
		height: 18px;
		background: #334155;
		margin: 0 3px;
	}

	/* ===== EDITOR CONTAINER ===== */
	.editor-container {
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: visible; /* allow floating toolbar to overflow */
		display: flex;
		flex-direction: column;
		transition: border-color 200ms ease, box-shadow 200ms ease;
	}

	.editor-container:focus-within {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.editor-container--disabled {
		opacity: 0.7;
		pointer-events: none;
	}

	/* Toolbar */
	.editor-toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		padding: 8px 12px;
		background: var(--bg-inset);
		border-bottom: 1px solid var(--border-hard);
		border-top-left-radius: var(--radius-lg);
		border-top-right-radius: var(--radius-lg);
	}

	.tool-group {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.tool-divider {
		width: 1px;
		height: 20px;
		background: var(--border-hard);
		margin: 0 4px;
	}

	.tool-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tool-btn:hover:not(:disabled) {
		background: #ffffff;
		border-color: var(--border-hard);
		color: var(--text-primary);
	}

	.tool-btn--active {
		background: var(--primary-light) !important;
		border-color: var(--primary-border) !important;
		color: var(--primary) !important;
	}

	.tool-btn--image:hover:not(:disabled) {
		color: #059669;
		background: var(--green-dim) !important;
		border-color: var(--green-border) !important;
	}

	.tool-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.text-btn {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
	}

	/* Content */
	:global(.editor-content .ProseMirror) {
		outline: none;
		padding: 20px 24px;
		min-height: 260px;
		font-family: var(--font-body);
		font-size: 14.5px;
		color: var(--text-primary);
		line-height: 1.7;
	}

	:global(.editor-content .ProseMirror p) { margin-bottom: 0.9em; }

	:global(.editor-content .ProseMirror h1) {
		font-family: var(--font-macro); font-size: 1.75rem; font-weight: 800;
		color: var(--text-primary); margin-top: 1.2em; margin-bottom: 0.5em;
		letter-spacing: -0.025em; line-height: 1.25;
	}

	:global(.editor-content .ProseMirror h2) {
		font-family: var(--font-macro); font-size: 1.35rem; font-weight: 800;
		color: var(--text-primary); margin-top: 1.1em; margin-bottom: 0.4em;
		padding-bottom: 6px; border-bottom: 1px solid var(--border-hard); letter-spacing: -0.02em;
	}

	:global(.editor-content .ProseMirror h3) {
		font-family: var(--font-macro); font-size: 1.15rem; font-weight: 700;
		color: var(--text-secondary); margin-top: 1em; margin-bottom: 0.4em;
	}

	:global(.editor-content .ProseMirror code) {
		font-family: var(--font-mono); background: var(--bg-inset); border: 1px solid var(--border-hard);
		border-radius: 5px; padding: 2px 6px; color: #4338ca; font-size: 0.9em; font-weight: 600;
	}

	:global(.editor-content .ProseMirror pre) {
		background: #1e293b; border: 1px solid #334155; border-radius: var(--radius-md);
		padding: 16px; font-family: var(--font-mono); font-size: 13px; color: #f8fafc;
		overflow-x: auto; margin-bottom: 1em; line-height: 1.55;
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
	}

	:global(.editor-content .ProseMirror pre code) {
		background: transparent; border: none; color: inherit; padding: 0; font-size: inherit;
	}

	:global(.editor-content .ProseMirror ul) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
	:global(.editor-content .ProseMirror ol) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
	:global(.editor-content .ProseMirror li) { margin-bottom: 0.3em; }

	:global(.editor-content .ProseMirror blockquote) {
		border-left: 4px solid var(--primary); padding: 8px 16px;
		color: var(--text-secondary); font-style: italic; margin-bottom: 1rem;
		background: var(--primary-light); border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	:global(.editor-content .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--text-muted); content: attr(data-placeholder);
		float: left; height: 0; pointer-events: none; font-style: normal;
	}

	/* Image selected outline */
	:global(.editor-content .ProseMirror .ProseMirror-selectednode .tiptap-image-figure img) {
		outline: 2.5px solid var(--primary);
		outline-offset: 2px;
		box-shadow: 0 0 0 4px var(--primary-light);
	}

	/* Status bar */
	.editor-statusbar {
		padding: 8px 16px;
		background: var(--bg-inset);
		border-top: 1px solid var(--border-hard);
		border-bottom-left-radius: var(--radius-lg);
		border-bottom-right-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.status-brand { font-weight: 700; letter-spacing: 0.04em; }
	.status-counts { display: flex; align-items: center; gap: 6px; font-weight: 600; }
	.status-dot { color: var(--border-hard); }

	/* ===== IMAGE INSERT DIALOG ===== */
	.img-dialog-backdrop {
		position: fixed; inset: 0;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
		z-index: 9999; display: flex; align-items: center; justify-content: center;
		padding: 20px; animation: backdropIn 180ms ease;
	}

	@keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }

	.img-dialog {
		background: white; border: 1px solid var(--border-hard);
		border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);
		width: 100%; max-width: 460px; overflow: hidden;
		animation: dialogIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes dialogIn {
		from { opacity: 0; transform: scale(0.93) translateY(8px); }
		to   { opacity: 1; transform: scale(1) translateY(0); }
	}

	.img-dialog__header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 16px 20px; border-bottom: 1px solid var(--border-hard); background: var(--bg-inset);
	}

	.img-dialog__title {
		display: flex; align-items: center; gap: 8px;
		font-family: var(--font-macro); font-size: 15px; font-weight: 800;
		color: var(--text-primary); letter-spacing: -0.01em;
	}

	.img-dialog__close {
		display: flex; align-items: center; justify-content: center;
		width: 30px; height: 30px; border-radius: var(--radius-md);
		border: 1px solid var(--border-hard); background: white; color: var(--text-muted);
		cursor: pointer; transition: all 150ms ease;
	}
	.img-dialog__close:hover { background: var(--red-dim); border-color: var(--red-border); color: var(--red); }

	.img-dialog__body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

	.img-field { display: flex; flex-direction: column; gap: 6px; }
	.img-field__label {
		font-family: var(--font-body); font-size: 12px; font-weight: 700;
		color: var(--text-secondary); letter-spacing: 0.02em; text-transform: uppercase;
	}
	.img-field__optional { font-weight: 400; color: var(--text-muted); text-transform: none; }
	.img-field__input {
		display: block; width: 100%; padding: 10px 14px;
		background: var(--bg-inset); border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md); font-family: var(--font-body); font-size: 13px;
		color: var(--text-primary); outline: none; transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.img-field__input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); background: white; }
	.img-field__input::placeholder { color: var(--text-ghost); }

	.img-divider-row { display: flex; align-items: center; gap: 10px; }
	.img-divider-line { flex: 1; border: none; border-top: 1px solid var(--border-hard); }
	.img-divider-text {
		font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
		font-weight: 600; letter-spacing: 0.04em; white-space: nowrap;
	}

	.img-upload-zone { display: flex; justify-content: center; }
	.img-upload-label {
		display: inline-flex; align-items: center; gap: 8px;
		padding: 10px 18px; background: var(--bg-inset);
		border: 1.5px dashed var(--border-hard); border-radius: var(--radius-md);
		font-family: var(--font-body); font-size: 13px; font-weight: 600;
		color: var(--text-secondary); cursor: pointer; transition: all 150ms ease; width: 100%; justify-content: center;
	}
	.img-upload-label:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
	.img-file-hidden { display: none; }

	.img-preview-box {
		background: var(--bg-inset); border: 1px solid var(--border-hard);
		border-radius: var(--radius-md); padding: 8px;
		display: flex; align-items: center; justify-content: center; max-height: 160px; overflow: hidden;
	}
	.img-preview-thumb { max-width: 100%; max-height: 144px; border-radius: 8px; object-fit: contain; }

	.img-dialog__footer {
		display: flex; align-items: center; justify-content: flex-end; gap: 10px;
		padding: 14px 20px; border-top: 1px solid var(--border-hard); background: var(--bg-inset);
	}

	.img-btn-cancel {
		padding: 8px 16px; background: white; border: 1px solid var(--border-hard);
		border-radius: var(--radius-md); font-family: var(--font-body); font-size: 13px;
		font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 150ms ease;
	}
	.img-btn-cancel:hover { border-color: #cbd5e1; color: var(--text-primary); }

	.img-btn-insert {
		display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		border: none; border-radius: var(--radius-md);
		font-family: var(--font-macro); font-size: 13px; font-weight: 700; color: white;
		cursor: pointer; box-shadow: 0 4px 12px -2px rgba(79, 70, 229, 0.3); transition: all 150ms ease;
	}
	.img-btn-insert:hover:not(:disabled) { background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%); transform: translateY(-1px); }
	.img-btn-insert:disabled { opacity: 0.45; cursor: not-allowed; }
</style>

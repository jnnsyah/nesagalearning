<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

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

	let element = $state<HTMLDivElement | null>(null);
	let editor  = $state<Editor | null>(null);

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

	// Stats
	let charCount = $state(0);
	let wordCount = $state(0);

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

		const text = editor.getText();
		charCount = text.length;
		wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	}

	onMount(() => {
		if (!element) return;
		editor = new Editor({
			element,
			extensions: [StarterKit],
			content: value,
			editable: !disabled,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				value = html;
				onchange?.(html);
				updateToolbarState();
			},
			onSelectionUpdate: () => {
				updateToolbarState();
			},
			onTransaction: () => {
				updateToolbarState();
			}
		});

		updateToolbarState();
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
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
</script>

<div class="editor-container" class:editor-container--disabled={disabled}>
	{#if editor && !disabled}
		<div class="editor-toolbar" role="toolbar" aria-label="Format Teks">
			<!-- Formatting Group -->
			<div class="tool-group">
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isBold}
					onclick={() => editor?.chain().focus().toggleBold().run()}
					title="Bold (Ctrl+B)"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isItalic}
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					title="Italic (Ctrl+I)"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isCode}
					onclick={() => editor?.chain().focus().toggleCode().run()}
					title="Inline Code"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
				</button>
			</div>

			<div class="tool-divider" aria-hidden="true"></div>

			<!-- Headings Group -->
			<div class="tool-group">
				<button
					type="button"
					class="tool-btn text-btn"
					class:tool-btn--active={isHeading1}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					title="Heading 1"
				>
					H1
				</button>
				<button
					type="button"
					class="tool-btn text-btn"
					class:tool-btn--active={isHeading2}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					title="Heading 2"
				>
					H2
				</button>
				<button
					type="button"
					class="tool-btn text-btn"
					class:tool-btn--active={isHeading3}
					onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
					title="Heading 3"
				>
					H3
				</button>
			</div>

			<div class="tool-divider" aria-hidden="true"></div>

			<!-- Structure Group -->
			<div class="tool-group">
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isBulletList}
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					title="Bullet List"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isOrderedList}
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					title="Numbered List"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isCodeBlock}
					onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
					title="Code Block"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					class:tool-btn--active={isBlockquote}
					onclick={() => editor?.chain().focus().toggleBlockquote().run()}
					title="Blockquote"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				</button>
			</div>

			<!-- History Group (Undo / Redo) -->
			<div class="tool-group ml-auto">
				<button
					type="button"
					class="tool-btn"
					onclick={() => editor?.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					title="Undo (Ctrl+Z)"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
				</button>
				<button
					type="button"
					class="tool-btn"
					onclick={() => editor?.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					title="Redo (Ctrl+Y)"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- ProseMirror Content Editable Canvas -->
	<div bind:this={element} class="editor-content"></div>

	<!-- Status / Metrics Footer -->
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
	.editor-container {
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
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

	.tool-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.text-btn {
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
	}

	/* Content Area */
	:global(.editor-content .ProseMirror) {
		outline: none;
		padding: 20px 24px;
		min-height: 260px;
		font-family: var(--font-body);
		font-size: 14.5px;
		color: var(--text-primary);
		line-height: 1.7;
	}

	:global(.editor-content .ProseMirror p) {
		margin-bottom: 0.9em;
	}

	:global(.editor-content .ProseMirror h1) {
		font-family: var(--font-macro);
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 1.2em;
		margin-bottom: 0.5em;
		letter-spacing: -0.025em;
		line-height: 1.25;
	}

	:global(.editor-content .ProseMirror h2) {
		font-family: var(--font-macro);
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 1.1em;
		margin-bottom: 0.4em;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border-hard);
		letter-spacing: -0.02em;
	}

	:global(.editor-content .ProseMirror h3) {
		font-family: var(--font-macro);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin-top: 1em;
		margin-bottom: 0.4em;
	}

	:global(.editor-content .ProseMirror code) {
		font-family: var(--font-mono);
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: 5px;
		padding: 2px 6px;
		color: #4338ca;
		font-size: 0.9em;
		font-weight: 600;
	}

	:global(.editor-content .ProseMirror pre) {
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
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
	}

	:global(.editor-content .ProseMirror pre code) {
		background: transparent;
		border: none;
		color: inherit;
		padding: 0;
		font-size: inherit;
	}

	:global(.editor-content .ProseMirror ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}

	:global(.editor-content .ProseMirror ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}

	:global(.editor-content .ProseMirror li) {
		margin-bottom: 0.3em;
	}

	:global(.editor-content .ProseMirror blockquote) {
		border-left: 4px solid var(--primary);
		padding-left: 16px;
		color: var(--text-secondary);
		font-style: italic;
		margin-bottom: 1rem;
		background: var(--primary-light);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		padding-top: 8px;
		padding-bottom: 8px;
	}

	:global(.editor-content .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--text-muted);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
		font-style: normal;
	}

	/* Status bar */
	.editor-statusbar {
		padding: 8px 16px;
		background: var(--bg-inset);
		border-top: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.status-brand {
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.status-counts {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}

	.status-dot {
		color: var(--border-hard);
	}
</style>

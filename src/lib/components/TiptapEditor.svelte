<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	let {
		value = $bindable(''),
		placeholder = 'Tulis materi di sini...',
		disabled = false,
		onchange
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		onchange?: (html: string) => void;
	} = $props();

	let element: HTMLDivElement;
	let editor = $state<Editor | null>(null);

	// Track editor active state updates
	let isBold = $state(false);
	let isItalic = $state(false);
	let isCode = $state(false);
	let isCodeBlock = $state(false);
	let isHeading1 = $state(false);
	let isHeading2 = $state(false);
	let isHeading3 = $state(false);
	let isBulletList = $state(false);
	let isOrderedList = $state(false);
	let isBlockquote = $state(false);

	function updateToolbarState() {
		if (!editor) return;
		isBold = editor.isActive('bold');
		isItalic = editor.isActive('italic');
		isCode = editor.isActive('code');
		isCodeBlock = editor.isActive('codeBlock');
		isHeading1 = editor.isActive('heading', { level: 1 });
		isHeading2 = editor.isActive('heading', { level: 2 });
		isHeading3 = editor.isActive('heading', { level: 3 });
		isBulletList = editor.isActive('bulletList');
		isOrderedList = editor.isActive('orderedList');
		isBlockquote = editor.isActive('blockquote');
	}

	onMount(() => {
		editor = new Editor({
			element: element,
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

	// Keep editor in sync if value prop changes externally
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

<div class="tiptap-wrapper border border-[var(--color-border-hard,#2A2A2A)] bg-[#0D0D0D]">
	{#if editor && !disabled}
		<div
			class="toolbar flex flex-wrap gap-1 border-b border-[var(--color-border-hard,#2A2A2A)] bg-[#111111] p-2 font-mono text-xs uppercase"
		>
			<button
				type="button"
				class="btn-tool {isBold ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleBold().run()}
				title="Bold"
			>
				[B]
			</button>
			<button
				type="button"
				class="btn-tool {isItalic ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleItalic().run()}
				title="Italic"
			>
				[I]
			</button>
			<button
				type="button"
				class="btn-tool {isCode ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleCode().run()}
				title="Inline Code"
			>
				[`]`
			</button>

			<div class="divider"></div>

			<button
				type="button"
				class="btn-tool {isHeading1 ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
			>
				H1
			</button>
			<button
				type="button"
				class="btn-tool {isHeading2 ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
			>
				H2
			</button>
			<button
				type="button"
				class="btn-tool {isHeading3 ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
			>
				H3
			</button>

			<div class="divider"></div>

			<button
				type="button"
				class="btn-tool {isBulletList ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleBulletList().run()}
			>
				• LIST
			</button>
			<button
				type="button"
				class="btn-tool {isOrderedList ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleOrderedList().run()}
			>
				1. LIST
			</button>
			<button
				type="button"
				class="btn-tool {isCodeBlock ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
			>
				CODE BLOCK
			</button>
			<button
				type="button"
				class="btn-tool {isBlockquote ? 'active' : ''}"
				onclick={() => editor?.chain().focus().toggleBlockquote().run()}
			>
				QUOTE
			</button>

			<div class="divider"></div>

			<button
				type="button"
				class="btn-tool ml-auto"
				onclick={() => editor?.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
			>
				[UNDO]
			</button>
			<button
				type="button"
				class="btn-tool"
				onclick={() => editor?.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
			>
				[REDO]
			</button>
		</div>
	{/if}

	<div bind:this={element} class="tiptap-editor-content p-4 min-h-[300px] text-gray-200"></div>

	<div class="border-t border-[#1A1A1A] bg-[#0A0A0A] px-3 py-1 font-mono text-[10px] text-gray-500 uppercase flex justify-between">
		<span>TIPTAP PROSE EDITOR v1.0</span>
		<span>SYSTEM // MATERI_CONTENT_BUFFER</span>
	</div>
</div>

<style>
	.btn-tool {
		background: var(--color-bg-cell, #181818);
		border: 1px solid var(--color-border-hard, #2a2a2a);
		color: var(--color-text-secondary, #a0a0a0);
		padding: 4px 8px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 100ms ease;
	}
	.btn-tool:hover:not(:disabled) {
		color: var(--color-text-primary, #eaeaea);
		border-color: var(--color-text-secondary, #a0a0a0);
	}
	.btn-tool.active {
		background: #220808;
		color: var(--color-red, #e61919);
		border-color: var(--color-red, #e61919);
	}
	.btn-tool:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.divider {
		width: 1px;
		background: var(--color-border-hard, #2a2a2a);
		margin: 0 4px;
	}

	:global(.tiptap-editor-content .ProseMirror) {
		outline: none;
		min-height: 280px;
		font-family: var(--font-body, sans-serif);
		line-height: 1.6;
	}
	:global(.tiptap-editor-content .ProseMirror p) {
		margin-bottom: 0.75em;
	}
	:global(.tiptap-editor-content .ProseMirror h1) {
		font-family: var(--font-macro, sans-serif);
		font-size: 1.8rem;
		font-weight: 800;
		color: #eaeaea;
		margin-top: 1em;
		margin-bottom: 0.5em;
		letter-spacing: -0.02em;
	}
	:global(.tiptap-editor-content .ProseMirror h2) {
		font-family: var(--font-mono, monospace);
		font-size: 1.4rem;
		font-weight: 700;
		color: #eaeaea;
		margin-top: 1em;
		margin-bottom: 0.4em;
		border-bottom: 1px solid #2a2a2a;
		padding-bottom: 4px;
	}
	:global(.tiptap-editor-content .ProseMirror h3) {
		font-family: var(--font-mono, monospace);
		font-size: 1.1rem;
		font-weight: 600;
		color: #a0a0a0;
		margin-top: 0.8em;
		margin-bottom: 0.3em;
	}
	:global(.tiptap-editor-content .ProseMirror code) {
		font-family: var(--font-mono, monospace);
		background: #181818;
		border: 1px solid #2a2a2a;
		padding: 2px 5px;
		color: #e61919;
		font-size: 0.9em;
	}
	:global(.tiptap-editor-content .ProseMirror pre) {
		background: #000000;
		border: 1px solid #2a2a2a;
		padding: 12px;
		font-family: var(--font-mono, monospace);
		color: #4af626;
		overflow-x: auto;
		margin-bottom: 1em;
	}
	:global(.tiptap-editor-content .ProseMirror pre code) {
		background: transparent;
		border: none;
		color: inherit;
		padding: 0;
	}
	:global(.tiptap-editor-content .ProseMirror ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
	:global(.tiptap-editor-content .ProseMirror ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
	:global(.tiptap-editor-content .ProseMirror blockquote) {
		border-left: 3px solid #e61919;
		padding-left: 1rem;
		color: #a0a0a0;
		font-style: italic;
		margin-bottom: 1rem;
	}
	:global(.tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before) {
		color: #585858;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}
</style>

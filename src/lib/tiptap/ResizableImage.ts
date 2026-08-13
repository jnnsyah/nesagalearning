import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export type ImageAlignment = 'left' | 'center' | 'right' | 'full';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		resizableImage: {
			setResizableImage: (options: {
				src: string;
				alt?: string;
				title?: string;
				width?: number | string;
				alignment?: ImageAlignment;
			}) => ReturnType;
			updateImageSize: (width: number | string) => ReturnType;
			updateImageAlignment: (alignment: ImageAlignment) => ReturnType;
		};
	}
}

export const ResizableImage = Image.extend({
	name: 'resizableImage',
	group: 'block',

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (el) => {
					if (el.tagName === 'IMG') return (el as HTMLImageElement).getAttribute('src');
					const img = el.querySelector('img');
					return img ? img.getAttribute('src') : el.getAttribute('src');
				}
			},
			alt: {
				default: null,
				parseHTML: (el) => {
					if (el.tagName === 'IMG') return (el as HTMLImageElement).getAttribute('alt');
					const img = el.querySelector('img');
					return img ? img.getAttribute('alt') : el.getAttribute('alt');
				}
			},
			title: {
				default: null,
				parseHTML: (el) => {
					if (el.tagName === 'IMG') return (el as HTMLImageElement).getAttribute('title');
					const img = el.querySelector('img');
					return img ? img.getAttribute('title') : el.getAttribute('title');
				}
			},
			width: {
				default: null,
				parseHTML: (el) => {
					const img = el.tagName === 'FIGURE' ? el.querySelector('img') : (el as HTMLImageElement);
					return img?.style.width || img?.getAttribute('width') || null;
				},
				renderHTML: () => ({})
			},
			alignment: {
				default: 'center',
				parseHTML: (el) => el.getAttribute('data-alignment') || 'center',
				renderHTML: (attrs) => ({ 'data-alignment': attrs.alignment || 'center' })
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'figure[data-alignment]' },
			{ tag: 'figure.tiptap-image-figure' },
			{ tag: 'img[src]' }
		];
	},

	renderHTML({ HTMLAttributes }) {
		const { alignment, width, src, alt, title } = HTMLAttributes;
		const align: ImageAlignment = alignment || 'center';
		const imgStyle = `max-width:100%;height:auto;display:inline-block;${width ? `width:${width}${typeof width === 'number' ? 'px' : ''};` : ''}`;
		return [
			'figure',
			{ 'data-alignment': align, class: 'tiptap-image-figure' },
			['img', mergeAttributes({ src, alt, title }, { style: imgStyle })]
		];
	},

	addNodeView() {
		return ({ node, editor }) => {
			const { src, alt, title, width, alignment } = node.attrs;
			const align: ImageAlignment = alignment || 'center';

			// === Outer wrapper ===
			const wrapper = document.createElement('div');
			wrapper.className = 'tiptap-image-wrapper';
			applyWrapperAlign(wrapper, align);

			// === Figure ===
			const figure = document.createElement('figure');
			figure.className = 'tiptap-image-figure';
			figure.setAttribute('data-alignment', align);
			figure.style.cssText = 'position:relative;display:inline-block;max-width:100%;margin:0;';

			// === Image ===
			const img = document.createElement('img');
			img.src = src;
			if (alt) img.alt = alt;
			if (title) img.title = title;
			img.style.cssText = 'display:block;max-width:100%;height:auto;border-radius:10px;user-select:none;';
			if (width) img.style.width = typeof width === 'number' ? `${width}px` : width;

			// === Corner resize handles ===
			type Corner = 'nw' | 'ne' | 'sw' | 'se';
			const corners: Corner[] = ['nw', 'ne', 'sw', 'se'];
			const handles: HTMLDivElement[] = [];

			const cornerCursors: Record<Corner, string> = {
				nw: 'nw-resize', ne: 'ne-resize',
				sw: 'sw-resize', se: 'se-resize'
			};

			corners.forEach((corner) => {
				const h = document.createElement('div');
				h.className = `tiptap-resize-handle tiptap-resize-handle--${corner}`;
				h.style.cssText = `
					position:absolute;
					width:12px;
					height:12px;
					background:#4f46e5;
					border:2px solid white;
					border-radius:50%;
					cursor:${cornerCursors[corner]};
					z-index:20;
					opacity:0;
					transition:opacity 150ms ease, transform 100ms ease;
					box-shadow:0 1px 6px rgba(79,70,229,0.5);
				`;

				// Position each corner
				if (corner === 'nw') { h.style.top = '-6px'; h.style.left = '-6px'; }
				if (corner === 'ne') { h.style.top = '-6px'; h.style.right = '-6px'; }
				if (corner === 'sw') { h.style.bottom = '-6px'; h.style.left = '-6px'; }
				if (corner === 'se') { h.style.bottom = '-6px'; h.style.right = '-6px'; }

				// Drag resize
				h.addEventListener('mousedown', (e: MouseEvent) => {
					e.preventDefault();
					e.stopPropagation();

					const startX = e.clientX;
					const startY = e.clientY;
					const startW = img.getBoundingClientRect().width;
					const startH = img.getBoundingClientRect().height;
					const aspectRatio = startW / startH;

					// Scale from the relevant corner
					const isLeft = corner === 'nw' || corner === 'sw';
					const isTop = corner === 'nw' || corner === 'ne';

					const onMove = (ev: MouseEvent) => {
						const dx = isLeft ? startX - ev.clientX : ev.clientX - startX;
						const dy = isTop  ? startY - ev.clientY : ev.clientY - startY;
						// Use the larger delta, keep aspect ratio
						const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
						const newW = Math.max(60, startW + delta);
						img.style.width = `${newW}px`;
						img.style.height = `${newW / aspectRatio}px`;
					};

					const onUp = () => {
						const finalW = img.style.width;
						editor.chain().updateAttributes('resizableImage', { width: finalW }).run();
						window.removeEventListener('mousemove', onMove);
						window.removeEventListener('mouseup', onUp);
					};

					window.addEventListener('mousemove', onMove);
					window.addEventListener('mouseup', onUp);
				});

				figure.appendChild(h);
				handles.push(h);
			});

			// Show/hide handles
			function showHandles() { handles.forEach((h) => (h.style.opacity = '1')); }
			function hideHandles() { handles.forEach((h) => (h.style.opacity = '0')); }

			figure.addEventListener('mouseenter', showHandles);
			figure.addEventListener('mouseleave', hideHandles);

			// Also show when node is selected (ProseMirror adds this class)
			const obs = new MutationObserver(() => {
				if (wrapper.classList.contains('ProseMirror-selectednode')) {
					showHandles();
				}
			});
			obs.observe(wrapper, { attributes: true, attributeFilter: ['class'] });

			figure.appendChild(img);
			wrapper.appendChild(figure);

			return {
				dom: wrapper,
				contentDOM: undefined,
				update: (updatedNode) => {
					if (updatedNode.type !== node.type) return false;
					const { src: ns, alt: na, width: nw, alignment: nalign } = updatedNode.attrs;
					img.src = ns;
					if (na !== undefined) img.alt = na;
					if (nw) {
						img.style.width = typeof nw === 'number' ? `${nw}px` : nw;
						img.style.height = 'auto';
					}
					const a: ImageAlignment = nalign || 'center';
					figure.setAttribute('data-alignment', a);
					applyWrapperAlign(wrapper, a);
					return true;
				},
				destroy: () => {
					obs.disconnect();
				}
			};
		};
	},

	addCommands() {
		return {
			setResizableImage:
				(options) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs: options }),
			updateImageSize:
				(width) =>
				({ commands }) =>
					commands.updateAttributes(this.name, { width }),
			updateImageAlignment:
				(alignment) =>
				({ commands }) =>
					commands.updateAttributes(this.name, { alignment })
		};
	}
});

function applyWrapperAlign(wrapper: HTMLElement, align: ImageAlignment) {
	wrapper.style.cssText = `display:flex;margin:1em 0;`;
	if (align === 'left')   { wrapper.style.justifyContent = 'flex-start'; }
	if (align === 'center') { wrapper.style.justifyContent = 'center'; }
	if (align === 'right')  { wrapper.style.justifyContent = 'flex-end'; }
	if (align === 'full')   { wrapper.style.display = 'block'; }
}

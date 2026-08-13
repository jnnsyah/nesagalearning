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
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (el) => {
					// Try to read from the figure's img child
					const img = el.tagName === 'FIGURE' ? (el.querySelector('img') as HTMLImageElement) : (el as HTMLImageElement);
					return img?.getAttribute('width') || img?.style.width || null;
				},
				renderHTML: () => ({}) // handled in NodeView
			},
			alignment: {
				default: 'center',
				parseHTML: (el) => (el as HTMLElement).getAttribute('data-alignment') || 'center',
				renderHTML: (attrs) => ({ 'data-alignment': attrs.alignment || 'center' })
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'figure[data-alignment]' },
			{ tag: 'img[src]' }
		];
	},

	renderHTML({ HTMLAttributes }) {
		const { alignment, width, src, alt, title } = HTMLAttributes;
		const align: ImageAlignment = alignment || 'center';
		const imgStyle = `max-width:100%;height:auto;${width ? `width:${width}${typeof width === 'number' ? 'px' : ''};` : ''}`;
		return [
			'figure',
			{ 'data-alignment': align, class: 'tiptap-image-figure' },
			['img', mergeAttributes({ src, alt, title }, { style: imgStyle })]
		];
	},

	addNodeView() {
		return ({ node, getPos, editor }) => {
			const { src, alt, title, width, alignment } = node.attrs;
			const align: ImageAlignment = alignment || 'center';

			// Wrapper figure
			const figure = document.createElement('figure');
			figure.className = 'tiptap-image-figure';
			figure.setAttribute('data-alignment', align);
			figure.style.cssText = alignStyle(align);
			figure.style.position = 'relative';
			figure.style.display = 'inline-block';
			figure.style.maxWidth = '100%';
			if (align === 'center') { figure.style.display = 'block'; figure.style.textAlign = 'center'; }
			if (align === 'full') { figure.style.display = 'block'; figure.style.width = '100%'; }
			if (align === 'left') { figure.style.display = 'block'; figure.style.textAlign = 'left'; }
			if (align === 'right') { figure.style.display = 'block'; figure.style.textAlign = 'right'; }

			// Image
			const img = document.createElement('img');
			img.src = src;
			if (alt) img.alt = alt;
			if (title) img.title = title;
			img.style.maxWidth = '100%';
			img.style.height = 'auto';
			img.style.borderRadius = '10px';
			img.style.display = 'inline-block';
			if (width) img.style.width = typeof width === 'number' ? `${width}px` : width;

			// Resize handle (right side)
			const handle = document.createElement('div');
			handle.className = 'tiptap-resize-handle';
			handle.style.cssText = `
				position: absolute;
				right: -7px;
				top: 50%;
				transform: translateY(-50%);
				width: 14px;
				height: 48px;
				background: #4f46e5;
				border-radius: 6px;
				cursor: ew-resize;
				opacity: 0;
				transition: opacity 150ms ease;
				z-index: 10;
				box-shadow: 0 2px 8px rgba(79,70,229,0.4);
			`;

			// Show handle on figure hover/selected
			figure.addEventListener('mouseenter', () => { handle.style.opacity = '0.85'; });
			figure.addEventListener('mouseleave', () => { handle.style.opacity = '0'; });

			// Drag resize
			let startX = 0;
			let startW = 0;

			handle.addEventListener('mousedown', (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				startX = e.clientX;
				startW = img.getBoundingClientRect().width;

				const onMove = (ev: MouseEvent) => {
					const newW = Math.max(80, startW + (ev.clientX - startX));
					img.style.width = `${newW}px`;
				};

				const onUp = () => {
					const finalW = img.style.width;
					if (typeof getPos === 'function') {
						editor.chain().updateAttributes('resizableImage', { width: finalW }).run();
					}
					handle.style.opacity = '0.85';
					window.removeEventListener('mousemove', onMove);
					window.removeEventListener('mouseup', onUp);
				};

				window.addEventListener('mousemove', onMove);
				window.addEventListener('mouseup', onUp);
			});

			figure.appendChild(img);
			figure.appendChild(handle);

			return {
				dom: figure,
				contentDOM: undefined,
				update: (updatedNode) => {
					if (updatedNode.type !== node.type) return false;
					const { src: ns, alt: na, width: nw, alignment: nalign } = updatedNode.attrs;
					img.src = ns;
					if (na) img.alt = na;
					if (nw) img.style.width = typeof nw === 'number' ? `${nw}px` : nw;
					const a: ImageAlignment = nalign || 'center';
					figure.setAttribute('data-alignment', a);
					applyAlign(figure, a);
					return true;
				},
				destroy: () => {}
			};
		};
	},

	addCommands() {
		return {
			setResizableImage:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: options
					});
				},
			updateImageSize:
				(width) =>
				({ commands }) => {
					return commands.updateAttributes(this.name, { width });
				},
			updateImageAlignment:
				(alignment) =>
				({ commands }) => {
					return commands.updateAttributes(this.name, { alignment });
				}
		};
	}
});

function alignStyle(align: ImageAlignment): string {
	if (align === 'left') return 'margin-right:auto;margin-left:0;';
	if (align === 'right') return 'margin-left:auto;margin-right:0;';
	if (align === 'full') return 'width:100%;';
	return 'margin-left:auto;margin-right:auto;';
}

function applyAlign(figure: HTMLElement, align: ImageAlignment) {
	figure.style.display = 'block';
	if (align === 'center') { figure.style.textAlign = 'center'; figure.style.marginLeft = 'auto'; figure.style.marginRight = 'auto'; figure.style.width = ''; }
	if (align === 'left') { figure.style.textAlign = 'left'; figure.style.marginLeft = '0'; figure.style.marginRight = 'auto'; figure.style.width = ''; }
	if (align === 'right') { figure.style.textAlign = 'right'; figure.style.marginLeft = 'auto'; figure.style.marginRight = '0'; figure.style.width = ''; }
	if (align === 'full') { figure.style.textAlign = 'left'; figure.style.marginLeft = '0'; figure.style.marginRight = '0'; figure.style.width = '100%'; }
}

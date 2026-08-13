import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
	name: 'codeBlock',

	addAttributes() {
		return {
			...this.parent?.(),
			language: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-language') || element.className.replace('language-', '') || null,
				renderHTML: (attributes) => {
					if (!attributes.language) return {};
					return {
						'data-language': attributes.language,
						class: `language-${attributes.language}`
					};
				}
			}
		};
	},

	addNodeView() {
		return ({ node }) => {
			const wrapper = document.createElement('div');
			wrapper.className = 'tiptap-code-block-wrapper';

			// ── Mac Window Style Header Bar ──
			const header = document.createElement('div');
			header.className = 'code-block-header';

			// Dots
			const dots = document.createElement('div');
			dots.className = 'mac-dots';
			dots.innerHTML = `
				<span class="mac-dot mac-dot--red"></span>
				<span class="mac-dot mac-dot--yellow"></span>
				<span class="mac-dot mac-dot--green"></span>
			`;

			// Language Badge
			const langWrapper = document.createElement('div');
			langWrapper.className = 'code-block-lang';
			const lang = node.attrs.language || 'code';
			langWrapper.innerHTML = `<span class="code-block-lang__tag">${lang}</span>`;

			// Copy Button
			const copyBtn = document.createElement('button');
			copyBtn.type = 'button';
			copyBtn.className = 'code-copy-btn';
			copyBtn.setAttribute('aria-label', 'Salin Kode');
			copyBtn.innerHTML = `
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
				<span>Salin</span>
			`;

			let timer: ReturnType<typeof setTimeout> | null = null;
			copyBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const text = node.textContent;
				if (!text) return;
				navigator.clipboard.writeText(text).then(() => {
					copyBtn.classList.add('code-copy-btn--copied');
					copyBtn.innerHTML = `
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
						<span>Tersalin!</span>
					`;
					if (timer) clearTimeout(timer);
					timer = setTimeout(() => {
						copyBtn.classList.remove('code-copy-btn--copied');
						copyBtn.innerHTML = `
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
							<span>Salin</span>
						`;
					}, 2000);
				});
			});

			header.appendChild(dots);
			header.appendChild(langWrapper);
			header.appendChild(copyBtn);

			const pre = document.createElement('pre');
			const code = document.createElement('code');
			pre.appendChild(code);

			wrapper.appendChild(header);
			wrapper.appendChild(pre);

			return {
				dom: wrapper,
				contentDOM: code,
				destroy: () => {
					if (timer) clearTimeout(timer);
				}
			};
		};
	}
});

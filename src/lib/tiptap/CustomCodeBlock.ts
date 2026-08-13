import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
	name: 'codeBlock',

	addNodeView() {
		return ({ node }) => {
			const container = document.createElement('div');
			container.className = 'tiptap-code-block-container';
			container.style.cssText = 'position:relative;margin:1em 0;';

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

			const pre = document.createElement('pre');
			const code = document.createElement('code');
			pre.appendChild(code);

			container.appendChild(copyBtn);
			container.appendChild(pre);

			return {
				dom: container,
				contentDOM: code,
				destroy: () => {
					if (timer) clearTimeout(timer);
				}
			};
		};
	}
});

<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isReadCompleted = $state(data.isCompleted);
	let isSubmitting = $state(false);
	let fontSize = $state<'sm' | 'base' | 'lg'>('base');
	let isFocusMode = $state(false);
	let scrollProgress = $state(0);

	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let tocList = $state<TocItem[]>([]);
	let activeTocId = $state<string>('');
	let isTocOpen = $state<boolean>(true);

	$effect(() => {
		isReadCompleted = data.isCompleted;
	});

	function setFontSize(size: 'sm' | 'base' | 'lg') {
		fontSize = size;
	}

	function toggleFocusMode() {
		isFocusMode = !isFocusMode;
	}

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			activeTocId = id;
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	$effect(() => {
		if (isFocusMode) {
			document.body.classList.add('focus-mode-active');
		} else {
			document.body.classList.remove('focus-mode-active');
		}
		return () => {
			document.body.classList.remove('focus-mode-active');
		};
	});

	$effect(() => {
		if (!data.materi.content) return;
		const article = document.querySelector('.prose-reading');
		if (!article) return;

		// 1. Transform code blocks into Pro Code Block Boxes
		const pres = article.querySelectorAll('pre');
		pres.forEach((pre) => {
			if (pre.parentElement?.classList.contains('tiptap-code-block-wrapper')) return;

			const wrapper = document.createElement('div');
			wrapper.className = 'tiptap-code-block-wrapper';

			const codeEl = pre.querySelector('code');
			let lang = 'code';
			if (codeEl) {
				const classList = Array.from(codeEl.classList);
				const langClass = classList.find((c) => c.startsWith('language-'));
				if (langClass) {
					lang = langClass.replace('language-', '');
				}
			}

			const header = document.createElement('div');
			header.className = 'code-block-header';
			header.innerHTML = `
				<div class="mac-dots">
					<span class="mac-dot mac-dot--red"></span>
					<span class="mac-dot mac-dot--yellow"></span>
					<span class="mac-dot mac-dot--green"></span>
				</div>
				<div class="code-block-lang">
					<span class="code-block-lang__tag">${lang}</span>
				</div>
				<button type="button" class="code-copy-btn">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
					</svg>
					<span>Salin</span>
				</button>
			`;

			const copyBtn = header.querySelector('.code-copy-btn');
			if (copyBtn) {
				copyBtn.addEventListener('click', () => {
					const codeText = pre.textContent || '';
					navigator.clipboard.writeText(codeText);
					copyBtn.classList.add('code-copy-btn--copied');
					const textSpan = copyBtn.querySelector('span');
					if (textSpan) textSpan.textContent = 'Tersalin!';
					toast.success('Kode berhasil disalin!');
					setTimeout(() => {
						copyBtn.classList.remove('code-copy-btn--copied');
						if (textSpan) textSpan.textContent = 'Salin';
					}, 2000);
				});
			}

			pre.parentNode?.insertBefore(wrapper, pre);
			wrapper.appendChild(header);
			wrapper.appendChild(pre);
		});

		// 2. Auto-detect Headings for Table of Contents (ToC)
		const headings = article.querySelectorAll('h1, h2, h3');
		const items: TocItem[] = [];

		headings.forEach((heading, idx) => {
			const text = heading.textContent?.trim() || '';
			if (!text) return;

			let id = heading.id;
			if (!id) {
				id = `heading-${idx}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
				heading.id = id;
			}

			const tagName = heading.tagName.toLowerCase();
			const level = tagName === 'h1' ? 1 : tagName === 'h2' ? 2 : 3;

			items.push({ id, text, level });
		});

		tocList = items;

		// 3. Set up IntersectionObserver for active heading highlight
		if (items.length > 0) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							activeTocId = entry.target.id;
						}
					});
				},
				{ rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
			);

			headings.forEach((h) => observer.observe(h));
			return () => observer.disconnect();
		}
	});
</script>

<svelte:head>
	<title>{data.materi.title} — Materi Pembelajaran</title>
</svelte:head>

<!-- Top Reading Progress Indicator -->
<div class="reading-progress-bar-wrap">
	<div class="reading-progress-bar" style="width: {scrollProgress}%;"></div>
</div>

<div class="viewer-container {isFocusMode ? 'focus-mode' : ''}">
	<!-- Reader Toolbar & Header Card -->
	<div class="reader-header-card">
		<nav class="breadcrumb mb-3" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<a href="/siswa/materi" class="bc-link">Katalog Materi</a>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current truncate max-w-[200px]">{data.materi.title}</span>
		</nav>

		<div class="flex items-center gap-2 mb-3 flex-wrap">
			<span class="track-badge">{data.materi.trackTitle}</span>
			<span class="phase-badge">{data.materi.phaseTitle} &rsaquo; {data.materi.subPhaseTitle}</span>
		</div>

		<h1 class="reader-title">{data.materi.title}</h1>
		<p class="reader-subtitle">Modul pembelajaran interaktif kurikulum Nesaga Learning Center.</p>

		<!-- Reader Utility Controls Bar -->
		<div class="reader-controls-bar mt-5 pt-4">
			<div class="flex items-center gap-3 flex-wrap">
				<!-- Font Size Adjuster -->
				<div class="font-size-group">
					<span class="ctrl-label">Ukuran Teks:</span>
					<button
						type="button"
						onclick={() => setFontSize('sm')}
						class="size-btn {fontSize === 'sm' ? 'size-btn-active' : ''}"
						title="Teks Kecil"
					>
						A-
					</button>
					<button
						type="button"
						onclick={() => setFontSize('base')}
						class="size-btn {fontSize === 'base' ? 'size-btn-active' : ''}"
						title="Teks Normal"
					>
						A
					</button>
					<button
						type="button"
						onclick={() => setFontSize('lg')}
						class="size-btn {fontSize === 'lg' ? 'size-btn-active' : ''}"
						title="Teks Besar"
					>
						A+
					</button>
				</div>

				<!-- Focus Mode Toggle -->
				<button
					type="button"
					onclick={toggleFocusMode}
					class="ctrl-btn {isFocusMode ? 'ctrl-btn-active' : ''}"
				>
					{#if isFocusMode}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 14h6v6m10-10h-6V4m0 16h6v-6M4 10h6V4" />
						</svg>
						<span>Keluar Mode Fokus</span>
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
						</svg>
						<span>Mode Fokus</span>
					{/if}
				</button>
			</div>

			<!-- Read Completion Toggle Form Button -->
			<form
				method="POST"
				action="?/toggleCompletion"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success' && result.data) {
							const actionData = result.data as { isCompleted?: boolean; message?: string };
							isReadCompleted = !!actionData.isCompleted;
							if (isReadCompleted) {
								toast.success(actionData.message || 'Materi ditandai selesai dibaca.');
							} else {
								toast.info(actionData.message || 'Status selesai dibaca dibatalkan.');
							}
						}
						await update({ reset: false });
					};
				}}
			>
				<button
					type="submit"
					disabled={isSubmitting}
					class="btn-mark-read {isReadCompleted ? 'btn-read-completed' : ''}"
				>
					{#if isReadCompleted}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						<span>Selesai Dibaca</span>
					{:else}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<span>Tandai Selesai</span>
					{/if}
				</button>
			</form>
		</div>
	</div>

	<!-- Slide Presentasi Attachment Card -->
	{#if data.sessionSlide?.materialUrl}
		<div class="slide-card mb-6">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<div class="flex items-center gap-3.5">
					<div class="slide-icon-wrap">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</div>
					<div>
						<h4 class="slide-card-title">Slide Presentasi PPT Pertemuan</h4>
						<p class="slide-card-sub">
							Materi presentasi untuk sesi <strong>{data.sessionSlide.pertemuanTitle}</strong>
						</p>
					</div>
				</div>

				<a
					href={data.sessionSlide.materialUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn-download-slide"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					<span>Unduh Berkas PPT</span>
				</a>
			</div>
		</div>
	{/if}

	<!-- Dedicated Table of Contents (ToC) Section Card Outside Article Container -->
	{#if tocList.length > 0}
		<div class="toc-section-card mb-6">
			<div class="toc-header">
				<div class="flex items-center gap-2.5">
					<div class="toc-icon-badge">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="8" y1="6" x2="21" y2="6" />
							<line x1="8" y1="12" x2="21" y2="12" />
							<line x1="8" y1="18" x2="21" y2="18" />
							<line x1="3" y1="6" x2="3.01" y2="6" />
							<line x1="3" y1="12" x2="3.01" y2="12" />
							<line x1="3" y1="18" x2="3.01" y2="18" />
						</svg>
					</div>
					<div>
						<h3 class="toc-section-title">Daftar Isi &amp; Topik Pembelajaran</h3>
						<p class="toc-section-sub">Lompat langsung ke sub-bab materi yang ingin dipelajari</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<span class="toc-count-pill">{tocList.length} Topik</span>
					<button
						type="button"
						onclick={() => isTocOpen = !isTocOpen}
						class="btn-toggle-toc"
					>
						<span>{isTocOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="transform transition-transform {isTocOpen ? 'rotate-180' : ''}"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>
				</div>
			</div>

			{#if isTocOpen}
				<nav class="toc-grid-list mt-4 pt-4 border-t border-slate-200">
					{#each tocList as item}
						<button
							type="button"
							onclick={() => scrollToHeading(item.id)}
							class="toc-grid-item level-{item.level} {activeTocId === item.id ? 'toc-item-active' : ''}"
						>
							<span class="toc-bullet"></span>
							<span class="toc-text truncate">{item.text}</span>
						</button>
					{/each}
				</nav>
			{/if}
		</div>
	{/if}

	<!-- Main Article Reading Card (Main Container Width Preserved) -->
	<main class="reading-article-card size-{fontSize}">
		{#if data.materi.content}
			<div class="prose-reading">
				{@html data.materi.content}
			</div>
		{:else}
			<div class="empty-reading-state">
				<div class="empty-icon-wrap mb-3">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<h3 class="empty-title">Modul Materi Dalam Penyusunan</h3>
				<p class="empty-sub">Instruktur/Mentor sedang menyiapkan konten pembelajaran interaktif untuk modul ini.</p>
			</div>
		{/if}
	</main>

	<!-- Footer Lesson Navigation -->
	<nav class="lesson-nav-footer mt-8">
		{#if data.prevMateri}
			<a href={`/siswa/materi/${data.prevMateri.id}`} class="btn-lesson-nav prev-lesson">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="15 18 9 12 15 6" />
				</svg>
				<div class="text-left min-w-0">
					<span class="lesson-nav-dir">Materi Sebelumnya</span>
					<div class="lesson-nav-title truncate">{data.prevMateri.title}</div>
				</div>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if data.nextMateri}
			<a href={`/siswa/materi/${data.nextMateri.id}`} class="btn-lesson-nav next-lesson">
				<div class="text-right min-w-0">
					<span class="lesson-nav-dir">Materi Selanjutnya</span>
					<div class="lesson-nav-title truncate">{data.nextMateri.title}</div>
				</div>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</a>
		{/if}
	</nav>
</div>

<style>
	/* Global Focus Mode body overrides */
	:global(body.focus-mode-active .app-topbar),
	:global(body.focus-mode-active .app-sidebar),
	:global(body.focus-mode-active .mobile-bottom-nav) {
		display: none !important;
	}

	:global(body.focus-mode-active .app-main) {
		padding-top: 0 !important;
		padding-left: 0 !important;
		padding-bottom: 0 !important;
	}

	/* Top Reading Progress Bar */
	.reading-progress-bar-wrap {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(226, 232, 240, 0.6);
		z-index: 100;
	}

	.reading-progress-bar {
		height: 100%;
		background: #4f46e5;
		transition: width 100ms ease-out;
	}

	.viewer-container {
		padding: 24px 28px 48px;
		max-width: 880px;
		margin: 0 auto;
		transition: max-width 200ms ease;
	}

	.viewer-container.focus-mode {
		max-width: 980px;
		padding-top: 32px;
	}

	.reader-header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.track-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.phase-badge {
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-inset);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.reader-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
		margin-bottom: 4px;
	}

	.reader-subtitle {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.reader-controls-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-top: 1px solid var(--border-soft);
		flex-wrap: wrap;
	}

	.font-size-group {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11.5px;
	}

	.ctrl-label {
		font-weight: 700;
		color: var(--text-muted);
		margin-right: 4px;
	}

	.size-btn {
		padding: 3px 8px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.size-btn:hover {
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.size-btn-active {
		background: #e0e7ff !important;
		color: #4338ca !important;
		border-color: #a5b4fc !important;
	}

	.ctrl-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.ctrl-btn:hover {
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.ctrl-btn-active {
		background: #4f46e5 !important;
		color: #ffffff !important;
		border-color: #4f46e5 !important;
	}

	.btn-mark-read {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-primary);
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-mark-read:hover {
		border-color: var(--primary-border);
		background: var(--primary-light);
		color: var(--primary);
	}

	.btn-read-completed {
		background: #dcfce7 !important;
		color: #15803d !important;
		border-color: #86efac !important;
	}

	.slide-card {
		background: #f8fafc;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
	}

	.slide-icon-wrap {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.slide-card-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.slide-card-sub {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.btn-download-slide {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.btn-download-slide:hover {
		background: #4338ca;
	}

	/* ══════════════════════════════════════════
	   DEDICATED TOC SECTION CARD (Outside Reading Article)
	══════════════════════════════════════════ */
	.toc-section-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		box-shadow: var(--shadow-sm);
	}

	.toc-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.toc-icon-badge {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.toc-section-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.toc-section-sub {
		font-size: 11.5px;
		color: var(--text-muted);
		margin: 0;
	}

	.toc-count-pill {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.btn-toggle-toc {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.btn-toggle-toc:hover {
		border-color: var(--primary-border);
		color: var(--primary);
	}

	.toc-grid-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 6px;
	}

	.toc-grid-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border: 1px solid var(--border-soft);
		background: #f8fafc;
		text-align: left;
		font-size: 12px;
		color: var(--text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
		width: 100%;
	}

	.toc-grid-item.level-1 { font-weight: 800; color: var(--text-primary); }
	.toc-grid-item.level-2 { padding-left: 14px; }
	.toc-grid-item.level-3 { padding-left: 22px; font-size: 11.5px; color: var(--text-muted); }

	.toc-bullet {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #cbd5e1;
		flex-shrink: 0;
	}

	.toc-grid-item:hover {
		background: #ffffff;
		border-color: #a5b4fc;
		color: #4f46e5;
	}

	.toc-item-active {
		background: #e0e7ff !important;
		border-color: #a5b4fc !important;
		color: #4338ca !important;
		font-weight: 800 !important;
	}

	.toc-item-active .toc-bullet {
		background: #4f46e5 !important;
	}

	/* Main Reading Article Card */
	.reading-article-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 32px 36px;
		box-shadow: var(--shadow-sm);
		line-height: 1.8;
		letter-spacing: -0.01em;
		width: 100%;
	}

	.reading-article-card.size-sm { font-size: 14.5px; }
	.reading-article-card.size-base { font-size: 16px; }
	.reading-article-card.size-lg { font-size: 18px; }

	.prose-reading {
		color: #334155;
	}

	.prose-reading :global(h1),
	.prose-reading :global(h2),
	.prose-reading :global(h3) {
		font-family: var(--font-macro);
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 1.6em;
		margin-bottom: 0.6em;
		line-height: 1.3;
		scroll-margin-top: 24px;
	}

	.prose-reading :global(h1) { font-size: 1.5em; border-bottom: 2px solid var(--border-soft); padding-bottom: 0.3em; }
	.prose-reading :global(h2) { font-size: 1.3em; }
	.prose-reading :global(h3) { font-size: 1.15em; }

	.prose-reading :global(p) {
		margin-bottom: 1.2em;
	}

	.prose-reading :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		border-radius: 5px;
		padding: 1px 5px;
		color: #4338ca;
		font-weight: 600;
	}

	/* PRO CODE BLOCK BOX */
	.prose-reading :global(.tiptap-code-block-wrapper) {
		margin: 1.25em 0;
		border-radius: var(--radius-md);
		border: 1px solid #334155;
		background: #0f172a;
		overflow: hidden;
		box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.25), 0 2px 6px -1px rgba(15, 23, 42, 0.15);
	}

	.prose-reading :global(.code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 14px;
		background: #1e293b;
		border-bottom: 1px solid #334155;
		user-select: none;
	}

	.prose-reading :global(.mac-dots) {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.prose-reading :global(.mac-dot) {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}

	.prose-reading :global(.mac-dot--red)    { background: #ff5f56; border: 1px solid #e0443e; }
	.prose-reading :global(.mac-dot--yellow) { background: #ffbd2e; border: 1px solid #dea123; }
	.prose-reading :global(.mac-dot--green)  { background: #27c93f; border: 1px solid #1aab29; }

	.prose-reading :global(.code-block-lang) {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #94a3b8;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.prose-reading :global(.code-block-lang__tag) {
		background: rgba(255, 255, 255, 0.06);
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.prose-reading :global(.code-copy-btn) {
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

	.prose-reading :global(.code-copy-btn:hover) {
		color: #f8fafc;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.prose-reading :global(.code-copy-btn--copied) {
		color: #34d399 !important;
		background: rgba(6, 78, 59, 0.8) !important;
		border-color: rgba(52, 211, 153, 0.4) !important;
		transform: none !important;
	}

	.prose-reading :global(pre) {
		margin: 0 !important;
		padding: 16px 18px !important;
		background: #0f172a !important;
		border: none !important;
		border-radius: 0 !important;
		font-family: var(--font-mono);
		font-size: 13.5px;
		line-height: 1.65;
		color: #e2e8f0 !important;
		overflow-x: auto;
	}

	.prose-reading :global(pre code) {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
		color: inherit !important;
		font-size: inherit !important;
	}

	.empty-reading-state {
		text-align: center;
		padding: 48px 20px;
	}

	.empty-icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12.5px;
		color: var(--text-muted);
	}

	.lesson-nav-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.btn-lesson-nav {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
		transition: all 150ms ease;
		max-width: 48%;
		flex: 1;
	}

	.btn-lesson-nav:hover {
		border-color: var(--primary-border);
		background: var(--bg-inset);
		transform: translateY(-1px);
	}

	.lesson-nav-dir {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted);
		display: block;
	}

	.lesson-nav-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
	}

	@media (max-width: 640px) {
		.viewer-container {
			padding: 16px;
		}
		.reading-article-card {
			padding: 20px;
		}
		.toc-grid-list {
			grid-template-columns: 1fr;
		}
		.lesson-nav-footer {
			flex-direction: column;
		}
		.btn-lesson-nav {
			max-width: 100%;
			width: 100%;
		}
	}
</style>

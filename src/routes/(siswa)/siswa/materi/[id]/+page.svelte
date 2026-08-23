<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';
	import { formatFileSize } from '$lib/utils/sanitizer';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isReadCompleted = $state(false);
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
	let isTocCollapsed = $state<boolean>(false);
	let isMobileTocDrawerOpen = $state<boolean>(false);

	$effect(() => {
		isReadCompleted = data.isCompleted;
	});

	function setFontSize(size: 'sm' | 'base' | 'lg') {
		fontSize = size;
	}

	function getFileExt(filename: string): string {
		const parts = filename.split('.');
		return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
	}

	function getFileBadgeClass(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		if (['pdf'].includes(ext)) return 'bg-rose-50 text-rose-700 border-rose-200';
		if (['pkt', 'gns3', 'pcap', 'pcapng', 'json', 'yaml', 'yml', 'conf', 'cfg', 'log'].includes(ext))
			return 'bg-cyan-50 text-cyan-700 border-cyan-200';
		if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'bg-amber-50 text-amber-700 border-amber-200';
		if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext))
			return 'bg-emerald-50 text-emerald-700 border-emerald-200';
		return 'bg-indigo-50 text-indigo-700 border-indigo-200';
	}

	function toggleFocusMode() {
		isFocusMode = !isFocusMode;
	}

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			activeTocId = id;
			isMobileTocDrawerOpen = false;
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	// Scroll progress calculation
	function handleScroll() {
		const totalScroll = document.documentElement.scrollTop || document.body.scrollTop;
		const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
		if (windowHeight > 0) {
			scrollProgress = Math.min(100, Math.max(0, Math.round((totalScroll / windowHeight) * 100)));
		}
	}

	$effect(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

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

<div class="reader-outer-wrapper">
	<!-- Main Center/Left Reading Container -->
	<div class="viewer-container {isFocusMode ? 'focus-mode' : ''}">
		<!-- 1. Minimalist Header Card (Gold Standard 2-Tier Hierarchy) -->
		<div class="reader-header-card">
			<div class="header-top-row">
				<a href={`/siswa/materi?track=${data.materi.trackId}`} class="btn-back-track-pill">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span>Kembali ke Track</span>
				</a>

				<div class="header-badges-row">
					<span class="track-tingkat-badge">{data.materi.trackTitle}</span>
					<span class="phase-badge">{data.materi.phaseTitle} &rsaquo; {data.materi.subPhaseTitle}</span>
				</div>
			</div>

			<div class="header-main-content">
				<h1 class="reader-title">{data.materi.title}</h1>
			</div>
		</div>

		<!-- 2. Slide Presentasi PPT Attachment Card (If Available) -->
		{#if data.sessionSlide?.materialUrl}
			<div class="slide-card mb-6">
				<div class="flex items-center justify-between gap-3 flex-wrap">
					<div class="flex items-center gap-3">
						<div class="slide-icon-wrap">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						</div>
						<div>
							<h4 class="slide-card-title">Slide Presentasi PPT Sesi</h4>
							<p class="slide-card-sub">
								Pertemuan: <strong>{data.sessionSlide.pertemuanTitle}</strong>
							</p>
						</div>
					</div>

					<a
						href={data.sessionSlide.materialUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="btn-download-slide w-full sm:w-auto justify-center"
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

		<!-- 3. Global Materi Attachments Card (Dedicated Card) -->
		{#if data.materi.attachments && data.materi.attachments.length > 0}
			<div class="materi-global-attachments-card mb-6">
				<div class="card-header-row bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-600">
							<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
						</svg>
						<h3 class="font-bold text-xs text-slate-800">Lampiran Berkas Modul Materi</h3>
					</div>
					<span class="badge-count text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
						{data.materi.attachments.length} Berkas
					</span>
				</div>
				<div class="attachments-grid grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
					{#each data.materi.attachments as att}
						<div class="materi-attachment-item-card group">
							<div class="flex items-center gap-3 min-w-0">
								<div class="px-2 py-1 text-[10px] font-mono font-bold rounded-md border uppercase flex-shrink-0 {getFileBadgeClass(att.name)}">
									{getFileExt(att.name)}
								</div>
								<div class="min-w-0 flex-1">
									<div class="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={att.name}>
										{att.name}
									</div>
									<div class="text-[10px] font-mono text-slate-500 font-medium">
										{formatFileSize(att.size)} · Lampiran Modul
									</div>
								</div>
							</div>
							<a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" class="attachment-box-dl text-xs font-bold px-3 py-1.5" title="Unduh Berkas">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								<span>Unduh</span>
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- 4. Main Article Reading Card -->
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

		<!-- 5. Completion Action Box (Reward & Mark Read Section at End of Reading) -->
		<div class="completion-box {isReadCompleted ? 'completion-box--completed' : ''} mt-6">
			<div class="completion-box-inner flex items-center justify-between gap-4 flex-wrap">
				<div class="completion-info flex items-center gap-3">
					<div class="completion-icon {isReadCompleted ? 'completion-icon--completed' : ''}">
						{#if isReadCompleted}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						{/if}
					</div>
					<div>
						<h4 class="completion-title">
							{isReadCompleted ? 'Materi Selesai Dipelajari!' : 'Sudah selesai membaca materi ini?'}
						</h4>
						<p class="completion-sub">
							{isReadCompleted ? 'Progres belajar Anda pada track ini telah diperbarui.' : 'Tandai materi ini agar progres belajar Anda tercatat.'}
						</p>
					</div>
				</div>

				<form
					method="POST"
					action="?/toggleCompletion"
					class="w-full sm:w-auto"
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
						class="btn-mark-completion w-full sm:w-auto {isReadCompleted ? 'btn-mark-completion--completed' : 'btn-mark-completion--pending'}"
					>
						{#if isReadCompleted}
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							<span>Selesai Dibaca (Batalkan)</span>
						{:else}
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							<span>Tandai Selesai Dibaca</span>
						{/if}
					</button>
				</form>
			</div>
		</div>

		<!-- 6. Footer Lesson Navigation -->
		<nav class="lesson-nav-footer mt-6">
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

	<!-- Dedicated Right ToC & Reading Preferences Sidebar (Desktop) -->
	<aside class="toc-right-container hidden lg:block {isTocCollapsed ? 'toc-right-collapsed' : ''}">
		<button
			type="button"
			onclick={() => (isTocCollapsed = !isTocCollapsed)}
			class="toc-collapse-btn"
			title={isTocCollapsed ? 'Tampilkan Opsi & Daftar Isi' : 'Sembunyikan Panel'}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="transform transition-transform {isTocCollapsed ? '' : 'rotate-180'}"
			>
				<polyline points="15 18 9 12 15 6" />
			</svg>
			<span>{isTocCollapsed ? 'Panel Membaca' : 'Sembunyikan'}</span>
		</button>

		{#if !isTocCollapsed}
			<div class="toc-right-card">
				<!-- Reading Preferences Section -->
				<div class="reading-pref-section mb-3 pb-3 border-b border-slate-100">
					<div class="pref-title-row flex items-center justify-between mb-2">
						<span class="pref-title text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tampilan</span>
						<button
							type="button"
							onclick={toggleFocusMode}
							class="btn-focus-toggle {isFocusMode ? 'btn-focus-toggle--active' : ''}"
							title={isFocusMode ? 'Keluar Mode Fokus' : 'Masuk Mode Fokus'}
						>
							{#if isFocusMode}
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M4 14h6v6m10-10h-6V4m0 16h6v-6M4 10h6V4" />
								</svg>
								<span>Fokus Aktif</span>
							{:else}
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
								</svg>
								<span>Mode Fokus</span>
							{/if}
						</button>
					</div>

					<!-- Font Size Pills -->
					<div class="font-size-pills-row flex items-center justify-between gap-1.5">
						<span class="text-[11px] text-slate-500 font-medium">Ukuran Teks:</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => setFontSize('sm')}
								class="size-pill {fontSize === 'sm' ? 'size-pill-active' : ''}"
								title="Kecil (14px)"
							>
								A-
							</button>
							<button
								type="button"
								onclick={() => setFontSize('base')}
								class="size-pill {fontSize === 'base' ? 'size-pill-active' : ''}"
								title="Normal (16px)"
							>
								A
							</button>
							<button
								type="button"
								onclick={() => setFontSize('lg')}
								class="size-pill {fontSize === 'lg' ? 'size-pill-active' : ''}"
								title="Besar (18px)"
							>
								A+
							</button>
						</div>
					</div>
				</div>

				<!-- ToC Heading List -->
				{#if tocList.length > 0}
					<div class="toc-header mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
						<div class="flex items-center gap-1.5">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-600">
								<line x1="8" y1="6" x2="21" y2="6" />
								<line x1="8" y1="12" x2="21" y2="12" />
								<line x1="8" y1="18" x2="21" y2="18" />
								<line x1="3" y1="6" x2="3.01" y2="6" />
								<line x1="3" y1="12" x2="3.01" y2="12" />
								<line x1="3" y1="18" x2="3.01" y2="18" />
							</svg>
							<h3 class="toc-title font-bold text-xs text-slate-800">Daftar Isi</h3>
						</div>
						<span class="toc-pill font-mono text-[9.5px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
							{tocList.length} Topik
						</span>
					</div>

					<nav class="toc-list space-y-1">
						{#each tocList as item}
							<button
								type="button"
								onclick={() => scrollToHeading(item.id)}
								class="toc-item level-{item.level} {activeTocId === item.id ? 'toc-item-active' : ''}"
							>
								<span class="toc-bullet"></span>
								<span class="toc-text truncate">{item.text}</span>
							</button>
						{/each}
					</nav>
				{/if}
			</div>
		{/if}
	</aside>

	<!-- Mobile Floating Action Pill & Bottom Sheet Drawer (< 1024px) -->
	<div class="lg:hidden">
		<button
			type="button"
			onclick={() => (isMobileTocDrawerOpen = !isMobileTocDrawerOpen)}
			class="mobile-toc-fab"
			aria-label="Buka Opsi & Daftar Isi Membaca"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="8" y1="6" x2="21" y2="6" />
				<line x1="8" y1="12" x2="21" y2="12" />
				<line x1="8" y1="18" x2="21" y2="18" />
				<line x1="3" y1="6" x2="3.01" y2="6" />
				<line x1="3" y1="12" x2="3.01" y2="12" />
				<line x1="3" y1="18" x2="3.01" y2="18" />
			</svg>
			<span>Daftar Isi &amp; Opsi</span>
		</button>

		{#if isMobileTocDrawerOpen}
			<div
				class="mobile-toc-overlay"
				onclick={() => (isMobileTocDrawerOpen = false)}
				transition:fade={{ duration: 180 }}
				role="presentation"
			>
				<div
					class="mobile-toc-drawer"
					onclick={(e) => e.stopPropagation()}
					transition:fly={{ y: 320, duration: 240 }}
					role="dialog"
					aria-modal="true"
					tabindex="-1"
				>
					<div class="drawer-handle-bar"></div>
					<div class="drawer-header flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
						<h3 class="font-bold text-sm text-slate-800 flex items-center gap-2">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-600">
								<line x1="8" y1="6" x2="21" y2="6" />
								<line x1="8" y1="12" x2="21" y2="12" />
								<line x1="8" y1="18" x2="21" y2="18" />
							</svg>
							Pengaturan &amp; Daftar Isi
						</h3>
						<button type="button" onclick={() => (isMobileTocDrawerOpen = false)} class="text-xs font-bold text-slate-500">
							Tutup
						</button>
					</div>

					<!-- Mobile Reading Controls -->
					<div class="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-200/80">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-bold text-slate-700">Ukuran Teks:</span>
							<div class="flex items-center gap-1.5">
								<button
									type="button"
									onclick={() => setFontSize('sm')}
									class="size-pill {fontSize === 'sm' ? 'size-pill-active' : ''}"
								>
									A-
								</button>
								<button
									type="button"
									onclick={() => setFontSize('base')}
									class="size-pill {fontSize === 'base' ? 'size-pill-active' : ''}"
								>
									A
								</button>
								<button
									type="button"
									onclick={() => setFontSize('lg')}
									class="size-pill {fontSize === 'lg' ? 'size-pill-active' : ''}"
								>
									A+
								</button>
							</div>
						</div>

						<button
							type="button"
							onclick={() => {
								toggleFocusMode();
								isMobileTocDrawerOpen = false;
							}}
							class="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 {isFocusMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}"
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
								<span>Masuk Mode Fokus</span>
							{/if}
						</button>
					</div>

					<!-- Mobile ToC Headings -->
					{#if tocList.length > 0}
						<div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sub-Bab Topik</div>
						<nav class="drawer-toc-list space-y-1 max-h-[45vh] overflow-y-auto">
							{#each tocList as item}
								<button
									type="button"
									onclick={() => scrollToHeading(item.id)}
									class="toc-item level-{item.level} {activeTocId === item.id ? 'toc-item-active' : ''}"
								>
									<span class="toc-bullet"></span>
									<span class="toc-text truncate">{item.text}</span>
								</button>
							{/each}
						</nav>
					{/if}
				</div>
			</div>
		{/if}
	</div>
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

	/* Outer Wrapper for Side-by-side Positioning */
	.reader-outer-wrapper {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		max-width: 1200px;
		margin: 0 auto;
		position: relative;
		padding: 24px 32px 60px;
		width: 100%;
		min-height: 100%;
		box-sizing: border-box;
	}

	.viewer-container {
		padding: 0 0 48px;
		max-width: 860px;
		width: 100%;
		flex: 1;
		min-width: 0;
		transition: max-width 200ms ease;
	}

	.viewer-container.focus-mode {
		max-width: 960px;
		padding-top: 24px;
	}

	/* ══════════════════════════════════════════════════════════
	   MINIMALIST HEADER CARD (GOLD STANDARD 2-ROW RHYTHM)
	   ══════════════════════════════════════════════════════════ */
	.reader-header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 26px;
	}

	.header-badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.header-main-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.btn-back-track-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 26px;
		padding: 0 10px;
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		line-height: 1;
		transition: all 150ms ease;
	}

	.btn-back-track-pill:hover {
		background: #c7d2fe;
		color: #3730a3;
	}

	.btn-back-track-pill:active {
		transform: scale(0.98);
	}

	.track-tingkat-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 800;
		color: #0369a1;
		background: #e0f2fe;
		border: 1px solid #bae6fd;
		padding: 0 9px;
		border-radius: 6px;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.phase-badge {
		display: inline-flex;
		align-items: center;
		height: 26px;
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 600;
		color: #475569;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		padding: 0 9px;
		border-radius: 6px;
		line-height: 1;
	}

	.reader-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.25rem, 2.5vw, 1.65rem);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.25;
		margin: 0;
	}

	/* ══════════════════════════════════════════════════════════
	   COMPLETION ACTION BOX (END OF READING)
	   ══════════════════════════════════════════════════════════ */
	.completion-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 18px 20px;
		transition: all 200ms ease;
	}

	.completion-box--completed {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.completion-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: #e2e8f0;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.completion-icon--completed {
		background: #dcfce7;
		color: #16a34a;
	}

	.completion-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13.5px;
		font-weight: 800;
		color: #0f172a;
		margin: 0 0 2px;
	}

	.completion-sub {
		font-size: 11.5px;
		color: #64748b;
		margin: 0;
		line-height: 1.4;
	}

	.btn-mark-completion {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 18px;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		min-height: 38px;
	}

	.btn-mark-completion--pending {
		background: #4f46e5;
		color: #ffffff;
		border: 1px solid #4338ca;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
	}

	.btn-mark-completion--pending:hover {
		background: #4338ca;
		transform: translateY(-1px);
	}

	.btn-mark-completion--completed {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
	}

	.btn-mark-completion--completed:hover {
		background: #fee2e2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	/* ══════════════════════════════════════════════════════════
	   SLIDE & ATTACHMENT CARDS
	   ══════════════════════════════════════════════════════════ */
	.slide-card {
		background: #f8fafc;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 14px 18px;
	}

	.slide-icon-wrap {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.slide-card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.slide-card-sub {
		font-size: 11.5px;
		color: var(--text-secondary, #475569);
		margin: 0;
	}

	.btn-download-slide {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
		min-height: 34px;
	}

	.btn-download-slide:hover {
		background: #4338ca;
	}

	.materi-global-attachments-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		overflow: hidden;
	}

	.materi-attachment-item-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	.attachment-box-dl {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #334155;
		border-radius: 6px;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.attachment-box-dl:hover {
		background: #e0e7ff;
		color: #4338ca;
		border-color: #c7d2fe;
	}

	/* ══════════════════════════════════════════════════════════
	   DEDICATED RIGHT TOC & PREFERENCES SIDE CONTAINER
	   ══════════════════════════════════════════════════════════ */
	.toc-right-container {
		position: sticky;
		top: 24px;
		width: 270px;
		margin-left: 24px;
		flex-shrink: 0;
		transition: all 200ms ease;
	}

	.toc-right-collapsed {
		width: auto;
	}

	.toc-collapse-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary, #475569);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		margin-bottom: 10px;
		transition: all 150ms ease;
	}

	.toc-collapse-btn:hover {
		border-color: #cbd5e1;
		color: #0f172a;
	}

	.toc-right-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		padding: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		max-height: calc(100vh - 120px);
		overflow-y: auto;
	}

	.btn-focus-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: 5px;
		font-size: 10.5px;
		font-weight: 700;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #e2e8f0;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-focus-toggle--active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
	}

	.size-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 24px;
		border-radius: 5px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		color: #64748b;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.size-pill:hover {
		border-color: #cbd5e1;
		color: #0f172a;
	}

	.size-pill-active {
		background: #e0e7ff !important;
		color: #4338ca !important;
		border-color: #c7d2fe !important;
	}

	.toc-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toc-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border: none;
		background: transparent;
		text-align: left;
		font-size: 12px;
		color: var(--text-secondary, #475569);
		border-radius: 4px;
		cursor: pointer;
		transition: all 150ms ease;
		width: 100%;
		min-height: 32px;
	}

	.toc-item.level-1 { font-weight: 800; color: var(--text-primary, #0f172a); }
	.toc-item.level-2 { padding-left: 14px; }
	.toc-item.level-3 { padding-left: 22px; font-size: 11px; color: #64748b; }

	.toc-bullet {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #cbd5e1;
		flex-shrink: 0;
	}

	.toc-item:hover {
		background: #f1f5f9;
		color: #4f46e5;
	}

	.toc-item-active {
		background: #e0e7ff !important;
		color: #4338ca !important;
		font-weight: 800 !important;
	}

	.toc-item-active .toc-bullet {
		background: #4f46e5 !important;
	}

	/* Mobile Floating Action Pill & Bottom Sheet */
	.mobile-toc-fab {
		position: fixed;
		bottom: calc(76px + env(safe-area-inset-bottom, 0px));
		right: 16px;
		background: #4f46e5;
		color: #ffffff;
		padding: 9px 15px;
		border-radius: 9999px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		border: 2px solid #ffffff;
		box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		z-index: 1000;
		cursor: pointer;
	}

	.mobile-toc-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		z-index: 1000;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.mobile-toc-drawer {
		background: #ffffff;
		border-radius: 16px 16px 0 0;
		width: 100%;
		max-width: 600px;
		padding: 16px 20px 24px;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
	}

	.drawer-handle-bar {
		width: 36px;
		height: 4px;
		background: #cbd5e1;
		border-radius: 9999px;
		margin: 0 auto 12px;
	}

	/* Main Reading Article Card */
	.reading-article-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 32px 36px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		line-height: 1.8;
		letter-spacing: -0.01em;
		width: 100%;
		box-sizing: border-box;
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
		font-family: var(--font-macro, sans-serif);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin-top: 1.6em;
		margin-bottom: 0.6em;
		line-height: 1.3;
		scroll-margin-top: 24px;
	}

	.prose-reading :global(h1) { font-size: 1.5em; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.3em; }
	.prose-reading :global(h2) { font-size: 1.3em; }
	.prose-reading :global(h3) { font-size: 1.15em; }

	.prose-reading :global(p) {
		margin-bottom: 1.2em;
	}

	.prose-reading :global(code) {
		font-family: var(--font-mono, monospace);
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
		border-radius: 10px;
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
		font-family: var(--font-mono, monospace);
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
		font-family: var(--font-mono, monospace);
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
		padding: 14px 16px !important;
		background: #0f172a !important;
		border: none !important;
		border-radius: 0 !important;
		font-family: var(--font-mono, monospace);
		font-size: 13px;
		line-height: 1.6;
		color: #e2e8f0 !important;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
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
		font-family: var(--font-macro, sans-serif);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}

	.empty-sub {
		font-size: 12.5px;
		color: var(--text-muted, #64748b);
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
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
		text-decoration: none;
		color: var(--text-primary, #0f172a);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		max-width: 48%;
		flex: 1;
		min-height: 48px;
		box-sizing: border-box;
	}

	.btn-lesson-nav:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
		transform: translateY(-1px);
	}

	.lesson-nav-dir {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted, #64748b);
		display: block;
	}

	.lesson-nav-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
	}

	@media (max-width: 1023px) {
		.reader-outer-wrapper {
			padding: 20px 24px 60px;
		}
	}

	@media (max-width: 640px) {
		.reader-outer-wrapper {
			padding: 16px 16px 84px;
		}
		.reader-header-card {
			padding: 12px 14px;
			gap: 8px;
		}
		.header-top-row {
			gap: 6px;
		}
		.header-badges-row {
			gap: 5px;
		}
		.reader-title {
			font-size: 1.15rem;
		}
		.reading-article-card {
			padding: 20px 14px;
		}

		/* Mobile Code Block Box Optimization */
		.prose-reading :global(.tiptap-code-block-wrapper) {
			margin: 1em -6px;
			border-radius: 8px;
		}
		.prose-reading :global(.code-block-header) {
			padding: 6px 10px;
		}
		.prose-reading :global(.mac-dots) {
			gap: 4px;
		}
		.prose-reading :global(.mac-dot) {
			width: 8px;
			height: 8px;
		}
		.prose-reading :global(.code-block-lang__tag) {
			font-size: 9px;
			padding: 1px 6px;
		}
		.prose-reading :global(.code-copy-btn) {
			padding: 3px 8px;
			font-size: 10px;
		}
		.prose-reading :global(pre) {
			padding: 12px 12px !important;
			font-size: 12px !important;
			line-height: 1.55 !important;
			max-height: 360px;
		}

		.completion-box {
			padding: 14px 14px;
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

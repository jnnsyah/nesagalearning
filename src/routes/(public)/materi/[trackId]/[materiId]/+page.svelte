<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Reader Customization State ──
	let fontSize = $state<'sm' | 'base' | 'lg'>('base');
	let theme = $state<'light' | 'sepia' | 'dark'>('light');
	let fontFamily = $state<'sans' | 'serif'>('sans');
	let scrollProgress = $state(0);

	// ── Desktop Docked Sidebar & Mobile Drawer State ──
	let isSlidebarOpen = $state(false);
	let activeSlidebarTab = $state<'syllabus' | 'toc' | 'settings'>('toc');

	// Auto-open sidebar on desktop screens (>= 1024px) by default
	$effect(() => {
		if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
			isSlidebarOpen = true;
		}
	});

	// ── Lightbox Zoom Modal State ──
	interface LightboxData {
		src: string;
		alt: string;
		title?: string;
	}
	let lightboxImg = $state<LightboxData | null>(null);
	let lightboxScale = $state(1);

	// ── Video Modal State ──
	interface ActiveVideoData {
		title: string;
		url: string;
		youtubeId: string;
		duration?: string;
	}
	let activeVideo = $state<ActiveVideoData | null>(null);

	function openVideoModal(video: ActiveVideoData) {
		activeVideo = video;
	}

	function closeVideoModal() {
		activeVideo = null;
	}

	// ── Table of Contents State ──
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}
	let tocList = $state<TocItem[]>([]);
	let activeTocId = $state<string>('');

	// ── Accordion state for syllabus phases ──
	let openPhases = $state<Record<number, boolean>>({});

	// Initialize open phases (keep the phase containing current materi open)
	$effect(() => {
		if (data.syllabus && data.syllabus.length > 0) {
			untrack(() => {
				const initial: Record<number, boolean> = {};
				data.syllabus.forEach((p) => {
					const containsCurrent = p.subPhases.some((sp) =>
						sp.materiList.some((m) => m.id === data.materi?.id)
					);
					initial[p.id] = containsCurrent || Object.keys(openPhases).length === 0;
				});
				openPhases = initial;
			});
		}
	});

	function togglePhaseAccordion(phaseId: number) {
		openPhases[phaseId] = !openPhases[phaseId];
	}

	// ── Word count and reading time estimate ──
	let contentStats = $derived.by(() => {
		const html = data.materi?.content || '';
		const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		const words = text ? text.split(' ').length : 0;
		const minutes = Math.max(1, Math.ceil(words / 180));
		return { words, minutes };
	});

	function setFontSize(size: 'sm' | 'base' | 'lg') {
		fontSize = size;
	}

	function setTheme(t: 'light' | 'sepia' | 'dark') {
		theme = t;
	}

	function setFontFamily(f: 'sans' | 'serif') {
		fontFamily = f;
	}

	// ── Smooth Scroll to Headings (Eye-level offset) ──
	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			activeTocId = id;
			if (typeof window !== 'undefined' && window.innerWidth < 1024) {
				isSlidebarOpen = false;
			}
			const targetPosition = el.getBoundingClientRect().top + window.scrollY - 115;
			window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
		}
	}

	// ── Scroll Progress ──
	function handleScroll() {
		if (typeof document === 'undefined') return;
		const totalScroll = document.documentElement.scrollTop || document.body.scrollTop;
		const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
		if (windowHeight > 0) {
			scrollProgress = Math.min(100, Math.max(0, Math.round((totalScroll / windowHeight) * 100)));
		}
	}

	// ── Lightbox Handlers ──
	function openLightbox(src: string, alt: string, title?: string) {
		lightboxImg = { src, alt, title };
		lightboxScale = 1;
	}

	function closeLightbox() {
		lightboxImg = null;
		lightboxScale = 1;
	}

	function zoomIn() {
		lightboxScale = Math.min(3, lightboxScale + 0.25);
	}

	function zoomOut() {
		lightboxScale = Math.max(0.5, lightboxScale - 0.25);
	}

	function resetZoom() {
		lightboxScale = 1;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (activeVideo) {
				closeVideoModal();
			} else if (lightboxImg) {
				closeLightbox();
			} else if (isSlidebarOpen) {
				isSlidebarOpen = false;
			}
		}
	}

	// ── Banner & Auth Guard State ──
	let bannerDismissed = $state(false);
	let showAuthModal = $state(false);
	let authModalAction = $state('');

	function triggerAuthGuard(action: string) {
		authModalAction = action;
		showAuthModal = true;
	}

	// ── Content DOM Enhancements (Code Blocks, Lightbox, Tables, TOC) ──
	$effect(() => {
		if (!data.materi?.content) return;
		const article = document.querySelector('.prose-reading');
		if (!article) return;

		// 1. Transform raw <pre> into macOS styled code blocks
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
				<button type="button" class="code-copy-btn" title="Salin Kode">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
					</svg>
					<span>Salin</span>
				</button>
			`;

			const copyBtn = header.querySelector('.code-copy-btn');
			if (copyBtn) {
				copyBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					let codeText = '';
					const targetEl = codeEl || pre;
					codeText = targetEl.innerText || '';

					if ((!codeText || !codeText.includes('\n')) && targetEl.innerHTML) {
						const temp = document.createElement('div');
						temp.innerHTML = targetEl.innerHTML
							.replace(/<br\s*\/?>/gi, '\n')
							.replace(/<\/p>/gi, '\n')
							.replace(/<\/div>/gi, '\n');
						codeText = temp.textContent || '';
					}

					if (!codeText) {
						codeText = targetEl.textContent || '';
					}

					codeText = codeText.replace(/\r\n/g, '\n').trim();

					navigator.clipboard.writeText(codeText);
					copyBtn.classList.add('code-copy-btn--copied');
					const textSpan = copyBtn.querySelector('span');
					if (textSpan) textSpan.textContent = 'Tersalin';
					toast.success('Kode berhasil disalin');
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

		// 2. Attach Click-to-Zoom Lightbox to Images
		const images = article.querySelectorAll('img');
		images.forEach((img) => {
			img.style.cursor = 'zoom-in';
			img.title = img.alt ? `${img.alt} (Ketuk untuk memperbesar)` : 'Ketuk untuk memperbesar gambar';
			img.addEventListener('click', (e) => {
				e.preventDefault();
				openLightbox(img.src, img.alt || '', img.title || '');
			});
		});

		// 3. Wrap naked tables in responsive scroll wrapper
		const tables = article.querySelectorAll('table');
		tables.forEach((tbl) => {
			if (tbl.parentElement?.classList.contains('table-responsive-wrapper')) return;
			const wrap = document.createElement('div');
			wrap.className = 'table-responsive-wrapper';
			tbl.parentNode?.insertBefore(wrap, tbl);
			wrap.appendChild(tbl);
		});

		// 4. Auto-detect Headings for Table of Contents (ToC)
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
		if (items.length > 0 && !activeTocId) {
			activeTocId = items[0].id;
		}

		// 5. IntersectionObserver for active heading highlight
		if (items.length > 0) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							activeTocId = entry.target.id;
						}
					});
				},
				{ rootMargin: '-100px 0px -65% 0px', threshold: 0.1 }
			);

			headings.forEach((h) => observer.observe(h));
			return () => observer.disconnect();
		}
	});
</script>

<svelte:window onscroll={handleScroll} onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.materi.title} — {data.track.title} | NLC</title>
</svelte:head>

<!-- Top Reading Scroll Indicator -->
<div class="course-scroll-progress-wrap">
	<div class="course-scroll-progress-bar" style="width: {scrollProgress}%;"></div>
</div>

<div class="reader-page theme-{theme} font-{fontFamily} size-{fontSize}">
	<!-- ══════════════════════════════════════════════════════════
	     MAIN WORKSPACE (DOCKED DESKTOP SIDEBAR + READING CANVAS)
	     ══════════════════════════════════════════════════════════ -->
	<div class="course-workspace">
		<!-- Desktop Docked Sidebar (>= 1024px) -->
		{#if isSlidebarOpen}
			<aside class="desktop-course-sidebar" transition:slide={{ axis: 'x', duration: 180 }}>
				<!-- Floating Docked Rail Toggle Handle -->
				<button
					type="button"
					onclick={() => (isSlidebarOpen = false)}
					class="sidebar-dock-toggle-btn"
					title="Ciutkan Sidebar (Esc)"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="15 18 9 12 15 6" />
					</svg>
				</button>

				<!-- Sidebar Header Tabs -->
				<div class="sidebar-tabs-header">
					<button
						type="button"
						onclick={() => (activeSlidebarTab = 'syllabus')}
						class="sidebar-tab-btn {activeSlidebarTab === 'syllabus' ? 'sidebar-tab-btn--active' : ''}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
							<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
						</svg>
						<span>Silabus</span>
					</button>

					<button
						type="button"
						onclick={() => (activeSlidebarTab = 'toc')}
						class="sidebar-tab-btn {activeSlidebarTab === 'toc' ? 'sidebar-tab-btn--active' : ''}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="8" y1="6" x2="21" y2="6" />
							<line x1="8" y1="12" x2="21" y2="12" />
							<line x1="8" y1="18" x2="21" y2="18" />
						</svg>
						<span>Daftar Isi</span>
						{#if tocList.length > 0}
							<span class="tab-counter-badge">{tocList.length}</span>
						{/if}
					</button>

					<button
						type="button"
						onclick={() => (activeSlidebarTab = 'settings')}
						class="sidebar-tab-btn {activeSlidebarTab === 'settings' ? 'sidebar-tab-btn--active' : ''}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
						<span>Tampilan</span>
					</button>
				</div>

				<!-- Sidebar Body Area -->
				<div class="sidebar-scroll-body">
					{#if activeSlidebarTab === 'syllabus'}
						<!-- Course Syllabus Tree -->
						<div class="syllabus-tree-container">
							<div class="syllabus-track-header">
								<a href={`/materi/${data.track.id}`} class="btn-syllabus-back" title="Lihat silabus lengkap track ini">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<polyline points="15 18 9 12 15 6" />
									</svg>
									<span class="truncate">{data.track.title}</span>
								</a>
							</div>
							{#each data.syllabus as p, pIdx (p.id)}
								{@const isOpen = !!openPhases[p.id]}
								<div class="phase-group">
									<button
										type="button"
										onclick={() => togglePhaseAccordion(p.id)}
										class="phase-group-header"
									>
										<div class="phase-header-left truncate">
											<span class="phase-badge-pill">FASE {pIdx + 1}</span>
											<span class="phase-title-text truncate">{p.title}</span>
										</div>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											class="transform transition-transform {isOpen ? 'rotate-180' : ''}"
										>
											<polyline points="6 9 12 15 18 9" />
										</svg>
									</button>

									{#if isOpen}
										<div class="phase-group-body" transition:slide={{ duration: 150 }}>
											{#each p.subPhases as sp (sp.id)}
												<div class="subphase-group">
													<div class="subphase-header-label truncate">{sp.title}</div>
													<div class="materi-links-list">
														{#each sp.materiList as m (m.id)}
															{@const isCurrent = m.id === data.materi.id}
															<a
																href={`/materi/${data.track.id}/${m.id}`}
																class="materi-tree-link {isCurrent ? 'materi-tree-link--active' : ''}"
															>
																<div class="materi-tree-icon">
																	{#if isCurrent}
																		<div class="active-dot"></div>
																	{:else}
																		<div class="pending-dot"></div>
																	{/if}
																</div>
																<span class="materi-tree-title truncate">{m.title}</span>
															</a>
														{/each}
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else if activeSlidebarTab === 'toc'}
						<!-- Table of Contents Headings -->
						{#if tocList.length > 0}
							<div class="toc-container">
								<div class="toc-header-label">
									Daftar Sub-Topik ({tocList.length})
								</div>
								<nav class="toc-nav-list">
									{#each tocList as item}
										<button
											type="button"
											onclick={() => scrollToHeading(item.id)}
											class="toc-link-item level-{item.level} {activeTocId === item.id ? 'toc-link-item--active' : ''}"
										>
											<span class="toc-bullet"></span>
											<span class="toc-label truncate">{item.text}</span>
										</button>
									{/each}
								</nav>
							</div>
						{:else}
							<div class="empty-tab-hint">Tidak ada sub-bab terdeteksi pada materi ini.</div>
						{/if}
					{:else if activeSlidebarTab === 'settings'}
						<!-- Reading Preferences Panel -->
						<div class="settings-container">
							<!-- Ukuran Teks -->
							<div class="setting-block">
								<span class="setting-label">Ukuran Teks</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setFontSize('sm')}
										class="pill-btn flex-1 {fontSize === 'sm' ? 'pill-btn--active' : ''}"
									>
										Kecil
									</button>
									<button
										type="button"
										onclick={() => setFontSize('base')}
										class="pill-btn flex-1 {fontSize === 'base' ? 'pill-btn--active' : ''}"
									>
										Sedang
									</button>
									<button
										type="button"
										onclick={() => setFontSize('lg')}
										class="pill-btn flex-1 {fontSize === 'lg' ? 'pill-btn--active' : ''}"
									>
										Besar
									</button>
								</div>
							</div>

							<!-- Tema Warna -->
							<div class="setting-block">
								<span class="setting-label">Tema Warna Baca</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setTheme('light')}
										class="theme-pill theme-pill--light flex-1 justify-center {theme === 'light' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<circle cx="12" cy="12" r="5" />
										</svg>
										<span>Terang</span>
									</button>
									<button
										type="button"
										onclick={() => setTheme('sepia')}
										class="theme-pill theme-pill--sepia flex-1 justify-center {theme === 'sepia' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
											<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
										</svg>
										<span>Sepia</span>
									</button>
									<button
										type="button"
										onclick={() => setTheme('dark')}
										class="theme-pill theme-pill--dark flex-1 justify-center {theme === 'dark' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
										</svg>
										<span>Gelap</span>
									</button>
								</div>
							</div>

							<!-- Gaya Font -->
							<div class="setting-block">
								<span class="setting-label">Gaya Font</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setFontFamily('sans')}
										class="pill-btn flex-1 font-sans-preview {fontFamily === 'sans' ? 'pill-btn--active' : ''}"
									>
										Modern Sans
									</button>
									<button
										type="button"
										onclick={() => setFontFamily('serif')}
										class="pill-btn flex-1 font-serif-preview {fontFamily === 'serif' ? 'pill-btn--active' : ''}"
									>
										Buku Serif
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</aside>
		{/if}

		<!-- Reading Canvas Main Area -->
		<main class="course-main-canvas">
			<div class="reading-column-wrapper">
				<!-- Reader Top Back Navigation & Breadcrumbs -->
				<div class="reader-top-nav-bar">
					<a href={`/materi/${data.track.id}`} class="btn-back-track" title={`Kembali ke daftar materi ${data.track.title}`}>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="15 18 9 12 15 6" />
						</svg>
						<span>Daftar Materi Track</span>
					</a>

					<div class="reader-nav-breadcrumbs">
						<a href="/materi" class="crumb-link">Katalog</a>
						<span class="crumb-sep">/</span>
						<a href={`/materi/${data.track.id}`} class="crumb-link truncate-crumb" title={data.track.title}>{data.track.title}</a>
					</div>
				</div>

				<!-- Article Title Header -->
				<header class="article-title-header">
					<div class="article-kicker-text">
						{data.materi.phaseTitle} &bull; {data.materi.subPhaseTitle}
					</div>
					<h1 class="article-main-title">{data.materi.title}</h1>
					<div class="article-meta-strip">
						<span class="meta-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
							Estimasi ~{contentStats.minutes} mnt baca ({contentStats.words} kata)
						</span>
						<span class="meta-dot">&bull;</span>
						<span class="meta-item meta-item--subtle">
							Materi Publik
						</span>
					</div>
				</header>

				<!-- Article Body Content (Render Tiptap / HTML) -->
				<article class="prose-reading">
					{#if data.materi.content}
						{@html data.materi.content}
					{:else}
						<p class="empty-content-text">Konten materi ini belum ditambahkan.</p>
					{/if}
				</article>

				<!-- Attachments Section -->
				{#if data.materi.attachments && data.materi.attachments.length > 0}
					<section class="materi-attachments-section">
						<div class="attachments-header">
							<div class="attachments-title-group">
								<div class="attachments-icon-badge">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
								</div>
								<div>
									<h3 class="attachments-heading">Lampiran Modul & Berkas Praktikum</h3>
									<p class="attachments-subheading">Unduh berkas konfigurasi, modul lab, atau file pendukung</p>
								</div>
							</div>
							<span class="attachments-count-badge">{data.materi.attachments.length} Berkas</span>
						</div>
						<div class="attachments-grid">
							{#each data.materi.attachments as file}
								<a href={file.url} target="_blank" rel="noopener noreferrer" download class="attachment-card">
									<div class="att-card-icon">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
									</div>
									<div class="att-card-info">
										<span class="att-card-name truncate">{file.name}</span>
										<span class="att-card-size">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unduh'}</span>
									</div>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Video Recommendations Section -->
				{#if data.materi.videoRecommendations && data.materi.videoRecommendations.length > 0}
					<section class="materi-video-recommendations-section">
						<div class="video-section-header">
							<div class="attachments-title-group">
								<div class="attachments-icon-badge">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
								</div>
								<div>
									<h3 class="attachments-heading">Video Referensi & Tutorial</h3>
									<p class="attachments-subheading">Tonton penjelasan visual dan demonstrasi lab terkait</p>
								</div>
							</div>
							<span class="attachments-count-badge">{data.materi.videoRecommendations.length} Video</span>
						</div>
						<div class="videos-grid">
							{#each data.materi.videoRecommendations as vid}
								{@const ytId = vid.youtubeId || (vid.url ? (vid.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1] : null)}
								<div class="video-card">
									{#if ytId}
										<div class="video-iframe-wrap">
											<iframe
												src="https://www.youtube.com/embed/{ytId}"
												title={vid.title || 'Video'}
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowfullscreen
											></iframe>
										</div>
									{/if}
									<div class="video-card-body">
										<h4 class="video-card-title">{vid.title}</h4>
										{#if vid.duration}
											<span class="video-duration-pill">{vid.duration}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		</main>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     3. FIXED BOTTOM DOCKED ACTION BAR (PREV / TOGGLE / NEXT)
	     ══════════════════════════════════════════════════════════ -->
	<footer class="course-bottom-bar">
		<!-- Left Slot: Prev Module Button -->
		<div class="bottom-bar-side-slot left-slot">
			{#if data.prevMateri}
				<a
					href={`/materi/${data.track.id}/${data.prevMateri.id}`}
					class="bottom-bar-nav-btn prev-btn"
					title={`Modul Sebelumnya: ${data.prevMateri.title}`}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span class="sm:hidden text-xs font-semibold truncate">Sebelumnya</span>
					<div class="nav-btn-text min-w-0 hidden sm:flex flex-col text-left">
						<span class="nav-btn-label">Sebelumnya</span>
						<span class="nav-btn-title truncate">{data.prevMateri.title}</span>
					</div>
				</a>
			{:else}
				<div class="bottom-bar-placeholder"></div>
			{/if}
		</div>

		<!-- Center Slot: Sidebar / Menu Toggle Trigger -->
		<div class="bottom-bar-center-slot">
			<button
				type="button"
				onclick={() => (isSlidebarOpen = !isSlidebarOpen)}
				class="bottom-bar-menu-btn {isSlidebarOpen ? 'bottom-bar-menu-btn--active' : ''}"
				title="Buka Silabus, Daftar Isi, & Pengaturan Tampilan"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					{#if isSlidebarOpen}
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					{:else}
						<line x1="8" y1="6" x2="21" y2="6" />
						<line x1="8" y1="12" x2="21" y2="12" />
						<line x1="8" y1="18" x2="21" y2="18" />
					{/if}
				</svg>
				<span class="menu-btn-label">{isSlidebarOpen ? 'Tutup Sidebar' : 'Silabus & Daftar Isi'}</span>
			</button>
		</div>

		<!-- Right Slot: Next Module Button -->
		<div class="bottom-bar-side-slot right-slot">
			{#if data.nextMateri}
				<a
					href={`/materi/${data.track.id}/${data.nextMateri.id}`}
					class="bottom-bar-nav-btn next-btn"
					title={`Modul Selanjutnya: ${data.nextMateri.title}`}
				>
					<div class="nav-btn-text min-w-0 hidden sm:flex flex-col text-right">
						<span class="nav-btn-label">Selanjutnya</span>
						<span class="nav-btn-title truncate">{data.nextMateri.title}</span>
					</div>
					<span class="sm:hidden text-xs font-semibold truncate">Selanjutnya</span>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</a>
			{:else}
				<div class="bottom-bar-placeholder"></div>
			{/if}
		</div>
	</footer>

	<!-- ══════════════════════════════════════════════════════════
	     4. MOBILE BOTTOM SHEET SLIDER DRAWER (< 1024px)
	     ══════════════════════════════════════════════════════════ -->
	{#if isSlidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="mobile-drawer-backdrop"
			onclick={() => (isSlidebarOpen = false)}
			transition:fade={{ duration: 150 }}
			role="presentation"
		>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				class="mobile-drawer-panel theme-{theme}"
				onclick={(e) => e.stopPropagation()}
				transition:fly={{ y: 360, duration: 200 }}
				role="dialog"
				aria-modal="true"
				tabindex="-1"
			>
				<!-- Mobile Handle Bar -->
				<div class="drawer-handle-bar"></div>

				<!-- Slidebar Header Tabs & Close Button -->
				<div class="drawer-header-row">
					<div class="drawer-tab-switch">
						<button
							type="button"
							onclick={() => (activeSlidebarTab = 'syllabus')}
							class="drawer-tab-btn {activeSlidebarTab === 'syllabus' ? 'drawer-tab-btn--active' : ''}"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
								<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
							</svg>
							<span>Silabus</span>
						</button>

						<button
							type="button"
							onclick={() => (activeSlidebarTab = 'toc')}
							class="drawer-tab-btn {activeSlidebarTab === 'toc' ? 'drawer-tab-btn--active' : ''}"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="8" y1="6" x2="21" y2="6" />
								<line x1="8" y1="12" x2="21" y2="12" />
								<line x1="8" y1="18" x2="21" y2="18" />
							</svg>
							<span>Daftar Isi</span>
							{#if tocList.length > 0}
								<span class="tab-counter-badge">{tocList.length}</span>
							{/if}
						</button>

						<button
							type="button"
							onclick={() => (activeSlidebarTab = 'settings')}
							class="drawer-tab-btn {activeSlidebarTab === 'settings' ? 'drawer-tab-btn--active' : ''}"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3" />
								<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
							</svg>
							<span>Tampilan</span>
						</button>
					</div>

					<button type="button" onclick={() => (isSlidebarOpen = false)} class="btn-drawer-close">
						Tutup
					</button>
				</div>

				<!-- Drawer Body Content -->
				<div class="drawer-body">
					{#if activeSlidebarTab === 'syllabus'}
						<!-- Mobile Syllabus Tree -->
						<div class="syllabus-tree-container">
							<div class="syllabus-track-header">
								<a href={`/materi/${data.track.id}`} class="btn-syllabus-back" title="Lihat silabus lengkap track ini">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<polyline points="15 18 9 12 15 6" />
									</svg>
									<span class="truncate">{data.track.title}</span>
								</a>
							</div>
							{#each data.syllabus as p, pIdx (p.id)}
								{@const isOpen = !!openPhases[p.id]}
								<div class="phase-group">
									<button
										type="button"
										onclick={() => togglePhaseAccordion(p.id)}
										class="phase-group-header"
									>
										<div class="phase-header-left truncate">
											<span class="phase-badge-pill">FASE {pIdx + 1}</span>
											<span class="phase-title-text truncate">{p.title}</span>
										</div>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											class="transform transition-transform {isOpen ? 'rotate-180' : ''}"
										>
											<polyline points="6 9 12 15 18 9" />
										</svg>
									</button>

									{#if isOpen}
										<div class="phase-group-body">
											{#each p.subPhases as sp (sp.id)}
												<div class="subphase-group">
													<div class="subphase-header-label truncate">{sp.title}</div>
													<div class="materi-links-list">
														{#each sp.materiList as m (m.id)}
															{@const isCurrent = m.id === data.materi.id}
															<a
																href={`/materi/${data.track.id}/${m.id}`}
																onclick={() => (isSlidebarOpen = false)}
																class="materi-tree-link {isCurrent ? 'materi-tree-link--active' : ''}"
															>
																<div class="materi-tree-icon">
																	{#if isCurrent}
																		<div class="active-dot"></div>
																	{:else}
																		<div class="pending-dot"></div>
																	{/if}
																</div>
																<span class="materi-tree-title truncate">{m.title}</span>
															</a>
														{/each}
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else if activeSlidebarTab === 'toc'}
						<!-- Mobile Table of Contents -->
						{#if tocList.length > 0}
							<nav class="mobile-toc-list">
								{#each tocList as item}
									<button
										type="button"
										onclick={() => scrollToHeading(item.id)}
										class="toc-link-item level-{item.level} {activeTocId === item.id ? 'toc-link-item--active' : ''}"
									>
										<span class="toc-bullet"></span>
										<span class="toc-label truncate">{item.text}</span>
									</button>
								{/each}
							</nav>
						{:else}
							<div class="empty-tab-hint">Tidak ada sub-bab terdeteksi pada materi ini.</div>
						{/if}
					{:else if activeSlidebarTab === 'settings'}
						<!-- Mobile Reading Settings -->
						<div class="settings-container">
							<!-- Ukuran Font -->
							<div class="setting-block">
								<span class="setting-label">Ukuran Teks</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setFontSize('sm')}
										class="pill-btn flex-1 {fontSize === 'sm' ? 'pill-btn--active' : ''}"
									>
										Kecil
									</button>
									<button
										type="button"
										onclick={() => setFontSize('base')}
										class="pill-btn flex-1 {fontSize === 'base' ? 'pill-btn--active' : ''}"
									>
										Sedang
									</button>
									<button
										type="button"
										onclick={() => setFontSize('lg')}
										class="pill-btn flex-1 {fontSize === 'lg' ? 'pill-btn--active' : ''}"
									>
										Besar
									</button>
								</div>
							</div>

							<!-- Tema Warna -->
							<div class="setting-block">
								<span class="setting-label">Tema Warna Baca</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setTheme('light')}
										class="theme-pill theme-pill--light flex-1 justify-center {theme === 'light' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<circle cx="12" cy="12" r="5" />
										</svg>
										<span>Terang</span>
									</button>
									<button
										type="button"
										onclick={() => setTheme('sepia')}
										class="theme-pill theme-pill--sepia flex-1 justify-center {theme === 'sepia' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
											<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
										</svg>
										<span>Sepia</span>
									</button>
									<button
										type="button"
										onclick={() => setTheme('dark')}
										class="theme-pill theme-pill--dark flex-1 justify-center {theme === 'dark' ? 'theme-pill--active' : ''}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
										</svg>
										<span>Gelap</span>
									</button>
								</div>
							</div>

							<!-- Gaya Font -->
							<div class="setting-block">
								<span class="setting-label">Gaya Font</span>
								<div class="pill-group mt-1.5">
									<button
										type="button"
										onclick={() => setFontFamily('sans')}
										class="pill-btn flex-1 font-sans-preview {fontFamily === 'sans' ? 'pill-btn--active' : ''}"
									>
										Modern Sans
									</button>
									<button
										type="button"
										onclick={() => setFontFamily('serif')}
										class="pill-btn flex-1 font-serif-preview {fontFamily === 'serif' ? 'pill-btn--active' : ''}"
									>
										Buku Serif
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- ══════════════════════════════════════════════════════════
     5. STICKY GUEST NOTICE BANNER (LIGHT THEME)
     ══════════════════════════════════════════════════════════ -->
{#if !bannerDismissed && !data.user}
	<div class="guest-notice-banner">
		<div class="banner-icon">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
		</div>
		<span class="banner-text"><strong>Mode Tamu</strong> &bull; Login untuk simpan progress belajar</span>
		<a href="/login?redirectTo=/materi/{data.track.id}/{data.materi.id}" class="banner-cta">Login Sekarang</a>
		<button
			type="button"
			class="banner-dismiss"
			onclick={() => (bannerDismissed = true)}
			aria-label="Tutup banner"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════════════
     6. IMAGE LIGHTBOX ZOOM MODAL
     ══════════════════════════════════════════════════════════ -->
{#if lightboxImg}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="lightbox-backdrop"
		onclick={closeLightbox}
		transition:fade={{ duration: 180 }}
		role="dialog"
		aria-modal="true"
		aria-label="Tampilan Penuh Gambar"
	>
		<!-- Floating Lightbox Controls -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="lightbox-toolbar" onclick={(e) => e.stopPropagation()}>
			<button type="button" onclick={zoomOut} class="btn-lb-tool" title="Perkecil (-)">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
					<line x1="8" y1="11" x2="14" y2="11" />
				</svg>
			</button>
			<button type="button" onclick={resetZoom} class="btn-lb-tool btn-lb-percent" title="Reset Zoom">
				{Math.round(lightboxScale * 100)}%
			</button>
			<button type="button" onclick={zoomIn} class="btn-lb-tool" title="Perbesar (+)">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
					<line x1="11" y1="8" x2="11" y2="14" />
					<line x1="8" y1="11" x2="14" y2="11" />
				</svg>
			</button>
			<div class="lb-sep"></div>
			<button type="button" onclick={closeLightbox} class="btn-lb-tool btn-lb-close" title="Tutup (Esc)">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<!-- Zoomable Image Canvas -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="lightbox-stage" onclick={(e) => e.stopPropagation()}>
			<img
				src={lightboxImg.src}
				alt={lightboxImg.alt}
				style="transform: scale({lightboxScale});"
				class="lightbox-img"
			/>
			{#if lightboxImg.title || lightboxImg.alt}
				<div class="lightbox-caption">
					{lightboxImg.title || lightboxImg.alt}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════════════
     7. AUTH GUARD MODAL
     ══════════════════════════════════════════════════════════ -->
{#if showAuthModal}
	<div class="auth-modal-overlay" onclick={() => showAuthModal = false}>
		<div class="auth-modal-card panel" onclick={(e) => e.stopPropagation()}>
			<div class="auth-modal-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			</div>
			<h3 class="auth-modal-title">Perlu Login untuk {authModalAction}</h3>
			<p class="auth-modal-desc">Fitur ini khusus untuk siswa terdaftar di Nesaga Learning Community agar progress belajar dan skor kuis tersimpan secara otomatis.</p>
			<div class="auth-modal-actions">
				<a href="/login?redirectTo=/materi/{data.track.id}/{data.materi.id}" class="btn-primary-gradient auth-login-btn">
					Masuk Sekarang
				</a>
				<button type="button" class="btn-ghost" onclick={() => showAuthModal = false}>
					Lanjut Membaca Tamu
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ══════════════════════════════════════════════════════════
	   THEME COLOR SCHEMES & CSS CUSTOM PROPERTIES
	   ══════════════════════════════════════════════════════════ */
	.reader-page {
		min-height: 100vh;
		background: var(--r-bg);
		color: var(--r-text-body);
		transition: background-color 180ms ease, color 180ms ease;
		display: flex;
		flex-direction: column;
	}

	.theme-light {
		--r-bg: #f8fafc;
		--r-topbar-bg: #ffffff;
		--r-sidebar-bg: #ffffff;
		--r-card-bg: #ffffff;
		--r-border: #e2e8f0;
		--r-border-subtle: #f1f5f9;
		--r-text-primary: #0f172a;
		--r-text-body: #334155;
		--r-text-muted: #64748b;
		--r-code-bg: #f1f5f9;
		--r-code-border: #e2e8f0;
		--r-code-text: #0f172a;
		--r-quote-bg: #eff6ff;
		--r-quote-border: #3b82f6;
		--r-hover-bg: #f8fafc;
		--r-active-bg: #eff6ff;
		--r-active-text: #4f46e5;
	}

	.theme-sepia {
		--r-bg: #f4ebd9;
		--r-topbar-bg: #faf3e6;
		--r-sidebar-bg: #faf3e6;
		--r-card-bg: #fdfbf7;
		--r-border: #e2d3bb;
		--r-border-subtle: #eee2cd;
		--r-text-primary: #2b1f13;
		--r-text-body: #473623;
		--r-text-muted: #78644e;
		--r-code-bg: #ede0c9;
		--r-code-border: #dcc8a8;
		--r-code-text: #8c4c1a;
		--r-quote-bg: #ede1cb;
		--r-quote-border: #b87d3b;
		--r-hover-bg: #eee4d1;
		--r-active-bg: #e7dac1;
		--r-active-text: #703912;
	}

	.theme-dark {
		--r-bg: #0b0f19;
		--r-topbar-bg: #111827;
		--r-sidebar-bg: #111827;
		--r-card-bg: #111827;
		--r-border: #1f2937;
		--r-border-subtle: #1a2234;
		--r-text-primary: #f9fafb;
		--r-text-body: #cbd5e1;
		--r-text-muted: #94a3b8;
		--r-code-bg: #1e293b;
		--r-code-border: #334155;
		--r-code-text: #818cf8;
		--r-quote-bg: #1e293b;
		--r-quote-border: #6366f1;
		--r-hover-bg: #1e293b;
		--r-active-bg: #312e81;
		--r-active-text: #a5b4fc;
	}

	/* Top Reading Scroll Indicator */
	.course-scroll-progress-wrap {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(226, 232, 240, 0.4);
		z-index: 1000;
	}

	.course-scroll-progress-bar {
		height: 100%;
		background: #4f46e5;
		transition: width 100ms ease-out;
	}

	/* ══════════════════════════════════════════════════════════
	   1. TOPBAR
	   ══════════════════════════════════════════════════════════ */
	/* ══════════════════════════════════════════════════════════
	   MAIN WORKSPACE & DOCKED SIDEBAR
	   ══════════════════════════════════════════════════════════ */
	.course-workspace {
		display: flex;
		flex: 1;
		width: 100%;
		min-height: 100vh;
		box-sizing: border-box;
		position: relative;
	}

	@media (min-width: 1024px) {
		.desktop-course-sidebar {
			display: flex !important;
			width: 350px;
			background: var(--r-sidebar-bg);
			border-right: 1px solid var(--r-border);
			flex-direction: column;
			position: sticky;
			top: 0;
			height: 100vh;
			overflow: visible;
			flex-shrink: 0;
			z-index: 20;
			box-shadow: 2px 0 12px rgba(0, 0, 0, 0.03);
		}

		.sidebar-dock-toggle-btn {
			position: absolute;
			top: 14px;
			right: -13px;
			z-index: 40;
			width: 26px;
			height: 26px;
			border-radius: 50%;
			background: var(--r-card-bg);
			border: 1px solid var(--r-border);
			color: var(--r-text-muted);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			transition: all 160ms ease;
		}

		.sidebar-dock-toggle-btn:hover {
			color: #4f46e5;
			border-color: #818cf8;
			transform: scale(1.1);
			box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
		}

		.mobile-drawer-backdrop {
			display: none !important;
		}
	}

	.syllabus-track-header {
		padding: 10px 14px 6px;
	}

	.btn-syllabus-back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 7px 10px;
		border-radius: 8px;
		background: var(--r-hover-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-primary);
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: all 140ms ease;
		box-sizing: border-box;
	}

	.btn-syllabus-back:hover {
		border-color: #818cf8;
		color: #4338ca;
		background: var(--r-active-bg);
	}

	@media (max-width: 1023px) {
		.desktop-course-sidebar {
			display: none !important;
		}

		.mobile-drawer-backdrop {
			display: flex !important;
			position: fixed;
			inset: 0;
			background: rgba(15, 23, 42, 0.25);
			z-index: 1000;
			align-items: flex-end;
			justify-content: center;
		}

		.mobile-drawer-panel {
			background: var(--r-sidebar-bg);
			border-radius: 20px 20px 0 0;
			width: 100%;
			max-width: 100vw;
			padding: 16px 20px calc(24px + env(safe-area-inset-bottom, 0px));
			box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
			max-height: 85vh;
			display: flex;
			flex-direction: column;
		}
	}

	.sidebar-tabs-header {
		display: flex;
		border-bottom: 1px solid var(--r-border);
		background: var(--r-border-subtle);
		padding: 4px;
		gap: 3px;
	}

	.sidebar-tab-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 7px 4px;
		border-radius: 6px;
		background: transparent;
		border: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		color: var(--r-text-muted);
		cursor: pointer;
		transition: all 140ms ease;
	}

	.sidebar-tab-btn:hover {
		color: var(--r-text-primary);
	}

	.sidebar-tab-btn--active {
		background: var(--r-sidebar-bg);
		color: #4f46e5;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.tab-counter-badge {
		font-family: var(--font-mono, monospace);
		font-size: 9.5px;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 9999px;
		background: var(--r-active-bg);
		color: var(--r-active-text);
	}

	.sidebar-scroll-body {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Syllabus Tree Inside Sidebar */
	.syllabus-tree-container {
		display: flex;
		flex-direction: column;
	}

	.phase-group {
		border-bottom: 1px solid var(--r-border-subtle);
	}

	.phase-group-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--r-sidebar-bg);
		border: none;
		color: var(--r-text-primary);
		cursor: pointer;
		text-align: left;
		transition: background 140ms ease;
	}

	.phase-group-header:hover {
		background: var(--r-hover-bg);
	}

	.phase-header-left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.phase-badge-pill {
		font-family: var(--font-mono, monospace);
		font-size: 9.5px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: #e0e7ff;
		color: #4338ca;
		flex-shrink: 0;
	}

	.phase-title-text {
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
	}

	.phase-group-body {
		background: var(--r-border-subtle);
		padding: 4px 8px 10px;
	}

	.subphase-group {
		margin-top: 6px;
	}

	.subphase-header-label {
		font-family: var(--font-macro, sans-serif);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--r-text-muted);
		padding: 4px 6px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.materi-links-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.materi-tree-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 6px;
		text-decoration: none;
		color: var(--r-text-body);
		font-size: 12px;
		transition: all 140ms ease;
		min-height: 28px;
	}

	.materi-tree-link:hover {
		background: var(--r-sidebar-bg);
		color: var(--r-text-primary);
	}

	.materi-tree-link--active {
		background: var(--r-active-bg) !important;
		color: var(--r-active-text) !important;
		font-weight: 700;
	}

	.materi-tree-icon {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.active-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #4f46e5;
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.25);
	}

	.pending-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #cbd5e1;
	}

	.materi-tree-title {
		flex: 1;
		min-width: 0;
	}

	/* ══════════════════════════════════════════════════════════
	   TOC (TABLE OF CONTENTS)
	   ══════════════════════════════════════════════════════════ */
	.toc-container {
		padding: 12px;
	}

	.toc-header-label {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--r-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 8px;
		padding: 0 4px;
	}

	.toc-nav-list,
	.mobile-toc-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		position: relative;
		border-left: 2px solid var(--r-border-subtle);
		padding-left: 4px;
		margin-left: 4px;
	}

	.toc-link-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border: none;
		border-left: 2px solid transparent;
		margin-left: -6px;
		background: transparent;
		text-align: left;
		font-size: 12px;
		color: var(--r-text-muted);
		border-radius: 0 6px 6px 0;
		cursor: pointer;
		transition: all 140ms ease;
		width: 100%;
		min-height: 30px;
	}

	.toc-link-item.level-1 { font-weight: 700; color: var(--r-text-primary); }
	.toc-link-item.level-2 { padding-left: 16px; }
	.toc-link-item.level-3 { padding-left: 24px; font-size: 11.5px; }

	.toc-bullet {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--r-border);
		flex-shrink: 0;
		transition: background 140ms ease;
	}

	.toc-link-item:hover {
		background: var(--r-hover-bg);
		color: #4f46e5;
	}

	.toc-link-item--active {
		background: var(--r-hover-bg) !important;
		color: #4f46e5 !important;
		border-left-color: #4f46e5 !important;
		font-weight: 700 !important;
	}

	.toc-link-item--active .toc-bullet {
		background: #4f46e5 !important;
	}

	.empty-tab-hint {
		padding: 32px 16px;
		text-align: center;
		font-size: 12px;
		color: var(--r-text-muted);
		font-style: italic;
	}

	/* ══════════════════════════════════════════════════════════
	   SETTINGS
	   ══════════════════════════════════════════════════════════ */
	.settings-container {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.setting-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.setting-label {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--r-text-primary);
	}

	.pill-group {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
	}

	.pill-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px 8px;
		border-radius: 6px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		background: var(--r-hover-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-muted);
		cursor: pointer;
		transition: all 140ms ease;
	}

	.pill-btn:hover {
		color: var(--r-text-primary);
		border-color: #818cf8;
	}

	.pill-btn--active {
		background: #e0e7ff !important;
		color: #4338ca !important;
		border-color: #c7d2fe !important;
	}

	.theme-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		border: 1px solid var(--r-border);
		cursor: pointer;
		transition: all 140ms ease;
	}

	.theme-pill--light { background: #ffffff; color: #334155; }
	.theme-pill--sepia { background: #f4e8d3; color: #4a3824; border-color: #dfcbac; }
	.theme-pill--dark { background: #1e293b; color: #cbd5e1; border-color: #334155; }

	.theme-pill--active {
		border-color: #4f46e5 !important;
		box-shadow: 0 0 0 1.5px #4f46e5;
	}

	.font-sans-preview { font-family: var(--font-body, sans-serif) !important; font-weight: 700; }
	.font-serif-preview { font-family: Georgia, serif !important; font-weight: 700; }

	/* ══════════════════════════════════════════════════════════
	   READING CANVAS & PROSE
	   ══════════════════════════════════════════════════════════ */
	.course-main-canvas {
		flex: 1;
		min-width: 0;
		display: flex;
		justify-content: center;
		padding: 36px 24px 120px;
		box-sizing: border-box;
	}

	.reading-column-wrapper {
		width: 100%;
		max-width: 740px;
		box-sizing: border-box;
	}

	/* Reader Top Navigation Bar */
	.reader-top-nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 24px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--r-border);
		flex-wrap: wrap;
	}

	.btn-back-track {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px;
		border-radius: 8px;
		background: var(--r-card-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-primary);
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
	}

	.btn-back-track:hover {
		background: var(--r-hover-bg);
		border-color: #818cf8;
		color: #4f46e5;
		transform: translateX(-2px);
	}

	.reader-nav-breadcrumbs {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--r-text-muted);
		font-family: var(--font-body, sans-serif);
	}

	.crumb-link {
		color: var(--r-text-muted);
		text-decoration: none;
		transition: color 140ms ease;
	}

	.crumb-link:hover {
		color: #4f46e5;
	}

	.truncate-crumb {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.crumb-sep {
		color: var(--r-border);
	}

	.article-title-header {
		margin-bottom: 32px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--r-border);
		display: flex;
		flex-direction: column;
	}

	.article-kicker-text {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #4f46e5;
		margin-bottom: 8px;
	}

	.article-main-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.6rem, 3.2vw, 2.2rem);
		font-weight: 800;
		color: var(--r-text-primary);
		line-height: 1.25;
		margin: 0 0 16px 0;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	.article-meta-strip {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 12.5px;
		color: var(--r-text-muted);
		font-family: var(--font-body, sans-serif);
		line-height: 1.4;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.meta-item--subtle {
		color: var(--r-text-muted);
	}

	.meta-dot {
		color: var(--r-border);
		user-select: none;
	}

	/* Font Presets */
	.size-sm { font-size: 14.5px; }
	.size-base { font-size: 16px; }
	.size-lg { font-size: 18px; }

	.font-sans { font-family: var(--font-body, system-ui, -apple-system, sans-serif); }
	.font-serif { font-family: 'Merriweather', Georgia, Cambria, serif; }

	/* Prose Typography */
	.prose-reading {
		color: var(--r-text-body);
		line-height: 1.82;
		letter-spacing: -0.01em;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	.prose-reading :global(h1),
	.prose-reading :global(h2),
	.prose-reading :global(h3) {
		font-family: var(--font-macro, sans-serif);
		font-weight: 800;
		color: var(--r-text-primary);
		margin-top: 1.8em;
		margin-bottom: 0.6em;
		line-height: 1.32;
	}

	.prose-reading :global(h1) { font-size: 1.55em; border-bottom: 1.5px solid var(--r-border); padding-bottom: 0.35em; }
	.prose-reading :global(h2) { font-size: 1.32em; }
	.prose-reading :global(h3) { font-size: 1.15em; }

	.prose-reading :global(p) { margin-bottom: 1.25em; }
	.prose-reading :global(ul), .prose-reading :global(ol) { margin-bottom: 1.25em; padding-left: 1.5em; }
	.prose-reading :global(li) { margin-bottom: 0.4em; }

	.prose-reading :global(code) {
		font-family: var(--font-mono, monospace);
		font-size: 0.88em;
		background: var(--r-code-bg);
		border: 1px solid var(--r-code-border);
		border-radius: 5px;
		padding: 2px 6px;
		color: var(--r-code-text);
		font-weight: 600;
	}

	.prose-reading :global(blockquote) {
		margin: 1.4em 0;
		padding: 12px 18px;
		background: var(--r-quote-bg);
		border-left: 4px solid var(--r-quote-border);
		border-radius: 0 8px 8px 0;
		color: var(--r-text-body);
		font-style: italic;
	}

	.prose-reading :global(blockquote p) { margin: 0; }

	.prose-reading :global(figure) { margin: 1.5em 0; text-align: center; }
	.prose-reading :global(img) {
		max-width: 100% !important;
		height: auto !important;
		border-radius: 10px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		transition: transform 180ms ease;
		display: inline-block;
	}

	.prose-reading :global(img:hover) {
		transform: scale(1.01);
	}

	.prose-reading :global(.table-responsive-wrapper) {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 1.4em 0;
		border: 1px solid var(--r-border);
		border-radius: 8px;
	}

	.prose-reading :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9em;
	}

	.prose-reading :global(th), .prose-reading :global(td) {
		padding: 10px 14px;
		border-bottom: 1px solid var(--r-border);
		text-align: left;
	}

	.prose-reading :global(th) {
		background: var(--r-border-subtle);
		font-family: var(--font-macro, sans-serif);
		font-weight: 700;
		color: var(--r-text-primary);
	}

	/* macOS Style Code Block */
	.prose-reading :global(.tiptap-code-block-wrapper) {
		margin: 1.4em 0;
		border-radius: 10px;
		border: 1px solid #334155;
		background: #0f172a;
		overflow: hidden;
		box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.3);
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

	.prose-reading :global(.mac-dots) { display: flex; align-items: center; gap: 6px; }
	.prose-reading :global(.mac-dot) { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
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
	}

	.prose-reading :global(.code-copy-btn--copied) {
		color: #34d399 !important;
		background: rgba(6, 78, 59, 0.8) !important;
		border-color: rgba(52, 211, 153, 0.4) !important;
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

	/* ══════════════════════════════════════════════════════════
	   ATTACHMENTS & VIDEOS SECTION
	   ══════════════════════════════════════════════════════════ */
	.materi-attachments-section,
	.materi-video-recommendations-section {
		margin-top: 24px;
		padding: 20px;
		border-radius: 14px;
		background: var(--r-card-bg);
		border: 1px solid var(--r-border);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		transition: background-color 180ms ease, border-color 180ms ease;
	}

	.attachments-header,
	.video-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	.attachments-title-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.attachments-icon-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--r-active-bg);
		color: var(--r-active-text);
		border: 1px solid var(--r-code-border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.attachments-heading {
		font-family: var(--font-macro, sans-serif);
		font-size: 14px;
		font-weight: 800;
		color: var(--r-text-primary);
		margin: 0;
		line-height: 1.25;
	}

	.attachments-subheading {
		font-size: 11.5px;
		color: var(--r-text-muted);
		margin: 2px 0 0 0;
	}

	.attachments-count-badge {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 6px;
		background: var(--r-code-bg);
		color: var(--r-code-text);
		border: 1px solid var(--r-code-border);
	}

	.attachments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 10px;
	}

	.attachment-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid var(--r-border);
		background: var(--r-bg);
		text-decoration: none;
		color: var(--r-text-primary);
		transition: all 160ms ease;
		box-sizing: border-box;
		min-width: 0;
	}

	.attachment-card:hover {
		border-color: #818cf8;
		background: var(--r-hover-bg);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.att-card-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--r-active-bg);
		color: var(--r-active-text);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.att-card-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.att-card-name {
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--r-text-primary);
	}

	.att-card-size {
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		color: var(--r-text-muted);
	}

	.videos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 14px;
	}

	.video-card {
		border-radius: 10px;
		border: 1px solid var(--r-border);
		overflow: hidden;
		background: var(--r-bg);
	}

	.video-iframe-wrap {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		background: #000000;
	}

	.video-iframe-wrap iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.video-card-body {
		padding: 10px 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.video-card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--r-text-primary);
		margin: 0;
	}

	.video-duration-pill {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--r-code-bg);
		color: var(--r-code-text);
		white-space: nowrap;
	}

	/* ══════════════════════════════════════════════════════════
	   3. FIXED BOTTOM BAR
	   ══════════════════════════════════════════════════════════ */
	.course-bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 58px;
		background: var(--r-card-bg);
		border-top: 1px solid var(--r-border);
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
	}

	.bottom-bar-side-slot {
		flex: 1;
		display: flex;
		min-width: 0;
	}

	.left-slot { justify-content: flex-start; }
	.right-slot { justify-content: flex-end; }

	.bottom-bar-center-slot {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0 10px;
	}

	.bottom-bar-nav-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 12px;
		border-radius: 8px;
		background: var(--r-hover-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-primary);
		text-decoration: none;
		max-width: 240px;
		min-width: 0;
		transition: all 140ms ease;
	}

	.bottom-bar-nav-btn:hover {
		border-color: #818cf8;
		color: #4338ca;
	}

	.nav-btn-text {
		min-width: 0;
		flex: 1;
	}

	.nav-btn-label {
		font-family: var(--font-mono, monospace);
		font-size: 9.5px;
		font-weight: 700;
		color: var(--r-text-muted);
		text-transform: uppercase;
		line-height: 1.1;
	}

	.nav-btn-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		line-height: 1.2;
	}

	.bottom-bar-menu-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		border-radius: 9999px;
		background: #4f46e5;
		color: #ffffff;
		border: 1px solid #4338ca;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
	}

	.bottom-bar-menu-btn:hover {
		background: #4338ca;
		transform: translateY(-1px);
	}

	.bottom-bar-menu-btn--active {
		background: #334155;
		border-color: #1e293b;
	}

	.bottom-bar-placeholder {
		width: 38px;
	}

	/* ══════════════════════════════════════════════════════════
	   4. MOBILE DRAWER PANEL
	   ══════════════════════════════════════════════════════════ */
	.drawer-handle-bar {
		width: 36px;
		height: 4px;
		border-radius: 9999px;
		background: var(--r-border);
		margin: 0 auto 12px;
	}

	.drawer-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--r-border);
	}

	.drawer-tab-switch {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.drawer-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		background: transparent;
		border: 1px solid transparent;
		color: var(--r-text-muted);
		cursor: pointer;
	}

	.drawer-tab-btn--active {
		background: var(--r-active-bg);
		color: var(--r-active-text);
		border-color: var(--r-border);
	}

	.btn-drawer-close {
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--r-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
	}

	.drawer-body {
		flex: 1;
		overflow-y: auto;
		max-height: 60vh;
	}

	/* ══════════════════════════════════════════════════════════
	   5. STICKY GUEST BANNER (LIGHT THEME)
	   ══════════════════════════════════════════════════════════ */
	.guest-notice-banner {
		position: fixed;
		bottom: 74px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 80;
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1.5px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-full, 9999px);
		padding: 8px 12px 8px 18px;
		color: var(--text-primary, #0f172a);
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 500;
		max-width: calc(100vw - 32px);
		box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05);
		white-space: nowrap;
	}

	.banner-icon {
		color: var(--primary, #4f46e5);
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.banner-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-secondary, #334155);
	}

	.banner-text strong {
		color: var(--text-primary, #0f172a);
		font-weight: 700;
	}

	.banner-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 16px;
		background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
		color: #ffffff;
		border-radius: var(--radius-full, 9999px);
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		transition: all 140ms ease;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
	}

	.banner-cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.banner-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--bg-cell, #f1f5f9);
		border: none;
		color: var(--text-muted, #64748b);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 140ms ease;
	}

	.banner-dismiss:hover {
		background: #e2e8f0;
		color: var(--text-primary, #0f172a);
	}

	/* ══════════════════════════════════════════════════════════
	   6. LIGHTBOX ZOOM
	   ══════════════════════════════════════════════════════════ */
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.88);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.lightbox-toolbar {
		position: fixed;
		top: 20px;
		right: 20px;
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(30, 41, 59, 0.9);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		padding: 6px 12px;
		z-index: 2010;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.btn-lb-tool {
		background: transparent;
		border: none;
		color: #e2e8f0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		cursor: pointer;
		transition: all 140ms ease;
	}

	.btn-lb-tool:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; }

	.btn-lb-percent {
		width: auto;
		padding: 0 8px;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		border-radius: 4px;
	}

	.lb-sep {
		width: 1px;
		height: 16px;
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-stage {
		max-width: 90vw;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.lightbox-img {
		max-width: 90vw;
		max-height: 75vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
		transition: transform 150ms ease-out;
		user-select: none;
	}

	.lightbox-caption {
		color: #cbd5e1;
		font-size: 13px;
		margin-top: 12px;
		text-align: center;
		max-width: 600px;
	}

	/* ══════════════════════════════════════════════════════════
	   7. AUTH MODAL
	   ══════════════════════════════════════════════════════════ */
	.auth-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(4px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.auth-modal-card {
		background: #ffffff;
		border-radius: 16px;
		padding: 28px;
		max-width: 440px;
		width: 100%;
		text-align: center;
		box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.2);
	}

	.auth-modal-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #eef2ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.auth-modal-title {
		font-family: var(--font-macro);
		font-size: 18px;
		font-weight: 800;
		color: #0f172a;
		margin: 0 0 8px 0;
	}

	.auth-modal-desc {
		font-size: 13px;
		color: #64748b;
		line-height: 1.5;
		margin: 0 0 20px 0;
	}

	.auth-modal-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.auth-login-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 18px;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		text-decoration: none;
	}

	.btn-ghost {
		background: transparent;
		border: none;
		color: #64748b;
		font-family: var(--font-body);
		font-size: 12.5px;
		cursor: pointer;
		padding: 8px;
	}

	.btn-ghost:hover {
		color: #0f172a;
	}

	@media (max-width: 768px) {
		.course-main-canvas {
			padding: 16px 14px calc(110px + env(safe-area-inset-bottom, 0px));
		}

		.reader-top-nav-bar {
			gap: 8px;
			margin-bottom: 16px;
			padding-bottom: 10px;
		}

		.btn-back-track {
			padding: 5px 10px;
			font-size: 11px;
			border-radius: 6px;
		}

		.reader-nav-breadcrumbs {
			font-size: 11px;
		}

		.truncate-crumb {
			max-width: 130px;
		}

		.article-title-header {
			margin-bottom: 18px;
			padding-bottom: 16px;
		}

		.article-kicker-text {
			font-size: 10px;
			margin-bottom: 6px;
		}

		.article-main-title {
			font-size: clamp(1.3rem, 5.5vw, 1.7rem);
			margin-bottom: 10px;
			line-height: 1.25;
		}

		.article-meta-strip {
			font-size: 11px;
			gap: 6px;
		}

		.videos-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.attachments-grid {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.attachment-card {
			padding: 10px 12px;
		}

		.course-bottom-bar {
			height: 52px;
			padding: 0 8px;
			padding-bottom: env(safe-area-inset-bottom, 0px);
			gap: 6px;
		}

		.bottom-bar-nav-btn {
			height: 36px;
			padding: 0 8px;
			font-size: 11px;
			gap: 4px;
			border-radius: 6px;
		}

		.bottom-bar-menu-btn {
			height: 36px;
			padding: 0 10px;
			font-size: 11px;
			gap: 4px;
		}

		.menu-btn-label {
			font-size: 10.5px;
		}

		.guest-notice-banner {
			bottom: calc(62px + env(safe-area-inset-bottom, 0px));
			font-size: 11.5px;
			padding: 6px 10px 6px 12px;
			max-width: calc(100vw - 20px);
			border-radius: 12px;
		}

		.mobile-drawer-panel {
			max-height: 82vh;
			border-radius: 18px 18px 0 0;
			padding: 10px 12px calc(24px + env(safe-area-inset-bottom, 0px));
		}
	}
</style>

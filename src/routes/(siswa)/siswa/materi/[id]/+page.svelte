<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import { formatFileSize } from '$lib/utils/sanitizer';
	import { fade, fly, slide } from 'svelte/transition';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let isReadCompleted = $state(false);
	let isSubmitting = $state(false);
	let fontSize = $state<'sm' | 'base' | 'lg'>('base');
	let theme = $state<'light' | 'sepia' | 'dark'>('light');
	let fontFamily = $state<'sans' | 'serif'>('sans');
	let scrollProgress = $state(0);

	// Desktop Docked Sidebar & Mobile Drawer State
	let isSlidebarOpen = $state(false);
	let activeSlidebarTab = $state<'syllabus' | 'toc' | 'settings'>('syllabus');

	// Auto-open sidebar on desktop screens (>= 1024px) by default
	$effect(() => {
		if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
			isSlidebarOpen = true;
		}
	});

	// Lightbox Zoom Modal State
	interface LightboxData {
		src: string;
		alt: string;
		title?: string;
	}
	let lightboxImg = $state<LightboxData | null>(null);
	let lightboxScale = $state(1);

	// Table of Contents State
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}
	let tocList = $state<TocItem[]>([]);
	let activeTocId = $state<string>('');

	// Accordion state for syllabus phases
	let openPhases = $state<Record<number, boolean>>({});

	// Manage focus mode body class lifecycle safely in SSR & Client
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.body.classList.add('focus-mode-active');
		}
		return () => {
			if (typeof document !== 'undefined') {
				document.body.classList.remove('focus-mode-active');
			}
		};
	});

	beforeNavigate(() => {
		if (typeof document !== 'undefined') {
			document.body.classList.remove('focus-mode-active');
		}
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.body.classList.remove('focus-mode-active');
		}
	});

	$effect(() => {
		isReadCompleted = data.isCompleted;
	});

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

	// Word count and reading time estimate
	let contentStats = $derived.by(() => {
		const html = data.materi?.content || '';
		const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		const words = text ? text.split(' ').length : 0;
		const minutes = Math.max(1, Math.ceil(words / 180));
		return {
			words,
			minutes
		};
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

	// Eye-level smooth scroll offset (~115px below sticky topbar)
	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			activeTocId = id;
			// Close drawer ONLY on mobile screens (< 1024px); keep desktop docked sidebar open
			if (typeof window !== 'undefined' && window.innerWidth < 1024) {
				isSlidebarOpen = false;
			}
			const targetPosition = el.getBoundingClientRect().top + window.scrollY - 115;
			window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
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

	// Lightbox handlers
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
			if (lightboxImg) {
				closeLightbox();
			} else if (isSlidebarOpen) {
				isSlidebarOpen = false;
			}
		}
	}

	$effect(() => {
		if (!data.materi.content) return;
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
					
					// Extract multiline code text preserving newlines
					let codeText = '';
					const codeEl = pre.querySelector('code');
					const targetEl = codeEl || pre;

					// 1. innerText preserves rendered line breaks in standard DOM
					codeText = targetEl.innerText || '';

					// 2. Fallback if innerText collapsed newlines but HTML has <br>/<p>/<div>
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

		// 5. Set up IntersectionObserver for active heading highlight
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

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.materi?.title || 'Modul Materi'} — Ruang Belajar Siswa</title>
</svelte:head>

<!-- ══════════════════════════════════════════════════════════
     DICODING-STYLE DEDICATED LEARNING WORKSPACE
     ══════════════════════════════════════════════════════════ -->
<div class="dedicated-course-room theme-{theme}">
	<!-- Top Reading Progress Bar -->
	<div class="course-scroll-progress-wrap">
		<div class="course-scroll-progress-bar" style="width: {scrollProgress}%;"></div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     1. DEDICATED COURSE TOPBAR WITH COMPLETION ACTION
	     ══════════════════════════════════════════════════════════ -->
	<header class="course-topbar">
		<div class="topbar-left">
			<!-- Back Button to Track -->
			<a
				href={`/siswa/materi?track=${data.materi?.trackId || ''}`}
				class="btn-back-track"
				title="Kembali ke Ringkasan Track Pembelajaran"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="15 18 9 12 15 6" />
				</svg>
				<span class="btn-back-label">Kembali ke Track</span>
			</a>

			<div class="topbar-vsep"></div>

			<!-- Course Hierarchy Breadcrumb -->
			<div class="course-breadcrumb-block min-w-0">
				<div class="course-track-name truncate">{data.materi?.trackTitle || ''}</div>
				<div class="course-phase-sub truncate">
					{data.materi?.phaseTitle || ''} &rsaquo; {data.materi?.subPhaseTitle || ''}
				</div>
			</div>
		</div>

		<div class="topbar-right">
			<!-- Overall Track Progress Metric -->
			<div class="track-progress-metric hidden md:flex">
				<div class="progress-metric-text">
					<span class="metric-count">{data.trackStats.completedModules}/{data.trackStats.totalModules} Modul</span>
					<span class="metric-percent">{data.trackStats.progressPercentage}%</span>
				</div>
				<div class="mini-progress-track">
					<div class="mini-progress-fill" style="width: {data.trackStats.progressPercentage}%;"></div>
				</div>
			</div>

			<!-- Topbar Form Action: Tandai Selesai -->
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
								toast.success(actionData.message || 'Modul ditandai selesai.');
							} else {
								toast.info(actionData.message || 'Status selesai dibatalkan.');
							}
						}
						await update({ reset: false });
					};
				}}
			>
				<button
					type="submit"
					disabled={isSubmitting}
					class="btn-topbar-completion {isReadCompleted ? 'btn-topbar-completion--completed' : 'btn-topbar-completion--pending'}"
				>
					{#if isReadCompleted}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						<span>Selesai (Batalkan)</span>
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						<span>Tandai Selesai</span>
					{/if}
				</button>
			</form>
		</div>
	</header>

	<!-- ══════════════════════════════════════════════════════════
	     2. MAIN WORKSPACE (DOCKED DESKTOP SIDEBAR + READING CANVAS)
	     ══════════════════════════════════════════════════════════ -->
	<div class="course-workspace">
		<!-- Desktop In-Flow Docked Sidebar (underneath topbar, pushes reading content, NO backdrop blur) -->
		{#if isSlidebarOpen}
			<aside class="desktop-course-sidebar" transition:slide={{ axis: 'x', duration: 180 }}>
				<!-- Floating Docked Rail Toggle Handle (Linear/Vercel Style) -->
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
							{#each data.syllabus as p, pIdx (p.id)}
								{@const isOpen = !!openPhases[p.id]}
								<div class="phase-group">
									<button
										type="button"
										onclick={() => togglePhaseAccordion(p.id)}
										class="phase-group-header"
									>
										<div class="flex items-center gap-2 min-w-0">
											<span class="badge badge-grade text-[9.5px] h-[22px] px-1.5">FASE {pIdx + 1}</span>
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
																href={`/siswa/materi/${m.id}`}
																class="materi-tree-link {isCurrent ? 'materi-tree-link--active' : ''}"
															>
																<div class="materi-tree-icon">
																	{#if m.isCompleted}
																		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3">
																			<polyline points="20 6 9 17 4 12" />
																		</svg>
																	{:else if isCurrent}
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
							<div class="toc-container p-3">
								<div class="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
									Sub-Bab Topik ({tocList.length})
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
						<div class="settings-container p-4 space-y-4">
							<!-- Ukuran Teks -->
							<div class="setting-block">
								<span class="setting-label">Ukuran Teks</span>
								<div class="pill-group w-full mt-1.5">
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
								<div class="pill-group w-full mt-1.5">
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
								<div class="pill-group w-full mt-1.5">
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

		<!-- Main Article Reading Canvas -->
		<main class="course-main-canvas font-{fontFamily} size-{fontSize}">
			<div class="reading-column-wrapper">
				<!-- Article Header (Clean Editorial Header, Medium/Substack Style) -->
				<header class="article-title-header">
					<div class="article-kicker-text">
						{data.materi?.trackTitle || ''}
					</div>

					<h1 class="article-main-title">
						{data.materi?.title || ''}
					</h1>

					<div class="article-meta-strip">
						<span class="meta-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
							<span>{contentStats.minutes} Menit Baca</span>
						</span>

						{#if data.materi?.phaseTitle}
							<span class="meta-dot">&bull;</span>
							<span class="meta-item meta-item--subtle">{data.materi.phaseTitle}</span>
						{/if}

						{#if isReadCompleted}
							<span class="meta-dot">&bull;</span>
							<span class="meta-item meta-item--completed">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>Selesai Dibaca</span>
							</span>
						{/if}
					</div>
				</header>

				<!-- Article Body Content -->
				{#if data.materi?.content}
					<article class="prose-reading">
						{@html data.materi.content}
					</article>
				{:else}
					<EmptyState
						title="Modul Materi Dalam Penyusunan"
						description="Mentor sedang menyiapkan konten pembelajaran untuk modul materi ini."
						iconTheme="indigo"
					/>
				{/if}

				<!-- ══════════════════════════════════════════════════════════
				     DEDICATED MATERIAL ATTACHMENTS SECTION
				     ══════════════════════════════════════════════════════════ -->
				{#if data.materi?.attachments && data.materi.attachments.length > 0}
					<section class="materi-attachments-section">
						<div class="attachments-header">
							<div class="attachments-title-group">
								<div class="attachments-icon-badge">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
										<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
									</svg>
								</div>
								<div>
									<h3 class="attachments-heading">Lampiran & Berkas Materi</h3>
									<p class="attachments-subheading">Unduh berkas pendukung pembelajaran ini</p>
								</div>
							</div>
							<span class="attachments-count-badge">
								{data.materi.attachments.length} Berkas
							</span>
						</div>

						<div class="attachments-grid">
							{#each data.materi.attachments as att}
								<a
									href={att.url}
									download={att.name}
									target="_blank"
									rel="noopener noreferrer"
									class="attachment-card"
									title={`Unduh ${att.name}`}
								>
									<div class="attachment-card-icon">
										<span class="att-file-ext {getFileBadgeClass(att.name)}">{getFileExt(att.name)}</span>
									</div>
									<div class="attachment-card-info min-w-0">
										<div class="attachment-card-title truncate">{att.name}</div>
										<div class="attachment-card-meta">{formatFileSize(att.size)} &bull; Berkas Lampiran</div>
									</div>
									<div class="attachment-card-action">
										<span>Unduh</span>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
											<polyline points="7 10 12 15 17 10" />
											<line x1="12" y1="15" x2="12" y2="3" />
										</svg>
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/if}

			</div>
		</main>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     3. STICKY READER BOTTOM ACTION BAR
	     ══════════════════════════════════════════════════════════ -->
	<footer class="course-bottom-bar {isSlidebarOpen ? 'course-bottom-bar--sidebar-open' : ''}">
		<!-- Left Slot: Previous Module Button or Placeholder -->
		<div class="bottom-bar-side-slot left-slot">
			{#if data.prevMateri}
				<a
					href={`/siswa/materi/${data.prevMateri.id}`}
					class="bottom-bar-nav-btn prev-btn"
					title={`Modul Sebelumnya: ${data.prevMateri.title}`}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<div class="nav-btn-text min-w-0 hidden sm:flex flex-col text-left">
						<span class="nav-btn-label">Modul Sebelumnya</span>
						<span class="nav-btn-title truncate">{data.prevMateri.title}</span>
					</div>
					<span class="sm:hidden text-xs font-semibold truncate">Sebelumnya</span>
				</a>
			{:else}
				<div class="bottom-bar-placeholder"></div>
			{/if}
		</div>

		<!-- Center Slot: Menu & Syllabus Toggle -->
		<div class="bottom-bar-center-slot">
			<button
				type="button"
				onclick={() => (isSlidebarOpen = !isSlidebarOpen)}
				class="bottom-bar-menu-btn {isSlidebarOpen ? 'bottom-bar-menu-btn--active' : ''}"
				title={isSlidebarOpen ? 'Tutup Menu' : 'Buka Silabus, Daftar Isi & Tampilan'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0">
					{#if isSlidebarOpen}
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					{:else}
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="18" x2="21" y2="18" />
					{/if}
				</svg>
				<span class="menu-btn-label">{isSlidebarOpen ? 'Tutup' : 'Silabus & Menu'}</span>
			</button>
		</div>

		<!-- Right Slot: Next Module Button or Placeholder -->
		<div class="bottom-bar-side-slot right-slot">
			{#if data.nextMateri}
				<a
					href={`/siswa/materi/${data.nextMateri.id}`}
					class="bottom-bar-nav-btn next-btn"
					title={`Modul Selanjutnya: ${data.nextMateri.title}`}
				>
					<div class="nav-btn-text min-w-0 hidden sm:flex flex-col text-right">
						<span class="nav-btn-label">Modul Selanjutnya</span>
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
	     Zero backdrop blur, soft translucent dim
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

				<!-- Slidebar Body Content -->
				<div class="drawer-body">
					{#if activeSlidebarTab === 'syllabus'}
						<!-- Mobile Syllabus Tree -->
						<div class="syllabus-tree-container">
							{#each data.syllabus as p, pIdx (p.id)}
								{@const isOpen = !!openPhases[p.id]}
								<div class="phase-group">
									<button
										type="button"
										onclick={() => togglePhaseAccordion(p.id)}
										class="phase-group-header"
									>
										<div class="flex items-center gap-2 min-w-0">
											<span class="badge badge-grade text-[9.5px] h-[22px] px-1.5">FASE {pIdx + 1}</span>
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
																href={`/siswa/materi/${m.id}`}
																onclick={() => (isSlidebarOpen = false)}
																class="materi-tree-link {isCurrent ? 'materi-tree-link--active' : ''}"
															>
																<div class="materi-tree-icon">
																	{#if m.isCompleted}
																		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3">
																			<polyline points="20 6 9 17 4 12" />
																		</svg>
																	{:else if isCurrent}
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
							<nav class="mobile-toc-list space-y-1">
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
						<div class="mobile-settings-stack">
							<!-- Ukuran Font -->
							<div class="mobile-ctrl-card">
								<span class="mobile-ctrl-label">Ukuran Teks</span>
								<div class="pill-group w-full">
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
							<div class="mobile-ctrl-card">
								<span class="mobile-ctrl-label">Tema Warna Baca</span>
								<div class="pill-group w-full">
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
							<div class="mobile-ctrl-card">
								<span class="mobile-ctrl-label">Gaya Font</span>
								<div class="pill-group w-full">
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
     IMAGE LIGHTBOX ZOOM MODAL
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

		<!-- Zoomable Image Container -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="lightbox-stage" onclick={(e) => e.stopPropagation()}>
			<img
				src={lightboxImg.src}
				alt={lightboxImg.alt}
				class="lightbox-img"
				style="transform: scale({lightboxScale});"
			/>
			{#if lightboxImg.alt || lightboxImg.title}
				<div class="lightbox-caption">
					{lightboxImg.alt || lightboxImg.title}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ══════════════════════════════════════════════════════════
	   DICODING-STYLE FULL ISOLATION OVERRIDES (SCOPED TO FOCUS MODE)
	   Hides app-topbar, app-sidebar, and app-bottom-nav ONLY while reading materi
	   ══════════════════════════════════════════════════════════ */
	:global(body.focus-mode-active .app-topbar),
	:global(body.focus-mode-active .app-sidebar),
	:global(body.focus-mode-active .app-bottom-nav),
	:global(body.focus-mode-active .mobile-bottom-nav) {
		display: none !important;
	}

	:global(body.focus-mode-active .app-content),
	:global(body.focus-mode-active .app-main),
	:global(body.focus-mode-active .app-main-area),
	:global(body.focus-mode-active .nlc-app-shell) {
		padding: 0 !important;
		margin: 0 !important;
		max-width: 100vw !important;
		width: 100vw !important;
		min-height: 100vh !important;
		background: transparent !important;
	}

	/* ══════════════════════════════════════════════════════════
	   THEME DEFINITIONS
	   ══════════════════════════════════════════════════════════ */
	.dedicated-course-room {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		width: 100%;
		max-width: 100vw;
		overflow-x: clip;
		box-sizing: border-box;
		background-color: var(--r-bg);
		color: var(--r-text-body);
		transition: background-color 180ms ease, color 180ms ease;
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
		--r-code-bg: #eef2ff;
		--r-code-border: #c7d2fe;
		--r-code-text: #4338ca;
		--r-quote-bg: #f8fafc;
		--r-quote-border: #6366f1;
		--r-hover-bg: #f1f5f9;
		--r-active-bg: #e0e7ff;
		--r-active-text: #4338ca;
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
	   1. DEDICATED COURSE TOPBAR
	   ══════════════════════════════════════════════════════════ */
	.course-topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 56px;
		background: var(--r-topbar-bg);
		border-bottom: 1px solid var(--r-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		gap: 12px;
		box-sizing: border-box;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.btn-back-track {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 12px;
		border-radius: 6px;
		background: var(--r-hover-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-primary);
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		transition: all 140ms ease;
	}

	.btn-back-track:hover {
		border-color: #818cf8;
		color: #4338ca;
	}

	.topbar-vsep {
		width: 1px;
		height: 20px;
		background: var(--r-border);
		flex-shrink: 0;
	}

	.course-track-name {
		font-family: var(--font-macro, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: var(--r-text-primary);
		line-height: 1.2;
	}

	.course-phase-sub {
		font-size: 11px;
		color: var(--r-text-muted);
		line-height: 1.2;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.track-progress-metric {
		flex-direction: column;
		gap: 3px;
		width: 130px;
	}

	.progress-metric-text {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		color: var(--r-text-muted);
	}

	.mini-progress-track {
		height: 4px;
		background: var(--r-border);
		border-radius: 9999px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		background: #16a34a;
		border-radius: 9999px;
		transition: width 200ms ease;
	}

	/* Topbar Completion Action Button */
	.btn-topbar-completion {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-topbar-completion--pending {
		background: #4f46e5;
		color: #ffffff;
		border: 1px solid #4338ca;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
	}

	.btn-topbar-completion--pending:hover {
		background: #4338ca;
		transform: translateY(-1px);
	}

	.btn-topbar-completion--completed {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #86efac;
	}

	.btn-topbar-completion--completed:hover {
		background: #fee2e2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	/* ══════════════════════════════════════════════════════════
	   2. MAIN WORKSPACE (DOCKED DESKTOP SIDEBAR + READING CANVAS)
	   ══════════════════════════════════════════════════════════ */
	.course-workspace {
		display: flex;
		flex: 1;
		width: 100%;
		min-height: calc(100vh - 56px);
		box-sizing: border-box;
		position: relative;
	}

	/* ══════════════════════════════════════════════════════════
	   BREAKPOINT RULES FOR DESKTOP SIDEBAR VS MOBILE SLIDER
	   ══════════════════════════════════════════════════════════ */
	@media (min-width: 1024px) {
		.desktop-course-sidebar {
			display: flex !important;
			width: 350px;
			background: var(--r-sidebar-bg);
			border-right: 1px solid var(--r-border);
			flex-direction: column;
			position: sticky;
			top: 56px;
			height: calc(100vh - 56px);
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
			background: var(--r-topbar-bg);
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

	@media (max-width: 1023px) {
		.desktop-course-sidebar {
			display: none !important;
		}

		.mobile-drawer-backdrop {
			display: flex !important;
			position: fixed;
			inset: 0;
			background: rgba(15, 23, 42, 0.16);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
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
		padding: 6px 4px;
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

	.btn-sidebar-collapse {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: transparent;
		border: 1px solid transparent;
		color: var(--r-text-muted);
		cursor: pointer;
		transition: all 140ms ease;
		flex-shrink: 0;
	}

	.btn-sidebar-collapse:hover {
		background: var(--r-sidebar-bg);
		color: var(--r-text-primary);
		border-color: var(--r-border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

	/* Main Article Reading Canvas */
	.course-main-canvas {
		flex: 1;
		min-width: 0;
		display: flex;
		justify-content: center;
		padding: 36px 24px 100px;
		box-sizing: border-box;
	}

	.reading-column-wrapper {
		width: 100%;
		max-width: 740px;
		box-sizing: border-box;
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

	.meta-item--completed {
		color: #16a34a;
		font-weight: 600;
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

	.font-sans-preview { font-family: var(--font-body, sans-serif) !important; font-weight: 700; }
	.font-serif-preview { font-family: Georgia, serif !important; font-weight: 700; }

	/* Article Typography */
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

	.prose-reading :global(figcaption) {
		font-size: 0.85em;
		color: var(--r-text-muted);
		margin-top: 6px;
		font-style: italic;
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

	/* PRO CODE BLOCK BOX */
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

	.prose-reading :global(.tiptap-attachment-btn) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		margin: 2px 4px;
		background: var(--r-code-bg);
		border: 1px solid var(--r-code-border);
		border-radius: 9999px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--r-code-text);
		text-decoration: none;
		vertical-align: middle;
		transition: all 140ms ease;
	}

	/* ══════════════════════════════════════════════════════════
	   DEDICATED MATERIAL ATTACHMENTS & RESOURCES SECTION
	   Fully responsive to Theme (Light, Sepia, Dark)
	   ══════════════════════════════════════════════════════════ */
	.materi-attachments-section {
		margin-top: 48px;
		padding: 20px;
		border-radius: 14px;
		background: var(--r-card-bg);
		border: 1px solid var(--r-border);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		transition: background-color 180ms ease, border-color 180ms ease;
	}

	.attachments-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--r-border);
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
		border-color: var(--r-code-border);
		background: var(--r-hover-bg);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.attachment-card--slide {
		background: var(--r-code-bg);
		border-color: var(--r-code-border);
	}

	.attachment-card--slide:hover {
		border-color: var(--r-active-text);
		background: var(--r-active-bg);
	}

	.attachment-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.attachment-card-icon--ppt {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--r-active-bg);
		color: var(--r-active-text);
		border: 1px solid var(--r-code-border);
	}

	.attachment-card-info {
		flex: 1;
		min-width: 0;
	}

	.attachment-card-title {
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: var(--r-text-primary);
		line-height: 1.3;
	}

	.attachment-card-meta {
		font-size: 10.5px;
		color: var(--r-text-muted);
		margin-top: 1px;
	}

	.attachment-card-action {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 6px;
		background: var(--r-active-bg);
		color: var(--r-active-text);
		border: 1px solid var(--r-code-border);
		font-family: var(--font-macro, sans-serif);
		font-size: 10.5px;
		font-weight: 700;
		flex-shrink: 0;
		transition: all 140ms ease;
	}

	.attachment-card:hover .attachment-card-action {
		background: var(--r-code-border);
		color: var(--r-text-primary);
	}

	.att-file-ext {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 800;
		padding: 3px 6px;
		border-radius: 6px;
		border: 1px solid var(--r-code-border);
		background: var(--r-code-bg);
		color: var(--r-code-text);
		text-transform: uppercase;
		flex-shrink: 0;
	}

	/* ══════════════════════════════════════════════════════════
	   3. STICKY READER BOTTOM ACTION BAR
	   ══════════════════════════════════════════════════════════ */
	.course-bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		width: auto;
		max-width: 100vw;
		z-index: 90;
		height: 56px;
		background: var(--r-topbar-bg);
		border-top: 1px solid var(--r-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px calc(0px + env(safe-area-inset-bottom, 0px));
		gap: 12px;
		box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
		box-sizing: border-box;
		overflow: hidden;
		transition: left 180ms ease, width 180ms ease;
	}

	@media (min-width: 1024px) {
		.course-bottom-bar--sidebar-open {
			left: 350px !important;
			width: calc(100vw - 350px) !important;
		}
	}

	.bottom-bar-side-slot {
		flex: 1 1 0px;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	.left-slot {
		justify-content: flex-start;
	}

	.right-slot {
		justify-content: flex-end;
	}

	.bottom-bar-center-slot {
		flex-shrink: 0;
		display: flex;
		justify-content: center;
	}

	.bottom-bar-placeholder {
		width: 100%;
		height: 1px;
	}

	.bottom-bar-nav-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 14px;
		border-radius: 8px;
		background: var(--r-card-bg);
		border: 1px solid var(--r-border);
		color: var(--r-text-primary);
		text-decoration: none;
		max-width: 260px;
		width: auto;
		min-width: 0;
		flex-shrink: 1;
		box-sizing: border-box;
		transition: all 140ms ease;
	}

	.bottom-bar-nav-btn:hover {
		border-color: #818cf8;
		color: #4338ca;
		background: var(--r-hover-bg);
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* Settings Pills */
	.setting-label {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--r-text-primary);
	}

	.pill-group {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.pill-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 5px 8px;
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
		padding: 5px 8px;
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

	/* ToC Headings List (Vertical Guide Rail & Active Indicator) */
	.toc-container {
		padding: 12px;
	}

	.toc-nav-list {
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

	.drawer-handle-bar {
		width: 36px;
		height: 4px;
		background: #cbd5e1;
		border-radius: 9999px;
		margin: 0 auto 12px;
	}

	.drawer-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
		border-bottom: 1px solid var(--r-border);
		padding-bottom: 10px;
	}

	.drawer-tab-switch {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--r-border-subtle);
		padding: 3px;
		border-radius: 8px;
		border: 1px solid var(--r-border);
	}

	.drawer-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 11px;
		font-weight: 700;
		background: transparent;
		border: none;
		color: var(--r-text-muted);
		cursor: pointer;
	}

	.drawer-tab-btn--active {
		background: var(--r-sidebar-bg);
		color: #4f46e5;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.btn-drawer-close {
		font-family: var(--font-macro, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: var(--r-text-muted);
		background: transparent;
		border: none;
		padding: 6px 10px;
		cursor: pointer;
	}

	.drawer-body {
		overflow-y: auto;
		flex: 1;
	}

	.mobile-settings-stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mobile-ctrl-card {
		background: var(--r-border-subtle);
		border: 1px solid var(--r-border);
		border-radius: 10px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mobile-ctrl-label {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--r-text-primary);
	}

	/* ══════════════════════════════════════════════════════════
	   IMAGE LIGHTBOX MODAL
	   ══════════════════════════════════════════════════════════ */
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 15, 29, 0.94);
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
		box-sizing: border-box;
	}

	.lightbox-toolbar {
		position: fixed;
		top: 20px;
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(30, 41, 59, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		padding: 6px 12px;
		z-index: 10001;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}

	.btn-lb-tool {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: #f8fafc;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 140ms ease;
	}

	.btn-lb-tool:hover { background: rgba(255, 255, 255, 0.2); }
	.btn-lb-percent { width: auto; padding: 0 8px; border-radius: 6px; font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 700; }
	.lb-sep { width: 1px; height: 18px; background: rgba(255, 255, 255, 0.2); margin: 0 4px; }
	.btn-lb-close { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
	.btn-lb-close:hover { background: rgba(239, 68, 68, 0.8); color: #ffffff; }

	.lightbox-stage {
		max-width: 92vw;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: auto;
	}

	.lightbox-img {
		max-width: 90vw;
		max-height: 75vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
		transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.lightbox-caption {
		color: #cbd5e1;
		font-size: 12px;
		margin-top: 12px;
		text-align: center;
		max-width: 600px;
		font-style: italic;
	}

	/* Responsive Tweaks */
	@media (max-width: 640px) {
		.btn-back-label { display: none; }
		.course-main-canvas { padding: 20px 14px 100px; }
		.materi-attachments-section { margin-top: 32px; padding: 14px; }
		.attachments-grid { grid-template-columns: 1fr; }
		.attachment-card { width: 100%; padding: 8px 10px; }
		.course-bottom-bar { padding: 0 8px calc(0px + env(safe-area-inset-bottom, 0px)); gap: 6px; }
		.bottom-bar-nav-btn { padding: 0 8px; height: 36px; max-width: 100%; }
		.bottom-bar-menu-btn { height: 36px; padding: 0 10px; font-size: 11px; }
		.menu-btn-label { font-size: 11px; }
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let userDashboardPath = $derived(
		data.user ? `/${data.user.role}` : '/login'
	);
	let portalBtnLabel = $derived(
		data.user ? 'Buka Dashboard' : 'Masuk ke Portal'
	);

	const features = [
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
			title: 'Alur Belajar Terstruktur',
			desc: 'Materi disusun bertahap per fase dan topik. Kamu bisa belajar santai sesuai ritme sendiri kapan pun dan di mana pun.',
			color: '#4f46e5',
			bg: '#e0e7ff'
		},
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
			title: 'Presensi Scan QR Praktis',
			desc: 'Waktu kumpul sesi meetup atau workshop bareng komunitas, tinggal scan QR dari HP buat catat kehadiran.',
			color: '#0d9488',
			bg: '#ccfbf1'
		},
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
			title: 'Kuis & Uji Pemahaman',
			desc: 'Cek pemahamanmu lewat kuis latihan santai dengan pembahasan topik dan hadiah poin XP.',
			color: '#16a34a',
			bg: '#dcfce7'
		},
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
			title: 'Poin XP, Streak, & Badge',
			desc: 'Kumpulin XP dari keaktifan belajar, jaga streak harianmu, dan raih badge apresiasi bersama teman-teman.',
			color: '#d97706',
			bg: '#fef3c7'
		},
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
			title: 'Pantau Progress Bareng',
			desc: 'Visualisasi progres yang jelas bikin kamu selalu tahu sejauh mana perkembangan belajar dan topik berikutnya.',
			color: '#2563eb',
			bg: '#dbeafe'
		},
		{
			icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
			title: 'Modul & Video Pilihan',
			desc: 'Dapatkan akses langsung ke lampiran materi, modul praktis, dan video referensi pilihan.',
			color: '#8b5cf6',
			bg: '#ede9fe'
		}
	];

	// ── Interactive Ambient Mouse Spotlight (Landing Page Only) ──
	let spotlightEl: HTMLDivElement | undefined = $state();

	// ── Interactive Scroll Reveal Action ──
	function scrollReveal(node: HTMLElement, options: { delay?: number; threshold?: number } = {}) {
		const { delay = 0, threshold = 0.15 } = options;
		node.classList.add('reveal-item');
		if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);

		const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
		const rootMargin = isMobile ? '0px 0px -50px 0px' : '0px 0px -100px 0px';

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						node.classList.add('is-revealed');
					} else {
						node.classList.remove('is-revealed');
					}
				}
			},
			{ threshold, rootMargin }
		);

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	// ── Interactive Dancing Cat Click Effect (Landing Page Only) ──
	interface CatClick {
		id: number;
		x: number;
		y: number;
	}
	let catClicks = $state<CatClick[]>([]);
	let catClickCounter = 0;

	function handlePointerDown(e: PointerEvent) {
		const id = ++catClickCounter;
		catClicks = [...catClicks, { id, x: e.clientX, y: e.clientY }];
		setTimeout(() => {
			catClicks = catClicks.filter((c) => c.id !== id);
		}, 1200);
	}

	onMount(() => {
		window.addEventListener('pointerdown', handlePointerDown, { passive: true });

		const isTouch = window.matchMedia('(pointer: coarse)').matches;
		if (!isTouch && spotlightEl) {
			let currentX = window.innerWidth / 2;
			let currentY = window.innerHeight / 3;
			let targetX = currentX;
			let targetY = currentY;

			const handleMouseMove = (e: MouseEvent) => {
				targetX = e.clientX;
				targetY = e.clientY;
				if (spotlightEl) {
					spotlightEl.style.opacity = '1';
				}
			};

			const handleMouseLeave = () => {
				if (spotlightEl) {
					spotlightEl.style.opacity = '0';
				}
			};

			window.addEventListener('mousemove', handleMouseMove, { passive: true });
			document.addEventListener('mouseleave', handleMouseLeave);

			let animId: number;
			const loop = () => {
				currentX += (targetX - currentX) * 0.1;
				currentY += (targetY - currentY) * 0.1;
				if (spotlightEl) {
					spotlightEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
				}
				animId = requestAnimationFrame(loop);
			};
			animId = requestAnimationFrame(loop);

			return () => {
				window.removeEventListener('pointerdown', handlePointerDown);
				window.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseleave', handleMouseLeave);
				cancelAnimationFrame(animId);
			};
		}

		return () => {
			window.removeEventListener('pointerdown', handlePointerDown);
		};
	});
</script>

<svelte:head>
	<title>Nesaga Learning Community — Komunitas Belajar Bersama</title>
	<meta name="description" content="Platform komunitas santai buat kumpul, belajar bareng, eksplorasi materi praktis, dan kumpulin poin XP bareng teman." />
</svelte:head>

<!-- Interactive Dancing Cat Click Effect (Landing Page Only) -->
<div class="cat-click-container" aria-hidden="true">
	{#each catClicks as cat (cat.id)}
		<div
			class="cat-click-item"
			style="left: {cat.x}px; top: {cat.y}px;"
		>
			<img
				src="/assets/dancing-cat.webp"
				alt=""
				class="cat-click-img"
				width="60"
				height="60"
			/>
		</div>
	{/each}
</div>

<!-- Interactive Ambient Spotlight (Fixed Background Mesh - Landing Page Only) -->
<div
	bind:this={spotlightEl}
	class="ambient-cursor-spotlight"
	aria-hidden="true"
></div>

<!-- ══ HERO ══ -->
<section class="hero">
	<!-- Dynamic Ambient Animated Glow Background -->
	<div class="hero-bg-glow hero-bg-glow--primary"></div>
	<div class="hero-bg-glow hero-bg-glow--secondary"></div>
	<div class="hero-bg-glow hero-bg-glow--tertiary"></div>

	<div class="hero-inner page-container">
		<!-- Hero Badge -->
		<div class="hero-badge animate-fade-in-1">
			<span class="badge badge-primary">
				<span class="badge-dot"></span>
				Komunitas Belajar
			</span>
			<a
				href="https://smknesaga.sch.id"
				target="_blank"
				rel="noopener noreferrer"
				class="badge badge-neutral badge-link"
				title="Kunjungi Website Resmi SMK Negeri 1 Gantiwarno"
			>
				<span>SMK Negeri 1 Gantiwarno</span>
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="badge-link-icon">
					<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
					<polyline points="15 3 21 3 21 9"/>
					<line x1="10" y1="14" x2="21" y2="3"/>
				</svg>
			</a>
		</div>

		<!-- Main Hero Headline -->
		<h1 class="hero-title animate-fade-in-2">
			<span class="hero-title-prefix">Platform Komunitas</span><br />
			<span class="hero-title-gradient">Nesaga Learning<br class="hero-break-mobile" /> Community</span>
		</h1>

		<!-- Natural & Welcoming Subtitle -->
		<p class="hero-subtitle animate-fade-in-3">
			Ruang santai buat eksplorasi materi step-by-step, belajar bareng teman, dan kumpulin poin XP keaktifan bersama komunitas.
		</p>

		<!-- Hero CTA Buttons -->
		<div class="hero-cta-row animate-fade-in-4">
			<a href={userDashboardPath} class="btn-primary-gradient hero-cta-btn hero-cta-primary">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
					<polyline points="10 17 15 12 10 7"/>
					<line x1="15" y1="12" x2="3" y2="12"/>
				</svg>
				<span>{portalBtnLabel}</span>
			</a>
			<a href="/materi" class="hero-cta-btn hero-cta-secondary">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
				</svg>
				<span>Jelajahi Materi</span>
			</a>
		</div>

		<!-- Quick Metric Strip -->
		<div class="hero-metrics-strip animate-fade-in-4">
			<div class="metric-pill">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
				<span>100% Terbuka & Gratis</span>
			</div>
			<div class="metric-pill-sep">•</div>
			<div class="metric-pill">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
				<span>Modul Belajar Praktis</span>
			</div>
			<div class="metric-pill-sep">•</div>
			<div class="metric-pill">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				<span>Belajar Bareng Komunitas</span>
			</div>
		</div>
	</div>
</section>

<!-- ══ FEATURE HIGHLIGHTS ══ -->
<section class="features-section">
	<div class="page-container">
		<div class="section-header-text" use:scrollReveal={{ delay: 0 }}>
			<h2 class="section-title">Apa Aja yang Bisa Kamu Temuin?</h2>
			<p class="section-sub">Semua fitur dibuat simpel dan mudah dipakai buat nemenin proses belajarmu</p>
		</div>

		<div class="features-grid">
			{#each features as feat, idx}
				<div
					class="feature-card panel"
					use:scrollReveal={{ delay: idx * 110 }}
				>
					<div class="feature-icon" style="background: {feat.bg}; color: {feat.color}">
						{@html feat.icon}
					</div>
					<div class="feature-card-content">
						<h3 class="feature-title">{feat.title}</h3>
						<p class="feature-desc">{feat.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ══ CTA BOTTOM ══ -->
<section class="cta-section">
	<div class="page-container">
		<div class="cta-card panel" use:scrollReveal={{ delay: 60 }}>
			<div class="cta-card-glow-halo"></div>
			<div class="cta-icon-badge">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<h2 class="cta-title">Siap Belajar & Berkembang Bersama?</h2>
			<p class="cta-sub">
				{#if data.user}
					Kamu sudah masuk sebagai <strong>{data.user.role.toUpperCase()}</strong>. Yuk buka dashboard dan lanjutin belajarmu!
				{:else}
					Langsung baca modul materi yang tersedia atau masuk ke portal buat mulai catat progres belajarmu.
				{/if}
			</p>
			<div class="cta-btn-row">
				<a href={userDashboardPath} class="btn-primary-gradient cta-main-btn">
					{portalBtnLabel}
				</a>
				<a href="/docs" class="btn-ghost cta-sub-btn">
					Panduan Komunitas
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	/* ── Keyframe Animations ── */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(22px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes floatAuraPrimary {
		0%, 100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		33% {
			transform: translate(35px, -20px) scale(1.08) rotate(4deg);
		}
		66% {
			transform: translate(-25px, 15px) scale(0.94) rotate(-3deg);
		}
	}

	@keyframes floatAuraSecondary {
		0%, 100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		33% {
			transform: translate(-30px, 25px) scale(1.1) rotate(-6deg);
		}
		66% {
			transform: translate(20px, -15px) scale(0.92) rotate(4deg);
		}
	}

	@keyframes floatAuraTertiary {
		0%, 100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		33% {
			transform: translate(25px, 20px) scale(1.06) rotate(5deg);
		}
		66% {
			transform: translate(-30px, -20px) scale(0.95) rotate(-4deg);
		}
	}

	/* ── Interactive Dancing Cat Click Effect ── */
	.cat-click-container {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 99999;
		overflow: hidden;
	}

	.cat-click-item {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		animation: catClickPop 1.15s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
		will-change: transform, opacity;
	}

	.cat-click-img {
		width: 58px;
		height: 58px;
		object-fit: contain;
		display: block;
		filter: drop-shadow(0 4px 12px rgba(79, 70, 229, 0.28));
		pointer-events: none;
	}

	@keyframes catClickPop {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.3) rotate(-8deg);
		}
		18% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.18) rotate(4deg);
		}
		35% {
			transform: translate(-50%, -50%) scale(1) rotate(0deg);
		}
		72% {
			opacity: 1;
			transform: translate(-50%, calc(-50% - 22px)) scale(0.98);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, calc(-50% - 46px)) scale(0.65);
		}
	}

	@keyframes pulseDot {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.45;
			transform: scale(1.35);
		}
	}

	/* ── Interactive Cursor Radiant Ambient Spotlight ── */
	.ambient-cursor-spotlight {
		position: fixed;
		top: 0;
		left: 0;
		width: 380px;
		height: 380px;
		margin-left: -190px;
		margin-top: -190px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(99, 102, 241, 0.22) 0%,
			rgba(6, 182, 212, 0.15) 35%,
			rgba(139, 92, 246, 0.06) 60%,
			transparent 75%
		);
		filter: blur(32px);
		pointer-events: none;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
		will-change: transform;
	}

	.animate-fade-in-1 { animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: 0.05s; }
	.animate-fade-in-2 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: 0.12s; }
	.animate-fade-in-3 { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: 0.2s; }
	.animate-fade-in-4 { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: 0.28s; }

	/* ── Hero ── */
	.hero {
		position: relative;
		overflow: hidden;
		padding: 70px 0 50px;
	}

	.hero-bg-glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(55px);
		pointer-events: none;
		z-index: 0;
		will-change: transform;
	}

	.hero-bg-glow--primary {
		top: -6%;
		left: 24%;
		width: 540px;
		height: 440px;
		background: radial-gradient(circle, rgba(79, 70, 229, 0.20) 0%, rgba(99, 102, 241, 0.08) 45%, transparent 75%);
		animation: floatAuraPrimary 11s ease-in-out infinite;
	}

	.hero-bg-glow--secondary {
		top: 16%;
		right: 18%;
		left: auto;
		width: 480px;
		height: 400px;
		background: radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(13, 148, 136, 0.07) 45%, transparent 75%);
		animation: floatAuraSecondary 13s ease-in-out infinite;
	}

	.hero-bg-glow--tertiary {
		bottom: 5%;
		left: 36%;
		width: 440px;
		height: 360px;
		background: radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, rgba(168, 85, 247, 0.05) 45%, transparent 75%);
		animation: floatAuraTertiary 15s ease-in-out infinite;
	}

	.hero-inner {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding-top: 0;
		padding-bottom: 0;
		z-index: 1;
	}

	.hero-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-bottom: 22px;
		flex-wrap: wrap;
	}

	.badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		display: inline-block;
		animation: pulseDot 2s infinite ease-in-out;
	}

	.badge-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		text-decoration: none;
		cursor: pointer;
		transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.badge-link:hover {
		border-color: #818cf8;
		color: #4f46e5;
		background: #f8fafc;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.12);
	}

	.badge-link-icon {
		opacity: 0.6;
		transition: opacity 180ms ease, transform 180ms ease;
	}

	.badge-link:hover .badge-link-icon {
		opacity: 1;
		transform: translate(1px, -1px);
	}

	.hero-title {
		font-family: var(--font-macro);
		font-size: clamp(2.3rem, 5.5vw, 3.8rem);
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.035em;
		color: var(--text-primary);
		margin: 0 0 18px 0;
	}

	.hero-title-prefix {
		display: inline-block;
		font-size: 0.8em;
		font-weight: 700;
		color: #475569;
		letter-spacing: -0.02em;
		line-height: 1.25;
		margin-bottom: 2px;
	}

	.hero-break-mobile {
		display: none;
	}

	/* ── Scroll Reveal Dynamics ── */
	:global(.reveal-item) {
		opacity: 0;
		transform: translateY(42px) scale(0.96);
		transition:
			opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1),
			transform 0.85s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.25s ease,
			border-color 0.25s ease;
		transition-delay: var(--reveal-delay, 0ms);
		will-change: opacity, transform;
	}

	:global(.reveal-item.is-revealed) {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	:global(.feature-card.is-revealed:hover) {
		transform: translateY(-5px) scale(1.015);
		transition-delay: 0ms;
	}

	.hero-title-gradient {
		display: inline-block;
		background: linear-gradient(
			135deg,
			#4338ca 0%,
			#06b6d4 25%,
			#7c3aed 50%,
			#0d9488 75%,
			#4338ca 100%
		);
		background-size: 300% 300%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
		padding-bottom: 0.15em;
		margin-bottom: -0.15em;
		animation: smoothGradientFlow 8s ease-in-out infinite alternate;
	}

	@keyframes smoothGradientFlow {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	.hero-subtitle {
		font-family: var(--font-body);
		font-size: clamp(14.5px, 2vw, 17px);
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto 28px;
		line-height: 1.65;
	}

	.hero-cta-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 32px;
	}

	.hero-cta-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 48px;
		padding: 0 26px;
		font-family: var(--font-macro, sans-serif);
		font-size: 14px;
		font-weight: 700;
		border-radius: 12px;
		text-decoration: none;
		white-space: nowrap;
		box-sizing: border-box;
		transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero-cta-primary {
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
	}

	.hero-cta-primary:hover {
		transform: translateY(-3px) scale(1.02);
		box-shadow: 0 8px 24px rgba(79, 70, 229, 0.45);
	}

	.hero-cta-secondary {
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
		color: var(--text-primary);
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
	}

	.hero-cta-secondary:hover {
		border-color: #818cf8;
		color: #4f46e5;
		background: #f8fafc;
		transform: translateY(-3px) scale(1.02);
		box-shadow: 0 8px 20px rgba(79, 70, 229, 0.15);
	}

	.hero-metrics-strip {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 8px 16px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.75);
		border: 1px solid var(--border-soft);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-secondary);
		box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
	}

	.metric-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.metric-pill-sep {
		color: var(--border-hard);
		user-select: none;
	}

	/* ── Features ── */
	.features-section {
		padding: 24px 0 8px;
		position: relative;
		z-index: 1;
	}

	.section-header-text {
		text-align: center;
		margin-bottom: 32px;
	}

	.section-title {
		font-family: var(--font-macro);
		font-size: clamp(1.35rem, 3vw, 1.85rem);
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 8px;
		letter-spacing: -0.02em;
	}

	.section-sub {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-muted);
		max-width: 540px;
		margin: 0 auto;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}

	.feature-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-radius: 16px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		position: relative;
		overflow: hidden;
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
	}

	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, transparent, rgba(79, 70, 229, 0.45), transparent);
		opacity: 0;
		transition: opacity 220ms ease;
	}

	.feature-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 16px 36px -8px rgba(79, 70, 229, 0.12);
		border-color: #c7d2fe;
	}

	.feature-card:hover::before {
		opacity: 1;
	}

	.feature-icon {
		width: 46px;
		height: 46px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.feature-card:hover .feature-icon {
		transform: scale(1.1) rotate(3deg);
	}

	.feature-title {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		margin: 0;
	}

	.feature-desc {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.feature-card-content {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	/* ── CTA Bottom ── */
	.cta-section {
		padding: 8px 0 48px;
		position: relative;
		z-index: 1;
	}

	.cta-card {
		padding: 48px 36px;
		text-align: center;
		background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(13, 148, 136, 0.04) 100%), #ffffff;
		border: 1.5px solid #e0e7ff;
		border-radius: 20px;
		position: relative;
		overflow: hidden;
		isolation: isolate;
	}

	.cta-card-glow-halo {
		position: absolute;
		inset: -2px;
		border-radius: inherit;
		background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15));
		filter: blur(18px);
		z-index: -1;
		opacity: 0.7;
		animation: floatAura 9s ease-in-out infinite alternate;
		pointer-events: none;
	}

	.cta-icon-badge {
		width: 46px;
		height: 46px;
		border-radius: 13px;
		background: #e0e7ff;
		color: #4f46e5;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
		transition: transform 250ms ease;
	}

	.cta-card:hover .cta-icon-badge {
		transform: scale(1.1) rotate(-4deg);
	}

	.cta-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 10px;
		letter-spacing: -0.02em;
	}

	.cta-sub {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 520px;
		margin: 0 auto 28px;
		line-height: 1.6;
	}

	.cta-btn-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.cta-main-btn {
		font-size: 13.5px;
		font-weight: 700;
		padding: 11px 24px;
		border-radius: 10px;
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.cta-main-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
	}

	.cta-sub-btn {
		font-size: 13.5px;
		font-weight: 600;
		padding: 10px 20px;
		color: var(--text-secondary);
		transition: all 180ms ease;
	}

	.cta-sub-btn:hover {
		background: #f1f5f9;
		color: var(--text-primary);
		transform: translateY(-2px);
	}

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.features-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 14px;
		}
	}

	@media (max-width: 640px) {
		.ambient-cursor-spotlight {
			display: none;
		}

		.hero {
			min-height: calc(100svh - 58px);
			min-height: calc(100dvh - 58px);
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 24px 0 36px;
			box-sizing: border-box;
		}

		.features-section {
			padding: 44px 0 16px;
		}

		.hero-bg-glow {
			filter: blur(35px);
		}

		.hero-bg-glow--primary {
			width: 270px;
			height: 230px;
			left: 5%;
			top: -4%;
		}

		.hero-bg-glow--secondary {
			width: 240px;
			height: 210px;
			right: 5%;
			top: 25%;
		}

		.hero-bg-glow--tertiary {
			width: 220px;
			height: 190px;
			left: 20%;
			bottom: 8%;
		}

		.hero-inner {
			padding-left: 16px;
			padding-right: 16px;
		}

		.hero-badge {
			margin-bottom: 14px;
			gap: 6px;
		}

		.hero-break-mobile {
			display: block;
		}

		.hero-title {
			font-size: clamp(2.15rem, 9.2vw, 2.85rem);
			line-height: 1.15;
			letter-spacing: -0.035em;
			margin-bottom: 14px;
		}

		.hero-title-prefix {
			font-size: 0.78em;
			font-weight: 700;
			color: #475569;
			margin-bottom: 3px;
		}

		.hero-subtitle {
			font-size: 13.5px;
			line-height: 1.55;
			color: var(--text-secondary);
			max-width: 315px;
			margin: 0 auto 22px;
			padding: 0;
		}

		.hero-cta-row {
			flex-direction: row;
			align-items: center;
			justify-content: center;
			width: 100%;
			max-width: 440px;
			gap: 8px;
			margin: 0 auto 20px;
		}

		.hero-cta-btn {
			flex: 1;
			width: auto;
			min-width: 0;
			height: 42px;
			padding: 0 10px;
			font-size: 12.5px;
			font-weight: 700;
			border-radius: 10px;
			gap: 6px;
			white-space: nowrap;
		}

		.hero-cta-btn svg {
			width: 15px;
			height: 15px;
			flex-shrink: 0;
		}

		.hero-cta-btn span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.hero-cta-btn:active,
		.cta-main-btn:active,
		.cta-sub-btn:active {
			transform: scale(0.98);
		}

		.hero-metrics-strip {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 8px;
			flex-wrap: wrap;
			padding: 8px 14px;
			border-radius: 9999px;
			background: rgba(255, 255, 255, 0.9);
			border: 1px solid rgba(226, 232, 240, 0.9);
			box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
		}

		.metric-pill {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			font-size: 11px;
			font-weight: 600;
			color: #475569;
		}

		.metric-pill-sep {
			display: inline-block;
			color: #cbd5e1;
			font-size: 9px;
		}

		.features-section {
			padding: 16px 0 4px;
		}

		.section-header-text {
			margin-bottom: 18px;
			padding: 0 16px;
		}

		.section-title {
			font-size: clamp(1.25rem, 5.2vw, 1.65rem);
		}

		.section-sub {
			font-size: 13px;
		}

		.features-grid {
			display: flex;
			flex-direction: column;
			gap: 10px;
			padding: 0 16px;
		}

		.feature-card {
			display: flex;
			flex-direction: row;
			align-items: flex-start;
			gap: 14px;
			padding: 16px;
			border-radius: 16px;
			border: 1px solid #e2e8f0;
			box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
		}

		.feature-card:active {
			background: #f8fafc;
			border-color: #cbd5e1;
		}

		.feature-icon {
			width: 44px;
			height: 44px;
			border-radius: 12px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			margin-top: 2px;
		}

		.feature-card-content {
			display: flex;
			flex-direction: column;
			gap: 3px;
			flex: 1;
			min-width: 0;
		}

		.feature-title {
			font-size: 14.5px;
			font-weight: 700;
			color: #0f172a;
			line-height: 1.35;
			margin: 0;
		}

		.feature-desc {
			font-size: 12.5px;
			line-height: 1.55;
			color: #64748b;
			margin: 0;
		}

		.cta-section {
			padding: 6px 0 36px;
		}

		.cta-card {
			padding: 28px 18px;
			border-radius: 20px;
			margin: 0 16px;
			background: linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(13, 148, 136, 0.05) 100%), #ffffff;
			border: 1.5px solid #e0e7ff;
			box-shadow: 0 8px 24px -6px rgba(79, 70, 229, 0.08);
		}

		.cta-icon-badge {
			width: 44px;
			height: 44px;
			border-radius: 12px;
			margin-bottom: 10px;
		}

		.cta-title {
			font-size: clamp(1.25rem, 5.2vw, 1.65rem);
			margin-bottom: 8px;
			line-height: 1.3;
		}

		.cta-sub {
			font-size: 13px;
			line-height: 1.55;
			margin-bottom: 20px;
		}

		.cta-btn-row {
			flex-direction: row;
			align-items: center;
			justify-content: center;
			width: 100%;
			max-width: 380px;
			margin: 0 auto;
			gap: 8px;
		}

		.cta-main-btn,
		.cta-sub-btn {
			flex: 1;
			width: auto;
			min-width: 0;
			height: 42px;
			padding: 0 10px;
			border-radius: 10px;
			font-size: 12.5px;
			font-weight: 700;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-reveal {
			opacity: 1 !important;
			transform: none !important;
			transition: none !important;
		}
		.hero-bg-glow--primary,
		.hero-bg-glow--secondary,
		.hero-bg-glow--tertiary,
		.badge-dot,
		.hero-title-gradient,
		.cta-card-glow-halo {
			animation: none !important;
		}
	}
</style>

<script lang="ts">
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
</script>

<svelte:head>
	<title>Nesaga Learning Community — Komunitas Belajar Bersama</title>
	<meta name="description" content="Platform komunitas santai buat kumpul, belajar bareng, eksplorasi materi praktis, dan kumpulin poin XP bareng teman." />
</svelte:head>

<!-- ══ HERO ══ -->
<section class="hero">
	<!-- Dynamic Ambient Animated Glow Background -->
	<div class="hero-bg-glow"></div>
	<div class="hero-bg-glow hero-bg-glow--secondary"></div>

	<div class="hero-inner page-container">
		<!-- Hero Badge with Shimmer -->
		<div class="hero-badge animate-fade-in-1">
			<span class="badge badge-primary badge-shimmer">
				<span class="badge-dot"></span>
				Komunitas Belajar
			</span>
			<span class="badge badge-neutral">SMK Negeri 1 Gantiwarno</span>
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
		<div class="section-header-text">
			<h2 class="section-title">Apa Aja yang Bisa Kamu Temuin?</h2>
			<p class="section-sub">Semua fitur dibuat simpel dan mudah dipakai buat nemenin proses belajarmu</p>
		</div>

		<div class="features-grid">
			{#each features as feat, idx}
				<div
					class="feature-card panel"
					style="animation-delay: {idx * 80}ms;"
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
		<div class="cta-card panel">
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
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes floatAura {
		0%, 100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(20px, -15px) scale(1.08);
		}
	}

	@keyframes floatAuraSecondary {
		0%, 100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(-25px, 15px) scale(1.05);
		}
	}

	@keyframes pulseDot {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.3);
		}
	}

	.animate-fade-in-1 { animation: fadeInUp 0.5s ease-out backwards; animation-delay: 0.05s; }
	.animate-fade-in-2 { animation: fadeInUp 0.55s ease-out backwards; animation-delay: 0.12s; }
	.animate-fade-in-3 { animation: fadeInUp 0.6s ease-out backwards; animation-delay: 0.2s; }
	.animate-fade-in-4 { animation: fadeInUp 0.65s ease-out backwards; animation-delay: 0.28s; }

	/* ── Hero ── */
	.hero {
		position: relative;
		overflow: hidden;
		padding: 70px 0 50px;
	}

	.hero-bg-glow {
		position: absolute;
		top: -10%;
		left: 30%;
		width: 500px;
		height: 400px;
		background: radial-gradient(ellipse at center, rgba(79, 70, 229, 0.12) 0%, rgba(79, 70, 229, 0.02) 60%, transparent 80%);
		filter: blur(40px);
		pointer-events: none;
		animation: floatAura 12s ease-in-out infinite;
	}

	.hero-bg-glow--secondary {
		top: 15%;
		right: 25%;
		left: auto;
		width: 450px;
		height: 380px;
		background: radial-gradient(ellipse at center, rgba(13, 148, 136, 0.1) 0%, rgba(13, 148, 136, 0.02) 60%, transparent 80%);
		filter: blur(45px);
		animation: floatAuraSecondary 14s ease-in-out infinite;
	}

	.hero-inner {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding-top: 0;
		padding-bottom: 0;
	}

	.hero-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-bottom: 22px;
		flex-wrap: wrap;
	}

	.badge-shimmer {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		display: inline-block;
		animation: pulseDot 2s infinite ease-in-out;
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

	.hero-title-gradient {
		background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 50%, #0d9488 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
		display: inline-block;
		padding-bottom: 0.15em;
		margin-bottom: -0.15em;
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
		transition: all 180ms ease;
	}

	.hero-cta-primary {
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
	}

	.hero-cta-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
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
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.12);
	}

	.hero-metrics-strip {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 8px 16px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--border-soft);
		backdrop-filter: blur(8px);
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-secondary);
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
		border-radius: 14px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		transition: all 220ms ease;
		position: relative;
		overflow: hidden;
	}

	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, transparent, rgba(79, 70, 229, 0.4), transparent);
		opacity: 0;
		transition: opacity 220ms ease;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.08);
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
		transition: transform 220ms ease;
	}

	.feature-card:hover .feature-icon {
		transform: scale(1.08);
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
	}

	.cta-card {
		padding: 48px 36px;
		text-align: center;
		background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(13, 148, 136, 0.04) 100%);
		border: 1.5px solid #e0e7ff;
		border-radius: 18px;
		position: relative;
		overflow: hidden;
	}

	.cta-icon-badge {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: #e0e7ff;
		color: #4f46e5;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
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
		border-radius: 8px;
	}

	.cta-sub-btn {
		font-size: 13.5px;
		font-weight: 600;
		padding: 10px 20px;
		color: var(--text-secondary);
	}

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.features-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 14px;
		}
	}

	@media (max-width: 640px) {
		.hero {
			padding: 38px 0 20px;
		}

		.hero-bg-glow {
			width: 280px;
			height: 240px;
			filter: blur(30px);
			left: 10%;
			top: -5%;
		}

		.hero-bg-glow--secondary {
			width: 240px;
			height: 220px;
			filter: blur(30px);
			right: 5%;
			top: 25%;
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
			transition: all 150ms ease;
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
</style>

<script lang="ts">
	import { page } from '$app/stores';

	type Section = {
		id: string;
		label: string;
		icon: string;
		color: string;
		bg: string;
		title: string;
		subtitle: string;
		content: { heading: string; body: string }[];
	};

	const sections: Section[] = [
		{
			id: 'overview',
			label: 'Overview',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
			color: '#4f46e5', bg: '#e0e7ff',
			title: 'Mengenal Nesaga Learning Community',
			subtitle: 'Wadah belajar bersama, eksplorasi materi praktis, dan kolaborasi siswa SMK Negeri 1 Gantiwarno',
			content: [
				{
					heading: '1. Ruang Belajar Komunitas yang Inklusif',
					body: 'Nesaga Learning Community (NLC) adalah platform belajar bersama untuk siswa SMK Negeri 1 Gantiwarno. Di sini, materi dirancang bertahap dan santai agar siapa pun bisa belajar dengan nyaman sesuai ritme masing-masing.'
				},
				{
					heading: '2. Peran Pengguna di Komunitas',
					body: 'NLC menghubungkan 4 peran utama: Siswa (belajar mandiri & eksplorasi materi), Mentor (membagikan wawasan & mereview tugas), Guru Pembimbing (memantau perkembangan kelas), dan Administrator (mengelola konfigurasi sistem).'
				},
				{
					heading: '3. Fitur Utama Platform',
					body: 'Platform ini dilengkapi alur Track Pembelajaran per fase, presensi mandiri dengan scan QR saat sesi kumpul, kuis latihan pemahaman, pengumpulan tugas proyek, serta apresiasi lewat XP poin, streak keaktifan, dan badge penghargaan.'
				}
			]
		},
		{
			id: 'siswa',
			label: 'Panduan Siswa',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Belajar untuk Siswa',
			subtitle: 'Maksimalkan progres belajarmu dan raih pencapaian terbaik bersama teman',
			content: [
				{
					heading: '1. Presensi Scan QR Saat Pertemuan',
					body: 'Saat sesi tatap muka atau workshop komunitas, buka menu "Pertemuan" dari HP kamu lalu pilih "Scan QR". Arahkan kamera ke layar proyektor untuk mencatat kehadiran secara instan.'
				},
				{
					heading: '2. Membaca Track Pembelajaran',
					body: 'Di menu "Track Pembelajaran", kamu bisa memilih modul sesuai jenjang kelasmu. Pelajari topik bertahap per fase, unduh lampiran berkas praktikum, dan tonton video referensi yang disematkan.'
				},
				{
					heading: '3. Mengumpulkan Tugas Praktikum',
					body: 'Kumpulkan tugas melalui menu "Tugas". Masukkan tautan repository GitHub, link demo karya, atau unggah file proyekmu. Pantau hasil ulasan dari mentor apakah sudah disetujui atau perlu sedikit revisi.'
				},
				{
					heading: '4. Mengumpulkan XP, Menjaga Streak & Badge',
					body: 'Setiap keaktifan belajarmu menghasilkan poin XP. Hadiri pertemuan rutin untuk membangun streak harian tanpa terputus, dan raih badge pencapaian spesial untuk ditampilkan di profilmu.'
				},
				{
					heading: '5. Mengerjakan Kuis Pre-Test & Post-Test',
					body: 'Uji pemahamanmu sebelum dan sesudah mempelajari sub-fase topik tertentu. Kuis latihan ini santai, membantu mengingat poin penting materi, dan memberikan bonus tambahan poin XP.'
				}
			]
		},
		{
			id: 'mentor',
			label: 'Panduan Mentor',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			color: '#4f46e5', bg: '#e0e7ff',
			title: 'Panduan Pendampingan untuk Mentor',
			subtitle: 'Rancang kurikulum materi, kelola sesi pertemuan, dan bimbing siswa',
			content: [
				{
					heading: '1. Menyusun Track Pembelajaran',
					body: 'Di menu "Track Pembelajaran", kamu bisa membangun struktur materi bertingkat: Track → Fase → Sub-Fase → Materi. Tulis penjelasan interaktif dengan editor teks kaya, lampirkan modul lab, dan tautkan video referensi.'
				},
				{
					heading: '2. Membuka Sesi Pertemuan & QR Presensi',
					body: 'Buat agenda sesi di menu "Pertemuan". Sistem akan menghasilkan token QR dinamis yang dapat ditampilkan di proyektor agar siswa dapat melakukan presensi mandiri secara tertib.'
				},
				{
					heading: '3. Membuat Kuis Evaluasi Pemahaman',
					body: 'Tambahkan kuis pilihan ganda pada Sub-Fase terkait untuk mengukur penyerapan materi. Kamu bisa membuat soal satu per satu atau melakukan impor instan via template JSON.'
				},
				{
					heading: '4. Menilai & Memberi Umpan Balik Tugas',
					body: 'Buka menu "Penilaian Tugas" untuk mereview submisi siswa. Berikan penilaian serta catatan umpan balik yang membangun untuk membantu siswa terus berkembang.'
				},
				{
					heading: '5. Memantau Kemajuan Kelas',
					body: 'Gunakan dashboard "Progress Pembelajaran" untuk melihat ringkasan keaktifan siswa binaanmu, mengidentifikasi materi yang butuh pendalaman, dan mendampingi siswa yang tertinggal.'
				}
			]
		},
		{
			id: 'guru',
			label: 'Panduan Guru',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Supervisi untuk Guru Pembimbing',
			subtitle: 'Supervisi aktivitas kelas, kesehatan pembelajaran, dan perkembangan kompetensi siswa',
			content: [
				{
					heading: '1. Monitoring Kesehatan Kelas (Health Dashboard)',
					body: 'Pantau kondisi kelas binaan secara menyeluruh melalui metrik tingkat kehadiran, rasio ketuntasan tugas, dan keaktifan streak siswa secara real-time.'
				},
				{
					heading: '2. Memantau Ketercapaian Track Pembelajaran',
					body: 'Lihat progres penyerapan kurikulum di setiap jenjang kelas, lengkap dengan rekapitulasi ketercapaian fase belajar dan skor pemahaman kuis siswa.'
				},
				{
					heading: '3. Profil & Riwayat Portofolio Siswa',
					body: 'Akses profil individu siswa untuk melihat rekam jejak presensi, portofolio karya tugas yang telah dikerjakan, perolehan poin XP, dan koleksi badge penghargaan.'
				},
				{
					heading: '4. Catatan Pendampingan Khusus',
					body: 'Tuliskan catatan observasi atau bimbingan perkembangan pada profil siswa untuk keperluan pendampingan terarah yang dapat dilihat oleh tim pengajar.'
				},
				{
					heading: '5. Rekapitulasi & Laporan Pembelajaran',
					body: 'Unduh laporan rekapitulasi presensi dan capaian pembelajaran kelas untuk evaluasi berkala dan pelaporan akademik program ke pihak sekolah.'
				}
			]
		},
		{
			id: 'admin',
			label: 'Panduan Admin',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
			color: '#dc2626', bg: '#fee2e2',
			title: 'Panduan Manajemen untuk Administrator',
			subtitle: 'Kelola data pengguna, struktur kelas, dan pengaturan platform NLC',
			content: [
				{
					heading: '1. Manajemen Data Pengguna',
					body: 'Kelola data pengguna untuk Siswa, Mentor, Guru, dan Admin. Dukungan impor massal data siswa via file CSV/Excel dan pengelolaan reset kredensial akun.'
				},
				{
					heading: '2. Pengaturan Kelas & Roster Siswa',
					body: 'Buat kelas instance per tahun ajaran, pasangkan mentor pendamping, dan daftarkan siswa. Gunakan wizard kenaikan kelas untuk mempromosikan siswa secara otomatis di akhir periode.'
				},
				{
					heading: '3. Manajemen Periode & Tahun Ajaran',
					body: 'Atur tahun ajaran aktif dan kelola histori periode sebelumnya agar pencatatan data akademik tetap rapi dan terorganisir.'
				},
				{
					heading: '4. Konfigurasi Gamifikasi & Poin XP',
					body: 'Sesuaikan aturan perolehan poin XP untuk presensi, penyelesaian tugas, dan milestone streak, serta kelola jenis badge penghargaan yang dapat diraih siswa.'
				},
				{
					heading: '5. Audit Log & Keamanan Data',
					body: 'Pantau riwayat aktivitas operasional penting di Audit Log Stream untuk menjaga keamanan, akuntabilitas, dan integritas data seluruh platform.'
				}
			]
		}
	];

	let activeSection = $state('overview');
	let isPresentationMode = $state(false);
	let currentSlide = $state(0);

	let currentSectionData = $derived(sections.find((s) => s.id === activeSection) ?? sections[0]);

	// Flatten all sections content into slides for presentation mode
	let allSlides = $derived(
		sections.flatMap((sec) =>
			sec.content.map((c, i) => ({
				sectionLabel: sec.label,
				sectionColor: sec.color,
				sectionBg: sec.bg,
				slideIndex: i,
				heading: c.heading,
				body: c.body
			}))
		)
	);

	function enterPresentation() {
		isPresentationMode = true;
		currentSlide = 0;
		if (typeof document !== 'undefined') {
			document.documentElement.requestFullscreen?.().catch(() => {});
		}
	}

	function exitPresentation() {
		isPresentationMode = false;
		if (typeof document !== 'undefined') {
			document.exitFullscreen?.().catch(() => {});
		}
	}

	function nextSlide() {
		if (currentSlide < allSlides.length - 1) currentSlide++;
	}

	function prevSlide() {
		if (currentSlide > 0) currentSlide--;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isPresentationMode) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextSlide();
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSlide();
		if (e.key === 'Escape') exitPresentation();
	}
</script>

<svelte:head>
	<title>Dokumentasi — Nesaga Learning Community</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- ══ PRESENTATION MODE ══ -->
{#if isPresentationMode}
	{@const slide = allSlides[currentSlide]}
	<div class="presentation-overlay">
		<div class="presentation-slide">
			<div class="slide-badge" style="background:{slide.sectionBg}; color:{slide.sectionColor}">
				{slide.sectionLabel}
			</div>
			<h2 class="slide-heading">{slide.heading}</h2>
			<p class="slide-body">{slide.body}</p>
			<div class="slide-nav">
				<button type="button" class="slide-btn" onclick={prevSlide} disabled={currentSlide === 0}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
					Sebelumnya
				</button>
				<span class="slide-counter">{currentSlide + 1} / {allSlides.length}</span>
				<button type="button" class="slide-btn" onclick={nextSlide} disabled={currentSlide === allSlides.length - 1}>
					Berikutnya
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			</div>
			<button type="button" class="slide-exit" onclick={exitPresentation} title="Keluar Presentasi (Esc)">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				Keluar
			</button>
		</div>
	</div>
{/if}

<!-- ══ DOCS LAYOUT ══ -->
<div class="docs-layout">
	<!-- Sidebar nav -->
	<aside class="docs-sidebar">
		<div class="docs-sidebar-header">
			<a href="/" class="back-link">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				Beranda
			</a>
			<button type="button" class="btn-create-pill present-btn" onclick={enterPresentation}>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
				Presentasi
			</button>
		</div>
		<nav class="docs-nav">
			{#each sections as sec}
				<button
					type="button"
					class="docs-nav-item"
					class:docs-nav-item--active={activeSection === sec.id}
					style={activeSection === sec.id ? `color:${sec.color}; background:${sec.bg}; border-color:${sec.color}20` : ''}
					onclick={() => (activeSection = sec.id)}
				>
					<span class="nav-icon">{@html sec.icon}</span>
					{sec.label}
				</button>
			{/each}
		</nav>
	</aside>

	<!-- Content -->
	<main class="docs-content page-container">
		<!-- Mobile horizontal scrollable tabs -->
		<div class="docs-mobile-tabs-bar">
			<div class="docs-mobile-tabs-scroll">
				{#each sections as sec}
					<button
						type="button"
						class="mobile-tab-btn"
						class:mobile-tab-btn--active={activeSection === sec.id}
						style={activeSection === sec.id ? `color:${sec.color}; background:${sec.bg}; border-color:${sec.color}40;` : ''}
						onclick={() => (activeSection = sec.id)}
					>
						<span class="nav-icon">{@html sec.icon}</span>
						<span>{sec.label}</span>
					</button>
				{/each}
			</div>
		</div>

		{#key activeSection}
			<div class="docs-section-header panel">
				<div class="docs-section-icon" style="background:{currentSectionData.bg}; color:{currentSectionData.color}">
					{@html currentSectionData.icon}
				</div>
				<div>
					<span class="badge" style="background:{currentSectionData.bg}; color:{currentSectionData.color}; border-color:{currentSectionData.color}30">{currentSectionData.label}</span>
					<h1 class="docs-section-title">{currentSectionData.title}</h1>
					<p class="docs-section-sub">{currentSectionData.subtitle}</p>
				</div>
			</div>

			{#each currentSectionData.content as item, i}
				<div class="docs-card panel">
					<div class="docs-card-num" style="color:{currentSectionData.color}; background:{currentSectionData.bg}">
						{String(i + 1).padStart(2, '0')}
					</div>
					<h2 class="docs-card-heading">{item.heading}</h2>
					<p class="docs-card-body">{item.body}</p>
				</div>
			{/each}
		{/key}
	</main>
</div>

<style>
	/* ── Layout ── */
	.docs-layout {
		display: flex;
		min-height: calc(100vh - 60px);
		align-items: flex-start;
	}

	/* ── Sidebar ── */
	.docs-sidebar {
		width: 240px;
		flex-shrink: 0;
		position: sticky;
		top: 64px;
		max-height: calc(100vh - 64px);
		overflow-y: auto;
		background: #ffffff;
		border-right: 1px solid var(--border-hard);
		padding: 20px 12px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.docs-sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 4px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.back-link:hover { color: var(--primary); }

	.present-btn {
		height: 28px !important;
		padding: 0 10px !important;
		font-size: 11px !important;
		gap: 5px !important;
	}

	.docs-nav {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.docs-nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		background: none;
		border: 1px solid transparent;
		cursor: pointer;
		text-align: left;
		transition: all 140ms ease;
	}

	.docs-nav-item:hover:not(.docs-nav-item--active) {
		background: var(--bg-inset);
		color: var(--text-primary);
	}

	.docs-nav-item--active {
		font-weight: 700;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	/* ── Content ── */
	.docs-content {
		flex: 1;
		min-width: 0;
		padding-bottom: 48px;
	}

	.docs-section-header {
		padding: 24px;
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.docs-section-icon {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.docs-section-title {
		font-family: var(--font-macro);
		font-size: clamp(1.1rem, 2.5vw, 1.5rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin: 6px 0 4px;
	}

	.docs-section-sub {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-muted);
		margin: 0;
	}

	/* ── Doc Cards ── */
	.docs-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.docs-card-num {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.docs-card-heading {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.docs-card-body {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0;
	}

	/* ── Presentation Mode ── */
	.presentation-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: #0f172a;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px;
	}

	.presentation-slide {
		max-width: 900px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 24px;
		position: relative;
	}

	.slide-badge {
		display: inline-flex;
		align-items: center;
		height: 28px;
		padding: 0 12px;
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.slide-heading {
		font-family: var(--font-macro);
		font-size: clamp(1.8rem, 4vw, 3rem);
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.slide-body {
		font-family: var(--font-body);
		font-size: clamp(1rem, 2vw, 1.3rem);
		color: rgba(255, 255, 255, 0.75);
		line-height: 1.7;
		max-width: 720px;
		margin: 0;
	}

	.slide-nav {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 16px;
	}

	.slide-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: rgba(255,255,255,0.8);
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		cursor: pointer;
		transition: all 140ms;
	}

	.slide-btn:hover:not(:disabled) {
		background: rgba(255,255,255,0.15);
		color: #ffffff;
	}

	.slide-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	.slide-counter {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 700;
		color: rgba(255,255,255,0.5);
		min-width: 60px;
		text-align: center;
	}

	.slide-exit {
		position: absolute;
		top: -20px;
		right: 0;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: rgba(255,255,255,0.5);
		background: none;
		border: 1px solid rgba(255,255,255,0.15);
		cursor: pointer;
		transition: all 140ms;
	}

	.slide-exit:hover { color: #ffffff; border-color: rgba(255,255,255,0.4); }

	.docs-mobile-tabs-bar {
		display: none;
	}

	/* ── Responsive ── */
	@media (max-width: 768px) {
		.docs-sidebar { display: none; }
		
		.docs-mobile-tabs-bar {
			display: block;
			margin-bottom: 12px;
			overflow: hidden;
		}

		.docs-mobile-tabs-scroll {
			display: flex;
			gap: 6px;
			overflow-x: auto;
			padding: 2px 2px 8px;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}

		.docs-mobile-tabs-scroll::-webkit-scrollbar {
			display: none;
		}

		.mobile-tab-btn {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 6px 12px;
			border-radius: var(--radius-full, 9999px);
			font-family: var(--font-macro);
			font-size: 11.5px;
			font-weight: 700;
			color: var(--text-secondary);
			background: #ffffff;
			border: 1px solid var(--border-hard);
			cursor: pointer;
			white-space: nowrap;
			flex-shrink: 0;
			transition: all 130ms ease;
		}

		.docs-content.page-container {
			padding: 14px 12px calc(60px + env(safe-area-inset-bottom, 0px));
			gap: 12px;
		}

		.docs-section-header {
			padding: 16px;
			gap: 12px;
			border-radius: var(--radius-lg, 14px);
		}

		.docs-section-icon {
			width: 40px;
			height: 40px;
			border-radius: 10px;
		}

		.docs-section-title {
			font-size: clamp(1.15rem, 5vw, 1.35rem);
			margin: 4px 0 2px;
		}

		.docs-section-sub {
			font-size: 12px;
			line-height: 1.45;
		}

		.docs-card {
			padding: 16px;
			gap: 8px;
			border-radius: var(--radius-lg, 14px);
		}

		.docs-card-heading {
			font-size: 13.5px;
		}

		.docs-card-body {
			font-size: 12.5px;
			line-height: 1.6;
		}

		.presentation-overlay { padding: 20px; }
		.slide-heading { font-size: 1.5rem; }
		.slide-body { font-size: 1rem; }
	}
</style>

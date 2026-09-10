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
			subtitle: 'Wadah belajar bersama, eksplorasi materi, dan kolaborasi siswa SMK Negeri 1 Gantiwarno',
			content: [
				{
					heading: '1. Ruang Belajar Komunitas yang Inklusif',
					body: 'Nesaga Learning Community (NLC) adalah platform belajar bersama untuk siswa SMK Negeri 1 Gantiwarno. Materi dirancang bertahap agar siapa pun bisa belajar sesuai ritme masing-masing.'
				},
				{
					heading: '2. Peran Pengguna di Komunitas',
					body: 'NLC menghubungkan 4 peran: Siswa (belajar mandiri & eksplorasi materi), Mentor (sharing wawasan & review tugas), Guru Pembimbing (memantau perkembangan kelas), dan Administrator (mengelola konfigurasi sistem).'
				},
				{
					heading: '3. Fitur Utama Platform',
					body: 'Platform ini menyediakan alur Track Pembelajaran, presensi mandiri dengan scan QR saat kumpul, kuis latihan pemahaman, pengumpulan link tugas, serta sistem XP poin, streak harian, dan badge.'
				}
			]
		},
		{
			id: 'siswa',
			label: 'Panduan Siswa',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Belajar untuk Siswa',
			subtitle: 'Panduan belajar, presensi pertemuan, dan pengumpulan tugas',
			content: [
				{
					heading: '1. Presensi Scan QR Saat Pertemuan',
					body: 'Saat sesi kumpul atau tatap muka, buka menu "Pertemuan" dari HP lalu pilih "Scan QR". Arahkan kamera ke layar proyektor untuk mencatat kehadiran secara langsung.'
				},
				{
					heading: '2. Membaca Track Pembelajaran',
					body: 'Di menu "Track Pembelajaran", kamu bisa memilih modul sesuai kelasmu. Pelajari topik bertahap per fase, unduh berkas materi, dan tonton video referensi yang disematkan.'
				},
				{
					heading: '3. Mengumpulkan Tugas Praktikum',
					body: 'Kumpulkan tugas melalui menu "Tugas". Masukkan tautan repository GitHub atau link demo karyamu, lalu pantau ulasan dari mentor apakah sudah selesai atau perlu perbaikan.'
				},
				{
					heading: '4. Mengumpulkan XP, Menjaga Streak & Badge',
					body: 'Setiap keaktifan belajar menghasilkan poin XP. Hadiri pertemuan rutin untuk menjaga streak harian, dan kumpulkan badge di profilmu.'
				},
				{
					heading: '5. Mengerjakan Kuis Pre-Test & Post-Test',
					body: 'Uji pemahaman sebelum dan sesudah mempelajari topik tertentu. Kuis latihan ini membantu mengingat poin penting materi dan menambah poin XP.'
				}
			]
		},
		{
			id: 'mentor',
			label: 'Panduan Mentor',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			color: '#4f46e5', bg: '#e0e7ff',
			title: 'Panduan Pendampingan untuk Mentor',
			subtitle: 'Rancang materi belajar, kelola sesi pertemuan, dan sharing bareng teman-teman',
			content: [
				{
					heading: '1. Menyusun Track Pembelajaran',
					body: 'Di menu "Track Pembelajaran", kamu bisa menyusun materi bertingkat: Track → Fase → Sub-Fase → Materi. Tulis penjelasan materi, lampirkan berkas modul, dan tautkan video referensi.'
				},
				{
					heading: '2. Membuka Sesi Pertemuan & QR Presensi',
					body: 'Buat agenda sesi di menu "Pertemuan". Sistem akan menghasilkan kode QR dinamis yang dapat ditampilkan di proyektor untuk presensi mandiri.'
				},
				{
					heading: '3. Membuat Kuis Evaluasi Pemahaman',
					body: 'Tambahkan kuis pilihan ganda pada Sub-Fase terkait untuk mengukur pemahaman materi. Soal dapat dibuat manual atau diimpor lewat file JSON.'
				},
				{
					heading: '4. Menilai & Memberi Umpan Balik Tugas',
					body: 'Buka menu "Penilaian Tugas" untuk mereview kiriman tugas. Berikan masukan agar teman-teman semakin paham.'
				},
				{
					heading: '5. Memantau Kemajuan Belajar',
					body: 'Gunakan dashboard "Progress Pembelajaran" untuk melihat keaktifan dan kemajuan belajar teman-teman, melihat materi yang butuh dibahas bareng, dan saling bantu saat ada kendala.'
				}
			]
		},
		{
			id: 'guru',
			label: 'Panduan Guru',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Supervisi untuk Guru Pembimbing',
			subtitle: 'Pantau aktivitas komunitas, kesehatan pembelajaran kelas, dan perkembangan siswa',
			content: [
				{
					heading: '1. Monitoring Kesehatan Kelas (Health Dashboard)',
					body: 'Pantau aktivitas kelas dan komunitas melalui ringkasan kehadiran, penyelesaian tugas, dan keaktifan streak siswa.'
				},
				{
					heading: '2. Memantau Ketercapaian Track Pembelajaran',
					body: 'Lihat progres penyerapan materi di setiap jenjang kelas, rekapitulasi capaian fase belajar, dan hasil kuis pemahaman siswa.'
				},
				{
					heading: '3. Profil & Portofolio Siswa',
					body: 'Buka profil siswa untuk melihat rekam kehadiran, portofolio tugas yang telah dikerjakan, perolehan poin XP, dan badge.'
				},
				{
					heading: '4. Catatan Pendampingan',
					body: 'Tuliskan catatan observasi atau bimbingan pada profil siswa agar dapat dipantau bersama oleh guru dan mentor.'
				},
				{
					heading: '5. Rekapitulasi Data Pembelajaran',
					body: 'Unduh data rekapitulasi presensi dan capaian belajar kelas untuk evaluasi berkala serta arsip komunitas.'
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
					body: 'Kelola data pengguna untuk Siswa, Mentor, Guru, dan Admin. Mendukung impor data siswa lewat file CSV/Excel serta reset akun.'
				},
				{
					heading: '2. Pengaturan Kelas & Roster Siswa',
					body: 'Buat kelas per tahun ajaran, hubungkan mentor, dan daftarkan siswa ke dalam kelas.'
				},
				{
					heading: '3. Manajemen Periode & Tahun Ajaran',
					body: 'Atur tahun ajaran aktif dan kelola riwayat periode sebelumnya agar data tetap terorganisir.'
				},
				{
					heading: '4. Konfigurasi Gamifikasi & Poin XP',
					body: 'Sesuaikan aturan perolehan poin XP untuk presensi, tugas, dan streak, serta pengaturan badge siswa.'
				},
				{
					heading: '5. Audit Log & Keamanan Data',
					body: 'Pantau log aktivitas penting sistem di Audit Log Stream untuk menjaga integritas data platform.'
				}
			]
		}
	];

	let activeSection = $state('overview');
	let currentSectionData = $derived(sections.find((s) => s.id === activeSection) ?? sections[0]);
</script>

<svelte:head>
	<title>Dokumentasi — Nesaga Learning Community</title>
</svelte:head>

<!-- ══ DOCS LAYOUT ══ -->
<div class="docs-layout">
	<!-- Sidebar nav -->
	<aside class="docs-sidebar">
		<div class="docs-sidebar-header">
			<a href="/" class="back-link">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				Kembali ke Beranda
			</a>
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
		<div class="docs-sidebar-footer">
			<div class="docs-version-badge">
				<span class="version-dot"></span>
				<span>Dokumentasi NLC</span>
			</div>
			<span class="docs-sidebar-sub">SMK N 1 Gantiwarno</span>
		</div>
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
		min-height: calc(100vh - 58px);
		min-height: calc(100dvh - 58px);
		align-items: stretch;
		background-color: var(--bg-base);
	}

	/* ── Sidebar ── */
	.docs-sidebar {
		width: 250px;
		flex-shrink: 0;
		position: sticky;
		top: 58px;
		height: calc(100vh - 58px);
		height: calc(100dvh - 58px);
		min-height: calc(100vh - 58px);
		min-height: calc(100dvh - 58px);
		background: #ffffff;
		border-right: 1px solid var(--border-hard);
		padding: 16px 12px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		z-index: 20;
	}

	.docs-sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 4px 12px 4px;
		border-bottom: 1px solid var(--border-hard);
		margin-bottom: 12px;
		flex-shrink: 0;
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
		gap: 4px;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding-right: 2px;
	}

	.docs-sidebar-footer {
		margin-top: auto;
		flex-shrink: 0;
		padding-top: 14px;
		border-top: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-left: 6px;
	}

	.docs-version-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.version-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.docs-sidebar-sub {
		font-family: var(--font-body);
		font-size: 10.5px;
		font-weight: 500;
		color: var(--text-muted);
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
	}
</style>

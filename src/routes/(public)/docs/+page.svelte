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
			title: 'Apa itu Nesaga Learning Community?',
			subtitle: 'Platform komunitas belajar untuk SMK Negeri 1 Gantiwarno',
			content: [
				{
					heading: 'Tentang Platform',
					body: 'Nesaga Learning Community (NLC) adalah ekosistem pembelajaran digital yang dirancang untuk mendukung kegiatan belajar bersama di SMK Negeri 1 Gantiwarno. Platform ini menghubungkan siswa, mentor, dan guru pembimbing dalam satu sistem terintegrasi.'
				},
				{
					heading: 'Siapa yang Menggunakan NLC?',
					body: 'NLC digunakan oleh empat kelompok pengguna: Siswa (pelaku utama pembelajaran), Mentor (pembimbing teknis & penilai), Guru Pembimbing (supervisor & monitor kelas), dan Administrator (pengelola sistem & data master).'
				},
				{
					heading: 'Apa yang Bisa Dilakukan di NLC?',
					body: 'NLC menyediakan presensi digital berbasis QR, pelacakan progress track pembelajaran, sistem pengumpulan dan penilaian tugas, gamifikasi melalui poin & streak harian, kuis latihan mandiri, serta dashboard monitoring kelas untuk guru.'
				}
			]
		},
		{
			id: 'siswa',
			label: 'Panduan Siswa',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Penggunaan untuk Siswa',
			subtitle: 'Cara memaksimalkan pengalaman belajarmu di NLC',
			content: [
				{
					heading: '1. Presensi QR — Cara Absen Mandiri',
					body: 'Setiap sesi pertemuan, mentor akan menampilkan kode QR di layar. Buka portal NLC dari HPmu, masuk ke menu "Pertemuan", lalu tap "Scan QR Presensi". Arahkan kamera ke QR dan presensimu tercatat otomatis. Pastikan kamu scan dalam batas waktu yang ditentukan mentor.'
				},
				{
					heading: '2. Baca Materi & Track Progress',
					body: 'Di menu "Materi", kamu bisa melihat seluruh konten kurikulum berdasarkan fase pembelajaran. Setelah selesai membaca, tap "Tandai Selesai" untuk mencatat progress. Progress ini tampil di dashboard sebagai indikator kemajuan belajarmu.'
				},
				{
					heading: '3. Kumpulkan Tugas',
					body: 'Setiap tugas praktikum wajib dikumpulkan melalui menu "Tugas". Isi link repository GitHub, URL deploy/demo, atau unggah file sesuai ketentuan mentor. Kamu bisa lihat status tugas: Menunggu Penilaian, Disetujui, atau Revisi.'
				},
				{
					heading: '4. Poin, Streak & Badge',
					body: 'Setiap aktivitas menghasilkan poin XP: presensi hadir, tugas disetujui, dan milestone streak. Streak adalah jumlah sesi beruntun kamu hadir — jangan putus! Raih badge eksklusif saat mencapai milestone tertentu dan naikkan peringkat di leaderboard kelas.'
				},
				{
					heading: '5. Kerjakan Kuis Pre-Test & Post-Test',
					body: 'Sebelum dan sesudah mempelajari setiap sub-fase, ada kuis pilihan ganda untuk mengukur pemahamanmu. Kerjakan kuis dalam batas waktu yang ditentukan. Nilai kuis terintegrasi ke skor ketercapaian kurikulum milikmu.'
				}
			]
		},
		{
			id: 'mentor',
			label: 'Panduan Mentor',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			color: '#4f46e5', bg: '#e0e7ff',
			title: 'Panduan Penggunaan untuk Mentor',
			subtitle: 'Kelola kelas, kurikulum, dan penilaian siswa',
			content: [
				{
					heading: '1. Kelola Track Pembelajaran',
					body: 'Di menu "Track Pembelajaran", kamu bisa membuat dan mengelola struktur kurikulum: Track → Fase → Sub-Fase → Materi. Tulis konten materi dengan editor teks kaya (bold, kode, gambar, heading). Tambahkan lampiran file dan rekomendasi video YouTube.'
				},
				{
					heading: '2. Buat & Kelola Pertemuan',
					body: 'Setiap sesi tatap muka dibuat sebagai "Pertemuan" — isi judul, tanggal, dan deskripsi sesi. Platform akan otomatis generate QR token unik per pertemuan. Tampilkan QR di proyektor saat sesi berlangsung.'
				},
				{
					heading: '3. Buat Kuis Evaluasi',
					body: 'Di halaman detail Sub-Fase, tambahkan kuis Pre-Test atau Post-Test. Buat soal satu per satu, atau import sekaligus via file JSON. Tentukan passing score dan durasi pengerjaan.'
				},
				{
					heading: '4. Nilai Tugas Siswa',
					body: 'Di menu "Penilaian Tugas", lihat semua submisi masuk. Buka detail tugas per siswa, review link repository/deploy, lalu berikan status Disetujui atau Revisi beserta feedback terstruktur. Gunakan preset feedback cepat untuk efisiensi.'
				},
				{
					heading: '5. Monitor Progress Kelas',
					body: 'Dashboard "Progress Pembelajaran" menampilkan ringkasan kemajuan seluruh siswa di kelasmu: persentase kehadiran, penyelesaian materi, dan skor kuis. Identifikasi siswa yang butuh perhatian lebih dari sini.'
				}
			]
		},
		{
			id: 'guru',
			label: 'Panduan Guru',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
			color: '#0d9488', bg: '#ccfbf1',
			title: 'Panduan Penggunaan untuk Guru Pembimbing',
			subtitle: 'Monitor kelas dan supervisi perkembangan siswa',
			content: [
				{
					heading: '1. Dashboard Health Monitoring',
					body: 'Halaman utama menampilkan ringkasan "kesehatan" setiap kelas: indeks rata-rata kehadiran, tingkat penyelesaian tugas, dan rata-rata streak aktif. Warna indikator memudahkan identifikasi kelas yang perlu perhatian.'
				},
				{
					heading: '2. Pantau Track Pembelajaran',
					body: 'Di menu "Pantau Track Pembelajaran", lihat seberapa jauh setiap kelas telah menyelesaikan kurikulum. Data ditampilkan sebagai persentase per fase, lengkap dengan skor komposit ketercapaian yang menggabungkan kehadiran, tugas, dan nilai kuis.'
				},
				{
					heading: '3. Detail Siswa Individual',
					body: 'Klik nama siswa manapun untuk melihat riwayat lengkapnya: kronologi presensi, tugas yang sudah dikumpulkan beserta nilainya, perolehan poin dan badge, serta skor kuis per sub-fase.'
				},
				{
					heading: '4. Catatan Pendampingan',
					body: 'Setiap siswa memiliki ruang catatan khusus untuk guru. Tulis catatan pembinaan, observasi perkembangan, atau rencana tindak lanjut. Catatan ini hanya terlihat oleh guru dan mentor.'
				},
				{
					heading: '5. Rekap & Laporan',
					body: 'Generate rekap presensi bulanan atau semesteran dalam format Excel/CSV. Cetak laporan perkembangan kelas dalam format PDF siap presentasi untuk keperluan rapat atau pelaporan ke kepala sekolah.'
				}
			]
		},
		{
			id: 'admin',
			label: 'Panduan Admin',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
			color: '#dc2626', bg: '#fee2e2',
			title: 'Panduan Penggunaan untuk Administrator',
			subtitle: 'Kelola sistem, user, dan data master NLC',
			content: [
				{
					heading: '1. Manajemen User',
					body: 'Tambah, edit, nonaktifkan, atau reset password user dari menu "Manajemen User". Import siswa baru secara massal via file CSV dengan template NISN. Tentukan role (siswa/mentor/guru/admin) saat membuat user.'
				},
				{
					heading: '2. Kelola Kelas & Roster',
					body: 'Buat Kelas Instance (kombinasi tingkat, tahun ajaran, dan track kurikulum). Assign mentor ke kelas, lalu daftarkan siswa ke kelas tersebut. Gunakan Wizard Kenaikan Kelas untuk mempromosikan siswa secara massal di akhir tahun ajaran.'
				},
				{
					heading: '3. Periode & Tahun Ajaran',
					body: 'Atur tahun ajaran aktif dari menu "Periode Komunitas". Set tanggal mulai & berakhir, lalu aktifkan tahun ajaran baru. Sistem otomatis menonaktifkan tahun ajaran sebelumnya.'
				},
				{
					heading: '4. Konfigurasi Poin & Gamifikasi',
					body: 'Sesuaikan nilai poin untuk presensi (weekday vs weekend), tugas (kecil/sedang/besar), dan threshold milestone streak. Kelola juga koleksi Badge Type beserta kondisi otomatis pemicunya.'
				},
				{
					heading: '5. Audit Log',
					body: 'Monitor seluruh aktivitas penting sistem di "Audit Log Stream": login gagal, edit presensi manual, penghapusan materi, dan reset password. Filter berdasarkan tanggal, role, atau keyword aksi.'
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

	/* ── Responsive ── */
	@media (max-width: 768px) {
		.docs-sidebar { display: none; }
		.presentation-overlay { padding: 20px; }
		.slide-heading { font-size: 1.5rem; }
		.slide-body { font-size: 1rem; }
	}
</style>

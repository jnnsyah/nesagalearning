# 🎓 Nesaga Learning Community (NLC)

**Nesaga Learning Community (NLC)** adalah Platform Manajemen Pembelajaran (LMS) & Komunitas Akademik Berbasis Gamifikasi yang dirancang khusus untuk mengelola alur pembelajaran, presensi QR, evaluasi tugas, dan monitoring kesehatan kelas secara real-time.

---

## 🌟 Fitur Utama & Suite Role

### 1. 🎓 Portal Siswa (`/siswa`)
* **Rich Text Material Viewer**: Membaca materi kurikulum interaktif berbasis Tiptap dengan viewer slide PPT & unduh dokumen terlampir.
* **Presensi QR Real-Time**: Presensi kehadiran mandiri menggunakan pemindaian QR Code interaktif dengan perlindungan anti brute-force.
* **Tugas & Submisi**: Mengumpulkan tugas dengan pelacakan status submisi, preview repositori, dan riwayat revisi.
* **Gamifikasi & Leaderboard**: Perolehan poin (Presensi & Tugas), kalkukator *Streak Pertemuan*, serta Galeri Badge Interaktif & Peringkat Komunitas.
* **Pengingat Kelengkapan Profil**: Alert banner kelengkapan data NISN (10-digit) & penugasan kelas.

### 2. 👨‍🏫 Portal Mentor (`/mentor`)
* **Roster Siswa Kelas**: Direktori siswa aktif di kelas bimbingan dengan statistik kehadiran & perolehan poin per individu.
* **Task Grading Studio**: Antarmuka penilaian tugas dengan preset feedback cepat (*"Repository privat"*, *"Konfigurasi IP tepat"*), & riwayat perbandingan revisi.
* **Jadwal Pertemuan Sesi**: Tampilan kalender & timeline sesi pertemuan mendatang (`Akan Datang`, `Live Hari Ini`, `Selesai`).

### 3. 🏫 Supervisi Guru Pembimbing (`/guru`)
* **Class Health Overview**: Dashboard pemantauan kesehatan kelas (% kehadiran rata-rata, penyelesaian tugas, alert siswa butuh intervensi).
* **Student Drill-Down & Rapor Siswa**: Profil detail per siswa, riwayat presensi, tugas diserahkan, serta modul *Catatan Pembimbing*.
* **Pantau Track Kurikulum**: Laporan rasio pelaksanaan sesi pertemuan vs target materi pembelajaran.
* **Laporan & Export Suite (`/guru/laporan`)**: Rekapitulasi matriks akademik bulanan/semester dengan fitur **Export CSV/Excel** dan tampilan **Cetak PDF Rapor**.

### 4. ⚙️ Admin Console (`/admin`)
* **User Management**: Manajemen akun lengkap dengan filter Role/Status, hashing password bcrypt, & **Bulk Import User Siswa via CSV/Excel**.
* **Master Akademik & Kenaikan Kelas**: Manajemen Tahun Ajaran, Kelas Rombel, Penugasan Mentor, Enrollment Siswa, dan **Wizard Interactive Bulk Grade Promotion** (Promosi Siswa Kelas 10 → 11 → 12).
* **Konfigurasi Gamifikasi**: Pengaturan poin presensi (base & weekend bonus), poin ukuran tugas, milestone streak, & CRUD jenis Badge.
* **Manajemen Email & Outbox**: Pengaturan SMTP dinamis, tes koneksi live, serta tabel Log Outbox Email dengan preview HTML.
* **Audit Log System**: Stream log aktivitas sistem & keamanan (login, reset password, hapus data).

---

## 🛡️ Keamanan & Hardening

* **Otentikasi Ganda**: Session-based auth via Lucia Auth & SSO **Google OAuth 2.0** (`arctic`).
* **Verifikasi OTP Email**: Pendaftaran manual memerlukan kode OTP 6-digit dengan batas 5x percobaan & cooldown 60 detik.
* **Anti-Bypass RBAC Boundary**: Penguncian ketat di middleware `hooks.server.ts` & `AuthGatekeeper` (siswa belum terverifikasi email dilarang masuk portal).
* **Kompresi File Backend Engine**: Ditenagai oleh `sharp` untuk konversi otomatis gambar ke **.WebP**, auto EXIF rotation, & penyesuaian ukuran otomatis (Avatar `400px`, Materi `1920px`).
* **HTTP Security Headers**: Injeksi header `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, & `Referrer-Policy`.
* **Session Invalidation**: Pembatalan otomatis sesi aktif di seluruh perangkat saat password diubah atau di-reset.
* **Rate Limiting**: Perlindungan rate limit pada endpoint login, register, upload, dan pemindaian QR presensi.

---

## 🛠️ Tech Stack & Arsitektur

* **Frontend**: Svelte 5 (Runes `$state`, `$derived`, `$props`, Snippets) + SvelteKit 2
* **Styling**: Tailwind CSS v4 + Light Mode Glassmorphism & UI/UX Pro Max 8dp Scale
* **Database & ORM**: PostgreSQL + Drizzle ORM
* **Auth**: Lucia Auth + Google OAuth 2.0
* **Storage**: Cloudflare R2 / Local Storage + Engine Kompresi `sharp`
* **Testing & Check**: Vitest + Svelte-Check

---

## 🚀 Panduan Memulai (Development Setup)

### 1. Prasyarat System
* Node.js v20+ 
* PostgreSQL Database

### 2. Instalasi Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env` dan lengkapi variabel berikut:
```env
DATABASE_URL=postgres://user:password@localhost:5432/nlc_db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Setup Database Schema & Seed
```bash
# Push schema Drizzle ke PostgreSQL
npm run db:push

# (Opsional) Jalankan Seeder Data Awal
npm run db:seed
```

### 5. Jalankan Server Dev
```bash
npm run dev
```

### 6. Pengujian & Diagnostic
```bash
# Type-check SvelteKit & TypeScript
npm run check

# Jalankan Unit Test Suite
npx vitest run
```

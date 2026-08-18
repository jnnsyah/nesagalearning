# CONTEXT — Nesaga Learning Web App (NLC)

## Overview

Nesaga Learning Community (NLC) is a specialized web platform for TKJ (Computer & Network Engineering) students at SMK Nesaga. It structures the learning lifecycle across multiple grade levels, meeting schedules, attendance, task submissions, and gamification.

## Ubiquitous Domain Vocabulary

- **Siswa (Student)**: Primary learner. Enrolled in a specific `KelasInstance`. Track progress, scan QR for attendance, submit task URLs, earn points/streaks.
- **Mentor**: Upperclassman or alumnus. Creates curriculum tracks, schedules meetings, manages attendance, reviews task submissions.
- **Guru (Teacher)**: School supervisor. Has view-only access to aggregated attendance, curriculum progress, and student drill-downs.
- **Admin**: System administrator. Manages user accounts, master data, point configurations, academic years, and bulk grade promotion.
- **TahunAjaran (Academic Year)**: Cohort period (e.g. `2026/2027`). Closed annually.
- **Tingkat (Grade Level)**: Master level definition (`Kelas 1` / Grade 10, `Kelas 2` / Grade 11, etc.).
- **CurriculumTrack**: Master reusable curriculum template per `Tingkat` (contains `Phase` → `SubPhase` → `Materi` & optional `Quiz`).
- **KelasInstance**: Concrete running cohort executing a `CurriculumTrack` during a specific `TahunAjaran`.
- **Keanggotaan (Membership)**: Junction between `User` and `KelasInstance` (`aktif`, `naik`, `tinggal`, `keluar`).
- **Pertemuan (Session)**: Meeting linked to a `KelasInstance` and `SubPhase`. Contains PPTs/materials, dynamic QR attendance, and optional `Task`.
- **Attendance**: Logged via time-boxed dynamic QR token or manual entry with reason. Statuses: `hadir`, `excused`.
- **PointLog & StreakCounter**: Gamification metrics scoped to a student's active `KelasInstance` (resets upon promotion).
- **Guru Pembimbing (Academic Advisor / Mentor Teacher)**: School supervisor / advisor role. Monitors class health, presensi, task completion, and records `Catatan Pendampingan Siswa`.
- **Catatan Pendampingan Siswa**: Human-centered educational counseling and guidance log recorded by `Guru Pembimbing` for individual students (Categories: `Pendampingan Akademik`, `Bimbingan & Konseling`, `Catatan Umum Pembimbing`).
- **Skor Komposit Kesehatan Siswa (Composite Health Index)**: Holistic student health calculation combining $50\%$ Attendance Rate + $50\%$ Task Completion Rate. Includes *High Task Effort Exemption* (high task completion $\ge 80\%$ caps risk at `WASPADA` instead of `KRITIS`).
- **Skor Komposit Ketercapaian Kurikulum (Curriculum Completion Index)**: Dynamic weighted composite calculation combining Attendance Rate (40%), Task Completion Rate (30%), and Quiz Pass Rate (30%), adjusting weights dynamically based on available sub-phase materials.

## Key Architectural & Business Rules

1. **Monolith SvelteKit**: Single deployable unit with SSR, server actions, and TypeScript.
2. **Database & Storage**: PostgreSQL (via Drizzle ORM) on Supabase for production / local Docker Postgres for dev; Cloudflare R2 for PPT file storage via presigned URLs.
3. **Streak Integrity**: `calculateStreak()` is a pure function. Excused absences (`excused`) preserve sub-phase completion but **break attendance streaks**.
4. **Grade Promotion**: Bulk promote by Admin creates new `Keanggotaan` records in higher `Tingkat` `KelasInstance` without mutating historical data or resetting global `Badge` records.
5. **RBAC & Security**: Enforced strictly on server boundaries in `hooks.server.ts` and service layer (never UI-only).
6. **2-Tier Class Health Monitoring (`/guru/monitoring`)**:
   - Tier 1: Academic Year Filter + Grid of Class Health Cards with 3 distinct class states (`active`, `upcoming` / `TA BELUM DIMULAI`, `archived` / `TERARSIP`).
   - Tier 2: Class Dashboard with composite distribution bar, FilterBar (tight 4:2 ratio), and paginated student roster table.
7. **2-Tier Pantau Kurikulum (`/guru/kurikulum`)**:
   - Tier 1: Academic Year Filter + Grid of Curriculum Track Cards with class rombel tags, mini stats, and progress bars.
   - Tier 2: Curriculum Track Detail Breakdown with 4 summary stat cards, Filter Rombel, and collapsible Phase/SubPhase accordion displaying composite completion rates and per-dimension breakdown mini-bars (Kehadiran, Tugas Approved, Quiz Lulus).
8. **Detail Pembimbing Siswa (`/guru/siswa/[id]`)**:
   - Individual student health profile, alert warnings, Form Catatan Pendampingan, and tabbed history (Notes, Attendance, Submissions).
9. **UI & Iconography Standard**:
   - Zero text emojis in UI. Always use clean inline SVG icons (`<svg>`).
   - Standard page container padding (`padding: 24px 28px 48px; max-width: 1280px; margin: 0 auto;`).
   - Fallback `-` indicator for 0-activity or 0-student states instead of `0%`.

import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function seed() {
	console.log('🧹 Truncating all existing database tables...');

	// Truncate root tables with CASCADE & RESTART IDENTITY to wipe all dependent data cleanly
	await db.execute(sql`
		TRUNCATE TABLE 
			"user",
			"tahun_ajaran",
			"master_angkatan",
			"master_rombel",
			"tingkat",
			"curriculum_track",
			"room",
			"activity_type",
			"avatar",
			"badge_type",
			"point_config"
		RESTART IDENTITY CASCADE;
	`);

	console.log('🌱 Starting fresh database seeding...');

	// Master Angkatan
	console.log('Seeding master_angkatan...');
	await db.insert(schema.masterAngkatan).values([
		{ year: 2024, name: 'Angkatan 2024', isActive: true },
		{ year: 2025, name: 'Angkatan 2025', isActive: true },
		{ year: 2026, name: 'Angkatan 2026', isActive: true }
	]).onConflictDoNothing();

	// Master Rombel
	console.log('Seeding master_rombel...');
	await db.insert(schema.masterRombel).values([
		{ name: 'X TKJ 1', levelOrder: 1 },
		{ name: 'X TKJ 2', levelOrder: 1 },
		{ name: 'XI TKJ 1', levelOrder: 2 },
		{ name: 'XI TKJ 2', levelOrder: 2 },
		{ name: 'XII TKJ 1', levelOrder: 3 },
		{ name: 'XII TKJ 2', levelOrder: 3 },
		{ name: 'Alumni', levelOrder: 4 }
	]).onConflictDoNothing();

	const passwordHash = await bcrypt.hash('password123', 10);

	// 1. Users
	console.log('Seeding users...');
	const [admin] = await db
		.insert(schema.user)
		.values({
			username: 'admin',
			email: 'admin@nesaga.sch.id',
			passwordHash,
			fullName: 'Administrator Nesaga',
			role: 'admin',
			isEmailVerified: true,
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	const [guru] = await db
		.insert(schema.user)
		.values({
			username: 'guru',
			email: 'guru@nesaga.sch.id',
			passwordHash,
			fullName: 'Pak Guru TKJ',
			role: 'guru',
			isEmailVerified: true,
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	const [mentor] = await db
		.insert(schema.user)
		.values({
			username: 'mentor',
			email: 'mentor@nesaga.sch.id',
			passwordHash,
			fullName: 'Kak Mentor Alumnus',
			role: 'mentor',
			angkatan: 2024,
			rombelLabel: 'Alumni',
			isEmailVerified: true,
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	const [siswa1] = await db
		.insert(schema.user)
		.values({
			username: 'siswa1',
			email: 'budi@siswa.nesaga.sch.id',
			passwordHash,
			fullName: 'Budi Santoso',
			role: 'siswa',
			angkatan: 2025,
			rombelLabel: 'XI TKJ 1',
			isEmailVerified: true,
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	const [siswa2] = await db
		.insert(schema.user)
		.values({
			username: 'siswa2',
			email: 'siti@siswa.nesaga.sch.id',
			passwordHash,
			fullName: 'Siti Rahma',
			role: 'siswa',
			angkatan: 2026,
			rombelLabel: 'X TKJ 2',
			isEmailVerified: true,
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	// 2. Academic Year (TahunAjaran)
	console.log('Seeding tahun_ajaran...');
	const [ta] = await db
		.insert(schema.tahunAjaran)
		.values({
			name: '2026/2027',
			isActive: true,
			startedAt: new Date('2026-07-15'),
			endedAt: new Date('2027-06-30')
		})
		.onConflictDoNothing()
		.returning();

	// 3. Tingkat
	console.log('Seeding tingkat...');
	const [tingkat1] = await db
		.insert(schema.tingkat)
		.values({
			name: 'Kelas 1',
			levelOrder: 1
		})
		.onConflictDoNothing()
		.returning();

	await db
		.insert(schema.tingkat)
		.values({
			name: 'Kelas 2',
			levelOrder: 2
		})
		.onConflictDoNothing();

	// Fetch IDs if onConflictDoNothing returned undefined
	const currentTa = ta || (await db.query.tahunAjaran.findFirst());
	const currentTingkat1 = tingkat1 || (await db.query.tingkat.findFirst());

	if (!currentTa || !currentTingkat1) {
		throw new Error('Failed to resolve TahunAjaran or Tingkat records');
	}

	// 4. CurriculumTrack -> Phase -> SubPhase -> Materi
	console.log('Seeding curriculum track...');
	const [track] = await db
		.insert(schema.curriculumTrack)
		.values({
			tingkatId: currentTingkat1.id,
			title: 'Kurikulum TKJ Kelas 1',
			description: 'Kurikulum dasar Teknik Komputer & Jaringan tingkat 10',
			isPublished: true
		})
		.returning();

	const [phase1] = await db
		.insert(schema.phase)
		.values({
			curriculumTrackId: track.id,
			title: 'Mengoperasikan Komputer & Jaringan Dasar',
			description: 'Fase awal pengenalan sistem hardware dan jaringan',
			sortOrder: 1
		})
		.returning();

	const [subPhase1] = await db
		.insert(schema.subPhase)
		.values({
			phaseId: phase1.id,
			title: 'Pengenalan Perangkat Hardware & OS',
			description: 'Pemahaman komponen komputer dan instalasi OS',
			sortOrder: 1
		})
		.returning();

	await db.insert(schema.materi).values({
		subPhaseId: subPhase1.id,
		title: 'Dasar-Dasar Hardware',
		content: '<h3>Pengenalan Komponen Server & PC</h3><p>Penjelasan CPU, RAM, NIC, dan Router.</p>',
		sortOrder: 1
	});

	// 5. KelasInstance
	console.log('Seeding kelas_instance...');
	const [kelas1] = await db
		.insert(schema.kelasInstance)
		.values({
			tahunAjaranId: currentTa.id,
			tingkatId: currentTingkat1.id,
			curriculumTrackId: track.id,
			name: 'Kelas 1 - TA 2026/2027',
			isActive: true
		})
		.onConflictDoNothing()
		.returning();

	const currentKelas1 = kelas1 || (await db.query.kelasInstance.findFirst());
	if (!currentKelas1) {
		throw new Error('Failed to resolve KelasInstance');
	}

	// 6. Keanggotaan & MentorAssignment
	console.log('Seeding keanggotaan & mentor assignments...');
	const targetSiswa1 =
		siswa1 || (await db.query.user.findFirst({ where: (u, { eq }) => eq(u.username, 'siswa1') }));
	const targetSiswa2 =
		siswa2 || (await db.query.user.findFirst({ where: (u, { eq }) => eq(u.username, 'siswa2') }));
	const targetMentor =
		mentor || (await db.query.user.findFirst({ where: (u, { eq }) => eq(u.username, 'mentor') }));

	if (targetSiswa1) {
		await db
			.insert(schema.keanggotaan)
			.values({
				userId: targetSiswa1.id,
				kelasInstanceId: currentKelas1.id,
				status: 'aktif'
			})
			.onConflictDoNothing();

		await db
			.insert(schema.streakCounter)
			.values({
				userId: targetSiswa1.id,
				kelasInstanceId: currentKelas1.id,
				currentStreak: 0,
				maxStreak: 0
			})
			.onConflictDoNothing();
	}

	if (targetSiswa2) {
		await db
			.insert(schema.keanggotaan)
			.values({
				userId: targetSiswa2.id,
				kelasInstanceId: currentKelas1.id,
				status: 'aktif'
			})
			.onConflictDoNothing();

		await db
			.insert(schema.streakCounter)
			.values({
				userId: targetSiswa2.id,
				kelasInstanceId: currentKelas1.id,
				currentStreak: 0,
				maxStreak: 0
			})
			.onConflictDoNothing();
	}

	if (targetMentor) {
		await db
			.insert(schema.mentorAssignment)
			.values({
				userId: targetMentor.id,
				kelasInstanceId: currentKelas1.id
			})
			.onConflictDoNothing();
	}

	// 7. PointConfig
	console.log('Seeding point_config...');
	const configs = [
		{ configKey: 'attendance_weekday', configValue: 10, description: 'Poin hadir weekday' },
		{ configKey: 'attendance_weekend', configValue: 25, description: 'Poin hadir weekend' },
		{ configKey: 'excused', configValue: 0, description: 'Excused = 0 poin' },
		{ configKey: 'streak_milestone_3', configValue: 15, description: 'Bonus poin streak 3x' },
		{ configKey: 'streak_milestone_5', configValue: 30, description: 'Bonus poin streak 5x' },
		{ configKey: 'streak_milestone_10', configValue: 75, description: 'Bonus poin streak 10x' },
		{
			configKey: 'streak_milestone_recurring',
			configValue: 45,
			description: 'Bonus poin tiap +5 setelah 10'
		},
		{ configKey: 'task_kecil', configValue: 10, description: 'Poin task kecil approved' },
		{ configKey: 'task_sedang', configValue: 20, description: 'Poin task sedang approved' },
		{ configKey: 'task_besar', configValue: 35, description: 'Poin task besar approved' },
		{ configKey: 'quiz_multiplier', configValue: 20, description: 'Multiplier skor quiz' },
		{ configKey: 'quiz_floor', configValue: 60, description: 'Minimum skor quiz (%)' },
		{ configKey: 'phase_completed', configValue: 100, description: 'Poin menyelesaikan 1 phase' }
	];

	for (const cfg of configs) {
		await db.insert(schema.pointConfig).values(cfg).onConflictDoNothing();
	}

	// 8. Operational Master Data (Room, ActivityType, Avatar, BadgeType)
	console.log('Seeding operational master data...');
	await db
		.insert(schema.room)
		.values([
			{ name: 'Lab Komputer 1 (TKJ)', description: 'Gedung B Lantai 2 — Lab Komputer & Server' },
			{ name: 'Lab Komputer 2 (RPL)', description: 'Gedung B Lantai 2 — Software Development' },
			{ name: 'Ruang Teori 101', description: 'Gedung A Lantai 1 — Ruang Kuliah & Presentasi' }
		])
		.onConflictDoNothing();

	await db
		.insert(schema.activityType)
		.values([
			{ code: 'teori', name: 'Teori (Pendalaman Konsep)', description: 'Sesi instruksional & penyampaian modul teori utama.' },
			{ code: 'praktik', name: 'Praktik (Hands-on Lab)', description: 'Praktik langsung pembuatan proyek & latihan coding.' },
			{ code: 'teori_praktik', name: 'Teori & Praktik', description: 'Kombinasi penyampaian konsep dan latihan praktikal.' },
			{ code: 'games', name: 'Games / Challenge', description: 'Tantangan interaktif & permainan edukatif.' },
			{ code: 'quiz', name: 'Quiz / Evaluasi', description: 'Sesi kuis terstruktur & penilaian pemahaman.' },
			{ code: 'santai', name: 'Santai / Networking', description: 'Sesi diskusi santai, keakraban & sharing session.' }
		])
		.onConflictDoNothing();

	await db
		.insert(schema.avatar)
		.values([
			{ name: 'Cyber Explorer', imageUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=explorer' },
			{ name: 'Pixel Wizard', imageUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=wizard' },
			{ name: 'Code Ninja', imageUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ninja' }
		])
		.onConflictDoNothing();

	await db
		.insert(schema.badgeType)
		.values([
			{ name: 'First Code', description: 'Menyelesaikan 1 submission tugas pertama', criteria: 'Submit 1 task approved', triggerType: 'tasks_approved', triggerThreshold: 1 },
			{ name: 'Streak Master 5x', description: 'Hadir 5 kali berturut-turut tanpa absen', criteria: '5x streak', triggerType: 'streak_milestone', triggerThreshold: 5 },
			{ name: 'Point Hunter 500', description: 'Mengumpulkan total akumulasi 500 poin', criteria: '500 Poin', triggerType: 'total_points', triggerThreshold: 500 },
			{ name: 'Rajin Presensi', description: 'Hadir presensi sebanyak 10 kali', criteria: '10x Presensi', triggerType: 'attendance_count', triggerThreshold: 10 },
			{ name: 'Special Recognition', description: 'Lencana khusus dari mentor/admin', criteria: 'Penghargaan khusus', triggerType: 'manual_award', triggerThreshold: 0 }
		])
		.onConflictDoNothing();

	console.log('✅ Database seeding complete!');
}

seed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('❌ Seeding failed:', err);
		process.exit(1);
	});

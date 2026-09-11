import { describe, it, expect } from 'vitest';
import { createPertemuanSchema, updatePertemuanSchema, optionalTaskSchema } from './pertemuan';

describe('createPertemuanSchema', () => {
	it('validates a correct meeting input with local uploaded material relative URL', () => {
		const input = {
			kelasInstanceId: 1,
			subPhaseId: 2,
			title: 'Sesi 1 — Pengenalan HTML & CSS',
			activityType: 'teori',
			sessionDate: '2026-08-20',
			startTime: '15:20',
			endTime: '16:55',
			location: 'Lab Komputer 1',
			materialUrl: '/uploads/materials/1723820000000-Slide-Materi.pdf',
			isWeekend: false
		};

		const result = createPertemuanSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('validates meeting input with absolute HTTPS material URL', () => {
		const input = {
			kelasInstanceId: 1,
			subPhaseId: 2,
			title: 'Sesi 2 — Deep Dive Tailwind CSS',
			activityType: 'praktik',
			sessionDate: '2026-08-22',
			startTime: '15:20',
			endTime: '16:55',
			materialUrl: 'https://drive.google.com/file/d/abcdef123/view',
			isWeekend: true
		};

		const result = createPertemuanSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('validates meeting input with empty or null materialUrl', () => {
		const inputEmpty = {
			kelasInstanceId: 1,
			subPhaseId: 2,
			title: 'Sesi 3 — Diskusi Santai',
			activityType: 'santai',
			sessionDate: '2026-08-23',
			startTime: '15:20',
			endTime: '16:55',
			materialUrl: ''
		};

		const resultEmpty = createPertemuanSchema.safeParse(inputEmpty);
		expect(resultEmpty.success).toBe(true);

		const inputNull = { ...inputEmpty, materialUrl: null };
		const resultNull = createPertemuanSchema.safeParse(inputNull);
		expect(resultNull.success).toBe(true);
	});

	it('rejects short title (< 3 chars)', () => {
		const input = {
			kelasInstanceId: 1,
			subPhaseId: 2,
			title: 'Hi',
			activityType: 'teori',
			sessionDate: '2026-08-20',
			startTime: '15:20',
			endTime: '16:55'
		};

		const result = createPertemuanSchema.safeParse(input);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Judul pertemuan minimal 3 karakter');
		}
	});

	it('validates optional task attached to meeting', () => {
		const input = {
			kelasInstanceId: 1,
			subPhaseId: 2,
			title: 'Sesi 4 — Grid System',
			activityType: 'praktik',
			sessionDate: '2026-08-25',
			startTime: '15:20',
			endTime: '16:55',
			task: {
				title: 'Latihan Responsive Layout',
				description: 'Buat 3 breakpoint: mobile, tablet, desktop',
				taskSize: 'sedang'
			}
		};

		const result = createPertemuanSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});

describe('optionalTaskSchema', () => {
	it('defaults taskSize to sedang if omitted', () => {
		const input = {
			title: 'Task Tanpa Skala Poin'
		};

		const result = optionalTaskSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.taskSize).toBe('sedang');
		}
	});

	it('rejects task title shorter than 3 chars', () => {
		const input = {
			title: 'Ab'
		};

		const result = optionalTaskSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe('updatePertemuanSchema', () => {
	it('allows partial updates with valid id', () => {
		const input = {
			id: 42,
			title: 'Judul Baru Pertemuan'
		};

		const result = updatePertemuanSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});

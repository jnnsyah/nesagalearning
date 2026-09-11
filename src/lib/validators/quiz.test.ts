import { describe, it, expect } from 'vitest';
import {
	createQuizSchema,
	singleQuestionSchema,
	validateBulkQuizImport,
	submitQuizAttemptSchema
} from './quiz';

describe('Quiz Validator Tests', () => {
	it('validates correct createQuiz input', () => {
		const result = createQuizSchema.safeParse({
			subPhaseId: 1,
			title: 'Kuis Evaluasi Subnetting',
			quizType: 'pre-test',
			passingScore: 75,
			durationMinutes: 30
		});
		expect(result.success).toBe(true);
	});

	it('rejects createQuiz input with invalid title or passingScore', () => {
		const result = createQuizSchema.safeParse({
			subPhaseId: 1,
			title: 'A',
			passingScore: 120
		});
		expect(result.success).toBe(false);
	});

	it('validates singleQuestionSchema with valid options and answer index', () => {
		const result = singleQuestionSchema.safeParse({
			question: 'Perangkat layer 3 OSI adalah?',
			options: ['Hub', 'Switch', 'Router', 'Repeater'],
			answer: 2
		});
		expect(result.success).toBe(true);
	});

	it('rejects singleQuestionSchema if answer index is out of bounds', () => {
		const result = singleQuestionSchema.safeParse({
			question: 'Perangkat layer 3 OSI adalah?',
			options: ['Hub', 'Switch'],
			answer: 5
		});
		expect(result.success).toBe(false);
	});

	it('validates bulk import JSON matching Google Forms spec', () => {
		const rawJson = [
			{
				question: 'Perangkat yang menghubungkan dua jaringan berbeda adalah?',
				imageUrl: null,
				options: ['Switch', 'Router', 'Hub', 'Repeater'],
				answer: 1
			},
			{
				question: 'Perhatikan gambar diagram berikut:',
				imageUrl: 'https://example.com/images/topo.png',
				options: ['LAN', 'MAN', 'WAN'],
				answer: 0
			}
		];

		const res = validateBulkQuizImport(rawJson);
		expect(res.success).toBe(true);
		expect(res.data?.length).toBe(2);
	});

	it('returns clear item-level errors for invalid questions in bulk import', () => {
		const rawJson = [
			{
				question: 'Soal benar',
				options: ['A', 'B'],
				answer: 0
			},
			{
				question: 'Soal dengan indeks salah',
				options: ['A', 'B'],
				answer: 4
			}
		];

		const res = validateBulkQuizImport(rawJson);
		expect(res.success).toBe(false);
		expect(res.errorsByItem?.length).toBe(1);
		expect(res.errorsByItem?.[0].index).toBe(1);
		expect(res.errorsByItem?.[0].message).toContain('Soal #2');
	});
});

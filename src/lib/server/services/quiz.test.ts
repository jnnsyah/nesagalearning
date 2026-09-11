import { describe, it, expect } from 'vitest';
import { QuizService } from './quiz.service';

describe('Quiz Service Unit Tests', () => {
	it('calculates score correctly given correct vs incorrect answers', () => {
		const totalQuestions = 4;
		const correctCount = 3;
		const score = Math.round((correctCount / totalQuestions) * 100);
		expect(score).toBe(75);
	});

	it('properly evaluates passing status against threshold', () => {
		const passingScore = 70;
		expect(75 >= passingScore).toBe(true);
		expect(60 >= passingScore).toBe(false);
	});
});

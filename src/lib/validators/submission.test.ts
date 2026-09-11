import { describe, it, expect } from 'vitest';
import { submitTaskSchema, reviewSubmissionSchema } from './submission';

describe('Submission Validators', () => {
	describe('submitTaskSchema', () => {
		it('should validate valid submission input with https', () => {
			const validData = {
				taskId: 1,
				link: 'https://github.com/student/tkj-project'
			};
			const result = submitTaskSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.link).toBe('https://github.com/student/tkj-project');
			}
		});

		it('should auto-prepend https:// if missing', () => {
			const validData = {
				taskId: 1,
				link: 'github.com/student/tkj-project'
			};
			const result = submitTaskSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.link).toBe('https://github.com/student/tkj-project');
			}
		});

		it('should reject empty link', () => {
			const invalidData = {
				taskId: 1,
				link: ''
			};
			const result = submitTaskSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	describe('reviewSubmissionSchema', () => {
		it('should validate valid approval review input', () => {
			const validData = {
				submissionId: 10,
				status: 'approved',
				feedback: 'Bagus sekali, konfigurasi router tepat!'
			};
			const result = reviewSubmissionSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it('should validate revision review input without feedback', () => {
			const validData = {
				submissionId: 10,
				status: 'revisi'
			};
			const result = reviewSubmissionSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it('should reject invalid status', () => {
			const invalidData = {
				submissionId: 10,
				status: 'invalid_status'
			};
			const result = reviewSubmissionSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});
});

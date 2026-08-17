import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitTaskSchema, reviewSubmissionSchema } from './submission';

describe('Submission Validators', () => {
	describe('submitTaskSchema', () => {
		it('should validate valid submission input with https', () => {
			const validData = {
				taskId: 1,
				link: 'https://github.com/student/tkj-project'
			};
			const result = submitTaskSchema.safeParse(validData);
			assert.equal(result.success, true);
			if (result.success) {
				assert.equal(result.data.link, 'https://github.com/student/tkj-project');
			}
		});

		it('should auto-prepend https:// if missing', () => {
			const validData = {
				taskId: 1,
				link: 'github.com/student/tkj-project'
			};
			const result = submitTaskSchema.safeParse(validData);
			assert.equal(result.success, true);
			if (result.success) {
				assert.equal(result.data.link, 'https://github.com/student/tkj-project');
			}
		});

		it('should reject empty link', () => {
			const invalidData = {
				taskId: 1,
				link: ''
			};
			const result = submitTaskSchema.safeParse(invalidData);
			assert.equal(result.success, false);
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
			assert.equal(result.success, true);
		});

		it('should validate revision review input without feedback', () => {
			const validData = {
				submissionId: 10,
				status: 'revisi'
			};
			const result = reviewSubmissionSchema.safeParse(validData);
			assert.equal(result.success, true);
		});

		it('should reject invalid status', () => {
			const invalidData = {
				submissionId: 10,
				status: 'invalid_status'
			};
			const result = reviewSubmissionSchema.safeParse(invalidData);
			assert.equal(result.success, false);
		});
	});
});

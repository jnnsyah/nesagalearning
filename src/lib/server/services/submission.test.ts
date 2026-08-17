import { describe, it, expect } from 'vitest';
import { submitTaskSchema, reviewSubmissionSchema } from '$lib/validators/submission';

describe('Submission Service & Validation Logic', () => {
	it('validates correct submission input data', () => {
		const result = submitTaskSchema.safeParse({
			taskId: 1,
			link: 'https://github.com/smk-nesaga/tkj-lab-1'
		});
		expect(result.success).toBe(true);
	});

	it('validates mentor review status approval', () => {
		const result = reviewSubmissionSchema.safeParse({
			submissionId: 5,
			status: 'approved',
			feedback: 'Pekerjaan sangat rapi!'
		});
		expect(result.success).toBe(true);
	});

	it('validates mentor review status revision request', () => {
		const result = reviewSubmissionSchema.safeParse({
			submissionId: 5,
			status: 'revisi',
			feedback: 'Tolong perbaiki routing IP pada interface eth0'
		});
		expect(result.success).toBe(true);
	});
});

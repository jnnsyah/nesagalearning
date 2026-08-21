import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitTaskSchema, reviewSubmissionSchema } from '$lib/validators/submission';

describe('Submission Service & Validation Logic', () => {
	it('validates correct submission input data', () => {
		const result = submitTaskSchema.safeParse({
			taskId: 1,
			link: 'https://github.com/smk-nesaga/tkj-lab-1'
		});
		assert.equal(result.success, true);
	});

	it('validates mentor review status approval', () => {
		const result = reviewSubmissionSchema.safeParse({
			submissionId: 5,
			status: 'approved',
			feedback: 'Pekerjaan sangat rapi!'
		});
		assert.equal(result.success, true);
	});

	it('validates mentor review status revision request', () => {
		const result = reviewSubmissionSchema.safeParse({
			submissionId: 5,
			status: 'revisi',
			feedback: 'Tolong perbaiki routing IP pada interface eth0'
		});
		assert.equal(result.success, true);
	});

	it('rejects invalid review status values', () => {
		const result = reviewSubmissionSchema.safeParse({
			submissionId: 5,
			status: 'unknown_status'
		});
		assert.equal(result.success, false);
	});

	it('rejects invalid task submission URLs', () => {
		const result = submitTaskSchema.safeParse({
			taskId: 1,
			link: 'http://'
		});
		assert.equal(result.success, false);
	});
});

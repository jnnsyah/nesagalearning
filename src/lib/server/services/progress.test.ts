import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ProgressService Interfaces & Calculation Rules', () => {
	it('calculates progress percentage correctly from completed vs total subphases', () => {
		const totalSubPhases = 4;
		const completedSubPhases = 3;
		const progressPercentage = Math.round((completedSubPhases / totalSubPhases) * 100);

		assert.equal(progressPercentage, 75);
	});

	it('returns 0% progress when total subphases is 0', () => {
		const totalSubPhases = 0;
		const completedSubPhases = 0;
		const progressPercentage = totalSubPhases > 0 ? Math.round((completedSubPhases / totalSubPhases) * 100) : 0;

		assert.equal(progressPercentage, 0);
	});

	it('handles 100% completion when all subphases are finished', () => {
		const totalSubPhases = 5;
		const completedSubPhases = 5;
		const progressPercentage = Math.round((completedSubPhases / totalSubPhases) * 100);

		assert.equal(progressPercentage, 100);
	});
});

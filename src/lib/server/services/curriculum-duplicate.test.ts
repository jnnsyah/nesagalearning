import { describe, it, expect } from 'vitest';
import { CurriculumService } from './curriculum.service';

describe('CurriculumTrack Duplication Engine', () => {
	it('should export duplicateTrack method on CurriculumService', () => {
		expect(typeof CurriculumService.duplicateTrack).toBe('function');
	});
});

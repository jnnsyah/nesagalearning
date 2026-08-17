import { z } from 'zod';

export const submitTaskSchema = z.object({
	taskId: z.number({ message: 'Task ID wajib diisi' }),
	link: z
		.string({ message: 'Link tugas wajib diisi' })
		.trim()
		.min(1, 'Link tugas tidak boleh kosong')
		.transform((val) => {
			if (!/^https?:\/\//i.test(val)) {
				return `https://${val}`;
			}
			return val;
		})
		.pipe(z.string().url('Format URL tidak valid (misal: https://github.com/user/repo)'))
});

export const reviewSubmissionSchema = z.object({
	submissionId: z.number({ message: 'Submission ID wajib diisi' }),
	status: z.enum(['approved', 'revisi'], {
		message: 'Status penilaian harus approved atau revisi'
	}),
	feedback: z.string().trim().optional()
});

export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

import { z } from 'zod';

export const loginSchema = z.object({
	username: z.string().min(3, 'Username minimal 3 karakter'),
	password: z.string().min(6, 'Password minimal 6 karakter'),
	rememberMe: z.boolean().optional()
});

export const submissionSchema = z.object({
	taskId: z.number(),
	link: z.string().url('Format URL submission tidak valid')
});

export const attendanceScanSchema = z.object({
	token: z.string().min(1, 'Token presensi wajib diisi')
});

export const manualAttendanceSchema = z.object({
	pertemuanId: z.number(),
	userId: z.number(),
	status: z.enum(['hadir', 'excused']),
	manualReason: z.string().min(3, 'Alasan presensi manual wajib diisi')
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type AttendanceScanInput = z.infer<typeof attendanceScanSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

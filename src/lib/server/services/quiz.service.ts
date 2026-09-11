import { db } from '../db';
import { quiz, quizQuestion, subPhase, phase, curriculumTrack } from '../db/schema/curriculum';
import { quizAttempt, pointLog } from '../db/schema/gamification';
import { keanggotaan } from '../db/schema/academic';
import { user } from '../db/schema/auth';
import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import type { CreateQuizInput, UpdateQuizInput, SingleQuestionInput } from '$lib/validators/quiz';
import { PointsService } from './points.service';

export class QuizService {
	/**
	 * Get all quizzes in a specific subPhase
	 */
	static async getQuizzesBySubPhase(subPhaseId: number) {
		const quizzes = await db
			.select({
				id: quiz.id,
				subPhaseId: quiz.subPhaseId,
				title: quiz.title,
				description: quiz.description,
				quizType: quiz.quizType,
				passingScore: quiz.passingScore,
				durationMinutes: quiz.durationMinutes,
				createdAt: quiz.createdAt,
				updatedAt: quiz.updatedAt
			})
			.from(quiz)
			.where(eq(quiz.subPhaseId, subPhaseId))
			.orderBy(asc(quiz.createdAt));

		// Parallel question counts
		const questionCounts = await Promise.all(
			quizzes.map((q) =>
				db
					.select({ count: count(quizQuestion.id) })
					.from(quizQuestion)
					.where(eq(quizQuestion.quizId, q.id))
					.then((rows) => ({ quizId: q.id, count: Number(rows[0]?.count ?? 0) }))
			)
		);

		const countMap = Object.fromEntries(questionCounts.map((qc) => [qc.quizId, qc.count]));

		return quizzes.map((q) => ({
			...q,
			questionCount: countMap[q.id] ?? 0
		}));
	}

	/**
	 * Get detailed quiz info + full questions (for mentor builder)
	 */
	static async getQuizDetail(quizId: number) {
		const [quizRecord] = await db
			.select({
				id: quiz.id,
				subPhaseId: quiz.subPhaseId,
				title: quiz.title,
				description: quiz.description,
				quizType: quiz.quizType,
				passingScore: quiz.passingScore,
				durationMinutes: quiz.durationMinutes,
				createdAt: quiz.createdAt,
				updatedAt: quiz.updatedAt,
				subPhaseTitle: subPhase.title,
				phaseId: phase.id,
				phaseTitle: phase.title,
				trackId: curriculumTrack.id,
				trackTitle: curriculumTrack.title
			})
			.from(quiz)
			.innerJoin(subPhase, eq(quiz.subPhaseId, subPhase.id))
			.innerJoin(phase, eq(subPhase.phaseId, phase.id))
			.innerJoin(curriculumTrack, eq(phase.curriculumTrackId, curriculumTrack.id))
			.where(eq(quiz.id, quizId))
			.limit(1);

		if (!quizRecord) return null;

		const questions = await db
			.select({
				id: quizQuestion.id,
				quizId: quizQuestion.quizId,
				questionText: quizQuestion.questionText,
				imageUrl: quizQuestion.imageUrl,
				options: quizQuestion.options,
				correctAnswer: quizQuestion.correctAnswer,
				explanation: quizQuestion.explanation,
				sortOrder: quizQuestion.sortOrder
			})
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, quizId))
			.orderBy(asc(quizQuestion.sortOrder));

		return {
			...quizRecord,
			questions
		};
	}

	/**
	 * Create a new quiz
	 */
	static async createQuiz(data: CreateQuizInput) {
		const [created] = await db
			.insert(quiz)
			.values({
				subPhaseId: data.subPhaseId,
				title: data.title,
				description: data.description ?? null,
				quizType: data.quizType,
				passingScore: data.passingScore,
				durationMinutes: data.durationMinutes ?? null
			})
			.returning();

		return created;
	}

	/**
	 * Update an existing quiz
	 */
	static async updateQuiz(quizId: number, data: UpdateQuizInput) {
		const updateData: Partial<typeof quiz.$inferInsert> = {
			updatedAt: new Date()
		};

		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description ?? null;
		if (data.quizType !== undefined) updateData.quizType = data.quizType;
		if (data.passingScore !== undefined) updateData.passingScore = data.passingScore;
		if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes ?? null;

		const [updated] = await db
			.update(quiz)
			.set(updateData)
			.where(eq(quiz.id, quizId))
			.returning();

		return updated;
	}

	/**
	 * Delete a quiz
	 */
	static async deleteQuiz(quizId: number) {
		await db.delete(quiz).where(eq(quiz.id, quizId));
		return true;
	}

	/**
	 * Add a single question to a quiz
	 */
	static async addQuestion(quizId: number, data: SingleQuestionInput) {
		// Determine next sortOrder
		const [maxOrder] = await db
			.select({ max: sql<number>`coalesce(max(${quizQuestion.sortOrder}), 0)` })
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, quizId));

		const nextOrder = (maxOrder?.max ?? 0) + 1;

		const [created] = await db
			.insert(quizQuestion)
			.values({
				quizId,
				questionText: data.question,
				imageUrl: data.imageUrl || null,
				options: data.options,
				correctAnswer: data.answer,
				explanation: data.explanation || null,
				sortOrder: nextOrder
			})
			.returning();

		return created;
	}

	/**
	 * Update an existing question
	 */
	static async updateQuestion(questionId: number, data: SingleQuestionInput) {
		const [updated] = await db
			.update(quizQuestion)
			.set({
				questionText: data.question,
				imageUrl: data.imageUrl || null,
				options: data.options,
				correctAnswer: data.answer,
				explanation: data.explanation || null
			})
			.where(eq(quizQuestion.id, questionId))
			.returning();

		return updated;
	}

	/**
	 * Delete a question and re-order remaining
	 */
	static async deleteQuestion(questionId: number) {
		const [q] = await db
			.select({ quizId: quizQuestion.quizId })
			.from(quizQuestion)
			.where(eq(quizQuestion.id, questionId))
			.limit(1);

		if (!q) return false;

		await db.delete(quizQuestion).where(eq(quizQuestion.id, questionId));

		// Re-order remaining questions sequentially
		const remaining = await db
			.select({ id: quizQuestion.id })
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, q.quizId))
			.orderBy(asc(quizQuestion.sortOrder));

		for (let i = 0; i < remaining.length; i++) {
			await db
				.update(quizQuestion)
				.set({ sortOrder: i + 1 })
				.where(eq(quizQuestion.id, remaining[i].id));
		}

		return true;
	}

	/**
	 * Bulk import questions (appends or replaces)
	 */
	static async bulkImportQuestions(
		quizId: number,
		questions: Array<{
			question: string;
			imageUrl: string | null;
			options: string[];
			answer: number;
			explanation?: string | null;
		}>,
		replaceExisting = false
	) {
		if (replaceExisting) {
			await db.delete(quizQuestion).where(eq(quizQuestion.id, quizId));
		}

		// Get current highest order
		const [maxOrder] = await db
			.select({ max: sql<number>`coalesce(max(${quizQuestion.sortOrder}), 0)` })
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, quizId));

		let startOrder = (maxOrder?.max ?? 0) + 1;

		const insertValues = questions.map((q, idx) => ({
			quizId,
			questionText: q.question,
			imageUrl: q.imageUrl || null,
			options: q.options,
			correctAnswer: q.answer,
			explanation: q.explanation || null,
			sortOrder: startOrder + idx
		}));

		if (insertValues.length > 0) {
			await db.insert(quizQuestion).values(insertValues);
		}

		return insertValues.length;
	}

	/**
	 * Student Exam Fetcher — strips out correctAnswer & explanation to prevent client cheating
	 */
	static async getStudentExam(quizId: number, userId: number) {
		const [quizRecord] = await db
			.select({
				id: quiz.id,
				title: quiz.title,
				description: quiz.description,
				quizType: quiz.quizType,
				passingScore: quiz.passingScore,
				durationMinutes: quiz.durationMinutes,
				subPhaseId: subPhase.id,
				subPhaseTitle: subPhase.title,
				phaseId: phase.id,
				phaseTitle: phase.title,
				trackId: curriculumTrack.id,
				trackTitle: curriculumTrack.title
			})
			.from(quiz)
			.innerJoin(subPhase, eq(quiz.subPhaseId, subPhase.id))
			.innerJoin(phase, eq(subPhase.phaseId, phase.id))
			.innerJoin(curriculumTrack, eq(phase.curriculumTrackId, curriculumTrack.id))
			.where(eq(quiz.id, quizId))
			.limit(1);

		if (!quizRecord) return null;

		// Fetch questions without answer column!
		const questions = await db
			.select({
				id: quizQuestion.id,
				questionText: quizQuestion.questionText,
				imageUrl: quizQuestion.imageUrl,
				options: quizQuestion.options,
				sortOrder: quizQuestion.sortOrder
			})
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, quizId))
			.orderBy(asc(quizQuestion.sortOrder));

		// Check previous attempts of this user
		const attempts = await db
			.select({
				id: quizAttempt.id,
				score: quizAttempt.score,
				isPassed: quizAttempt.isPassed,
				attemptedAt: quizAttempt.attemptedAt
			})
			.from(quizAttempt)
			.where(and(eq(quizAttempt.quizId, quizId), eq(quizAttempt.userId, userId)))
			.orderBy(desc(quizAttempt.attemptedAt));

		const bestAttempt = attempts.reduce<{ score: number; isPassed: boolean } | null>(
			(best, cur) => (!best || cur.score > best.score ? cur : best),
			null
		);

		return {
			quiz: quizRecord,
			questions,
			attemptsCount: attempts.length,
			latestAttempt: attempts[0] ?? null,
			bestAttempt
		};
	}

	/**
	 * Server-Side Auto-Grading & Attempt Submission
	 */
	static async submitQuizAttempt(
		quizId: number,
		userId: number,
		answers: Array<{ questionId: number; selectedAnswer: number }>,
		durationSeconds = 0
	) {
		// 1. Fetch quiz & all actual questions with correct answers
		const [quizRecord] = await db
			.select()
			.from(quiz)
			.where(eq(quiz.id, quizId))
			.limit(1);

		if (!quizRecord) throw new Error('Kuis tidak ditemukan');

		const actualQuestions = await db
			.select()
			.from(quizQuestion)
			.where(eq(quizQuestion.quizId, quizId))
			.orderBy(asc(quizQuestion.sortOrder));

		if (actualQuestions.length === 0) {
			throw new Error('Kuis ini tidak memiliki pertanyaan.');
		}

		// 2. Score calculation
		const answerMap = new Map<number, number>();
		for (const a of answers) {
			answerMap.set(a.questionId, a.selectedAnswer);
		}

		let correctCount = 0;
		const reviewList: Array<{
			questionId: number;
			questionText: string;
			imageUrl: string | null;
			options: string[];
			selectedAnswer: number | null;
			correctAnswer: number;
			isCorrect: boolean;
			explanation: string | null;
		}> = [];

		for (const q of actualQuestions) {
			const selected = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
			const isCorrect = selected === q.correctAnswer;

			if (isCorrect) correctCount++;

			reviewList.push({
				questionId: q.id,
				questionText: q.questionText,
				imageUrl: q.imageUrl,
				options: q.options as string[],
				selectedAnswer: selected,
				correctAnswer: q.correctAnswer,
				isCorrect,
				explanation: q.explanation
			});
		}

		const totalQuestions = actualQuestions.length;
		const score = Math.round((correctCount / totalQuestions) * 100);
		const isPassed = score >= quizRecord.passingScore;

		// 3. Save quiz attempt
		const [attemptRecord] = await db
			.insert(quizAttempt)
			.values({
				quizId,
				userId,
				score,
				isPassed,
				durationSeconds,
				answers: answers as any
			})
			.returning();

		// 4. Award points if passing (Idempotent: only on first pass)
		let pointsAwarded = 0;
		if (isPassed) {
			// Find student active class
			const [membership] = await db
				.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
				.from(keanggotaan)
				.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')))
				.limit(1);

			if (membership) {
				const existingPass = await db
					.select({ id: pointLog.id })
					.from(pointLog)
					.where(
						and(
							eq(pointLog.userId, userId),
							eq(pointLog.referenceId, quizId),
							eq(pointLog.referenceType, 'quiz')
						)
					)
					.limit(1);

				if (existingPass.length === 0) {
					const activePeriodeId = await PointsService.getActivePeriodeId();
					const baseQuizPoints = 75; // Standard XP for passing a quiz
					await db.insert(pointLog).values({
						userId,
						kelasInstanceId: membership.kelasInstanceId,
						periodeId: activePeriodeId,
						source: 'task_approved', // or quiz reward
						amount: baseQuizPoints,
						referenceId: quizId,
						referenceType: 'quiz',
						description: `Lulus Kuis ${quizRecord.title} (Skor ${score})`
					});
					pointsAwarded = baseQuizPoints;
				}
			}
		}

		return {
			attemptId: attemptRecord.id,
			score,
			passingScore: quizRecord.passingScore,
			isPassed,
			correctCount,
			totalQuestions,
			pointsAwarded,
			reviewList
		};
	}

	/**
	 * Get attempts for a quiz (Mentor/Guru view)
	 */
	static async getQuizAttemptsList(quizId: number) {
		const attempts = await db
			.select({
				id: quizAttempt.id,
				score: quizAttempt.score,
				isPassed: quizAttempt.isPassed,
				durationSeconds: quizAttempt.durationSeconds,
				attemptedAt: quizAttempt.attemptedAt,
				userId: user.id,
				fullName: user.fullName,
				username: user.username,
				avatarUrl: user.avatarUrl
			})
			.from(quizAttempt)
			.innerJoin(user, eq(quizAttempt.userId, user.id))
			.where(eq(quizAttempt.quizId, quizId))
			.orderBy(desc(quizAttempt.attemptedAt));

		return attempts;
	}
}

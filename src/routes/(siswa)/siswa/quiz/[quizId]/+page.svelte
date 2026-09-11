<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Exam Flow Phase: 'intro' | 'active' | 'result'
	let examPhase = $state<'intro' | 'active' | 'result'>('intro');

	// Active Exam State
	let currentQuestionIndex = $state(0);
	let selectedAnswers = $state<Record<number, number>>({}); // questionId -> optionIndex
	let isSubmitting = $state(false);
	let showConfirmSubmitModal = $state(false);

	// Timer State
	let timeRemainingSeconds = $state<number | null>(null);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;

	// Evaluation Result State (populated after form submission)
	let examResult = $state<any>(null);

	// Check if form returned a result directly
	$effect(() => {
		if (form?.success && form.result) {
			examResult = form.result;
			examPhase = 'result';
			stopTimers();
		} else if (form?.error) {
			toast.error(form.error);
			isSubmitting = false;
		}
	});

	function startExam() {
		if (data.exam.questions.length === 0) {
			toast.error('Kuis ini belum memiliki pertanyaan.');
			return;
		}

		examPhase = 'active';
		currentQuestionIndex = 0;
		selectedAnswers = {};
		elapsedSeconds = 0;

		// Initialize countdown timer if duration is set
		if (data.exam.quiz.durationMinutes) {
			timeRemainingSeconds = data.exam.quiz.durationMinutes * 60;
			timerInterval = setInterval(() => {
				if (timeRemainingSeconds !== null) {
					timeRemainingSeconds--;
					if (timeRemainingSeconds <= 0) {
						stopTimers();
						toast.error('Waktu pengerjaan telah habis! Mengirimkan jawaban...');
						submitExamDirectly();
					}
				}
			}, 1000);
		} else {
			timeRemainingSeconds = null;
		}

		// Track elapsed seconds
		elapsedInterval = setInterval(() => {
			elapsedSeconds++;
		}, 1000);
	}

	function stopTimers() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		if (elapsedInterval) {
			clearInterval(elapsedInterval);
			elapsedInterval = null;
		}
	}

	onDestroy(() => {
		stopTimers();
	});

	function selectAnswer(questionId: number, optionIndex: number) {
		selectedAnswers[questionId] = optionIndex;
	}

	let currentQuestion = $derived(data.exam.questions[currentQuestionIndex]);
	let totalQuestions = $derived(data.exam.questions.length);

	let answeredCount = $derived(
		Object.keys(selectedAnswers).length
	);

	let unansweredCount = $derived(
		Math.max(0, totalQuestions - answeredCount)
	);

	let formattedTimer = $derived.by(() => {
		if (timeRemainingSeconds === null) return null;
		const m = Math.floor(timeRemainingSeconds / 60);
		const s = timeRemainingSeconds % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	let isTimeWarning = $derived(
		timeRemainingSeconds !== null && timeRemainingSeconds <= 300 && timeRemainingSeconds > 60
	);
	let isTimeDanger = $derived(
		timeRemainingSeconds !== null && timeRemainingSeconds <= 60
	);

	// Direct auto-submit on time expired
	function submitExamDirectly() {
		const formEl = document.getElementById('examSubmitForm') as HTMLFormElement;
		if (formEl) formEl.requestSubmit();
	}

	// Payload for submission
	let answersPayload = $derived(
		data.exam.questions.map((q) => ({
			questionId: q.id,
			selectedAnswer: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1
		}))
	);

	function prevQuestion() {
		if (currentQuestionIndex > 0) currentQuestionIndex--;
	}

	function nextQuestion() {
		if (currentQuestionIndex < totalQuestions - 1) currentQuestionIndex++;
	}

	function jumpToQuestion(idx: number) {
		if (idx >= 0 && idx < totalQuestions) currentQuestionIndex = idx;
	}
</script>

<svelte:head>
	<title>{data.exam.quiz.title} — Ujian Siswa NLC</title>
</svelte:head>

<div class="exam-wrapper">
	<!-- ══════════════════════════════════════════════════════════
	     PHASE 1: PRE-EXAM INTRO SCREEN
	     ══════════════════════════════════════════════════════════ -->
	{#if examPhase === 'intro'}
		<div class="page-container intro-container">
			<!-- Header Card -->
			<div class="intro-card panel">
				<div class="intro-top">
					<a href="/siswa/materi" class="back-link">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
						Kembali ke Materi
					</a>
					<span class="badge {data.exam.quiz.quizType === 'pre-test' ? 'badge-primary' : 'badge-hadir'}">
						{data.exam.quiz.quizType.toUpperCase()}
					</span>
				</div>

				<div class="subphase-title-tag">{data.exam.quiz.phaseTitle} &bull; {data.exam.quiz.subPhaseTitle}</div>
				<h1 class="exam-main-title">{data.exam.quiz.title}</h1>
				{#if data.exam.quiz.description}
					<p class="exam-main-desc">{data.exam.quiz.description}</p>
				{/if}

				<!-- Parameters Grid -->
				<div class="params-grid">
					<div class="param-box">
						<div class="param-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
						</div>
						<div class="param-info">
							<span class="param-label">Jumlah Soal</span>
							<span class="param-val">{data.exam.questions.length} Butir</span>
						</div>
					</div>

					<div class="param-box">
						<div class="param-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
						</div>
						<div class="param-info">
							<span class="param-label">KKM Kelulusan</span>
							<span class="param-val">{data.exam.quiz.passingScore}%</span>
						</div>
					</div>

					<div class="param-box">
						<div class="param-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						</div>
						<div class="param-info">
							<span class="param-label">Waktu Pengerjaan</span>
							<span class="param-val">{data.exam.quiz.durationMinutes ? `${data.exam.quiz.durationMinutes} Menit` : 'Tanpa Batas'}</span>
						</div>
					</div>
				</div>

				<!-- Previous Attempt Summary (if any) -->
				{#if data.exam.latestAttempt}
					<div class="past-attempt-banner">
						<div class="past-attempt-icon {data.exam.latestAttempt.isPassed ? 'past-attempt-icon--pass' : 'past-attempt-icon--fail'}">
							{#if data.exam.latestAttempt.isPassed}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							{/if}
						</div>
						<div class="past-attempt-info">
							<div class="past-attempt-title">
								Riwayat Terakhir: Skor <strong>{data.exam.latestAttempt.score}%</strong> &bull;
								<span class="{data.exam.latestAttempt.isPassed ? 'text-green' : 'text-red'}">
									{data.exam.latestAttempt.isPassed ? 'SUDAH LULUS' : 'REMEDIAL'}
								</span>
							</div>
							<div class="past-attempt-sub">
								Dikerjakan pada {new Date(data.exam.latestAttempt.attemptedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
								{#if data.exam.bestAttempt}
									(Skor Terbaik: {data.exam.bestAttempt.score}%)
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Rules Box -->
				<div class="rules-box">
					<h3 class="rules-title">Petunjuk Pengerjaan:</h3>
					<ul class="rules-list">
						<li>Pilihlah satu jawaban yang paling tepat untuk setiap soal pilihan ganda.</li>
						<li>Kamu dapat berpindah antar nomor soal secara bebas sebelum menekan tombol kumpulkan.</li>
						{#if data.exam.quiz.durationMinutes}
							<li>Jawaban akan otomatis terkumpul ketika waktu pengerjaan {data.exam.quiz.durationMinutes} menit habis.</li>
						{/if}
						<li>Nilai dan pembahasan jawaban benar akan langsung ditampilkan seketika setelah kuis dikumpulkan.</li>
					</ul>
				</div>

				<!-- Start CTA -->
				<div class="start-cta-wrap">
					{#if data.exam.questions.length > 0}
						<button type="button" class="btn-primary-gradient start-btn" onclick={startExam}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
							<span>{data.exam.attemptsCount > 0 ? 'Kerjakan Ulang Kuis' : 'Mulai Kerjakan Kuis Sekarang'}</span>
						</button>
					{:else}
						<button type="button" class="btn-primary-gradient start-btn" disabled>
							Soal Belum Tersedia
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     PHASE 2: ACTIVE EXAM ENGINE
	     ══════════════════════════════════════════════════════════ -->
	{#if examPhase === 'active' && currentQuestion}
		<!-- Exam Topbar Header (Sticky) -->
		<header class="exam-topbar">
			<div class="exam-topbar-left">
				<div class="exam-tag-mini">{data.exam.quiz.quizType.toUpperCase()}</div>
				<span class="exam-topbar-title">{data.exam.quiz.title}</span>
			</div>

			<div class="exam-topbar-center">
				{#if formattedTimer}
					<div class="exam-timer-box" class:exam-timer--warning={isTimeWarning} class:exam-timer--danger={isTimeDanger}>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						<span class="timer-digits">{formattedTimer}</span>
					</div>
				{/if}
			</div>

			<div class="exam-topbar-right">
				<div class="progress-indicator">
					<span>Terjawab: <strong>{answeredCount}</strong> / {totalQuestions}</span>
				</div>
				<button type="button" class="btn-create-pill submit-top-btn" onclick={() => showConfirmSubmitModal = true}>
					Kumpulkan
				</button>
			</div>
		</header>

		<!-- Progress Bar Line -->
		<div class="exam-progress-bar" style="width: {((currentQuestionIndex + 1) / totalQuestions) * 100}%;"></div>

		<div class="exam-content-layout">
			<!-- Main Question Area -->
			<main class="question-main-area">
				<div class="question-sheet panel">
					<!-- Question Top Meta -->
					<div class="q-sheet-header">
						<span class="q-badge">Soal {currentQuestionIndex + 1} dari {totalQuestions}</span>
						{#if selectedAnswers[currentQuestion.id] !== undefined}
							<span class="badge badge-hadir">Sudah Dijawab</span>
						{:else}
							<span class="badge badge-neutral">Belum Dijawab</span>
						{/if}
					</div>

					<!-- Question Image (if any) -->
					{#if currentQuestion.imageUrl}
						<div class="question-img-container">
							<img src={currentQuestion.imageUrl} alt="Gambar Soal #{currentQuestionIndex + 1}" />
						</div>
					{/if}

					<!-- Question Text -->
					<div class="q-body-text">{currentQuestion.questionText}</div>

					<!-- Options Radio Selection -->
					<div class="options-container">
						{#each currentQuestion.options as opt, oi}
							{@const isSelected = selectedAnswers[currentQuestion.id] === oi}
							<label class="option-label-card" class:option-label-card--selected={isSelected}>
								<input
									type="radio"
									name="opt_{currentQuestion.id}"
									value={oi}
									checked={isSelected}
									onchange={() => selectAnswer(currentQuestion.id, oi)}
									class="sr-only"
								/>
								<div class="option-letter-circle" class:option-letter-circle--selected={isSelected}>
									{String.fromCharCode(65 + oi)}
								</div>
								<div class="option-text-val">{opt}</div>
							</label>
						{/each}
					</div>

					<!-- Navigation Footer -->
					<div class="q-nav-footer">
						<button
							type="button"
							class="btn-ghost nav-prev-btn"
							disabled={currentQuestionIndex === 0}
							onclick={prevQuestion}
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
							<span>Sebelumnya</span>
						</button>

						<div class="nav-center-info">
							{currentQuestionIndex + 1} / {totalQuestions}
						</div>

						{#if currentQuestionIndex < totalQuestions - 1}
							<button type="button" class="btn-primary-gradient nav-next-btn" onclick={nextQuestion}>
								<span>Berikutnya</span>
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
							</button>
						{:else}
							<button type="button" class="btn-primary-gradient nav-finish-btn" onclick={() => showConfirmSubmitModal = true}>
								<span>Selesai &amp; Kumpulkan</span>
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							</button>
						{/if}
					</div>
				</div>
			</main>

			<!-- Quick Jump Question Grid Sidebar -->
			<aside class="exam-grid-sidebar panel">
				<div class="sidebar-grid-header">
					<h3>Daftar Nomor Soal</h3>
					<div class="grid-legend">
						<span class="legend-item"><span class="legend-dot legend-dot--answered"></span> Terjawab ({answeredCount})</span>
						<span class="legend-item"><span class="legend-dot legend-dot--empty"></span> Belum ({unansweredCount})</span>
					</div>
				</div>

				<div class="question-numbers-grid">
					{#each data.exam.questions as q, qi}
						{@const isAnswered = selectedAnswers[q.id] !== undefined}
						{@const isCurrent = qi === currentQuestionIndex}
						<button
							type="button"
							class="q-num-btn"
							class:q-num-btn--answered={isAnswered}
							class:q-num-btn--current={isCurrent}
							onclick={() => jumpToQuestion(qi)}
						>
							{qi + 1}
						</button>
					{/each}
				</div>

				<div class="sidebar-submit-action">
					<button type="button" class="btn-primary-gradient w-full" onclick={() => showConfirmSubmitModal = true}>
						Kumpulkan Jawaban
					</button>
				</div>
			</aside>
		</div>

		<!-- Hidden form for SvelteKit form action submission -->
		<form
			id="examSubmitForm"
			method="POST"
			action="?/submitAttempt"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					showConfirmSubmitModal = false;
					await update();
				};
			}}
			style="display:none;"
		>
			<input type="hidden" name="answers" value={JSON.stringify(answersPayload)} />
			<input type="hidden" name="durationSeconds" value={elapsedSeconds} />
		</form>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     PHASE 3: POST-EXAM EVALUATION RESULT & REVIEW
	     ══════════════════════════════════════════════════════════ -->
	{#if examPhase === 'result' && examResult}
		<div class="page-container result-container">
			<!-- Result Score Hero Card -->
			<div class="result-hero-card panel" class:result-hero-card--pass={examResult.isPassed} class:result-hero-card--fail={!examResult.isPassed}>
				<div class="result-badge-wrap">
					{#if examResult.isPassed}
						<div class="result-status-pill result-status-pill--pass">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
							<span>SELAMAT! KAMU LULUS</span>
						</div>
					{:else}
						<div class="result-status-pill result-status-pill--fail">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							<span>BELUM MENCAPAI KKM (REMEDIAL)</span>
						</div>
					{/if}
				</div>

				<div class="score-circle-display">
					<div class="score-number">{examResult.score}</div>
					<div class="score-max">/ 100</div>
				</div>

				<h2 class="result-hero-title">
					{#if examResult.isPassed}
						Kerja Bagus! Penguasaan materimu sangat baik.
					{:else}
						Tetap Semangat! Pelajari kembali materi dan coba ulangi kuis.
					{/if}
				</h2>

				<p class="result-hero-sub">
					Kamu berhasil menjawab <strong>{examResult.correctCount} dari {examResult.totalQuestions} soal</strong> dengan benar.
					(Batas KKM: {examResult.passingScore}%)
				</p>

				{#if examResult.pointsAwarded > 0}
					<div class="points-reward-pill">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
						<span>+{examResult.pointsAwarded} XP Poin Berhasil Ditambahkan ke Profilmu!</span>
					</div>
				{/if}

				<div class="result-actions-row">
					<button type="button" class="btn-primary-gradient" onclick={startExam}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
						<span>Ulangi Kuis</span>
					</button>
					<a href="/siswa/materi" class="btn-ghost">
						Kembali ke Daftar Materi
					</a>
				</div>
			</div>

			<!-- Question Review List -->
			<div class="review-section">
				<div class="section-title-row">
					<h3 class="review-title">Pembahasan &amp; Analisis Jawaban</h3>
					<span class="badge badge-neutral">{examResult.reviewList.length} Soal Diperiksa</span>
				</div>

				<div class="review-cards-list">
					{#each examResult.reviewList as r, ri}
						<article class="review-card panel" class:review-card--correct={r.isCorrect} class:review-card--incorrect={!r.isCorrect}>
							<div class="review-card-top">
								<div class="review-num-badge">Soal #{ri + 1}</div>
								{#if r.isCorrect}
									<div class="review-status-tag review-status-tag--correct">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
										<span>Jawaban Benar</span>
									</div>
								{:else}
									<div class="review-status-tag review-status-tag--incorrect">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
										<span>Jawaban Salah</span>
									</div>
								{/if}
							</div>

							{#if r.imageUrl}
								<div class="review-img-wrap">
									<img src={r.imageUrl} alt="Gambar Soal #{ri + 1}" />
								</div>
							{/if}

							<p class="review-question-text">{r.questionText}</p>

							<div class="review-options-list">
								{#each r.options as opt, oi}
									{@const isStudentChoice = r.selectedAnswer === oi}
									{@const isRightAnswer = r.correctAnswer === oi}
									<div
										class="review-option-row"
										class:review-option-row--correct={isRightAnswer}
										class:review-option-row--wrong={isStudentChoice && !isRightAnswer}
									>
										<span class="review-opt-letter" class:review-opt-letter--correct={isRightAnswer} class:review-opt-letter--wrong={isStudentChoice && !isRightAnswer}>
											{String.fromCharCode(65 + oi)}
										</span>
										<span class="review-opt-text">{opt}</span>

										{#if isRightAnswer}
											<span class="review-opt-badge review-opt-badge--green">Jawaban Benar</span>
										{:else if isStudentChoice}
											<span class="review-opt-badge review-opt-badge--red">Pilihan Anda</span>
										{/if}
									</div>
								{/each}
							</div>

							{#if r.explanation}
								<div class="review-explanation-box">
									<div class="exp-head">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
										<span>Pembahasan Soal:</span>
									</div>
									<p class="exp-body">{r.explanation}</p>
								</div>
							{/if}
						</article>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Confirm Submit Modal -->
<ConfirmModal
	bind:open={showConfirmSubmitModal}
	title="Kumpulkan Jawaban Kuis?"
	message={
		unansweredCount > 0
			? `Peringatan: Terdapat ${unansweredCount} soal yang belum Anda jawab. Apakah Anda yakin ingin tetap mengumpulkan kuis sekarang?`
			: `Semua ${totalQuestions} soal telah dijawab. Apakah Anda yakin ingin mengumpulkan kuis sekarang dan melihat hasil nilai?`
	}
	confirmText={isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan'}
	cancelText="Periksa Kembali"
	variant={unansweredCount > 0 ? 'danger' : 'primary'}
	onconfirm={() => {
		submitExamDirectly();
	}}
/>

<style>
	.exam-wrapper {
		min-height: 100vh;
		background: var(--bg-base);
	}

	/* ── Intro Screen ── */
	.intro-container {
		max-width: 800px;
		margin: 0 auto;
		padding-top: 40px;
		padding-bottom: 60px;
	}

	.intro-card {
		padding: 36px 32px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.intro-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
	}

	.back-link:hover { color: var(--primary); }

	.subphase-title-tag {
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.exam-main-title {
		font-family: var(--font-macro);
		font-size: clamp(1.6rem, 3.5vw, 2.2rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.exam-main-desc {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.params-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 8px;
	}

	.param-box {
		padding: 14px;
		background: var(--bg-inset);
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.param-icon {
		width: 38px;
		height: 38px;
		border-radius: var(--radius-sm);
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.param-info {
		display: flex;
		flex-direction: column;
	}

	.param-label {
		font-family: var(--font-body);
		font-size: 11px;
		color: var(--text-muted);
	}

	.param-val {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.past-attempt-banner {
		padding: 14px 18px;
		background: #f8fafc;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.past-attempt-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.past-attempt-icon--pass { background: #dcfce7; color: #16a34a; }
	.past-attempt-icon--fail { background: #fee2e2; color: #dc2626; }

	.past-attempt-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.past-attempt-sub {
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-muted);
	}

	.rules-box {
		padding: 16px 20px;
		background: var(--blue-dim);
		border: 1px solid var(--blue-border);
		border-radius: var(--radius-md);
	}

	.rules-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: #1e40af;
		margin: 0 0 8px;
	}

	.rules-list {
		padding-left: 20px;
		margin: 0;
		font-size: 13px;
		color: #1e3a8a;
		line-height: 1.6;
	}

	.rules-list li { margin-bottom: 4px; }

	.start-cta-wrap {
		margin-top: 12px;
	}

	.start-btn {
		width: 100%;
		padding: 14px 24px;
		font-size: 15px;
		justify-content: center;
	}

	/* ── Active Exam Screen ── */
	.exam-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 24px;
		background: #ffffff;
		border-bottom: 1px solid var(--border-hard);
		position: sticky;
		top: 0;
		z-index: 90;
		gap: 16px;
	}

	.exam-topbar-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}

	.exam-tag-mini {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: #4f46e5;
		background: #eef2ff;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.exam-topbar-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.exam-timer-box {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		background: var(--bg-inset);
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.exam-timer--warning {
		background: var(--amber-dim);
		border-color: var(--amber-border);
		color: var(--amber);
	}

	.exam-timer--danger {
		background: var(--red-dim);
		border-color: var(--red-border);
		color: var(--red);
		animation: pulse-danger 1s infinite alternate;
	}

	@keyframes pulse-danger {
		from { opacity: 1; }
		to { opacity: 0.6; }
	}

	.exam-topbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.progress-indicator {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
	}

	.exam-progress-bar {
		height: 3px;
		background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%);
		transition: width 150ms ease;
	}

	.exam-content-layout {
		max-width: 1280px;
		margin: 24px auto;
		padding: 0 24px 60px;
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 24px;
		align-items: flex-start;
	}

	.question-sheet {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		background: #ffffff;
	}

	.q-sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.q-badge {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 800;
		color: #4f46e5;
	}

	.question-img-container {
		max-width: 100%;
		max-height: 320px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--border-hard);
		background: #000;
	}

	.question-img-container img {
		width: 100%;
		max-height: 320px;
		object-fit: contain;
	}

	.q-body-text {
		font-family: var(--font-macro);
		font-size: 16.5px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.6;
	}

	.options-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 8px;
	}

	.option-label-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
		border: 1.5px solid var(--border-hard);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		cursor: pointer;
		transition: all 140ms ease;
	}

	.option-label-card:hover {
		border-color: #a5b4fc;
		background: #ffffff;
		transform: translateX(3px);
	}

	.option-label-card--selected {
		border-color: var(--primary) !important;
		background: #eef2ff !important;
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.option-letter-circle {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #ffffff;
		border: 1.5px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-secondary);
		flex-shrink: 0;
		transition: all 140ms;
	}

	.option-letter-circle--selected {
		background: var(--primary);
		border-color: var(--primary);
		color: #ffffff;
	}

	.option-text-val {
		font-family: var(--font-body);
		font-size: 14.5px;
		color: var(--text-primary);
		line-height: 1.4;
	}

	.q-nav-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 20px;
		border-top: 1px solid var(--border-soft);
		margin-top: 12px;
	}

	.nav-prev-btn, .nav-next-btn, .nav-finish-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.nav-center-info {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-muted);
	}

	/* Question Grid Sidebar */
	.exam-grid-sidebar {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #ffffff;
		position: sticky;
		top: 80px;
	}

	.sidebar-grid-header h3 {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		margin: 0 0 6px;
	}

	.grid-legend {
		display: flex;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.legend-dot--answered { background: var(--primary); }
	.legend-dot--empty { background: var(--border-hard); }

	.question-numbers-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
	}

	.q-num-btn {
		height: 38px;
		border-radius: var(--radius-md);
		border: 1.5px solid var(--border-hard);
		background: var(--bg-inset);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 130ms;
	}

	.q-num-btn:hover {
		border-color: #a5b4fc;
		background: #ffffff;
	}

	.q-num-btn--answered {
		background: var(--primary) !important;
		border-color: var(--primary) !important;
		color: #ffffff !important;
	}

	.q-num-btn--current {
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.35);
	}

	/* ── Result & Review Screen ── */
	.result-container {
		max-width: 900px;
		margin: 0 auto;
		padding-top: 36px;
		padding-bottom: 60px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.result-hero-card {
		padding: 40px 32px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		background: #ffffff;
	}

	.result-hero-card--pass {
		border-color: #86efac;
		background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
	}

	.result-hero-card--fail {
		border-color: #fca5a5;
		background: linear-gradient(180deg, #fef2f2 0%, #ffffff 100%);
	}

	.result-status-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 800;
		padding: 4px 14px;
		border-radius: 9999px;
	}

	.result-status-pill--pass { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
	.result-status-pill--fail { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

	.score-circle-display {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin: 10px 0 4px;
	}

	.score-number {
		font-family: var(--font-macro);
		font-size: clamp(3.5rem, 8vw, 5rem);
		font-weight: 900;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.04em;
	}

	.score-max {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.result-hero-title {
		font-family: var(--font-macro);
		font-size: clamp(1.2rem, 3vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.result-hero-sub {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-secondary);
		margin: 0;
	}

	.points-reward-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: #b45309;
		background: #fef3c7;
		border: 1px solid #fde68a;
		padding: 6px 16px;
		border-radius: 9999px;
		margin: 4px 0;
	}

	.result-actions-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 12px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.review-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.review-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.review-cards-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.review-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		background: #ffffff;
	}

	.review-card--correct { border-left: 4px solid #16a34a; }
	.review-card--incorrect { border-left: 4px solid #dc2626; }

	.review-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.review-num-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		color: var(--text-muted);
	}

	.review-status-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
	}

	.review-status-tag--correct { color: #16a34a; }
	.review-status-tag--incorrect { color: #dc2626; }

	.review-img-wrap {
		max-width: 100%;
		max-height: 240px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--border-hard);
	}

	.review-img-wrap img {
		max-width: 100%;
		max-height: 240px;
		object-fit: contain;
	}

	.review-question-text {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.5;
		margin: 0;
	}

	.review-options-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.review-option-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		font-size: 13.5px;
	}

	.review-option-row--correct {
		background: #f0fdf4 !important;
		border-color: #86efac !important;
	}

	.review-option-row--wrong {
		background: #fef2f2 !important;
		border-color: #fca5a5 !important;
	}

	.review-opt-letter {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		flex-shrink: 0;
	}

	.review-opt-letter--correct { background: #16a34a; border-color: #16a34a; color: #ffffff; }
	.review-opt-letter--wrong { background: #dc2626; border-color: #dc2626; color: #ffffff; }

	.review-opt-text { flex: 1; }

	.review-opt-badge {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.review-opt-badge--green { background: #dcfce7; color: #15803d; }
	.review-opt-badge--red { background: #fee2e2; color: #b91c1c; }

	.review-explanation-box {
		padding: 12px 16px;
		background: var(--blue-dim);
		border: 1px solid var(--blue-border);
		border-radius: var(--radius-md);
		font-size: 13px;
	}

	.exp-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 800;
		color: #1d4ed8;
		margin-bottom: 4px;
	}

	.exp-body {
		color: #1e3a8a;
		margin: 0;
		line-height: 1.5;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0,0,0,0);
		border: 0;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.exam-content-layout {
			grid-template-columns: 1fr;
		}
		.exam-grid-sidebar {
			position: static;
		}
		.params-grid {
			grid-template-columns: 1fr;
		}
		.question-sheet {
			padding: 20px 16px;
		}
	}
</style>

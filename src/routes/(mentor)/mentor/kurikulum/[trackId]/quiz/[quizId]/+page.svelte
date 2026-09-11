<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Tab switcher: 'questions' | 'results'
	let activeTab = $state<'questions' | 'results'>('questions');

	// Modals State
	let showEditQuizModal = $state(false);
	let showDeleteQuizModal = $state(false);
	let showQuestionModal = $state(false);
	let showImportModal = $state(false);
	let showDeleteQuestionModal = $state(false);
	let deleteTargetQuestionId = $state<number | null>(null);

	// Single Question Form State
	let isEditingQuestion = $state(false);
	let editingQuestionId = $state<number | null>(null);
	let questionText = $state('');
	let questionImageUrl = $state<string | null>(null);
	let questionOptions = $state<string[]>(['', '', '', '']);
	let questionCorrectAnswer = $state(0);
	let questionExplanation = $state('');
	let isUploadingImage = $state(false);

	function openAddQuestionModal() {
		isEditingQuestion = false;
		editingQuestionId = null;
		questionText = '';
		questionImageUrl = null;
		questionOptions = ['', '', '', ''];
		questionCorrectAnswer = 0;
		questionExplanation = '';
		showQuestionModal = true;
	}

	function openEditQuestionModal(q: typeof data.quiz.questions[0]) {
		isEditingQuestion = true;
		editingQuestionId = q.id;
		questionText = q.questionText;
		questionImageUrl = q.imageUrl || null;
		questionOptions = Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ['', ''];
		questionCorrectAnswer = q.correctAnswer;
		questionExplanation = q.explanation || '';
		showQuestionModal = true;
	}

	function addOptionField() {
		if (questionOptions.length < 6) {
			questionOptions = [...questionOptions, ''];
		}
	}

	function removeOptionField(index: number) {
		if (questionOptions.length > 2) {
			questionOptions = questionOptions.filter((_, i) => i !== index);
			if (questionCorrectAnswer >= questionOptions.length) {
				questionCorrectAnswer = questionOptions.length - 1;
			}
		}
	}

	async function handleImageUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isUploadingImage = true;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('category', 'quiz');

		try {
			const res = await fetch('/api/storage/upload', {
				method: 'POST',
				body: formData
			});
			const json = await res.json();
			if (json.url) {
				questionImageUrl = json.url;
				toast.success('Gambar soal berhasil diunggah!');
			} else {
				toast.error(json.message || 'Gagal mengunggah gambar');
			}
		} catch {
			toast.error('Terjadi kesalahan saat mengunggah gambar');
		} finally {
			isUploadingImage = false;
		}
	}

	// Bulk JSON Import State
	let importJsonText = $state('');
	let importReplaceExisting = $state(false);
	let importPreviewCount = $state<number | null>(null);
	let importPreviewError = $state<string | null>(null);

	function handleJsonTextInput() {
		if (!importJsonText.trim()) {
			importPreviewCount = null;
			importPreviewError = null;
			return;
		}
		try {
			const parsed = JSON.parse(importJsonText);
			if (!Array.isArray(parsed)) {
				importPreviewError = 'JSON harus berupa Array [ ... ]';
				importPreviewCount = null;
				return;
			}
			importPreviewCount = parsed.length;
			importPreviewError = null;
		} catch (err: any) {
			importPreviewError = 'Sintaks JSON tidak valid';
			importPreviewCount = null;
		}
	}

	function handleFileUploadJson(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			importJsonText = (event.target?.result as string) || '';
			handleJsonTextInput();
		};
		reader.readAsText(file);
	}

	function loadSampleJson() {
		const sample = [
			{
				question: "Perangkat jaringan apa yang beroperasi pada OSI Layer 3?",
				imageUrl: null,
				options: ["Switch", "Router", "Hub", "Repeater", "Bridge"],
				answer: 1,
				explanation: "Router beroperasi pada Network Layer (Layer 3) dan berfungsi melakukan routing paket IP."
			},
			{
				question: "Berapa subnet mask default untuk alamat IP kelas C /24?",
				imageUrl: null,
				options: ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.128"],
				answer: 2,
				explanation: "Subnet mask default /24 adalah 255.255.255.0"
			}
		];
		importJsonText = JSON.stringify(sample, null, 2);
		handleJsonTextInput();
	}

	// Calculate Quiz Statistics
	let stats = $derived.by(() => {
		const totalAttempts = data.attempts.length;
		const passedAttempts = data.attempts.filter((a) => a.isPassed).length;
		const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
		const avgScore = totalAttempts > 0 ? Math.round(data.attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts) : 0;
		return { totalAttempts, passedAttempts, passRate, avgScore };
	});
</script>

<svelte:head>
	<title>Builder Kuis: {data.quiz.title} — NLC Mentor</title>
</svelte:head>

<div class="page-container">
	<!-- Top Navigation Breadcrumb & Actions Card -->
	<header class="quiz-header-card panel">
		<div class="header-top-row">
			<a href="/mentor/kurikulum/{data.trackId}" class="back-link">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				Kembali ke Kurikulum
			</a>
			<div class="header-badges">
				<span class="badge {data.quiz.quizType === 'pre-test' ? 'badge-primary' : 'badge-hadir'}">
					{data.quiz.quizType.toUpperCase()}
				</span>
				<span class="badge badge-neutral">KKM {data.quiz.passingScore}%</span>
				{#if data.quiz.durationMinutes}
					<span class="badge badge-neutral">{data.quiz.durationMinutes} Menit</span>
				{/if}
			</div>
		</div>

		<div class="header-main-content">
			<div class="title-wrap">
				<div class="subphase-tag">{data.quiz.phaseTitle} &bull; {data.quiz.subPhaseTitle}</div>
				<h1 class="quiz-title">{data.quiz.title}</h1>
				{#if data.quiz.description}
					<p class="quiz-desc">{data.quiz.description}</p>
				{/if}
			</div>

			<div class="header-actions">
				<button type="button" class="btn-create-pill" onclick={openAddQuestionModal}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Tambah Soal
				</button>
				<button type="button" class="btn-secondary-head-pill" onclick={() => showImportModal = true}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
					Import JSON
				</button>
				<button type="button" class="btn-secondary-head-pill" onclick={() => showEditQuizModal = true}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
					Pengaturan
				</button>
			</div>
		</div>
	</header>

	<!-- Metrics Overview Grid -->
	<section class="stats-grid">
		<StatCard label="Jumlah Soal" value={data.quiz.questions.length} subtext="Pilihan Ganda" variant="track" />
		<StatCard label="Total Pengerjaan" value={stats.totalAttempts} subtext="{stats.passedAttempts} siswa lulus" variant="attendance" />
		<StatCard label="Tingkat Kelulusan" value="{stats.passRate}%" subtext="KKM: {data.quiz.passingScore}%" variant="approved" />
		<StatCard label="Rata-rata Skor" value="{stats.avgScore}" subtext="Skala 0 - 100" variant="streak" />
	</section>

	<!-- Tab Switcher -->
	<div class="tabs-nav-card panel">
		<button
			type="button"
			class="nav-tab-btn"
			class:nav-tab-btn--active={activeTab === 'questions'}
			onclick={() => activeTab = 'questions'}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
			<span>Daftar Pertanyaan</span>
			<span class="tab-pill">{data.quiz.questions.length}</span>
		</button>
		<button
			type="button"
			class="nav-tab-btn"
			class:nav-tab-btn--active={activeTab === 'results'}
			onclick={() => activeTab = 'results'}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			<span>Hasil & Nilai Siswa</span>
			<span class="tab-pill">{data.attempts.length}</span>
		</button>
	</div>

	<!-- TAB 1: QUESTIONS LIST -->
	{#if activeTab === 'questions'}
		{#if data.quiz.questions.length === 0}
			<div class="panel">
				<EmptyState
					title="Belum Ada Pertanyaan"
					description="Kuis ini belum memiliki soal. Tambahkan soal satu per satu atau gunakan fitur Import JSON dari Google Form / Quizizz."
					iconTheme="indigo"
					actionText="Tambah Soal Pertama"
					onAction={openAddQuestionModal}
				/>
			</div>
		{:else}
			<div class="questions-list">
				{#each data.quiz.questions as q, qi}
					<article class="question-card panel">
						<div class="question-card-header">
							<div class="question-num-badge">Soal #{qi + 1}</div>
							<div class="question-actions">
								<button type="button" class="btn-icon-action" onclick={() => openEditQuestionModal(q)} title="Edit Soal">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								</button>
								<button
									type="button"
									class="btn-icon-action btn-icon-action--danger"
									onclick={() => { deleteTargetQuestionId = q.id; showDeleteQuestionModal = true; }}
									title="Hapus Soal"
								>
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							</div>
						</div>

						{#if q.imageUrl}
							<div class="question-img-preview">
								<img src={q.imageUrl} alt="Gambar Soal #{qi + 1}" loading="lazy" />
							</div>
						{/if}

						<p class="question-text">{q.questionText}</p>

						<div class="options-grid">
							{#each q.options as opt, oi}
								{@const isCorrect = oi === q.correctAnswer}
								<div class="option-row" class:option-row--correct={isCorrect}>
									<span class="option-letter" class:option-letter--correct={isCorrect}>
										{String.fromCharCode(65 + oi)}
									</span>
									<span class="option-text">{opt}</span>
									{#if isCorrect}
										<span class="correct-tag">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
											Jawaban Benar
										</span>
									{/if}
								</div>
							{/each}
						</div>

						{#if q.explanation}
							<div class="explanation-box">
								<div class="exp-label">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
									Pembahasan:
								</div>
								<p class="exp-text">{q.explanation}</p>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- TAB 2: STUDENT RESULTS -->
	{#if activeTab === 'results'}
		{#if data.attempts.length === 0}
			<div class="panel">
				<EmptyState
					title="Belum Ada Siswa Mengerjakan"
					description="Hasil nilai dan analisis jawaban siswa akan muncul di sini setelah ada yang menyelesaikan kuis."
					iconTheme="slate"
				/>
			</div>
		{:else}
			<div class="table-container panel">
				<table class="data-table">
					<thead>
						<tr>
							<th>Siswa</th>
							<th>Skor</th>
							<th>Status</th>
							<th>Durasi</th>
							<th>Waktu Submit</th>
						</tr>
					</thead>
					<tbody>
						{#each data.attempts as att}
							<tr>
								<td>
									<div class="student-cell">
										<div class="student-avatar">
											{#if att.avatarUrl}
												<img src={att.avatarUrl} alt={att.fullName} />
											{:else}
												{att.fullName.charAt(0)}
											{/if}
										</div>
										<div class="student-meta">
											<span class="student-name">{att.fullName}</span>
											<span class="student-sub">@{att.username}</span>
										</div>
									</div>
								</td>
								<td>
									<span class="score-pill {att.score >= data.quiz.passingScore ? 'score-pill--pass' : 'score-pill--fail'}">
										{att.score} / 100
									</span>
								</td>
								<td>
									{#if att.isPassed}
										<span class="badge badge-hadir">LULUS</span>
									{:else}
										<span class="badge badge-absen">REMEDIAL</span>
									{/if}
								</td>
								<td>
									<span class="mono-meta">
										{att.durationSeconds ? `${Math.floor(att.durationSeconds / 60)}m ${att.durationSeconds % 60}s` : '-'}
									</span>
								</td>
								<td>
									<span class="mono-meta">
										{new Date(att.attemptedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- ══ MODAL 1: ADD / EDIT QUESTION ══ -->
{#if showQuestionModal}
	<div class="modal-overlay" onclick={() => showQuestionModal = false}>
		<div class="modal-card panel" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">{isEditingQuestion ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Baru'}</h3>
				<button type="button" class="btn-close-modal" onclick={() => showQuestionModal = false}>&times;</button>
			</div>

			<form
				method="POST"
				action={isEditingQuestion ? '?/updateQuestion' : '?/addQuestion'}
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toast.success(isEditingQuestion ? 'Pertanyaan diperbarui!' : 'Pertanyaan ditambahkan!');
							showQuestionModal = false;
							await update();
						} else if (result.type === 'failure') {
							toast.error((result.data as any)?.error || 'Gagal menyimpan pertanyaan');
						}
					};
				}}
				class="modal-form"
			>
				{#if isEditingQuestion}
					<input type="hidden" name="questionId" value={editingQuestionId} />
				{/if}

				<!-- Question Text -->
				<div class="form-field">
					<label class="field-label" for="qText">Teks Pertanyaan *</label>
					<textarea
						id="qText"
						name="question"
						bind:value={questionText}
						required
						rows="3"
						class="field-input"
						placeholder="Tulis pertanyaan soal di sini..."
					></textarea>
				</div>

				<!-- Image Attachment -->
				<div class="form-field">
					<label class="field-label" for="qImg">Gambar Pendukung Soal (Opsional)</label>
					<div class="img-uploader-row">
						<input
							type="text"
							name="imageUrl"
							bind:value={questionImageUrl}
							class="field-input flex-1"
							placeholder="https://... atau unggah gambar"
						/>
						<label class="btn-secondary-head-pill upload-file-btn">
							<input type="file" accept="image/*" onchange={handleImageUpload} class="sr-only" />
							{#if isUploadingImage}
								<span>Mengunggah...</span>
							{:else}
								<span>Unggah Gambar</span>
							{/if}
						</label>
					</div>
					{#if questionImageUrl}
						<div class="img-preview-thumb">
							<img src={questionImageUrl} alt="Thumbnail preview" />
							<button type="button" class="btn-del-img" onclick={() => questionImageUrl = null}>Hapus Gambar</button>
						</div>
					{/if}
				</div>

				<!-- Options Builder -->
				<div class="form-field">
					<div class="options-head-row">
						<label class="field-label" for="optList">Pilihan Jawaban (Pilih radio untuk jawaban benar) *</label>
						{#if questionOptions.length < 6}
							<button type="button" class="btn-add-opt" onclick={addOptionField}>+ Tambah Opsi</button>
						{/if}
					</div>

					<input type="hidden" name="options" value={JSON.stringify(questionOptions)} />
					<input type="hidden" name="answer" value={questionCorrectAnswer} />

					<div class="options-builder-list" id="optList">
						{#each questionOptions as opt, oi}
							<div class="option-builder-item" class:option-builder-item--correct={questionCorrectAnswer === oi}>
								<input
									type="radio"
									name="correctAnswerRadio"
									checked={questionCorrectAnswer === oi}
									onchange={() => questionCorrectAnswer = oi}
									class="correct-radio"
									title="Tandai sebagai jawaban benar"
								/>
								<span class="opt-index-badge">{String.fromCharCode(65 + oi)}</span>
								<input
									type="text"
									bind:value={questionOptions[oi]}
									required
									placeholder="Tulis opsi {String.fromCharCode(65 + oi)}..."
									class="field-input flex-1"
								/>
								{#if questionOptions.length > 2}
									<button
										type="button"
										class="btn-del-opt"
										onclick={() => removeOptionField(oi)}
										title="Hapus Opsi"
									>
										&times;
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Explanation -->
				<div class="form-field">
					<label class="field-label" for="qExp">Pembahasan / Penjelasan Jawaban (Opsional)</label>
					<textarea
						id="qExp"
						name="explanation"
						bind:value={questionExplanation}
						rows="2"
						class="field-input"
						placeholder="Penjelasan mengapa jawaban tersebut benar (tampil setelah siswa submit)..."
					></textarea>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn-ghost" onclick={() => showQuestionModal = false}>Batal</button>
					<button type="submit" class="btn-primary-gradient">
						{isEditingQuestion ? 'Simpan Perubahan' : 'Tambah Pertanyaan'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ══ MODAL 2: BULK JSON IMPORT ══ -->
{#if showImportModal}
	<div class="modal-overlay" onclick={() => showImportModal = false}>
		<div class="modal-card panel modal-card--lg" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h3 class="modal-title">Import Soal dari JSON</h3>
					<p class="modal-sub">Format kompatibel dengan Google Forms Script &amp; Quizizz</p>
				</div>
				<button type="button" class="btn-close-modal" onclick={() => showImportModal = false}>&times;</button>
			</div>

			<form
				method="POST"
				action="?/bulkImport"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toast.success((result.data as any)?.message || 'Soal berhasil diimpor!');
							showImportModal = false;
							importJsonText = '';
							await update();
						} else if (result.type === 'failure') {
							toast.error((result.data as any)?.error || 'Gagal mengimpor soal');
						}
					};
				}}
				class="modal-form"
			>
				<div class="import-tools-bar">
					<label class="btn-secondary-head-pill upload-file-btn">
						<input type="file" accept=".json,application/json" onchange={handleFileUploadJson} class="sr-only" />
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Pilih File .json
					</label>
					<button type="button" class="btn-ghost btn-sm" onclick={loadSampleJson}>
						Muat Contoh Template
					</button>
				</div>

				<div class="form-field">
					<label class="field-label" for="jsonArea">Paste JSON Konten Soal *</label>
					<textarea
						id="jsonArea"
						name="jsonContent"
						bind:value={importJsonText}
						oninput={handleJsonTextInput}
						required
						rows="10"
						class="field-input font-mono-input"
						placeholder={`[\n  {\n    "question": "Contoh pertanyaan?",\n    "options": ["A", "B", "C", "D"],\n    "answer": 0\n  }\n]`}
					></textarea>
				</div>

				<!-- Live Preview Status Indicator -->
				{#if importPreviewError}
					<div class="import-status-box import-status-box--error">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<span>{importPreviewError}</span>
					</div>
				{:else if importPreviewCount !== null}
					<div class="import-status-box import-status-box--success">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
						<span>Format valid: Terdeteksi <strong>{importPreviewCount} soal</strong> siap diimpor.</span>
					</div>
				{/if}

				<div class="form-checkbox-row">
					<input
						type="checkbox"
						id="replaceEx"
						name="replaceExisting"
						value="true"
						bind:checked={importReplaceExisting}
						class="field-checkbox"
					/>
					<label for="replaceEx" class="checkbox-label">
						Gantikan semua {data.quiz.questions.length} soal yang ada (Centang jika ingin overwrite total)
					</label>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn-ghost" onclick={() => showImportModal = false}>Batal</button>
					<button type="submit" class="btn-primary-gradient" disabled={importPreviewError !== null || !importJsonText.trim()}>
						Mulai Import Soal
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ══ MODAL 3: EDIT QUIZ METADATA ══ -->
{#if showEditQuizModal}
	<div class="modal-overlay" onclick={() => showEditQuizModal = false}>
		<div class="modal-card panel" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3 class="modal-title">Pengaturan Kuis</h3>
				<button type="button" class="btn-close-modal" onclick={() => showEditQuizModal = false}>&times;</button>
			</div>

			<form
				method="POST"
				action="?/updateQuiz"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toast.success('Pengaturan kuis berhasil disimpan!');
							showEditQuizModal = false;
							await update();
						} else if (result.type === 'failure') {
							toast.error((result.data as any)?.error || 'Gagal menyimpan pengaturan');
						}
					};
				}}
				class="modal-form"
			>
				<div class="form-field">
					<label class="field-label" for="qTitle">Judul Kuis *</label>
					<input
						type="text"
						id="qTitle"
						name="title"
						value={data.quiz.title}
						required
						class="field-input"
					/>
				</div>

				<div class="form-row-2">
					<div class="form-field">
						<label class="field-label" for="qType">Tipe Kuis *</label>
						<select id="qType" name="quizType" value={data.quiz.quizType} class="field-input">
							<option value="pre-test">Pre-Test (Evaluasi Awal)</option>
							<option value="post-test">Post-Test (Evaluasi Akhir)</option>
						</select>
					</div>

					<div class="form-field">
						<label class="field-label" for="qPassing">Nilai KKM (0 - 100) *</label>
						<input
							type="number"
							id="qPassing"
							name="passingScore"
							value={data.quiz.passingScore}
							min="0"
							max="100"
							required
							class="field-input"
						/>
					</div>
				</div>

				<div class="form-field">
					<label class="field-label" for="qDuration">Batas Waktu Pengerjaan (Menit)</label>
					<input
						type="number"
						id="qDuration"
						name="durationMinutes"
						value={data.quiz.durationMinutes ?? ''}
						min="1"
						max="180"
						placeholder="Kosongkan jika tidak ada batas waktu"
						class="field-input"
					/>
				</div>

				<div class="form-field">
					<label class="field-label" for="qDesc">Deskripsi / Petunjuk Pengerjaan</label>
					<textarea
						id="qDesc"
						name="description"
						rows="2"
						class="field-input"
						placeholder="Petunjuk singkat sebelum siswa mulai..."
					>{data.quiz.description ?? ''}</textarea>
				</div>

				<div class="modal-footer-between">
					<button
						type="button"
						class="btn-danger-text"
						onclick={() => { showEditQuizModal = false; showDeleteQuizModal = true; }}
					>
						Hapus Kuis
					</button>

					<div class="footer-btns-right">
						<button type="button" class="btn-ghost" onclick={() => showEditQuizModal = false}>Batal</button>
						<button type="submit" class="btn-primary-gradient">Simpan Pengaturan</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Confirm Delete Question Modal -->
<ConfirmModal
	bind:open={showDeleteQuestionModal}
	title="Hapus Pertanyaan?"
	message="Pertanyaan ini akan dihapus dari kuis. Tindakan ini tidak dapat dibatalkan."
	confirmText="Ya, Hapus"
	cancelText="Batal"
	variant="danger"
	onconfirm={async () => {
		if (!deleteTargetQuestionId) return;
		const formData = new FormData();
		formData.append('questionId', String(deleteTargetQuestionId));
		const res = await fetch('?/deleteQuestion', { method: 'POST', body: formData });
		if (res.ok) {
			toast.success('Pertanyaan berhasil dihapus!');
			window.location.reload();
		} else {
			toast.error('Gagal menghapus pertanyaan');
		}
		showDeleteQuestionModal = false;
	}}
/>

<!-- Confirm Delete Quiz Modal -->
<ConfirmModal
	bind:open={showDeleteQuizModal}
	title="Hapus Kuis Ini?"
	message="Seluruh pertanyaan dan riwayat nilai siswa dalam kuis '{data.quiz.title}' akan dihapus secara permanen."
	confirmText="Ya, Hapus Kuis"
	cancelText="Batal"
	variant="danger"
	onconfirm={async () => {
		const formData = new FormData();
		const res = await fetch('?/deleteQuiz', { method: 'POST', body: formData });
		if (res.redirected) {
			window.location.href = res.url;
		} else {
			window.location.href = `/mentor/kurikulum/${data.trackId}`;
		}
	}}
/>

<style>
	/* Header Card */
	.quiz-header-card {
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
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
		transition: color 150ms;
	}

	.back-link:hover { color: var(--primary); }

	.header-badges {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.header-main-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.subphase-tag {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	.quiz-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.quiz-desc {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-secondary);
		margin: 4px 0 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	/* Tabs Card */
	.tabs-nav-card {
		display: flex;
		gap: 8px;
		padding: 6px;
	}

	.nav-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: var(--radius-md);
		border: none;
		background: none;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 140ms ease;
	}

	.nav-tab-btn:hover { background: var(--bg-inset); color: var(--text-primary); }

	.nav-tab-btn--active {
		background: var(--primary-light) !important;
		color: var(--primary) !important;
	}

	.tab-pill {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 800;
		padding: 1px 7px;
		border-radius: 9999px;
		background: var(--border-hard);
		color: var(--text-secondary);
	}

	.nav-tab-btn--active .tab-pill {
		background: #c7d2fe;
		color: #3730a3;
	}

	/* Question Cards */
	.questions-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.question-card {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.question-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.question-num-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		color: #4f46e5;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		padding: 3px 10px;
		border-radius: var(--radius-full);
	}

	.question-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-icon-action {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 140ms;
	}

	.btn-icon-action:hover {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--primary-light);
	}

	.btn-icon-action--danger:hover {
		border-color: var(--red);
		color: var(--red);
		background: var(--red-dim);
	}

	.question-img-preview {
		max-width: 100%;
		max-height: 280px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--border-hard);
	}

	.question-img-preview img {
		max-width: 100%;
		max-height: 280px;
		object-fit: contain;
	}

	.question-text {
		font-family: var(--font-body);
		font-size: 14.5px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.6;
		margin: 0;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		font-family: var(--font-body);
		font-size: 13px;
	}

	.option-row--correct {
		border-color: #86efac;
		background: #f0fdf4;
	}

	.option-letter {
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

	.option-letter--correct {
		background: #16a34a;
		border-color: #16a34a;
		color: #ffffff;
	}

	.option-text {
		flex: 1;
	}

	.correct-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #15803d;
	}

	.explanation-box {
		padding: 12px 14px;
		background: var(--blue-dim);
		border: 1px solid var(--blue-border);
		border-radius: var(--radius-md);
		font-size: 12.5px;
	}

	.exp-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		color: #1d4ed8;
		margin-bottom: 4px;
	}

	.exp-text {
		color: #1e3a8a;
		margin: 0;
		line-height: 1.5;
	}

	/* Results Table */
	.table-container {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		text-align: left;
	}

	.data-table th {
		padding: 14px 18px;
		background: var(--bg-inset);
		font-family: var(--font-macro);
		font-weight: 700;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-hard);
	}

	.data-table td {
		padding: 14px 18px;
		border-bottom: 1px solid var(--border-soft);
	}

	.student-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.student-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4f46e5;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-family: var(--font-macro);
	}

	.student-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.student-meta {
		display: flex;
		flex-direction: column;
	}

	.student-name {
		font-weight: 700;
		color: var(--text-primary);
	}

	.student-sub {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.score-pill {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 800;
		padding: 3px 10px;
		border-radius: var(--radius-full);
	}

	.score-pill--pass { background: #dcfce7; color: #15803d; }
	.score-pill--fail { background: #fee2e2; color: #b91c1c; }

	.mono-meta {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
	}

	/* Modal Components */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(4px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.modal-card {
		max-width: 640px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		background: #ffffff;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal-card--lg {
		max-width: 760px;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-soft);
	}

	.modal-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		margin: 0;
	}

	.modal-sub {
		font-size: 12px;
		color: var(--text-muted);
		margin: 2px 0 0;
	}

	.btn-close-modal {
		background: none;
		border: none;
		font-size: 24px;
		line-height: 1;
		color: var(--text-muted);
		cursor: pointer;
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.img-uploader-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.upload-file-btn {
		cursor: pointer;
		position: relative;
	}

	.img-preview-thumb {
		margin-top: 6px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.img-preview-thumb img {
		height: 60px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hard);
	}

	.btn-del-img {
		font-size: 11px;
		color: var(--red);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
	}

	.options-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.btn-add-opt {
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--primary);
		background: none;
		border: none;
		cursor: pointer;
	}

	.options-builder-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.option-builder-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px;
		border-radius: var(--radius-md);
		border: 1.5px solid var(--border-hard);
		background: #ffffff;
	}

	.option-builder-item--correct {
		border-color: #86efac;
		background: #f0fdf4;
	}

	.correct-radio {
		width: 18px;
		height: 18px;
		margin-left: 8px;
		cursor: pointer;
		accent-color: #16a34a;
	}

	.opt-index-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		color: var(--text-secondary);
		width: 20px;
		text-align: center;
	}

	.btn-del-opt {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 18px;
		cursor: pointer;
	}

	.btn-del-opt:hover { color: var(--red); }

	.import-tools-bar {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.font-mono-input {
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.5;
	}

	.import-status-box {
		padding: 10px 14px;
		border-radius: var(--radius-md);
		font-size: 12.5px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.import-status-box--success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #15803d;
	}

	.import-status-box--error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
	}

	.form-checkbox-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.checkbox-label {
		font-size: 12.5px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border-soft);
	}

	.modal-footer-between {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 12px;
		border-top: 1px solid var(--border-soft);
	}

	.footer-btns-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-danger-text {
		color: var(--red);
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		background: none;
		border: none;
		cursor: pointer;
	}

	.btn-danger-text:hover { text-decoration: underline; }

	.btn-sm {
		padding: 6px 12px !important;
		font-size: 11.5px !important;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}
		.options-grid {
			grid-template-columns: 1fr;
		}
		.form-row-2 {
			grid-template-columns: 1fr;
		}
	}
</style>

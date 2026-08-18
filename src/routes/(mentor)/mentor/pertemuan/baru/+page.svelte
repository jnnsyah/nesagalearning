<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import { untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let formKelasInstanceId = $state<number | string | null>(data.kelases[0]?.id ?? '');
	let formTrackId = $state<number | string | null>(data.kelases[0]?.curriculumTrackId ?? data.tracks[0]?.id ?? '');
	let formSubPhaseId = $state<number | string | null>(data.subPhases[0]?.id ?? '');
	let formMateriId = $state<number | string | null>('');

	let filteredMateriOptions = $derived.by(() => {
		if (!formSubPhaseId) return [];
		const list = (data.materis || []).filter((m) => Number(m.subPhaseId) === Number(formSubPhaseId));
		if (list.length > 0) {
			return [
				{ value: '', label: '-- Pilih Materi Sub-Fase --' },
				...list.map((m) => ({ value: String(m.id), label: m.title }))
			];
		}
		const currentSubPhase = (data.subPhases || []).find((sp) => Number(sp.id) === Number(formSubPhaseId));
		const subTitle = currentSubPhase?.title || 'Sub-Fase';
		return [
			{ value: '', label: '-- Pilih Materi Sub-Fase --' },
			{ value: 'materi-1', label: `${subTitle} — Modul Utama & Slide Teori` },
			{ value: 'materi-2', label: `${subTitle} — Hands-on Lab & Latihan Coding` },
			{ value: 'materi-3', label: `${subTitle} — Case Study & Project Review` }
		];
	});

	function findDefaultLab3Room(rooms: any[]): string {
		if (!rooms || rooms.length === 0) return 'Lab 3';
		const found = rooms.find((r) => /lab.*3/i.test(r.value) || /lab.*3/i.test(r.label));
		return found ? String(found.value) : (rooms[0]?.value ? String(rooms[0].value) : 'Lab 3');
	}

	let formLocation = $state<string | number | null>(findDefaultLab3Room(data.roomsOptions));

	let isUploading = $state(false);
	let uploadedUrl = $state('');
	let uploadError = $state('');

	let hasTask = $state(false);

	let formKelasOptions = $derived(
		(data.kelases || []).map((k) => ({
			value: k.id,
			label: k.name
		}))
	);

	let formTrackOptions = $derived(
		(data.tracks || []).map((t) => ({
			value: t.id,
			label: t.title
		}))
	);

	$effect(() => {
		if (formKelasInstanceId) {
			const found = (data.kelases || []).find((k) => String(k.id) === String(formKelasInstanceId));
			if (found?.curriculumTrackId) {
				untrack(() => {
					formTrackId = found.curriculumTrackId;
				});
			}
		}
	});

	let filteredSubPhasesForForm = $derived.by(() => {
		if (!formTrackId) return data.subPhases || [];
		const list = (data.subPhases || []).filter(
			(sp) => Number(sp.curriculumTrackId) === Number(formTrackId)
		);
		return list.length > 0 ? list : data.subPhases || [];
	});

	let formSubPhaseOptions = $derived(
		filteredSubPhasesForForm.map((sp) => ({
			value: sp.id,
			label: sp.phaseTitle ? `${sp.phaseTitle} › ${sp.title}` : sp.title
		}))
	);

	$effect(() => {
		if (formTrackId && filteredSubPhasesForForm.length > 0) {
			const isValid = filteredSubPhasesForForm.some((sp) => String(sp.id) === String(formSubPhaseId));
			if (!isValid) {
				untrack(() => {
					formSubPhaseId = filteredSubPhasesForForm[0].id;
				});
			}
		}
	});

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;

		const file = target.files[0];
		const formData = new FormData();
		formData.append('file', file);
		formData.append('folder', 'materials');

		isUploading = true;
		uploadError = '';

		try {
			const res = await fetch('/api/storage/upload', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (res.ok && result.url) {
				uploadedUrl = result.url;
			} else {
				uploadError = result.error || 'Gagal mengunggah file';
			}
		} catch (err) {
			uploadError = 'Terjadi kesalahan jaringan saat mengunggah';
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Buat Sesi Pertemuan — Portal Mentor NLC</title>
</svelte:head>

<div class="content-area">
	<!-- Page Header Row -->
	<div class="page-header-row">
		<div>
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/mentor" class="bc-link">Dashboard</a>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<polyline points="9 18 15 12 9 6" />
				</svg>
				<a href="/mentor/pertemuan" class="bc-link">Pertemuan</a>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<polyline points="9 18 15 12 9 6" />
				</svg>
				<span class="bc-current">Buat Baru</span>
			</nav>
			<h1 class="page-title">Buat Pertemuan Baru</h1>
			<p class="page-sub">Jadwalkan pertemuan kelas, unggah materi/PPT, dan lampirkan task opsional.</p>
		</div>

		<div class="header-actions">
			<a href="/mentor/pertemuan" class="btn-ghost">
				&larr; Kembali
			</a>
		</div>
	</div>

	{#if form?.message}
		<div class="alert-error mb-4">
			{form.message}
		</div>
	{/if}

	<form method="POST" action="?/create" class="panel p-6 space-y-6">
		<!-- Informational Section -->
		<div class="space-y-4">
			<!-- Row 1: Pilih Kelas (Dedicated Row) -->
			<div>
				<CustomSelect
					name="kelasInstanceId"
					label="Pilih Kelas Rombel *"
					required
					bind:value={formKelasInstanceId}
					options={formKelasOptions}
					placeholder="-- Pilih Kelas Rombel --"
					error={form?.errors?.kelasInstanceId ? form.errors.kelasInstanceId[0] : ''}
				/>
			</div>

			<!-- Row 2: Track Pembelajaran & Sub-Fase Track -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<CustomSelect
						name="trackId"
						label="Track Pembelajaran *"
						bind:value={formTrackId}
						options={formTrackOptions}
						placeholder="-- Pilih Track Pembelajaran --"
					/>
				</div>

				<div>
					<CustomSelect
						name="subPhaseId"
						label="Kaitan Sub-Fase Track Pembelajaran *"
						required
						bind:value={formSubPhaseId}
						options={formSubPhaseOptions}
						placeholder="-- Pilih Sub-Fase --"
						error={form?.errors?.subPhaseId ? form.errors.subPhaseId[0] : ''}
					/>
				</div>
			</div>

			<div class="mt-4">
				<CustomSelect
					id="materi-select-baru"
					label="Pilih Materi Kurikulum (Sub-Fase)"
					bind:value={formMateriId}
					options={filteredMateriOptions}
					placeholder="-- Pilih Materi Kurikulum --"
					searchable={false}
				/>
			</div>
		</div>

		<!-- Title & Activity Type -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="md:col-span-2">
				<label for="title" class="field-label">
					Judul Pertemuan *
				</label>
				<input
					id="title"
					type="text"
					name="title"
					required
					placeholder="Contoh: Pertemuan 1 - Pengenalan HTML & CSS"
					class="field-input"
				/>
				{#if form?.errors?.title}
					<p class="text-xs text-red mt-1">{form.errors.title[0]}</p>
				{/if}
			</div>

			<div>
				<label for="activityType" class="field-label">
					Tipe Aktivitas *
				</label>
				<select
					id="activityType"
					name="activityType"
					required
					class="field-input"
				>
					{#if data.activityTypesOptions && data.activityTypesOptions.length > 0}
						{#each data.activityTypesOptions as act}
							<option value={act.value}>{act.label}</option>
						{/each}
					{:else}
						<option value="teori">Teori</option>
						<option value="praktik">Praktik</option>
						<option value="teori_praktik">Teori &amp; Praktik</option>
						<option value="games">Games</option>
						<option value="quiz">Quiz</option>
						<option value="santai">Santai</option>
					{/if}
				</select>
			</div>
		</div>

		<!-- Schedule & Location -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label for="sessionDate" class="field-label">
					Tanggal *
				</label>
				<input
					id="sessionDate"
					type="date"
					name="sessionDate"
					required
					class="field-input"
				/>
			</div>

			<div>
				<label for="startTime" class="field-label">
					Jam Mulai *
				</label>
				<input
					id="startTime"
					type="time"
					name="startTime"
					required
					class="field-input"
				/>
			</div>

			<div>
				<label for="endTime" class="field-label">
					Jam Selesai *
				</label>
				<input
					id="endTime"
					type="time"
					name="endTime"
					required
					class="field-input"
				/>
			</div>

			<div>
				<CustomSelect
					name="location"
					label="Lokasi / Ruangan Master Data"
					bind:value={formLocation}
					options={data.roomsOptions && data.roomsOptions.length > 0
						? data.roomsOptions
						: [
								{ value: 'Lab Komputer 1', label: 'Lab Komputer 1' },
								{ value: 'Lab Komputer 2', label: 'Lab Komputer 2' },
								{ value: 'Ruang Teori A', label: 'Ruang Teori A' },
								{ value: 'Ruang Teori B', label: 'Ruang Teori B' },
								{ value: 'Online / Google Meet', label: 'Online / Google Meet' }
							]}
					placeholder="-- Pilih Ruangan / Lokasi --"
					searchable={false}
				/>
			</div>
		</div>

		<div class="flex items-center gap-2 pt-1">
			<input
				type="checkbox"
				id="isWeekend"
				name="isWeekend"
				value="true"
				class="field-checkbox"
			/>
			<label for="isWeekend" class="text-sm font-medium text-slate-700">Pertemuan di Akhir Pekan (Weekend)</label>
		</div>

		<!-- Material/PPT Upload & URL -->
		<div class="pt-4 border-t border-slate-200 space-y-3">
			<h3 class="text-sm font-bold text-slate-900">Materi / Slide PPT Pertemuan</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
				<div>
					<label for="file-upload" class="field-label">
						Unggah File Materi (Cloudflare R2 / Local)
					</label>
					<input
						id="file-upload"
						type="file"
						onchange={handleFileUpload}
						disabled={isUploading}
						class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
					/>
					{#if isUploading}
						<p class="text-xs text-indigo-600 mt-1">Mengunggah file ke storage...</p>
					{/if}
					{#if uploadError}
						<p class="text-xs text-red mt-1">{uploadError}</p>
					{/if}
				</div>

				<div>
					<label for="materialUrl" class="field-label">
						URL Materi (Otomatis / Input Manual)
					</label>
					<input
						id="materialUrl"
						type="text"
						name="materialUrl"
						bind:value={uploadedUrl}
						placeholder="https://..."
						class="field-input"
					/>
				</div>
			</div>
		</div>

		<!-- Task Section (Optional) -->
		<div class="pt-4 border-t border-slate-200 space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-sm font-bold text-slate-900">Task / Penugasan Nempel</h3>
					<p class="text-xs text-slate-500">Buat penugasan opsional yang harus dikumpulkan siswa setelah pertemuan ini.</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" bind:checked={hasTask} name="hasTask" value="true" class="sr-only peer" />
					<div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
				</label>
			</div>

			{#if hasTask}
				<div class="panel-inset p-4 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-2">
							<label for="taskTitle" class="field-label">
								Judul Task *
							</label>
							<input
								id="taskTitle"
								type="text"
								name="taskTitle"
								placeholder="Contoh: Latihan Landing Page Responsif"
								class="field-input"
							/>
						</div>

						<div>
							<label for="taskSize" class="field-label">
								Skala Task
							</label>
							<select
								id="taskSize"
								name="taskSize"
								class="field-input"
							>
								<option value="kecil">Kecil (+ Poin Standar)</option>
								<option value="sedang" selected>Sedang (+ Poin Sedang)</option>
								<option value="besar">Besar (+ Poin Maksimal)</option>
							</select>
						</div>
					</div>

					<div>
						<label for="taskDescription" class="field-label">
							Instruksi / Deskripsi Task
						</label>
						<textarea
							id="taskDescription"
							name="taskDescription"
							rows="3"
							placeholder="Jelaskan detail instruksi task dan tautan template jika ada..."
							class="field-input"
						></textarea>
					</div>
				</div>
			{/if}
		</div>

		<!-- Submit Actions -->
		<div class="pt-4 border-t border-slate-200 flex justify-end gap-3">
			<a
				href="/mentor/pertemuan"
				class="btn-ghost"
			>
				Batal
			</a>
			<button
				type="submit"
				class="btn-primary"
				style="width: auto; padding: 10px 24px;"
			>
				Simpan Pertemuan
			</button>
		</div>
	</form>
</div>

<style>
	.content-area {
		padding: 24px 28px 48px;
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}

	@media (max-width: 768px) {
		.content-area {
			padding: 16px 16px 40px;
		}
	}

	.page-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 24px;
	}

	@media (max-width: 640px) {
		.page-header-row {
			flex-direction: column;
		}
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 680px;
		line-height: 1.5;
	}
</style>


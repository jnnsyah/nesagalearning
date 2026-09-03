<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeaderCard from '$lib/components/ui/PageHeaderCard.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PaginationFooter from '$lib/components/ui/PaginationFooter.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { untrack } from 'svelte';

	let { data } = $props();

	// Derived select values — no $effect, no circular writes
	let selectedTaId = $derived(
		data.monitoringData.selectedTahunAjaran?.id
			? String(data.monitoringData.selectedTahunAjaran.id)
			: ''
	);

	let selectedKelasId = $derived(
		data.monitoringData.viewMode === 'detail' && data.monitoringData.selectedKelas?.id
			? String(data.monitoringData.selectedKelas.id)
			: ''
	);

	// Filter and Search States
	let searchInput = $state('');
	let selectedAngkatanFilter = $state('all');

	// Pagination State
	let currentPage = $state(1);
	const pageSize = 10;

	// Collapsible phase state for Tier 2
	let expandedPhases = $state<Record<number, boolean>>({});

	$effect(() => {
		if (data.monitoringData?.viewMode === 'detail') {
			const phases = data.monitoringData?.phases || [];
			const prev = untrack(() => expandedPhases);
			const nextState: Record<number, boolean> = {};
			for (const p of phases) {
				nextState[p.id] = prev[p.id] !== undefined ? prev[p.id] : true;
			}
			expandedPhases = nextState;
		}
	});

	// Derived Roster Search & Filter & Pagination
	const rosterList = $derived(data.rosterData?.roster ?? []);

	const filteredRoster = $derived.by(() => {
		let list = [...rosterList];
		if (searchInput.trim()) {
			const q = searchInput.toLowerCase().trim();
			list = list.filter(
				(s) =>
					s.fullName.toLowerCase().includes(q) ||
					(s.nisn && s.nisn.toLowerCase().includes(q)) ||
					(s.username && s.username.toLowerCase().includes(q))
			);
		}
		if (selectedAngkatanFilter !== 'all') {
			list = list.filter(
				(s) => String(s.angkatan || s.targetAngkatan) === selectedAngkatanFilter
			);
		}
		return list;
	});

	const paginatedRoster = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredRoster.slice(start, start + pageSize);
	});

	$effect(() => {
		if (searchInput !== undefined || selectedAngkatanFilter !== undefined) {
			untrack(() => {
				currentPage = 1;
			});
		}
	});

	// Dropdown Options
	const taSelectOptions = $derived(
		(data.monitoringData?.tahunAjaranOptions || []).map((ta) => ({
			value: String(ta.id),
			label: ta.isActive ? `${ta.name} (Aktif)` : ta.name
		}))
	);

	const kelasSelectOptions = $derived([
		{ value: '', label: 'Semua Rombel / Kelompok' },
		...(data.mentorClasses || []).map((k) => ({
			value: String(k.id),
			label: `${k.name} (${k.tingkatName})`
		}))
	]);

	function handleTaChange(val: string | number | null) {
		const taStr = String(val ?? '');
		const params = new URLSearchParams();
		if (taStr) params.set('tahunAjaranId', taStr);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleKelasChange(val: string | number | null) {
		const kelasStr = String(val ?? '');
		const params = new URLSearchParams();
		if (data.monitoringData.viewMode === 'detail' && data.monitoringData.selectedTrack) {
			params.set('trackId', String(data.monitoringData.selectedTrack.id));
		}
		if (data.monitoringData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
		}
		if (kelasStr) params.set('kelasInstanceId', kelasStr);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function navigateToDetail(trackId: number) {
		const params = new URLSearchParams();
		params.set('trackId', String(trackId));
		if (data.monitoringData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function navigateBackToGrid() {
		const params = new URLSearchParams();
		if (data.monitoringData.selectedTahunAjaran?.id) {
			params.set('tahunAjaranId', String(data.monitoringData.selectedTahunAjaran.id));
		}
		goto(`?${params.toString()}`);
	}

	function togglePhase(phaseId: number) {
		expandedPhases[phaseId] = !expandedPhases[phaseId];
	}
</script>

<svelte:head>
	<title>Progress Pembelajaran Angkatan — Mentor NLC</title>
</svelte:head>

<ToastContainer />

<div class="page-container">
	{#if data.monitoringData.viewMode === 'grid'}
		<PageHeaderCard
			title="Progress Track Pembelajaran Angkatan"
			subtitle="Pilih alur track pembelajaran di bawah ini untuk memantau detail pencapaian modul, materi, kuis, dan progres siswa."
			breadcrumbs={[
				{ label: 'Dashboard', href: '/mentor' },
				{ label: 'Progress Pembelajaran' }
			]}
		>
			{#snippet badges()}
				{#if data.monitoringData.selectedTahunAjaran}
					<span class="badge badge-primary">
						TA {data.monitoringData.selectedTahunAjaran.name}
					</span>
				{/if}
			{/snippet}

			{#snippet actions()}
				<div class="flex items-center gap-3 flex-wrap">
					<div class="w-48">
						<CustomSelect
							id="grid-ta-select"
							name="tahunAjaranId"
							options={taSelectOptions}
							value={selectedTaId}
							onchange={handleTaChange}
							searchable={false}
						/>
					</div>

					<div class="w-56">
						<CustomSelect
							id="grid-kelas-select"
							name="kelasInstanceId"
							options={kelasSelectOptions}
							value={selectedKelasId}
							onchange={handleKelasChange}
							searchable={false}
						/>
					</div>
				</div>
			{/snippet}
		</PageHeaderCard>

		{#if data.monitoringData.trackCards.length === 0}
			<div class="panel p-10 text-center">
				<EmptyState
					title="Belum Ada Track Pembelajaran Dipublikasi"
					message={`Tidak ditemukan alur track pembelajaran aktif untuk Periode ${data.monitoringData.selectedTahunAjaran?.name || ''}.`}
				/>
			</div>
		{:else}
			<section class="grid-cards-container" aria-label="Daftar Alur Track Pembelajaran">
				<div class="cards-grid">
					{#each data.monitoringData.trackCards as track}
						<div
							class="track-card"
							class:track-card--archived={track.trackState === 'archived'}
							class:track-card--upcoming={track.trackState === 'upcoming'}
						>
							<div class="track-card-header">
								<div class="flex items-center justify-between gap-2">
									<span class="badge badge-subtle">{track.tingkatName}</span>

									{#if track.trackState === 'archived'}
										<span class="badge badge-archived inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
											<span>TERARSIP</span>
										</span>
									{:else if track.trackState === 'upcoming'}
										<span class="badge badge-amber inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
											<span>BELUM BERJALAN</span>
										</span>
									{:else}
										<span class="badge badge-success inline-flex items-center gap-1">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
											<span>AKTIF</span>
										</span>
									{/if}
								</div>

								<h3 class="track-card-title mt-2">{track.title}</h3>
								{#if track.description}
									<p class="track-card-desc">{track.description}</p>
								{/if}
							</div>

							<!-- Executing Rombel Info -->
							<div class="track-card-body">
								<div class="rombel-tags-row mb-3">
									<span class="text-xs font-bold text-slate-700">Kelompok Eksekusi:</span>
									{#if track.executingClassNames.length === 0}
										<span class="type-mono text-xs text-slate-400">Belum Ada Rombel</span>
									{:else}
										{#each track.executingClassNames as cName}
											<span class="rombel-tag">{cName}</span>
										{/each}
									{/if}
								</div>

								<div class="metrics-mini-grid">
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalPhases}</span>
										<span class="mini-stat-lbl">Phase</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalSubPhases}</span>
										<span class="mini-stat-lbl">SubPhase</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalMateri}</span>
										<span class="mini-stat-lbl">Materi</span>
									</div>
									<div class="mini-stat">
										<span class="mini-stat-val">{track.totalQuizzes}</span>
										<span class="mini-stat-lbl">Quiz</span>
									</div>
								</div>

								<!-- Overall Progress Bar -->
								<div class="progress-box mt-3">
									<div class="flex items-center justify-between text-xs font-mono mb-1">
										<span class="text-slate-500">Rata-rata Ketercapaian</span>
										<span class="font-bold text-slate-800">{track.executingClassesCount === 0 ? '-' : `${track.avgCompletionRate}%`}</span>
									</div>
									<div class="mini-progress-track">
										<div
											class="mini-progress-fill"
											class:fill-green={track.avgCompletionRate >= 80}
											class:fill-amber={track.avgCompletionRate >= 50 && track.avgCompletionRate < 80}
											class:fill-blue={track.avgCompletionRate < 50}
											style="width: {track.executingClassesCount === 0 ? 0 : track.avgCompletionRate}%;"
										></div>
									</div>
								</div>
							</div>

							<div class="track-card-footer">
								<button
									type="button"
									class="btn-open-track"
									onclick={() => navigateToDetail(track.id)}
								>
									<span>Lihat Progress Detail</span>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else if data.monitoringData.viewMode === 'detail'}
		<PageHeaderCard
			title={data.monitoringData.selectedTrack.title}
			subtitle={data.monitoringData.selectedTrack.description}
			breadcrumbs={[
				{ label: 'Dashboard', href: '/mentor' },
				{ label: 'Progress Pembelajaran', href: 'javascript:void(0)' },
				{ label: 'Detail Track' }
			]}
		>
			{#snippet badges()}
				<button type="button" onclick={navigateBackToGrid} class="btn-secondary-head-pill border-none cursor-pointer">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					<span>Kembali ke Katalog Track</span>
				</button>
			{/snippet}

			{#snippet actions()}
				<div class="w-64">
					<CustomSelect
						id="detail-kelas-select"
						name="kelasInstanceId"
						options={kelasSelectOptions}
						value={selectedKelasId}
						onchange={handleKelasChange}
						searchable={false}
					/>
				</div>
			{/snippet}
		</PageHeaderCard>

		<!-- 4 STAT CARDS SUMMARY (UI Component Integration) -->
		<section class="grid grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Ringkasan Matrix Progress Track">
			<StatCard label="Total Modul Pembelajaran" value={`${data.monitoringData.phases.length} Phase`} subtext="Alur Track Pembelajaran" variant="attendance">
				{#snippet icon()}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
				{/snippet}
			</StatCard>

			<StatCard label="Rata-Rata Ketercapaian" value={`${data.monitoringData.summary?.avgTrackCompletionRate ?? 0}%`} subtext={`Kelompok ${data.monitoringData.selectedKelas?.name || 'Semua'}`} variant="approved">
				{#snippet icon()}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
					</svg>
				{/snippet}
			</StatCard>

			<StatCard label="Siswa Aktif Roster" value={`${data.rosterData?.summary?.totalStudentsCount || 0} Siswa`} subtext="Terdaftar di Kelompok" variant="pending">
				{#snippet icon()}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
				{/snippet}
			</StatCard>

			<StatCard label="Rata-Rata Poin" value={`${data.rosterData?.summary?.avgPoints || 0} Pts`} subtext="Gamifikasi Siswa" variant="revisi">
				{#snippet icon()}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
					</svg>
				{/snippet}
			</StatCard>
		</section>

		<!-- PHASE ACCORDION BREAKDOWN -->
		<section class="phases-container space-y-4 mb-6">
			<h2 class="text-base font-bold text-slate-800 flex items-center justify-between">
				<span>Peta Ketercapaian SubPhase &amp; Kuis</span>
				<span class="text-xs font-normal text-slate-500">Klik baris phase untuk melipat/membuka</span>
			</h2>

			{#each data.monitoringData.phases as phaseGroup}
				<div class="phase-accordion-card">
					<button
						type="button"
						class="phase-accordion-header"
						onclick={() => togglePhase(phaseGroup.id)}
					>
						<div class="flex items-center gap-3">
							<span class="phase-code-badge">{phaseGroup.title}</span>
							{#if phaseGroup.description}
								<span class="text-xs text-slate-500 font-normal hidden sm:inline">{phaseGroup.description}</span>
							{/if}
						</div>

						<div class="flex items-center gap-4">
							<div class="text-right">
								<span class="text-xs font-bold text-slate-800">{phaseGroup.avgCompletionRate}%</span>
								<span class="text-[10px] text-slate-400 block">Ketercapaian</span>
							</div>
							<div class="accordion-chevron" class:is-expanded={expandedPhases[phaseGroup.id]}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
							</div>
						</div>
					</button>

					{#if expandedPhases[phaseGroup.id]}
						<div class="phase-accordion-body">
							<div class="subphases-grid grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
								{#each phaseGroup.subPhases as sub}
									<div class="subphase-item-card">
										<div class="flex items-start justify-between gap-2 mb-2">
											<div>
												<h4 class="font-bold text-xs text-slate-900">{sub.title}</h4>
												<span class="text-[11px] text-slate-500">{sub.materiCount} Materi Pembelajaran</span>
											</div>
											<span
												class="subphase-status-pill"
												class:status-done={sub.status === 'SELESAI'}
												class:status-active={sub.status === 'BERJALAN'}
												class:status-pending={sub.status === 'BELUM_DIMULAI'}
											>
												{sub.status.replace('_', ' ')}
											</span>
										</div>

										<!-- Progress fill -->
										<div class="subphase-progress-bar mb-2">
											<div class="progress-fill" style="width: {sub.completionRate}%;"></div>
										</div>

										<div class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
											<span>Tugas: {sub.totalApprovedSubmissions}/{sub.totalTasks}</span>
											{#if sub.hasQuiz}
												<span class="text-indigo-600 font-semibold">Quiz: {sub.quizPassedCount}/{sub.totalActiveStudents} Lulus</span>
											{/if}
											<span class="font-bold text-slate-800">{sub.completionRate}%</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</section>

		<!-- STUDENT ROSTER PROGRESS TABLE -->
		<section class="recap-card" aria-label="Detail Progress Roster Siswa">
			<div class="card-header flex items-center justify-between p-4 border-b border-slate-200 flex-wrap gap-3">
				<div>
					<h3 class="font-bold text-slate-900 text-sm">Progress Roster Siswa Kelompok</h3>
					<p class="text-xs text-slate-500">Daftar siswa dan persentase ketercapaian alur track pembelajaran</p>
				</div>
				<span class="badge badge-neutral font-semibold">Total {filteredRoster.length} Siswa</span>
			</div>

			<!-- Filter Bar -->
			<div class="p-4 bg-slate-50/70 border-b border-slate-200">
				<FilterBar>
					{#snippet search()}
						<TextInput
							label="Cari Siswa"
							placeholder="Cari berdasarkan nama, NISN, atau username..."
							bind:value={searchInput}
							clearable
						/>
					{/snippet}
				</FilterBar>
			</div>

			{#if paginatedRoster.length === 0}
				<div class="p-8 text-center">
					<EmptyState
						title="Tidak Ada Siswa Ditemukan"
						message="Tidak ada siswa pada roster kelompok ini yang cocok dengan kriteria filter Anda."
					/>
				</div>
			{:else}
				<div class="table-scroll-container">
					<table class="data-table">
						<thead>
							<tr>
								<th class="w-12 text-center">No</th>
								<th>Nama Siswa &amp; Rombel</th>
								<th class="text-center">Poin</th>
								<th class="text-center">Presensi</th>
								<th class="text-right w-52">% Progress Track Pembelajaran</th>
								<th class="text-center w-28">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each paginatedRoster as student, idx}
								<tr class="hover:bg-slate-50 transition-colors">
									<td class="text-center text-xs font-mono text-slate-400">{(currentPage - 1) * pageSize + idx + 1}</td>
									<td>
										<div class="student-profile-flex">
											<div class="avatar-circle">
												{#if student.avatarUrl}
													<img src={student.avatarUrl} alt={student.fullName} class="w-full h-full object-cover rounded-full" />
												{:else}
													<span>{student.fullName.charAt(0).toUpperCase()}</span>
												{/if}
											</div>
											<div class="student-name-box">
												<a
													href="/mentor/siswa/{student.userId}?kelasInstanceId={student.kelasId}&from=progress{data.monitoringData.selectedTrack?.id ? `&trackId=${data.monitoringData.selectedTrack.id}` : ''}{data.monitoringData.selectedTahunAjaran?.id ? `&tahunAjaranId=${data.monitoringData.selectedTahunAjaran.id}` : ''}"
													class="student-fullname hover:text-indigo-600 hover:underline transition-colors"
												>
													{student.fullName}
												</a>
												<div class="student-sub-info flex items-center gap-1.5 flex-wrap mt-0.5">
													<span class="student-nisn text-xs text-slate-500 font-mono">{student.nisn ? `NISN: ${student.nisn}` : `@${student.username}`}</span>
													<span class="badge badge-neutral text-[10px] px-2 py-0.5 font-semibold">
														Angkatan {student.angkatan || student.targetAngkatan || 2025}
													</span>
													{#if student.rombelLabel}
														<span class="rombel-pill">{student.rombelLabel}</span>
													{:else}
														<span class="rombel-pill">{student.kelasName}</span>
													{/if}
												</div>
											</div>
										</div>
									</td>
									<td class="text-center font-bold text-indigo-700 font-mono text-xs">
										{student.totalPoints} Pts
									</td>
									<td class="text-center font-mono text-xs">
										<span class="font-semibold text-slate-800">{student.attendanceRate}%</span>
									</td>
									<td class="text-right">
										<div class="flex items-center justify-end gap-2">
											<div class="w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-300"
													class:bg-emerald-500={student.overallProgress >= 80}
													class:bg-indigo-500={student.overallProgress >= 50 && student.overallProgress < 80}
													class:bg-amber-500={student.overallProgress < 50}
													style="width: {student.overallProgress}%;"
												></div>
											</div>
											<span class="font-bold font-mono text-xs text-slate-800">{student.overallProgress}%</span>
										</div>
									</td>
									<td class="text-center">
										<a
											href="/mentor/siswa/{student.userId}?kelasInstanceId={student.kelasId}&from=progress{data.monitoringData.selectedTrack?.id ? `&trackId=${data.monitoringData.selectedTrack.id}` : ''}{data.monitoringData.selectedTahunAjaran?.id ? `&tahunAjaranId=${data.monitoringData.selectedTahunAjaran.id}` : ''}"
											class="btn-detail-link"
										>
											Detail
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="p-4 border-t border-slate-200">
					<PaginationFooter
						totalItems={filteredRoster.length}
						bind:currentPage
						{pageSize}
					/>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page-container {
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 24px 24px 48px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Standardized Header Card (Blueprint Spec) */
	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 100%;
		word-break: break-word;
	}

	.header-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 26px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
	}

	.bc-link {
		color: var(--text-muted, #64748b);
		font-weight: 500;
		text-decoration: none;
	}

	.bc-link:hover {
		color: var(--primary, #4f46e5);
	}

	.bc-current {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary, #4f46e5);
	}

	.page-title {
		font-family: var(--font-macro, sans-serif);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.page-sub {
		font-size: 14px;
		color: var(--text-secondary, #475569);
	}

	.btn-secondary-head-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		text-decoration: none;
		font-family: var(--font-macro, sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-secondary-head-pill:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #94a3b8;
	}

	.activity-badge-pill {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 10px;
		border-radius: 6px;
		font-family: var(--font-macro, sans-serif);
		font-size: 10.5px;
		font-weight: 700;
		line-height: 1;
		border-width: 1px;
		border-style: solid;
		white-space: nowrap;
	}

	.filter-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #475569;
		margin-bottom: 4px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 20px;
	}

	.track-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
		transition: all 200ms ease;
	}

	.track-card:hover {
		border-color: #cbd5e1;
		box-shadow: 0 6px 16px rgba(0,0,0,0.06);
		transform: translateY(-2px);
	}

	.track-card-title {
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.3;
	}

	.track-card-desc {
		font-size: 12px;
		color: #64748b;
		margin-top: 4px;
		line-height: 1.4;
	}

	.track-card-body {
		margin: 16px 0;
	}

	.rombel-tag {
		display: inline-block;
		padding: 2px 8px;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		color: #334155;
		margin-right: 4px;
		margin-bottom: 4px;
	}

	.metrics-mini-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		background: #f8fafc;
		border-radius: 10px;
		padding: 10px;
		text-align: center;
	}

	.mini-stat-val {
		display: block;
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
		font-family: var(--font-mono, monospace);
	}

	.mini-stat-lbl {
		display: block;
		font-size: 10px;
		color: #64748b;
		font-weight: 600;
		text-transform: uppercase;
	}

	.mini-progress-track {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 300ms ease;
	}

	.fill-green { background: #10b981; }
	.fill-amber { background: #f59e0b; }
	.fill-blue { background: #3b82f6; }

	.btn-open-track {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		background: #4f46e5;
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-open-track:hover {
		background: #4338ca;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
	}

	.phase-accordion-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		overflow: hidden;
	}

	.phase-accordion-header {
		width: 100%;
		padding: 14px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #ffffff;
		border: none;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.phase-accordion-header:hover {
		background: #f8fafc;
	}

	.phase-code-badge {
		font-size: 13px;
		font-weight: 800;
		color: #0f172a;
	}

	.accordion-chevron {
		transition: transform 200ms ease;
	}

	.accordion-chevron.is-expanded {
		transform: rotate(180deg);
	}

	.subphase-item-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 12px;
	}

	.subphase-progress-bar {
		width: 100%;
		height: 6px;
		background: #e2e8f0;
		border-radius: 999px;
		overflow: hidden;
	}

	.subphase-progress-bar .progress-fill {
		height: 100%;
		background: #4f46e5;
		border-radius: 999px;
	}

	.subphase-status-pill {
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		padding: 2px 8px;
		border-radius: 999px;
	}

	.status-done { background: #dcfce7; color: #15803d; }
	.status-active { background: #dbeafe; color: #1d4ed8; }
	.status-pending { background: #f1f5f9; color: #64748b; }

	.recap-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		overflow: hidden;
		box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.data-table th {
		background: #f8fafc;
		color: #475569;
		font-weight: 700;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 12px 16px;
		border-bottom: 1px solid #e2e8f0;
	}

	.data-table td {
		padding: 12px 16px;
		border-bottom: 1px solid #f1f5f9;
		color: #1e293b;
	}

	.student-profile-flex {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.avatar-circle {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 800;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.student-fullname {
		font-weight: 700;
		color: #0f172a;
		font-size: 13px;
	}

	.rombel-pill {
		display: inline-block;
		padding: 2px 8px;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 10.5px;
		font-weight: 700;
		color: #334155;
	}

	.btn-detail-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 10px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		color: #4338ca;
		transition: all 150ms ease;
	}

	.btn-detail-link:hover {
		background: #eef2ff;
		border-color: #a5b4fc;
	}

	@media (max-width: 640px) {
		.page-container {
			padding: 16px 16px 36px;
		}
		.cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

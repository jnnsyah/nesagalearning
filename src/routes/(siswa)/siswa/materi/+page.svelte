<script lang="ts">
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedTrackId = $state<string | number>(data.activeTrackId || 'all');

	let trackOptions = $derived([
		{ value: 'all', label: 'Semua Track Pembelajaran' },
		...data.tracks.map((t) => ({ value: t.id, label: t.title }))
	]);

	let filteredPhases = $derived.by(() => {
		const phases = data.phases || [];
		const q = searchQuery.toLowerCase().trim();

		return phases
			.map((p) => {
				const filteredSubPhases = p.subPhases
					.map((sp) => {
						const filteredMateri = sp.materiList.filter((m) => {
							if (!q) return true;
							return (
								m.title.toLowerCase().includes(q) ||
								sp.title.toLowerCase().includes(q) ||
								p.title.toLowerCase().includes(q)
							);
						});
						return {
							...sp,
							materiList: filteredMateri
						};
					})
					.filter((sp) => sp.materiList.length > 0 || !q);

				return {
					...p,
					subPhases: filteredSubPhases
				};
			})
			.filter((p) => p.subPhases.some((sp) => sp.materiList.length > 0) || !q);
	});

	let totalMateriCount = $derived(
		(data.phases || []).reduce(
			(acc, p) => acc + p.subPhases.reduce((subAcc, sp) => subAcc + sp.materiList.length, 0),
			0
		)
	);
</script>

<svelte:head>
	<title>Katalog Materi Kurikulum — Siswa Hub</title>
</svelte:head>

<div class="content-area">
	<!-- Header Banner Card -->
	<div class="header-card mb-6">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Katalog Materi</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Modul &amp; Kurikulum Pembelajaran</h1>
				<p class="page-sub">
					Jelajahi alur modul kurikulum Nesaga Learning Center sesuai track dan jenjang kelas Anda.
				</p>
			</div>
			{#if data.membership}
				<span class="kelas-badge">Kelas: {data.membership.kelasName}</span>
			{/if}
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="filter-card mb-6">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 align-items-center">
			<div class="md:col-span-2">
				<TextInput
					id="search-materi-input"
					label="Cari Materi Pembelajaran"
					placeholder="Ketik judul modul, topik, atau nama sub-fase..."
					bind:value={searchQuery}
				/>
			</div>
			<div>
				<CustomSelect
					id="track-select-filter"
					label="Filter Track Pembelajaran"
					bind:value={selectedTrackId}
					options={trackOptions}
					searchable={false}
				/>
			</div>
		</div>
	</div>

	<!-- Curriculum Hierarchy Tree List -->
	{#if filteredPhases.length === 0}
		<div class="empty-state-card">
			<div class="empty-icon">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
			</div>
			<h3 class="empty-title">Tidak Ada Materi Ditemukan</h3>
			<p class="empty-sub">Coba sesuaikan kata kunci pencarian atau ganti filter track kurikulum di atas.</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each filteredPhases as p, pIdx}
				<div class="phase-container">
					<div class="phase-header">
						<div class="flex items-center gap-2.5">
							<span class="phase-number-badge">FASE {pIdx + 1}</span>
							<h3 class="phase-title">{p.title}</h3>
						</div>
						{#if p.description}
							<p class="phase-desc mt-1">{p.description}</p>
						{/if}
					</div>

					<div class="phase-body space-y-4 p-4">
						{#each p.subPhases as sp, spIdx}
							<div class="subphase-block">
								<div class="subphase-header mb-3">
									<h4 class="subphase-title">
										Sub-Fase {pIdx + 1}.{spIdx + 1}: {sp.title}
									</h4>
									{#if sp.description}
										<p class="subphase-desc">{sp.description}</p>
									{/if}
								</div>

								{#if sp.materiList.length === 0}
									<div class="no-materi-item">Belum ada modul materi pada sub-fase ini.</div>
								{:else}
									<div class="materi-list space-y-2">
										{#each sp.materiList as m, mIdx}
											<div class="materi-row">
												<div class="flex items-center gap-3 min-w-0 flex-1">
													<div class="materi-index-dot">{mIdx + 1}</div>
													<div class="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
														<h5 class="materi-row-title truncate">{m.title}</h5>
														{#if m.isCompleted}
															<span class="materi-completed-badge">SELESAI DIBACA</span>
														{/if}
													</div>
												</div>

												<a href={`/siswa/materi/${m.id}`} class="btn-read-materi">
													<span>Baca Materi</span>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<polyline points="9 18 15 12 9 6" />
													</svg>
												</a>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1050px;
		margin: 0 auto;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 20px 24px;
		box-shadow: var(--shadow-sm);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
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
		font-size: clamp(1.3rem, 2.5vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.page-sub {
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.kelas-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.filter-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		box-shadow: var(--shadow-sm);
	}

	.phase-container {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.phase-header {
		padding: 16px 20px;
		background: var(--bg-inset);
		border-bottom: 1px solid var(--border-hard);
	}

	.phase-number-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 800;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.phase-title {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.phase-desc {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.subphase-block {
		background: #f8fafc;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-md);
		padding: 14px 16px;
	}

	.subphase-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.subphase-desc {
		font-size: 11.5px;
		color: var(--text-muted);
	}

	.no-materi-item {
		font-size: 11.5px;
		color: var(--text-muted);
		font-style: italic;
	}

	.materi-row {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: 6px;
		padding: 10px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		transition: all 150ms ease;
	}

	.materi-row:hover {
		border-color: #cbd5e1;
		box-shadow: var(--shadow-sm);
	}

	.materi-index-dot {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #e0e7ff;
		color: #4338ca;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.materi-row-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.materi-completed-badge {
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 800;
		color: #15803d;
		background: #dcfce7;
		border: 1px solid #86efac;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.btn-read-materi {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11.5px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
		flex-shrink: 0;
	}

	.btn-read-materi:hover {
		background: #4338ca;
	}

	.empty-state-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 40px 24px;
		text-align: center;
		box-shadow: var(--shadow-sm);
	}

	.empty-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 12.5px;
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px;
		}
	}
</style>

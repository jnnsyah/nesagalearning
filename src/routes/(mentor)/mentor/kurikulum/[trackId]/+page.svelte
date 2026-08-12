<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Modal States
	let showEditTrackModal = $state(false);
	let showAddPhaseModal = $state(false);
	let activePhaseForSubPhase = $state<number | null>(null);
	let activeSubPhaseForMateri = $state<number | null>(null);

	let editingPhase = $state<{ id: number; title: string; description: string } | null>(null);
	let editingSubPhase = $state<{ id: number; title: string; description: string } | null>(null);

	// Quick Preview Modal State
	let previewMateri = $state<{ title: string; content: string | null; id: number } | null>(null);

	// Collapsible Phases State
	let expandedPhases = $state<Record<number, boolean>>({});

	// Initialize all phases expanded by default
	$effect(() => {
		if (data.track?.phases) {
			const map: Record<number, boolean> = {};
			data.track.phases.forEach((p) => {
				if (expandedPhases[p.id] === undefined) {
					map[p.id] = true;
				} else {
					map[p.id] = expandedPhases[p.id];
				}
			});
			expandedPhases = map;
		}
	});

	function togglePhase(phaseId: number) {
		expandedPhases[phaseId] = !expandedPhases[phaseId];
	}

	function setAllPhasesExpanded(expanded: boolean) {
		const map: Record<number, boolean> = {};
		data.track.phases.forEach((p) => {
			map[p.id] = expanded;
		});
		expandedPhases = map;
	}

	// Reordering State
	let isReordering = $state(false);

	async function moveItem(
		type: 'phase' | 'subPhase' | 'materi',
		parentId: number,
		items: { id: number }[],
		index: number,
		direction: 'up' | 'down'
	) {
		if (isReordering) return;
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= items.length) return;

		isReordering = true;
		const copy = [...items.map((i) => i.id)];
		const temp = copy[index];
		copy[index] = copy[targetIndex];
		copy[targetIndex] = temp;

		try {
			const res = await fetch('/api/mentor/kurikulum/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, parentId, orderedIds: copy })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				alert('Gagal melakukan reorder');
			}
		} catch (err) {
			console.error(err);
			alert('Terjadi kesalahan koneksi saat reorder');
		} finally {
			isReordering = false;
		}
	}

	// Calculate totals
	let totalSubPhases = $derived(
		data.track.phases.reduce((acc, p) => acc + p.subPhases.length, 0)
	);
	let totalMateris = $derived(
		data.track.phases.reduce(
			(acc, p) => acc + p.subPhases.reduce((sAcc, sp) => sAcc + sp.materis.length, 0),
			0
		)
	);
</script>

<svelte:head>
	<title>{data.track.title} — Builder Kurikulum NLC</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
	<div class="p-6 max-w-7xl mx-auto space-y-6">

		<!-- ═══════════════════════════════════════════════════════
		     HEADER & BREADCRUMB
		     ═══════════════════════════════════════════════════════ -->
		<div>
			<div class="flex items-center gap-2 mb-2">
				<a href="/mentor" class="type-mono hover:text-[var(--text-primary)]">Dashboard</a>
				<span class="type-mono text-muted">•</span>
				<a href="/mentor/kurikulum" class="type-mono hover:text-[var(--text-primary)]">Kurikulum</a>
				<span class="type-mono text-muted">•</span>
				<span class="badge badge-hadir">{data.track.tingkatName || 'Tingkat'}</span>
			</div>

			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 style="font-family: var(--font-macro); font-size: 2rem; font-weight: 800; color: var(--text-primary);">
						{data.track.title}
					</h1>
					{#if data.track.description}
						<p style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">{data.track.description}</p>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<a
						href="/mentor/kurikulum"
						class="btn-ghost"
						style="padding: 8px 16px; font-size: 13px;"
					>
						← Kembali
					</a>
					<button
						onclick={() => (showEditTrackModal = true)}
						class="btn-ghost"
						style="padding: 8px 16px; font-size: 13px;"
					>
						Edit Detail
					</button>
					<button
						onclick={() => (showAddPhaseModal = true)}
						class="btn-primary"
						style="width: auto; padding: 8px 18px; font-size: 13px;"
					>
						+ Tambah Fase
					</button>
				</div>
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════
		     STRUCTURE METRICS TOOLBAR
		     ═══════════════════════════════════════════════════════ -->
		<div class="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex items-center gap-6 font-mono text-xs">
				<span class="type-mono text-muted">STRUKTUR:</span>
				<div class="flex items-center gap-2">
					<span style="font-family: var(--font-macro); font-size: 1.25rem; font-weight: 800; color: var(--primary);">{data.track.phases.length}</span>
					<span class="type-mono text-muted">Fase</span>
				</div>
				<div class="flex items-center gap-2">
					<span style="font-family: var(--font-macro); font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">{totalSubPhases}</span>
					<span class="type-mono text-muted">Sub-fase</span>
				</div>
				<div class="flex items-center gap-2">
					<span style="font-family: var(--font-macro); font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">{totalMateris}</span>
					<span class="type-mono text-muted">Materi</span>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={() => setAllPhasesExpanded(true)}
					class="btn-ghost"
					style="padding: 4px 10px; font-size: 11px;"
				>
					Expand All
				</button>
				<button
					onclick={() => setAllPhasesExpanded(false)}
					class="btn-ghost"
					style="padding: 4px 10px; font-size: 11px;"
				>
					Collapse All
				</button>
			</div>
		</div>

		<!-- NOTIFICATIONS -->
		{#if form?.error}
			<div class="alert-error">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="panel p-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-sm">
				{form.message}
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════
		     TREE BUILDER
		     ═══════════════════════════════════════════════════════ -->
		<div class="space-y-4">
			{#if data.track.phases.length === 0}
				<div class="panel p-12 text-center">
					<h3 style="font-family: var(--font-macro); font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Belum Ada Fase</h3>
					<p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">Tambahkan fase pertama untuk mulai menyusun kurikulum track ini.</p>
					<button
						onclick={() => (showAddPhaseModal = true)}
						class="btn-primary"
						style="width: auto; padding: 10px 20px;"
					>
						+ Tambah Fase Pertama
					</button>
				</div>
			{:else}
				{#each data.track.phases as p, pIdx}
					<!-- PHASE CARD -->
					<div class="panel overflow-hidden border-l-4 border-l-[var(--primary)]">
						<!-- Phase header -->
						<div class="p-4 bg-[var(--bg-inset)] flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border-soft)]">
							<button
								type="button"
								onclick={() => togglePhase(p.id)}
								class="flex items-center gap-3 text-left"
							>
								<span class="type-mono text-muted">{expandedPhases[p.id] ? '▼' : '►'}</span>
								<span class="badge badge-hadir">FASE {String(p.sortOrder).padStart(2, '0')}</span>
								<div>
									<h2 style="font-family: var(--font-macro); font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
										{p.title}
									</h2>
									{#if p.description}
										<p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">{p.description}</p>
									{/if}
								</div>
							</button>

							<div class="flex items-center gap-2">
								<div class="flex items-center panel-inset">
									<button
										onclick={() => moveItem('phase', data.track.id, data.track.phases, pIdx, 'up')}
										disabled={pIdx === 0 || isReordering}
										class="btn-ghost"
										style="padding: 4px 8px; border: none;"
									>▲</button>
									<button
										onclick={() => moveItem('phase', data.track.id, data.track.phases, pIdx, 'down')}
										disabled={pIdx === data.track.phases.length - 1 || isReordering}
										class="btn-ghost"
										style="padding: 4px 8px; border: none;"
									>▼</button>
								</div>

								<button
									onclick={() => (editingPhase = { id: p.id, title: p.title, description: p.description || '' })}
									class="btn-ghost"
									style="padding: 4px 10px; font-size: 12px;"
								>
									Edit
								</button>

								<form method="POST" action="?/deletePhase" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<button
										type="submit"
										onclick={(e) => !confirm(`Hapus Fase "${p.title}" beserta seluruh sub-fase & materinya?`) && e.preventDefault()}
										class="btn-ghost"
										style="padding: 4px 10px; font-size: 12px; color: var(--red);"
									>
										Hapus
									</button>
								</form>

								<button
									onclick={() => (activePhaseForSubPhase = p.id)}
									class="btn-primary"
									style="width: auto; padding: 4px 12px; font-size: 12px;"
								>
									+ Sub-fase
								</button>
							</div>
						</div>

						<!-- Sub-phases -->
						{#if expandedPhases[p.id]}
							<div class="p-4 space-y-3">
								{#if p.subPhases.length === 0}
									<div class="panel-inset p-4 text-center text-xs text-muted">
										Belum ada sub-fase. Klik "+ Sub-fase" di atas untuk menambah.
									</div>
								{:else}
									{#each p.subPhases as sp, spIdx}
										<div class="panel-inset p-4">
											<div class="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-soft)]">
												<div class="flex items-center gap-2">
													<span class="type-mono font-bold" style="color: var(--primary);">{p.sortOrder}.{sp.sortOrder}</span>
													<span style="font-weight: 600; color: var(--text-primary); font-size: 14px;">{sp.title}</span>
													{#if sp.description}
														<span class="type-mono text-muted">({sp.description})</span>
													{/if}
												</div>

												<div class="flex items-center gap-2">
													<div class="flex items-center">
														<button
															onclick={() => moveItem('subPhase', p.id, p.subPhases, spIdx, 'up')}
															disabled={spIdx === 0 || isReordering}
															class="btn-ghost"
															style="padding: 2px 6px; font-size: 10px;"
														>▲</button>
														<button
															onclick={() => moveItem('subPhase', p.id, p.subPhases, spIdx, 'down')}
															disabled={spIdx === p.subPhases.length - 1 || isReordering}
															class="btn-ghost"
															style="padding: 2px 6px; font-size: 10px;"
														>▼</button>
													</div>

													<button
														onclick={() => (editingSubPhase = { id: sp.id, title: sp.title, description: sp.description || '' })}
														class="btn-ghost"
														style="padding: 2px 8px; font-size: 11px;"
													>
														Edit
													</button>

													<form method="POST" action="?/deleteSubPhase" use:enhance>
														<input type="hidden" name="id" value={sp.id} />
														<button
															type="submit"
															onclick={(e) => !confirm(`Hapus Sub-fase "${sp.title}"?`) && e.preventDefault()}
															class="btn-ghost"
															style="padding: 2px 8px; font-size: 11px; color: var(--red);"
														>
															Hapus
														</button>
													</form>

													<button
														onclick={() => (activeSubPhaseForMateri = sp.id)}
														class="btn-ghost"
														style="padding: 2px 10px; font-size: 11px; color: var(--primary); border-color: var(--border-accent);"
													>
														+ Materi
													</button>
												</div>
											</div>

											<!-- Materis -->
											<div class="space-y-2">
												{#if sp.materis.length === 0}
													<div class="type-mono text-muted" style="font-size: 11px; padding: 4px 0;">
														Belum ada materi modul.
													</div>
												{:else}
													{#each sp.materis as m, mIdx}
														<div class="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-soft)]">
															<div class="flex items-center gap-3">
																<span class="badge badge-live" style="font-size: 10px;">M-{m.sortOrder}</span>
																<span style="font-size: 13px; font-weight: 500; color: var(--text-primary);">{m.title}</span>
																{#if m.content}
																	<span class="badge badge-hadir" style="font-size: 10px;">Ada Konten</span>
																{:else}
																	<span class="badge badge-pending" style="font-size: 10px;">Kosong</span>
																{/if}
															</div>

															<div class="flex items-center gap-2">
																{#if m.content}
																	<button
																		type="button"
																		onclick={() => (previewMateri = { title: m.title, content: m.content, id: m.id })}
																		class="btn-ghost"
																		style="padding: 4px 10px; font-size: 11px;"
																	>
																		Preview
																	</button>
																{/if}

																<a
																	href="/mentor/kurikulum/{data.track.id}/materi/{m.id}"
																	class="btn-primary"
																	style="width: auto; padding: 4px 12px; font-size: 11px;"
																>
																	Edit →
																</a>
															</div>
														</div>
													{/each}
												{/if}
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

	</div>
</div>

<!-- PREVIEW MODAL -->
{#if previewMateri}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onclick={(e) => e.target === e.currentTarget && (previewMateri = null)}>
		<div class="panel w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
			<div class="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
				<h3 style="font-family: var(--font-macro); font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
					Preview: {previewMateri.title}
				</h3>
				<button onclick={() => (previewMateri = null)} class="btn-ghost" style="padding: 4px 10px;">✕</button>
			</div>

			<div class="flex-1 overflow-y-auto p-6 text-[var(--text-secondary)] leading-relaxed">
				{@html previewMateri.content || '<p class="type-mono text-muted">Belum ada konten materi.</p>'}
			</div>

			<div class="p-6 border-t border-[var(--border-soft)] flex items-center justify-between">
				<span class="type-mono text-muted">Read-Only Preview</span>
				<div class="flex items-center gap-3">
					<button onclick={() => (previewMateri = null)} class="btn-ghost">Tutup</button>
					<a href="/mentor/kurikulum/{data.track.id}/materi/{previewMateri.id}" class="btn-primary" style="width: auto;">Buka Editor →</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL ADD PHASE -->
{#if showAddPhaseModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onclick={(e) => e.target === e.currentTarget && (showAddPhaseModal = false)}>
		<div class="panel w-full max-w-lg shadow-2xl overflow-hidden">
			<div class="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
				<h2 style="font-family: var(--font-macro); font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">Tambah Fase Baru</h2>
				<button onclick={() => (showAddPhaseModal = false)} class="btn-ghost" style="padding: 4px 10px;">✕</button>
			</div>

			<form method="POST" action="?/createPhase" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showAddPhaseModal = false;
				};
			}}>
				<div class="p-6 space-y-4">
					<div>
						<label for="phaseTitle" class="field-label">Judul Fase *</label>
						<input type="text" id="phaseTitle" name="title" required placeholder="Contoh: Fase 1 — Routing Protocols" class="field-input" />
					</div>
					<div>
						<label for="phaseDesc" class="field-label">Deskripsi Fase (Opsional)</label>
						<textarea id="phaseDesc" name="description" rows="3" class="field-input" style="resize: none;"></textarea>
					</div>
				</div>
				<div class="p-6 border-t border-[var(--border-soft)] flex justify-end gap-3">
					<button type="button" onclick={() => (showAddPhaseModal = false)} class="btn-ghost">Batal</button>
					<button type="submit" class="btn-primary" style="width: auto;">Simpan Fase</button>
				</div>
			</form>
		</div>
	</div>
{/if}

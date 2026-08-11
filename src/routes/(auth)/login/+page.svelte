<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Login — Nesaga Learning Community</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 font-sans">
	<div class="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-sm">
		<div class="text-center">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20 text-2xl">
				NLC
			</div>
			<h1 class="mt-4 text-2xl font-bold tracking-tight text-white">Nesaga Learning</h1>
			<p class="mt-1 text-sm text-slate-400">Komunitas Belajar TKJ SMK Nesaga</p>
		</div>

		{#if form?.error}
			<div class="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-300">
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{form.error}</span>
				</div>
			</div>
		{/if}

		<form method="POST" class="space-y-5">
			<div>
				<label for="username" class="block text-sm font-medium text-slate-300">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					required
					value={form?.username ?? ''}
					placeholder="Masukkan username"
					class="mt-1.5 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-slate-300">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					placeholder="••••••••"
					class="mt-1.5 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
				/>
			</div>

			<div class="flex items-center justify-between">
				<label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
					<input
						type="checkbox"
						name="rememberMe"
						class="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500/20"
					/>
					<span>Ingat saya di perangkat ini</span>
				</label>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-[0.99]"
			>
				Masuk Akun
			</button>
		</form>

		<div class="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
			Akun dev default: <code class="text-blue-400">admin</code>, <code class="text-blue-400">guru</code>, <code class="text-blue-400">mentor</code>, <code class="text-blue-400">siswa1</code> (password: <code class="text-blue-400">password123</code>)
		</div>
	</div>
</div>

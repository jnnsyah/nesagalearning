<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard Siswa — NLC</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 p-6 text-slate-100 font-sans">
	<div class="mx-auto max-w-4xl space-y-6">
		<header class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur">
			<div>
				<span class="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-2">Role: Siswa</span>
				<h1 class="text-2xl font-bold text-white">Selamat Datang, {data.user?.fullName}</h1>
				<p class="text-sm text-slate-400">@{data.user?.username}</p>
			</div>
			<a href="/logout" class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700">
				Keluar
			</a>
		</header>
	</div>
</div>

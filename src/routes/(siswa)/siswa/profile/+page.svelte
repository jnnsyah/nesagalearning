<script lang="ts">
	import ProfileView from '$lib/components/profile/ProfileView.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Profil Saya | Portal Siswa NLC</title>
	<meta name="description" content="Halaman profil pengguna siswa Nesaga Learning Community" />
</svelte:head>

<ProfileView
	user={data.user}
	stats={data.stats}
	pointLogs={data.pointLogs}
	availableAvatars={data.availableAvatars}
	formErrors={form?.errors}
/>

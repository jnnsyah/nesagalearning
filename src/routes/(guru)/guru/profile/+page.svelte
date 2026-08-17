<script lang="ts">
	import ProfileView from '$lib/components/profile/ProfileView.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Profil Saya | Supervisi Guru NLC</title>
	<meta name="description" content="Halaman profil guru supervisor Nesaga Learning Community" />
</svelte:head>

<ProfileView
	user={data.user}
	stats={data.stats}
	availableAvatars={data.availableAvatars}
	formErrors={form?.errors}
/>

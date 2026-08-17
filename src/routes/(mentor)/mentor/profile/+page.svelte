<script lang="ts">
	import ProfileView from '$lib/components/profile/ProfileView.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Profil Saya | Portal Mentor NLC</title>
	<meta name="description" content="Halaman profil mentor pendamping Nesaga Learning Community" />
</svelte:head>

<ProfileView
	user={data.user}
	stats={data.stats}
	availableAvatars={data.availableAvatars}
	formErrors={form?.errors}
/>

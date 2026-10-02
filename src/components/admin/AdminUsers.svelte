<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '../../lib/api/types';
	import { readMockBlockedData, writeMockBlockedData } from '../../lib/mockData';
	let users: User[] = [];
	let name = '', email = '', notice = '';
	function load() { users = readMockBlockedData().users; }
	function save() {
		const data = readMockBlockedData();
		const next: User = { id: Math.max(0, ...data.users.map((item) => item.id)) + 1, name: name.trim(), email: email.trim(), alias: null, phoneCode: null, phoneNumber: null, idNumber: null, externalId: null };
		data.users = [...data.users, next]; writeMockBlockedData(data); name = ''; email = ''; notice = 'El usuario de prueba se creó.'; load();
	}
	function remove(id: number) { if (!window.confirm('¿Eliminar este usuario de prueba?')) return; const data = readMockBlockedData(); data.users = data.users.filter((item) => item.id !== id); writeMockBlockedData(data); notice = 'El usuario de prueba se eliminó.'; load(); }
	onMount(load);
</script>
<aside class="demo-note"><p class="route-label">DATOS DE PRUEBA</p><p>La lista real de usuarios devuelve un error del servidor. Estos cambios quedan en este navegador.</p></aside>
{#if notice}<p class="state-box" role="status">{notice}</p>{/if}
<form class="semantic-form compact-form" on:submit|preventDefault={save}><h2>Crear usuario</h2><label><span class="label">Nombre</span><input class="field" required bind:value={name} /></label><label><span class="label">Correo</span><input class="field" type="email" required bind:value={email} /></label><button class="button" type="submit">Crear usuario de prueba</button></form>
<div class="responsive-list">{#each users as user}<article><div><p class="route-label">USUARIO #{user.id}</p><h2>{user.name ?? 'Sin nombre'}</h2><p>{user.email ?? 'Sin correo'}</p></div><div class="action-row"><a class="button-secondary" href={`/admin/users/${user.id}`}>Ver</a><button class="button-danger" type="button" on:click={() => remove(user.id)}>Eliminar</button></div></article>{/each}</div>

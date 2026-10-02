<script lang="ts">
	import { onMount } from 'svelte';
	import type { Role, User } from '../../lib/api/types';
	import { rolesApi } from '../../lib/api/users';
	import { readMockBlockedData, writeMockBlockedData } from '../../lib/mockData';
	export let id: number;
	let user: User | null = null, roles: Role[] = [], roleId = '', notice = '', name = '', email = '';
	onMount(async () => { const data = readMockBlockedData(); user = data.users.find((item) => item.id === id) ?? null; name = user?.name ?? ''; email = user?.email ?? ''; roleId = data.rolesByUser[id]?.toString() ?? ''; try { roles = await rolesApi.list(); } catch { roles = []; } });
	function save() { if (!user) return; const data = readMockBlockedData(); user = { ...user, name: name.trim(), email: email.trim() }; data.users = data.users.map((item) => item.id === id ? user! : item); if (roleId) data.rolesByUser[id] = Number(roleId); else delete data.rolesByUser[id]; writeMockBlockedData(data); notice = 'Los datos y el rol de prueba se guardaron.'; }
</script>
{#if !user}<p class="state-box">Cargando usuario…</p>{:else}<aside class="demo-note"><p class="route-label">DATOS DE PRUEBA</p><p>El perfil y su rol se muestran para revisar la interfaz. No cambian la identidad del backend.</p></aside><form class="semantic-form" on:submit|preventDefault={save}><label><span class="label">Nombre</span><input class="field" bind:value={name} required /></label><label><span class="label">Correo</span><input class="field" type="email" bind:value={email} required /></label><label><span class="label">Rol</span><select class="field" bind:value={roleId}><option value="">Sin asignar</option>{#each roles as role}<option value={role.id}>{role.name}</option>{/each}</select></label><button class="button" type="submit">Guardar datos de prueba</button>{#if notice}<p role="status">{notice}</p>{/if}</form><section class="detail-section"><h2>Direcciones</h2><div class="responsive-list">{#each readMockBlockedData().addresses.filter((address) => address.userId === id) as address}<article><div><h3>{address.name}</h3><p>{address.address}, {address.city}</p></div></article>{:else}<p>No hay direcciones.</p>{/each}</div></section>{/if}

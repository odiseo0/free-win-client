<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { rolesApi } from '../../lib/api/users';
	import type { Role } from '../../lib/api/types';
	import StateNotice from '../ui/StateNotice.svelte';
	let roles: Role[] = [], loading = true, error = '';
	async function load() { loading = true; try { roles = await rolesApi.list(); } catch (caught) { error = getApiErrorMessage(caught); } finally { loading = false; } }
	onMount(load);
</script>
{#if loading}<StateNotice kind="loading" message="Cargando roles…" />{:else if error}<StateNotice kind="error" message={error} />{:else}<div class="responsive-list">{#each roles as role}<article><div><p class="route-label">{role.isSystem ? 'ROL DEL SISTEMA' : 'ROL PERSONALIZADO'}</p><h2>{role.name}</h2><p>{role.description ?? 'Sin descripción'} · {role.permissions?.length ?? 0} permisos</p></div><a class="button-secondary" href={`/admin/roles/${role.id}`}>Ver permisos</a></article>{/each}</div>{/if}

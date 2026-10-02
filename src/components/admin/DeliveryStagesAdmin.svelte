<script lang="ts">
	import { onMount } from 'svelte';
	import { deliveryStagesApi } from '../../lib/api/deliveries';
	import { getApiErrorMessage } from '../../lib/api/client';
	import type { DeliveryStage, DeliveryStageScope } from '../../lib/api/types';
	export let id: number | null = null;
	export let mode: 'list' | 'form' = 'list';
	let stages: DeliveryStage[] = [], current: DeliveryStage | null = null;
	let scope: DeliveryStageScope = 'international', key = '', name = '', position = 0;
	let kind: 'progress' | 'exception' = 'progress', isTerminal = false, isActive = true;
	let loading = true, error = '', notice = '';
	async function load() {
		try {
			stages = await deliveryStagesApi.list();
			if (id) {
				current = stages.find((item) => item.id === id) ?? null;
				if (current) ({ scope, key, name, position, kind, isTerminal, isActive } = current);
			}
		} catch (caught) { error = getApiErrorMessage(caught); }
		finally { loading = false; }
	}
	async function save() {
		error = '';
		try {
			if (id) { current = await deliveryStagesApi.update(id, { name, position, kind, isTerminal, isActive }); notice = 'La etapa se actualizó.'; }
			else { const created = await deliveryStagesApi.create({ scope, key, name, position, kind, isTerminal }); window.location.assign(`/admin/delivery-stages/${created.id}`); }
		} catch (caught) { error = getApiErrorMessage(caught); }
	}
	onMount(load);
</script>

{#if loading}
	<p class="state-box">Cargando etapas…</p>
{:else if mode === 'form'}
	<form class="semantic-form" on:submit|preventDefault={save}>
		<label><span class="label">Ámbito</span><select class="field" bind:value={scope} disabled={Boolean(id)}><option value="international">Internacional</option><option value="national">Nacional</option><option value="pickup">Retiro</option></select></label>
		<label><span class="label">Clave estable</span><input class="field" pattern="[a-z][a-z0-9_]{1,49}" required bind:value={key} disabled={Boolean(id)} /></label>
		<label><span class="label">Nombre visible</span><input class="field" required bind:value={name} /></label>
		<label><span class="label">Posición</span><input class="field" type="number" min="0" bind:value={position} /></label>
		<label><span class="label">Tipo</span><select class="field" bind:value={kind}><option value="progress">Progreso</option><option value="exception">Incidencia</option></select></label>
		<label class="check-row"><input type="checkbox" bind:checked={isTerminal} /> Etapa final</label>
		{#if id}<label class="check-row"><input type="checkbox" bind:checked={isActive} /> Activa</label>{/if}
		{#if error}<p class="error-text" role="alert">{error}</p>{/if}{#if notice}<p role="status">{notice}</p>{/if}
		<button class="button" type="submit">Guardar etapa</button>
	</form>
{:else}
	<div class="responsive-list">{#each stages as stage}<article><div><p class="route-label">{stage.scope} / {stage.kind}</p><h2>{stage.name}</h2><p>{stage.key} · Posición {stage.position} · {stage.isActive ? 'Activa' : 'Inactiva'}{stage.isTerminal ? ' · Final' : ''}</p></div><a class="button-secondary" href={`/admin/delivery-stages/${stage.id}`}>Editar</a></article>{/each}</div>
{/if}

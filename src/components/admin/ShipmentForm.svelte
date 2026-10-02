<script lang="ts">
	import { onMount } from 'svelte';
	import { shipmentsApi } from '../../lib/api/deliveries';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import { getApiErrorMessage } from '../../lib/api/client';
	import type { OrderRequest } from '../../lib/api/types';
	export let orderPeriodId: number;
	let orders: OrderRequest[] = [], name = '', reference = '', externalReferences = '', selected: number[] = [], error = '', saving = false;
	onMount(async () => { try { orders = (await orderRequestsApi.list({ page: 1, shows: 100, orderPeriodId })).items.filter((item) => item.status === 'paid'); } catch (caught) { error = getApiErrorMessage(caught); } });
	async function save() { saving = true; error = ''; try { const shipment = await shipmentsApi.create({ orderPeriodId, name, reference: reference || null, externalReferences: externalReferences.split('\n').map((item) => item.trim()).filter(Boolean), allocations: selected.map((orderRequestId) => ({ orderRequestId })) }); window.location.assign(`/admin/shipments/${shipment.id}`); } catch (caught) { error = getApiErrorMessage(caught); saving = false; } }
</script>
<form class="semantic-form wide-form" on:submit|preventDefault={save}><label><span class="label">Nombre del envío</span><input class="field" required bind:value={name} /></label><label><span class="label">Referencia</span><input class="field" bind:value={reference} /></label><label><span class="label">Referencias externas, una por línea</span><textarea class="field" rows="4" bind:value={externalReferences}></textarea></label><fieldset><legend>Órdenes pagadas</legend><div class="permission-grid">{#each orders as order}<label><input type="checkbox" value={order.id} bind:group={selected} /><span><strong>Orden #{order.id}</strong><small>{order.items.filter((item) => !item.removedAt).length} cartas</small></span></label>{:else}<p>No hay Órdenes pagadas disponibles.</p>{/each}</div></fieldset>{#if error}<p class="error-text" role="alert">{error}</p>{/if}<button class="button" type="submit" disabled={saving || selected.length === 0}>{saving ? 'Creando…' : 'Crear envío'}</button></form>

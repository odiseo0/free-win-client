<script lang="ts">
	import { onMount } from 'svelte';
	import { shipmentsApi } from '../../lib/api/deliveries';
	import { orderPeriodsApi } from '../../lib/api/workflow';
	import { getApiErrorMessage } from '../../lib/api/client';
	import type { InternationalShipment, OrderPeriod } from '../../lib/api/types';
	let periods: OrderPeriod[] = [], shipments: InternationalShipment[] = [], periodId = '', loading = true, error = '';
	export let initialPeriodId: number | null = null;
	async function loadShipments() { if (!periodId) { shipments = []; return; } error = ''; try { shipments = await shipmentsApi.list(Number(periodId)); } catch (caught) { error = getApiErrorMessage(caught); } }
	onMount(async () => { try { periods = (await orderPeriodsApi.list({ page: 1, shows: 100 })).items; periodId = initialPeriodId?.toString() ?? periods[0]?.id.toString() ?? ''; await loadShipments(); } catch (caught) { error = getApiErrorMessage(caught); } finally { loading = false; } });
</script>
{#if loading}<p class="state-box">Cargando envíos…</p>{:else}<form class="filter-bar" on:submit|preventDefault={loadShipments}><label><span class="label">Pedido</span><select class="field" bind:value={periodId}>{#each periods as period}<option value={period.id}>{period.name}</option>{/each}</select></label><button class="button-secondary" type="submit">Ver envíos</button><a class="button" href={`/admin/shipments/new?orderPeriodId=${periodId}`}>Crear envío</a></form>{#if error}<p class="state-box error-text">{error}</p>{:else if shipments.length === 0}<p class="state-box">No hay envíos para este Pedido.</p>{:else}<div class="responsive-list">{#each shipments as shipment}<article><div><p class="route-label">ENVÍO #{shipment.id} / PEDIDO #{shipment.orderPeriodId}</p><h2>{shipment.name}</h2><p>{shipment.currentStage.name} · {shipment.allocations.length} asignaciones · {shipment.reference ?? 'Sin referencia'}</p></div><a class="button-secondary" href={`/admin/shipments/${shipment.id}`}>Gestionar</a></article>{/each}</div>{/if}{/if}

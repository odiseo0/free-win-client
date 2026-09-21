<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderPeriodsApi } from '../../lib/api/workflow';
	import type { OrderPeriod } from '../../lib/api/types';
	import { formatDate, periodStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let admin = false;
	let periods: OrderPeriod[] = [];
	let loading = true;
	let error = '';

	async function load() {
		loading = true;
		error = '';
		try {
			const response = await orderPeriodsApi.list({
				page: 1,
				shows: 100,
				status: admin ? undefined : 'open',
			});
			periods = response.items;
		} catch (caught) {
			error = getApiErrorMessage(caught);
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando Pedidos…" />
{:else if error}
	<div class="space-y-3">
		<StateNotice kind="error" message={error} />
		<button class="button-secondary" on:click={load}>Intentar nuevamente</button>
	</div>
{:else if periods.length === 0}
	<StateNotice message={admin ? 'Todavía no hay Pedidos disponibles.' : 'No hay un Pedido abierto en este momento.'} />
{:else if admin}
	<div class="overflow-x-auto rounded-lg border border-stone-800">
		<table class="w-full min-w-3xl border-collapse text-left text-sm">
			<thead class="bg-stone-900 text-stone-300">
				<tr>
					<th class="px-4 py-3 font-semibold" scope="col">Nombre del Pedido</th>
					<th class="px-4 py-3 font-semibold" scope="col">Estado</th>
					<th class="px-4 py-3 font-semibold" scope="col">Fecha de apertura</th>
					<th class="px-4 py-3 font-semibold" scope="col">Fecha de cierre</th>
					<th class="px-4 py-3 text-right font-semibold" scope="col">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-stone-800">
				{#each periods as period}
					<tr class="bg-stone-950 align-middle">
						<th class="px-4 py-3 font-medium text-stone-100" scope="row">{period.name}</th>
						<td data-label="Estado" class="px-4 py-3"><span class="status">{periodStatusLabels[period.status]}</span></td>
						<td data-label="Apertura" class="whitespace-nowrap px-4 py-3 text-stone-300">{formatDate(period.opensAt)}</td>
						<td data-label="Cierre" class="whitespace-nowrap px-4 py-3 text-stone-300">{formatDate(period.closesAt)}</td>
						<td data-label="Acciones" class="px-4 py-3 text-right">
							<a class="button-secondary" href={`/admin/order-periods/${period.id}`}>Ver</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="period-list">
		{#each periods as period}
			<article class="period-row">
				<div class="period-row-heading">
					<div><p class="route-label">PEDIDO #{period.id}</p><h2>{period.name}</h2></div>
					<span class="status period-state">Pedido {periodStatusLabels[period.status].toLowerCase()}</span>
				</div>
				<dl>
					<div>
						<dt>Apertura</dt>
						<dd>{formatDate(period.opensAt)}</dd>
					</div>
					<div>
						<dt>Cierre</dt>
						<dd>{formatDate(period.closesAt)}</dd>
					</div>
				</dl>
				<a
					class="button-secondary period-row-action"
					href={`/order-periods/${period.id}`}
				>
					Ver Pedido
				</a>
			</article>
		{/each}
	</div>
{/if}

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
			const response = await orderPeriodsApi.list({ page: 1, shows: 100 });
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
	<StateNotice message="Todavía no hay Pedidos disponibles." />
{:else}
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each periods as period}
			<article class="panel flex flex-col">
				<div class="flex items-start justify-between gap-4">
					<h2 class="text-lg font-semibold text-white">{period.name}</h2>
					<span class="status">{periodStatusLabels[period.status]}</span>
				</div>
				<dl class="mt-5 grid gap-3 text-sm">
					<div>
						<dt class="text-stone-500">Apertura</dt>
						<dd class="mt-0.5 text-stone-200">{formatDate(period.opensAt)}</dd>
					</div>
					<div>
						<dt class="text-stone-500">Cierre</dt>
						<dd class="mt-0.5 text-stone-200">{formatDate(period.closesAt)}</dd>
					</div>
				</dl>
				<a
					class="button-secondary mt-6"
					href={admin ? `/admin/order-periods/${period.id}` : `/order-periods/${period.id}`}
				>
					{admin ? 'Administrar Pedido' : 'Ver Pedido'}
				</a>
			</article>
		{/each}
	</div>
{/if}


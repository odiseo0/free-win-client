<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type { OrderRequest } from '../../lib/api/types';
	import { formatDate, formatMoney, orderStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let admin = false;
	export let initialOrderPeriodId: number | null = null;
	let orders: OrderRequest[] = [];
	let loading = true;
	let error = '';
	let periodFilter = initialOrderPeriodId?.toString() ?? '';
	$: activeOrders = orders.filter((order) => order.status === 'submitted' || order.status === 'in_review');
	$: pastOrders = orders.filter((order) => order.status === 'accepted' || order.status === 'rejected' || order.status === 'cancelled');

	async function load() {
		loading = true;
		error = '';
		try {
			const response = await orderRequestsApi.list({
				page: 1,
				shows: 100,
				orderPeriodId: periodFilter ? Number(periodFilter) : undefined,
			});
			orders = response.items;
		} catch (caught) {
			error = getApiErrorMessage(caught);
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

{#snippet orderRows(list: OrderRequest[])}
	<div class="overflow-hidden rounded-2xl border border-stone-800">
		<div class="divide-y divide-stone-800">
			{#each list as order}
				<a
					class="grid gap-3 bg-stone-900/60 p-5 transition hover:bg-stone-900 sm:grid-cols-[1fr_auto] sm:items-center"
					href={admin ? `/admin/orders/${order.id}` : `/orders/${order.id}`}
				>
					<div>
						<div class="flex flex-wrap items-center gap-3">
							<h3 class="font-semibold text-white">Orden #{order.id}</h3>
							<span class="status">{orderStatusLabels[order.status]}</span>
						</div>
						<p class="mt-2 text-sm text-stone-400">
							Pedido #{order.orderPeriodId} · {order.items.filter((item) => !item.removedAt).length} cartas · {formatDate(order.dateAdded)}
						</p>
					</div>
					<p class="font-semibold text-stone-100">{formatMoney(order.agreedTotal, order.currency)}</p>
				</a>
			{/each}
		</div>
	</div>
{/snippet}

{#if admin}
	<form class="panel mb-6 flex flex-col gap-3 sm:flex-row sm:items-end" on:submit|preventDefault={load}>
		<label class="flex-1">
			<span class="label">Filtrar por identificador de Pedido</span>
			<input class="field" type="number" min="1" bind:value={periodFilter} placeholder="Ej. 12" />
		</label>
		<button class="button-secondary" type="submit">Aplicar filtro</button>
	</form>
{/if}

{#if loading}
	<StateNotice kind="loading" message="Cargando órdenes…" />
{:else if error}
	<StateNotice kind="error" message={error} />
{:else if orders.length === 0}
	<StateNotice message="No hay órdenes para mostrar." />
{:else if admin}
	{@render orderRows(orders)}
{:else}
	<div class="space-y-10">
		<section aria-labelledby="active-orders-heading">
			<h2 id="active-orders-heading" class="mb-4 text-xl font-semibold text-white">Órdenes activas</h2>
			{#if activeOrders.length > 0}
				{@render orderRows(activeOrders)}
			{:else}
				<StateNotice message="No tienes órdenes activas." />
			{/if}
		</section>

		<section aria-labelledby="past-orders-heading">
			<h2 id="past-orders-heading" class="mb-4 text-xl font-semibold text-white">Órdenes anteriores</h2>
			{#if pastOrders.length > 0}
				{@render orderRows(pastOrders)}
			{:else}
				<StateNotice message="No tienes órdenes anteriores." />
			{/if}
		</section>
	</div>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type { OrderRequest } from '../../lib/api/types';
	import { canEditParticipantOrder, formatDate, formatMoney, isValidRequestedQuantity, orderStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;
	let order: OrderRequest | null = null;
	let loading = true;
	let saving = false;
	let loadError = '';
	let mutationError = '';
	let quantities: Record<number, number> = {};

	async function refresh() {
		const nextOrder = await orderRequestsApi.get(id);
		order = nextOrder;
		quantities = Object.fromEntries(
			nextOrder.items.map((item) => [item.id, item.requestedQuantity]),
		);
	}

	async function load() {
		loading = true;
		try {
			await refresh();
		} catch (caught) {
			loadError = getApiErrorMessage(caught);
		} finally {
			loading = false;
		}
	}

	async function saveQuantity(itemId: number) {
		if (!order) return;
		if (!isValidRequestedQuantity(quantities[itemId])) {
			mutationError = 'La cantidad solicitada debe ser un número entero mayor que cero.';
			return;
		}
		saving = true;
		mutationError = '';
		try {
			await orderRequestsApi.updateItem(order.id, itemId, {
				requestedQuantity: quantities[itemId],
			});
			await refresh();
		} catch (caught) {
			mutationError = getApiErrorMessage(caught);
		} finally {
			saving = false;
		}
	}

	onMount(load);
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando la orden…" />
{:else if loadError && !order}
	<StateNotice kind="error" message={loadError} />
{:else if order}
	<section class="panel">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm text-stone-500">Pedido #{order.orderPeriodId}</p>
				<h1 class="mt-1 text-2xl font-bold text-white">Estado de la orden</h1>
				<p class="mt-2 text-sm text-stone-400">Enviada el {formatDate(order.dateAdded)}</p>
			</div>
			<div class="text-right">
				<span class="status">{orderStatusLabels[order.status]}</span>
				<p class="mt-3 text-xl font-bold text-white">{formatMoney(order.agreedTotal, order.currency)}</p>
				<a class="button-secondary mt-4" href={`/admin/orders/${order.id}`}>
					Revisar como organizador
				</a>
			</div>
		</div>
	</section>

	{#if mutationError}<p class="mt-5 rounded-lg bg-red-950/50 p-3 text-sm text-red-300" role="alert">{mutationError}</p>{/if}

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Cartas solicitadas</h2>
		<div class="mt-4 overflow-x-auto rounded-lg border border-stone-800">
			<table class="w-full min-w-3xl border-collapse text-left text-sm">
				<thead class="bg-stone-900 text-stone-300">
					<tr>
						<th class="px-4 py-3 font-semibold" scope="col">Carta</th>
						<th class="px-4 py-3 font-semibold" scope="col">Cantidad</th>
						<th class="px-4 py-3 text-right font-semibold" scope="col">Precio estimado</th>
						<th class="px-4 py-3 text-right font-semibold" scope="col">Total estimado</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-stone-800">
					{#each order.items as item}
						<tr class:opacity-50={Boolean(item.removedAt)} class="bg-stone-950 align-middle">
							<th class="px-4 py-3 font-medium text-stone-100" scope="row">
								{item.cardName}
								<span class="mt-1 block font-normal text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</span>
							</th>
							<td class="px-4 py-3">
								{#if canEditParticipantOrder(order) && !item.removedAt}
									<div class="flex min-w-44 items-center gap-2">
										<label class="sr-only" for={`quantity-${item.id}`}>Cantidad de {item.cardName}</label>
										<input id={`quantity-${item.id}`} class="field w-20" type="number" min="1" bind:value={quantities[item.id]} />
										<button class="button-secondary" disabled={saving} on:click={() => saveQuantity(item.id)}>Guardar</button>
									</div>
								{:else}
									{item.requestedQuantity}
								{/if}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-right text-stone-300">{formatMoney(item.estimatedUnitPrice, order.currency)}</td>
							<td
								class="whitespace-nowrap px-4 py-3 text-right font-medium text-stone-100"
								title={`${formatMoney(item.estimatedUnitPrice, order.currency)} × ${quantities[item.id] ?? item.requestedQuantity} = ${formatMoney(Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity), order.currency)}`}
							>
								<span class="cursor-help border-b border-dotted border-stone-600">{formatMoney(Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity), order.currency)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type { OrderRequest, OrderRequestHistory } from '../../lib/api/types';
	import { canEditParticipantOrder, formatDate, formatMoney, isValidRequestedQuantity, orderEventLabels, orderStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;
	let order: OrderRequest | null = null;
	let history: OrderRequestHistory[] = [];
	let loading = true;
	let saving = false;
	let loadError = '';
	let mutationError = '';
	let note = '';
	let quantities: Record<number, number> = {};

	async function refresh() {
		const [nextOrder, nextHistory] = await Promise.all([
			orderRequestsApi.get(id),
			orderRequestsApi.history(id, { page: 1, shows: 100 }),
		]);
		order = nextOrder;
		note = nextOrder.note ?? '';
		quantities = Object.fromEntries(
			nextOrder.items.map((item) => [item.id, item.requestedQuantity]),
		);
		history = [...nextHistory].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
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

	async function saveNote() {
		if (!order) return;
		saving = true;
		mutationError = '';
		try {
			await orderRequestsApi.updateNote(order.id, { note: note.trim() || null });
			await refresh();
		} catch (caught) {
			mutationError = getApiErrorMessage(caught);
		} finally {
			saving = false;
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
				<h1 class="mt-1 text-2xl font-bold text-white">Orden #{order.id}</h1>
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
		<div class="mt-4 divide-y divide-stone-800">
			{#each order.items as item}
				<article class:opacity-50={Boolean(item.removedAt)} class="py-5 first:pt-0 last:pb-0">
					<div class="flex flex-col justify-between gap-4 sm:flex-row">
						<div>
							<h3 class="font-medium text-white">{item.cardName}</h3>
							<p class="mt-1 text-sm text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</p>
							<p class="mt-2 text-sm text-stone-300">Estimado: {formatMoney(item.estimatedUnitPrice, order.currency)}</p>
						</div>
						<dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
							<div><dt class="text-stone-500">Acordada</dt><dd>{item.agreedQuantity}</dd></div>
							<div><dt class="text-stone-500">Precio final</dt><dd>{formatMoney(item.finalUnitPrice, order.currency)}</dd></div>
							<div class="col-span-2"><dt class="text-stone-500">Total</dt><dd class="font-semibold">{formatMoney(item.agreedTotal, order.currency)}</dd></div>
						</dl>
					</div>
					{#if canEditParticipantOrder(order) && !item.removedAt}
						<div class="mt-4 flex max-w-xs items-end gap-2">
							<label class="flex-1"><span class="label">Cantidad solicitada</span><input class="field" type="number" min="1" bind:value={quantities[item.id]} /></label>
							<button class="button-secondary" disabled={saving} on:click={() => saveQuantity(item.id)}>Guardar</button>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Nota compartida</h2>
		<textarea class="field mt-4 min-h-28" maxlength="2000" bind:value={note} disabled={!canEditParticipantOrder(order)} placeholder="Sin nota"></textarea>
		{#if canEditParticipantOrder(order)}
			<button class="button-secondary mt-3" disabled={saving} on:click={saveNote}>Guardar nota</button>
		{/if}
	</section>

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Historial</h2>
		{#if history.length === 0}
			<p class="mt-3 text-sm text-stone-500">No hay eventos registrados.</p>
		{:else}
			<ol class="mt-4 space-y-3">
				{#each history as event}
					<li class="border-l-2 border-stone-700 pl-4 text-sm">
						<p class="font-medium text-stone-200">{orderEventLabels[event.event]}</p>
						<p class="mt-1 text-stone-500">{formatDate(event.occurredAt)} · Usuario #{event.actorUserId}</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{/if}

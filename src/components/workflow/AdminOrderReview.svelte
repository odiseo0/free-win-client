<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type { OrderRequest, OrderRequestHistory } from '../../lib/api/types';
	import { areValidPriceComponents, canAcceptOrder, canStartReview, formatDate, formatMoney, isValidAgreedQuantity, orderEventLabels, orderStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;
	type ReviewDraft = {
		agreedQuantity: number;
		cardUnitPrice: string;
		shippingUnitPrice: string;
		taxUnitPrice: string;
	};

	let order: OrderRequest | null = null;
	let history: OrderRequestHistory[] = [];
	let drafts: Record<number, ReviewDraft> = {};
	let loading = true;
	let saving = false;
	let loadError = '';
	let actionError = '';

	function syncDrafts(value: OrderRequest) {
		drafts = Object.fromEntries(value.items.map((item) => [item.id, {
			agreedQuantity: item.agreedQuantity,
			cardUnitPrice: item.cardUnitPrice ?? '',
			shippingUnitPrice: item.shippingUnitPrice ?? '',
			taxUnitPrice: item.taxUnitPrice ?? '',
		}]));
	}

	async function refresh() {
		const [nextOrder, nextHistory] = await Promise.all([
			orderRequestsApi.get(id),
			orderRequestsApi.history(id, { page: 1, shows: 100 }),
		]);
		order = nextOrder;
		syncDrafts(nextOrder);
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

	async function mutate(actions: Array<() => Promise<OrderRequest>>) {
		saving = true;
		actionError = '';
		try {
			for (const action of actions) {
				await action();
				await refresh();
			}
		} catch (caught) {
			actionError = getApiErrorMessage(caught);
			try {
				await refresh();
			} catch {
				// Preserve the mutation error; the user can reload if the refresh also failed.
			}
		} finally {
			saving = false;
		}
	}

	async function saveItem(itemId: number) {
		if (!order) return;
		const draft = drafts[itemId];
		const item = order.items.find((candidate) => candidate.id === itemId);
		if (!draft || !item || !isValidAgreedQuantity(draft.agreedQuantity, item.requestedQuantity)) {
			actionError = 'La cantidad acordada debe estar entre cero y la cantidad solicitada.';
			return;
		}
		if ([draft.cardUnitPrice, draft.shippingUnitPrice, draft.taxUnitPrice].some((value) => value === '')) {
			actionError = 'Completa los tres componentes de precio. El valor cero es válido.';
			return;
		}
		if (!areValidPriceComponents(
			draft.cardUnitPrice,
			draft.shippingUnitPrice,
			draft.taxUnitPrice,
		)) {
			actionError = 'Cada precio debe ser un número mayor o igual a cero.';
			return;
		}
		await mutate([
			() => orderRequestsApi.updateItem(order!.id, itemId, {
				agreedQuantity: draft.agreedQuantity,
			}),
			() => orderRequestsApi.updatePricing(order!.id, itemId, {
				cardUnitPrice: draft.cardUnitPrice,
				shippingUnitPrice: draft.shippingUnitPrice,
				taxUnitPrice: draft.taxUnitPrice,
			}),
		]);
	}

	function confirmTransition(message: string, action: () => Promise<OrderRequest>) {
		if (window.confirm(message)) void mutate([action]);
	}

	onMount(load);
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando la revisión…" />
{:else if loadError && !order}
	<StateNotice kind="error" message={loadError} />
{:else if order}
	<section class="panel">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm text-stone-500">Pedido #{order.orderPeriodId} · Usuario #{order.createdByUserId}</p>
				<h1 class="mt-1 text-2xl font-bold text-white">Revisar orden #{order.id}</h1>
			</div>
			<div class="text-right">
				<span class="status">{orderStatusLabels[order.status]}</span>
				<p class="mt-3 text-xl font-bold text-white">{formatMoney(order.agreedTotal, order.currency)}</p>
				<a class="button-secondary mt-4" href={`/orders/${order.id}`}>
					Ver como participante
				</a>
			</div>
		</div>
		{#if order.note}<p class="mt-5 rounded-xl bg-stone-950 p-4 text-sm text-stone-300">{order.note}</p>{/if}
		<div class="mt-6 flex flex-wrap gap-3">
			{#if canStartReview(order)}
				<button class="button" disabled={saving} on:click={() => mutate([() => orderRequestsApi.startReview(order!.id)])}>Iniciar revisión</button>
			{/if}
			{#if order.status === 'submitted' || order.status === 'in_review'}
				<button
					class="button-danger"
					disabled={saving}
					on:click={() => confirmTransition('¿Confirmas que deseas rechazar esta orden?', () => orderRequestsApi.reject(order!.id))}
				>Rechazar orden</button>
			{/if}
			{#if order.status === 'in_review'}
				<button
					class="button"
					disabled={saving || !canAcceptOrder(order)}
					on:click={() => confirmTransition('¿Confirmas que cantidades, precios y total son correctos?', () => orderRequestsApi.accept(order!.id))}
				>Aceptar orden</button>
			{/if}
		</div>
	</section>

	{#if actionError}<p class="mt-5 rounded-lg bg-red-950/50 p-3 text-sm text-red-300" role="alert">{actionError}</p>{/if}

	<section class="mt-6 space-y-4">
		{#each order.items as item}
			<article class:opacity-50={Boolean(item.removedAt)} class="panel">
				<div class="flex flex-col justify-between gap-3 sm:flex-row">
					<div>
						<h2 class="font-semibold text-white">{item.cardName}</h2>
						<p class="mt-1 text-sm text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</p>
						<p class="mt-1 text-sm text-stone-400">Solicitada: {item.requestedQuantity} · Estimado: {formatMoney(item.estimatedUnitPrice, order.currency)}</p>
					</div>
					<div class="text-sm sm:text-right">
						<p class="text-stone-500">Total calculado</p>
						<p class="mt-1 font-semibold text-white">{formatMoney(item.agreedTotal, order.currency)}</p>
					</div>
				</div>
				{#if order.status === 'in_review' && !item.removedAt}
					<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<label><span class="label">Cantidad acordada</span><input class="field" type="number" min="0" max={item.requestedQuantity} bind:value={drafts[item.id].agreedQuantity} /></label>
						<label><span class="label">Carta (USD)</span><input class="field" type="number" min="0" step="0.01" bind:value={drafts[item.id].cardUnitPrice} /></label>
						<label><span class="label">Envío (USD)</span><input class="field" type="number" min="0" step="0.01" bind:value={drafts[item.id].shippingUnitPrice} /></label>
						<label><span class="label">Impuesto (USD)</span><input class="field" type="number" min="0" step="0.01" bind:value={drafts[item.id].taxUnitPrice} /></label>
					</div>
					<button class="button-secondary mt-4" disabled={saving} on:click={() => saveItem(item.id)}>Guardar revisión del ítem</button>
				{:else}
					<dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
						<div><dt class="text-stone-500">Acordada</dt><dd>{item.agreedQuantity}</dd></div>
						<div><dt class="text-stone-500">Carta</dt><dd>{formatMoney(item.cardUnitPrice, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Envío</dt><dd>{formatMoney(item.shippingUnitPrice, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Impuesto</dt><dd>{formatMoney(item.taxUnitPrice, order.currency)}</dd></div>
					</dl>
				{/if}
			</article>
		{/each}
	</section>

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Historial</h2>
		<ol class="mt-4 space-y-3">
			{#each history as event}
				<li class="border-l-2 border-stone-700 pl-4 text-sm">
					<p class="font-medium text-stone-200">{orderEventLabels[event.event]}</p>
					<p class="mt-1 text-stone-500">{formatDate(event.occurredAt)} · Usuario #{event.actorUserId}</p>
				</li>
			{/each}
		</ol>
	</section>
{/if}

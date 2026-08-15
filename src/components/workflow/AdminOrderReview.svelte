<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type {
		OrderRequest,
		OrderRequestHistory,
		OrderRequestItemPricingUpdate,
	} from '../../lib/api/types';
	import {
		areValidPriceComponents,
		calculateDefaultTaxUnitPrice,
		calculateItemPricingPreview,
		calculateOrderPricingPreview,
		canAcceptOrder,
		canStartReview,
		DEFAULT_SHIPPING_PRICE,
		formatDate,
		formatMoney,
		isValidAgreedQuantity,
		orderEventLabels,
		orderStatusLabels,
	} from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;
	type ReviewDraft = {
		agreedQuantity: number;
		cardUnitPrice: string;
		taxUnitPrice: string;
		taxIsAutomatic: boolean;
	};

	let order: OrderRequest | null = null;
	let history: OrderRequestHistory[] = [];
	let drafts: Record<number, ReviewDraft> = {};
	let shippingPrice = DEFAULT_SHIPPING_PRICE;
	let loading = true;
	let saving = false;
	let loadError = '';
	let actionError = '';

	function syncDrafts(value: OrderRequest) {
		shippingPrice = value.shippingPrice ?? DEFAULT_SHIPPING_PRICE;
		drafts = Object.fromEntries(value.items.map((item) => {
			const cardUnitPrice = item.cardUnitPrice ?? item.estimatedUnitPrice;
			const defaultTaxUnitPrice = calculateDefaultTaxUnitPrice(cardUnitPrice);
			return [item.id, {
				agreedQuantity: item.agreedQuantity,
				cardUnitPrice,
				taxUnitPrice: item.taxUnitPrice ?? defaultTaxUnitPrice,
				taxIsAutomatic:
					item.taxUnitPrice == null || item.taxUnitPrice === defaultTaxUnitPrice,
			}];
		}));
	}

	function getOrderPreview(
		value: OrderRequest,
		reviewDrafts: Record<number, ReviewDraft>,
		orderShippingPrice: string,
	) {
		return calculateOrderPricingPreview(
			value.items.map((item) => {
				const draft = reviewDrafts[item.id];
				return {
					cardUnitPrice: draft?.cardUnitPrice ?? item.cardUnitPrice ?? '',
					taxUnitPrice: draft?.taxUnitPrice ?? item.taxUnitPrice ?? '',
					agreedQuantity: draft?.agreedQuantity ?? item.agreedQuantity,
					removedAt: item.removedAt,
				};
			}),
			orderShippingPrice,
		);
	}

	function updateCardUnitPrice(itemId: number, event: Event) {
		const draft = drafts[itemId];
		if (!draft) return;
		draft.cardUnitPrice = (event.currentTarget as HTMLInputElement).value;
		if (draft.taxIsAutomatic) {
			draft.taxUnitPrice = calculateDefaultTaxUnitPrice(draft.cardUnitPrice);
		}
		drafts = { ...drafts };
	}

	function updateTaxUnitPrice(itemId: number, event: Event) {
		const draft = drafts[itemId];
		if (!draft) return;
		draft.taxUnitPrice = (event.currentTarget as HTMLInputElement).value;
		draft.taxIsAutomatic = false;
		drafts = { ...drafts };
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
		if ([draft.cardUnitPrice, draft.taxUnitPrice].some((value) => value === '')) {
			actionError = 'Completa el precio de la carta y el impuesto. El valor cero es válido.';
			return;
		}
		if (!areValidPriceComponents(
			draft.cardUnitPrice,
			draft.taxUnitPrice,
		)) {
			actionError = 'Cada precio debe ser un número mayor o igual a cero.';
			return;
		}
		const pricing: OrderRequestItemPricingUpdate = {
			cardUnitPrice: draft.cardUnitPrice,
		};
		if (!draft.taxIsAutomatic) pricing.taxUnitPrice = draft.taxUnitPrice;

		await mutate([
			() => orderRequestsApi.updateItem(order!.id, itemId, {
				agreedQuantity: draft.agreedQuantity,
			}),
			() => orderRequestsApi.updatePricing(order!.id, itemId, pricing),
		]);
	}

	async function saveShippingPrice() {
		if (!order) return;
		if (!areValidPriceComponents(shippingPrice)) {
			actionError = 'El envío debe ser un número mayor o igual a cero.';
			return;
		}
		await mutate([
			() => orderRequestsApi.updateOrderPricing(order!.id, { shippingPrice }),
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
	{@const orderPreview = order.status === 'in_review' ? getOrderPreview(order, drafts, shippingPrice) : null}
	<section class="panel">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm text-stone-500">Pedido #{order.orderPeriodId} · Usuario #{order.createdByUserId}</p>
				<h1 class="mt-1 text-2xl font-bold text-white">Revisar orden #{order.id}</h1>
			</div>
			<div class="text-right">
				<span class="status">{orderStatusLabels[order.status]}</span>
				<p class="mt-3 text-xl font-bold text-white">{formatMoney(orderPreview?.agreedTotal ?? order.agreedTotal, order.currency)}</p>
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

		{#if order.status === 'in_review'}
			<div class="mt-6 rounded-xl border border-stone-800 bg-stone-950 p-4">
				<div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
					<div>
						<h2 class="font-semibold text-white">Costos de la Orden</h2>
						<p class="mt-1 text-sm text-stone-400">El envío se aplica una sola vez, sin importar cuántas cartas o copias contiene la Orden.</p>
					</div>
					<div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-end">
						<label class="min-w-56 flex-1">
							<span class="label">Envío total (USD)</span>
							<input class="field" type="number" min="0" step="0.01" bind:value={shippingPrice} />
						</label>
						<button class="button-secondary" disabled={saving} on:click={saveShippingPrice}>Guardar envío</button>
					</div>
				</div>
				{#if orderPreview}
					<dl class="mt-5 grid grid-cols-2 gap-4 text-sm lg:grid-cols-4" aria-live="polite">
						<div><dt class="text-stone-500">Cartas</dt><dd class="mt-1 font-medium text-white">{formatMoney(orderPreview.cardSubtotal, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Impuestos</dt><dd class="mt-1 font-medium text-white">{formatMoney(orderPreview.taxTotal, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Envío</dt><dd class="mt-1 font-medium text-white">{formatMoney(orderPreview.shippingPrice, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Total estimado</dt><dd class="mt-1 font-semibold text-white">{formatMoney(orderPreview.agreedTotal, order.currency)}</dd></div>
					</dl>
				{/if}
			</div>
		{/if}
	</section>

	{#if actionError}<p class="mt-5 rounded-lg bg-red-950/50 p-3 text-sm text-red-300" role="alert">{actionError}</p>{/if}

	<section class="mt-6 space-y-4">
		{#each order.items as item}
			{@const draft = drafts[item.id]}
			{@const preview = order.status === 'in_review' && !item.removedAt && draft ? calculateItemPricingPreview(draft.cardUnitPrice, draft.taxUnitPrice, draft.agreedQuantity) : null}
			<article class:opacity-50={Boolean(item.removedAt)} class="panel">
				<div class="flex flex-col justify-between gap-3 sm:flex-row">
					<div>
						<h2 class="font-semibold text-white">{item.cardName}</h2>
						<p class="mt-1 text-sm text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</p>
						<p class="mt-1 text-sm text-stone-400">Solicitada: {item.requestedQuantity} · Estimado: {formatMoney(item.estimatedUnitPrice, order.currency)}</p>
					</div>
					<div class="text-sm sm:text-right">
						<p class="text-stone-500">Total calculado</p>
						<p class="mt-1 font-semibold text-white">{formatMoney(preview?.agreedTotal ?? item.agreedTotal, order.currency)}</p>
					</div>
				</div>
				{#if order.status === 'in_review' && !item.removedAt}
					<p class="mt-5 text-sm text-stone-400">El precio estimado se usa como punto de partida. El impuesto sugerido es el 16% por copia y puedes ajustarlo.</p>
					<div class="mt-5 grid gap-4 sm:grid-cols-3">
						<label><span class="label">Cantidad acordada</span><input class="field" type="number" min="0" max={item.requestedQuantity} bind:value={drafts[item.id].agreedQuantity} /></label>
						<label><span class="label">Carta por copia (USD)</span><input class="field" type="number" min="0" step="0.01" value={drafts[item.id].cardUnitPrice} on:input={(event) => updateCardUnitPrice(item.id, event)} /></label>
						<label><span class="label">Impuesto por copia (USD)</span><input class="field" type="number" min="0" step="0.01" value={drafts[item.id].taxUnitPrice} on:input={(event) => updateTaxUnitPrice(item.id, event)} /></label>
					</div>
					{#if preview}
						<div class="mt-4 rounded-xl border border-stone-800 bg-stone-950 p-4 text-sm" aria-live="polite">
							<p class="font-medium text-white">Cálculo estimado</p>
							<p class="mt-2 text-stone-300">
								Por copia: {formatMoney(preview.cardUnitPrice, order.currency)} de carta + {formatMoney(preview.taxUnitPrice, order.currency)} de impuesto = <strong class="text-white">{formatMoney(preview.finalUnitPrice, order.currency)}</strong>
							</p>
							<p class="mt-1 text-stone-300">
								Total del ítem: {formatMoney(preview.finalUnitPrice, order.currency)} × {draft.agreedQuantity} {draft.agreedQuantity === 1 ? 'copia' : 'copias'} = <strong class="text-white">{formatMoney(preview.agreedTotal, order.currency)}</strong>
							</p>
						</div>
					{/if}
					<button class="button-secondary mt-4" disabled={saving} on:click={() => saveItem(item.id)}>Guardar revisión del ítem</button>
				{:else}
					<dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
						<div><dt class="text-stone-500">Acordada</dt><dd>{item.agreedQuantity}</dd></div>
						<div><dt class="text-stone-500">Carta</dt><dd>{formatMoney(item.cardUnitPrice, order.currency)}</dd></div>
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

<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type {
		OrderRequest,
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
		formatMoney,
		isValidAgreedQuantity,
		orderStatusLabels,
	} from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';
	import ConfirmDialog from '../ui/ConfirmDialog.svelte';

	export let id: number;
	type ReviewDraft = {
		agreedQuantity: number;
		cardUnitPrice: string;
		taxUnitPrice: string;
	};

	let order: OrderRequest | null = null;
	let drafts: Record<number, ReviewDraft> = {};
	let shippingPrice = DEFAULT_SHIPPING_PRICE;
	let loading = true;
	let saving = false;
	let loadError = '';
	let actionError = '';
	let pendingTransition: 'accept' | 'reject' | null = null;

	function syncDrafts(value: OrderRequest) {
		shippingPrice = value.shippingPrice ?? DEFAULT_SHIPPING_PRICE;
		drafts = Object.fromEntries(value.items.map((item) => {
			const cardUnitPrice = item.cardUnitPrice ?? item.estimatedUnitPrice;
			const defaultTaxUnitPrice = calculateDefaultTaxUnitPrice(cardUnitPrice);
			return [item.id, {
				agreedQuantity: item.agreedQuantity,
				cardUnitPrice,
				taxUnitPrice: item.taxUnitPrice ?? defaultTaxUnitPrice,
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

	function getItemTotalCalculation(
		item: OrderRequest['items'][number],
		draft: ReviewDraft | undefined,
		currency: string,
	): string | undefined {
		const cardUnitPrice = draft?.cardUnitPrice ?? item.cardUnitPrice;
		const taxUnitPrice = draft?.taxUnitPrice ?? item.taxUnitPrice;
		const agreedQuantity = draft?.agreedQuantity ?? item.agreedQuantity;
		if (cardUnitPrice == null || taxUnitPrice == null) return undefined;
		const calculation = calculateItemPricingPreview(cardUnitPrice, taxUnitPrice, agreedQuantity);
		if (!calculation) return undefined;
		return `(${formatMoney(calculation.cardUnitPrice, currency)} de carta + ${formatMoney(calculation.taxUnitPrice, currency)} de impuesto) × ${agreedQuantity} = ${formatMoney(calculation.agreedTotal, currency)}`;
	}

	function updateCardUnitPrice(itemId: number, event: Event) {
		const draft = drafts[itemId];
		if (!draft) return;
		draft.cardUnitPrice = (event.currentTarget as HTMLInputElement).value;
		draft.taxUnitPrice = calculateDefaultTaxUnitPrice(draft.cardUnitPrice);
		drafts = { ...drafts };
	}

	async function refresh() {
		const nextOrder = await orderRequestsApi.get(id);
		order = nextOrder;
		syncDrafts(nextOrder);
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
			}
			await refresh();
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

	async function runTransition() {
		if (!order || !pendingTransition) return;
		const transition = pendingTransition;
		await mutate([() => transition === 'accept' ? orderRequestsApi.accept(order!.id) : orderRequestsApi.reject(order!.id)]);
		pendingTransition = null;
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
				<a class="button-secondary mt-4" href={`/orders/${order.id}`}>
					Ver como participante
				</a>
			</div>
		</div>
		{#if order.note}<p class="mt-5 rounded-xl bg-stone-950 p-4 text-sm text-stone-300">{order.note}</p>{/if}

		{#if order.status === 'in_review'}
			<div class="mt-6 rounded-xl border border-stone-800 bg-stone-950 p-4">
				<div>
					<h2 class="font-semibold text-white">Costos de la Orden</h2>
					<p class="mt-1 text-sm text-stone-400">El envío se aplica una sola vez, sin importar cuántas cartas o copias contiene la Orden.</p>
				</div>
				{#if orderPreview}
					<dl class="mt-5 grid grid-cols-2 items-end gap-4 text-sm lg:grid-cols-4" aria-live="polite">
						<div><dt class="text-stone-500">Cartas</dt><dd class="mt-1 font-medium text-white">{formatMoney(orderPreview.cardSubtotal, order.currency)}</dd></div>
						<div><dt class="text-stone-500">Impuestos</dt><dd class="mt-1 font-medium text-white">{formatMoney(orderPreview.taxTotal, order.currency)}</dd></div>
						<div>
							<dt><label class="text-stone-500" for="shipping-price">Envío (USD)</label></dt>
							<dd class="mt-1"><input id="shipping-price" class="field max-w-40" type="number" min="0" step="0.01" bind:value={shippingPrice} disabled={saving} on:change={saveShippingPrice} /></dd>
						</div>
						<div><dt class="text-stone-500">Total estimado</dt><dd class="mt-1 font-semibold text-white">{formatMoney(orderPreview.agreedTotal, order.currency)}</dd></div>
					</dl>
				{/if}
			</div>
		{/if}

		<div class="mt-6 flex flex-wrap gap-3">
			{#if canStartReview(order)}
				<button class="button" disabled={saving} on:click={() => mutate([() => orderRequestsApi.startReview(order!.id)])}>Iniciar revisión</button>
			{/if}
			{#if order.status === 'submitted' || order.status === 'in_review'}
				<button
					class="button-danger"
					disabled={saving}
					on:click={() => pendingTransition = 'reject'}
				>Rechazar orden</button>
			{/if}
			{#if order.status === 'in_review'}
				<button
					class="button"
					disabled={saving || !canAcceptOrder(order)}
					on:click={() => pendingTransition = 'accept'}
				>Aceptar orden</button>
			{/if}
		</div>
	</section>

	{#if actionError}<p class="mt-5 rounded-lg bg-red-950/50 p-3 text-sm text-red-300" role="alert">{actionError}</p>{/if}

	<section class="panel mt-6">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 class="text-lg font-semibold text-white">Cartas de la orden</h2>
			{#if saving}<p class="text-sm text-stone-400" aria-live="polite">Guardando cambios…</p>{/if}
		</div>
		{#if order.status === 'in_review'}
			<p class="mt-2 text-sm text-stone-400">Los cambios se guardan al salir de cada campo. El impuesto se calcula como 16 % del precio de la carta.</p>
		{/if}
		<div class="mt-4 overflow-x-auto rounded-lg border border-stone-800">
			<table class="w-full min-w-5xl border-collapse text-left text-sm">
				<thead class="bg-stone-900 text-stone-300">
					<tr>
						<th class="px-3 py-3 font-semibold" scope="col">Carta</th>
						<th class="px-3 py-3 text-right font-semibold" scope="col">Solicitada</th>
						<th class="px-3 py-3 font-semibold" scope="col">Acordada</th>
						<th class="px-3 py-3 font-semibold" scope="col">Carta por copia</th>
						<th class="px-3 py-3 text-right font-semibold" scope="col">Total por copia</th>
						<th class="px-3 py-3 text-right font-semibold" scope="col">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-stone-800">
					{#each order.items as item}
						{@const draft = drafts[item.id]}
						{@const preview = order.status === 'in_review' && !item.removedAt && draft ? calculateItemPricingPreview(draft.cardUnitPrice, draft.taxUnitPrice, draft.agreedQuantity) : null}
						<tr class:opacity-50={Boolean(item.removedAt)} class="bg-stone-950 align-middle">
							<th class="px-3 py-3 font-medium text-stone-100" scope="row">
								{item.cardName}
								<span class="mt-1 block font-normal text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</span>
							</th>
							<td class="px-3 py-3 text-right text-stone-300">{item.requestedQuantity}</td>
							{#if order.status === 'in_review' && !item.removedAt}
								<td class="px-3 py-3"><label class="sr-only" for={`agreed-${item.id}`}>Cantidad acordada de {item.cardName}</label><input id={`agreed-${item.id}`} class="field w-24" type="number" min="0" max={item.requestedQuantity} bind:value={drafts[item.id].agreedQuantity} disabled={saving} on:change={() => saveItem(item.id)} /></td>
								<td class="px-3 py-3"><label class="sr-only" for={`card-price-${item.id}`}>Precio por copia de {item.cardName}</label><input id={`card-price-${item.id}`} class="field w-28" type="number" min="0" step="0.01" value={drafts[item.id].cardUnitPrice} disabled={saving} on:input={(event) => updateCardUnitPrice(item.id, event)} on:change={() => saveItem(item.id)} /></td>
							{:else}
								<td class="px-3 py-3 text-stone-300">{item.agreedQuantity}</td>
								<td class="px-3 py-3 text-stone-300">{formatMoney(item.cardUnitPrice, order.currency)}</td>
							{/if}
							<td class="whitespace-nowrap px-3 py-3 text-right text-stone-300">{formatMoney(preview?.finalUnitPrice ?? item.finalUnitPrice, order.currency)}</td>
							<td
								class="whitespace-nowrap px-3 py-3 text-right font-medium text-stone-100"
								title={getItemTotalCalculation(item, draft, order.currency)}
							>
								<span class="cursor-help border-b border-dotted border-stone-600">{formatMoney(preview?.agreedTotal ?? item.agreedTotal, order.currency)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
	<ConfirmDialog
		open={pendingTransition !== null}
		title={pendingTransition === 'accept' ? 'Aceptar orden' : 'Rechazar orden'}
		message={pendingTransition === 'accept' ? 'Confirma que las cantidades, los precios y el total son correctos.' : 'La orden quedará rechazada. Confirma esta decisión.'}
		confirmLabel={pendingTransition === 'accept' ? 'Aceptar orden' : 'Rechazar orden'}
		busy={saving}
		onconfirm={runTransition}
		oncancel={() => pendingTransition = null}
	/>

{/if}

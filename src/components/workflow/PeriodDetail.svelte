<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { CardSearchJobError, CardSearchTimeoutError, searchCardListingsUntilReady } from '../../lib/api/search';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import type { CardListing, OrderPeriod, OrderPeriodHistory, OrderRequest, ScrapeJobStatus } from '../../lib/api/types';
	import { formatDate, formatMoney, isListingSelectable, isValidRequestedQuantity, periodStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;
	let period: OrderPeriod | null = null;
	let history: OrderPeriodHistory[] = [];
	let order: OrderRequest | null = null;
	let orderStarted = false;
	let loading = true;
	let loadError = '';
	let query = '';
	let results: CardListing[] = [];
	let searching = false;
	let searchError = '';
	let searchStatus = '';
	let hasSearched = false;
	let searchController: AbortController | null = null;
	let addingListingId: number | null = null;
	let savingItemIds: number[] = [];
	let orderError = '';
	let quantities: Record<number, number> = {};
	let selectedListingIds: number[] = [];

	$: activeItems = order?.items.filter((item) => !item.removedAt) ?? [];
	$: selectedListingIds = activeItems.map((item) => item.cardListingId);

	function syncOrder(value: OrderRequest) {
		order = value;
		orderStarted = true;
		quantities = Object.fromEntries(value.items.map((item) => [item.id, item.requestedQuantity]));
	}

	async function load() {
		try {
			const [nextPeriod, nextHistory, orderResponse] = await Promise.all([
				orderPeriodsApi.get(id),
				orderPeriodsApi.history(id, { page: 1, shows: 100 }),
				orderRequestsApi.list({ page: 1, shows: 100, orderPeriodId: id }),
			]);
			period = nextPeriod;
			history = [...nextHistory].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
			const editableOrder = orderResponse.items.find((candidate) => candidate.status === 'submitted');
			if (editableOrder) syncOrder(editableOrder);
		} catch (caught) {
			loadError = getApiErrorMessage(caught);
		} finally {
			loading = false;
		}
	}

	async function search() {
		const requestedQuery = query.trim();
		if (!requestedQuery) return;
		if (requestedQuery.length > 255) {
			searchError = 'La búsqueda no puede superar los 255 caracteres.';
			return;
		}
		searchController?.abort();
		const controller = new AbortController();
		searchController = controller;
		searching = true;
		searchError = '';
		searchStatus = 'Consultando el catálogo…';
		hasSearched = false;
		results = [];
		try {
			results = await searchCardListingsUntilReady(requestedQuery, {
				limit: 30,
				signal: controller.signal,
				onProgress: ({ status, attempts }) => {
					if (searchController === controller) searchStatus = getSearchStatusMessage(status, attempts);
				},
			});
			hasSearched = true;
		} catch (caught) {
			if (caught instanceof DOMException && caught.name === 'AbortError') return;
			searchError = caught instanceof CardSearchJobError || caught instanceof CardSearchTimeoutError
				? caught.message
				: getApiErrorMessage(caught);
			hasSearched = true;
		} finally {
			if (searchController === controller) {
				searching = false;
				searchStatus = '';
				searchController = null;
			}
		}
	}

	function getSearchStatusMessage(status: ScrapeJobStatus, attempts?: number) {
		if (status === 'retry_wait') return `La fuente externa pidió reintentar${attempts ? ` (intento ${attempts})` : ''}…`;
		if (status === 'running') return 'Buscando publicaciones en la fuente externa…';
		if (status === 'succeeded') return 'Actualizando los resultados…';
		return 'Preparando la búsqueda en la fuente externa…';
	}

	async function add(listing: CardListing) {
		if (listing.id == null || !isListingSelectable(listing, selectedListingIds)) return;
		if (!order && addingListingId !== null) return;
		addingListingId = listing.id;
		orderError = '';
		try {
			const savedOrder = order
				? await orderRequestsApi.addItem(order.id, { cardListingId: listing.id, requestedQuantity: 1 })
				: await orderRequestsApi.create({
					orderPeriodId: id,
					note: null,
					items: [{ cardListingId: listing.id, requestedQuantity: 1 }],
				});
			syncOrder(savedOrder);
		} catch (caught) {
			orderError = getApiErrorMessage(caught);
		} finally {
			addingListingId = null;
		}
	}

	async function changeQuantity(itemId: number, change: number) {
		if (!order) return;
		if (savingItemIds.includes(itemId)) return;
		const previousQuantity = quantities[itemId];
		const quantity = previousQuantity + change;
		if (!isValidRequestedQuantity(quantity)) {
			return;
		}
		quantities = { ...quantities, [itemId]: quantity };
		savingItemIds = [...savingItemIds, itemId];
		orderError = '';
		try {
			syncOrder(await orderRequestsApi.updateItem(order.id, itemId, { requestedQuantity: quantity }));
		} catch (caught) {
			quantities = { ...quantities, [itemId]: previousQuantity };
			orderError = getApiErrorMessage(caught);
		} finally {
			savingItemIds = savingItemIds.filter((savedItemId) => savedItemId !== itemId);
		}
	}

	onMount(load);
	onDestroy(() => searchController?.abort());
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando el Pedido…" />
{:else if loadError && !period}
	<StateNotice kind="error" message={loadError} />
{:else if period}
	<section class="panel">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div><p class="text-sm text-stone-500">Pedido #{period.id}</p><h1 class="mt-1 text-2xl font-bold text-white">{period.name}</h1></div>
			<span class="status">{periodStatusLabels[period.status]}</span>
		</div>
		<dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
			<div><dt class="text-stone-500">Abre</dt><dd class="mt-1">{formatDate(period.opensAt)}</dd></div>
			<div><dt class="text-stone-500">Cierra</dt><dd class="mt-1">{formatDate(period.closesAt)}</dd></div>
		</dl>
	</section>

	{#if period.status === 'open'}
		{#if !orderStarted}
			<section class="panel mt-6">
				<h2 class="text-xl font-semibold text-white">Crear una orden</h2>
				<p class="mt-2 text-sm text-stone-400">Inicia una orden para buscar cartas. Se guardará cuando añadas la primera carta.</p>
				<button class="button mt-5" type="button" on:click={() => orderStarted = true}>Crear orden</button>
			</section>
		{:else}
			<section class="panel mt-6">
				<div class="flex flex-wrap items-baseline justify-between gap-3">
					<div><h2 class="text-xl font-semibold text-white">Buscar cartas</h2><p class="mt-2 text-sm text-stone-400">Busca por nombre o código y compara las publicaciones disponibles.</p></div>
					{#if order}<a class="button-secondary" href={`/orders/${order.id}`}>Ver orden</a>{/if}
				</div>
				<form class="mt-5 flex gap-2" on:submit|preventDefault={search}>
					<label class="sr-only" for="card-search">Nombre o código</label>
					<input id="card-search" class="field" maxlength="255" bind:value={query} placeholder="Busca una carta por nombre o código" />
					<button class="button" type="submit" disabled={!query.trim() || searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
				</form>
				{#if searchStatus}<p class="mt-4 text-sm text-amber-200" aria-live="polite">{searchStatus}</p>{/if}
				{#if searchError}<p class="mt-4 text-sm text-red-300" role="alert">{searchError}</p>{/if}
				{#if results.length > 0}
					<div class="mt-5 overflow-x-auto rounded-lg border border-stone-800">
						<table class="w-full min-w-5xl border-collapse text-left text-sm">
							<thead class="bg-stone-900 text-stone-300"><tr><th class="px-4 py-3 font-semibold" scope="col">Carta</th><th class="px-4 py-3 font-semibold" scope="col">Código</th><th class="px-4 py-3 font-semibold" scope="col">Rareza</th><th class="px-4 py-3 font-semibold" scope="col">Condición</th><th class="px-4 py-3 text-right font-semibold" scope="col">Precio</th><th class="px-4 py-3 text-right font-semibold" scope="col">Stock</th><th class="px-4 py-3 text-right font-semibold" scope="col">Acción</th></tr></thead>
							<tbody class="divide-y divide-stone-800">
								{#each results as listing}
									<tr class="bg-stone-950 align-middle">
										<th class="px-4 py-3 font-medium text-stone-100" scope="row">{listing.name}</th>
										<td class="whitespace-nowrap px-4 py-3 text-stone-300">{listing.code}</td>
										<td class="px-4 py-3 text-stone-300">{listing.rarity}</td>
										<td class="px-4 py-3 text-stone-300">{listing.condition}</td>
										<td class="px-4 py-3 text-right text-stone-300">{formatMoney(listing.price)}</td>
										<td class="px-4 py-3 text-right text-stone-300">{listing.stock}</td>
										<td class="px-4 py-3 text-right"><button class="button-secondary" type="button" disabled={addingListingId === listing.id || (!order && addingListingId !== null) || !isListingSelectable(listing, selectedListingIds)} on:click={() => add(listing)}>{addingListingId === listing.id ? 'Añadiendo…' : selectedListingIds.includes(listing.id ?? -1) ? 'Añadida' : 'Añadir'}</button></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if hasSearched && !searchError}<p class="mt-5 text-sm text-stone-500">No encontramos publicaciones para esa búsqueda.</p>{/if}
			</section>

			<section class="panel mt-6">
				<div class="flex flex-wrap items-baseline justify-between gap-3"><h2 class="text-xl font-semibold text-white">Tu orden</h2>{#if savingItemIds.length > 0}<p class="text-sm text-stone-400" aria-live="polite">Guardando cambios…</p>{/if}</div>
				{#if orderError}<p class="mt-4 text-sm text-red-300" role="alert">{orderError}</p>{/if}
				{#if activeItems.length === 0}
					<p class="mt-4 text-sm text-stone-500">Busca una carta y añádela. La orden se guardará con la primera carta.</p>
				{:else}
					<div class="mt-4 overflow-x-auto rounded-lg border border-stone-800">
						<table class="w-full min-w-3xl border-collapse text-left text-sm">
							<thead class="bg-stone-900 text-stone-300"><tr><th class="px-4 py-3 font-semibold" scope="col">Carta</th><th class="px-4 py-3 font-semibold" scope="col">Cantidad</th><th class="px-4 py-3 text-right font-semibold" scope="col">Precio estimado</th><th class="px-4 py-3 text-right font-semibold" scope="col">Total estimado</th></tr></thead>
							<tbody class="divide-y divide-stone-800">
								{#each activeItems as item}
									<tr class="bg-stone-950 align-middle">
										<th class="px-4 py-3 font-medium text-stone-100" scope="row">{item.cardName}<span class="mt-1 block font-normal text-stone-400">{item.cardCode} · {item.rarity} · {item.condition}</span></th>
										<td class="px-4 py-3">
											<div class="inline-flex items-center rounded-lg border border-stone-700" aria-label={`Cantidad de ${item.cardName}`}>
												<button class="min-h-10 min-w-10 text-lg text-stone-200 hover:bg-stone-800 disabled:opacity-40" type="button" disabled={savingItemIds.includes(item.id) || quantities[item.id] <= 1} aria-label={`Restar una copia de ${item.cardName}`} on:click={() => changeQuantity(item.id, -1)}>−</button>
												<span class="min-w-10 text-center font-medium text-stone-100" aria-live="polite">{quantities[item.id]}</span>
												<button class="min-h-10 min-w-10 text-lg text-stone-200 hover:bg-stone-800 disabled:opacity-40" type="button" disabled={savingItemIds.includes(item.id)} aria-label={`Añadir una copia de ${item.cardName}`} on:click={() => changeQuantity(item.id, 1)}>+</button>
											</div>
										</td>
										<td class="px-4 py-3 text-right text-stone-300">{formatMoney(item.estimatedUnitPrice, order?.currency)}</td>
										<td class="px-4 py-3 text-right font-medium text-stone-100">{formatMoney(Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity), order?.currency)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/if}
	{:else}
		<div class="mt-6"><StateNotice message="Este Pedido no está abierto para recibir órdenes." /></div>
	{/if}

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Historial del Pedido</h2>
		{#if history.length === 0}<p class="mt-3 text-sm text-stone-500">No hay eventos registrados.</p>{:else}
			<ol class="mt-4 space-y-3">{#each history as event}<li class="border-l-2 border-stone-700 pl-4 text-sm"><p class="font-medium text-stone-200">{event.event === 'created' ? 'Pedido creado' : event.event === 'updated' ? 'Pedido actualizado' : 'Pedido cerrado antes de tiempo'}</p><p class="mt-1 text-stone-500">{formatDate(event.occurredAt)} · Usuario #{event.actorUserId}</p></li>{/each}</ol>
		{/if}
	</section>
{/if}

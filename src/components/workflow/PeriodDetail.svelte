<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { CardSearchJobError, CardSearchTimeoutError, searchCardListingsUntilReady } from '../../lib/api/search';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import type { CardListing, OrderPeriod, OrderRequest, ScrapeJobStatus } from '../../lib/api/types';
	import { formatDate, formatMoney, isListingSelectable, isValidRequestedQuantity, periodStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';
	import OrderProgressPanel from './OrderProgressPanel.svelte';

	export let id: number;
	let period: OrderPeriod | null = null;
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
	let searchSection: HTMLElement;

	$: activeItems = order?.items.filter((item) => !item.removedAt) ?? [];
	$: selectedListingIds = activeItems.map((item) => item.cardListingId);

	function syncOrder(value: OrderRequest) {
		order = value;
		orderStarted = true;
		quantities = Object.fromEntries(value.items.map((item) => [item.id, item.requestedQuantity]));
	}

	function moveToSearch() {
		if (!searchSection || typeof window === 'undefined') return;
		searchSection.scrollIntoView({
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
			block: 'start',
		});
	}

	async function load() {
		try {
			const [nextPeriod, orderResponse] = await Promise.all([
				orderPeriodsApi.get(id),
				orderRequestsApi.list({ page: 1, shows: 100, orderPeriodId: id }),
			]);
			period = nextPeriod;
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
		moveToSearch();
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
			await tick();
			moveToSearch();
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
	<div class:period-composer--active={orderStarted} class="period-composer">
		<div class="period-composer-main">
			<section class="period-summary">
				<div>
					<p class="route-label">PEDIDO #{period.id}</p>
					<h1>{period.name}</h1>
				</div>
				<p class="status period-state">Pedido {periodStatusLabels[period.status].toLowerCase()}</p>
				<dl>
					<div><dt>Abre</dt><dd>{formatDate(period.opensAt)}</dd></div>
					<div><dt>Cierra</dt><dd>{formatDate(period.closesAt)}</dd></div>
				</dl>
			</section>

			{#if period.status === 'open'}
				{#if !orderStarted}
					<section class="start-order">
						<p class="route-label">NUEVA ORDEN</p>
						<h2>Busca las cartas que quieres.</h2>
						<p>La Orden se guardará cuando añadas la primera carta.</p>
						<button class="button" type="button" on:click={() => orderStarted = true}>Crear Orden</button>
					</section>
				{:else}
					<section bind:this={searchSection} class="card-search" aria-labelledby="card-search-title">
						<h2 id="card-search-title">Buscar cartas</h2>
						<p>Busca por nombre o código y compara las publicaciones disponibles.</p>
						<form class="search-form" on:submit|preventDefault={search}>
							<label class="sr-only" for="card-search">Nombre o código</label>
							<input id="card-search" class="field" maxlength="255" bind:value={query} placeholder="Nombre o código de la carta" on:focus={moveToSearch} />
							<button class="button" type="submit" disabled={!query.trim() || searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
						</form>
						<div class="search-feedback" aria-live="polite">
							{#if searchStatus}<p>{searchStatus}</p>{/if}
							{#if searchError}<p class="error-text" role="alert">{searchError}</p>{/if}
						</div>

						{#if results.length > 0}
							<div class="search-results overflow-x-auto">
								<table>
									<thead><tr><th scope="col">Carta</th><th scope="col">Código</th><th scope="col">Rareza</th><th scope="col">Condición</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Acción</th></tr></thead>
									<tbody>
										{#each results as listing}
											<tr>
												<th scope="row">{listing.name}</th>
												<td data-label="Código">{listing.code}</td>
												<td data-label="Rareza">{listing.rarity}</td>
												<td data-label="Condición">{listing.condition}</td>
												<td data-label="Precio">{formatMoney(listing.price)}</td>
												<td data-label="Stock">{listing.stock}</td>
												<td data-label="Acción"><button class="button-secondary" type="button" disabled={addingListingId === listing.id || (!order && addingListingId !== null) || !isListingSelectable(listing, selectedListingIds)} on:click={() => add(listing)}>{addingListingId === listing.id ? 'Añadiendo…' : selectedListingIds.includes(listing.id ?? -1) ? 'Añadida' : 'Añadir'}</button></td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else if hasSearched && !searchError}
							<p class="search-empty">No encontramos publicaciones para esa búsqueda.</p>
						{/if}
					</section>
				{/if}
			{:else}
				<StateNotice message="Este Pedido no está abierto para recibir Órdenes." />
			{/if}
		</div>

		{#if orderStarted && period.status === 'open'}
			<OrderProgressPanel {order} {quantities} {savingItemIds} error={orderError} onChangeQuantity={changeQuantity} />
		{/if}
	</div>
{/if}

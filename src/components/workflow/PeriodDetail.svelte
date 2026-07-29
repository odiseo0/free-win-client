<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import {
		CardSearchJobError,
		CardSearchTimeoutError,
		searchCardListingsUntilReady,
	} from '../../lib/api/search';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import type {
		CardListing,
		OrderPeriod,
		OrderPeriodHistory,
		ScrapeJobStatus,
	} from '../../lib/api/types';
	import { formatDate, formatMoney, isValidRequestedQuantity, periodStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number;

	type BasketItem = { listing: CardListing; quantity: number };
	let period: OrderPeriod | null = null;
	let history: OrderPeriodHistory[] = [];
	let loading = true;
	let error = '';
	let query = '';
	let results: CardListing[] = [];
	let searching = false;
	let searchError = '';
	let searchStatus = '';
	let hasSearched = false;
	let searchController: AbortController | null = null;
	let basket: BasketItem[] = [];
	let note = '';
	let submitting = false;

	async function load() {
		try {
			[period, history] = await Promise.all([
				orderPeriodsApi.get(id),
				orderPeriodsApi.history(id, { page: 1, shows: 100 }),
			]);
			history = [...history].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
		} catch (caught) {
			error = getApiErrorMessage(caught);
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
					if (searchController === controller) {
						searchStatus = getSearchStatusMessage(status, attempts);
					}
				},
			});
			hasSearched = true;
		} catch (caught) {
			if (caught instanceof DOMException && caught.name === 'AbortError') return;
			searchError =
				caught instanceof CardSearchJobError || caught instanceof CardSearchTimeoutError
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
		if (status === 'retry_wait') {
			return `La fuente externa pidió reintentar${attempts ? ` (intento ${attempts})` : ''}…`;
		}
		if (status === 'running') return 'Buscando publicaciones en la fuente externa…';
		if (status === 'succeeded') return 'Actualizando los resultados…';
		return 'Preparando la búsqueda en la fuente externa…';
	}

	function canAdd(listing: CardListing) {
		return (
			listing.id != null &&
			listing.isActive &&
			listing.stock > 0 &&
			!basket.some((item) => item.listing.id === listing.id)
		);
	}

	function getListingActionLabel(listing: CardListing) {
		if (listing.id == null) return 'Preparando';
		if (!listing.isActive || listing.stock < 1) return 'Sin stock';
		if (basket.some((item) => item.listing.id === listing.id)) return 'Añadida';
		return 'Añadir';
	}

	function add(listing: CardListing) {
		if (listing.id == null || basket.some((item) => item.listing.id === listing.id)) return;
		basket = [...basket, { listing, quantity: 1 }];
	}

	function remove(listingId: number | null | undefined) {
		basket = basket.filter((item) => item.listing.id !== listingId);
	}

	async function submitOrder() {
		if (basket.length === 0) return;
		if (basket.some((item) => !isValidRequestedQuantity(item.quantity))) {
			error = 'Cada cantidad solicitada debe ser un número entero mayor que cero.';
			return;
		}
		submitting = true;
		error = '';
		try {
			const order = await orderRequestsApi.create({
				orderPeriodId: id,
				note: note.trim() || null,
				items: basket.map((item) => ({
					cardListingId: item.listing.id as number,
					requestedQuantity: item.quantity,
				})),
			});
			window.location.assign(`/orders/${order.id}`);
		} catch (caught) {
			error = getApiErrorMessage(caught);
			submitting = false;
		}
	}

	onMount(load);
	onDestroy(() => searchController?.abort());
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando el Pedido…" />
{:else if error && !period}
	<StateNotice kind="error" message={error} />
{:else if period}
	<section class="panel">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm text-stone-500">Pedido #{period.id}</p>
				<h1 class="mt-1 text-2xl font-bold text-white">{period.name}</h1>
			</div>
			<span class="status">{periodStatusLabels[period.status]}</span>
		</div>
		<dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
			<div><dt class="text-stone-500">Abre</dt><dd class="mt-1">{formatDate(period.opensAt)}</dd></div>
			<div><dt class="text-stone-500">Cierra</dt><dd class="mt-1">{formatDate(period.closesAt)}</dd></div>
		</dl>
	</section>

	{#if period.status === 'open'}
		<div class="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
			<section class="panel">
				<h2 class="text-xl font-semibold text-white">Buscar cartas</h2>
				<p class="mt-2 text-sm text-stone-400">Busca por nombre o código. Si la carta no está en el catálogo, consultaremos la fuente externa.</p>
				<form class="mt-5 flex gap-2" on:submit|preventDefault={search}>
					<label class="sr-only" for="card-search">Nombre o código</label>
					<input id="card-search" class="field" maxlength="255" bind:value={query} placeholder="Ej. Dark Magician" />
					<button class="button" type="submit" disabled={!query.trim()}>{searching ? 'Buscar de nuevo' : 'Buscar'}</button>
				</form>
				{#if searchStatus}<p class="mt-4 text-sm text-amber-200" aria-live="polite">{searchStatus}</p>{/if}
				{#if searchError}<p class="mt-4 text-sm text-red-300" role="alert">{searchError}</p>{/if}
				{#if results.length > 0}
					<ul class="mt-5 divide-y divide-stone-800">
						{#each results as listing}
							<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p class="font-medium text-white">{listing.name}</p>
									<p class="mt-1 text-sm text-stone-400">{listing.code} · {listing.rarity} · {listing.condition}</p>
									<p class="mt-1 text-sm text-stone-300">{formatMoney(listing.price)} · Stock: {listing.stock}</p>
								</div>
								<button
									class="button-secondary shrink-0"
									type="button"
									disabled={!canAdd(listing)}
									on:click={() => add(listing)}
								>
									{getListingActionLabel(listing)}
								</button>
							</li>
						{/each}
					</ul>
					{#if results.some((listing) => listing.id == null)}
						<p class="mt-4 text-sm text-stone-500">Las publicaciones que se están preparando podrán añadirse cuando la fuente termine de guardarlas.</p>
					{/if}
				{:else if hasSearched && !searchError}
					<p class="mt-5 text-sm text-stone-500">No encontramos publicaciones para esa búsqueda.</p>
				{/if}
			</section>

			<aside class="panel h-fit">
				<h2 class="text-xl font-semibold text-white">Tu orden</h2>
				{#if basket.length === 0}
					<p class="mt-4 text-sm text-stone-500">Añade al menos una publicación guardada.</p>
				{:else}
					<ul class="mt-4 space-y-4">
						{#each basket as item}
							<li class="rounded-xl border border-stone-800 p-3">
								<p class="text-sm font-medium text-white">{item.listing.name}</p>
								<div class="mt-3 flex items-end gap-2">
									<label class="flex-1">
										<span class="label">Cantidad</span>
										<input class="field" type="number" min="1" max={Math.max(item.listing.stock, 1)} bind:value={item.quantity} />
									</label>
									<button class="button-secondary" type="button" on:click={() => remove(item.listing.id)}>Quitar</button>
								</div>
							</li>
						{/each}
					</ul>
					<label class="mt-5 block">
						<span class="label">Nota opcional</span>
						<textarea class="field min-h-24" maxlength="2000" bind:value={note} placeholder="Condición, prioridad u otra indicación"></textarea>
					</label>
					{#if error}<p class="mt-4 text-sm text-red-300" role="alert">{error}</p>{/if}
					<button class="button mt-5 w-full" type="button" disabled={submitting} on:click={submitOrder}>
						{submitting ? 'Enviando…' : 'Enviar orden'}
					</button>
				{/if}
			</aside>
		</div>
	{:else}
		<div class="mt-6"><StateNotice message="Este Pedido no está abierto para recibir órdenes." /></div>
	{/if}

	<section class="panel mt-6">
		<h2 class="text-lg font-semibold text-white">Historial del Pedido</h2>
		{#if history.length === 0}
			<p class="mt-3 text-sm text-stone-500">No hay eventos registrados.</p>
		{:else}
			<ol class="mt-4 space-y-3">
				{#each history as event}
					<li class="border-l-2 border-stone-700 pl-4 text-sm">
						<p class="font-medium text-stone-200">{event.event === 'created' ? 'Pedido creado' : event.event === 'updated' ? 'Pedido actualizado' : 'Pedido cerrado antes de tiempo'}</p>
						<p class="mt-1 text-stone-500">{formatDate(event.occurredAt)} · Usuario #{event.actorUserId}</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{/if}

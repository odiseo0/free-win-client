<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { ApiError, getApiErrorMessage } from '../../lib/api/client';
	import { CardSearchJobError, CardSearchTimeoutError, cardListingsApi, searchCardListingsUntilReady } from '../../lib/api/search';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import type { CardListing, OrderPeriod, ScrapeJobStatus } from '../../lib/api/types';
	import { createOrderPayload, NEW_ORDER_DRAFT_KEY, readOrderDraft } from '../../lib/newOrderDraft';
	import { formatDate, formatMoney, getListingSelectionLabel, isListingSelectable } from '../../lib/workflow';

	interface DraftRow {
		cardListingId: number;
		requestedQuantity: number;
		listing: CardListing | null;
		issue: string;
		checking: boolean;
	}

	let query = '';
	let results: CardListing[] = [];
	let searching = false;
	let searchStatus = '';
	let searchError = '';
	let hasSearched = false;
	let searchController: AbortController | null = null;
	let items: DraftRow[] = [];
	let loadingDraft = true;
	let storageError = '';
	let periods: OrderPeriod[] = [];
	let periodLoading = true;
	let periodError = '';
	let periodNote = '';
	let selectedPeriodId = 0;
	let submitting = false;
	let submitError = '';

	$: selectedListingIds = items.map((item) => item.cardListingId);
	$: estimatedSubtotal = items.reduce((sum, item) =>
		item.listing && !item.issue ? sum + Number(item.listing.price) * item.requestedQuantity : sum, 0);
	$: hasUnavailableItems = items.some((item) => item.checking || item.issue || !item.listing);

	function issueFor(listing: CardListing, quantity: number): string {
		if (!listing.isActive || listing.stock < 1) return 'Esta publicación ya no está disponible.';
		if (quantity > listing.stock) return `Solo hay ${listing.stock} ${listing.stock === 1 ? 'copia' : 'copias'} disponibles.`;
		return '';
	}

	function persist() {
		try {
			localStorage.setItem(NEW_ORDER_DRAFT_KEY, JSON.stringify({
				selectedPeriodId,
				items: items.map(({ cardListingId, requestedQuantity }) => ({ cardListingId, requestedQuantity })),
			}));
			storageError = '';
		} catch {
			storageError = 'Este navegador no pudo guardar la lista. No cierres la página antes de enviar la Orden.';
		}
	}

	function restore() {
		try {
			const draft = readOrderDraft(localStorage.getItem(NEW_ORDER_DRAFT_KEY));
			selectedPeriodId = draft.selectedPeriodId;
			items = draft.items.map((item) => ({ ...item, listing: null, issue: '', checking: true }));
		} catch {
			storageError = 'Este navegador no pudo leer la lista guardada.';
		}
	}

	async function refreshItems(): Promise<boolean> {
		const current = [...items];
		if (current.length === 0) {
			loadingDraft = false;
			return true;
		}
		items = items.map((item) => ({ ...item, checking: true }));
		const responses = await Promise.allSettled(current.map((item) => cardListingsApi.get(item.cardListingId)));
		const checked = new Map<number, { listing: CardListing | null; issue: string }>();
		responses.forEach((response, index) => {
			const original = current[index];
			if (response.status === 'fulfilled' && response.value.id === original.cardListingId) {
				checked.set(original.cardListingId, {
					listing: response.value,
					issue: issueFor(response.value, original.requestedQuantity),
				});
			} else {
				checked.set(original.cardListingId, {
					listing: null,
					issue: 'No pudimos comprobar esta publicación. Comprueba las cartas otra vez o quítala.',
				});
			}
		});
		items = items.map((item) => {
			const result = checked.get(item.cardListingId);
			return result ? { ...item, ...result, checking: false } : item;
		});
		loadingDraft = false;
		return items.every((item) => item.listing && !item.issue && !item.checking);
	}

	async function loadPeriods() {
		periodLoading = true;
		periodError = '';
		try {
			const openPeriods: OrderPeriod[] = [];
			let page = 1;
			let total = 0;
			do {
				const response = await orderPeriodsApi.list({ page, shows: 100, status: 'open' });
				openPeriods.push(...response.items.filter((period) => period.status === 'open'));
				total = response.total;
				if (response.items.length === 0) break;
				page += 1;
			} while ((page - 1) * 100 < total);
			periods = openPeriods;
			if (selectedPeriodId && !periods.some((period) => period.id === selectedPeriodId)) {
				selectedPeriodId = 0;
				periodNote = 'El Pedido elegido ya no está abierto. Selecciona otro.';
				persist();
			}
		} catch (caught) {
			periodError = getApiErrorMessage(caught);
		} finally {
			periodLoading = false;
		}
	}

	function searchProgress(status: ScrapeJobStatus, attempts?: number): string {
		if (status === 'retry_wait') return `La fuente externa pidió reintentar${attempts ? ` (intento ${attempts})` : ''}…`;
		if (status === 'running') return 'Buscando publicaciones en la fuente externa…';
		if (status === 'succeeded') return 'Actualizando los resultados…';
		return 'Preparando la búsqueda en la fuente externa…';
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
		searchStatus = 'Consultando el catálogo…';
		searchError = '';
		hasSearched = false;
		results = [];
		try {
			const found = await searchCardListingsUntilReady(requestedQuery, {
				limit: 30,
				signal: controller.signal,
				onProgress: ({ status, attempts }) => {
					if (searchController === controller) searchStatus = searchProgress(status, attempts);
				},
			});
			if (searchController === controller) {
				results = found;
				hasSearched = true;
			}
		} catch (caught) {
			if (caught instanceof DOMException && caught.name === 'AbortError') return;
			if (searchController === controller) {
				searchError = caught instanceof CardSearchJobError || caught instanceof CardSearchTimeoutError
					? caught.message : getApiErrorMessage(caught);
				hasSearched = true;
			}
		} finally {
			if (searchController === controller) {
				searching = false;
				searchStatus = '';
				searchController = null;
			}
		}
	}

	function add(listing: CardListing) {
		if (submitting || !isListingSelectable(listing, selectedListingIds) || listing.id == null) return;
		items = [...items, {
			cardListingId: listing.id,
			requestedQuantity: 1,
			listing,
			issue: '',
			checking: false,
		}];
		submitError = '';
		persist();
	}

	function changeQuantity(id: number, change: number) {
		if (submitting) return;
		items = items.map((item) => {
			if (item.cardListingId !== id) return item;
			const next = item.requestedQuantity + change;
			if (next < 1 || (change > 0 && item.listing && next > item.listing.stock)) return item;
			return { ...item, requestedQuantity: next, issue: item.listing ? issueFor(item.listing, next) : item.issue };
		});
		persist();
	}

	function remove(id: number) {
		if (submitting) return;
		items = items.filter((item) => item.cardListingId !== id);
		if (items.length === 0) selectedPeriodId = 0;
		submitError = '';
		persist();
	}

	function changePeriod() {
		periodNote = '';
		submitError = '';
		persist();
	}

	async function submit() {
		if (submitting || items.length === 0 || !selectedPeriodId || periodLoading || periodError) return;
		submitting = true;
		submitError = '';
		periodNote = '';
		try {
			const period = await orderPeriodsApi.get(selectedPeriodId);
			if (period.status !== 'open') {
				selectedPeriodId = 0;
				persist();
				await loadPeriods();
				submitError = 'El Pedido ya no está abierto. Elige otro Pedido para enviar esta Orden.';
				return;
			}
			if (!await refreshItems()) {
				submitError = 'Revisa las cartas marcadas antes de enviar la Orden.';
				return;
			}
			const created = await orderRequestsApi.create(createOrderPayload({
				selectedPeriodId,
				items: items.map(({ cardListingId, requestedQuantity }) => ({ cardListingId, requestedQuantity })),
			}));
			try { localStorage.removeItem(NEW_ORDER_DRAFT_KEY); } catch { /* The saved Orden still takes priority. */ }
			window.location.assign(`/orders/${created.id}`);
		} catch (caught) {
			if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
				await loadPeriods();
			}
			submitError = getApiErrorMessage(caught);
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		restore();
		void loadPeriods();
		void refreshItems();
	});
	onDestroy(() => searchController?.abort());
</script>

<div class="new-order-workspace">
	<section class="new-order-search" aria-labelledby="new-order-search-title">
		<h2 id="new-order-search-title">Buscar cartas</h2>
		<p>Busca por nombre o código y compara las publicaciones disponibles.</p>
		<form class="search-form" on:submit|preventDefault={search}>
			<label class="sr-only" for="new-order-query">Nombre o código</label>
			<input id="new-order-query" class="field" type="search" maxlength="255" bind:value={query} placeholder="Nombre o código de la carta" />
			<button class="button" type="submit" disabled={!query.trim() || searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
		</form>
		<div class="search-feedback" aria-live="polite">
			{#if searchStatus}<p>{searchStatus}</p>{/if}
			{#if searchError}<p class="error-text" role="alert">{searchError}</p>{/if}
		</div>
		{#if results.length > 0}
			<div class="search-results new-order-results overflow-x-auto">
				<table>
					<thead><tr><th scope="col">Carta</th><th scope="col">Código</th><th scope="col">Rareza</th><th scope="col">Condición</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Acción</th></tr></thead>
					<tbody>
						{#each results as listing, index (listing.id ?? `pending-${index}`)}
							<tr>
								<th scope="row">{listing.name}</th>
								<td data-label="Código">{listing.code}</td>
								<td data-label="Rareza">{listing.rarity}</td>
								<td data-label="Condición">{listing.condition}</td>
								<td data-label="Precio">{formatMoney(listing.price, listing.currency)}</td>
								<td data-label="Stock">{listing.stock}</td>
								<td data-label="Acción"><button class="button-secondary" type="button" disabled={submitting || !isListingSelectable(listing, selectedListingIds)} on:click={() => add(listing)}>{getListingSelectionLabel(listing, selectedListingIds)}</button></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if hasSearched && !searchError}
			<p class="search-empty">No encontramos publicaciones para esa búsqueda.</p>
		{/if}
	</section>

	<section class="new-order-draft" aria-labelledby="new-order-draft-title">
		<div class="new-order-draft-heading">
			<div><p class="route-label">TU LISTA</p><h2 id="new-order-draft-title">Tu Orden</h2></div>
			<p aria-live="polite">{items.length} {items.length === 1 ? 'carta' : 'cartas'}</p>
		</div>
		{#if storageError}<p class="error-text" role="alert">{storageError}</p>{/if}
		{#if loadingDraft}
			<p>Cargando tu lista…</p>
		{:else if items.length === 0}
			<p class="new-order-empty">Aún no has añadido cartas. Busca una carta y añádela a tu lista.</p>
		{:else}
			<div class="new-order-table-wrap overflow-x-auto">
				<table class="new-order-table">
					<thead><tr><th scope="col">Carta</th><th scope="col">Cantidad</th><th scope="col">Precio</th><th scope="col">Total</th><th scope="col">Acción</th></tr></thead>
					<tbody>
						{#each items as item (item.cardListingId)}
							<tr>
								<th scope="row">
									<strong>{item.listing?.name ?? `Publicación #${item.cardListingId}`}</strong>
									{#if item.listing}<span class="new-order-card-note">{item.listing.code} · {item.listing.rarity} · {item.listing.condition}</span>{/if}
									{#if item.checking}<span class="new-order-card-note">Comprobando disponibilidad…</span>{/if}
									{#if item.issue}<span class="error-text new-order-card-note">{item.issue}</span>{/if}
								</th>
								<td data-label="Cantidad"><div class="new-order-quantity" aria-label={`Cantidad de ${item.listing?.name ?? `publicación ${item.cardListingId}`}`}>
									<button type="button" aria-label="Restar una copia" disabled={submitting || item.checking || item.requestedQuantity <= 1} on:click={() => changeQuantity(item.cardListingId, -1)}>−</button>
									<span>{item.requestedQuantity}</span>
									<button type="button" aria-label="Añadir una copia" disabled={submitting || item.checking || !item.listing || item.requestedQuantity >= item.listing.stock} on:click={() => changeQuantity(item.cardListingId, 1)}>+</button>
								</div></td>
								<td data-label="Precio">{item.listing ? formatMoney(item.listing.price, item.listing.currency) : 'Pendiente'}</td>
								<td data-label="Total">{item.listing && !item.issue ? formatMoney(Number(item.listing.price) * item.requestedQuantity, item.listing.currency) : 'Pendiente'}</td>
								<td data-label="Acción"><button class="text-action new-order-remove" type="button" disabled={submitting} on:click={() => remove(item.cardListingId)}>Quitar</button></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if hasUnavailableItems}
				<button class="text-action new-order-refresh" type="button" disabled={submitting || items.some((item) => item.checking)} on:click={refreshItems}>Comprobar cartas otra vez</button>
			{/if}
			<div class="new-order-total"><span>Subtotal estimado</span><strong>{hasUnavailableItems ? 'Pendiente' : formatMoney(estimatedSubtotal)}</strong></div>
			<p class="new-order-price-note">Los precios finales se fijan durante la revisión de la Orden.</p>

			<div class="new-order-period">
				<label class="label" for="new-order-period">Pedido abierto</label>
				{#if periodLoading}<p>Cargando Pedidos abiertos…</p>{/if}
				{#if periodError}<p class="error-text" role="alert">{periodError} <button class="text-action" type="button" on:click={loadPeriods}>Intentar nuevamente</button></p>{/if}
				{#if !periodLoading && !periodError}
					{#if periods.length === 0}<p>No hay Pedidos abiertos. Tu lista seguirá guardada en este navegador.</p>{/if}
					<select id="new-order-period" class="field" bind:value={selectedPeriodId} on:change={changePeriod} disabled={periods.length === 0 || submitting}>
						<option value={0}>Selecciona un Pedido</option>
						{#each periods as period (period.id)}<option value={period.id}>{period.name} · Cierra {formatDate(period.closesAt)}</option>{/each}
					</select>
				{/if}
				{#if periodNote}<p class="error-text" role="alert">{periodNote}</p>{/if}
			</div>
			{#if submitError}<p class="error-text" role="alert">{submitError}</p>{/if}
			<button class="button new-order-submit" type="button" disabled={submitting || loadingDraft || hasUnavailableItems || !selectedPeriodId || periodLoading || !!periodError} on:click={submit}>{submitting ? 'Enviando Orden…' : 'Crear Orden'}</button>
		{/if}
	</section>
</div>

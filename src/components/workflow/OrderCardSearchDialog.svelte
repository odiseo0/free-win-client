<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { CardSearchJobError, CardSearchTimeoutError, searchCardListingsUntilReady } from '../../lib/api/search';
	import type { CardListing, OrderRequest, ScrapeJobStatus } from '../../lib/api/types';
	import { formatMoney } from '../../lib/workflow';

	export let open = false;
	export let order: OrderRequest;
	export let onClose: () => void;
	export let onAdd: (listing: CardListing) => Promise<void>;

	let dialog: HTMLDialogElement;
	let queryInput: HTMLInputElement;
	let query = '';
	let results: CardListing[] = [];
	let searching = false;
	let searched = false;
	let searchStatus = '';
	let searchError = '';
	let actionError = '';
	let busyId: number | null = null;
	let controller: AbortController | null = null;

	$: if (dialog) {
		if (open && !dialog.open) {
			dialog.showModal();
			void tick().then(() => queryInput?.focus());
		} else if (!open && dialog.open) dialog.close();
	}

	function close() {
		controller?.abort();
		onClose();
	}

	function progress(status: ScrapeJobStatus): string {
		if (status === 'retry_wait') return 'La fuente externa pidió reintentar…';
		if (status === 'running') return 'Buscando publicaciones en la fuente externa…';
		if (status === 'succeeded') return 'Actualizando los resultados…';
		return 'Preparando la búsqueda en la fuente externa…';
	}

	async function search() {
		const requestedQuery = query.trim();
		if (!requestedQuery) return;
		controller?.abort();
		const current = new AbortController();
		controller = current;
		results = [];
		searched = false;
		searching = true;
		searchError = '';
		searchStatus = 'Consultando el catálogo…';
		try {
			const found = await searchCardListingsUntilReady(requestedQuery, {
				limit: 30,
				signal: current.signal,
				onProgress: ({ status }) => {
					if (controller === current) searchStatus = progress(status);
				},
			});
			if (controller === current) {
				results = found;
				searched = true;
			}
		} catch (caught) {
			if (caught instanceof DOMException && caught.name === 'AbortError') return;
			if (controller === current) {
				searchError = caught instanceof CardSearchJobError || caught instanceof CardSearchTimeoutError
					? caught.message : getApiErrorMessage(caught);
				searched = true;
			}
		} finally {
			if (controller === current) {
				searching = false;
				searchStatus = '';
				controller = null;
			}
		}
	}

	async function add(listing: CardListing) {
		if (listing.id == null || busyId !== null) return;
		busyId = listing.id;
		actionError = '';
		try {
			await onAdd(listing);
		} catch (caught) {
			actionError = getApiErrorMessage(caught);
		} finally {
			busyId = null;
		}
	}

	onDestroy(() => controller?.abort());
</script>

<dialog bind:this={dialog} class="order-search-dialog" aria-labelledby="order-search-title" on:close={close} on:click={(event) => { if (event.target === dialog) close(); }}>
	<div class="order-search-dialog-content">
		<div class="order-search-dialog-heading">
			<div><p class="route-label">ORDEN #{order.id}</p><h2 id="order-search-title">Añadir cartas</h2></div>
			<button class="text-action" type="button" on:click={close} aria-label="Cerrar búsqueda">Cerrar ×</button>
		</div>
		<p>Busca por nombre o código. Las cartas que ya están en la Orden aparecen marcadas.</p>
		<form class="search-form" on:submit|preventDefault={search}>
			<label class="sr-only" for="order-search-query">Nombre o código</label>
			<input bind:this={queryInput} id="order-search-query" class="field" type="search" maxlength="255" bind:value={query} placeholder="Nombre o código de la carta" />
			<button class="button" type="submit" disabled={!query.trim() || searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
		</form>
		<div class="search-feedback" aria-live="polite">
			{#if searchStatus}<p>{searchStatus}</p>{/if}
			{#if searchError}<p class="error-text" role="alert">{searchError}</p>{/if}
			{#if actionError}<p class="error-text" role="alert">{actionError}</p>{/if}
		</div>
		{#if results.length > 0}
			<div class="search-results overflow-x-auto">
				<table>
					<thead><tr><th scope="col">Carta</th><th scope="col">Código</th><th scope="col">Rareza</th><th scope="col">Condición</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Acción</th></tr></thead>
					<tbody>
						{#each results as listing, index (listing.id ?? `pending-${index}`)}
							{@const existing = order.items.find((item) => item.cardListingId === listing.id)}
							<tr>
								<th scope="row">{listing.name}</th>
								<td data-label="Código">{listing.code}</td>
								<td data-label="Rareza">{listing.rarity}</td>
								<td data-label="Condición">{listing.condition}</td>
								<td data-label="Precio">{formatMoney(listing.price, listing.currency)}</td>
								<td data-label="Stock">{listing.stock}</td>
								<td data-label="Acción"><button class="button-secondary" type="button" disabled={busyId !== null || Boolean(existing && !existing.removedAt) || !listing.isActive || listing.stock < 1 || listing.id == null} on:click={() => add(listing)}>{busyId === listing.id ? 'Guardando…' : existing ? (existing.removedAt ? 'Restaurar' : 'Añadida') : !listing.isActive || listing.stock < 1 ? 'Sin stock' : 'Añadir'}</button></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if searched && !searchError}
			<p class="search-empty">No encontramos publicaciones para esa búsqueda.</p>
		{/if}
	</div>
</dialog>

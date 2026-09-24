<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import type { CardListing, OrderRequest } from '../../lib/api/types';
	import { QuantityAutosave, type QuantitySaveState } from '../../lib/quantityAutosave';
	import { canEditParticipantOrder, formatDate, formatMoney, orderStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';
	import OrderCardSearchDialog from './OrderCardSearchDialog.svelte';

	export let id: number;
	let order: OrderRequest | null = null;
	let periodName = '';
	let loading = true;
	let loadError = '';
	let quantities: Record<number, number> = {};
	let rowStates: Record<number, QuantitySaveState> = {};
	let rowErrors: Record<number, string> = {};
	let autosave: QuantityAutosave | null = null;
	let searchOpen = false;
	let addButton: HTMLButtonElement;
	$: activeItemCount = order?.items.filter((item) => !item.removedAt).length ?? 0;

	function replaceOrder(next: OrderRequest) {
		const wasEditable = order && canEditParticipantOrder(order);
		order = next;
		if (!canEditParticipantOrder(next)) {
			autosave?.stop();
			autosave = null;
			searchOpen = false;
			quantities = Object.fromEntries(next.items.map((item) => [item.id, item.requestedQuantity]));
			rowStates = {};
			return;
		}
		if (!autosave || !wasEditable) {
			quantities = Object.fromEntries(next.items.map((item) => [item.id, item.requestedQuantity]));
			autosave = new QuantityAutosave(
				next.items.filter((item) => !item.removedAt).map((item) => [item.id, item.requestedQuantity]),
				saveQuantity,
				(itemId, state, error) => {
					rowStates = { ...rowStates, [itemId]: state };
					rowErrors = { ...rowErrors, [itemId]: error ? getApiErrorMessage(error) : '' };
				},
			);
		} else {
			for (const item of next.items) {
				if (quantities[item.id] === undefined) {
					quantities = { ...quantities, [item.id]: item.requestedQuantity };
					autosave.register(item.id, item.requestedQuantity);
				}
			}
		}
	}

	async function saveQuantity(itemId: number, quantity: number): Promise<number> {
		if (!order) throw new Error('La Orden ya no está disponible.');
		try {
			const response = await orderRequestsApi.updateItem(order.id, itemId, { requestedQuantity: quantity });
			if (response.status !== 'submitted') {
				replaceOrder(response);
				throw new Error('Esta Orden ya no está pendiente. No puedes cambiar sus cartas.');
			}
			const savedItem = response.items.find((item) => item.id === itemId);
			if (!savedItem) throw new Error('No pudimos confirmar la cantidad guardada.');
			// The local quantity may have changed while this request ran.
			order = { ...order, items: order.items.map((item) => item.id === itemId ? savedItem : item) };
			return savedItem.requestedQuantity;
		} catch (caught) {
			try {
				const latest = await orderRequestsApi.get(id);
				if (latest.status !== 'submitted') replaceOrder(latest);
			} catch { /* Keep the original error. */ }
			throw caught;
		}
	}

	async function load() {
		loading = true;
		try {
			const next = await orderRequestsApi.get(id);
			replaceOrder(next);
			try {
				const period = await orderPeriodsApi.get(next.orderPeriodId);
				periodName = period.name;
			} catch { periodName = ''; }
		} catch (caught) {
			loadError = getApiErrorMessage(caught);
		} finally { loading = false; }
	}

	function changeQuantity(itemId: number, delta: number) {
		if (!order || !canEditParticipantOrder(order)) return;
		const next = (quantities[itemId] ?? 1) + delta;
		if (next < 1 || !Number.isSafeInteger(next)) return;
		quantities = { ...quantities, [itemId]: next };
		autosave?.change(itemId, next);
	}

	async function addListing(listing: CardListing) {
		if (!order || !canEditParticipantOrder(order) || listing.id == null) return;
		const existing = order.items.find((item) => item.cardListingId === listing.id);
		if (existing && !existing.removedAt) return;
		try {
			const next = existing
				? await orderRequestsApi.restoreItem(order.id, existing.id)
				: await orderRequestsApi.addItem(order.id, { cardListingId: listing.id, requestedQuantity: 1 });
			replaceOrder(next);
		} catch (caught) {
			try {
				const latest = await orderRequestsApi.get(id);
				if (latest.status !== 'submitted') replaceOrder(latest);
			} catch { /* Keep the original error. */ }
			throw caught;
		}
	}

	async function closeSearch() {
		searchOpen = false;
		await tick();
		addButton?.focus();
	}
	function warnBeforeLeave(event: BeforeUnloadEvent) {
		if (!autosave?.hasUnsaved()) return;
		event.preventDefault();
		event.returnValue = '';
	}

	onMount(() => {
		void load();
		window.addEventListener('beforeunload', warnBeforeLeave);
		return () => window.removeEventListener('beforeunload', warnBeforeLeave);
	});
	onDestroy(() => autosave?.stop());
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando la Orden…" />
{:else if loadError && !order}
	<StateNotice kind="error" message={loadError} />
{:else if order}
	<section class="order-status-header">
		<p class="route-label">ORDEN #{order.id} / PEDIDO #{order.orderPeriodId}</p>
		<h1>Orden para {periodName || `Pedido #${order.orderPeriodId}`}</h1>
		<p class="order-date">Enviada el {formatDate(order.dateAdded)} · {activeItemCount} {activeItemCount === 1 ? 'carta' : 'cartas'}</p>
		<p class="order-status-line"><span class="status">{orderStatusLabels[order.status]}</span></p>
	</section>
	<section class="order-detail-items">
		<div class="order-detail-heading">
			<h2>Cartas solicitadas</h2>
			{#if canEditParticipantOrder(order)}<button bind:this={addButton} class="button-secondary" type="button" on:click={() => searchOpen = true}>Añadir cartas</button>{/if}
		</div>
		<div class="order-detail-table-wrap">
			<table class="order-detail-table">
				<thead><tr><th scope="col">Carta</th><th scope="col">Cantidad</th><th scope="col">Precio estimado</th><th scope="col">Total estimado</th></tr></thead>
				<tbody>
					{#each order.items as item (item.id)}
						<tr class:removed={Boolean(item.removedAt)}>
							<th scope="row">{item.cardName}<span class="order-detail-card-note">{item.cardCode} · {item.rarity} · {item.condition}</span>{#if item.removedAt}<span class="route-label">RETIRADA</span>{/if}</th>
							<td data-label="Cantidad">
								{#if canEditParticipantOrder(order) && !item.removedAt}
									<div class="new-order-quantity" aria-label={`Cantidad de ${item.cardName}`}>
										<button type="button" aria-label={`Restar una copia de ${item.cardName}`} disabled={(quantities[item.id] ?? item.requestedQuantity) <= 1} on:click={() => changeQuantity(item.id, -1)}>−</button>
										<span>{quantities[item.id] ?? item.requestedQuantity}</span>
										<button type="button" aria-label={`Añadir una copia de ${item.cardName}`} on:click={() => changeQuantity(item.id, 1)}>+</button>
									</div>
									<div class="order-row-feedback" aria-live="polite">
										{#if rowStates[item.id] === 'pending'}Guardando en 3 segundos…{/if}
										{#if rowStates[item.id] === 'saving'}Guardando…{/if}
										{#if rowStates[item.id] === 'error'}<span class="error-text" role="alert">{rowErrors[item.id] || 'No pudimos guardar la cantidad.'}</span> <button class="text-action" type="button" on:click={() => autosave?.retry(item.id)}>Reintentar</button>{/if}
									</div>
								{:else}{item.requestedQuantity}{/if}
							</td>
							<td data-label="Precio estimado">{formatMoney(item.estimatedUnitPrice, order.currency)}</td>
							<td data-label="Total estimado">{formatMoney(Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity), order.currency)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if order.agreedTotal !== null && order.agreedTotal !== undefined}<p class="order-final-total">Total final <strong>{formatMoney(order.agreedTotal, order.currency)}</strong></p>{/if}
	</section>
	{#if searchOpen}<OrderCardSearchDialog open={searchOpen} {order} onClose={closeSearch} onAdd={addListing} />{/if}
{/if}

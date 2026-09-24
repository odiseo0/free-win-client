<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { OrderRequest } from '../../lib/api/types';
	import { formatMoney, orderStatusLabels } from '../../lib/workflow';

	export let order: OrderRequest | null;
	export let quantities: Record<number, number>;
	export let savingItemIds: number[];
	export let error = '';
	export let onChangeQuantity: (itemId: number, change: number) => void;

	let sheet: HTMLDialogElement;
	let trigger: HTMLButtonElement;
	let previousOverflow = '';

	$: activeItems = order?.items.filter((item) => !item.removedAt) ?? [];
	$: itemCount = activeItems.length;
	$: copyCount = activeItems.reduce(
		(total, item) => total + (quantities[item.id] ?? item.requestedQuantity),
		0,
	);
	$: estimatedSubtotal = activeItems.reduce(
		(total, item) => total + Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity),
		0,
	);

	function openSheet() {
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		sheet.showModal();
	}

	function closeSheet() {
		if (sheet?.open) sheet.close();
	}

	function afterClose() {
		document.body.style.overflow = previousOverflow;
		trigger?.focus();
	}

	function closeFromBackdrop(event: MouseEvent) {
		if (event.target === sheet) closeSheet();
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow;
	});
</script>

{#snippet progressContents(showClose = false)}
	<div class="order-progress-heading">
		<div>
			<p class="route-label">TU ORDEN</p>
			<h2>{order ? `Orden #${order.id}` : 'Orden nueva'}</h2>
		</div>
		{#if showClose}<button class="text-action sheet-close" type="button" on:click={closeSheet}>Cerrar</button>{/if}
	</div>

	{#if order}
		<p class="order-progress-status">{orderStatusLabels[order.status]}</p>
	{/if}

	{#if error}<p class="error-text order-progress-error" role="alert">{error}</p>{/if}
	{#if savingItemIds.length > 0}<p class="saving-note" aria-live="polite">Guardando cambios…</p>{/if}

	{#if activeItems.length === 0}
		<div class="order-progress-empty">
			<p>Aún no has añadido cartas.</p>
			<p>La Orden se guardará cuando añadas la primera.</p>
		</div>
	{:else}
		<dl class="order-progress-totals">
			<div><dt>Cartas</dt><dd>{itemCount}</dd></div>
			<div><dt>Copias</dt><dd>{copyCount}</dd></div>
			<div class="estimated-total"><dt>Subtotal estimado</dt><dd>{formatMoney(estimatedSubtotal, order?.currency)}</dd></div>
		</dl>

		<ul class="order-progress-items">
			{#each activeItems as item}
				<li>
					<div class="order-item-primary">
						<h3>{item.cardName}</h3>
						<strong>{formatMoney(Number(item.estimatedUnitPrice) * (quantities[item.id] ?? item.requestedQuantity), order?.currency)}</strong>
					</div>
					<div class="order-item-secondary">
						<p>{item.cardCode} · {item.rarity} · {item.condition}</p>
						<p>{formatMoney(item.estimatedUnitPrice, order?.currency)} por copia</p>
						<div class="quantity-stepper" aria-label={`Cantidad de ${item.cardName}`}>
							<button type="button" disabled={savingItemIds.includes(item.id) || quantities[item.id] <= 1} aria-label={`Restar una copia de ${item.cardName}`} on:click={() => onChangeQuantity(item.id, -1)}>−</button>
							<span aria-live="polite">{quantities[item.id]}</span>
							<button type="button" disabled={savingItemIds.includes(item.id)} aria-label={`Añadir una copia de ${item.cardName}`} on:click={() => onChangeQuantity(item.id, 1)}>+</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if order}
		<a class="button-secondary order-status-link" href={`/orders/${order.id}`}>Ver Orden</a>
	{/if}
{/snippet}

<aside class="order-progress-desktop" aria-label="Progreso de tu Orden">
	{@render progressContents()}
</aside>

<div class="mobile-order-summary">
	<div>
		<p class="route-label">TU ORDEN</p>
		<p><strong>{itemCount}</strong> {itemCount === 1 ? 'carta' : 'cartas'} · {formatMoney(estimatedSubtotal, order?.currency)}</p>
	</div>
	<button bind:this={trigger} class="button-secondary" type="button" on:click={openSheet}>Ver Orden</button>
</div>

<dialog bind:this={sheet} class="order-sheet" aria-label="Tu Orden" on:close={afterClose} on:click={closeFromBackdrop}>
	<div class="order-sheet-content">
		{@render progressContents(true)}
	</div>
</dialog>

<p class="sr-only" aria-live="polite">Tu Orden tiene {itemCount} {itemCount === 1 ? 'carta' : 'cartas'} y {copyCount} {copyCount === 1 ? 'copia' : 'copias'}.</p>

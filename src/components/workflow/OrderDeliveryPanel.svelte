<script lang="ts">
	import { onMount } from 'svelte';
	import type { OrderRequest, OrderTracking, UserAddress } from '../../lib/api/types';
	import { mockTracking, readMockBlockedData } from '../../lib/mockData';
	import { formatDate, formatMoney } from '../../lib/workflow';
	export let order: OrderRequest;
	let tracking: OrderTracking | null = null;
	let addresses: UserAddress[] = [];
	let method: 'pickup' | 'national_shipping' = 'pickup';
	let addressId = '';
	let notice = '';
	const mockEnabled = import.meta.env.DEV;
	onMount(() => {
		if (!mockEnabled) return;
		tracking = mockTracking(order.id);
		addresses = readMockBlockedData().addresses;
		method = tracking.preference?.method ?? 'pickup';
		addressId = tracking.preference?.userAddressId?.toString() ?? '';
	});
	function savePreference() {
		if (!tracking) return;
		tracking = { ...tracking, preference: { method, userAddressId: method === 'national_shipping' ? Number(addressId) : null, dateUpdated: new Date().toISOString() } };
		notice = 'La preferencia de prueba se guardó para esta vista.';
	}
</script>

<section class="detail-section" aria-labelledby="delivery-title">
	<div class="section-heading"><div><p class="route-label">SEGUIMIENTO</p><h2 id="delivery-title">Compra y entrega</h2></div><span class="demo-badge">DATOS DE PRUEBA</span></div>
	{#if !mockEnabled}<p class="state-box error-text">El seguimiento no está disponible hasta que el backend responda de forma estable.</p>
	{:else if tracking}
		<div class="tracking-summary">
			<div><span>Pago</span><strong>{tracking.isPaid ? `Confirmado · ${formatDate(tracking.paidAt)}` : 'Pendiente'}</strong></div>
			<div><span>Compra internacional</span><strong>{tracking.internationalSummary.stageName}</strong></div>
			<div><span>Entrega final</span><strong>{tracking.fulfillment?.currentStage.name ?? 'Por preparar'}</strong></div>
		</div>
		<ol class="timeline compact"><li><strong>Orden aceptada</strong><span>Lista para confirmar el pago.</span></li><li><strong>Pago confirmado</strong><span>{formatDate(tracking.paidAt)}</span></li><li><strong>{tracking.internationalSummary.stageName}</strong><span>{tracking.internationalSummary.isPartial ? 'El envío contiene una parte de la Orden.' : 'Todas las cantidades compradas avanzan juntas.'}</span></li>{#if tracking.fulfillment}<li><strong>{tracking.fulfillment.currentStage.name}</strong><span>{tracking.fulfillment.trackingNumber ?? 'Sin guía'}</span></li>{/if}</ol>
		{#if order.status === 'accepted' || order.status === 'paid'}
			<form class="preference-form" on:submit|preventDefault={savePreference}>
				<h3>Cómo quieres recibir tu Orden</h3>
				<label><input type="radio" name="method" value="pickup" bind:group={method} /> Retiro acordado con Free Win</label>
				<label><input type="radio" name="method" value="national_shipping" bind:group={method} /> Envío nacional</label>
				{#if method === 'national_shipping'}<label><span class="label">Dirección</span><select class="field" required bind:value={addressId}><option value="">Selecciona una dirección</option>{#each addresses as address}<option value={address.id}>{address.name} · {address.city}</option>{/each}</select></label>{/if}
				<button class="button-secondary" type="submit">Guardar preferencia</button>
				{#if notice}<p role="status">{notice}</p>{/if}
			</form>
		{/if}
		{#if tracking.fulfillment?.shippingCost}<p class="total-line"><span>Entrega nacional</span><strong>{formatMoney(tracking.fulfillment.shippingCost, tracking.fulfillment.currency ?? order.currency)}</strong></p>{/if}
	{/if}
</section>

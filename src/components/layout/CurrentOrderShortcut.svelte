<script lang="ts">
	import type { CurrentOrderSummary } from '../../lib/currentOrderCache';
	import { orderStatusLabels } from '../../lib/workflow';

	export let loading = false;
	export let order: CurrentOrderSummary | null = null;
	export let failed = false;
</script>

<div class="current-order-shortcut" aria-live="polite">
	<p class="route-label">ORDEN ACTUAL</p>
	{#if loading}
		<p class="shortcut-note">Consultando…</p>
	{:else if order}
		<a class="current-order-link" href={`/orders/${order.id}`}>
			<strong>ORDEN #{order.id}</strong>
			<span>{orderStatusLabels[order.status]}</span>
			<span class="text-link">Ver Orden</span>
		</a>
	{:else if failed}
		<a class="current-order-link" href="/orders">
			<strong>No disponible</strong>
			<span>Consulta tus Órdenes</span>
		</a>
	{:else}
		<a class="current-order-link" href="/order-periods">
			<strong>Sin Orden activa</strong>
			<span>Crear una Orden</span>
		</a>
	{/if}
</div>

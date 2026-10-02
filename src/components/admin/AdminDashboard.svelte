<script lang="ts">
	import { onMount } from 'svelte';
	import { orderPeriodsApi, orderRequestsApi } from '../../lib/api/workflow';
	import { readMockBlockedData } from '../../lib/mockData';
	import { getApiErrorMessage } from '../../lib/api/client';
	let stats = { openPeriods: 0, review: 0, paid: 0, users: 0 };
	let loading = true, error = '';
	async function load() {
		try {
			const [periods, orders] = await Promise.all([orderPeriodsApi.list({ page: 1, shows: 100 }), orderRequestsApi.list({ page: 1, shows: 100 })]);
			stats = { openPeriods: periods.items.filter((item) => item.status === 'open').length, review: orders.items.filter((item) => item.status === 'submitted' || item.status === 'in_review').length, paid: orders.items.filter((item) => item.status === 'paid').length, users: readMockBlockedData().users.length };
		} catch (caught) { error = getApiErrorMessage(caught); } finally { loading = false; }
	}
	onMount(load);
</script>
{#if loading}<p class="state-box">Cargando el resumen…</p>{:else if error}<p class="state-box error-text" role="alert">{error}</p>{:else}
<div class="metric-grid"><a href="/admin/order-periods"><span>Pedidos abiertos</span><strong>{stats.openPeriods}</strong></a><a href="/admin/orders"><span>Órdenes por revisar</span><strong>{stats.review}</strong></a><a href="/admin/orders"><span>Órdenes pagadas</span><strong>{stats.paid}</strong></a><a href="/admin/users"><span>Usuarios de prueba</span><strong>{stats.users}</strong></a></div>
<div class="admin-quick-links"><a class="button" href="/admin/order-periods/new">Crear Pedido</a><a class="button-secondary" href="/admin/shipments">Gestionar envíos</a></div>
{/if}

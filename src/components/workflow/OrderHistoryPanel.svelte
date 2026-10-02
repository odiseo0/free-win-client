<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import type { OrderRequestHistory } from '../../lib/api/types';
	import { formatDate } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';
	export let orderId: number;
	let items: OrderRequestHistory[] = [];
	let loading = true;
	let error = '';
	async function load() {
		loading = true; error = '';
		try { items = await orderRequestsApi.history(orderId, { page: 1, shows: 100 }); }
		catch (caught) { error = getApiErrorMessage(caught); }
		finally { loading = false; }
	}
	onMount(load);
</script>

<section class="detail-section" aria-labelledby="history-title">
	<h2 id="history-title">Historial</h2>
	{#if loading}<StateNotice kind="loading" message="Cargando el historial…" />
	{:else if error}<StateNotice kind="error" message={error} />
	{:else if items.length === 0}<StateNotice message="Esta Orden aún no tiene cambios registrados." />
	{:else}<ol class="timeline">{#each items as item}<li><strong>{item.event.replaceAll('_', ' ')}</strong><span>{formatDate(item.occurredAt)} · Usuario #{item.actorUserId}</span></li>{/each}</ol>{/if}
</section>

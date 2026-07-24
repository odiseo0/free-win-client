<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiErrorMessage } from '../../lib/api/client';
	import { orderPeriodsApi } from '../../lib/api/workflow';
	import type { OrderPeriod, OrderPeriodHistory } from '../../lib/api/types';
	import { formatDate, periodStatusLabels } from '../../lib/workflow';
	import StateNotice from '../ui/StateNotice.svelte';

	export let id: number | null = null;
	let period: OrderPeriod | null = null;
	let history: OrderPeriodHistory[] = [];
	let name = '';
	let opensAt = '';
	let closesAt = '';
	let loading = id !== null;
	let saving = false;
	let error = '';

	function toLocalInput(value: string): string {
		const date = new Date(value);
		const offset = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - offset).toISOString().slice(0, 16);
	}

	async function load() {
		if (id === null) return;
		try {
			[period, history] = await Promise.all([
				orderPeriodsApi.get(id),
				orderPeriodsApi.history(id, { page: 1, shows: 100 }),
			]);
			name = period.name;
			opensAt = toLocalInput(period.opensAt);
			closesAt = toLocalInput(period.closesAt);
			history = [...history].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
		} catch (caught) {
			error = getApiErrorMessage(caught);
		} finally {
			loading = false;
		}
	}

	async function save() {
		if (!name.trim() || !opensAt || !closesAt) return;
		saving = true;
		error = '';
		try {
			const body = {
				name: name.trim(),
				opensAt: new Date(opensAt).toISOString(),
				closesAt: new Date(closesAt).toISOString(),
			};
			const saved = id === null
				? await orderPeriodsApi.create(body)
				: await orderPeriodsApi.update(id, body);
			window.location.assign(`/admin/order-periods/${saved.id}`);
		} catch (caught) {
			error = getApiErrorMessage(caught);
			saving = false;
		}
	}

	onMount(load);
</script>

{#if loading}
	<StateNotice kind="loading" message="Cargando el Pedido…" />
{:else if error && id !== null && !period}
	<StateNotice kind="error" message={error} />
{:else}
	{#if period}
		<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-sm text-stone-500">Pedido #{period.id}</p>
				<span class="status mt-2">{periodStatusLabels[period.status]}</span>
			</div>
			<a class="button-secondary" href={`/admin/orders?orderPeriodId=${period.id}`}>Ver órdenes del Pedido</a>
		</div>
	{/if}
	<form class="panel max-w-3xl" on:submit|preventDefault={save}>
		<div>
			<label class="label" for="period-name">Nombre del Pedido</label>
			<input id="period-name" class="field" maxlength="255" required bind:value={name} placeholder="Pedido agosto 2026" />
		</div>
		<div class="mt-5 grid gap-5 sm:grid-cols-2">
			<label>
				<span class="label">Fecha de apertura</span>
				<input class="field" type="datetime-local" required bind:value={opensAt} />
			</label>
			<label>
				<span class="label">Fecha de cierre</span>
				<input class="field" type="datetime-local" required bind:value={closesAt} />
			</label>
		</div>
		<p class="mt-3 text-xs text-stone-500">Las fechas se envían al servidor con la zona horaria de este dispositivo.</p>
		{#if error}<p class="mt-4 text-sm text-red-300" role="alert">{error}</p>{/if}
		<div class="mt-6 flex flex-wrap gap-3">
			<button class="button" type="submit" disabled={saving}>{saving ? 'Guardando…' : id === null ? 'Crear Pedido' : 'Guardar cambios'}</button>
			<a class="button-secondary" href="/admin/order-periods">Volver</a>
		</div>
	</form>

	{#if period}
		<section class="panel mt-6 max-w-3xl">
			<h2 class="text-lg font-semibold text-white">Historial</h2>
			{#if history.length === 0}
				<p class="mt-3 text-sm text-stone-500">No hay eventos registrados.</p>
			{:else}
				<ol class="mt-4 space-y-3">
					{#each history as event}
						<li class="border-l-2 border-stone-700 pl-4 text-sm">
							<p class="font-medium text-stone-200">{event.event === 'created' ? 'Pedido creado' : event.event === 'updated' ? 'Pedido actualizado' : 'Cierre anticipado'}</p>
							<p class="mt-1 text-stone-500">{formatDate(event.occurredAt)} · Usuario #{event.actorUserId}</p>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	{/if}
{/if}


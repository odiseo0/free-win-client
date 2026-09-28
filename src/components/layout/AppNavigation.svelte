<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import { readCurrentOrderCache, writeCurrentOrderCache, type CurrentOrderSummary } from '../../lib/currentOrderCache';
	import { selectMostRecentActiveOrder } from '../../lib/workflow';
	import CurrentOrderShortcut from './CurrentOrderShortcut.svelte';

	export let path: string;

	let activeOrder: CurrentOrderSummary | null = null;
	let loading = true;
	let failed = false;
	let drawer: HTMLDialogElement;
	let menuButton: HTMLButtonElement;
	let open = false;
	let previousOverflow = '';

	const links = [
		{ href: '/order-periods', label: 'Pedidos', active: path.startsWith('/order-periods') },
		{ href: '/orders', label: 'Órdenes', active: path.startsWith('/orders') && path !== '/orders/new' },
		{ href: '/admin/order-periods', label: 'Organizar', active: path.startsWith('/admin') },
	];

	async function loadCurrentOrder() {
		const cached = readCurrentOrderCache();
		if (cached) {
			activeOrder = cached.order;
			loading = false;
			return;
		}
		try {
			const response = await orderRequestsApi.list({ page: 1, shows: 100 });
			const selected = selectMostRecentActiveOrder(response.items);
			activeOrder = selected ? { id: selected.id, status: selected.status } : null;
			writeCurrentOrderCache(activeOrder);
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	function showDrawer() {
		if (!drawer) return;
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		open = true;
		drawer.showModal();
	}

	function closeDrawer() {
		if (drawer?.open) drawer.close();
	}

	function afterClose() {
		document.body.style.overflow = previousOverflow;
		open = false;
		menuButton?.focus();
	}

	function closeFromBackdrop(event: MouseEvent) {
		if (event.target === drawer) closeDrawer();
	}

	onMount(loadCurrentOrder);
	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow;
	});
</script>

{#snippet navigationContent(mobile = false)}
	<div class="app-nav-content">
		<div>
			<a class="app-brand" href="/" aria-label="Free Win, inicio">FREE WIN</a>
			<nav class="app-primary-nav" aria-label={mobile ? 'Navegación móvil' : 'Navegación principal'}>
				{#each links as link}
					<a href={link.href} aria-current={link.active ? 'page' : undefined} on:click={mobile ? closeDrawer : undefined}>{link.label}</a>
				{/each}
			</nav>
			<div class="app-shortcuts">
				<p class="route-label">ACCESOS</p>
				<a class="new-order-link" href="/orders/new" aria-current={path === '/orders/new' ? 'page' : undefined} on:click={mobile ? closeDrawer : undefined}>Nueva Orden</a>
				<CurrentOrderShortcut {loading} order={activeOrder} {failed} />
			</div>
		</div>
		<a class="account-link" href="/account" aria-current={path.startsWith('/account') ? 'page' : undefined} on:click={mobile ? closeDrawer : undefined}>Cuenta</a>
	</div>
{/snippet}

<aside class="desktop-app-nav" aria-label="Aplicación">
	{@render navigationContent()}
</aside>

<div class="mobile-app-bar">
	<a class="app-brand" href="/">FREE WIN</a>
	<button bind:this={menuButton} class="mobile-menu-button" type="button" aria-label="Abrir navegación" aria-expanded={open} aria-controls="mobile-app-drawer" on:click={showDrawer}>•••</button>
</div>

<dialog bind:this={drawer} id="mobile-app-drawer" class="mobile-app-drawer" aria-label="Navegación de Free Win" on:close={afterClose} on:click={closeFromBackdrop}>
	<div class="drawer-panel">
		<button class="drawer-close" type="button" on:click={closeDrawer}>Cerrar</button>
		{@render navigationContent(true)}
	</div>
</dialog>

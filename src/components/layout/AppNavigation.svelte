<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { orderRequestsApi } from '../../lib/api/workflow';
	import { readCurrentOrderCache, writeCurrentOrderCache, type CurrentOrderSummary } from '../../lib/currentOrderCache';
	import { selectMostRecentActiveOrder } from '../../lib/workflow';
	import CurrentOrderShortcut from './CurrentOrderShortcut.svelte';
	import { clearMockSession, readMockSession, SESSION_CHANGED_EVENT, type MockSession } from '../../lib/session';

	export let path: string;
	export let area: 'user' | 'admin' = 'user';

	let activeOrder: CurrentOrderSummary | null = null;
	let loading = true;
	let failed = false;
	let drawer: HTMLDialogElement;
	let menuButton: HTMLButtonElement;
	let open = false;
	let previousOverflow = '';
	let session: MockSession | null = null;

	$: links = area === 'admin' ? [
		{ href: '/admin', label: 'Resumen', active: path === '/admin' },
		{ href: '/admin/order-periods', label: 'Pedidos', active: path.startsWith('/admin/order-periods') },
		{ href: '/admin/orders', label: 'Órdenes', active: path.startsWith('/admin/orders') },
		{ href: '/admin/shipments', label: 'Envíos', active: path.startsWith('/admin/shipments') },
		{ href: '/admin/users', label: 'Usuarios', active: path.startsWith('/admin/users') },
		{ href: '/admin/roles', label: 'Roles y permisos', active: path.startsWith('/admin/roles') },
		{ href: '/admin/delivery-stages', label: 'Etapas de entrega', active: path.startsWith('/admin/delivery-stages') },
	] : [
		{ href: '/order-periods', label: 'Pedido actual', active: path.startsWith('/order-periods') },
		{ href: '/orders', label: 'Mis órdenes', active: path.startsWith('/orders') && path !== '/orders/new' },
		{ href: '/orders/new', label: 'Nueva Orden', active: path === '/orders/new' },
		{ href: '/account', label: 'Mi cuenta', active: path.startsWith('/account') },
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

	function syncSession() { session = readMockSession(); }
	function signOut() { clearMockSession(); window.location.assign('/join'); }
	onMount(() => {
		syncSession();
		window.addEventListener(SESSION_CHANGED_EVENT, syncSession);
		if (area === 'user') void loadCurrentOrder(); else loading = false;
	});
	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow;
		if (typeof window !== 'undefined') window.removeEventListener(SESSION_CHANGED_EVENT, syncSession);
	});
</script>

{#snippet navigationContent(mobile = false)}
	<div class="app-nav-content">
		<div>
			<a class="app-brand" href={area === 'admin' ? '/admin' : '/'} aria-label={area === 'admin' ? 'Free Win, administración' : 'Free Win, inicio'}>FREE WIN{area === 'admin' ? ' / ADMIN' : ''}</a>
			<nav class="app-primary-nav" aria-label={mobile ? 'Navegación móvil' : 'Navegación principal'}>
				{#each links as link}
					<a href={link.href} aria-current={link.active ? 'page' : undefined} on:click={mobile ? closeDrawer : undefined}>{link.label}</a>
				{/each}
			</nav>
			{#if area === 'user'}<div class="app-shortcuts">
				<p class="route-label">ACCESOS</p>
				<CurrentOrderShortcut {loading} order={activeOrder} {failed} />
			</div>{/if}
		</div>
		<div class="app-session">
			{#if session?.persona === 'admin'}<a class="area-switch" href={area === 'admin' ? '/order-periods' : '/admin'} on:click={mobile ? closeDrawer : undefined}>{area === 'admin' ? 'Vista de usuario' : 'Administración'}</a>{/if}
			{#if session}<p class="route-label">SESIÓN DE PRUEBA<br />{session.displayName}</p>{/if}
			<button class="text-action" type="button" on:click={signOut}>Salir</button>
		</div>
	</div>
{/snippet}

<aside class="desktop-app-nav" aria-label="Aplicación">
	{@render navigationContent()}
</aside>

<div class="mobile-app-bar">
	<a class="app-brand" href={area === 'admin' ? '/admin' : '/'}>FREE WIN{area === 'admin' ? ' / ADMIN' : ''}</a>
	<button bind:this={menuButton} class="mobile-menu-button" type="button" aria-label="Abrir navegación" aria-expanded={open} aria-controls="mobile-app-drawer" on:click={showDrawer}>•••</button>
</div>

<dialog bind:this={drawer} id="mobile-app-drawer" class="mobile-app-drawer" aria-label="Navegación de Free Win" on:close={afterClose} on:click={closeFromBackdrop}>
	<div class="drawer-panel">
		<button class="drawer-close" type="button" on:click={closeDrawer}>Cerrar</button>
		{@render navigationContent(true)}
	</div>
</dialog>

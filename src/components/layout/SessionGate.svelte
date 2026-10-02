<script lang="ts">
	import { onMount } from 'svelte';
	import { canOpenAdmin, readMockSession, safeReturnPath, type SessionPersona } from '../../lib/session';

	export let requiredPersona: SessionPersona = 'user';
	export let path = '/order-periods';
	let denied = false;

	onMount(() => {
		const session = readMockSession();
		if (!session) {
			window.location.replace(`/join?returnTo=${encodeURIComponent(safeReturnPath(path))}`);
			return;
		}
		denied = requiredPersona === 'admin' && !canOpenAdmin(session);
	});
</script>

{#if denied}
	<div class="session-denied" role="alertdialog" aria-labelledby="access-title">
		<div>
			<p class="route-label">ACCESO LIMITADO</p>
			<h1 id="access-title">Esta vista es para organizadores.</h1>
			<p>La sesión de prueba actual es de participante. Este control no sustituye la seguridad del servidor.</p>
			<a class="button" href="/order-periods">Volver a la vista de usuario</a>
		</div>
	</div>
{/if}

<script lang="ts">
	import { mockPersonas, safeReturnPath, writeMockSession, type SessionPersona } from '../../lib/session';
	export let returnTo = '/order-periods';
	const mockEnabled = import.meta.env.DEV;
	function enter(persona: SessionPersona) {
		if (!mockEnabled) return;
		writeMockSession(mockPersonas[persona]);
		window.location.assign(persona === 'admin' && returnTo.startsWith('/admin') ? returnTo : persona === 'admin' ? '/admin' : safeReturnPath(returnTo));
	}
</script>

<div class="persona-access">
	{#if !mockEnabled}
		<p class="error-text" role="alert">El acceso aún no está disponible. El backend debe ofrecer una sesión real antes de publicar esta pantalla.</p>
	{:else}
	<p class="demo-flag">MODO DE PRUEBA</p>
	<p>El backend aún no ofrece inicio de sesión. Elige una vista local para revisar la interfaz. Esta selección no protege ni cambia la identidad del servidor.</p>
	<div class="persona-options">
		<button class="persona-option" type="button" on:click={() => enter('user')}><span class="route-label">VISTA DE USUARIO</span><strong>Entrar como participante</strong><span>Consulta Pedidos, crea Órdenes y revisa entregas.</span></button>
		<button class="persona-option" type="button" on:click={() => enter('admin')}><span class="route-label">VISTA ADMIN</span><strong>Entrar como organizador</strong><span>Revisa Órdenes, envíos, personas y permisos.</span></button>
	</div>
	{/if}
</div>

<style>
	.persona-access{display:grid;gap:1.5rem;max-width:36rem;margin-top:2.5rem}.persona-access>p{margin:0;color:var(--ink-soft)}.demo-flag{width:max-content;border:1px solid var(--ink);padding:.35rem .55rem;color:var(--ink)!important;font:600 .75rem var(--mono)}.persona-options{display:grid;gap:1rem}.persona-option{display:grid;gap:.45rem;min-height:44px;border:1px solid var(--ink);background:transparent;padding:1.25rem;color:var(--ink);text-align:left;cursor:pointer}.persona-option:hover,.persona-option:focus-visible{background:var(--ink);color:var(--paper)}.persona-option:hover .route-label,.persona-option:focus-visible .route-label{color:var(--paper)}.persona-option strong{font:600 1.2rem var(--display)}
</style>

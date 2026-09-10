<script lang="ts">
	import { getApiErrorMessage } from '../../lib/api/client';
	import { usersApi } from '../../lib/api/users';
	let mode: 'register' | 'signin' = 'register';
	let name = '', email = '', password = '', error = '', saving = false, created = false;
	async function register() {
		saving = true; error = '';
		try { await usersApi.create({ name: name.trim(), email: email.trim(), password }); created = true; }
		catch (caught) { error = getApiErrorMessage(caught); }
		finally { saving = false; }
	}
</script>
<div class="account-switch" role="tablist" aria-label="Acceso a la cuenta">
	<button type="button" role="tab" aria-selected={mode === 'register'} on:click={() => mode = 'register'}>Registrarme</button>
	<button type="button" role="tab" aria-selected={mode === 'signin'} on:click={() => mode = 'signin'}>Iniciar sesión</button>
</div>
{#if mode === 'signin'}
	<section class="account-copy" role="tabpanel"><h2>El inicio de sesión aún no está disponible.</h2><p>No ingreses tu contraseña aquí. Puedes crear una cuenta y consultar los Pedidos abiertos.</p><button class="button-secondary" type="button" on:click={() => mode = 'register'}>Volver al registro</button></section>
{:else if created}
	<section class="account-copy" role="status"><p class="route-label">LISTO</p><h2>Tu cuenta fue creada.</h2><p>El inicio de sesión aún no está listo. Puedes consultar los Pedidos abiertos.</p><a class="button" href="/order-periods">Ver Pedidos</a></section>
{:else}
	<form class="account-form" aria-label="Crear cuenta" on:submit|preventDefault={register}>
		<div><label class="label" for="account-name">Nombre</label><input class="field" id="account-name" autocomplete="name" required bind:value={name} disabled={saving}/></div>
		<div><label class="label" for="account-email">Correo</label><input class="field" id="account-email" type="email" autocomplete="email" required bind:value={email} disabled={saving}/></div>
		<div><label class="label" for="account-password">Contraseña</label><input class="field" id="account-password" type="password" autocomplete="new-password" required bind:value={password} disabled={saving} aria-describedby="password-hint"/><p class="field-hint" id="password-hint">Usa una contraseña que cumpla las reglas que indique el servidor.</p></div>
		{#if error}<p class="error-text" role="alert">{error}</p>{/if}
		<button class="button" type="submit" disabled={saving}>{saving ? 'Creando cuenta…' : 'Crear cuenta'}</button><p aria-live="polite" class="sr-only">{saving ? 'Creando cuenta' : ''}</p>
	</form>
{/if}
<style>
.account-switch{display:flex;gap:1.5rem;margin-bottom:3rem;border-bottom:1px solid var(--ink)}.account-switch button{min-height:44px;border:0;background:transparent;color:var(--ink);font-family:var(--display);font-weight:600}.account-switch button[aria-selected=true]{text-decoration:underline;text-decoration-thickness:.15rem;text-underline-offset:.55rem}.account-form{display:grid;gap:1.5rem;max-width:38rem}.account-copy{max-width:42rem}.account-copy h2{font:600 clamp(2rem,4vw,4rem)/1 var(--display);margin:0 0 1.5rem}.account-copy p{margin-bottom:2rem}
</style>

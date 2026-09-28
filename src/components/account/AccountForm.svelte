<script lang="ts">
	import { getApiErrorMessage } from '../../lib/api/client';
	import { usersApi } from '../../lib/api/users';
	let mode: 'register' | 'signin' = 'register';
	let name = '', email = '', password = '', error = '', saving = false, created = false;
	let loginEmail = '', loginPassword = '', loginError = '', showLoginPassword = false;
	async function register() {
		saving = true; error = '';
		try { await usersApi.create({ name: name.trim(), email: email.trim(), password }); created = true; loginEmail = email.trim(); }
		catch (caught) { error = getApiErrorMessage(caught); }
		finally { saving = false; }
	}
	function signIn() {
		loginPassword = '';
		loginError = 'El servicio aún no permite iniciar sesión. Intenta más tarde.';
	}
</script>
<div class="account-switch" role="tablist" aria-label="Acceso a la cuenta">
	<button id="register-tab" type="button" role="tab" aria-selected={mode === 'register'} aria-controls="register-panel" tabindex={mode === 'register' ? 0 : -1} on:click={() => mode = 'register'}>Registrarme</button>
	<button id="signin-tab" type="button" role="tab" aria-selected={mode === 'signin'} aria-controls="signin-panel" tabindex={mode === 'signin' ? 0 : -1} on:click={() => mode = 'signin'}>Iniciar sesión</button>
</div>
{#if mode === 'signin'}
	<form id="signin-panel" class="account-form" role="tabpanel" aria-labelledby="signin-tab" on:submit|preventDefault={signIn}>
		<div><label class="label" for="login-email">Correo</label><input class="field" id="login-email" type="email" autocomplete="username" required bind:value={loginEmail} on:input={() => loginError = ''} /></div>
		<div><label class="label" for="login-password">Contraseña</label><input class="field" id="login-password" type={showLoginPassword ? 'text' : 'password'} autocomplete="current-password" required bind:value={loginPassword} on:input={() => loginError = ''} /><label class="password-toggle"><input type="checkbox" bind:checked={showLoginPassword} /> Mostrar contraseña</label></div>
		{#if loginError}<p class="error-text" role="alert">{loginError}</p>{/if}
		<button class="button" type="submit">Iniciar sesión</button>
	</form>
{:else if created}
	<section id="register-panel" class="account-copy" role="tabpanel" aria-labelledby="register-tab"><p class="route-label">LISTO</p><h2>Tu cuenta fue creada.</h2><p>Puedes consultar los Pedidos abiertos.</p><a class="button" href="/order-periods">Ver Pedidos</a></section>
{:else}
	<form id="register-panel" class="account-form" role="tabpanel" aria-labelledby="register-tab" on:submit|preventDefault={register}>
		<div><label class="label" for="account-name">Nombre</label><input class="field" id="account-name" autocomplete="name" required bind:value={name} disabled={saving}/></div>
		<div><label class="label" for="account-email">Correo</label><input class="field" id="account-email" type="email" autocomplete="email" required bind:value={email} disabled={saving}/></div>
		<div><label class="label" for="account-password">Contraseña</label><input class="field" id="account-password" type="password" autocomplete="new-password" required bind:value={password} disabled={saving} aria-describedby="password-hint"/><p class="field-hint" id="password-hint">Usa una contraseña que cumpla las reglas que indique el servidor.</p></div>
		{#if error}<p class="error-text" role="alert">{error}</p>{/if}
		<button class="button" type="submit" disabled={saving}>{saving ? 'Creando cuenta…' : 'Crear cuenta'}</button><p aria-live="polite" class="sr-only">{saving ? 'Creando cuenta' : ''}</p>
	</form>
{/if}
<style>
.account-switch{display:flex;gap:1.5rem;margin:2.5rem 0 2.25rem;border-bottom:1px solid var(--ink)}.account-switch button{min-height:44px;border:0;background:transparent;color:var(--ink);font-family:var(--display);font-weight:600;cursor:pointer}.account-switch button[aria-selected=true]{text-decoration:underline;text-decoration-thickness:.15rem;text-underline-offset:.55rem}.account-form{display:grid;gap:1.35rem;max-width:27rem}.account-copy{max-width:27rem}.account-copy h2{font:600 clamp(1.8rem,3vw,3rem)/1 var(--display);margin:0 0 1.25rem}.account-copy p{margin-bottom:2rem}.password-toggle{display:inline-flex;min-height:44px;align-items:center;gap:.5rem;margin-top:.5rem;font-size:.9rem;cursor:pointer}.password-toggle input{width:1rem;height:1rem;accent-color:var(--ink)}
</style>

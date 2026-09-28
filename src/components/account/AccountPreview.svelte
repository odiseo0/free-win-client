<script lang="ts">
	type Profile = { name: string; alias: string; email: string; phoneCode: string; phoneNumber: string; idNumber: string };
	type Address = { id: number; name: string; state: string; city: string; address: string; address2: string; zipCode: string };
	const emptyAddress = (): Address => ({ id: 0, name: '', state: '', city: '', address: '', address2: '', zipCode: '' });

	let profile: Profile = { name: 'Ana Pérez', alias: 'Ana', email: 'ana@ejemplo.com', phoneCode: '+58', phoneNumber: '412 123 4567', idNumber: 'V-12345678' };
	let profileDraft: Profile = { ...profile };
	let editingProfile = false;
	let addresses: Address[] = [{ id: 1, name: 'Casa', state: 'Distrito Capital', city: 'Caracas', address: 'Av. Principal, edificio Los Cedros, piso 2', address2: 'Frente a la plaza', zipCode: '1010' }];
	let addressDraft: Address = emptyAddress();
	let addressMode: 'add' | 'edit' | null = null;
	let nextAddressId = 2;
	let notice = '';

	function startProfileEdit() {
		profileDraft = { ...profile };
		editingProfile = true;
		notice = '';
	}

	function saveProfile() {
		profile = Object.fromEntries(Object.entries(profileDraft).map(([key, value]) => [key, value.trim()])) as Profile;
		editingProfile = false;
		notice = 'Los datos de ejemplo se actualizaron en esta página.';
	}

	function startAddressAdd() {
		addressDraft = emptyAddress();
		addressMode = 'add';
		notice = '';
	}

	function startAddressEdit(address: Address) {
		addressDraft = { ...address };
		addressMode = 'edit';
		notice = '';
	}

	function saveAddress() {
		const saved: Address = {
			id: addressMode === 'add' ? nextAddressId++ : addressDraft.id,
			name: addressDraft.name.trim(), state: addressDraft.state.trim(), city: addressDraft.city.trim(),
			address: addressDraft.address.trim(), address2: addressDraft.address2.trim(), zipCode: addressDraft.zipCode.trim(),
		};
		addresses = addressMode === 'add' ? [...addresses, saved] : addresses.map((address) => address.id === saved.id ? saved : address);
		addressMode = null;
		notice = 'La dirección de ejemplo se actualizó en esta página.';
	}
</script>

<section class="account-section account-section--profile" aria-labelledby="profile-title">
	<div class="section-heading">
		<div><p class="route-label">Datos personales</p><h2 id="profile-title">Tu perfil</h2></div>
		{#if !editingProfile}<button class="button-secondary" type="button" on:click={startProfileEdit}>Editar datos</button>{/if}
	</div>
	{#if editingProfile}
		<form class="account-form" on:submit|preventDefault={saveProfile}>
			<div class="form-grid">
				<div><label class="label" for="profile-name">Nombre completo</label><input class="field" id="profile-name" autocomplete="name" required bind:value={profileDraft.name} /></div>
				<div><label class="label" for="profile-alias">Alias <span class="optional">(opcional)</span></label><input class="field" id="profile-alias" autocomplete="nickname" bind:value={profileDraft.alias} /></div>
				<div><label class="label" for="profile-email">Correo</label><input class="field" id="profile-email" type="email" autocomplete="email" required bind:value={profileDraft.email} /></div>
				<div><label class="label" for="profile-code">Código de país <span class="optional">(opcional)</span></label><input class="field" id="profile-code" type="tel" autocomplete="tel-country-code" bind:value={profileDraft.phoneCode} /></div>
				<div><label class="label" for="profile-phone">Teléfono <span class="optional">(opcional)</span></label><input class="field" id="profile-phone" type="tel" autocomplete="tel-national" bind:value={profileDraft.phoneNumber} /></div>
				<div><label class="label" for="profile-id">Documento de identidad <span class="optional">(opcional)</span></label><input class="field" id="profile-id" bind:value={profileDraft.idNumber} /></div>
			</div>
			<div class="form-actions"><button class="button" type="submit">Guardar cambios</button><button class="button-secondary" type="button" on:click={() => editingProfile = false}>Cancelar</button></div>
		</form>
	{:else}
		<dl class="details-grid">
			<div><dt>Nombre completo</dt><dd>{profile.name}</dd></div>
			<div><dt>Alias</dt><dd>{profile.alias || 'Sin agregar'}</dd></div>
			<div><dt>Correo</dt><dd>{profile.email}</dd></div>
			<div><dt>Teléfono</dt><dd>{[profile.phoneCode, profile.phoneNumber].filter(Boolean).join(' ') || 'Sin agregar'}</dd></div>
			<div><dt>Documento de identidad</dt><dd>{profile.idNumber || 'Sin agregar'}</dd></div>
		</dl>
	{/if}
</section>

<section class="account-section" aria-labelledby="addresses-title">
	<div class="section-heading">
		<div><p class="route-label">Entregas</p><h2 id="addresses-title">Tus direcciones</h2></div>
		{#if addressMode === null}<button class="button-secondary" type="button" on:click={startAddressAdd}>Agregar dirección</button>{/if}
	</div>
	<div class="address-list">
		{#each addresses as address (address.id)}
			<article class="address-card">
				<div class="address-card-heading"><h3>{address.name}</h3>{#if addressMode === null}<button class="text-action" type="button" on:click={() => startAddressEdit(address)}>Editar dirección</button>{/if}</div>
				<p>{address.address}{#if address.address2}<br />{address.address2}{/if}</p>
				<p>{address.city}, {address.state} · {address.zipCode}</p>
			</article>
		{/each}
	</div>
	{#if addressMode !== null}
		<form class="account-form address-form" on:submit|preventDefault={saveAddress}>
			<h3>{addressMode === 'add' ? 'Agregar dirección' : 'Editar dirección'}</h3>
			<div class="form-grid">
				<div><label class="label" for="address-name">Nombre de la dirección</label><input class="field" id="address-name" placeholder="Casa, trabajo…" required bind:value={addressDraft.name} /></div>
				<div><label class="label" for="address-state">Estado o región</label><input class="field" id="address-state" autocomplete="address-level1" required bind:value={addressDraft.state} /></div>
				<div><label class="label" for="address-city">Ciudad</label><input class="field" id="address-city" autocomplete="address-level2" required bind:value={addressDraft.city} /></div>
				<div><label class="label" for="address-zip">Código postal</label><input class="field" id="address-zip" autocomplete="postal-code" required bind:value={addressDraft.zipCode} /></div>
				<div class="full-row"><label class="label" for="address-line">Dirección</label><input class="field" id="address-line" autocomplete="address-line1" required bind:value={addressDraft.address} /></div>
				<div class="full-row"><label class="label" for="address-line2">Referencia o complemento <span class="optional">(opcional)</span></label><input class="field" id="address-line2" autocomplete="address-line2" bind:value={addressDraft.address2} /></div>
			</div>
			<div class="form-actions"><button class="button" type="submit">{addressMode === 'add' ? 'Agregar dirección' : 'Guardar cambios'}</button><button class="button-secondary" type="button" on:click={() => addressMode = null}>Cancelar</button></div>
		</form>
	{/if}
</section>

<style>
	.demo-note{max-width:45rem;border-top:2px solid var(--ink);padding:1.25rem 0 0}
	.demo-note .route-label,.section-heading .route-label{margin:0 0 .65rem}
	.demo-note p:last-child{margin:0;color:var(--ink-soft)}
	.account-section{margin-top:clamp(3.5rem,7vw,6rem);border-top:1px solid var(--ink);padding-top:1.5rem}
	.account-section--profile{border-top:0;padding-top:0}
	.section-heading,.address-card-heading{display:flex;align-items:start;justify-content:space-between;gap:1rem}
	.section-heading h2{margin:0;font:600 clamp(1.9rem,3vw,2.8rem)/1.1 var(--display)}
	.section-heading button{flex-shrink:0}
	.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem 3rem;margin:2.5rem 0 0}
	.details-grid dt{color:var(--ink-soft);font-family:var(--mono);font-size:.8rem;text-transform:uppercase}
	.details-grid dd{overflow-wrap:anywhere;margin:.4rem 0 0;font-family:var(--display);font-weight:600}
	.account-form{margin-top:2.5rem}
	.account-form h3{margin:0 0 1.5rem;font:600 1.5rem/1.15 var(--display)}
	.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem 2rem}
	.full-row{grid-column:1/-1}
	.optional{color:var(--ink-soft);font-size:.875rem;font-weight:400}
	.form-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}
	.address-list{display:grid;gap:1.25rem;margin-top:2.5rem}
	.address-card{border:1px solid var(--ink);padding:1.25rem}
	.address-card h3{margin:0;font:600 1.25rem/1.2 var(--display)}
	.address-card p{margin:.75rem 0 0}
	.address-card p:last-child{color:var(--ink-soft)}
	.address-card .text-action{border:0;background:transparent;padding:.25rem;color:var(--ink);font-size:.875rem;text-decoration:underline;cursor:pointer}
	.address-form{border-top:1px solid var(--ink);padding-top:1.5rem}
	@media(max-width:42rem){.section-heading{align-items:start;flex-direction:column}.details-grid,.form-grid{grid-template-columns:1fr}.full-row{grid-column:auto}.address-card-heading{flex-wrap:wrap}}
</style>

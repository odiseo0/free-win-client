<script lang="ts">
	export let kind: 'loading' | 'empty' | 'error' = 'empty';
	export let message: string;
</script>

<div
	class:border-red-900={kind === 'error'}
	class:text-red-300={kind === 'error'}
	class="state-box"
	role={kind === 'error' ? 'alert' : 'status'}
>
	{#if kind === 'loading'}
		<span class="mb-3 inline-block size-5 animate-spin rounded-full border-2 border-stone-600 border-t-amber-400" aria-hidden="true"></span>
	{/if}
	<p>{message}</p>
</div>


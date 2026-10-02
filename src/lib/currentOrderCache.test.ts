import { afterEach, describe, expect, it, vi } from 'vitest';
import { invalidateCurrentOrderCache, readCurrentOrderCache, writeCurrentOrderCache } from './currentOrderCache';

function useStorage() {
	const values = new Map<string, string>();
	vi.stubGlobal('sessionStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	});
	return values;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('current order cache', () => {
	it('keeps a small active-order summary for nearby page changes', () => {
		useStorage();
		vi.spyOn(Date, 'now').mockReturnValue(1_000);
		writeCurrentOrderCache({ id: 8, status: 'submitted' });
		expect(readCurrentOrderCache()?.order).toEqual({ id: 8, status: 'submitted' });
		vi.spyOn(Date, 'now').mockReturnValue(31_000);
		expect(readCurrentOrderCache()).toBeNull();
	});

	it('caches the empty state and clears it after an order changes', () => {
		useStorage();
		writeCurrentOrderCache(null);
		expect(readCurrentOrderCache()?.order).toBeNull();
		invalidateCurrentOrderCache();
		expect(readCurrentOrderCache()).toBeNull();
	});

	it('rejects a stored status that is no longer active', () => {
		const values = useStorage();
		values.set('free-win:current-order:v1', JSON.stringify({ order: { id: 8, status: 'rejected' }, expiresAt: Date.now() + 10_000 }));
		expect(readCurrentOrderCache()).toBeNull();
	});
});

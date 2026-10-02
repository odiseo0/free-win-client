import { describe, expect, it } from 'vitest';
import { canOpenAdmin, mockPersonas, parseMockSession, readMockSession, safeReturnPath, writeMockSession } from './session';

function memoryStorage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
	};
}

describe('mock session', () => {
	it('stores and restores a persona', () => {
		const storage = memoryStorage();
		writeMockSession(mockPersonas.admin, storage);
		expect(readMockSession(storage)).toEqual(mockPersonas.admin);
		expect(canOpenAdmin(readMockSession(storage))).toBe(true);
	});

	it('rejects invalid stored sessions and unsafe return paths', () => {
		expect(parseMockSession('{"persona":"owner"}')).toBeNull();
		expect(safeReturnPath('//example.com')).toBe('/order-periods');
		expect(safeReturnPath('/admin/orders')).toBe('/admin/orders');
	});
});

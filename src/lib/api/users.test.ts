import { afterEach, describe, expect, it, vi } from 'vitest';
import { usersApi } from './users';

describe('usersApi', () => {
	afterEach(() => vi.unstubAllGlobals());
	it('sends only name, email, and password', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 4 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		await usersApi.create({ name: 'Ana Pérez', email: 'ana@example.com', password: 'secreto' });
		const [, init] = fetchMock.mock.calls[0];
		expect(JSON.parse(init.body)).toEqual({ name: 'Ana Pérez', email: 'ana@example.com', password: 'secreto' });
		expect(init.body).not.toContain('surname');
	});
});

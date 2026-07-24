import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, getApiErrorMessage } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
	it('serializes query parameters and JSON request bodies', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: 4 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await apiRequest('/example', {
			method: 'POST',
			query: { page: 2, ignored: undefined },
			body: { name: 'Pedido' },
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('http://127.0.0.1:8000/example?page=2');
		expect(options.body).toBe(JSON.stringify({ name: 'Pedido' }));
		expect(options.headers).toMatchObject({
			Accept: 'application/json',
			'Content-Type': 'application/json',
		});
	});

	it('throws an ApiError with the response detail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ detail: 'El recurso no existe' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				}),
			),
		);

		await expect(apiRequest('/missing')).rejects.toMatchObject({
			status: 404,
			detail: { detail: 'El recurso no existe' },
		});
	});
});

describe('getApiErrorMessage', () => {
	it('uses backend validation messages', () => {
		const error = new ApiError(422, {
			detail: [{ msg: 'La cantidad debe ser mayor que cero' }, { msg: 'Campo requerido' }],
		});
		expect(getApiErrorMessage(error)).toBe(
			'La cantidad debe ser mayor que cero Campo requerido',
		);
	});

	it('returns a connection message for unknown failures', () => {
		expect(getApiErrorMessage(new TypeError('network'))).toContain('comunicarnos');
	});
});


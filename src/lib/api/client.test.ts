import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	ApiError,
	backendRequest,
	getApiErrorMessage,
	searchRequest,
} from './client';

afterEach(() => vi.unstubAllGlobals());

describe('service API clients', () => {
	it('serializes backend query parameters and JSON request bodies', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: 4 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await backendRequest('/example', {
			method: 'POST',
			query: { page: 2, ignored: undefined },
			body: { name: 'Pedido' },
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('http://127.0.0.1:8001/example?page=2');
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

		await expect(backendRequest('/missing')).rejects.toMatchObject({
			status: 404,
			detail: { detail: 'El recurso no existe' },
			service: 'Free Win Backend',
		});
	});

	it('uses the dedicated search service URL', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify([]), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await searchRequest('/card-listings/search', {
			query: { query: 'Dark Magician', limit: 30 },
		});

		expect(String(fetchMock.mock.calls[0][0])).toBe(
			'http://127.0.0.1:8000/card-listings/search?query=Dark+Magician&limit=30',
		);
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

	it('identifies the service when no structured detail is available', () => {
		expect(getApiErrorMessage(new ApiError(500, null, 'Free Win Search'))).toBe(
			'Free Win Search respondió con un error (500).',
		);
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderRequestsApi } from './workflow';

afterEach(() => vi.unstubAllGlobals());

describe('order request API wrapper', () => {
	it('preserves the OpenAPI camelCase order-period filter', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ items: [], total: 0 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.list({ page: 2, shows: 20, orderPeriodId: 12 });

		expect(String(fetchMock.mock.calls[0][0])).toBe(
			'http://127.0.0.1:8000/order-requests/?page=2&shows=20&orderPeriodId=12',
		);
	});

	it('uses the pricing endpoint with all price components, including zero', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.updatePricing(41, 93, {
			cardUnitPrice: '0',
			shippingUnitPrice: '0',
			taxUnitPrice: '0',
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe(
			'http://127.0.0.1:8000/order-requests/41/items/93/pricing',
		);
		expect(options.method).toBe('PATCH');
		expect(JSON.parse(options.body)).toEqual({
			cardUnitPrice: '0',
			shippingUnitPrice: '0',
			taxUnitPrice: '0',
		});
	});
});

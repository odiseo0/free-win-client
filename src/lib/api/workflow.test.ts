import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderRequestsApi } from './workflow';

afterEach(() => vi.unstubAllGlobals());

describe('order request API wrapper', () => {
	it('creates an OrderRequest with the exact OpenAPI payload', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: 73 }), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.create({
			orderPeriodId: 12,
			note: 'Prueba manual',
			items: [
				{ cardListingId: 56, requestedQuantity: 2 },
				{ cardListingId: 81, requestedQuantity: 1 },
			],
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('http://127.0.0.1:8000/order-requests/');
		expect(options.method).toBe('POST');
		expect(JSON.parse(options.body)).toEqual({
			orderPeriodId: 12,
			note: 'Prueba manual',
			items: [
				{ cardListingId: 56, requestedQuantity: 2 },
				{ cardListingId: 81, requestedQuantity: 1 },
			],
		});
	});

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

	it('updates item pricing without sending order-level shipping', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.updatePricing(41, 93, {
			cardUnitPrice: '0',
			taxUnitPrice: '0',
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe(
			'http://127.0.0.1:8000/order-requests/41/items/93/pricing',
		);
		expect(options.method).toBe('PATCH');
		expect(JSON.parse(options.body)).toEqual({
			cardUnitPrice: '0',
			taxUnitPrice: '0',
		});
	});

	it('lets the backend calculate the default tax when it is omitted', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.updatePricing(41, 93, {
			cardUnitPrice: '0.79',
		});

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			cardUnitPrice: '0.79',
		});
	});

	it('updates the fixed shipping price at order level', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		await orderRequestsApi.updateOrderPricing(41, { shippingPrice: '5.00' });

		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('http://127.0.0.1:8000/order-requests/41/pricing');
		expect(options.method).toBe('PATCH');
		expect(JSON.parse(options.body)).toEqual({ shippingPrice: '5.00' });
	});
});

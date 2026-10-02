import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderDeliveryApi, shipmentsApi } from './deliveries';

afterEach(() => vi.unstubAllGlobals());

describe('delivery API', () => {
	it('sends camelCase delivery preference fields', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ orderRequestId: 8 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		await orderDeliveryApi.setPreference(8, { method: 'national_shipping', userAddressId: 3 });
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toContain('/order-requests/8/delivery-preference');
		expect(JSON.parse(init.body)).toEqual({ method: 'national_shipping', userAddressId: 3 });
	});

	it('requires a Pedido when listing shipments', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		await shipmentsApi.list(4);
		expect(String(fetchMock.mock.calls[0][0])).toContain('orderPeriodId=4');
	});
});

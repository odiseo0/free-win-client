import { describe, expect, it } from 'vitest';
import { createOrderPayload, readOrderDraft } from './newOrderDraft';

describe('new Orden browser draft', () => {
	it('restores valid rows once and ignores damaged data', () => {
		expect(readOrderDraft(JSON.stringify({
			selectedPeriodId: 12,
			items: [
				{ cardListingId: 4, requestedQuantity: 2 },
				{ cardListingId: 4, requestedQuantity: 9 },
				{ cardListingId: 5, requestedQuantity: 0 },
				{ cardListingId: 6, requestedQuantity: 1 },
			],
		}))).toEqual({ selectedPeriodId: 12, items: [
			{ cardListingId: 4, requestedQuantity: 2 },
			{ cardListingId: 6, requestedQuantity: 1 },
		] });
		expect(readOrderDraft('{broken')).toEqual({ selectedPeriodId: 0, items: [] });
	});

	it('builds one request with the chosen Pedido and all draft rows', () => {
		expect(createOrderPayload({
			selectedPeriodId: 12,
			items: [
				{ cardListingId: 4, requestedQuantity: 2 },
				{ cardListingId: 6, requestedQuantity: 1 },
			],
		})).toEqual({
			orderPeriodId: 12,
			items: [
				{ cardListingId: 4, requestedQuantity: 2 },
				{ cardListingId: 6, requestedQuantity: 1 },
			],
		});
	});
});

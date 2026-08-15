import { describe, expect, it } from 'vitest';
import type { CardListing, OrderRequest, OrderRequestItem } from './api/types';
import {
	areValidPriceComponents,
	calculateDefaultTaxUnitPrice,
	calculateItemPricingPreview,
	calculateOrderPricingPreview,
	canAcceptOrder,
	canEditParticipantOrder,
	canStartReview,
	getListingSelectionLabel,
	isItemFullyPriced,
	isListingSelectable,
	isValidAgreedQuantity,
	isValidRequestedQuantity,
	readIdFromPath,
} from './workflow';

const item = {
	id: 1,
	cardListingId: 3,
	cardName: 'Dark Magician',
	cardSet: 'LOB',
	cardCode: 'LOB-005',
	rarity: 'Ultra Rare',
	condition: 'Near Mint',
	estimatedUnitPrice: '3.50',
	requestedQuantity: 2,
	agreedQuantity: 2,
	cardUnitPrice: '0',
	taxUnitPrice: '0',
	dateAdded: '2026-01-01T00:00:00Z',
	finalUnitPrice: '0',
	agreedTotal: '0',
} as OrderRequestItem;

function order(status: OrderRequest['status'], items = [item]): OrderRequest {
	return {
		id: 1,
		orderPeriodId: 2,
		createdByUserId: 3,
		status,
		currency: 'USD',
		shippingPrice: '5.00',
		items,
		dateAdded: '2026-01-01T00:00:00Z',
		agreedTotal: status === 'accepted' ? '0' : null,
	};
}

const listing = {
	id: 12,
	isActive: true,
	stock: 3,
} as CardListing;

describe('workflow rules', () => {
	it('treats zero-valued pricing as complete', () => {
		expect(isItemFullyPriced(item)).toBe(true);
		expect(canAcceptOrder(order('in_review'))).toBe(true);
	});

	it('requires an in-review order with active, fully priced items to accept', () => {
		expect(canAcceptOrder(order('submitted'))).toBe(false);
		expect(canAcceptOrder(order('in_review', [{ ...item, taxUnitPrice: null }]))).toBe(false);
		expect(canAcceptOrder(order('in_review', [{ ...item, removedAt: '2026-01-02T00:00:00Z' }]))).toBe(false);
	});

	it('maps participant and review actions to the allowed states', () => {
		expect(canEditParticipantOrder(order('submitted'))).toBe(true);
		expect(canEditParticipantOrder(order('in_review'))).toBe(false);
		expect(canStartReview(order('submitted'))).toBe(true);
		expect(canStartReview(order('accepted'))).toBe(false);
	});

	it('validates composition and review inputs without rejecting zero prices', () => {
		expect(isValidRequestedQuantity(1)).toBe(true);
		expect(isValidRequestedQuantity(3, 3)).toBe(true);
		expect(isValidRequestedQuantity(4, 3)).toBe(false);
		expect(isValidRequestedQuantity(0)).toBe(false);
		expect(isValidAgreedQuantity(2, 2)).toBe(true);
		expect(isValidAgreedQuantity(3, 2)).toBe(false);
		expect(areValidPriceComponents('0', 0, '3.50')).toBe(true);
		expect(areValidPriceComponents('', 0, '3.50')).toBe(false);
		expect(areValidPriceComponents('-1', 0, '3.50')).toBe(false);
	});

	it('calculates the default 16% unit tax rounded to cents', () => {
		expect(calculateDefaultTaxUnitPrice('10')).toBe('1.60');
		expect(calculateDefaultTaxUnitPrice('3.50')).toBe('0.56');
		expect(calculateDefaultTaxUnitPrice('0.29')).toBe('0.05');
		expect(calculateDefaultTaxUnitPrice('')).toBe('');
		expect(calculateDefaultTaxUnitPrice('-1')).toBe('');
	});

	it('previews item pricing without applying order shipping per copy', () => {
		expect(calculateItemPricingPreview('0.79', '0.13', 3)).toEqual({
			cardUnitPrice: 0.79,
			taxUnitPrice: 0.13,
			finalUnitPrice: 0.92,
			agreedTotal: 2.76,
		});
		expect(calculateItemPricingPreview('', '0.13', 3)).toBeNull();
		expect(calculateItemPricingPreview('0.79', '0.13', -1)).toBeNull();
	});

	it('adds fixed shipping once to the visual order breakdown', () => {
		expect(calculateOrderPricingPreview([
			{ cardUnitPrice: '0.79', taxUnitPrice: '0.13', agreedQuantity: 3 },
			{ cardUnitPrice: '1.00', taxUnitPrice: '0.16', agreedQuantity: 1 },
			{
				cardUnitPrice: '100.00',
				taxUnitPrice: '16.00',
				agreedQuantity: 1,
				removedAt: '2026-08-14T20:00:00Z',
			},
		], '5.00')).toEqual({
			cardSubtotal: 3.37,
			taxTotal: 0.55,
			shippingPrice: 5,
			agreedTotal: 8.92,
		});
	});

	it('requires order-level shipping before acceptance', () => {
		expect(canAcceptOrder({ ...order('in_review'), shippingPrice: null })).toBe(false);
	});

	it('only selects persisted, active, in-stock listings once', () => {
		expect(isListingSelectable(listing)).toBe(true);
		expect(isListingSelectable(listing, [12])).toBe(false);
		expect(isListingSelectable({ ...listing, id: null })).toBe(false);
		expect(isListingSelectable({ ...listing, isActive: false })).toBe(false);
		expect(isListingSelectable({ ...listing, stock: 0 })).toBe(false);

		expect(getListingSelectionLabel(listing, [12])).toBe('Añadida');
		expect(getListingSelectionLabel({ ...listing, id: null })).toBe('Preparando');
		expect(getListingSelectionLabel({ ...listing, stock: 0 })).toBe('Sin stock');
	});
});

describe('readIdFromPath', () => {
	it('reads positive integer detail identifiers', () => {
		expect(readIdFromPath('/orders/41')).toBe(41);
		expect(readIdFromPath('/admin/orders/0')).toBeNull();
		expect(readIdFromPath('/orders/not-a-number')).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import type { CardListing, OrderRequest, OrderRequestItem } from './api/types';
import {
	areValidPriceComponents,
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
	shippingUnitPrice: '0',
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

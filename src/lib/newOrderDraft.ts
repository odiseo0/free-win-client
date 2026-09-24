import type { OrderRequestCreate } from './api/types';

export interface DraftEntry {
	cardListingId: number;
	requestedQuantity: number;
}

export interface StoredOrderDraft {
	items: DraftEntry[];
	selectedPeriodId: number;
}

export const NEW_ORDER_DRAFT_KEY = 'free-win:new-order-draft:v1';

const emptyDraft = (): StoredOrderDraft => ({ items: [], selectedPeriodId: 0 });

function positiveInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function readOrderDraft(raw: string | null): StoredOrderDraft {
	if (!raw) return emptyDraft();
	try {
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) {
			return emptyDraft();
		}
		const selectedPeriodId = 'selectedPeriodId' in value && positiveInteger(value.selectedPeriodId)
			? value.selectedPeriodId
			: 0;
		const seen = new Set<number>();
		const items: DraftEntry[] = [];
		for (const entry of value.items) {
			if (!entry || typeof entry !== 'object' || !('cardListingId' in entry) || !('requestedQuantity' in entry)) continue;
			if (!positiveInteger(entry.cardListingId) || !positiveInteger(entry.requestedQuantity)) continue;
			if (seen.has(entry.cardListingId)) continue;
			seen.add(entry.cardListingId);
			items.push({ cardListingId: entry.cardListingId, requestedQuantity: entry.requestedQuantity });
		}
		return { items, selectedPeriodId };
	} catch {
		return emptyDraft();
	}
}

export function createOrderPayload(draft: StoredOrderDraft): OrderRequestCreate {
	return {
		orderPeriodId: draft.selectedPeriodId,
		items: draft.items.map(({ cardListingId, requestedQuantity }) => ({ cardListingId, requestedQuantity })),
	};
}

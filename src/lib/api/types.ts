/** Types mirror the Free Win OpenAPI contract; UI state belongs outside this file. */
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
}

export type OrderPeriodStatus = 'draft' | 'open' | 'closed';
export type OrderRequestStatus =
	| 'submitted'
	| 'in_review'
	| 'accepted'
	| 'rejected'
	| 'cancelled';

export interface OrderPeriod {
	id: number;
	name: string;
	opensAt: string;
	closesAt: string;
	createdByUserId: number;
	dateAdded: string;
	dateUpdated: string | null;
	status: OrderPeriodStatus;
}

export interface CardListing {
	id: number | null;
	cardId: number | null;
	ygoId: number | null;
	ygoSet: string;
	name: string;
	code: string;
	price: string;
	rarity: string;
	condition: string;
	stock: number;
	dateAdded: string | null;
	dateUpdated: string | null;
}

export interface OrderRequestItem {
	id: number;
	cardListingId: number;
	cardName: string;
	cardSet: string;
	cardCode: string;
	rarity: string;
	condition: string;
	estimatedUnitPrice: string | null;
	requestedQuantity: number;
	agreedQuantity: number;
	finalUnitPrice: string | null;
	agreedTotal: string | null;
}

export interface OrderRequest {
	id: number;
	orderPeriodId: number;
	createdByUserId: number;
	status: OrderRequestStatus;
	note: string | null;
	currency: string;
	items: OrderRequestItem[];
	agreedTotal: string | null;
	dateAdded: string;
	dateUpdated: string | null;
}

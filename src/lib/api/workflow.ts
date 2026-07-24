import { apiRequest } from './client';
import type {
	CardListing,
	OrderPeriod,
	OrderPeriodCreate,
	OrderPeriodHistory,
	OrderPeriodList,
	OrderPeriodUpdate,
	OrderRequest,
	OrderRequestCreate,
	OrderRequestHistory,
	OrderRequestItemCreate,
	OrderRequestItemPricingUpdate,
	OrderRequestItemUpdate,
	OrderRequestList,
	OrderRequestStatus,
	OrderRequestUpdate,
} from './types';

export interface PageQuery {
	page?: number;
	shows?: number;
}

export const orderPeriodsApi = {
	list: (query: PageQuery = {}) =>
		apiRequest<OrderPeriodList>('/order-periods/', { query: { ...query } }),
	get: (id: number) => apiRequest<OrderPeriod>(`/order-periods/${id}`),
	history: (id: number, query: PageQuery = {}) =>
		apiRequest<OrderPeriodHistory[]>(`/order-periods/${id}/history`, { query: { ...query } }),
	create: (body: OrderPeriodCreate) =>
		apiRequest<OrderPeriod>('/order-periods/', { method: 'POST', body }),
	update: (id: number, body: OrderPeriodUpdate) =>
		apiRequest<OrderPeriod>(`/order-periods/${id}`, { method: 'PATCH', body }),
	close: (id: number) =>
		apiRequest<OrderPeriod>(`/order-periods/${id}/close`, { method: 'POST' }),
};

export const cardListingsApi = {
	list: (query: PageQuery = {}) =>
		apiRequest<{ items: CardListing[]; total: number }>('/card-listings/', { query: { ...query } }),
	search: (query: string, limit = 30) =>
		apiRequest<CardListing[]>('/card-listings/search', { query: { query, limit } }),
	get: (id: number) => apiRequest<CardListing>(`/card-listings/${id}`),
};

export interface OrderRequestListQuery extends PageQuery {
	orderPeriodId?: number;
	status?: OrderRequestStatus;
}

export const orderRequestsApi = {
	list: (query: OrderRequestListQuery = {}) =>
		apiRequest<OrderRequestList>('/order-requests/', { query: { ...query } }),
	get: (id: number) => apiRequest<OrderRequest>(`/order-requests/${id}`),
	history: (id: number, query: PageQuery = {}) =>
		apiRequest<OrderRequestHistory[]>(`/order-requests/${id}/history`, { query: { ...query } }),
	create: (body: OrderRequestCreate) =>
		apiRequest<OrderRequest>('/order-requests/', { method: 'POST', body }),
	updateNote: (id: number, body: OrderRequestUpdate) =>
		apiRequest<OrderRequest>(`/order-requests/${id}`, { method: 'PATCH', body }),
	addItem: (id: number, body: OrderRequestItemCreate) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/items`, { method: 'POST', body }),
	updateItem: (id: number, itemId: number, body: OrderRequestItemUpdate) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}`, {
			method: 'PATCH',
			body,
		}),
	removeItem: (id: number, itemId: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/remove`, {
			method: 'POST',
		}),
	restoreItem: (id: number, itemId: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/restore`, {
			method: 'POST',
		}),
	updatePricing: (
		id: number,
		itemId: number,
		body: OrderRequestItemPricingUpdate,
	) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/pricing`, {
			method: 'PATCH',
			body,
		}),
	startReview: (id: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/start-review`, { method: 'POST' }),
	accept: (id: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/accept`, { method: 'POST' }),
	reject: (id: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/reject`, { method: 'POST' }),
	cancel: (id: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/cancel`, { method: 'POST' }),
	reopen: (id: number) =>
		apiRequest<OrderRequest>(`/order-requests/${id}/reopen-for-review`, {
			method: 'POST',
		}),
};

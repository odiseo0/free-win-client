import { invalidateCurrentOrderCache } from '../currentOrderCache';
import { backendRequest, type ApiClientOptions } from './client';
import type {
	OrderPeriod,
	OrderPeriodCreate,
	OrderPeriodHistory,
	OrderPeriodList,
	OrderPeriodStatus,
	OrderPeriodUpdate,
	OrderRequest,
	OrderRequestCreate,
	OrderRequestHistory,
	OrderRequestItemCreate,
	OrderRequestItemPricingUpdate,
	OrderRequestItemUpdate,
	OrderRequestList,
	OrderRequestPricingUpdate,
	OrderRequestStatus,
	OrderRequestUpdate,
} from './types';

export interface PageQuery {
	page?: number;
	shows?: number;
}

export interface OrderPeriodListQuery extends PageQuery {
	status?: OrderPeriodStatus;
}

export const orderPeriodsApi = {
	list: (query: OrderPeriodListQuery = {}) =>
		backendRequest<OrderPeriodList>('/order-periods/', { query: { ...query } }),
	get: (id: number) => backendRequest<OrderPeriod>(`/order-periods/${id}`),
	history: (id: number, query: PageQuery = {}) =>
		backendRequest<OrderPeriodHistory[]>(`/order-periods/${id}/history`, { query: { ...query } }),
	create: (body: OrderPeriodCreate) =>
		backendRequest<OrderPeriod>('/order-periods/', { method: 'POST', body }),
	update: (id: number, body: OrderPeriodUpdate) =>
		backendRequest<OrderPeriod>(`/order-periods/${id}`, { method: 'PATCH', body }),
	close: (id: number) =>
		backendRequest<OrderPeriod>(`/order-periods/${id}/close`, { method: 'POST' }),
};

export interface OrderRequestListQuery extends PageQuery {
	orderPeriodId?: number;
	status?: OrderRequestStatus;
}

async function orderRequest<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
	const response = await backendRequest<T>(path, options);
	if (options.method && options.method !== 'GET') invalidateCurrentOrderCache();
	return response;
}

export const orderRequestsApi = {
	list: (query: OrderRequestListQuery = {}) =>
		orderRequest<OrderRequestList>('/order-requests/', { query: { ...query } }),
	get: (id: number) => orderRequest<OrderRequest>(`/order-requests/${id}`),
	history: (id: number, query: PageQuery = {}) =>
		orderRequest<OrderRequestHistory[]>(`/order-requests/${id}/history`, { query: { ...query } }),
	create: (body: OrderRequestCreate) =>
		orderRequest<OrderRequest>('/order-requests/', { method: 'POST', body }),
	updateNote: (id: number, body: OrderRequestUpdate) =>
		orderRequest<OrderRequest>(`/order-requests/${id}`, { method: 'PATCH', body }),
	updateOrderPricing: (id: number, body: OrderRequestPricingUpdate) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/pricing`, {
			method: 'PATCH',
			body,
		}),
	addItem: (id: number, body: OrderRequestItemCreate) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/items`, { method: 'POST', body }),
	updateItem: (id: number, itemId: number, body: OrderRequestItemUpdate) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}`, {
			method: 'PATCH',
			body,
		}),
	removeItem: (id: number, itemId: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/remove`, {
			method: 'POST',
		}),
	restoreItem: (id: number, itemId: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/restore`, {
			method: 'POST',
		}),
	updatePricing: (
		id: number,
		itemId: number,
		body: OrderRequestItemPricingUpdate,
	) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/items/${itemId}/pricing`, {
			method: 'PATCH',
			body,
		}),
	startReview: (id: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/start-review`, { method: 'POST' }),
	accept: (id: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/accept`, { method: 'POST' }),
	reject: (id: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/reject`, { method: 'POST' }),
	cancel: (id: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/cancel`, { method: 'POST' }),
	reopen: (id: number) =>
		orderRequest<OrderRequest>(`/order-requests/${id}/reopen-for-review`, {
			method: 'POST',
		}),
};

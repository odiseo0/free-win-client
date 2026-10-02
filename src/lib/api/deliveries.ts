import { backendRequest } from './client';
import type {
	DeliveryEventCreate,
	DeliveryPreferenceUpdate,
	DeliveryStage,
	DeliveryStageCreate,
	DeliveryStageScope,
	DeliveryStageUpdate,
	Fulfillment,
	FulfillmentCreate,
	InternationalShipment,
	InternationalShipmentCreate,
	InternationalShipmentUpdate,
	OrderRequest,
	OrderTracking,
} from './types';

export const orderDeliveryApi = {
	tracking: (orderId: number, signal?: AbortSignal) =>
		backendRequest<OrderTracking>(`/order-requests/${orderId}/tracking`, { signal }),
	setPreference: (orderId: number, body: DeliveryPreferenceUpdate) =>
		backendRequest<OrderTracking>(`/order-requests/${orderId}/delivery-preference`, { method: 'PUT', body }),
	markPaid: (orderId: number) => backendRequest<OrderRequest>(`/order-requests/${orderId}/mark-paid`, { method: 'POST' }),
	revertPayment: (orderId: number) => backendRequest<OrderRequest>(`/order-requests/${orderId}/revert-payment`, { method: 'POST' }),
	finalizePurchasing: (orderId: number) => backendRequest<OrderRequest>(`/order-requests/${orderId}/purchasing/finalize`, { method: 'POST' }),
	reopenPurchasing: (orderId: number) => backendRequest<OrderRequest>(`/order-requests/${orderId}/purchasing/reopen`, { method: 'POST' }),
	createFulfillment: (orderId: number, body: FulfillmentCreate) =>
		backendRequest<Fulfillment>(`/deliveries/order-requests/${orderId}/fulfillments`, { method: 'POST', body }),
};

export const shipmentsApi = {
	list: (orderPeriodId: number) => backendRequest<InternationalShipment[]>('/deliveries/international-shipments', { query: { orderPeriodId } }),
	get: (id: number) => backendRequest<InternationalShipment>(`/deliveries/international-shipments/${id}`),
	create: (body: InternationalShipmentCreate) => backendRequest<InternationalShipment>('/deliveries/international-shipments', { method: 'POST', body }),
	update: (id: number, body: InternationalShipmentUpdate) => backendRequest<InternationalShipment>(`/deliveries/international-shipments/${id}`, { method: 'PATCH', body }),
	addEvent: (id: number, body: DeliveryEventCreate) => backendRequest<InternationalShipment>(`/deliveries/international-shipments/${id}/events`, { method: 'POST', body }),
};

export const fulfillmentApi = {
	addEvent: (id: number, body: DeliveryEventCreate) => backendRequest<Fulfillment>(`/deliveries/fulfillments/${id}/events`, { method: 'POST', body }),
	refresh: (id: number) => backendRequest<Fulfillment>(`/deliveries/national-shipments/${id}/refresh`, { method: 'POST' }),
};

export const deliveryStagesApi = {
	list: (scope?: DeliveryStageScope) => backendRequest<DeliveryStage[]>('/delivery-stages', { query: { scope } }),
	create: (body: DeliveryStageCreate) => backendRequest<DeliveryStage>('/delivery-stages', { method: 'POST', body }),
	update: (id: number, body: DeliveryStageUpdate) => backendRequest<DeliveryStage>(`/delivery-stages/${id}`, { method: 'PATCH', body }),
};

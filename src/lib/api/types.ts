import type { components } from './generated';

type Schema = components['schemas'];

export type CardListing = Schema['CardListingResponse'];
export type OrderPeriod = Schema['OrderPeriodResponse'];
export type OrderPeriodCreate = Schema['OrderPeriodCreate'];
export type OrderPeriodUpdate = Schema['OrderPeriodUpdate'];
export type OrderPeriodHistory = Schema['OrderPeriodHistoryResponse'];
export type OrderPeriodStatus = Schema['OrderPeriodStatus'];
export type OrderRequest = Schema['OrderRequestResponse'];
export type OrderRequestCreate = Schema['OrderRequestCreate'];
export type OrderRequestUpdate = Schema['OrderRequestUpdate'];
export type OrderRequestItem = Schema['OrderRequestItemResponse'];
export type OrderRequestItemCreate = Schema['OrderRequestItemCreate'];
export type OrderRequestItemUpdate = Schema['OrderRequestItemUpdate'];
export type OrderRequestItemPricingUpdate = Schema['OrderRequestItemPricingUpdate'];
export type OrderRequestHistory = Schema['OrderRequestHistoryResponse'];
export type OrderRequestStatus = Schema['OrderRequestStatus'];
export type OrderPeriodList = Schema['OrderPeriodListResponse'];
export type OrderRequestList = Schema['OrderRequestListResponse'];

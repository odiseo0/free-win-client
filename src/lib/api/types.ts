import type { components as BackendComponents } from './backend.generated';
import type { components as SearchComponents } from './search.generated';

type BackendSchema = BackendComponents['schemas'];
type SearchSchema = SearchComponents['schemas'];

// Use the corrected backend contract shape while the local generated contract is refreshed.
export interface UserCreate { name: string; email: string; password: string; }
export type User = BackendSchema['UserResponse'];

export type CardListing = SearchSchema['CardListingResponse'];
export type CardListingList = SearchSchema['CardListingListResponse'];
export type ScrapeAccepted = SearchSchema['ScrapeAcceptedResponse'];
export type ScrapeJob = SearchSchema['ScrapeJobResponse'];
export type ScrapeJobStatus = SearchSchema['ScrapeJobStatus'];
export type CardSearchResult = CardListing[] | ScrapeAccepted;
export type OrderPeriod = BackendSchema['OrderPeriodResponse'];
export type OrderPeriodCreate = BackendSchema['OrderPeriodCreate'];
export type OrderPeriodUpdate = BackendSchema['OrderPeriodUpdate'];
export type OrderPeriodHistory = BackendSchema['OrderPeriodHistoryResponse'];
export type OrderPeriodStatus = BackendSchema['OrderPeriodStatus'];
export type OrderRequest = BackendSchema['OrderRequestResponse'];
export type OrderRequestCreate = BackendSchema['OrderRequestCreate'];
export type OrderRequestUpdate = BackendSchema['OrderRequestUpdate'];
export type OrderRequestPricingUpdate = BackendSchema['OrderRequestPricingUpdate'];
export type OrderRequestItem = BackendSchema['OrderRequestItemResponse'];
export type OrderRequestItemCreate = BackendSchema['OrderRequestItemCreate'];
export type OrderRequestItemUpdate = BackendSchema['OrderRequestItemUpdate'];
export type OrderRequestItemPricingUpdate = BackendSchema['OrderRequestItemPricingUpdate'];
export type OrderRequestHistory = BackendSchema['OrderRequestHistoryResponse'];
export type OrderRequestStatus = BackendSchema['OrderRequestStatus'];
export type OrderPeriodList = BackendSchema['OrderPeriodListResponse'];
export type OrderRequestList = BackendSchema['OrderRequestListResponse'];

import type { OrderRequestStatus } from './api/types';

export interface CurrentOrderSummary {
	id: number;
	status: OrderRequestStatus;
}

interface CacheEntry {
	expiresAt: number;
	order: CurrentOrderSummary | null;
}

const KEY = 'free-win:current-order:v1';
const LIFETIME_MS = 30_000;
const ACTIVE_STATUSES: OrderRequestStatus[] = ['submitted', 'in_review', 'accepted', 'paid'];

function getStorage(): Storage | null {
	try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; }
	catch { return null; }
}

export function readCurrentOrderCache(): CacheEntry | null {
	const storage = getStorage();
	if (!storage) return null;
	try {
		const raw = storage.getItem(KEY);
		if (!raw) return null;
		const entry: CacheEntry = JSON.parse(raw);
		if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= Date.now() ||
			(entry.order !== null && (!Number.isSafeInteger(entry.order?.id) || !ACTIVE_STATUSES.includes(entry.order.status)))) {
			invalidateCurrentOrderCache();
			return null;
		}
		return entry;
	} catch {
		invalidateCurrentOrderCache();
		return null;
	}
}

export function writeCurrentOrderCache(order: CurrentOrderSummary | null): void {
	try { getStorage()?.setItem(KEY, JSON.stringify({ order, expiresAt: Date.now() + LIFETIME_MS })); }
	catch { /* Storage can be unavailable in private browser modes. */ }
}

export function invalidateCurrentOrderCache(): void {
	try { getStorage()?.removeItem(KEY); }
	catch { /* The next read will make a normal request. */ }
}

import type {
	CardListing,
	OrderPeriodStatus,
	OrderRequest,
	OrderRequestHistory,
	OrderRequestItem,
	OrderRequestStatus,
} from './api/types';

export const DEFAULT_SHIPPING_PRICE = '5.00';
export const DEFAULT_TAX_RATE = 0.16;

export const periodStatusLabels: Record<OrderPeriodStatus, string> = {
	draft: 'Borrador',
	open: 'Abierto',
	closed: 'Cerrado',
};

export const orderStatusLabels: Record<OrderRequestStatus, string> = {
	submitted: 'Enviada',
	in_review: 'En revisión',
	accepted: 'Aceptada',
	rejected: 'Rechazada',
	cancelled: 'Cancelada',
};

export const orderEventLabels: Record<OrderRequestHistory['event'], string> = {
	created: 'Orden creada',
	updated: 'Orden actualizada',
	status_changed: 'Estado actualizado',
	item_added: 'Carta añadida',
	item_updated: 'Carta actualizada',
	item_removed: 'Carta retirada',
	item_restored: 'Carta restaurada',
};

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat('es-VE', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

export function formatMoney(value: string | number | null | undefined, currency = 'USD'): string {
	if (value === null || value === undefined) return 'Pendiente';
	return new Intl.NumberFormat('es-VE', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
	}).format(Number(value));
}

export function canEditParticipantOrder(order: OrderRequest): boolean {
	return order.status === 'submitted';
}

export function canStartReview(order: OrderRequest): boolean {
	return order.status === 'submitted' && order.items.some((item) => !item.removedAt);
}

export function isItemFullyPriced(item: OrderRequestItem): boolean {
	return (
		item.cardUnitPrice !== null &&
		item.cardUnitPrice !== undefined &&
		item.taxUnitPrice !== null &&
		item.taxUnitPrice !== undefined
	);
}

export function canAcceptOrder(order: OrderRequest): boolean {
	const activeItems = order.items.filter((item) => !item.removedAt);
	return (
		order.status === 'in_review' &&
		order.shippingPrice !== null &&
		order.shippingPrice !== undefined &&
		activeItems.length > 0 &&
		activeItems.every(isItemFullyPriced)
	);
}

export function isListingSelectable(
	listing: CardListing,
	selectedListingIds: readonly number[] = [],
): boolean {
	return (
		listing.id != null &&
		listing.isActive &&
		listing.stock > 0 &&
		!selectedListingIds.includes(listing.id)
	);
}

export function getListingSelectionLabel(
	listing: CardListing,
	selectedListingIds: readonly number[] = [],
): string {
	if (listing.id == null) return 'Preparando';
	if (!listing.isActive || listing.stock < 1) return 'Sin stock';
	if (selectedListingIds.includes(listing.id)) return 'Añadida';
	return 'Añadir';
}

export function isValidRequestedQuantity(
	quantity: number,
	availableStock?: number,
): boolean {
	return (
		Number.isInteger(quantity) &&
		quantity > 0 &&
		(availableStock === undefined || quantity <= availableStock)
	);
}

export function isValidAgreedQuantity(quantity: number, requestedQuantity: number): boolean {
	return Number.isInteger(quantity) && quantity >= 0 && quantity <= requestedQuantity;
}

export function areValidPriceComponents(
	...values: Array<string | number>
): boolean {
	return values.every((value) => {
		if (typeof value === 'string' && value.trim() === '') return false;
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed >= 0;
	});
}

export function calculateDefaultTaxUnitPrice(
	cardUnitPrice: string | number,
): string {
	if (typeof cardUnitPrice === 'string' && cardUnitPrice.trim() === '') return '';
	const parsed = Number(cardUnitPrice);
	if (!Number.isFinite(parsed) || parsed < 0) return '';
	return (parsed * DEFAULT_TAX_RATE).toFixed(2);
}

export interface ItemPricingPreview {
	cardUnitPrice: number;
	taxUnitPrice: number;
	finalUnitPrice: number;
	agreedTotal: number;
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100;
}

export function calculateItemPricingPreview(
	cardUnitPrice: string | number,
	taxUnitPrice: string | number,
	agreedQuantity: number,
): ItemPricingPreview | null {
	if (
		!Number.isInteger(agreedQuantity) ||
		agreedQuantity < 0 ||
		!areValidPriceComponents(cardUnitPrice, taxUnitPrice)
	) {
		return null;
	}

	const card = Number(cardUnitPrice);
	const tax = Number(taxUnitPrice);
	const finalUnitPrice = roundMoney(card + tax);

	return {
		cardUnitPrice: card,
		taxUnitPrice: tax,
		finalUnitPrice,
		agreedTotal: roundMoney(finalUnitPrice * agreedQuantity),
	};
}

export interface OrderPricingPreviewItem {
	cardUnitPrice: string | number;
	taxUnitPrice: string | number;
	agreedQuantity: number;
	removedAt?: string | null;
}

export interface OrderPricingPreview {
	cardSubtotal: number;
	taxTotal: number;
	shippingPrice: number;
	agreedTotal: number;
}

export function calculateOrderPricingPreview(
	items: readonly OrderPricingPreviewItem[],
	shippingPrice: string | number,
): OrderPricingPreview | null {
	if (!areValidPriceComponents(shippingPrice)) return null;

	let cardSubtotal = 0;
	let taxTotal = 0;

	for (const item of items) {
		if (item.removedAt) continue;
		const preview = calculateItemPricingPreview(
			item.cardUnitPrice,
			item.taxUnitPrice,
			item.agreedQuantity,
		);
		if (!preview) return null;
		cardSubtotal += preview.cardUnitPrice * item.agreedQuantity;
		taxTotal += preview.taxUnitPrice * item.agreedQuantity;
	}

	cardSubtotal = roundMoney(cardSubtotal);
	taxTotal = roundMoney(taxTotal);
	const shipping = Number(shippingPrice);

	return {
		cardSubtotal,
		taxTotal,
		shippingPrice: shipping,
		agreedTotal: roundMoney(cardSubtotal + taxTotal + shipping),
	};
}

export function readIdFromPath(pathname: string): number | null {
	const value = pathname.split('/').filter(Boolean).at(-1);
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

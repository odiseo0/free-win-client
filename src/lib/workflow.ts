import type {
	OrderPeriodStatus,
	OrderRequest,
	OrderRequestHistory,
	OrderRequestItem,
	OrderRequestStatus,
} from './api/types';

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
		item.shippingUnitPrice !== null &&
		item.shippingUnitPrice !== undefined &&
		item.taxUnitPrice !== null &&
		item.taxUnitPrice !== undefined
	);
}

export function canAcceptOrder(order: OrderRequest): boolean {
	const activeItems = order.items.filter((item) => !item.removedAt);
	return (
		order.status === 'in_review' &&
		activeItems.length > 0 &&
		activeItems.every(isItemFullyPriced)
	);
}

export function isValidRequestedQuantity(quantity: number): boolean {
	return Number.isInteger(quantity) && quantity > 0;
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

export function readIdFromPath(pathname: string): number | null {
	const value = pathname.split('/').filter(Boolean).at(-1);
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

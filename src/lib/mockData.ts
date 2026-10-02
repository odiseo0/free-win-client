import type { OrderTracking, User, UserAddress } from './api/types';

export const MOCK_DATA_STORAGE_KEY = 'free-win.blocked-data.v1';

export interface MockBlockedData {
	profile: User;
	addresses: UserAddress[];
	users: User[];
	rolesByUser: Record<number, number>;
}

export const defaultMockBlockedData: MockBlockedData = {
	profile: { id: 1, name: 'Ana Pérez', alias: 'Ana', email: 'ana@ejemplo.com', phoneCode: '+58', phoneNumber: '412 123 4567', idNumber: 'V-12345678', externalId: null },
	addresses: [{ id: 1, userId: 1, name: 'Casa', state: 'Distrito Capital', city: 'Caracas', address: 'Av. Principal, edificio Los Cedros, piso 2', address2: 'Frente a la plaza', zipCode: '1010', latitude: null, longitude: null }],
	users: [
		{ id: 1, name: 'Ana Pérez', alias: 'Ana', email: 'ana@ejemplo.com', phoneCode: '+58', phoneNumber: '412 123 4567', idNumber: 'V-12345678', externalId: null },
		{ id: 2, name: 'Carlos Méndez', alias: 'Carlos', email: 'carlos@ejemplo.com', phoneCode: '+58', phoneNumber: '414 555 0102', idNumber: null, externalId: null },
	],
	rolesByUser: { 1: 3, 2: 3 },
};

export function readMockBlockedData(storage: Pick<Storage, 'getItem'> = localStorage): MockBlockedData {
	const value = storage.getItem(MOCK_DATA_STORAGE_KEY);
	if (!value) return structuredClone(defaultMockBlockedData);
	try {
		const parsed = JSON.parse(value) as Partial<MockBlockedData>;
		return { ...structuredClone(defaultMockBlockedData), ...parsed, rolesByUser: parsed.rolesByUser ?? structuredClone(defaultMockBlockedData.rolesByUser) };
	} catch { return structuredClone(defaultMockBlockedData); }
}

export function writeMockBlockedData(value: MockBlockedData, storage: Pick<Storage, 'setItem'> = localStorage): void {
	storage.setItem(MOCK_DATA_STORAGE_KEY, JSON.stringify(value));
}

export function mockTracking(orderId: number): OrderTracking {
	return {
		orderRequestId: orderId,
		isPaid: true,
		paidAt: '2026-09-28T10:30:00-04:00',
		items: [],
		internationalSummary: { stageKey: 'to_venezuela', stageName: 'Hacia Venezuela', isPartial: false, purchasingFinalized: true },
		internationalShipments: [],
		preference: { method: 'pickup', userAddressId: null, dateUpdated: '2026-09-29T09:00:00-04:00' },
		fulfillment: null,
	};
}

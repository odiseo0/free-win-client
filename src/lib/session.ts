export type SessionPersona = 'user' | 'admin';

export interface MockSession {
	persona: SessionPersona;
	displayName: string;
	userId: number;
}

export type SessionState =
	| { status: 'loading' }
	| { status: 'signed-out' }
	| { status: 'signed-in'; session: MockSession }
	| { status: 'unavailable' };

export const SESSION_STORAGE_KEY = 'free-win.mock-session.v1';
export const SESSION_CHANGED_EVENT = 'free-win:session-changed';

export const mockPersonas: Record<SessionPersona, MockSession> = {
	user: { persona: 'user', displayName: 'Participante de prueba', userId: 1 },
	admin: { persona: 'admin', displayName: 'Organizador de prueba', userId: 1 },
};

export function parseMockSession(value: string | null): MockSession | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<MockSession>;
		if ((parsed.persona === 'user' || parsed.persona === 'admin') && typeof parsed.displayName === 'string' && Number.isInteger(parsed.userId)) {
			return parsed as MockSession;
		}
	} catch { /* Invalid stored state is treated as signed out. */ }
	return null;
}

export function readMockSession(storage: Pick<Storage, 'getItem'> = localStorage): MockSession | null {
	return parseMockSession(storage.getItem(SESSION_STORAGE_KEY));
}

export function writeMockSession(session: MockSession, storage: Pick<Storage, 'setItem'> = localStorage): void {
	storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
	if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

export function clearMockSession(storage: Pick<Storage, 'removeItem'> = localStorage): void {
	storage.removeItem(SESSION_STORAGE_KEY);
	if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

export function canOpenAdmin(session: MockSession | null): boolean {
	return session?.persona === 'admin';
}

export function safeReturnPath(value: string | null): string {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/order-periods';
}

import { backendApiBaseUrl, searchApiBaseUrl } from '../../config/api';

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly detail: unknown,
		public readonly service = 'Free Win',
	) {
		super(`${service} request failed with status ${status}.`);
		this.name = 'ApiError';
	}
}

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
}

function createUrl(
	baseUrl: string,
	path: string,
	query?: ApiClientOptions['query'],
): URL {
	const url = new URL(path.replace(/^\//, ''), `${baseUrl}/`);

	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	return url;
}

export function createApiRequest(baseUrl: string, service: string) {
	return async function request<T>(
		path: string,
		{ query, headers, body, ...options }: ApiClientOptions = {},
	): Promise<T> {
		const response = await fetch(createUrl(baseUrl, path, query), {
			...options,
			body: body === undefined ? undefined : JSON.stringify(body),
			headers: {
				Accept: 'application/json',
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
				...headers,
			},
		});

		if (!response.ok) {
			let detail: unknown = null;
			try {
				detail = await response.json();
			} catch {
				detail = await response.text();
			}
			throw new ApiError(response.status, detail, service);
		}

		if (response.status === 204) return undefined as T;
		return response.json() as Promise<T>;
	};
}

export const backendRequest = createApiRequest(backendApiBaseUrl, 'Free Win Backend');
export const searchRequest = createApiRequest(searchApiBaseUrl, 'Free Win Search');

export function getApiErrorMessage(error: unknown): string {
	if (!(error instanceof ApiError)) {
		return 'No pudimos comunicarnos con el servidor. Intenta nuevamente.';
	}

	if (typeof error.detail === 'object' && error.detail !== null && 'detail' in error.detail) {
		const detail = (error.detail as { detail: unknown }).detail;
		if (typeof detail === 'string') return detail;
		if (Array.isArray(detail)) {
			return detail
				.map((entry) =>
					typeof entry === 'object' && entry !== null && 'msg' in entry
						? String(entry.msg)
						: String(entry),
				)
				.join(' ');
		}
	}

	return `${error.service} respondió con un error (${error.status}).`;
}

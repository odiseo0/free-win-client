import { apiBaseUrl } from '../../config/api';

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly detail: unknown,
	) {
		super(`Free Win API request failed with status ${status}.`);
		this.name = 'ApiError';
	}
}

export interface ApiClientOptions extends RequestInit {
	query?: Record<string, string | number | boolean | undefined>;
}

function createUrl(path: string, query?: ApiClientOptions['query']): URL {
	const url = new URL(path.replace(/^\//, ''), `${apiBaseUrl}/`);

	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	return url;
}

export async function apiRequest<T>(
	path: string,
	{ query, headers, ...options }: ApiClientOptions = {},
): Promise<T> {
	const response = await fetch(createUrl(path, query), {
		...options,
		headers: { Accept: 'application/json', ...headers },
	});

	if (!response.ok) {
		let detail: unknown = null;
		try {
			detail = await response.json();
		} catch {
			detail = await response.text();
		}
		throw new ApiError(response.status, detail);
	}

	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

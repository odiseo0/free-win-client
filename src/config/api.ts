const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';
const DEFAULT_SEARCH_URL = 'http://127.0.0.1:8001';

function removeTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

export const backendApiBaseUrl = removeTrailingSlash(
	import.meta.env.PUBLIC_FREE_WIN_API_URL ?? DEFAULT_BACKEND_URL,
);

export const searchApiBaseUrl = removeTrailingSlash(
	import.meta.env.PUBLIC_FREE_WIN_SEARCH_URL ?? DEFAULT_SEARCH_URL,
);

export const backendOpenApiUrl = `${backendApiBaseUrl}/openapi.json`;
export const searchOpenApiUrl = `${searchApiBaseUrl}/openapi.json`;

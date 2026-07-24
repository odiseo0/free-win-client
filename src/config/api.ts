const DEFAULT_API_URL = 'http://127.0.0.1:8000';

function removeTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

export const apiBaseUrl = removeTrailingSlash(
	import.meta.env.PUBLIC_FREE_WIN_API_URL ?? DEFAULT_API_URL,
);

export const openApiUrl = `${apiBaseUrl}/openapi.json`;

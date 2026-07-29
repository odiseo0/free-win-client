import { searchRequest } from './client';
import type {
	CardListing,
	CardListingList,
	CardSearchResult,
	ScrapeJob,
	ScrapeJobStatus,
} from './types';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_WAIT_MS = 90_000;

export interface SearchPageQuery {
	page?: number;
	shows?: number;
}

export const cardListingsApi = {
	list: (query: SearchPageQuery = {}) =>
		searchRequest<CardListingList>('/card-listings/', { query: { ...query } }),
	search: (query: string, limit = 30, signal?: AbortSignal) =>
		searchRequest<CardSearchResult>('/card-listings/search', {
			query: { query, limit },
			signal,
		}),
	getJob: (jobId: string, signal?: AbortSignal) =>
		searchRequest<ScrapeJob>(`/card-listings/jobs/${jobId}`, { signal }),
	get: (id: number) => searchRequest<CardListing>(`/card-listings/${id}`),
};

export interface CardSearchProgress {
	status: ScrapeJobStatus;
	attempts?: number;
}

export interface CardSearchOptions {
	limit?: number;
	signal?: AbortSignal;
	maxWaitMs?: number;
	pollIntervalMs?: number;
	onProgress?: (progress: CardSearchProgress) => void;
}

export class CardSearchJobError extends Error {
	constructor(public readonly errorCode: string | null) {
		super('El proveedor externo no pudo completar la búsqueda.');
		this.name = 'CardSearchJobError';
	}
}

export class CardSearchTimeoutError extends Error {
	constructor() {
		super('La búsqueda está tardando más de lo esperado. Intenta nuevamente.');
		this.name = 'CardSearchTimeoutError';
	}
}

function isListingResult(result: CardSearchResult): result is CardListing[] {
	return Array.isArray(result);
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException('La búsqueda fue cancelada.', 'AbortError'));
			return;
		}

		const onAbort = () => {
			clearTimeout(timeout);
			reject(new DOMException('La búsqueda fue cancelada.', 'AbortError'));
		};
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, milliseconds);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

function retryDelay(job: ScrapeJob, fallback: number): number {
	if (job.status !== 'retry_wait') return fallback;
	const availableAt = Date.parse(job.availableAt);
	if (Number.isNaN(availableAt)) return fallback;
	return Math.max(fallback, availableAt - Date.now());
}

export async function searchCardListingsUntilReady(
	query: string,
	{
		limit = 30,
		signal,
		maxWaitMs = DEFAULT_MAX_WAIT_MS,
		pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
		onProgress,
	}: CardSearchOptions = {},
): Promise<CardListing[]> {
	const deadline = Date.now() + maxWaitMs;
	let result = await cardListingsApi.search(query, limit, signal);

	while (!isListingResult(result)) {
		const accepted = result;
		onProgress?.({ status: accepted.status });
		let delay = Math.max(
			0,
			(accepted.retryAfterSeconds ?? DEFAULT_POLL_INTERVAL_MS / 1_000) * 1_000,
		);

		while (accepted.status !== 'succeeded') {
			if (Date.now() + delay > deadline) throw new CardSearchTimeoutError();
			await wait(delay, signal);

			const job = await cardListingsApi.getJob(accepted.jobId, signal);
			onProgress?.({ status: job.status, attempts: job.attempts });

			if (job.status === 'failed') {
				throw new CardSearchJobError(job.errorCode ?? null);
			}
			if (job.status === 'succeeded') break;
			delay = retryDelay(job, pollIntervalMs);
		}

		if (Date.now() > deadline) throw new CardSearchTimeoutError();
		result = await cardListingsApi.search(query, limit, signal);
	}

	return result;
}

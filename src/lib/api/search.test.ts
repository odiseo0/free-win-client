import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	CardSearchJobError,
	CardSearchTimeoutError,
	cardListingsApi,
	searchCardListingsUntilReady,
} from './search';

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('card search API', () => {
	it('returns immediate persisted listings', async () => {
		const listing = {
			id: 12,
			cardId: 4,
			ygoId: 70095154,
			ygoSet: 'Starter Deck',
			name: 'Cyber Dragon',
			code: 'YS18-EN014',
			price: '0.39',
			rarity: 'Common',
			condition: 'Near Mint',
			stock: 1,
			source: 'coolstuffinc',
			currency: 'USD',
			lastSeenAt: null,
			isActive: true,
			dateAdded: null,
			dateUpdated: null,
		};
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([listing])));

		await expect(
			searchCardListingsUntilReady('Cyber Dragon', { pollIntervalMs: 0 }),
		).resolves.toEqual([listing]);
	});

	it('polls an accepted scrape job and repeats the original search', async () => {
		const jobId = '00000000-0000-0000-0000-000000000001';
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(
					{
						jobId,
						ygoId: 46986414,
						status: 'pending',
						statusUrl: `/card-listings/jobs/${jobId}`,
						retryAfterSeconds: 0,
					},
					202,
				),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					jobId,
					ygoId: 46986414,
					status: 'running',
					attempts: 1,
					availableAt: new Date().toISOString(),
					startedAt: new Date().toISOString(),
					finishedAt: null,
					errorCode: null,
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					jobId,
					ygoId: 46986414,
					status: 'succeeded',
					attempts: 1,
					availableAt: new Date().toISOString(),
					startedAt: new Date().toISOString(),
					finishedAt: new Date().toISOString(),
					errorCode: null,
				}),
			)
			.mockResolvedValueOnce(jsonResponse([]));
		vi.stubGlobal('fetch', fetchMock);
		const statuses: string[] = [];

		await expect(
			searchCardListingsUntilReady('Dark Magician', {
				pollIntervalMs: 0,
				onProgress: ({ status }) => statuses.push(status),
			}),
		).resolves.toEqual([]);

		expect(statuses).toEqual(['pending', 'running', 'succeeded']);
		expect(String(fetchMock.mock.calls[3][0])).toContain(
			'/card-listings/search?query=Dark+Magician&limit=30',
		);
	});

	it('surfaces terminal job failures', async () => {
		const jobId = '00000000-0000-0000-0000-000000000002';
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					jsonResponse({
						jobId,
						ygoId: 1,
						status: 'pending',
						statusUrl: `/card-listings/jobs/${jobId}`,
						retryAfterSeconds: 0,
					}),
				)
				.mockResolvedValueOnce(
					jsonResponse({
						jobId,
						ygoId: 1,
						status: 'failed',
						attempts: 3,
						availableAt: new Date().toISOString(),
						startedAt: null,
						finishedAt: new Date().toISOString(),
						errorCode: 'provider_unavailable',
					}),
				),
		);

		await expect(
			searchCardListingsUntilReady('Unavailable', { pollIntervalMs: 0 }),
		).rejects.toMatchObject({
			name: CardSearchJobError.name,
			errorCode: 'provider_unavailable',
		});
	});

	it('stops before polling beyond the configured deadline', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				jsonResponse({
					jobId: '00000000-0000-0000-0000-000000000003',
					ygoId: 1,
					status: 'pending',
					statusUrl: '/card-listings/jobs/00000000-0000-0000-0000-000000000003',
					retryAfterSeconds: 2,
				}),
			),
		);

		await expect(
			searchCardListingsUntilReady('Slow search', { maxWaitMs: 1 }),
		).rejects.toBeInstanceOf(CardSearchTimeoutError);
	});

	it('preserves search-service validation errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				jsonResponse({ detail: [{ msg: 'La consulta no puede estar vacía' }] }, 422),
			),
		);

		await expect(cardListingsApi.search(' ')).rejects.toMatchObject({
			status: 422,
			service: 'Free Win Search',
		});
	});

	it('cancels polling when the caller starts another search', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				jsonResponse({
					jobId: '00000000-0000-0000-0000-000000000004',
					ygoId: 1,
					status: 'pending',
					statusUrl: '/card-listings/jobs/00000000-0000-0000-0000-000000000004',
					retryAfterSeconds: 2,
				}),
			),
		);
		const controller = new AbortController();
		const request = searchCardListingsUntilReady('First search', {
			signal: controller.signal,
		});
		const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });

		controller.abort();

		await assertion;
	});

	it('preserves a missing-job response from the search service', async () => {
		const jobId = '00000000-0000-0000-0000-000000000005';
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					jsonResponse({
						jobId,
						ygoId: 1,
						status: 'pending',
						statusUrl: `/card-listings/jobs/${jobId}`,
						retryAfterSeconds: 0,
					}),
				)
				.mockResolvedValueOnce(jsonResponse({ detail: 'El trabajo no existe' }, 404)),
		);

		await expect(
			searchCardListingsUntilReady('Missing job', { pollIntervalMs: 0 }),
		).rejects.toMatchObject({
			status: 404,
			service: 'Free Win Search',
		});
	});
});

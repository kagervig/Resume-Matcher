import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSessionUsage,
  resetSessionUsage,
  submitRating,
  fetchOpenRouterModels,
} from '@/lib/api/usage';

/**
 * The usage/stats/rating client. URL + request-shape coverage with `fetch`
 * stubbed so nothing hits the network.
 */
describe('usage api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches the session snapshot from /usage/session', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ cost_usd: 0.12, calls: 3, started_at: 'x' }), { status: 200 })
    );
    const usage = await fetchSessionUsage();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/usage/session', expect.anything());
    expect(usage.cost_usd).toBe(0.12);
  });

  it('posts to /usage/session/reset', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ cost_usd: 0, calls: 0, started_at: 'x' }), { status: 200 })
    );
    await resetSessionUsage();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/usage/session/reset',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('submits a rating with the request_id and rating in the body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ request_id: 'r1', rating: 'good', updated: 1 }), {
        status: 200,
      })
    );
    await submitRating('r1', 'good');
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ request_id: 'r1', rating: 'good' });
  });

  it('unwraps the models array from /config/openrouter-models', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [{ id: 'a/b', name: 'A B', prompt_price: null, completion_price: null }],
        }),
        { status: 200 }
      )
    );
    const models = await fetchOpenRouterModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('a/b');
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(fetchSessionUsage()).rejects.toThrow(/status 500/);
  });
});

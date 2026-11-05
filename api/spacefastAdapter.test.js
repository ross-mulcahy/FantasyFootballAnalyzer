import { describe, it, expect, vi, afterEach } from 'vitest';
import { serveEspn } from './spacefastAdapter.js';
import handler from './espn-proxy.js';
afterEach(() => vi.unstubAllGlobals());
describe('Spacefast ESPN adapter', () => {
  it('preserves repeated views and private credential headers, with no caching', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 123456 }));
    vi.stubGlobal('fetch', fetch);
    const request = new Request('https://game-day.space.fast/api/espn-proxy?season=2026&leagueId=123456&view=mRoster&view=mMatchup', {
      headers: { origin: 'https://game-day.space.fast', 'x-espn-s2': 'test%2Bcookie', 'x-espn-swid': '{test}' },
    });
    const response = await serveEspn(request, handler);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ id: 123456 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('view=mRoster&view=mMatchup'), expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'espn_s2=test+cookie; SWID={test}' }) }));
  });
  it('keeps the original SSRF allowlist', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const response = await serveEspn(new Request('https://game-day.space.fast/api/espn-proxy?season=2026&leagueId=1&view=https://evil.invalid'), handler);
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects other browser origins before calling the provider', async () => {
    const provider = vi.fn();
    const response = await serveEspn(new Request('https://game-day.space.fast/api/espn-proxy', { headers: { origin: 'https://other.invalid' } }), provider);
    expect(response.status).toBe(403); expect(provider).not.toHaveBeenCalled();
  });
  it('handles preflight and invalid methods without contacting ESPN', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await serveEspn(new Request('https://game-day.space.fast/api/espn-proxy', { method: 'OPTIONS' }), handler)).status).toBe(200);
    expect((await serveEspn(new Request('https://game-day.space.fast/api/espn-proxy', { method: 'POST' }), handler)).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('runs the ESPN handler without a Node process global', async () => {
    vi.stubGlobal('process', undefined);
    const response = await serveEspn(new Request('https://game-day.space.fast/api/espn-proxy'), handler);
    expect(response.status).toBe(400);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { serveEspn, serveHighlights } from './spacefastAdapter.js';
import handler from './espn-proxy.js';
import highlightsHandler from './nfl-highlights.js';
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
describe('Spacefast NFL highlights adapter', () => {
  it('uses the Space secret without a Node process global or browser-visible key', async () => {
    const fetch = vi.fn(async url => {
      const parsed = new URL(url);
      const handle = parsed.searchParams.get('forHandle');
      if (handle) return Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: handle } } }] });
      const playlist = parsed.searchParams.get('playlistId');
      if (playlist) return Response.json({ items: [{ contentDetails: { videoId: 'AAAAAAAAAAA', videoPublishedAt: '2026-11-08T20:00:00Z' }, snippet: { title: 'Rams vs 49ers Highlights' } }] });
      return Response.json({ items: [{ id: 'AAAAAAAAAAA', status: { embeddable: true } }] });
    });
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('process', undefined);
    const response = await serveHighlights(new Request('https://fantasy-game-day.space.fast/api/nfl-highlights'), { YOUTUBE_API_KEY: 'spacefast-secret' }, highlightsHandler);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.configured).toBe(true);
    expect(body.videos).toEqual(expect.arrayContaining([{ id: 'AAAAAAAAAAA', title: 'Rams vs 49ers Highlights', publishedAt: '2026-11-08T20:00:00Z', source: 'NFL on FOX', embeddable: true }]));
    expect(JSON.stringify(body)).not.toContain('spacefast-secret');
    expect(String(fetch.mock.calls[0][0])).not.toContain('spacefast-secret');
    expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('spacefast-secret');
  });
});

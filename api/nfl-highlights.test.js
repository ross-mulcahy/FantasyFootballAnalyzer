import { afterEach, expect, it, vi } from 'vitest';

function response() {
  return { headers: {}, statusCode: 0, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}
const request = { method: 'GET', headers: { origin: 'http://127.0.0.1:5173' } };
async function handler() { vi.resetModules(); return (await import('./nfl-highlights.js')).default; }

afterEach(() => { delete process.env.YOUTUBE_API_KEY; vi.unstubAllGlobals(); });

it('offers search-only mode without exposing a server key', async () => {
  delete process.env.YOUTUBE_API_KEY;
  const res = response();
  await (await handler())(request, res);
  expect(res.body).toEqual({ configured: false, videos: [] });
  expect(res.statusCode).toBe(200);
});

it('reads official FOX, CBS and NFL uploads, marks embed candidates, and caches the catalog', async () => {
  process.env.YOUTUBE_API_KEY = 'private-test-key';
  const ids = { NFLonFOX: 'AAAAAAAAAAA', NFLonCBS: 'BBBBBBBBBBB', NFL: 'CCCCCCCCCCC' };
  const fetch = vi.fn(async url => {
    const parsed = new URL(url);
    const handle = parsed.searchParams.get('forHandle');
    const playlist = parsed.searchParams.get('playlistId');
    if (handle) return { ok: true, json: async () => ({ items: [{ contentDetails: { relatedPlaylists: { uploads: handle } } }] }) };
    if (playlist) return { ok: true, json: async () => ({ items: [{ contentDetails: { videoId: ids[playlist], videoPublishedAt: '2026-11-08T20:00:00Z' }, snippet: { title: 'Scoring play' } }] }) };
    const id = parsed.searchParams.get('id');
    return { ok: true, json: async () => ({ items: id.split(',').map(videoId => ({ id: videoId, status: { embeddable: videoId !== 'CCCCCCCCCCC' } })) }) };
  });
  vi.stubGlobal('fetch', fetch);
  const run = await handler();
  const first = response(), second = response();
  await run(request, first);
  await run(request, second);
  expect(first.body).toEqual({ configured: true, sources: ['NFL on FOX', 'NFL on CBS', 'NFL'], videos: [
    { id: 'AAAAAAAAAAA', title: 'Scoring play', publishedAt: '2026-11-08T20:00:00Z', source: 'NFL on FOX', embeddable: true },
    { id: 'BBBBBBBBBBB', title: 'Scoring play', publishedAt: '2026-11-08T20:00:00Z', source: 'NFL on CBS', embeddable: true },
    { id: 'CCCCCCCCCCC', title: 'Scoring play', publishedAt: '2026-11-08T20:00:00Z', source: 'NFL', embeddable: false },
  ] });
  expect(second.body).toEqual(first.body);
  expect(fetch).toHaveBeenCalledTimes(7);
  expect(fetch.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
    expect.stringContaining('forHandle=NFLonFOX'), expect.stringContaining('forHandle=NFLonCBS'), expect.stringContaining('forHandle=NFL'),
  ]));
  expect(String(fetch.mock.calls[0][0])).not.toContain('private-test-key');
  expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('private-test-key');
  expect(JSON.stringify(first.body)).not.toContain('private-test-key');
});

it('keeps a working broadcaster on air when another source fails', async () => {
  process.env.YOUTUBE_API_KEY = 'private-test-key';
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const handle = parsed.searchParams.get('forHandle');
    if (handle === 'NFLonFOX') return { ok: true, json: async () => ({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'fox-uploads' } } }] }) };
    if (handle) return { ok: false, status: 503 };
    if (parsed.searchParams.get('playlistId')) return { ok: true, json: async () => ({ items: [
      { contentDetails: { videoId: 'FFFFFFFFFFF', videoPublishedAt: '2026-11-08T20:00:00Z' }, snippet: { title: 'FOX touchdown' } },
    ] }) };
    return { ok: true, json: async () => ({ items: [{ id: 'FFFFFFFFFFF', status: { embeddable: true } }] }) };
  }));
  const res = response();
  await (await handler())(request, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.sources).toEqual(['NFL on FOX']);
  expect(res.body.videos).toEqual([{ id: 'FFFFFFFFFFF', title: 'FOX touchdown', publishedAt: '2026-11-08T20:00:00Z', source: 'NFL on FOX', embeddable: true }]);
});

it('includes regional availability only for a known viewer country without sharing that response', async () => {
  process.env.YOUTUBE_API_KEY = 'private-test-key';
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const handle = parsed.searchParams.get('forHandle');
    if (handle) return { ok: true, json: async () => ({ items: [{ contentDetails: { relatedPlaylists: { uploads: handle } } }] }) };
    if (parsed.searchParams.get('playlistId')) return { ok: true, json: async () => ({ items: [{ contentDetails: { videoId: 'AAAAAAAAAAA', videoPublishedAt: '2026-11-08T20:00:00Z' }, snippet: { title: 'Touchdown' } }] }) };
    return { ok: true, json: async () => ({ items: [{ id: 'AAAAAAAAAAA', status: { embeddable: true }, contentDetails: { regionRestriction: { blocked: ['IE'] } } }] }) };
  }));
  const run = await handler();
  const ireland = response(), usa = response();
  await run({ ...request, headers: { ...request.headers, 'cf-ipcountry': 'ie' } }, ireland);
  await run({ ...request, headers: { ...request.headers, 'cf-ipcountry': 'US' } }, usa);
  expect(ireland.body.viewerCountry).toBe('IE');
  expect(usa.body.viewerCountry).toBe('US');
  expect(ireland.body.videos[0].regionRestriction).toEqual({ blocked: ['IE'] });
  expect(ireland.headers['Cache-Control']).toBe('private, max-age=300');
});

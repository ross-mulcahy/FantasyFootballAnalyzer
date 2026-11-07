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

it('reads only official @NFL uploads and caches the catalog', async () => {
  process.env.YOUTUBE_API_KEY = 'private-test-key';
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'official-uploads' } } }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
      { contentDetails: { videoId: 'AAAAAAAAAAA', videoPublishedAt: '2026-11-08T20:00:00Z' }, snippet: { title: 'Rams vs 49ers Highlights' } },
      { contentDetails: { videoId: 'BBBBBBBBBBB', videoPublishedAt: '2026-11-08T20:01:00Z' }, snippet: { title: 'Restricted NFL play' } },
    ] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'AAAAAAAAAAA', status: { embeddable: true } }, { id: 'BBBBBBBBBBB', status: { embeddable: false } }] }) });
  vi.stubGlobal('fetch', fetch);
  const run = await handler();
  const first = response(), second = response();
  await run(request, first);
  await run(request, second);
  expect(first.body).toEqual({ configured: true, source: 'NFL', videos: [
    { id: 'AAAAAAAAAAA', title: 'Rams vs 49ers Highlights', publishedAt: '2026-11-08T20:00:00Z', embeddable: true },
    { id: 'BBBBBBBBBBB', title: 'Restricted NFL play', publishedAt: '2026-11-08T20:01:00Z', embeddable: false },
  ] });
  expect(second.body).toEqual(first.body);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(String(fetch.mock.calls[0][0])).toContain('forHandle=NFL');
  expect(String(fetch.mock.calls[1][0])).toContain('playlistId=official-uploads');
  expect(String(fetch.mock.calls[2][0])).toContain('part=status');
  expect(String(fetch.mock.calls[0][0])).not.toContain('private-test-key');
  expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('private-test-key');
  expect(JSON.stringify(first.body)).not.toContain('private-test-key');
});

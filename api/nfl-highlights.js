import { applyCors } from './_cors.js';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const CACHE_MS = 10 * 60_000;
let cache = null;

async function youtube(path, params, key) {
  const url = new URL(`${YOUTUBE_API}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`YouTube metadata returned ${response.status}`);
  return response.json();
}

export default async function handler(req, res, { apiKey } = {}) {
  if (applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.YOUTUBE_API_KEY : undefined);
  if (!key) return res.status(200).json({ configured: false, videos: [] });
  if (cache && Date.now() - cache.at < CACHE_MS) return res.status(200).json(cache.body);

  try {
    // Resolve @NFL through YouTube's own handle lookup, then read only that
    // channel's uploads. The server key never enters a frontend bundle.
    const channel = await youtube('channels', { part: 'contentDetails', forHandle: 'NFL' }, key);
    const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (typeof uploads !== 'string' || !uploads) throw new Error('NFL uploads playlist unavailable');
    const videos = [];
    let pageToken = '';
    for (let page = 0; page < 3; page++) {
      const result = await youtube('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) }, key);
      for (const item of result.items ?? []) {
        const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
        if (/^[a-zA-Z0-9_-]{11}$/.test(id) && typeof title === 'string' && Number.isFinite(Date.parse(publishedAt))) {
          videos.push({ id, title, publishedAt });
        }
      }
      pageToken = result.nextPageToken ?? '';
      if (!pageToken) break;
    }
    const body = { configured: true, source: 'NFL', videos };
    cache = { at: Date.now(), body };
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json(body);
  } catch (error) {
    console.error('NFL highlights metadata unavailable:', error instanceof Error ? error.message : 'unknown error');
    return res.status(502).json({ error: 'Official NFL video metadata unavailable' });
  }
}

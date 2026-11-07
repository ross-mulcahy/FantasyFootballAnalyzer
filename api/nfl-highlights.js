import { applyCors } from './_cors.js';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const CACHE_MS = 10 * 60_000;
const SOURCES = [
  { handle: 'NFLonFOX', name: 'NFL on FOX' },
  { handle: 'NFLonCBS', name: 'NFL on CBS' },
  { handle: 'NFL', name: 'NFL' },
];
let cache = null;
const viewerCountry = req => {
  const value = req.headers?.['cf-ipcountry'] ?? req.headers?.['x-vercel-ip-country'];
  return typeof value === 'string' && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null;
};
const durationSeconds = value => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value ?? '');
  return match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : null;
};
const thumbnailUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'i.ytimg.com' ? url.href : null; }
  catch { return null; }
};
function sendCatalog(req, res, body) {
  const country = viewerCountry(req);
  res.setHeader('Cache-Control', country ? 'private, max-age=300' : 'public, max-age=300, s-maxage=600');
  return res.status(200).json(country ? { ...body, viewerCountry: country } : body);
}

async function youtube(path, params, key) {
  const url = new URL(`${YOUTUBE_API}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`YouTube metadata returned ${response.status}`);
  return response.json();
}

async function sourceUploads(source, key) {
  const channel = await youtube('channels', { part: 'contentDetails', forHandle: source.handle }, key);
  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (typeof uploads !== 'string' || !uploads) throw new Error(`${source.name} uploads unavailable`);
  const videos = [];
  let pageToken = '';
  for (let page = 0; page < 2; page++) {
    const result = await youtube('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) }, key);
    for (const item of result.items ?? []) {
      const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
      if (/^[a-zA-Z0-9_-]{11}$/.test(id) && typeof title === 'string' && Number.isFinite(Date.parse(publishedAt))) {
        const thumbnail = thumbnailUrl(item.snippet?.thumbnails?.medium?.url);
        videos.push({ id, title, publishedAt, source: source.name, ...(thumbnail ? { thumbnailUrl: thumbnail } : {}) });
      }
    }
    pageToken = result.nextPageToken ?? '';
    if (!pageToken) break;
  }
  return videos;
}

export default async function handler(req, res, { apiKey } = {}) {
  if (applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.YOUTUBE_API_KEY : undefined);
  if (!key) return res.status(200).json({ configured: false, videos: [] });
  if (cache && Date.now() - cache.at < CACHE_MS) return sendCatalog(req, res, cache.body);

  try {
    // Broadcasters have supplied playable scoring clips in embed tests. Keep
    // @NFL for games they do not cover and for full-game recaps. A channel
    // failure must not take the other sources off air.
    const results = await Promise.allSettled(SOURCES.map(source => sourceUploads(source, key)));
    const availableSources = SOURCES.filter((source, index) => results[index].status === 'fulfilled').map(source => source.name);
    const videos = results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      console.error(`${SOURCES[index].name} highlights unavailable:`, result.reason instanceof Error ? result.reason.message : 'unknown error');
      return [];
    });
    if (!availableSources.length) throw new Error('No official video sources available');
    // Upload playlist entries do not include playback permissions. Check them
    // in batches before offering an inline player in Watch Mode.
    const batches = [];
    for (let start = 0; start < videos.length; start += 50) batches.push(videos.slice(start, start + 50));
    const statusResults = await Promise.allSettled(batches.map(batch => youtube('videos', { part: 'status,contentDetails', id: batch.map(video => video.id).join(',') }, key)));
    for (const [index, result] of statusResults.entries()) {
      if (result.status === 'rejected') console.error('Video embed status unavailable:', result.reason instanceof Error ? result.reason.message : 'unknown error');
      const byId = new Map(result.status === 'fulfilled' ? (result.value.items ?? []).map(item => [item.id, item]) : []);
      for (const video of batches[index]) {
        const item = byId.get(video.id);
        video.embeddable = item?.status?.embeddable === true;
        const duration = durationSeconds(item?.contentDetails?.duration);
        if (duration !== null) video.durationSeconds = duration;
        const restriction = item?.contentDetails?.regionRestriction;
        if (restriction && (Array.isArray(restriction.allowed) || Array.isArray(restriction.blocked))) {
          video.regionRestriction = {
            ...(Array.isArray(restriction.allowed) ? { allowed: restriction.allowed.filter(code => /^[A-Z]{2}$/.test(code)) } : {}),
            ...(Array.isArray(restriction.blocked) ? { blocked: restriction.blocked.filter(code => /^[A-Z]{2}$/.test(code)) } : {}),
          };
        }
      }
    }
    const body = { configured: true, sources: availableSources, videos };
    cache = { at: Date.now(), body };
    return sendCatalog(req, res, body);
  } catch (error) {
    console.error('NFL highlights metadata unavailable:', error instanceof Error ? error.message : 'unknown error');
    return res.status(502).json({ error: 'Official NFL video metadata unavailable' });
  }
}

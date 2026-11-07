import type { MajorEvent, NFLGameStatus } from './nflTimeline';
import { nflTeamInfo } from '@/data/nflTeams';

export interface NFLVideo { id: string; title: string; publishedAt: string }
export interface HighlightCatalog { status: 'ready' | 'unconfigured' | 'unavailable'; videos: NFLVideo[] }
const URL = import.meta.env.VITE_NFL_HIGHLIGHTS_URL || (import.meta.env.DEV ? '/api/nfl-highlights' : 'https://fantasy-football-analyzer-mu.vercel.app/api/nfl-highlights');
const NFL_CHANNEL = 'https://www.youtube.com/@NFL';

export async function fetchNFLHighlights(): Promise<HighlightCatalog> {
  try {
    const response = await fetch(URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { status: 'unavailable', videos: [] };
    const body = await response.json();
    if (body?.configured !== true) return { status: 'unconfigured', videos: [] };
    if (!Array.isArray(body.videos)) return { status: 'unavailable', videos: [] };
    const videos = body.videos.filter((video: NFLVideo) => video && /^[a-zA-Z0-9_-]{11}$/.test(video.id) &&
      typeof video.title === 'string' && Number.isFinite(Date.parse(video.publishedAt))).slice(0, 150);
    return { status: 'ready', videos };
  } catch { return { status: 'unavailable', videos: [] }; }
}

const clean = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const hasWord = (title: string, word: string) => ` ${title} `.includes(` ${clean(word)} `);
const teams = (game: string) => game.split(/\s+(?:@|vs\.?|v)\s+/i).map(code => {
  const name = nflTeamInfo(code.trim())?.name.split(' ') ?? [];
  return name[name.length - 1] ?? '';
}).filter(Boolean);
const nearGame = (publishedAt: string, kickoff: string) => {
  const published = Date.parse(publishedAt), start = Date.parse(kickoff);
  return Number.isFinite(published) && Number.isFinite(start) && published >= start - 4 * 3600_000 && published <= start + 4 * 86400_000;
};
const latest = (videos: NFLVideo[]) => [...videos].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0] ?? null;

/** Conservative title/date match. A link is labelled likely until the viewer checks the clip. */
export function matchPlayHighlight(event: MajorEvent, videos: NFLVideo[]): NFLVideo | null {
  const person = event.description.match(/^([A-Z][a-z]+(?:['-][A-Za-z]+)?)\s+([A-Z][A-Za-z'-]+)/);
  if (!person || !event.kickoff) return null;
  const player = `${person[1]} ${person[2]}`;
  const yards = event.description.match(/\b(\d+)\s*(?:Yd|Yard)/i)?.[1];
  const kind = clean(event.kind);
  const relevantKind = (title: string) => /touchdown/.test(kind) ? /\b(touchdown|td)\b/.test(title) : /field goal/.test(kind) ? /field goal|\bfg\b/.test(title) : /turnover|interception/.test(kind) ? /interception|intercept|pick|fumble/.test(title) : kind.split(' ').some(word => hasWord(title, word));
  return latest(videos.filter(video => {
    const title = clean(video.title);
    return nearGame(video.publishedAt, event.kickoff) && !/full game|game highlights|game recap/.test(title) &&
      title.includes(clean(player)) && (yards ? hasWord(title, yards) : teams(event.game).some(team => hasWord(title, team))) && relevantKind(title);
  }));
}

export function matchGameHighlights(game: Pick<NFLGameStatus, 'name' | 'kickoff'>, videos: NFLVideo[]): NFLVideo | null {
  const names = teams(game.name);
  if (names.length !== 2) return null;
  return latest(videos.filter(video => {
    const title = clean(video.title);
    return nearGame(video.publishedAt, game.kickoff) && names.every(team => hasWord(title, team)) && /\b(highlights|recap)\b/.test(title);
  }));
}

const channelSearch = (query: string) => `${NFL_CHANNEL}/search?query=${encodeURIComponent(query)}`;
export function playHighlightSearch(event: MajorEvent): string {
  return channelSearch(`${event.game} ${event.description.slice(0, 90)} ${event.kind}`);
}
export function gameHighlightSearch(game: Pick<NFLGameStatus, 'name' | 'kickoff'>): string {
  const names = teams(game.name);
  const year = Number.isFinite(Date.parse(game.kickoff)) ? new Date(game.kickoff).getFullYear() : '';
  return channelSearch(`${names.join(' vs ')} ${year} game highlights`);
}
export const nflChannelVideosUrl = `${NFL_CHANNEL}/videos`;
export const nflVideoUrl = (video: NFLVideo) => `https://www.youtube.com/watch?v=${video.id}`;
export const nflEmbedUrl = (video: NFLVideo) => `https://www.youtube-nocookie.com/embed/${video.id}`;

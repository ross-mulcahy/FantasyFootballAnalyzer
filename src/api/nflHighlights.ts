import type { MajorEvent, NFLGameStatus } from './nflTimeline';
import { nflTeamInfo } from '@/data/nflTeams';

export interface NFLVideo { id: string; title: string; publishedAt: string; embeddable?: boolean }
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
      typeof video.title === 'string' && Number.isFinite(Date.parse(video.publishedAt))).slice(0, 150)
      .map((video: NFLVideo) => ({ id: video.id, title: video.title, publishedAt: video.publishedAt, embeddable: video.embeddable === true }));
    return { status: 'ready', videos };
  } catch { return { status: 'unavailable', videos: [] }; }
}

const clean = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const hasWord = (title: string, word: string) => ` ${title} `.includes(` ${clean(word)} `);
const foldedName = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’.-]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const hasName = (title: string, name: string) => [clean, foldedName].some(normalize => ` ${normalize(title)} `.includes(` ${normalize(name)} `));
const teams = (game: string) => game.split(/\s+(?:@|vs\.?|v)\s+/i).map(code => {
  const name = nflTeamInfo(code.trim())?.name.split(' ') ?? [];
  return name[name.length - 1] ?? '';
}).filter(Boolean);
const nearGame = (publishedAt: string, kickoff: string) => {
  const published = Date.parse(publishedAt), start = Date.parse(kickoff);
  return Number.isFinite(published) && Number.isFinite(start) && published >= start - 4 * 3600_000 && published <= start + 4 * 86400_000;
};
const latest = (videos: NFLVideo[]) => [...videos].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0] ?? null;

type PlayType = 'touchdown' | 'interception' | 'fumble' | 'field-goal';
const nameToken = /^[A-Z][A-Za-z.'’-]*$/;
function firstName(text: string): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const name: string[] = [];
  for (const word of words) {
    if (!nameToken.test(word) || /^(?:Pass|Rush|Rushing|Run|Reception|Rec|Yd|Yds|Yard|Touchdown|Td|Intercepted|Fumble|Field|Goal|Kick|For|From|To|By)$/i.test(word)) break;
    name.push(word);
    if (name.length === 3) break;
  }
  return name.length >= 2 ? name.join(' ') : null;
}
function playType(event: MajorEvent): PlayType | null {
  const text = clean(`${event.kind} ${event.description}`);
  if (/\b(intercept|interception|intercepted|pick six|picked off)\b/.test(text)) return 'interception';
  if (/\bfumbl/.test(text)) return 'fumble';
  if (/\b(field goal|fg)\b/.test(text)) return 'field-goal';
  if (/\b(touchdown|td)\b/.test(text)) return 'touchdown';
  if (/^scoring play\b/i.test(event.kind) && /\b(rush|rushing|pass|passing|reception|receiving)\b/.test(text) && !/\b(extra point|two point|2 point)\b/.test(text)) return 'touchdown';
  return null;
}
function playActor(event: MajorEvent, type: PlayType): string | null {
  const description = event.description;
  if (type === 'interception') return firstName(/\b(?:intercepted|picked off)\s+by\s+(.+)/i.exec(description)?.[1] ?? '') ?? firstName(description);
  if (type === 'fumble') return firstName(/\b(?:recovered|recovery)\s+by\s+(.+)/i.exec(description)?.[1] ?? '') ?? firstName(description);
  if (type === 'touchdown' && /\bpass\b/i.test(event.kind + description)) {
    const receiver = /\b(?:pass|throw)\s+to\s+(.+)/i.exec(description)?.[1];
    if (receiver) return firstName(receiver);
  }
  return firstName(description);
}
const yardage = (value: string) => [...value.matchAll(/\b(\d{1,3})\s*[- ]?\s*(?:yard|yd)s?\b/gi)].map(match => Number(match[1]));
const genericVideo = (title: string) => /\b(?:highlights?|game recap|full game|game previews?|preview|every touchdown|all touchdowns|best (?:plays|catches|throws|runs)|top \d+|mic d up|power rankings|podcast|throwback|compilation)\b/.test(title);
const typeMatches = (type: PlayType, title: string) => type === 'touchdown' ? /\b(touchdown|td)\b/.test(title)
  : type === 'interception' ? /\b(int|interception|intercepts|intercepted|pick six|picked off)\b/.test(title)
  : type === 'fumble' ? /\b(fumble|fumbles|fumbled|strip|recovery|recovers|recovered)\b/.test(title)
  : /\b(field goal|fg)\b/.test(title);
function contradictsPlay(event: MajorEvent, title: string): boolean {
  const eventText = clean(`${event.kind} ${event.description}`);
  const eventRush = /\b(?:rush|rushing|run)\b/.test(eventText), eventPass = /\b(?:pass|passing|throw|receiv\w*)\b/.test(eventText);
  const titleRush = /\b(?:rush|rushing|run|runs)\b/.test(title), titlePass = /\b(?:pass|passing|throw|throws|catch|catches|receiv\w*)\b/.test(title);
  return eventRush && !eventPass && titlePass && !titleRush || eventPass && !eventRush && titleRush && !titlePass;
}
function playUploadWindow(event: MajorEvent, publishedAt: string): boolean {
  const start = Date.parse(event.kickoff), published = Date.parse(publishedAt), occurred = Date.parse(event.occurredAt ?? '');
  return Number.isFinite(start) && Number.isFinite(published) && published >= (Number.isFinite(occurred) ? occurred - 5 * 60000 : start - 2 * 3600_000) && published <= start + 36 * 3600_000;
}

/** A conservative single-play title/date match; the viewer must still verify the clip. */
export function matchPlayHighlight(event: MajorEvent, videos: NFLVideo[]): NFLVideo | null {
  const type = playType(event);
  if (!type) return null;
  const actor = playActor(event, type);
  if (!actor) return null;
  const eventYards = yardage(event.description)[0];
  const gameTeams = teams(event.game).map(clean);
  const gameYear = new Date(event.kickoff).getUTCFullYear();
  const candidates = videos.flatMap(video => {
    const title = clean(video.title);
    if (!playUploadWindow(event, video.publishedAt) || genericVideo(title) || !hasName(video.title, actor) || !typeMatches(type, title) || contradictsPlay(event, title)) return [];
    const years = [...title.matchAll(/\b20\d{2}\b/g)].map(match => Number(match[0]));
    if (years.length && years.some(year => year !== gameYear)) return [];
    const titleYards = yardage(video.title);
    if (eventYards !== undefined && titleYards.length && !titleYards.includes(eventYards)) return [];
    const teamHits = gameTeams.filter(team => hasWord(title, team)).length;
    const score = (eventYards !== undefined && titleYards.includes(eventYards) ? 4 : 0) + teamHits +
      (/(?:rush|rushing|pass|passing|int|interception|field goal|fg|fumble)/.test(title) ? 1 : 0);
    return [{ video, score }];
  }).sort((a, b) => b.score - a.score || Date.parse(b.video.publishedAt) - Date.parse(a.video.publishedAt));
  // A player can score twice in one game. Without a clear winner, do not auto-cue a guess.
  if (candidates.length > 1 && candidates[0].score - candidates[1].score < 2) return null;
  return candidates[0]?.video ?? null;
}

export function matchGameHighlights(game: Pick<NFLGameStatus, 'name' | 'kickoff'>, videos: NFLVideo[]): NFLVideo | null {
  const names = teams(game.name);
  if (names.length !== 2) return null;
  const gameYear = new Date(game.kickoff).getUTCFullYear();
  return latest(videos.filter(video => {
    const title = clean(video.title);
    const years = [...title.matchAll(/\b20\d{2}\b/g)].map(match => Number(match[0]));
    return nearGame(video.publishedAt, game.kickoff) && names.every(team => hasWord(title, team)) && /\b(highlights|recap)\b/.test(title) &&
      (!years.length || years.every(year => year === gameYear));
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

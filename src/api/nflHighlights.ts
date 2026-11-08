import type { MajorEvent, NFLGameStatus } from './nflTimeline';
import { nflTeamInfo } from '@/data/nflTeams';

export type NFLVideoSource = 'NFL on FOX' | 'NFL on CBS' | 'NFL';
export interface NFLVideo { id: string; title: string; publishedAt: string; embeddable?: boolean; source?: NFLVideoSource; regionRestriction?: { allowed?: string[]; blocked?: string[] }; durationSeconds?: number; thumbnailUrl?: string }
export interface HighlightCatalog { status: 'ready' | 'unconfigured' | 'unavailable'; videos: NFLVideo[]; viewerCountry?: string }
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
      typeof video.title === 'string' && Number.isFinite(Date.parse(video.publishedAt)) &&
      (video.source === undefined || video.source === 'NFL on FOX' || video.source === 'NFL on CBS' || video.source === 'NFL')).slice(0, 300)
      .map((video: NFLVideo) => ({ id: video.id, title: video.title, publishedAt: video.publishedAt, embeddable: video.embeddable === true, source: video.source ?? 'NFL',
        ...(Number.isFinite(video.durationSeconds) && video.durationSeconds! >= 0 ? { durationSeconds: video.durationSeconds } : {}),
        ...(typeof video.thumbnailUrl === 'string' && /^https:\/\/i\.ytimg\.com\//.test(video.thumbnailUrl) ? { thumbnailUrl: video.thumbnailUrl } : {}),
        regionRestriction: video.regionRestriction && {
          ...(Array.isArray(video.regionRestriction.allowed) ? { allowed: video.regionRestriction.allowed.filter(code => /^[A-Z]{2}$/.test(code)) } : {}),
          ...(Array.isArray(video.regionRestriction.blocked) ? { blocked: video.regionRestriction.blocked.filter(code => /^[A-Z]{2}$/.test(code)) } : {}),
        },
      }));
    const viewerCountry = typeof body.viewerCountry === 'string' && /^[A-Z]{2}$/.test(body.viewerCountry) ? body.viewerCountry : undefined;
    return { status: 'ready', videos, ...(viewerCountry ? { viewerCountry } : {}) };
  } catch { return { status: 'unavailable', videos: [] }; }
}

export function canPlayInRegion(video: NFLVideo, country?: string): boolean {
  const restriction = video.regionRestriction;
  if (!restriction) return true;
  if (restriction.allowed && (restriction.allowed.length === 0 || country && !restriction.allowed.includes(country))) return false;
  if (country && restriction.blocked?.includes(country)) return false;
  return true;
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
const sourcePriority = (video: NFLVideo) => video.source === 'NFL on FOX' ? 0 : video.source === 'NFL on CBS' ? 1 : 2;
const sourceOrder = (a: NFLVideo, b: NFLVideo) => sourcePriority(a) - sourcePriority(b) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

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
const genericVideo = (title: string) => /\b(?:game highlights?|game recap|full game|game previews?|preview|every touchdown|all touchdowns|best (?:plays|catches|throws|runs)|top \d+|mic d up|power rankings|podcast|throwback|compilation)\b/.test(title);
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

export interface HighlightMatch { video: NFLVideo; confidence: 'strong' | 'possible'; reasons: string[]; score: number }
/** Title/date matches with explicit evidence. Only strong, unambiguous short clips auto-cue. */
export function matchPlayHighlightOptions(event: MajorEvent, videos: NFLVideo[], sourceSuccess: Partial<Record<NFLVideoSource, number>> = {}): HighlightMatch[] {
  const type = playType(event);
  if (!type) return [];
  const actor = playActor(event, type);
  if (!actor) return [];
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
    const yardHit = eventYards !== undefined && titleYards.includes(eventYards);
    const actionHit = /(?:rush|rushing|pass|passing|int|interception|field goal|fg|fumble)/.test(title);
    const shortClip = video.durationSeconds === undefined || video.durationSeconds <= 120;
    const reasons = ['PLAYER + PLAY TYPE', 'GAME-DAY UPLOAD'];
    if (yardHit) reasons.push('YARDAGE MATCH');
    if (teamHits) reasons.push(`${teamHits} TEAM ${teamHits === 1 ? 'MATCH' : 'MATCHES'}`);
    if (video.durationSeconds !== undefined) reasons.push(video.durationSeconds <= 120 ? 'SHORT CLIP' : 'LONG VIDEO');
    const score = (yardHit ? 5 : 0) + teamHits * 2 + (actionHit ? 1 : 0);
    const confidence = shortClip && (yardHit || teamHits >= 2 || teamHits >= 1 && actionHit) ? 'strong' : 'possible';
    return [{ video, score, confidence, reasons } satisfies HighlightMatch];
  });
  const ordered: HighlightMatch[] = [];
  for (const source of [0, 1, 2]) {
    const group = candidates.filter(candidate => sourcePriority(candidate.video) === source)
      .sort((a, b) => b.score - a.score || Date.parse(b.video.publishedAt) - Date.parse(a.video.publishedAt));
    // A player can make two similar plays; do not present a disputed same-source clip.
    if (group.length > 1 && group[0].score - group[1].score < 2) continue;
    if (group[0]) ordered.push(group[0]);
  }
  return ordered.sort((a, b) => (a.confidence === 'strong' ? 1 : 0) === (b.confidence === 'strong' ? 1 : 0)
    ? Number(b.video.embeddable === true) - Number(a.video.embeddable === true) || b.score - a.score || Math.min(2, sourceSuccess[b.video.source ?? 'NFL'] ?? 0) - Math.min(2, sourceSuccess[a.video.source ?? 'NFL'] ?? 0) || sourcePriority(a.video) - sourcePriority(b.video)
    : a.confidence === 'strong' ? -1 : 1);
}
export const matchPlayHighlightCandidates = (event: MajorEvent, videos: NFLVideo[], sourceSuccess?: Partial<Record<NFLVideoSource, number>>) => matchPlayHighlightOptions(event, videos, sourceSuccess).filter(match => match.confidence === 'strong').map(match => match.video);
export const matchPlayHighlight = (event: MajorEvent, videos: NFLVideo[]) => matchPlayHighlightOptions(event, videos)[0]?.video ?? null;

export function matchGameHighlightsCandidates(game: Pick<NFLGameStatus, 'name' | 'kickoff'>, videos: NFLVideo[]): NFLVideo[] {
  const names = teams(game.name);
  if (names.length !== 2) return [];
  const gameYear = new Date(game.kickoff).getUTCFullYear();
  return videos.filter(video => {
    const title = clean(video.title);
    const years = [...title.matchAll(/\b20\d{2}\b/g)].map(match => Number(match[0]));
    return nearGame(video.publishedAt, game.kickoff) && names.every(team => hasWord(title, team)) && /\b(highlights|recap)\b/.test(title) &&
      (!years.length || years.every(year => year === gameYear));
  }).sort(sourceOrder);
}
export const matchGameHighlights = (game: Pick<NFLGameStatus, 'name' | 'kickoff'>, videos: NFLVideo[]) => matchGameHighlightsCandidates(game, videos)[0] ?? null;

const channelUrl = (source?: NFLVideoSource) => source === 'NFL on FOX' ? 'https://www.youtube.com/@NFLonFOX'
  : source === 'NFL on CBS' ? 'https://www.youtube.com/@NFLonCBS' : NFL_CHANNEL;
const channelSearch = (query: string, source?: NFLVideoSource) => `${channelUrl(source)}/search?query=${encodeURIComponent(query)}`;
export function playHighlightSearch(event: MajorEvent, source?: NFLVideoSource): string {
  const type = playType(event);
  const actor = type ? playActor(event, type) : firstName(event.description);
  const distance = yardage(event.description)[0];
  const play = type === 'field-goal' ? 'field goal' : type === 'interception' ? 'interception'
    : type === 'fumble' ? 'fumble' : 'touchdown';
  // Channel search is broad and can return no results when ESPN's whole play
  // description (including a PAT kicker) is passed as one query.
  const query = actor ? `${actor} ${distance === undefined ? play : distance}`
    : `${teams(event.game).join(' ')} ${play}`;
  return channelSearch(query.trim(), source);
}
export function gameHighlightSearch(game: Pick<NFLGameStatus, 'name' | 'kickoff'>): string {
  const names = teams(game.name);
  const year = Number.isFinite(Date.parse(game.kickoff)) ? new Date(game.kickoff).getFullYear() : '';
  return channelSearch(`${names.join(' vs ')} ${year} game highlights`);
}
export const nflChannelVideosUrl = `${NFL_CHANNEL}/videos`;
export const nflVideoUrl = (video: NFLVideo) => `https://www.youtube.com/watch?v=${video.id}`;
export const nflEmbedUrl = (video: NFLVideo) => `https://www.youtube-nocookie.com/embed/${video.id}`;

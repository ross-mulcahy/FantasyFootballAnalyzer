import { canonicalTeam } from '@/utils/playerNames';

export interface MajorEvent {
  id: string;
  gameId: string;
  game: string;
  kickoff: string;
  occurredAt: string | null;
  quarter: number;
  clock: string;
  kind: string;
  description: string;
}
export interface NFLGameStatus {
  id: string;
  name: string;
  kickoff: string;
  teams: string[];
  state: 'pre' | 'in' | 'post' | 'unknown';
  detail: string;
  quarter: number;
  clock: string;
}
export interface NFLPlayerLine {
  name: string; nflTeam: string; gameId: string; updatedAt: number;
  stats: { label: string; value: string }[];
}
export interface NFLTimeline {
  fetchedAt: number;
  events: MajorEvent[];
  warnings: string[];
  games?: NFLGameStatus[];
  failedGameIds?: string[];
  playerStats?: Record<string, NFLPlayerLine>;
}

type Node = Record<string, unknown>;
const obj = (v: unknown): Node => v && typeof v === 'object' ? v as Node : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : v == null ? [] : [v];
const str = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
function at(v: unknown, ...keys: string[]): unknown { return keys.reduce<unknown>((value, key) => obj(value)[key], v); }
const API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

async function read(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`NFL event feed: ${response.status}`);
  return response.json();
}

export function parseMajorEvents(data: unknown, game: { id: string; name: string; date: string }): MajorEvent[] {
  const plays = new Map<string, Node>();
  const drives = [...list(at(data, 'drives', 'previous')), ...list(at(data, 'drives', 'current'))];
  for (const drive of drives) for (const raw of list(obj(drive).plays)) {
    const play = obj(raw);
    if (play.scoringPlay === true || play.isTurnover === true) plays.set(str(play.id), play);
  }
  for (const raw of list(at(data, 'scoringPlays'))) {
    const play = obj(raw), id = str(play.id);
    plays.set(id, { ...plays.get(id), ...play, scoringPlay: true });
  }
  return [...plays.entries()].flatMap(([id, play]) => {
    const description = str(play.text).trim();
    if (!id || !description) return [];
    const timestamp = str(play.wallclock);
    return [{ id: `${game.id}:${id}`, gameId: game.id, game: game.name, kickoff: game.date,
      occurredAt: timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null,
      quarter: Number(at(play, 'period', 'number')) || 0, clock: str(at(play, 'clock', 'displayValue')),
      kind: play.isTurnover === true ? 'Turnover' : str(at(play, 'type', 'text')) || 'Scoring play', description }];
  });
}

export function parseNFLPlayerStats(data: unknown, gameId: string, updatedAt: number): Record<string, NFLPlayerLine> {
  const players: Record<string, NFLPlayerLine> = {};
  const categories = new Set(['passing', 'rushing', 'receiving', 'kicking', 'defensive', 'fumbles', 'interceptions']);
  for (const block of list(at(data, 'boxscore', 'players'))) {
    const nflTeam = canonicalTeam(str(at(block, 'team', 'abbreviation')));
    for (const rawCategory of list(obj(block).statistics)) {
      const category = obj(rawCategory), name = str(category.name);
      if (!categories.has(name)) continue;
      const labels = list(category.labels).map(str);
      for (const rawAthlete of list(category.athletes)) {
        const row = obj(rawAthlete), id = str(at(row, 'athlete', 'id'));
        if (!/^\d+$/.test(id)) continue;
        const player = players[id] ?? { name: str(at(row, 'athlete', 'displayName')), nflTeam, gameId, updatedAt, stats: [] };
        const values = list(row.stats);
        labels.forEach((label, i) => {
          const value = values[i];
          if (label && (typeof value === 'string' || typeof value === 'number')) player.stats.push({ label: `${name} ${label}`, value: String(value) });
        });
        players[id] = player;
      }
    }
  }
  return players;
}

export function sortMajorEvents(events: MajorEvent[]): MajorEvent[] {
  const clockSeconds = (clock: string) => { const [m, s] = clock.split(':').map(Number); return Number.isFinite(m + s) ? m * 60 + s : 0; };
  const allTimed = events.every(event => event.occurredAt !== null);
  return [...events].sort((a, b) => {
    if (allTimed && a.occurredAt && b.occurredAt) return Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id.localeCompare(a.id, undefined, { numeric: true });
    // Without wall-clock timestamps, group by game and use its quarter/clock.
    return (Date.parse(b.kickoff) || 0) - (Date.parse(a.kickoff) || 0) || b.gameId.localeCompare(a.gameId) || b.quarter - a.quarter || clockSeconds(a.clock) - clockSeconds(b.clock) || b.id.localeCompare(a.id, undefined, { numeric: true });
  });
}

export async function fetchNFLTimeline(season: number, week: number, nflTeams: string[], previous?: NFLTimeline): Promise<NFLTimeline> {
  const board = await read(`${API}/scoreboard?dates=${season}&seasontype=2&week=${week}`);
  if (Number(at(board, 'season', 'year')) !== season || Number(at(board, 'week', 'number')) !== week || !Array.isArray(obj(board).events)) {
    throw new Error('The NFL feed did not return the requested season and week.');
  }
  const wanted = new Set(nflTeams.map(canonicalTeam));
  const relevant = list(obj(board).events).filter(event => {
    const competition = list(obj(event).competitions)[0];
    return list(obj(competition).competitors).some(c => wanted.has(canonicalTeam(str(at(c, 'team', 'abbreviation')))));
  });
  const gameStatuses: NFLGameStatus[] = relevant.map(raw => {
    const event = obj(raw), status = obj(event.status), type = obj(status.type);
    const state = type.completed === true ? 'post' : ['pre', 'in', 'post'].includes(str(type.state)) ? str(type.state) as NFLGameStatus['state'] : 'unknown';
    const competition = list(event.competitions)[0];
    return { id: str(event.id), name: str(event.shortName ?? event.name), kickoff: str(event.date),
      teams: list(obj(competition).competitors).map(c => canonicalTeam(str(at(c, 'team', 'abbreviation')))).filter(Boolean),
      state, detail: str(type.shortDetail ?? type.detail ?? type.description), quarter: Number(status.period) || 0, clock: str(status.displayClock) };
  });
  // Finished games retain their already loaded history. Live games and games
  // just reaching final still fetch their summary, including the final play.
  const frozen = new Set(gameStatuses.filter(game => game.state === 'post' && previous?.playerStats !== undefined && previous?.games?.some(old => old.id === game.id && old.state === 'post') && !previous?.failedGameIds?.includes(game.id)).map(game => game.id));
  const playerStats: Record<string, NFLPlayerLine> = Object.fromEntries(Object.entries(previous?.playerStats ?? {}).filter(([, line]) => frozen.has(line.gameId)));
  const games = relevant.filter(event => at(event, 'status', 'type', 'state') !== 'pre' && !frozen.has(str(obj(event).id)));
  const events: MajorEvent[] = previous?.events.filter(event => frozen.has(event.gameId)) ?? [], warnings: string[] = [], failedGameIds: string[] = [];
  for (let i = 0; i < games.length; i += 3) {
    const results = await Promise.allSettled(games.slice(i, i + 3).map(async raw => {
      const event = obj(raw), id = str(event.id);
      if (!/^\d+$/.test(id)) throw new Error('Invalid NFL event ID');
      const data = await read(`${API}/summary?event=${id}`);
      if (str(at(data, 'header', 'id')) !== id) throw new Error('NFL event did not match the requested game.');
      if (!Array.isArray(obj(data).scoringPlays) && !obj(data).drives) throw new Error('NFL play data was not returned.');
      return { events: parseMajorEvents(data, { id, name: str(event.shortName ?? event.name), date: str(event.date) }), stats: parseNFLPlayerStats(data, id, Date.now()) };
    }));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') { events.push(...result.value.events); Object.assign(playerStats, result.value.stats); }
      else failedGameIds.push(str(obj(games[i + index]).id));
    });
  }
  if (failedGameIds.length) warnings.push(`Event details could not be refreshed for ${failedGameIds.length} NFL game${failedGameIds.length === 1 ? '' : 's'}. Saved events are kept where available.`);
  return { fetchedAt: Date.now(), events: sortMajorEvents(events), warnings, games: gameStatuses, failedGameIds, playerStats };
}

export function timelineCacheKey(season: number, week: number, teams: string[]): string {
  return `ffa:nfl-events:v1:${season}:${week}:${[...new Set(teams.map(canonicalTeam))].sort().join(',')}`;
}

export function readTimelineCache(key: string): NFLTimeline | null {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null') as NFLTimeline;
    if (!data || !Number.isFinite(data.fetchedAt) || !Array.isArray(data.events) || !Array.isArray(data.warnings) || !data.warnings.every(w => typeof w === 'string')) return null;
    if (!data.events.every(e => e && [e.id, e.gameId, e.game, e.kickoff, e.clock, e.kind, e.description].every(s => typeof s === 'string') &&
      Number.isFinite(e.quarter) && (e.occurredAt === null || (typeof e.occurredAt === 'string' && Number.isFinite(Date.parse(e.occurredAt)))))) return null;
    if (data.games !== undefined && (!Array.isArray(data.games) || !data.games.every(g => g &&
      [g.id, g.name, g.kickoff, g.detail, g.clock].every(s => typeof s === 'string') &&
      ['pre', 'in', 'post', 'unknown'].includes(g.state) && Number.isFinite(g.quarter) && Array.isArray(g.teams) && g.teams.every(t => typeof t === 'string')))) return null;
    if (data.failedGameIds !== undefined && (!Array.isArray(data.failedGameIds) || !data.failedGameIds.every(id => typeof id === 'string'))) return null;
    if (data.playerStats !== undefined && (!data.playerStats || typeof data.playerStats !== 'object' || Array.isArray(data.playerStats) || !Object.values(data.playerStats).every(line => line &&
      [line.name, line.nflTeam, line.gameId].every(value => typeof value === 'string') && Number.isFinite(line.updatedAt) && Array.isArray(line.stats) && line.stats.every(stat => typeof stat.label === 'string' && typeof stat.value === 'string')))) return null;
    return { ...data, events: sortMajorEvents(data.events) };
  } catch { return null; }
}

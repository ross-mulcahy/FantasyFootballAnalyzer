export interface NFLActivity {
  live: boolean;
  nextKickoff: number | null;
}

type Node = Record<string, unknown>;
const obj = (value: unknown): Node => value && typeof value === 'object' ? value as Node : {};
function at(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((node, key) => obj(node)[key], value);
}

export function parseNFLActivity(data: unknown, season: number, now = Date.now()): NFLActivity {
  const events = obj(data).events;
  const feedSeason = Number(at(data, 'season', 'year'));
  if (!Array.isArray(events) || !Number.isInteger(feedSeason) || feedSeason < 2000) {
    throw new Error('NFL game status is unavailable.');
  }
  // A past fantasy season must not become "live" when a later NFL season is playing.
  if (feedSeason !== season) return { live: false, nextKickoff: null };
  if (events.some(event => !['pre', 'in', 'post'].includes(String(at(event, 'status', 'type', 'state'))))) throw new Error('NFL game status is incomplete.');
  if (events.some(event => at(event, 'status', 'type', 'state') === 'in' && at(event, 'status', 'type', 'completed') !== true)) {
    return { live: true, nextKickoff: null };
  }
  const kickoffs = events.flatMap(event => {
    if (at(event, 'status', 'type', 'state') !== 'pre') return [];
    const name = String(at(event, 'status', 'type', 'name') ?? '');
    if (/CANCEL|POSTPON|SUSPEND/i.test(name)) return [];
    const kickoff = Date.parse(String(obj(event).date ?? ''));
    if (!Number.isFinite(kickoff)) return [];
    // The feed can remain pre-game briefly after kickoff. Recheck status in a
    // minute rather than starting a tight loop or sleeping for three hours.
    return [kickoff <= now ? now + 60000 : kickoff];
  });
  return { live: false, nextKickoff: kickoffs.length ? Math.min(...kickoffs) : null };
}

// Share an in-flight probe (including React's development effect replay).
const pending = new Map<number, Promise<NFLActivity>>();
export function fetchNFLActivity(season: number): Promise<NFLActivity> {
  const existing = pending.get(season);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`NFL status feed: ${response.status}`);
    return parseNFLActivity(await response.json(), season);
  })().finally(() => pending.delete(season));
  pending.set(season, request);
  return request;
}

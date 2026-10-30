import { afterEach, expect, it, vi } from 'vitest';
import { fetchNFLTimeline, parseMajorEvents, parseNFLPlayerStats, sortMajorEvents, timelineCacheKey } from './nflTimeline';
afterEach(() => vi.unstubAllGlobals());
const game = { id: '123', name: 'CAR @ GB', date: '2026-10-30T00:15Z' };
it('deduplicates scores, includes published turnovers, and excludes ordinary plays', () => {
  const events = parseMajorEvents({ drives: { previous: [{ plays: [
    { id: '1', text: 'Field goal', scoringPlay: true, wallclock: '2026-10-30T00:20Z', period: { number: 1 }, clock: { displayValue: '11:43' } },
    { id: '2', text: 'Interception', isTurnover: true, period: { number: 2 }, clock: { displayValue: '8:22' } },
    { id: '3', text: 'Four yard rush', isTurnover: false },
  ] }] }, scoringPlays: [{ id: '1', text: 'Player kicks a field goal', period: { number: 1 }, clock: { displayValue: '11:43' } }] }, game);
  expect(events).toHaveLength(2);
  expect(events[0]).toMatchObject({ description: 'Player kicks a field goal', occurredAt: '2026-10-30T00:20Z' });
  expect(events[1].kind).toBe('Turnover');
  expect(sortMajorEvents([...events].reverse()).map(e => e.id)).toEqual(['123:2', '123:1']);
});
it('fetches only started games involving the selected starters', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('scoreboard') ? {
    season: { year: 2026 }, week: { number: 8 }, events: [
      { id: '123', shortName: 'CAR @ GB', date: game.date, status: { type: { state: 'post' } }, competitions: [{ competitors: [{ team: { abbreviation: 'CAR' } }] }] },
      { id: '456', status: { type: { state: 'pre' } }, competitions: [{ competitors: [{ team: { abbreviation: 'CAR' } }] }] },
      { id: '789', status: { type: { state: 'post' } }, competitions: [{ competitors: [{ team: { abbreviation: 'KC' } }] }] },
    ],
  } : { header: { id: '123' }, scoringPlays: [{ id: 'a', text: 'Touchdown', period: { number: 1 }, clock: { displayValue: '9:00' } }] })));
  vi.stubGlobal('fetch', fetcher);
  expect((await fetchNFLTimeline(2026, 8, ['CAR'])).events).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(timelineCacheKey(2026, 8, ['WSH', 'JAX', 'WAS'])).toBe(timelineCacheKey(2026, 8, ['JAC', 'WAS']));
});
it('rejects another week instead of showing unrelated events', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ season: { year: 2026 }, week: { number: 7 }, events: [] }))));
  await expect(fetchNFLTimeline(2026, 8, ['CAR'])).rejects.toThrow(/requested season and week/);
});
it('reports failed summaries instead of replacing them with no events', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('scoreboard') ? new Response(JSON.stringify({ season: { year: 2026 }, week: { number: 8 }, events: [
    { id: '123', status: { type: { state: 'post' } }, competitions: [{ competitors: [{ team: { abbreviation: 'CAR' } }] }] },
  ] })) : new Response('unavailable', { status: 503 })));
  const result = await fetchNFLTimeline(2026, 8, ['CAR']);
  expect(result.events).toEqual([]);
  expect(result.failedGameIds).toEqual(['123']);
  expect(result.games?.[0].state).toBe('post');
  expect(result.warnings[0]).toMatch(/could not be refreshed/);
});

it('orders timed events newest first and untimed events by latest quarter and clock', () => {
  const event = { id: 'a', gameId: '1', game: 'A @ B', kickoff: '2026-10-30T00:00Z', occurredAt: null, quarter: 4, clock: '2:00', kind: 'Touchdown', description: 'One' };
  expect(sortMajorEvents([{ ...event, id: 'older', occurredAt: '2026-10-30T00:20Z' }, { ...event, id: 'newer', occurredAt: '2026-10-30T01:20Z' }]).map(e => e.id)).toEqual(['newer', 'older']);
  expect(sortMajorEvents([event, { ...event, id: 'late', clock: '0:30' }, { ...event, id: 'ot', quarter: 5 }]).map(e => e.id)).toEqual(['ot', 'late', 'a']);
});
it('returns live and scheduled game status without fetching summaries for pre-game fixtures', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('scoreboard') ? {
    season: { year: 2026 }, week: { number: 8 }, events: [
      { id: '123', shortName: 'CAR @ GB', date: game.date, status: { period: 2, displayClock: '8:22', type: { state: 'in', shortDetail: '8:22 - 2nd', completed: false } }, competitions: [{ competitors: [{ team: { abbreviation: 'CAR' } }, { team: { abbreviation: 'GB' } }] }] },
      { id: '456', shortName: 'BUF @ KC', date: game.date, status: { type: { state: 'pre', detail: 'Scheduled' } }, competitions: [{ competitors: [{ team: { abbreviation: 'BUF' } }] }] },
    ],
  } : { header: { id: '123' }, scoringPlays: [] }))));
  const result = await fetchNFLTimeline(2026, 8, ['CAR', 'BUF']);
  expect(result.games).toEqual([
    expect.objectContaining({ id: '123', state: 'in', teams: ['CAR', 'GB'], clock: '8:22', quarter: 2 }),
    expect.objectContaining({ id: '456', state: 'pre' }),
  ]);
});

it('fetches a final summary once at full time, then reuses completed history while checking status', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('scoreboard') ? {
    season: { year: 2026 }, week: { number: 8 }, events: [
      { id: '123', shortName: 'CAR @ GB', date: game.date, status: { type: { state: 'post', completed: true } }, competitions: [{ competitors: [{ team: { abbreviation: 'CAR' } }] }] },
    ],
  } : { header: { id: '123' }, scoringPlays: [{ id: 'last', text: 'Final touchdown' }] })));
  vi.stubGlobal('fetch', fetcher);
  const previous = { fetchedAt: Date.now(), events: [], warnings: [], games: [{ id: '123', name: game.name, kickoff: game.date, teams: ['CAR'], state: 'in' as const, detail: 'Live', quarter: 4, clock: '0:01' }] };
  const final = await fetchNFLTimeline(2026, 8, ['CAR'], previous);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(final.events[0].description).toBe('Final touchdown');
  const idle = await fetchNFLTimeline(2026, 8, ['CAR'], final);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(idle.events).toEqual(final.events);
});

it('parses per-player live NFL stat strings while keeping categories and zero values', () => {
  const result = parseNFLPlayerStats({ boxscore: { players: [{ team: { abbreviation: 'CIN' }, statistics: [
    { name: 'receiving', labels: ['REC', 'YDS', 'TD'], athletes: [{ athlete: { id: '4362628', displayName: "Ja'Marr Chase" }, stats: ['5', '80', 0] }] },
    { name: 'rushing', labels: ['CAR', 'YDS'], athletes: [{ athlete: { id: '4362628', displayName: "Ja'Marr Chase" }, stats: ['1', '4'] }] },
  ] }] } }, 'g1', 123);
  expect(result['4362628']).toMatchObject({ name: "Ja'Marr Chase", nflTeam: 'CIN', gameId: 'g1', updatedAt: 123 });
  expect(result['4362628'].stats).toContainEqual({ label: 'receiving TD', value: '0' });
  expect(result['4362628'].stats).toContainEqual({ label: 'rushing YDS', value: '4' });
});

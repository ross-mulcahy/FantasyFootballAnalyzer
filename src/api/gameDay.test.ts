import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { League, SleeperAPI, ESPNAPI } from '@/types';
import { loadGameDay, mapEspnSnapshot, mapSleeperSnapshot, mapYahooSnapshot } from './gameDay';
import { saveTokens } from './yahoo';
import { persistESPNCredentials } from '@/utils/espnCredentials';

const league = { id: 'L1', platform: 'espn', season: 2026, name: 'Test', teams: [], currentWeek: 16 } as unknown as League;
const espn = {
  teams: [{ id: 1, name: 'Home', roster: { entries: [{ playerId: 7, lineupSlotId: 21, playerPoolEntry: { player: { id: 7, fullName: 'Player Seven', defaultPositionId: 1, proTeamId: 2 } } }] } }, { id: 2, name: 'Away' }],
  settings: { scheduleSettings: { matchupPeriods: { 15: [15, 16] } } },
  status: { currentMatchupPeriod: 15 },
  schedule: [
    { id: 1, matchupPeriodId: 15, winner: 'UNDECIDED', playoffTierType: 'WINNERS_BRACKET', home: { teamId: 1, totalPoints: 0 }, away: { teamId: 2, totalPoints: 0 } },
    { id: 2, matchupPeriodId: 14, home: { teamId: 1, totalPoints: 99 }, away: { teamId: 2, totalPoints: 100 } },
  ],
};

describe('Game Day platform mapping', () => {
  it('retains undecided playoff 0–0 matchups and labels multiweek totals', () => {
    const snapshot = mapEspnSnapshot(league, espn, 16);
    expect(snapshot.matchups).toHaveLength(1);
    expect(snapshot.matchups[0]).toMatchObject({ team1Points: 0, team2Points: 0, period: 'Matchup total · Weeks 15–16' });
    expect(snapshot.teams[0].roster?.[0]).toMatchObject({ name: 'Player Seven', slot: 'IR', nflTeam: 'BUF' });
    expect(snapshot.teams[1].roster).toBeNull();
  });

  it('keeps unpaired teams without inventing an opponent or score', () => {
    const snapshot = mapEspnSnapshot(league, { ...espn, schedule: [{ matchupPeriodId: 15, home: { teamId: 1 } }] }, 16);
    expect(snapshot.matchups[0]).toMatchObject({ team2Id: null, team1Points: null, team2Points: null });
  });

  it('rejects missing ESPN schedules rather than replacing a cached score with an empty list', () => {
    expect(() => mapEspnSnapshot(league, { teams: espn.teams }, 16)).toThrow(/schedule/);
  });

  it('honors Sleeper commissioner overrides, null matchups, empty slots, IR, and taxi', () => {
    const raw = { roster_positions: ['QB', 'BN'], settings: { playoff_week_start: 15 } } as SleeperAPI.League;
    const rosters = [
      { roster_id: 1, owner_id: 'owner', players: ['7', '8', '9'], starters: ['0'], reserve: ['8'], taxi: ['9'] },
      { roster_id: 2, owner_id: null, players: [], starters: [], reserve: [] },
      { roster_id: 3, owner_id: null, players: [], starters: [], reserve: [] },
    ] as unknown as SleeperAPI.Roster[];
    const matches = [
      { roster_id: 1, matchup_id: 1, points: 12, custom_points: 0 },
      { roster_id: 2, matchup_id: 1, points: 0 },
      { roster_id: 3, matchup_id: null, points: 0 },
    ] as SleeperAPI.Matchup[];
    const result = mapSleeperSnapshot({ ...league, platform: 'sleeper' }, raw, [{ user_id: 'owner', metadata: { team_name: 'Named Team' } }] as SleeperAPI.User[], rosters, {}, matches, 16);
    expect(result.teams[0].name).toBe('Named Team');
    expect(result.teams[0].roster?.map(p => p.slot)).toEqual(['QB', 'Bench', 'IR', 'Taxi']);
    expect(result.teams[0].roster?.[0].name).toBe('Empty slot');
    expect(result.matchups.find(m => m.team2Id === '2')?.team1Points).toBe(0);
    expect(result.matchups.find(m => m.team1Id === '3')?.team2Id).toBeNull();
    expect(result.matchups[0].period).toContain('single week');
  });

  it('normalizes Yahoo XML singleton collections and retains playoff ties', () => {
    const rosterData = { fantasy_content: { league: { teams: { team: {
      team_key: 'nfl.l.1.t.1', name: 'One', roster: { players: { player: { player_key: 'nfl.p.7', name: { full: 'Seven' }, display_position: 'WR,TE', editorial_team_abbr: 'BUF', selected_position: { position: 'BN' } } } },
    } } } } };
    const scoreboard = { fantasy_content: { league: { scoreboard: { matchups: { matchup: {
      is_playoffs: 1, is_tied: 1, week_start: 15, week_end: 16,
      teams: { team: [{ team_key: 'nfl.l.1.t.1', team_points: { total: '0' } }, { team_key: 'nfl.l.1.t.2', team_points: { total: '0' } }] },
    } } } } } };
    const result = mapYahooSnapshot({ ...league, platform: 'yahoo' }, scoreboard, rosterData, 16);
    expect(result.teams[0].roster?.[0]).toMatchObject({ name: 'Seven', slot: 'BN', position: 'WR,TE' });
    expect(result.matchups[0]).toMatchObject({ team1Points: 0, team2Points: 0, period: 'Matchup total · Weeks 15–16' });
  });

  it('rejects a missing Yahoo scoreboard or missing teams', () => {
    expect(() => mapYahooSnapshot(league, {}, {}, 1)).toThrow(/scoreboard/);
    expect(() => mapYahooSnapshot(league, { fantasy_content: { league: { scoreboard: {} } } }, {}, 1)).toThrow(/teams/);
  });
});

describe('current-period requests', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());
  it('fetches only ESPN metadata and the current scoring week through the cookie proxy', async () => {
    persistESPNCredentials({ platform: 'espn', leagueId: 'L1', espnS2: 'test', swid: '{id}', rememberEspn: true });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ...espn, scoringPeriodId: 16, status: { currentMatchupPeriod: 15, latestScoringPeriod: 16, finalScoringPeriod: 17 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const result = await loadGameDay(league, null);
    expect(result.week).toBe(16);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, options] = fetcher.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toContain('/api/espn-proxy');
    expect(url).toContain('scoringPeriodId=16');
    expect(options.headers).toMatchObject({ 'X-ESPN-S2': 'test' });
  });

  it('uses Yahoo scoreboard week to request matching rosters', async () => {
    saveTokens({ access_token: 'test', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer' });
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(decodeURIComponent(url));
      const payload = url.includes('scoreboard')
        ? { fantasy_content: { league: { scoreboard: { week: '10', matchups: {} } } } }
        : { fantasy_content: { league: { teams: { team: { team_key: 't1', name: 'One', roster: { players: {} } } } } } };
      return new Response(JSON.stringify(payload));
    }));
    const result = await loadGameDay({ ...league, platform: 'yahoo' }, null);
    expect(result.week).toBe(10);
    expect(urls).toHaveLength(3);
    expect(urls[1]).toContain('/teams/roster;week=10');
    expect(result.teams[0].roster).toEqual([]);
  });
});

it('uses authoritative Sleeper player points with weekly raw stats and league-scored projections', () => {
  const raw = { roster_positions: ['QB'], scoring_settings: { pass_yd: .04, pass_td: 6 } } as unknown as SleeperAPI.League;
  const result = mapSleeperSnapshot({ ...league, platform: 'sleeper' }, raw, [],
    [{ roster_id: 1, starters: ['7'], players: ['7'] }] as SleeperAPI.Roster[], {},
    [{ roster_id: 1, matchup_id: null, points: 0, players_points: { 7: 0 } }] as SleeperAPI.Matchup[], 8,
    { 7: { pass_yd: 0, pts_ppr: 99 } }, { 7: { pass_yd: 250, pass_td: 2 } });
  expect(result.teams[0].roster?.[0]).toMatchObject({ points: 0, projection: 22, stats: [{ label: 'Pass yards', value: 0 }] });
});
it('filters ESPN actuals and projections by season and scoring week', () => {
  const data = structuredClone(espn);
  const p = data.teams[0].roster!.entries[0].playerPoolEntry.player as unknown as ESPNAPI.Player;
  p.stats = [
    { seasonId: 2026, scoringPeriodId: 0, statSourceId: 0, appliedTotal: 200, stats: { 3: 3000 } },
    { seasonId: 2025, scoringPeriodId: 16, statSourceId: 0, appliedTotal: 99, stats: { 3: 400 } },
    { seasonId: 2026, scoringPeriodId: 16, statSourceId: 0, appliedTotal: 0, stats: { 3: 0, 20: 1 } },
    { seasonId: 2026, scoringPeriodId: 16, statSourceId: 1, appliedTotal: 18.5, stats: { 3: 250 } },
  ];
  const player = mapEspnSnapshot(league, data, 16).teams[0].roster?.[0];
  expect(player).toMatchObject({ points: 0, projection: 18.5 });
  expect(player?.stats).toEqual([{ label: 'Pass yards', value: 0 }, { label: 'Pass INT', value: 1 }]);
});

it('retains Sleeper player scores if optional stats and projection feeds fail', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/stats/') || url.includes('/projections/')) return new Response('unavailable', { status: 503 });
    const payload = url.endsWith('/players/nfl') ? { 7: { full_name: 'Seven', position: 'QB', team: 'BUF' } }
      : url.endsWith('/state/nfl') ? { season: '2026', week: 8 }
      : url.endsWith('/matchups/8') ? [{ roster_id: 1, matchup_id: null, points: 3.2, players_points: { 7: 3.2 } }]
      : url.endsWith('/rosters') ? [{ roster_id: 1, starters: ['7'], players: ['7'] }]
      : url.endsWith('/users') ? []
      : { roster_positions: ['QB'], settings: {}, scoring_settings: { pass_yd: .04 } };
    return new Response(JSON.stringify(payload));
  }));
  const result = await loadGameDay({ ...league, platform: 'sleeper' }, null);
  expect(result.teams[0].roster?.[0].points).toBe(3.2);
  expect(result.detailWarnings).toHaveLength(2);
  vi.unstubAllGlobals();
});

it.each(['week', 'season'])('reads Yahoo league-scored player stats only with valid %s coverage', async coverage => {
  saveTokens({ access_token: 'test', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const endpoint = decodeURIComponent(url);
    const payload = endpoint.includes('/scoreboard') ? { fantasy_content: { league: { scoreboard: { week: 8, matchups: {} } } } }
      : endpoint.includes('/settings') ? { fantasy_content: { league: { settings: { stat_categories: { stats: { stat: { stat_id: '7', display_name: 'Rush yards' } } } } } } }
      : endpoint.includes('/players;') ? { fantasy_content: { league: { players: { player: { player_key: 'p1', player_points: { total: '0', week: 8, coverage_type: coverage }, player_stats: { stats: { stat: { stat_id: '7', value: '0' } } } } } } } }
      : { fantasy_content: { league: { teams: { team: { team_key: 't1', name: 'One', roster: { players: { player: { player_key: 'p1', name: { full: 'Player' }, selected_position: { position: 'QB' } } } } } } } } };
    return new Response(JSON.stringify(payload));
  }));
  const result = await loadGameDay({ ...league, platform: 'yahoo' }, null);
  const player = result.teams[0].roster?.[0];
  if (coverage === 'week') expect(player).toMatchObject({ points: 0, projection: null, stats: [{ label: 'Rush yards', value: 0 }] });
  else { expect(player?.points).toBeUndefined(); expect(result.detailWarnings?.[0]).toMatch(/outside the requested week/); }
  vi.unstubAllGlobals();
});

it('uses ESPN live totals and projections while settled totals lag, preserving zero and multiweek totals', () => {
  const data = { ...espn, schedule: [{ matchupPeriodId: 15,
    home: { teamId: 1, totalPoints: 0, totalPointsLive: 8.8, totalProjectedPoints: 0, totalProjectedPointsLive: 100.09 },
    away: { teamId: 2, totalPoints: 10, totalPointsLive: 0, totalProjectedPoints: 99, totalProjectedPointsLive: 0 },
  }] };
  expect(mapEspnSnapshot(league, data, 16).matchups[0]).toMatchObject({ team1Points: 8.8, team2Points: 0, team1Projection: 100.09, team2Projection: 0, period: 'Matchup total · Weeks 15–16' });
});
it('orders ESPN starting slots from league settings and preserves an unfilled defense slot', () => {
  const entry = (id: number, slot: number) => ({ playerId: id, lineupSlotId: slot, playerPoolEntry: { player: { id, fullName: `Player ${id}`, defaultPositionId: 1, proTeamId: 2 } } });
  const data = { ...espn, settings: { ...espn.settings, rosterSettings: { lineupSlotCounts: { 0: 1, 2: 2, 4: 2, 6: 1, 16: 1, 20: 6, 23: 2 } } }, teams: [
    { id: 1, name: 'Home', roster: { entries: [entry(7, 23), entry(8, 0), entry(9, 20)] } },
    { id: 2, name: 'Away', roster: { entries: [entry(10, 16), entry(11, 0)] } },
  ] };
  const result = mapEspnSnapshot(league, data, 16);
  expect(result.teams[0].roster?.map(p => p.slot)).toEqual(['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'D/ST', 'Flex', 'Flex', 'Bench']);
  expect(result.teams[0].roster?.[6]).toMatchObject({ id: '0', name: 'Empty slot', slot: 'D/ST', points: 0, projection: 0 });
  expect(result.teams[1].roster?.map(p => p.slot)).toEqual(['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'D/ST', 'Flex', 'Flex']);
});

it('carries provider injury flags into roster snapshots for lineup warnings', () => {
  const data = structuredClone(espn);
  Object.assign(data.teams[0].roster!.entries[0].playerPoolEntry.player, { injuryStatus: 'OUT' });
  expect(mapEspnSnapshot(league, data, 16).teams[0].roster?.[0].availability).toBe('Out');
});

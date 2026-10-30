import { beforeEach, describe, expect, it } from 'vitest';
import type { League } from '@/types';
import { loadSavedLeagues, rememberSavedLeague, removeSavedLeague, selectSavedLeagueTeam } from './savedLeagues';
import { cacheLeague } from './leagueCache';
import { loadESPNCredentials, persistESPNCredentials } from './espnCredentials';

const league = (id: string, season = 2026): League => ({
  id, platform: 'espn', name: `League ${id}`, season, draftType: 'snake',
  teams: [], scoringType: 'ppr', totalTeams: 12, isLoaded: true,
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('local saved leagues', () => {
  it('keeps multiple leagues and seasons, updating names without duplicates', () => {
    rememberSavedLeague(league('A'));
    rememberSavedLeague(league('B'));
    rememberSavedLeague(league('A', 2025));
    rememberSavedLeague({ ...league('A'), name: 'Renamed' });
    expect(loadSavedLeagues().map(l => [l.leagueId, l.season, l.name])).toEqual([
      ['A', 2026, 'Renamed'], ['A', 2025, 'League A'], ['B', 2026, 'League B'],
    ]);
  });

  it('never persists credentials or arbitrary fields in the league list', () => {
    rememberSavedLeague({ ...league('A'), espnS2: 'secret', yahooToken: 'token' } as League);
    expect(localStorage.getItem('ffa:my-leagues:v1')).not.toMatch(/secret|token/);
    localStorage.setItem('ffa:my-leagues:v1', JSON.stringify([
      { platform: 'espn', leagueId: 'A', season: 2026, name: 'A', espnS2: 'secret' },
      null, { platform: 'invalid' }, { platform: 'espn', leagueId: 'A', season: '2026', name: 'B' },
    ]));
    expect(loadSavedLeagues()).toEqual([{ platform: 'espn', leagueId: 'A', season: 2026, name: 'A' }]);
  });

  it('ignores guests and handles damaged storage', () => {
    rememberSavedLeague({ ...league('guest'), isGuest: true });
    expect(loadSavedLeagues()).toEqual([]);
    localStorage.setItem('ffa:my-leagues:v1', '{broken');
    expect(loadSavedLeagues()).toEqual([]);
  });

  it('forgets credentials only after the last season for that league is removed', () => {
    rememberSavedLeague(league('A'));
    rememberSavedLeague(league('A', 2025));
    persistESPNCredentials({ platform: 'espn', leagueId: 'A', espnS2: 'secret', rememberEspn: true });
    const latest = loadSavedLeagues().find(l => l.season === 2026)!;
    removeSavedLeague(latest);
    expect(loadESPNCredentials('A')?.espnS2).toBe('secret');
    removeSavedLeague(loadSavedLeagues()[0]);
    expect(loadESPNCredentials('A')).toBeUndefined();
    expect(loadSavedLeagues()).toEqual([]);
  });
});

it('persists a chosen team locally and retains the selection when the league refreshes', () => {
  const data = { ...league('A'), teams: [{ id: '1', name: 'Auto team', isMyTeam: true }, { id: '2', name: 'Chosen team' }] };
  cacheLeague(data);
  rememberSavedLeague(data);
  expect(loadSavedLeagues()[0].teamId).toBe('1');
  expect(selectSavedLeagueTeam(loadSavedLeagues()[0], 'missing')).toBe(false);
  expect(selectSavedLeagueTeam(loadSavedLeagues()[0], '2')).toBe(true);
  rememberSavedLeague(data);
  expect(loadSavedLeagues()[0]).toMatchObject({ teamId: '2', teamName: 'Chosen team' });
});

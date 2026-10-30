import { beforeEach, expect, it, vi } from 'vitest';
import type { GameDaySnapshot } from '@/types/gameDay';
import { loadGameDayCache, saveGameDayCache, clearGameDayCache } from './gameDayCache';

const data: GameDaySnapshot = { platform: 'espn', leagueId: '1', season: 2026, week: 10, fetchedAt: 1234, teams: [{ id: 't1', name: 'One', roster: [] }], matchups: [] };
const identity = { platform: 'espn' as const, id: '1', season: 2026 };
beforeEach(() => localStorage.clear());

it('restores exact snapshots while isolating league, platform, and season', () => {
  expect(saveGameDayCache(data)).toBe(true);
  expect(loadGameDayCache(identity)).toEqual(data);
  expect(loadGameDayCache({ ...identity, season: 2025 })).toBeNull();
  expect(loadGameDayCache({ ...identity, platform: 'sleeper' })).toBeNull();
  expect(loadGameDayCache({ ...identity, id: '2' })).toBeNull();
  clearGameDayCache(identity);
  expect(loadGameDayCache(identity)).toBeNull();
});

it('persists only display data even if a caller accidentally supplies credentials', () => {
  saveGameDayCache({ ...data, espnS2: 'secret-cookie', yahooToken: 'secret-token' } as GameDaySnapshot);
  expect(localStorage.getItem('ffa:game-day:v1:espn:1:2026')).not.toMatch(/secret|espnS2|yahooToken/);
});

it('rejects corrupted cache contents and invalid roster shapes', () => {
  const key = 'ffa:game-day:v1:espn:1:2026';
  localStorage.setItem(key, '{invalid');
  expect(loadGameDayCache(identity)).toBeNull();
  localStorage.setItem(key, JSON.stringify({ ...data, teams: [{ id: '1', name: 'One', roster: [null] }] }));
  expect(loadGameDayCache(identity)).toBeNull();
});

it('reports quota failures without destroying the previous cache', () => {
  saveGameDayCache(data);
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  expect(saveGameDayCache({ ...data, fetchedAt: 9999 })).toBe(false);
  spy.mockRestore();
  expect(loadGameDayCache(identity)?.fetchedAt).toBe(1234);
});

it('round-trips weekly details without nested arbitrary fields', () => {
  saveGameDayCache({ ...data, detailVersion: 1, teams: [{ id: 't1', name: 'One', roster: [
    { id: 'p1', name: 'Player', position: 'QB', nflTeam: 'BUF', slot: 'QB', points: 0, projection: 22, stats: [{ label: 'Pass yards', value: 0, token: 'nested-secret' } as never] },
  ] }] });
  expect(loadGameDayCache(identity)?.teams[0].roster?.[0]).toMatchObject({ points: 0, projection: 22, stats: [{ label: 'Pass yards', value: 0 }] });
  expect(localStorage.getItem('ffa:game-day:v1:espn:1:2026')).not.toContain('nested-secret');
});

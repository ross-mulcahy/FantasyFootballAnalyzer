import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { GameDaySnapshot } from '@/types/gameDay';
import type { League } from '@/types';
import { useGameDay } from './useGameDay';
import { loadGameDay } from '@/api/gameDay';
import { saveGameDayCache, loadGameDayCache } from '@/utils/gameDayCache';

vi.mock('@/api/gameDay', () => ({ loadGameDay: vi.fn() }));
const loader = vi.mocked(loadGameDay);
const league = { platform: 'espn', id: '1', season: 2026 } as League;
const snapshot: GameDaySnapshot = { detailVersion: 1, platform: 'espn', leagueId: '1', season: 2026, week: 10, fetchedAt: 1234, teams: [{ id: 't1', name: 'One', roster: [] }], matchups: [] };
beforeEach(() => { localStorage.clear(); loader.mockReset(); });
afterEach(cleanup);

it('hydrates cached data without a request and updates only on explicit refresh', async () => {
  saveGameDayCache(snapshot);
  const { result } = renderHook(() => useGameDay(league, null));
  expect(result.current.snapshot).toEqual(snapshot);
  expect(loader).not.toHaveBeenCalled();
  loader.mockResolvedValue({ ...snapshot, fetchedAt: 9999 });
  await act(async () => { await result.current.refresh(); });
  expect(result.current.snapshot?.fetchedAt).toBe(9999);
  expect(loadGameDayCache(league)?.fetchedAt).toBe(9999);
});

it('keeps the old score and timestamp on a failed refresh', async () => {
  saveGameDayCache(snapshot);
  loader.mockRejectedValue(new Error('ESPN API error: 401'));
  const { result } = renderHook(() => useGameDay(league, null));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.snapshot).toEqual(snapshot);
  expect(result.current.error).toContain('401');
  expect(loadGameDayCache(league)).toEqual(snapshot);
});

it('starts a first fetch and ignores concurrent refresh clicks', async () => {
  let finish!: (value: GameDaySnapshot) => void;
  loader.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useGameDay(league, null));
  await act(async () => { await result.current.refresh(); });
  expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => finish(snapshot));
  await waitFor(() => expect(result.current.isRefreshing).toBe(false));
});

it('never lets a response for the previous league overwrite the current league', async () => {
  let finish!: (value: GameDaySnapshot) => void;
  loader.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const second = { ...league, id: '2' };
  const secondSnapshot = { ...snapshot, leagueId: '2' };
  loader.mockResolvedValueOnce(secondSnapshot);
  const { result, rerender } = renderHook(({ active }) => useGameDay(active, null), { initialProps: { active: league } });
  rerender({ active: second });
  await waitFor(() => expect(result.current.snapshot?.leagueId).toBe('2'));
  await act(async () => finish(snapshot));
  expect(result.current.snapshot).toEqual(secondSnapshot);
  expect(loadGameDayCache(league)).toBeNull();
});

it('shows fresh data but warns if browser storage cannot save it', async () => {
  saveGameDayCache(snapshot);
  const { result } = renderHook(() => useGameDay(league, null));
  loader.mockResolvedValue({ ...snapshot, fetchedAt: 9999 });
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  await act(async () => { await result.current.refresh(); });
  spy.mockRestore();
  expect(result.current.cacheWarning).toBe(true);
  expect(result.current.snapshot?.fetchedAt).toBe(9999);
});

it('upgrades legacy cache without blanking the saved roster', async () => {
  const legacy = { ...snapshot }; delete legacy.detailVersion;
  saveGameDayCache(legacy);
  loader.mockResolvedValue({ ...snapshot, fetchedAt: 9999 });
  const { result } = renderHook(() => useGameDay(league, null));
  expect(result.current.snapshot?.fetchedAt).toBe(1234);
  await waitFor(() => expect(result.current.snapshot?.detailVersion).toBe(1));
  expect(loader).toHaveBeenCalledTimes(1);
});

it('clears an old refresh spinner when switching to a cached league', async () => {
  let finish!: (value: GameDaySnapshot) => void;
  loader.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const second = { ...league, id: '2' };
  const cached = { ...snapshot, leagueId: '2' };
  saveGameDayCache(cached);
  const { result, rerender } = renderHook(({ active }) => useGameDay(active, null), { initialProps: { active: league } });
  expect(result.current.isRefreshing).toBe(true);
  rerender({ active: second });
  expect(result.current.snapshot).toEqual(cached);
  expect(result.current.isRefreshing).toBe(false);
  await act(async () => finish(snapshot));
  expect(result.current.snapshot).toEqual(cached);
  expect(result.current.isRefreshing).toBe(false);
});

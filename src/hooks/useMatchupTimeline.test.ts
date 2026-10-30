import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LIVE_EVENTS_MS, IDLE_EVENTS_MS, useMatchupTimeline } from './useMatchupTimeline';
import { fetchNFLTimeline, timelineCacheKey } from '@/api/nflTimeline';
vi.mock('@/api/nflTimeline', async importOriginal => ({ ...await importOriginal<typeof import('@/api/nflTimeline')>(), fetchNFLTimeline: vi.fn() }));
const loader = vi.mocked(fetchNFLTimeline);
const data = { fetchedAt: Date.now(), events: [], warnings: [], games: [] };
beforeEach(() => { localStorage.clear(); loader.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('restores cached events and preserves them when refresh fails', async () => {
  localStorage.setItem(timelineCacheKey(2026, 8, ['CAR']), JSON.stringify(data));
  const { result } = renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], data.fetchedAt - 1));
  expect(result.current.data).toEqual(data);
  expect(loader).not.toHaveBeenCalled();
  loader.mockRejectedValue(new Error('Feed unavailable'));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.error).toBe('Feed unavailable'));
  expect(result.current.data).toEqual(data);
});
it('ignores a late response after switching weeks', async () => {
  let finish!: (value: typeof data) => void;
  loader.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  loader.mockResolvedValueOnce({ ...data, fetchedAt: 300 });
  const { result, rerender } = renderHook(({ week }) => useMatchupTimeline(2026, week, ['CAR'], data.fetchedAt - 1), { initialProps: { week: 8 } });
  rerender({ week: 9 });
  await waitFor(() => expect(result.current.data?.fetchedAt).toBe(300));
  await act(async () => finish(data));
  expect(result.current.data?.fetchedAt).toBe(300);
});

it('keeps saved events for a failed summary while updating game status', async () => {
  const event = { id: '1:e1', gameId: '1', game: 'CAR @ GB', kickoff: '2026-10-30T00:00Z', occurredAt: '2026-10-30T01:00Z', quarter: 2, clock: '1:00', kind: 'TD', description: 'Saved touchdown' };
  localStorage.setItem(timelineCacheKey(2026, 8, ['CAR']), JSON.stringify({ ...data, fetchedAt: data.fetchedAt - 3 * 60 * 60 * 1000, events: [event] }));
  loader.mockResolvedValue({ fetchedAt: 300, events: [], warnings: ['Game summary unavailable'], failedGameIds: ['1'], games: [{ id: '1', name: 'CAR @ GB', kickoff: event.kickoff, teams: ['CAR', 'GB'], state: 'in', detail: 'Halftime', quarter: 2, clock: '0:00' }] });
  const { result } = renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], data.fetchedAt + 1));
  await waitFor(() => expect(result.current.data?.fetchedAt).toBe(300));
  expect(result.current.data?.events[0].description).toBe('Saved touchdown');
  expect(result.current.data?.games?.[0].state).toBe('in');
});

const liveGame = { id: '1', name: 'CAR @ GB', kickoff: '2026-10-30T10:00Z', teams: ['CAR', 'GB'], state: 'in' as const, detail: 'Live', quarter: 2, clock: '8:00' };
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
it('checks live events every 15 seconds, takes a final update, and stops fast polling at full time', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00Z'));
  const baseline = { ...data, fetchedAt: Date.now(), games: [liveGame] };
  localStorage.setItem(timelineCacheKey(2026, 8, ['CAR']), JSON.stringify(baseline));
  let ended = false;
  loader.mockImplementation(async () => ({ ...baseline, fetchedAt: Date.now(), games: [{ ...liveGame, state: ended ? 'post' : 'in' }] }));
  const { unmount } = renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], baseline.fetchedAt));
  await flush(); expect(loader).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_EVENTS_MS); });
  expect(loader).toHaveBeenCalledTimes(1);
  ended = true;
  await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_EVENTS_MS); });
  expect(loader).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(loader).toHaveBeenCalledTimes(2);
  unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(IDLE_EVENTS_MS); });
  expect(loader).toHaveBeenCalledTimes(2);
});
it('sleeps until the next relevant kickoff instead of polling events rapidly while idle', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00Z'));
  const baseline = { ...data, fetchedAt: Date.now(), games: [{ ...liveGame, state: 'pre', kickoff: new Date(Date.now() + 120000).toISOString() }] };
  localStorage.setItem(timelineCacheKey(2026, 8, ['CAR']), JSON.stringify(baseline));
  loader.mockImplementation(async () => ({ ...baseline, fetchedAt: Date.now(), games: [liveGame] }));
  renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], baseline.fetchedAt));
  await flush();
  await act(async () => { await vi.advanceTimersByTimeAsync(119999); }); expect(loader).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); }); expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_EVENTS_MS); }); expect(loader).toHaveBeenCalledTimes(2);
});
it('pauses hidden or offline, resumes when visible, and never overlaps a slow live request', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00Z'));
  let visible = false, online = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  const baseline = { ...data, fetchedAt: Date.now(), games: [liveGame] };
  localStorage.setItem(timelineCacheKey(2026, 8, ['CAR']), JSON.stringify(baseline));
  let finish!: (value: typeof baseline) => void;
  loader.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], baseline.fetchedAt));
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); }); expect(loader).not.toHaveBeenCalled();
  act(() => { visible = true; document.dispatchEvent(new Event('visibilitychange')); }); await flush();
  expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); }); expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ...baseline, fetchedAt: Date.now() }));
  act(() => { online = false; window.dispatchEvent(new Event('offline')); });
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); }); expect(loader).toHaveBeenCalledTimes(1);
  act(() => { online = true; window.dispatchEvent(new Event('online')); }); await flush();
  expect(loader).toHaveBeenCalledTimes(2);
});

it('retains saved player stats and their original timestamp when a summary fails', async () => {
  const key = timelineCacheKey(2026, 8, ['CAR']);
  const old = { ...data, fetchedAt: Date.now() - IDLE_EVENTS_MS, games: [liveGame], playerStats: { '123': { name: 'Saved Player', nflTeam: 'CAR', gameId: '1', updatedAt: 100, stats: [{ label: 'receiving YDS', value: '80' }] } } };
  localStorage.setItem(key, JSON.stringify(old));
  loader.mockResolvedValue({ ...data, fetchedAt: Date.now(), games: [liveGame], events: [], warnings: ['Summary unavailable'], failedGameIds: ['1'], playerStats: {} });
  const { result } = renderHook(() => useMatchupTimeline(2026, 8, ['CAR'], 0, true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.playerStats?.['123'].updatedAt).toBe(100);
  expect(result.current.data?.playerStats?.['123'].stats[0].value).toBe('80');
});

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchNFLActivity } from '@/api/nflActivity';
import { IDLE_POLL_MS, LIVE_POLL_MS, useAdaptiveMatchupPolling } from './useAdaptiveMatchupPolling';
vi.mock('@/api/nflActivity', () => ({ fetchNFLActivity: vi.fn() }));
const probe = vi.mocked(fetchNFLActivity);
let visible = true, online = true, updated = 0;
let refresh: ReturnType<typeof vi.fn<() => Promise<void>>>;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
function mount(enabled = true) {
  return renderHook(() => useAdaptiveMatchupPolling({ enabled, identity: 'espn:L1:2026', season: 2026, refresh, lastUpdated: () => updated }));
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  visible = true; online = true; updated = Date.now();
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  probe.mockReset();
  refresh = vi.fn(async () => { updated = Date.now(); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('polls live matchups every 60 seconds', async () => {
  probe.mockResolvedValue({ live: true, nextKickoff: null });
  const { result } = mount(); await flush();
  expect(result.current?.mode).toBe('live');
  await advance(LIVE_POLL_MS - 1); expect(refresh).not.toHaveBeenCalled();
  await advance(1); expect(refresh).toHaveBeenCalledTimes(1);
  await advance(LIVE_POLL_MS); expect(refresh).toHaveBeenCalledTimes(2);
});
it('polls idle matchups every three hours', async () => {
  probe.mockResolvedValue({ live: false, nextKickoff: null });
  const { result } = mount(); await flush();
  expect(result.current?.mode).toBe('idle');
  await advance(IDLE_POLL_MS - 1); expect(refresh).not.toHaveBeenCalled();
  await advance(1); expect(refresh).toHaveBeenCalledTimes(1);
  expect(probe).toHaveBeenCalledTimes(2);
});
it('wakes at kickoff and immediately switches to 60-second updates', async () => {
  probe.mockResolvedValueOnce({ live: false, nextKickoff: Date.now() + 300000 }).mockResolvedValue({ live: true, nextKickoff: null });
  const { result } = mount(); await flush();
  await advance(299999); expect(refresh).not.toHaveBeenCalled();
  await advance(1); expect(refresh).toHaveBeenCalledTimes(1); expect(result.current?.mode).toBe('live');
  await advance(LIVE_POLL_MS); expect(refresh).toHaveBeenCalledTimes(2);
});
it('takes a final score snapshot and switches to the three-hour cadence after games finish', async () => {
  probe.mockResolvedValueOnce({ live: true, nextKickoff: null }).mockResolvedValue({ live: false, nextKickoff: null });
  const { result } = mount(); await flush();
  await advance(LIVE_POLL_MS); expect(refresh).toHaveBeenCalledTimes(1); expect(result.current?.mode).toBe('idle');
  await advance(IDLE_POLL_MS - 1); expect(refresh).toHaveBeenCalledTimes(1);
  await advance(1); expect(refresh).toHaveBeenCalledTimes(2);
});
it('retains the last live cadence if the status feed fails', async () => {
  probe.mockResolvedValueOnce({ live: true, nextKickoff: null }).mockRejectedValue(new Error('status offline'));
  const { result } = mount(); await flush();
  await advance(LIVE_POLL_MS); await advance(LIVE_POLL_MS);
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(result.current).toMatchObject({ mode: 'live', statusUnavailable: true });
});
it('uses a conservative 60-second cadence while initial status is unknown', async () => {
  probe.mockRejectedValue(new Error('status offline'));
  const { result } = mount(); await flush();
  await advance(LIVE_POLL_MS);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(result.current).toMatchObject({ mode: 'checking', statusUnavailable: true });
});
it('pauses while hidden or offline and catches up when available again', async () => {
  probe.mockResolvedValue({ live: true, nextKickoff: null });
  const { result } = mount(); await flush();
  act(() => { visible = false; document.dispatchEvent(new Event('visibilitychange')); });
  await advance(600000); expect(refresh).not.toHaveBeenCalled(); expect(probe).toHaveBeenCalledTimes(1);
  expect(result.current?.paused).toBe(true);
  act(() => { visible = true; document.dispatchEvent(new Event('visibilitychange')); }); await flush();
  expect(refresh).toHaveBeenCalledTimes(1);
  act(() => { online = false; window.dispatchEvent(new Event('offline')); });
  await advance(120000); expect(refresh).toHaveBeenCalledTimes(1);
  act(() => { online = true; window.dispatchEvent(new Event('online')); }); await flush();
  expect(refresh).toHaveBeenCalledTimes(2);
});
it('never overlaps a slow matchup request', async () => {
  probe.mockResolvedValue({ live: true, nextKickoff: null });
  let finish!: () => void;
  refresh = vi.fn(() => new Promise<void>(resolve => { finish = () => { updated = Date.now(); resolve(); }; }));
  mount(); await flush();
  await advance(LIVE_POLL_MS); await advance(LIVE_POLL_MS * 5);
  expect(refresh).toHaveBeenCalledTimes(1); expect(probe).toHaveBeenCalledTimes(2);
  await act(async () => finish());
  await advance(LIVE_POLL_MS); expect(refresh).toHaveBeenCalledTimes(2);
});
it('respects a recent manual refresh when scheduling the next update', async () => {
  probe.mockResolvedValue({ live: true, nextKickoff: null });
  mount(); await flush();
  await advance(59000); updated = Date.now();
  await advance(1000); expect(refresh).not.toHaveBeenCalled();
  await advance(59000); expect(refresh).toHaveBeenCalledTimes(1);
});
it('stops timers on unmount and ignores a late status response', async () => {
  let finish!: (value: { live: boolean; nextKickoff: null }) => void;
  probe.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  updated = 0;
  const { unmount } = mount(); unmount();
  await act(async () => finish({ live: true, nextKickoff: null }));
  await advance(IDLE_POLL_MS);
  expect(refresh).not.toHaveBeenCalled();
});
it('does not poll without an active league', async () => {
  mount(false); await advance(IDLE_POLL_MS);
  expect(probe).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
});

it('continues in a hidden tab with browser alerts enabled, but still pauses offline', async () => {
  visible = false;
  probe.mockResolvedValue({ live: true, nextKickoff: null });
  const { result, rerender } = renderHook(({ background }) => useAdaptiveMatchupPolling({ enabled: true, identity: 'L1', season: 2026, refresh, lastUpdated: () => updated, background }), { initialProps: { background: true } });
  await flush();
  expect(result.current?.paused).toBe(false);
  await advance(LIVE_POLL_MS);
  expect(refresh).toHaveBeenCalledTimes(1);
  act(() => { online = false; window.dispatchEvent(new Event('offline')); });
  await advance(LIVE_POLL_MS * 2);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(result.current?.paused).toBe(true);
  act(() => { online = true; window.dispatchEvent(new Event('online')); });
  await flush();
  expect(refresh).toHaveBeenCalledTimes(2);
  rerender({ background: false });
  await advance(LIVE_POLL_MS * 2);
  expect(result.current?.paused).toBe(true);
  expect(refresh).toHaveBeenCalledTimes(2);
});

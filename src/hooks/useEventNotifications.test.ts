import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEventNotifications } from './useEventNotifications';
import { BROWSER_ALERTS_KEY } from '@/utils/browserAlerts';
import type { NFLTimeline, MajorEvent } from '@/api/nflTimeline';

const now = Date.parse('2026-10-30T12:00:00Z');
let permission: NotificationPermission;
const request = vi.fn();
const deliveries: { title: string; options?: NotificationOptions }[] = [];
const event = (id: string, occurredAt = new Date(now - 60000).toISOString()): MajorEvent => ({ id, gameId: 'game1', game: 'BUF @ KC', kickoff: '', occurredAt, quarter: 2, clock: '1:00', kind: 'Touchdown', description: `Event ${id}` });
const data = (events: MajorEvent[]): NFLTimeline => ({ fetchedAt: now, events, warnings: [], games: [{ id: 'game1', name: 'BUF @ KC', kickoff: '', teams: ['BUF', 'KC'], state: 'in', quarter: 2, clock: '1:00', detail: 'Live' }] });
beforeEach(() => {
  localStorage.clear(); deliveries.length = 0; permission = 'default'; request.mockReset();
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.stubGlobal('isSecureContext', true);
  class FakeNotification {
    static get permission() { return permission; }
    static requestPermission = request;
    onclick: (() => void) | null = null;
    close() {}
    constructor(title: string, options?: NotificationOptions) { deliveries.push({ title, options }); }
  }
  vi.stubGlobal('Notification', FakeNotification);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('requests permission only on enable and does not alert for existing events', async () => {
  request.mockImplementation(async () => { permission = 'granted'; return permission; });
  const { result, rerender } = renderHook(({ timeline }) => useEventNotifications('week8', timeline, false), { initialProps: { timeline: data([event('old')]) } });
  expect(request).not.toHaveBeenCalled(); expect(deliveries).toEqual([]);
  await act(async () => result.current.toggle());
  expect(request).toHaveBeenCalledTimes(1);
  expect(result.current.enabled).toBe(true);
  expect(deliveries).toHaveLength(1); // Explicit enable confirmation only.
  rerender({ timeline: data([event('old'), event('new')]) });
  expect(deliveries).toHaveLength(2);
  expect(deliveries[1].options?.body).toBe('Event new');
  rerender({ timeline: data([event('old'), event('new')]) });
  expect(deliveries).toHaveLength(2);
  await act(async () => result.current.toggle());
  rerender({ timeline: data([event('third')]) });
  expect(deliveries).toHaveLength(2);
});

it('uses the first fresh load as a baseline and batches new events without replaying on remount or week changes', () => {
  permission = 'granted'; localStorage.setItem(BROWSER_ALERTS_KEY, 'enabled');
  const { rerender, unmount } = renderHook(({ timeline, key }) => useEventNotifications(key, timeline, false), { initialProps: { timeline: null as NFLTimeline | null, key: 'week8' } });
  rerender({ timeline: data([event('old')]), key: 'week8' });
  expect(deliveries).toHaveLength(0);
  rerender({ timeline: data([event('old'), event('new1'), event('new2')]), key: 'week8' });
  expect(deliveries).toHaveLength(1); expect(deliveries[0].title).toBe('2 new matchup events');
  rerender({ timeline: data([event('other-week')]), key: 'week9' });
  expect(deliveries).toHaveLength(1);
  unmount();
  renderHook(() => useEventNotifications('week8', data([event('new1'), event('new2')]), false));
  expect(deliveries).toHaveLength(1);
});

it.each(['denied', 'default'] as const)('handles %s permission without enabling alerts', async answer => {
  request.mockImplementation(async () => { permission = answer; return permission; });
  const { result } = renderHook(() => useEventNotifications('week8', data([]), false));
  await act(async () => result.current.toggle());
  expect(result.current.permission).toBe(answer); expect(result.current.enabled).toBe(false); expect(deliveries).toHaveLength(0);
});

it('does not alert for historical events that appear after a partial feed recovers', () => {
  permission = 'granted'; localStorage.setItem(BROWSER_ALERTS_KEY, 'enabled');
  const { rerender } = renderHook(({ timeline }) => useEventNotifications('week8', timeline, false), { initialProps: { timeline: data([]) } });
  rerender({ timeline: data([event('yesterday', '2026-10-29T12:00:00Z')]) });
  expect(deliveries).toHaveLength(0);
});

it('shows a clear unsupported state without requesting permission', () => {
  vi.stubGlobal('Notification', undefined);
  const { result } = renderHook(() => useEventNotifications('week8', data([]), false));
  expect(result.current.permission).toBe('unsupported'); expect(result.current.enabled).toBe(false);
});

it('reports a browser delivery failure instead of claiming alerts are enabled', async () => {
  permission = 'granted';
  vi.stubGlobal('Notification', class { static permission = 'granted'; constructor() { throw new Error('Unavailable'); } });
  const { result } = renderHook(() => useEventNotifications('week8', data([]), false));
  await act(async () => result.current.toggle());
  expect(result.current.enabled).toBe(false); expect(result.current.problem).toMatch(/could not be enabled/);
});

it('does not send event notifications when no relevant NFL game is in progress', () => {
  permission = 'granted'; localStorage.setItem(BROWSER_ALERTS_KEY, 'enabled');
  const { rerender } = renderHook(({ timeline }) => useEventNotifications('week8', timeline, false), { initialProps: { timeline: data([]) } });
  rerender({ timeline: { ...data([event('final')]), games: [{ ...data([]).games![0], state: 'post' }] } });
  expect(deliveries).toHaveLength(0);
});

it('includes the league impact summary without replaying its initial baseline', () => {
  permission = 'granted'; localStorage.setItem(BROWSER_ALERTS_KEY, 'enabled');
  const describe = (play: MajorEvent) => `${play.description} — My League: likely helps`;
  const { rerender } = renderHook(({ timeline }) => useEventNotifications('impact', timeline, false, describe), { initialProps: { timeline: data([event('old')]) } });
  expect(deliveries).toHaveLength(0);
  rerender({ timeline: data([event('old'), event('new')]) });
  expect(deliveries).toHaveLength(1);
  expect(deliveries[0].options?.body).toBe('Event new — My League: likely helps');
});

it('filters notification batches before delivery and does not replay skipped events after a preference change', () => {
  permission = 'granted'; localStorage.setItem(BROWSER_ALERTS_KEY, 'enabled');
  const select = (events: MajorEvent[]) => events.filter(play => play.id === 'important');
  const { rerender } = renderHook(({ timeline, filter }) => useEventNotifications('priority', timeline, false, undefined, filter), { initialProps: { timeline: data([]), filter: select } });
  rerender({ timeline: data([event('other')]), filter: select }); expect(deliveries).toHaveLength(0);
  rerender({ timeline: data([event('other'), event('important')]), filter: select }); expect(deliveries).toHaveLength(1);
  expect(deliveries[0].options?.body).toBe('Event important');
  rerender({ timeline: data([event('other'), event('important')]), filter: events => events }); expect(deliveries).toHaveLength(1);
});

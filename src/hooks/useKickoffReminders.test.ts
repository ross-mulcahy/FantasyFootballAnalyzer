import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { kickoffChecks, useKickoffReminders } from './useKickoffReminders';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import type { NFLTimeline } from '@/api/nflTimeline';
const now = Date.parse('2026-11-01T17:50:00Z');
const context: SharedLeagueContext = { saved: { platform: 'espn', leagueId: '123', name: 'League', season: 2026 }, myTeamId: '1', snapshot: { platform: 'espn', leagueId: '123', season: 2026, week: 8, fetchedAt: now, teams: [{ id: '1', name: 'Mine', roster: [{ id: '1', name: 'Player', position: 'RB', slot: 'RB', nflTeam: 'CIN', availability: 'Out' }, { id: '0', name: 'Empty', position: '', slot: 'Flex', nflTeam: '' }] }], matchups: [] } };
const data: NFLTimeline = { fetchedAt: now, warnings: [], events: [], games: [{ id: 'g', name: 'CIN @ PIT', teams: ['CIN', 'PIT'], kickoff: '2026-11-01T18:00:00Z', state: 'pre', clock: '', quarter: 0, detail: 'Scheduled' }] };
const feeds = { '2026:8': { data, error: null } };
let notices: string[];
beforeEach(() => {
  localStorage.clear(); notices = []; vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('Notification', class { static permission = 'granted'; onclick = null; close() {} constructor(title: string) { notices.push(title); } });
  localStorage.setItem('ffa:browser-event-alerts:v1', 'enabled');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('refreshes first, reminds once per kickoff and deduplicates across remounts', async () => {
  const refresh = vi.fn(async () => {});
  const { rerender, unmount } = renderHook(() => useKickoffReminders([context], feeds, now, refresh));
  await waitFor(() => expect(notices).toHaveLength(1)); expect(refresh).toHaveBeenCalledTimes(1);
  rerender(); expect(notices).toHaveLength(1); unmount();
  renderHook(() => useKickoffReminders([context], feeds, now, refresh));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2)); expect(notices).toHaveLength(1);
});
it('skips past, distant, postponed and missing game statuses', () => {
  expect(kickoffChecks([context], feeds, now - 20 * 60000)).toEqual([]);
  expect(kickoffChecks([context], feeds, now + 11 * 60000)).toEqual([]);
  expect(kickoffChecks([context], { '2026:8': { data: { ...data, games: [{ ...data.games![0], detail: 'Postponed' }] }, error: null } }, now)).toEqual([]);
  expect(kickoffChecks([context], {}, now)).toEqual([]);
});
it('does not notify without the existing browser opt-in or when checks are disabled', async () => {
  localStorage.setItem('ffa:browser-event-alerts:v1', 'disabled'); const refresh = vi.fn(async () => {});
  const { unmount } = renderHook(() => useKickoffReminders([context], feeds, now, refresh));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce()); expect(notices).toHaveLength(0); unmount();
  localStorage.setItem('ffa:experience:v1', JSON.stringify({ kickoffAlerts: false, alertPriority: 'all' })); refresh.mockClear();
  renderHook(() => useKickoffReminders([context], feeds, now, refresh)); expect(refresh).not.toHaveBeenCalled();
});
it('keeps clean starting lineups quiet while still checking fresh data', async () => {
  const clean = { ...context, snapshot: { ...context.snapshot!, teams: [{ id: '1', name: 'Mine', roster: [{ ...context.snapshot!.teams[0].roster![0], availability: undefined }] }] } };
  const refresh = vi.fn(async () => {}); renderHook(() => useKickoffReminders([clean], feeds, now, refresh));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce()); expect(notices).toHaveLength(0);
});

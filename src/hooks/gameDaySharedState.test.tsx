import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameDayContext, useGameDay, useGameDayState } from './useGameDay';
import { fetchNFLActivity } from '@/api/nflActivity';
import { loadGameDay } from '@/api/gameDay';
import { saveGameDayCache } from '@/utils/gameDayCache';
import type { League } from '@/types';
import type { GameDaySnapshot } from '@/types/gameDay';
vi.mock('@/api/nflActivity', () => ({ fetchNFLActivity: vi.fn() }));
vi.mock('@/api/gameDay', () => ({ loadGameDay: vi.fn() }));
const league = { platform: 'espn', id: '1', season: 2026 } as League;
const snapshot: GameDaySnapshot = { detailVersion: 1, platform: 'espn', leagueId: '1', season: 2026, week: 8, fetchedAt: 0, teams: [{ id: '1', name: 'One', roster: [] }], matchups: [] };
function Consumer({ label }: { label: string }) {
  const state = useGameDay(league, null);
  return <div><span data-testid={label}>{state.snapshot?.fetchedAt}</span><button onClick={() => void state.refresh()}>Refresh {label}</button></div>;
}
function Root({ page = 'game-day' }: { page?: string }) {
  const state = useGameDayState(league, null, { poll: true });
  return <GameDayContext.Provider value={state}><Consumer key={page} label={page} /><Consumer label="other" /></GameDayContext.Provider>;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  localStorage.clear(); saveGameDayCache({ ...snapshot, fetchedAt: Date.now() });
  vi.mocked(fetchNFLActivity).mockReset().mockResolvedValue({ live: true, nextKickoff: null });
  vi.mocked(loadGameDay).mockReset().mockImplementation(async () => ({ ...snapshot, fetchedAt: Date.now() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('uses one polling loop for multiple consumers and preserves it when changing tabs', async () => {
  const { rerender } = render(<Root />);
  await act(async () => { await Promise.resolve(); });
  expect(fetchNFLActivity).toHaveBeenCalledTimes(1);
  expect(loadGameDay).not.toHaveBeenCalled();
  rerender(<Root page="rosters" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(fetchNFLActivity).toHaveBeenCalledTimes(2);
  expect(loadGameDay).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('rosters').textContent).toBe(screen.getByTestId('other').textContent);
});
it('manual refresh updates the shared snapshot without creating another poller', async () => {
  render(<Root />);
  await act(async () => { await Promise.resolve(); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh game-day' })); });
  expect(loadGameDay).toHaveBeenCalledTimes(1);
  expect(fetchNFLActivity).toHaveBeenCalledTimes(1);
});

import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudioRivalries, type StudioRivalryTarget } from './useStudioRivalries';

const loadSleeper = vi.fn();
vi.mock('@/api/sleeper', () => ({ loadHeadToHeadRecords: (...args: unknown[]) => loadSleeper(...args) }));
vi.mock('@/api/espn', () => ({ loadHeadToHeadRecords: vi.fn() }));
vi.mock('@/api/yahoo', () => ({ loadHeadToHeadRecords: vi.fn() }));

const target: StudioRivalryTarget = { key: 'sleeper:123:2026:1:2:9', league: { platform: 'sleeper', leagueId: '123', season: 2026, name: 'Sunday Syndicate' }, teamId: '1', own: "Sam's Spudz", opponent: 'Football Sweets', opponentOwnerId: 'owner-2', season: 2026, week: 9 };

beforeEach(() => { sessionStorage.clear(); loadSleeper.mockReset(); });

it('loads a prior rivalry once per team and reuses its session archive', async () => {
  loadSleeper.mockResolvedValue({ records: new Map([['owner-2', { opponentId: 'owner-2', opponentName: 'Football Sweets', wins: 1, losses: 0, ties: 0, pointsFor: 120, pointsAgainst: 110,
    matchups: [{ season: 2025, week: 8, teamScore: 120, opponentScore: 110, won: true }] }]]), teamName: "Sam's Spudz" });
  const first = renderHook(() => useStudioRivalries([target]));
  await waitFor(() => expect(first.result.current).toMatchObject([{ wins: 1, losses: 0, opponent: 'Football Sweets' }]));
  first.unmount();
  const second = renderHook(() => useStudioRivalries([target]));
  await waitFor(() => expect(second.result.current).toMatchObject([{ wins: 1, losses: 0 }]));
  expect(loadSleeper).toHaveBeenCalledTimes(1);
});

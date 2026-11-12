import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import type { League } from '@/types';
import { completedMatchups } from '@/utils/completedMatchups';
import { leagueInjuryLuck } from '@/utils/leagueInjuryLuck';
import { BlueTentPage } from './BlueTentPage';

vi.mock('@/utils/completedMatchups', () => ({ completedMatchups: vi.fn() }));
vi.mock('@/utils/leagueInjuryLuck', () => ({ leagueInjuryLuck: vi.fn() }));

const league = { id: 'L', name: 'Sunday League', season: 2026, platform: 'sleeper', teams: [{ id: 'a', name: 'Team A' }, { id: 'b', name: 'Team B' }] } as League;

beforeEach(() => {
  vi.mocked(completedMatchups).mockReturnValue([{ week: 1, team1Id: 'a', team2Id: 'b', team1Points: 90, team2Points: 95 }]);
  vi.mocked(leagueInjuryLuck).mockReturnValue([
    { teamId: 'a', gamesMissed: 1, valueLost: 8, players: [{ playerId: 'p1', name: 'First Player', position: 'RB', weeksMissed: 1, missedWeeks: [2], perGame: 18, replacementPerGame: 10, valueLost: 8 }] },
    { teamId: 'b', gamesMissed: 2, valueLost: 22, players: [{ playerId: 'p2', name: 'Second Player', position: 'WR', acquisition: 'waiver', weeksMissed: 2, missedWeeks: [2, 3], perGame: 21, replacementPerGame: 10, valueLost: 22 }] },
  ]);
});

it('ranks teams by estimated cost and reveals player weeks without presenting them as confirmed injuries', () => {
  render(<MemoryRouter><BlueTentPage league={league} /></MemoryRouter>);
  const board = screen.getByRole('region', { name: 'Injury cost rankings' });
  const rows = within(board).getAllByText(/Team [AB]/);
  expect(rows.map(row => row.textContent)).toEqual(['Team B', 'Team A']);
  fireEvent.click(within(board).getByText('Team B'));
  expect(within(board).getByText('Second Player')).toBeInTheDocument();
  expect(within(board).getByText('WK 3')).toBeInTheDocument();
  expect(within(board).getByText(/waiver \/ free agent/)).toBeInTheDocument();
  expect(screen.getByText(/Historical absences can include non-injury reasons/)).toBeInTheDocument();
});

it('explains missing coverage instead of reporting a clean medical board', () => {
  vi.mocked(leagueInjuryLuck).mockReturnValue([]);
  render(<MemoryRouter><BlueTentPage league={league} /></MemoryRouter>);
  expect(screen.getByText(/does not have enough completed-week, player-game, and acquisition history/)).toBeInTheDocument();
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import type { NFLTimeline } from '@/api/nflTimeline';
import { GameDayRecap, LineupWarnings } from './GameDayInsights';
const now = Date.parse('2026-11-02T23:00Z');
const context: SharedLeagueContext = { saved: { platform: 'sleeper', leagueId: 'L', name: 'My League', season: 2026 }, myTeamId: '1', snapshot: { platform: 'sleeper', leagueId: 'L', season: 2026, week: 8, fetchedAt: now, teams: [ { id: '1', name: 'Mine', roster: [{ id: '1', name: 'Player One', position: 'RB', slot: 'RB', nflTeam: 'CIN', points: 20, availability: 'Out' }] }, { id: '2', name: 'Theirs', roster: [{ id: '2', name: 'Player Two', position: 'RB', slot: 'RB', nflTeam: 'PIT', points: 10 }] } ], matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: 20, team2Points: 10, period: 'Week 8' }] } };
const data: NFLTimeline = { fetchedAt: now, warnings: [], events: [], games: [{ id: 'g', name: 'CIN @ PIT', teams: ['CIN', 'PIT'], kickoff: '', state: 'post', detail: 'Final', quarter: 4, clock: '0:00' }] };
const feeds = { '2026:8': { data, error: null } };
beforeEach(() => localStorage.clear()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('links a warning to the full roster with its league and team context and supports minimising', () => {
  render(<MemoryRouter><LineupWarnings contexts={[context]} feeds={{ '2026:8': { data: { ...data, games: data.games!.map(game => ({ ...game, state: 'in' })) }, error: null } }} now={now} /></MemoryRouter>);
  expect(screen.getByText('Player One: Out')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View roster →' })).toHaveAttribute('href', '/teams?league=sleeper%3AL&year=2026&team=1');
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Lineup Warnings · 1' }));
  expect(screen.getByText('Player One: Out')).not.toBeVisible();
});
it('keeps earlier recaps available after moving to a new week and excludes another selected team', async () => {
  const { rerender } = render(<MemoryRouter><GameDayRecap contexts={[context]} feeds={feeds} now={now} /></MemoryRouter>);
  await screen.findByLabelText('Wins: 1');
  const next = { ...context, snapshot: { ...context.snapshot!, week: 9, fetchedAt: now + 1 } };
  rerender(<MemoryRouter><GameDayRecap contexts={[next]} feeds={{}} now={now} /></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText('Recap week')).toHaveValue('2026:9'));
  fireEvent.change(screen.getByLabelText('Recap week'), { target: { value: '2026:8' } });
  expect(screen.getByLabelText('Wins: 1')).toBeInTheDocument();
  expect(screen.getByText('Player One')).toBeInTheDocument();
  rerender(<MemoryRouter><GameDayRecap contexts={[{ ...next, myTeamId: undefined }]} feeds={{}} now={now} /></MemoryRouter>);
  expect(screen.queryByLabelText('Recap week')).not.toBeInTheDocument();
});
it('continues showing the current recap if local storage cannot save history', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  render(<MemoryRouter><GameDayRecap contexts={[context]} feeds={feeds} now={now} /></MemoryRouter>);
  expect(await screen.findByRole('status')).toHaveTextContent('could not save recap history');
  expect(screen.getByText('Player One')).toBeInTheDocument();
});

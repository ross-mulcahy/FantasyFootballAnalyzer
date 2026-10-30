import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { GameDayRecapPage } from './GameDayRecapPage';
import { rememberSavedLeague } from '@/utils/savedLeagues';
import { buildRecap, loadRecaps, saveRecaps } from '@/utils/gameDayInsights';
import type { League } from '@/types';
const league = { platform: 'espn', id: 'A', season: 2026, name: 'League A', teams: [{ id: '1', name: 'Mine', isMyTeam: true }] } as League;
beforeEach(() => localStorage.clear()); afterEach(cleanup);
it('opens without a connected league and links back to Game Day and Settings', () => {
  render(<MemoryRouter><GameDayRecapPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Game Day Recap', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Game Day' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Connect leagues in Settings' })).toHaveAttribute('href', '/settings');
});
it('reads existing local history without replacing it with incomplete live data', () => {
  rememberSavedLeague(league);
  const rows = buildRecap([{ saved: { platform: 'espn', leagueId: 'A', season: 2026, name: 'League A' }, myTeamId: '1', snapshot: { platform: 'espn', leagueId: 'A', season: 2026, week: 8, fetchedAt: 1000, teams: [{ id: '1', name: 'Mine', roster: [] }, { id: '2', name: 'Theirs', roster: [] }], matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: 110, team2Points: 100, period: 'Week 8' }] } }], {}, 1000).map(row => ({ ...row, finished: true }));
  saveRecaps(rows);
  render(<MemoryRouter><GameDayRecapPage /></MemoryRouter>);
  expect(screen.getByLabelText('League A recap')).toHaveTextContent('110.00');
  expect(screen.getByLabelText('League A recap')).toHaveTextContent('100.00');
  expect(screen.getByLabelText('Wins: 1')).toBeInTheDocument();
  expect(screen.getByText(/Saved snapshot:/)).toBeInTheDocument();
  expect(loadRecaps()).toEqual(rows);
});

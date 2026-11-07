import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { League } from '@/types';
import { cacheLeague } from '@/utils/leagueCache';
import { loadSavedLeagues, rememberSavedLeague } from '@/utils/savedLeagues';
import { LeagueSetupFinish } from './LeagueSetupFinish';

const league = {
  id: '123', platform: 'sleeper', name: 'Sunday League', season: 2026,
  draftType: 'snake', scoringType: 'ppr', totalTeams: 2, isLoaded: true,
  teams: [{ id: '1', name: 'My Team', isMyTeam: true }, { id: '2', name: 'Another Team' }],
} as League;

beforeEach(() => localStorage.clear());

it('confirms the detected team and saves a changed choice before Game Day', () => {
  cacheLeague(league);
  rememberSavedLeague(league);
  const onGoGameDay = vi.fn();
  render(<LeagueSetupFinish league={league} onAddAnother={vi.fn()} onGoGameDay={onGoGameDay} />);
  const chooser = screen.getByRole('combobox', { name: 'My team' });
  expect(chooser).toHaveValue('1');
  fireEvent.change(chooser, { target: { value: '2' } });
  expect(loadSavedLeagues()[0].teamId).toBe('2');
  fireEvent.click(screen.getByRole('button', { name: /Go to Game Day/ }));
  expect(onGoGameDay).toHaveBeenCalledWith(true);
});

it('offers another league and explains spectator mode when no team is identified', () => {
  const spectatorLeague = { ...league, teams: league.teams.map(team => ({ ...team, isMyTeam: false })) };
  cacheLeague(spectatorLeague);
  rememberSavedLeague(spectatorLeague);
  const onAddAnother = vi.fn(), onGoGameDay = vi.fn();
  render(<LeagueSetupFinish league={spectatorLeague} onAddAnother={onAddAnother} onGoGameDay={onGoGameDay} />);
  expect(screen.getByRole('combobox', { name: 'My team' })).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('personal alerts will wait');
  fireEvent.click(screen.getByRole('button', { name: 'Add another league' }));
  expect(onAddAnother).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: /Watch this league/ }));
  expect(onGoGameDay).toHaveBeenCalledWith(false);
});

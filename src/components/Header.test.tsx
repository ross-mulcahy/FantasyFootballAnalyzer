import { beforeEach, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { League } from '@/types';
import { Header } from './Header';
import { rememberSavedLeague } from '@/utils/savedLeagues';
const league = { id: 'l1', platform: 'sleeper', name: 'Test League', season: 2026, draftType: 'snake', teams: [], scoringType: 'ppr', totalTeams: 12, isLoaded: true } as League;
beforeEach(() => localStorage.clear());
function mount(path = '/', connected = true) { return render(<MemoryRouter initialEntries={[path]}><Header league={connected ? league : null} /></MemoryRouter>); }
it('groups the full connected command navigation and keeps matchups league-scoped', () => {
  mount('/trades');
  const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  for (const group of ['CONTROL ROOM', 'FRONT OFFICE', 'TELEMETRY', 'THE VAULT']) expect(nav.getByRole('heading', { name: group })).toBeInTheDocument();
  expect(nav.getByRole('link', { name: 'League Matchups' })).toHaveAttribute('href', '/game-day?league=sleeper%3Al1&year=2026');
  expect(nav.getByRole('link', { name: 'Trades' })).toHaveAttribute('aria-current', 'page');
  expect(nav.getByRole('link', { name: 'PDF Export' })).toHaveAttribute('href', '/export');
});
it('offers working public prep routes without exposing unavailable analysis actions', () => {
  mount('/rankings', false);
  expect(screen.getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Values' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Trades' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'PDF Export' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sync All Leagues' })).toBeDisabled();
});
it('keeps roster navigation active on canonical team detail links', () => {
  mount('/teams?team=2');
  expect(screen.getByRole('link', { name: 'Rosters' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Teams Dossier' })).not.toHaveAttribute('aria-current');
});
it('shows saved league pills with an honest unknown-data status', () => {
  rememberSavedLeague(league); mount();
  const dock = within(screen.getByRole('navigation', { name: 'League dock' }));
  expect(dock.getByRole('link', { name: /Test League/ })).toHaveAttribute('href', '/?league=sleeper%3Al1&year=2026');
  expect(dock.getByLabelText('Awaiting roster data')).toBeInTheDocument();
  expect(dock.getByRole('link', { name: 'All Leagues' })).toBeInTheDocument();
});
it('switches league context without leaving the current page or carrying a stale team', () => {
  rememberSavedLeague(league);
  mount('/trades?team=old&matchup=old');
  const dock = within(screen.getByRole('navigation', { name: 'League dock' }));
  expect(dock.getByRole('link', { name: /Test League/ })).toHaveAttribute('href', '/trades?league=sleeper%3Al1&year=2026');
});
it('keeps league buttons alphabetical regardless of saved or selected order', () => {
  rememberSavedLeague({ ...league, id: 'z', name: 'Zulu League' });
  rememberSavedLeague({ ...league, id: 'a', name: 'alpha league' });
  rememberSavedLeague({ ...league, id: 'b', name: 'Bravo League' });
  mount('/trades?league=sleeper%3Az&year=2026');
  const dock = within(screen.getByRole('navigation', { name: 'League dock' }));
  expect(dock.getAllByRole('link').map(link => link.textContent?.split('·')[0].trim())).toEqual([
    'All Leagues', 'alpha league', 'Bravo League', 'Zulu League',
  ]);
});
it('opens and closes the mobile navigation with an explicit toggle', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.getByRole('button', { name: 'Close navigation', expanded: true })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Rosters' }));
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
});

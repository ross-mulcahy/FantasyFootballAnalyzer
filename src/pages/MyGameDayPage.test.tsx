import { loadRecaps } from '@/utils/gameDayInsights';
import { useMatchupTimeline } from '@/hooks/useMatchupTimeline';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MyGameDayPage } from './MyGameDayPage';
import { GameDayContext, useGameDayState } from '@/hooks/useGameDay';
import { rememberSavedLeague, selectSavedLeagueTeam, loadSavedLeagues } from '@/utils/savedLeagues';
import { cacheLeague } from '@/utils/leagueCache';
import type { League } from '@/types';
import type { GameDaySnapshot } from '@/types/gameDay';
vi.mock('@/hooks/useMatchupTimeline', () => ({ useMatchupTimeline: vi.fn() }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn(() => false) }));
vi.mock('@/hooks/useGameDay', async original => ({ ...await original<typeof import('@/hooks/useGameDay')>(), useGameDayState: vi.fn() }));
const a: League = { id: 'A', platform: 'espn', season: 2026, name: 'ESPN League', draftType: 'snake', teams: [{ id: '1', name: 'My ESPN team', isMyTeam: true }, { id: '2', name: 'Opponent A' }, { id: '3', name: 'Other A' }, { id: '4', name: 'Other B' }], scoringType: 'ppr', totalTeams: 4, isLoaded: true };
const b: League = { ...a, id: 'B', platform: 'sleeper', name: 'Sleeper League', teams: [{ id: '1', name: 'Opponent B' }, { id: '2', name: 'My Sleeper team', isMyTeam: true }] };
const snapshot = (league: League): GameDaySnapshot => ({ platform: league.platform, leagueId: league.id, season: league.season, week: 8, fetchedAt: Date.parse('2026-10-30T12:00:00Z'), teams: league.teams.map(team => ({ ...team, roster: [] })), matchups: [{ id: 'm1', team1Id: '1', team2Id: '2', team1Points: 8.8, team2Points: 10, period: 'Week 8' }, ...(league.id === 'A' ? [{ id: 'm2', team1Id: '3', team2Id: '4', team1Points: 42, team2Points: 50, period: 'Week 8' }] : [])] });
const refresh = vi.fn(async () => {});
const state = (league: League) => ({ snapshot: snapshot(league), error: null, isRefreshing: false, cacheWarning: false, refresh, polling: null });
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.mocked(useMediaQuery).mockReturnValue(false);
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: null, loading: false, error: null, refresh: vi.fn() });
  vi.mocked(useGameDayState).mockImplementation(league => state(league!.id === 'A' ? a : b));
});
afterEach(cleanup);
const mount = () => render(<MemoryRouter><MyGameDayPage /></MemoryRouter>);
it('shows a Settings entry without a connect form when no leagues are saved', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Game Day', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Connect leagues in Settings' })).toHaveAttribute('href', '/settings');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('combines only my matchups across platforms and includes the league and season in detail links', () => {
  for (const league of [a, b]) { cacheLeague(league); rememberSavedLeague(league); }
  mount();
  const links = screen.getAllByRole('link', { name: /View matchup:/ });
  expect(links).toHaveLength(2);
  expect(screen.queryByText('Other A')).not.toBeInTheDocument();
  const url = new URL(links.find(link => link.getAttribute('href')?.includes('espn'))!.getAttribute('href')!, 'http://localhost');
  expect(url.searchParams.get('league')).toBe('espn:A'); expect(url.searchParams.get('year')).toBe('2026');
  expect(url.searchParams.has('matchup')).toBe(false);
  expect(screen.getAllByRole('link', { name: 'ESPN League' })[0]).toHaveAttribute('href', url.pathname + url.search);
  expect(screen.getAllByText('Your team')).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Refresh all' })).toHaveLength(1);
  expect(screen.queryByText(/Matchups update every/)).not.toBeInTheDocument();
});
it('asks for an unknown team in Settings instead of showing every matchup, then reflects the saved choice', () => {
  const unidentified = { ...a, teams: a.teams.map(team => ({ ...team, isMyTeam: false })) };
  cacheLeague(unidentified); rememberSavedLeague(unidentified);
  mount();
  expect(screen.getByRole('link', { name: 'Choose your team in Settings' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /View matchup:/ })).not.toBeInTheDocument();
  cleanup(); selectSavedLeagueTeam(loadSavedLeagues()[0], '3'); mount();
  expect(screen.getByRole('link', { name: 'View matchup: Other A vs Other B' })).toBeInTheDocument();
  expect(screen.queryByText('My ESPN team')).not.toBeInTheDocument();
});
it('reuses the current league state so its card does not create a second polling loop', () => {
  cacheLeague(a); rememberSavedLeague(a);
  render(<MemoryRouter><GameDayContext.Provider value={state(a)}><MyGameDayPage currentLeague={a} /></GameDayContext.Provider></MemoryRouter>);
  expect(vi.mocked(useGameDayState).mock.calls[0][2]).toMatchObject({ enabled: false });
  expect(screen.getByText('8.80')).toBeInTheDocument();
});
it('keeps cached league scores visible when a connection fails', () => {
  cacheLeague(a); rememberSavedLeague(a);
  vi.mocked(useGameDayState).mockReturnValue({ ...state(a), error: 'Login expired' });
  mount();
  expect(screen.getByText('8.80')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Reconnect in Settings' }).getAttribute('href')).toContain('/settings?reconnect=');
});

it('refreshes every visible league together, waits for all requests, and shows one conservative update time', async () => {
  for (const league of [a, b]) { cacheLeague(league); rememberSavedLeague(league); }
  let finishA!: () => void, finishB!: () => void;
  const refreshA = vi.fn(() => new Promise<void>(resolve => { finishA = resolve; }));
  const refreshB = vi.fn(() => new Promise<void>(resolve => { finishB = resolve; }));
  const older = Date.parse('2026-10-30T10:00:00Z');
  vi.mocked(useGameDayState).mockImplementation(league => ({ ...state(league!.id === 'A' ? a : b), snapshot: { ...snapshot(league!.id === 'A' ? a : b), fetchedAt: league!.id === 'A' ? older : older + 60000 }, refresh: league!.id === 'A' ? refreshA : refreshB }));
  const { container } = mount();
  expect(container.querySelectorAll('time')).toHaveLength(1);
  expect(container.querySelector('time')).toHaveAttribute('datetime', new Date(older).toISOString());
  fireEvent.click(screen.getByRole('button', { name: 'Refresh all' }));
  await waitFor(() => { expect(refreshA).toHaveBeenCalledTimes(1); expect(refreshB).toHaveBeenCalledTimes(1); });
  expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
  await act(async () => finishA());
  expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
  await act(async () => finishB());
  expect(screen.getByRole('button', { name: 'Refresh all' })).toBeEnabled();
});

it('keeps my team on the left and maps its score correctly when it is the second platform team', () => {
  cacheLeague(b); rememberSavedLeague(b); mount();
  const link = screen.getByRole('link', { name: 'View matchup: My Sleeper team vs Opponent B' });
  expect(link.children[0]).toHaveTextContent('My Sleeper team');
  expect(link.children[1].querySelectorAll('strong')[0]).toHaveTextContent('10.00');
  expect(link.children[1].querySelectorAll('strong')[1]).toHaveTextContent('8.80');
  expect(link.children[2]).toHaveTextContent('Opponent B');
});
it('defaults mobile to matchups and supports keyboard navigation between mounted panels', async () => {
  vi.mocked(useMediaQuery).mockReturnValue(true);
  cacheLeague(a); rememberSavedLeague(a); mount();
  const matchups = screen.getByRole('tab', { name: 'Matchups' });
  const players = screen.getByRole('tab', { name: /Shared Players/ });
  expect(matchups).toHaveAttribute('aria-selected', 'true');
  expect(document.getElementById('matchups-panel')).not.toHaveAttribute('hidden');
  expect(document.getElementById('players-panel')).toHaveAttribute('hidden');
  fireEvent.keyDown(matchups, { key: 'ArrowRight' });
  expect(players).toHaveFocus();
  expect(players).toHaveAttribute('aria-selected', 'true');
  expect(document.getElementById('matchups-panel')).toHaveAttribute('hidden');
  expect(document.getElementById('players-panel')).not.toHaveAttribute('hidden');
  expect(document.getElementById('matchups-panel')).toHaveTextContent('My ESPN team');
  fireEvent.keyDown(players, { key: 'Home' });
  expect(matchups).toHaveFocus();
  expect(matchups).toHaveAttribute('aria-selected', 'true');
});

it('reuses one weekly feed for live alerts and newest-first combined events, then hides alerts when idle', async () => {
  cacheLeague(a); rememberSavedLeague(a);
  const now = Date.now();
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g', name: 'CIN @ PIT', teams: ['CIN', 'PIT'], kickoff: '', state: 'in' as const, detail: '2nd quarter', quarter: 2, clock: '8:22' }], events: [1, 2].map(quarter => ({ id: `e${quarter}`, gameId: 'g', game: 'CIN @ PIT', kickoff: '', occurredAt: null, quarter, clock: '8:22', kind: 'Touchdown' as const, description: `Score in quarter ${quarter}` })) };
  vi.mocked(useMatchupTimeline).mockReturnValue({ data, loading: false, error: null, refresh: vi.fn() });
  const { rerender } = mount();
  await screen.findByRole('heading', { name: 'Latest Alerts' });
  const timeline = screen.getByRole('heading', { name: 'Major Events · Week 8' }).closest('section')!;
  expect(within(timeline).getAllByRole('listitem')[0]).toHaveTextContent('Score in quarter 2');
  expect(screen.getByRole('link', { name: /Full timeline/ })).toHaveAttribute('href', '#home-2026:8-timeline-heading');
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { ...data, games: data.games.map(game => ({ ...game, state: 'post' as const })) }, loading: false, error: null, refresh: vi.fn() });
  rerender(<MemoryRouter><MyGameDayPage /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Latest Alerts' })).not.toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Major Events · Week 8' })).toBeInTheDocument();
});

it('sorts and filters close projected matchups while retaining all league feeds and recap entries', async () => {
  for (const league of [a, b]) { cacheLeague(league); rememberSavedLeague(league); }
  vi.mocked(useGameDayState).mockImplementation(league => ({ ...state(league!.id === 'A' ? a : b), snapshot: { ...snapshot(league!.id === 'A' ? a : b), matchups: [{ ...snapshot(league!.id === 'A' ? a : b).matchups[0], team1Projection: 100, team2Projection: league!.id === 'A' ? 125 : 102 }] } }));
  mount();
  fireEvent.change(screen.getByLabelText('Sort matchups'), { target: { value: 'projected' } });
  expect(screen.getAllByRole('link', { name: /View matchup:/ })[0]).toHaveAccessibleName('View matchup: My Sleeper team vs Opponent B');
  fireEvent.click(screen.getByLabelText('Only close (≤10 pts)'));
  expect(screen.getAllByRole('link', { name: /View matchup:/ })).toHaveLength(1);
  expect(screen.getByText(/Close matchup · 2.00 pts projected/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Game Day Recap' })).not.toBeInTheDocument();
  await waitFor(() => expect(loadRecaps().map(row => row.league.name)).toEqual(expect.arrayContaining(['ESPN League', 'Sleeper League'])));
});

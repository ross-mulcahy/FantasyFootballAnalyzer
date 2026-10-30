import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { League } from '@/types';
import type { GameDaySnapshot } from '@/types/gameDay';
import { GameDayPage } from './GameDayPage';
import { RostersPage } from './RostersPage';
import { TeamsPage } from './TeamsPage';
import { useGameDay } from '@/hooks/useGameDay';
import { useMatchupTimeline } from '@/hooks/useMatchupTimeline';
import { matchupHref, matchupKey } from '@/utils/gameDayLinks';

vi.mock('@/hooks/useGameDay', () => ({ useGameDay: vi.fn() }));
vi.mock('@/hooks/useMatchupTimeline', () => ({ useMatchupTimeline: vi.fn() }));
afterEach(cleanup);
const league: League = { id: '1', platform: 'yahoo', name: 'Sunday League', season: 2026, draftType: 'snake', scoringType: 'ppr', totalTeams: 2, isLoaded: true, teams: [{ id: '1', name: 'Home Team' }, { id: '2', name: 'Away Team' }] };
const refresh = vi.fn();
const snapshot: GameDaySnapshot = {
  platform: 'yahoo', leagueId: '1', season: 2026, week: 10, fetchedAt: Date.now() - 60 * 60000,
  teams: [
    { id: '1', name: 'Home Team', roster: [
      { id: 'p1', name: 'Player One', position: 'QB', nflTeam: 'BUF', slot: 'QB' },
      { id: 'p3', name: 'Bench Player', position: 'WR', nflTeam: 'DET', slot: 'BN' },
    ] },
    { id: '2', name: 'Away Team', roster: [{ id: 'p2', name: 'Player Two', position: 'WR', nflTeam: 'DET', slot: 'WR' }] },
  ],
  matchups: [{ id: 'm1', team1Id: '1', team2Id: '2', team1Points: 0, team2Points: null, period: 'Week 10 matchup total' }],
};

beforeEach(() => {
  localStorage.clear();
  refresh.mockClear();
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { fetchedAt: Date.now(), events: [], warnings: [], games: [] }, loading: false, error: null, refresh: vi.fn() });
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: 'Offline', cacheWarning: false, snapshot });
});

function renderAt(path = '/game-day') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/game-day" element={<GameDayPage league={league} credentials={null} />} />
    <Route path="/rosters" element={<RostersPage league={league} credentials={null} />} />
    <Route path="/teams" element={<TeamsPage league={league} />} />
  </Routes></MemoryRouter>);
}

it('shows matchup links without roster tables on Game Day', () => {
  renderAt();
  expect(screen.getByRole('heading', { level: 1, name: 'Game Day' })).toBeInTheDocument();
  expect(screen.getByText('0.00')).toBeInTheDocument();
  expect(screen.getByText(/over 15 minutes old/)).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Showing the last saved snapshot');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View matchup: Home Team vs Away Team' })).toHaveAttribute('href', matchupHref(snapshot.matchups[0]));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh rosters & scores' }));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('opens matchup details, links to a full roster, and returns to all matchups', () => {
  renderAt();
  fireEvent.click(screen.getByRole('link', { name: 'View matchup: Home Team vs Away Team' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Matchup' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Home Team starting lineup' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Away Team starting lineup' })).toBeInTheDocument();
  expect(screen.queryByText('Bench Player')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /All matchups/ }));
  expect(screen.getByRole('heading', { level: 1, name: 'Game Day' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'View matchup: Home Team vs Away Team' }));
  fireEvent.click(screen.getAllByRole('link', { name: 'View full roster →' })[0]);
  expect(screen.getByRole('heading', { level: 2, name: 'Home Team' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Current Roster' })).toBeInTheDocument();
  expect(screen.getByText('Bench Player')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Matchups' })).not.toBeInTheDocument();
});

it('restores a selected roster from its URL and changes teams independently of matchups', () => {
  renderAt('/rosters?team=2');
  expect(screen.getByRole('heading', { level: 2, name: 'Away Team' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Current Roster' })).toBeInTheDocument();
  expect(screen.queryByText('Player One')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Team' }), { target: { value: '1' } });
  expect(screen.getByRole('heading', { level: 2, name: 'Home Team' })).toBeInTheDocument();
  expect(screen.getByText('Bench Player')).toBeInTheDocument();
});

it('opens a bookmarked matchup and handles a matchup missing after refresh', () => {
  renderAt(matchupHref(snapshot.matchups[0]));
  expect(screen.getByText('Player One')).toBeInTheDocument();
  cleanup();
  renderAt('/game-day?matchup=missing');
  expect(screen.getByText(/not in the current snapshot/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to all matchups' })).toHaveAttribute('href', '/game-day');
});

it('keeps matchup URLs stable when provider IDs or home/away order change', () => {
  expect(matchupKey(snapshot.matchups[0])).toBe(matchupKey({ ...snapshot.matchups[0], id: 'new', team1Id: '2', team2Id: '1' }));
});

it('handles an unpaired team without an invented opposing lineup', () => {
  const unpaired = { ...snapshot.matchups[0], team2Id: null };
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: null, cacheWarning: false, snapshot: { ...snapshot, matchups: [unpaired] } });
  renderAt(matchupHref(unpaired));
  expect(screen.getByText('No opponent listed')).toBeInTheDocument();
  expect(screen.getAllByRole('table')).toHaveLength(1);
});

it('full roster links point at the canonical team view and preserve league and season', () => {
  renderAt(matchupHref(snapshot.matchups[0]));
  const target = new URL(screen.getAllByRole('link', { name: 'View full roster →' })[0].getAttribute('href')!, 'http://localhost');
  expect(target.pathname).toBe('/teams');
  expect(target.searchParams.get('team')).toBe('1');
  expect(target.searchParams.get('league')).toBe('yahoo:1');
  expect(target.searchParams.get('year')).toBe('2026');
});

it('shows weekly points, projections, zero-valued stats, and the timeline', () => {
  const enriched = structuredClone(snapshot);
  enriched.detailVersion = 1;
  enriched.teams[0].roster![0] = { ...enriched.teams[0].roster![0], points: 0, projection: 20.5, stats: [{ label: 'Pass yards', value: 0 }] };
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: null, cacheWarning: false, snapshot: enriched });
  renderAt(matchupHref(enriched.matchups[0]));
  const table = within(screen.getByRole('table', { name: 'Home Team starting lineup' }));
  expect(table.getByText('0.00')).toBeInTheDocument();
  expect(table.getByText('20.50')).toBeInTheDocument();
  fireEvent.click(table.getByText('Week 10 stats'));
  expect(table.getByText('Pass yards')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Major Events · Week 10' })).toBeInTheDocument();
});

it('places alerts above lineups and marks a player whose NFL game is live', () => {
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { fetchedAt: Date.now(), events: [], warnings: [], games: [{ id: 'g1', name: 'BUF @ KC', kickoff: '', teams: ['BUF', 'KC'], state: 'in', quarter: 2, clock: '8:22', detail: '8:22 - 2nd' }] }, loading: false, error: null, refresh: vi.fn() });
  renderAt(matchupHref(snapshot.matchups[0]));
  const alerts = screen.getByRole('region', { name: 'Latest Alerts' });
  const table = screen.getByRole('table', { name: 'Home Team starting lineup' });
  expect(alerts.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(table).getByText(/Game live/)).toHaveAttribute('title', expect.stringContaining('does not indicate the player is on the field'));
  expect(within(screen.getByRole('table', { name: 'Away Team starting lineup' })).queryByText(/Game live/)).not.toBeInTheDocument();
});

it('places the score above alerts and player breakdowns below, with independent persistent minimisation', () => {
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { fetchedAt: Date.now(), events: [], warnings: [], games: [{ id: 'live', name: 'BUF @ KC', kickoff: '', teams: ['BUF'], state: 'in', detail: 'Live', quarter: 2, clock: '8:00' }] }, loading: false, error: null, refresh: vi.fn() });
  const enriched = { ...snapshot, detailVersion: 1 as const };
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: null, cacheWarning: false, snapshot: enriched });
  const { unmount } = renderAt(matchupHref(snapshot.matchups[0]));
  const score = screen.getByRole('region', { name: 'Matchup score' });
  const alerts = screen.getByRole('region', { name: 'Latest Alerts' });
  const lineup = screen.getByRole('region', { name: 'Home Team lineup' });
  expect(score.compareDocumentPosition(alerts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(alerts.compareDocumentPosition(lineup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Latest Alerts' }));
  expect(screen.getByRole('button', { name: 'Expand Latest Alerts' })).toHaveAttribute('aria-expanded', 'false');
  expect(within(alerts).queryByRole('link', { name: /Full timeline/ })).not.toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Home Team starting lineup' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Home Team lineup' }));
  expect(screen.queryByRole('table', { name: 'Home Team starting lineup' })).not.toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Away Team starting lineup' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Matchup score' }));
  expect(within(score).queryByText('0.00')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Major Events · Week 10' }));
  unmount();
  renderAt(matchupHref(snapshot.matchups[0]));
  expect(screen.getByRole('button', { name: 'Expand Latest Alerts' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Expand Latest Alerts' }));
  expect(screen.getByRole('link', { name: /Full timeline/ })).toBeVisible();
});

it('shows weekly projection and player game counts in the score box with a provider projection override', () => {
  const enriched = structuredClone(snapshot);
  enriched.teams[0].roster![0].projection = 22;
  enriched.matchups[0].team2Projection = 18.5;
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: null, cacheWarning: false, snapshot: enriched });
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { fetchedAt: Date.now(), events: [], warnings: [], games: [
    { id: 'g1', name: 'BUF @ KC', kickoff: '', teams: ['BUF', 'KC'], state: 'post', quarter: 4, clock: '0:00', detail: 'Final' },
    { id: 'g2', name: 'DET @ MIN', kickoff: '', teams: ['DET', 'MIN'], state: 'in', quarter: 2, clock: '8:22', detail: 'Live' },
  ] }, loading: false, error: null, refresh: vi.fn() });
  renderAt(matchupHref(enriched.matchups[0]));
  const score = within(screen.getByRole('region', { name: 'Matchup score' }));
  expect(score.getByText('22.00')).toBeInTheDocument();
  expect(score.getByText('18.50')).toBeInTheDocument();
  const home = score.getByLabelText('Home Team player progress');
  const away = score.getByLabelText('Away Team player progress');
  expect(home.querySelector('dd')?.textContent).toBe('1');
  expect(away.querySelectorAll('dd')[1]?.textContent).toBe('1');
});

it('hides idle alerts and the removed note, while preserving empty slots and marking unscheduled players', () => {
  const enriched = structuredClone(snapshot);
  enriched.teams[0].roster!.push({ id: '0', name: 'Empty slot', position: '', nflTeam: '', slot: 'D/ST', points: 0, projection: 0 });
  vi.mocked(useGameDay).mockReturnValue({ refresh, isRefreshing: false, error: null, cacheWarning: false, snapshot: enriched });
  renderAt(matchupHref(enriched.matchups[0]));
  expect(screen.queryByRole('region', { name: 'Latest Alerts' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Starting lineup only. Counts follow/)).not.toBeInTheDocument();
  const home = within(screen.getByRole('table', { name: 'Home Team starting lineup' }));
  expect(home.getByText('Empty slot')).toBeInTheDocument();
  expect(home.getByText('No player selected')).toBeInTheDocument();
  expect(home.getByText('Bye / no game scheduled')).toBeInTheDocument();
});

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SharedPlayersSidebar } from './SharedPlayersSidebar';
import { useMatchupTimeline } from '@/hooks/useMatchupTimeline';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import type { NFLTimeline } from '@/api/nflTimeline';
vi.mock('@/hooks/useMatchupTimeline', () => ({ useMatchupTimeline: vi.fn() }));
const now = Date.parse('2026-10-30T12:00Z');
const refresh = vi.fn();
const contexts: SharedLeagueContext[] = ['espn', 'sleeper'].map((platform, i) => ({
  saved: { platform: platform as 'espn' | 'sleeper', leagueId: String(i), name: `League ${i}`, season: 2026 }, myTeamId: '1', snapshot: {
    platform: platform as 'espn' | 'sleeper', leagueId: String(i), season: 2026, week: 8, fetchedAt: now,
    teams: [{ id: '1', name: 'Mine', roster: [{ id: i ? '7564' : '4362628', name: "Ja'Marr Chase", nflTeam: 'CIN', position: 'WR', slot: 'WR', points: i ? 12 : 6, projection: 20 }] }, { id: '2', name: 'Theirs', roster: [{ id: i ? 'BAL' : '33', name: 'Ravens D/ST', nflTeam: 'BAL', position: 'DEF', slot: 'D/ST' }] }],
    matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: 0, team2Points: 0, period: 'Week 8' }],
  },
}));
const data: NFLTimeline = { fetchedAt: now, warnings: [], games: [
  { id: 'g1', name: 'CIN @ PIT', teams: ['CIN', 'PIT'], kickoff: '', state: 'in', detail: '8:22 - 2nd', quarter: 2, clock: '8:22' },
  { id: 'g2', name: 'BAL @ BUF', teams: ['BAL', 'BUF'], kickoff: '', state: 'pre', detail: 'Sunday', quarter: 0, clock: '' },
], events: [{ id: 'e1', gameId: 'g1', game: 'CIN @ PIT', kickoff: '', occurredAt: null, quarter: 2, clock: '8:22', kind: 'Touchdown', description: "Ja'Marr Chase 24 Yd touchdown reception" }], playerStats: { '4362628': { name: "Ja'Marr Chase", nflTeam: 'CIN', gameId: 'g1', updatedAt: now, stats: [{ label: 'receiving REC', value: '5' }, { label: 'receiving YDS', value: '80' }] } } };
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.mocked(useMatchupTimeline).mockReturnValue({ data, loading: false, error: null, refresh });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mount = (signal = 0) => render(<MemoryRouter><SharedPlayersSidebar contexts={contexts} refreshSignal={signal} /></MemoryRouter>);
it('shows repeated players and defenses with live stats, events, separate exposure counts and league scoring breakdowns', async () => {
  mount();
  expect(await screen.findByRole('heading', { name: "Ja'Marr Chase" })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Baltimore Ravens D/ST' })).toBeInTheDocument();
  expect(screen.getByLabelText('On your team in 2 leagues')).toBeInTheDocument();
  expect(screen.getByLabelText('Facing you in 2 leagues')).toBeInTheDocument();
  expect(screen.getByText(/LIVE · CIN @ PIT/)).toBeInTheDocument();
  expect(screen.getAllByText("Ja'Marr Chase 24 Yd touchdown reception")[0]).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/^Ja'Marr Chase:/));
  expect(within(screen.getByLabelText("Ja'Marr Chase stats")).getByText('80')).toBeInTheDocument();
  expect(screen.getByText('6.00 pts · Proj. 20.00')).toBeVisible();
  expect(screen.getByText('12.00 pts · Proj. 20.00')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Minimise Shared Players' }));
  expect(screen.queryByRole('heading', { name: "Ja'Marr Chase" })).not.toBeInTheDocument();
});
it('uses the shared refresh control and marks fresh player stats without highlighting the initial load', async () => {
  const { rerender } = mount();
  await screen.findByRole('heading', { name: "Ja'Marr Chase" });
  expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  rerender(<MemoryRouter><SharedPlayersSidebar contexts={contexts} refreshSignal={1} /></MemoryRouter>);
  expect(refresh).toHaveBeenCalledTimes(1);
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { ...data, playerStats: { '4362628': { ...data.playerStats!['4362628'], stats: [{ label: 'receiving YDS', value: '100' }] } } }, loading: false, error: null, refresh });
  rerender(<MemoryRouter><SharedPlayersSidebar contexts={contexts} refreshSignal={1} /></MemoryRouter>);
  expect(screen.getByText('Updated')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
});
it('does not label unknown game status as a bye', async () => {
  vi.mocked(useMatchupTimeline).mockReturnValue({ data: { ...data, games: [{ ...data.games![0], state: 'unknown' }] }, loading: false, error: null, refresh });
  mount(); await screen.findByRole('heading', { name: "Ja'Marr Chase" });
  const chase = screen.getByRole('heading', { name: "Ja'Marr Chase" }).closest('li')!;
  expect(within(chase).getByText('Game status unavailable')).toBeInTheDocument();
  expect(within(chase).queryByText(/Bye/)).not.toBeInTheDocument();
});

it('shows scoring differences and zero points while player details remain collapsed', async () => {
  const zeroContexts = contexts.map(context => ({ ...context, snapshot: { ...context.snapshot!, teams: context.snapshot!.teams.map(team => ({ ...team, roster: team.roster.map(player => player.position === 'DEF' ? { ...player, points: 0 } : player) })) } }));
  render(<MemoryRouter><SharedPlayersSidebar contexts={zeroContexts} /></MemoryRouter>);
  await screen.findByRole('heading', { name: "Ja'Marr Chase" });
  expect(screen.getByLabelText("Ja'Marr Chase current fantasy points")).toHaveTextContent('6.00–12.00 pts');
  expect(screen.getByLabelText("Ja'Marr Chase current fantasy points")).toBeVisible();
  expect(screen.getByText(/Varies by league/)).toBeVisible();
  expect(screen.getByLabelText('Baltimore Ravens D/ST current fantasy points')).toHaveTextContent('0.00 pts');
  expect(screen.getByLabelText(/^Ja'Marr Chase:/).closest('details')).not.toHaveAttribute('open');
});
it('reports the existing weekly feed even when no players are shared', async () => {
  const onTimeline = vi.fn();
  render(<MemoryRouter><SharedPlayersSidebar contexts={[contexts[0]]} onTimeline={onTimeline} /></MemoryRouter>);
  await screen.findByText('No shared starters in the loaded matchups.');
  expect(onTimeline).toHaveBeenCalledWith('2026:8', data, null, false);
  expect(vi.mocked(useMatchupTimeline).mock.calls.at(-1)?.[2]).toEqual(expect.arrayContaining(['CIN', 'BAL']));
});

it('ranks by the highest league projection even when another player is live, and shows it below current points', async () => {
  const projected = contexts.map((context, i) => ({ ...context, snapshot: { ...context.snapshot!, teams: context.snapshot!.teams.map(team => ({ ...team, roster: team.roster!.map(player => ({ ...player, projection: player.position === 'DEF' ? 40 : i ? 30 : 10 })) })) } }));
  render(<MemoryRouter><SharedPlayersSidebar contexts={projected} /></MemoryRouter>);
  await screen.findByRole('heading', { name: "Ja'Marr Chase" });
  expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Baltimore Ravens D/ST', "Ja'Marr Chase"]);
  expect(screen.getByLabelText("Ja'Marr Chase highest league projection")).toHaveTextContent('Proj. 30.00');
  expect(screen.getByLabelText("Ja'Marr Chase highest league projection")).toBeVisible();
  expect(screen.getByLabelText("Ja'Marr Chase current fantasy points").nextElementSibling).toBe(screen.getByLabelText("Ja'Marr Chase highest league projection"));
});
it('keeps zero projections and places missing projections last', async () => {
  const projected = contexts.map(context => ({ ...context, snapshot: { ...context.snapshot!, teams: context.snapshot!.teams.map(team => ({ ...team, roster: team.roster!.map(player => ({ ...player, projection: player.position === 'DEF' ? 0 : null })) })) } }));
  render(<MemoryRouter><SharedPlayersSidebar contexts={projected} /></MemoryRouter>);
  await screen.findByRole('heading', { name: "Ja'Marr Chase" });
  expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Baltimore Ravens D/ST');
  expect(screen.getByLabelText('Baltimore Ravens D/ST highest league projection')).toHaveTextContent('Proj. 0.00');
  expect(screen.getByLabelText("Ja'Marr Chase highest league projection")).toHaveTextContent('Proj. —');
});

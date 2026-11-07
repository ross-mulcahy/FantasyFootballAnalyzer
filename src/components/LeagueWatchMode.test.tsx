import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { GameDaySnapshot } from '@/types/gameDay';
import { LeagueWatchMode } from './LeagueWatchMode';
import { matchupKey } from '@/utils/gameDayLinks';
import { savedLeagueKey } from '@/utils/savedLeagues';
import type { ScoreChange } from '@/utils/broadcastControl';

const now = Date.parse('2026-11-08T18:00:00Z');
const saved = { platform: 'sleeper' as const, leagueId: 'test', season: 2026, name: 'Sunday Syndicate' };
const snapshot: GameDaySnapshot = { platform: 'sleeper', leagueId: 'test', season: 2026, week: 9, fetchedAt: now,
  teams: [{ id: '1', name: 'First', roster: [] }, { id: '2', name: 'Second', roster: [] }, { id: '3', name: 'Third', roster: [] }, { id: '4', name: 'Fourth', roster: [] }],
  matchups: [{ id: 'one', team1Id: '1', team2Id: '2', team1Points: 10, team2Points: 9, team1Projection: 100, team2Projection: 101, period: 'Week 9' },
    { id: 'two', team1Id: '3', team2Id: '4', team1Points: 20, team2Points: 5, team1Projection: 110, team2Projection: 90, period: 'Week 9' }] };

it('opens an accessible full-screen director, allows manual cuts, and closes with Escape', () => {
  const close = vi.fn();
  render(<LeagueWatchMode saved={saved} snapshot={snapshot} data={null} changes={[]} hazards={0} now={now} onClose={close} />);
  const dialog = screen.getByRole('dialog', { name: 'Sunday Syndicate watch mode' });
  expect(within(dialog).getAllByText('First').length).toBeGreaterThan(0);
  expect(within(dialog).getByRole('region', { name: 'Matchup tale of the tape' })).toHaveTextContent('CURRENT MARGIN');
  expect(within(dialog).getByRole('region', { name: 'Matchup tale of the tape' })).toHaveTextContent('STARTER DETAILS UNAVAILABLE');
  fireEvent.click(within(dialog).getByRole('button', { name: /CH 02.*Third/ }));
  expect(within(dialog).getAllByText('Third').length).toBeGreaterThan(0);
  expect(within(dialog).getByRole('button', { name: 'AUTO DIRECTOR // OFF' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(within(dialog).getByRole('button', { name: 'GO LIVE' }));
  expect(within(dialog).getByRole('button', { name: 'AUTO DIRECTOR // ON' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

it('puts a confirmed score swing on air ahead of the large matchup score', () => {
  const match = snapshot.matchups[1];
  const change: ScoreChange = { id: `${savedLeagueKey(saved)}:9:${matchupKey(match)}:${now}`, at: now, leagueKey: savedLeagueKey(saved), leagueName: saved.name, season: 2026, week: 9,
    ownName: 'Third', opponentName: 'Fourth', beforeOwn: 12, beforeOpponent: 5, own: 20, opponent: 5, ownDelta: 8, opponentDelta: 0 };
  const older: ScoreChange = { ...change, id: `${savedLeagueKey(saved)}:9:${matchupKey(match)}:${now - 1000}`, at: now - 1000,
    beforeOwn: 9, own: 12, ownDelta: 3 };
  render(<LeagueWatchMode saved={saved} snapshot={snapshot} data={null} changes={[change, older]} hazards={0} now={now} onClose={vi.fn()} />);
  const story = screen.getByRole('region', { name: 'On air story' });
  expect(story).toHaveTextContent('SCORE SWING // 8.00 PTS');
  expect(story).toHaveTextContent('12.00 → 20.00');
  expect(story).toHaveTextContent('+8.00');
  expect(screen.getByRole('heading', { name: /THE WIRE/ })).toHaveTextContent('2 REPORTS');
  fireEvent.click(screen.getByRole('button', { name: /SCORE SWING \/\/ 3.00 PTS/ }));
  expect(screen.getByRole('region', { name: 'On air story' })).toHaveTextContent('9.00 → 12.00');
  expect(screen.getByRole('button', { name: 'AUTO DIRECTOR // OFF' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: /CH 01.*First/ }));
  expect(screen.getByRole('region', { name: 'On air story' })).toHaveTextContent('WAITING FOR THE NEXT CUT');
});

it('offers official-channel searches for a live play and its game without a video key', () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />);
  expect(screen.getByRole('link', { name: 'FIND CLIP ON @NFL ↗' })).toHaveAttribute('href', expect.stringContaining('youtube.com/@NFL/search'));
  fireEvent.click(screen.getByRole('button', { name: 'NFL HIGHLIGHTS' }));
  expect(screen.getByText('GAME HIGHLIGHTS')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'SEARCH @NFL ↗' })).toHaveAttribute('href', expect.stringContaining('Rams%20vs%2049ers'));
});

it('auto-cues a fresh likely play clip once, then returns to the live wire', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true }] }) });
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('AUTO DIRECTOR // NFL PLAY MATCH');
    expect(within(player).getByTitle('Puka Nacua 65 Yard Rushing TD')).toHaveAttribute('src', expect.stringContaining('enablejsapi=1'));
    expect(screen.getByRole('button', { name: 'AUTO DIRECTOR // ON' })).toHaveAttribute('aria-pressed', 'true');

    await act(async () => { vi.advanceTimersByTime(40_000); });
    expect(screen.queryByRole('region', { name: 'Official NFL highlight player' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'On air story' })).toHaveTextContent('Puka Nacua');
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});

it('replaces a rights-blocked inline clip with a YouTube link', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  let playerError: (() => void) | undefined;
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: { onError: () => void } }) { playerError = options.events.onError; } destroy() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true }] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByTitle('Puka Nacua 65 Yard Rushing TD')).toBeInTheDocument();
    await act(async () => { playerError?.(); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(within(player).queryByTitle('Puka Nacua 65 Yard Rushing TD')).not.toBeInTheDocument();
    expect(within(player).getByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123XYZ09');
  } finally { vi.unstubAllGlobals(); }
});

it('switches from a blocked FOX embed to the next matching official source', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  let playerError: (() => void) | undefined;
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: { onError: () => void } }) { playerError = options.events.onError; } destroy() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [
    { id: 'fox123XYZ09', title: 'Puka Nacua 65 Yards for a Touchdown | NFL Highlights', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, source: 'NFL on FOX' },
    { id: 'nfl123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:02:00Z', embeddable: true, source: 'NFL' },
  ] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByTitle('Puka Nacua 65 Yards for a Touchdown | NFL Highlights')).toBeInTheDocument();
    await act(async () => { playerError?.(); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('AUTO DIRECTOR // NFL PLAY MATCH');
    expect(within(player).getByTitle('Puka Nacua 65 Yard Rushing TD')).toBeInTheDocument();
    expect(within(player).queryByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).not.toBeInTheDocument();
  } finally { vi.unstubAllGlobals(); }
});

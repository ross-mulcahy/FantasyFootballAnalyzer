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
const videoSnapshot: GameDaySnapshot = { ...snapshot, teams: [
  { ...snapshot.teams[0], roster: [
    { id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 },
    { id: 'p2', name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', slot: 'FLEX', points: 0, projection: 12 },
  ] }, ...snapshot.teams.slice(1),
] };
const playTimeline = (ageMinutes = 1, two = false) => { const kickoff = '2026-11-08T18:00:00Z'; return {
  fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
  events: [
    { id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - ageMinutes * 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' },
    ...(two ? [{ id: 'play-2', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 90_000).toISOString(), quarter: 2, clock: '7:45', kind: 'Touchdown', description: 'Cooper Kupp 20 Yd Reception (Kick)' }] : []),
  ],
}; };

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
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, durationSeconds: 25 }] }) });
  vi.stubGlobal('fetch', fetchMock);
  let playerEvents: { onReady: (event: { target: { mute: () => void; playVideo: () => void } }) => void; onStateChange: (event: { data: number }) => void } | undefined;
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: typeof playerEvents }) { playerEvents = options.events; } destroy() {} playVideo() {} } });
  vi.useFakeTimers();
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('AUTO DIRECTOR // NFL PLAY MATCH');
    expect(within(player).getByTitle('Puka Nacua 65 Yard Rushing TD')).toHaveAttribute('src', expect.stringContaining('enablejsapi=1'));
    expect(screen.getByRole('button', { name: 'AUTO DIRECTOR // ON' })).toHaveAttribute('aria-pressed', 'true');
    expect(player).toHaveTextContent('CONNECTING TO OFFICIAL VIDEO');
    await act(async () => { playerEvents?.onReady({ target: { mute: vi.fn(), playVideo: vi.fn() } }); playerEvents?.onStateChange({ data: 1 }); });
    expect(player).toHaveTextContent('PLAYING');
    fireEvent.click(within(player).getByRole('button', { name: 'WORKED HERE' }));
    expect(localStorage.getItem('witching-hour:video-preferences:v1')).toContain('abc123XYZ09');

    await act(async () => { vi.advanceTimersByTime(26_000); });
    expect(screen.getByRole('region', { name: 'Official NFL highlight player' })).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1_000); });
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
  let playerError: ((event: { data: number }) => void) | undefined;
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: { onError: (event: { data: number }) => void } }) { playerError = options.events.onError; } destroy() {} playVideo() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true }] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByTitle('Puka Nacua 65 Yard Rushing TD')).toBeInTheDocument();
    await act(async () => { playerError?.({ data: 150 }); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(within(player).queryByTitle('Puka Nacua 65 Yard Rushing TD')).not.toBeInTheDocument();
    expect(within(player).getByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123XYZ09');
    expect(sessionStorage.getItem('witching-hour:blocked-youtube-embeds')).toContain('abc123XYZ09');
    fireEvent.click(screen.getByRole('button', { name: 'DIRECTOR DIAGNOSTICS' }));
    expect(screen.getByText(/YOUTUBE ERROR 150 · NFL/)).toBeInTheDocument();
    expect(screen.getByText('SKIPPED · EMBED FAILED THIS SESSION')).toBeInTheDocument();
    expect(screen.getByText(/PLAYER \+ PLAY TYPE · GAME-DAY UPLOAD/)).toBeInTheDocument();
  } finally { vi.unstubAllGlobals(); }
});

it('offers a manual play control after autoplay is blocked and returns when the clip ends', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  let events: { onReady: (event: { target: { mute: () => void; playVideo: () => void } }) => void; onAutoplayBlocked: () => void; onStateChange: (event: { data: number }) => void } | undefined;
  const manualPlay = vi.fn();
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: typeof events }) { events = options.events; } destroy() {} playVideo() { manualPlay(); } } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true }] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    await act(async () => { events?.onReady({ target: { mute: vi.fn(), playVideo: vi.fn() } }); events?.onAutoplayBlocked(); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('AUTOPLAY BLOCKED');
    expect(player).toHaveTextContent('LAR @ SF // Touchdown');
    expect(within(player).getByTitle('Puka Nacua 65 Yard Rushing TD')).toBeInTheDocument();
    fireEvent.click(within(player).getByRole('button', { name: 'PLAY CLIP ▶' }));
    expect(manualPlay).toHaveBeenCalledTimes(1);
    await act(async () => { events?.onStateChange({ data: 1 }); events?.onStateChange({ data: 0 }); });
    expect(screen.queryByRole('region', { name: 'Official NFL highlight player' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'On air story' })).toHaveTextContent('Puka Nacua');
  } finally { vi.unstubAllGlobals(); }
});

it('falls back to the direct clip link when the YouTube player never becomes ready', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  vi.stubGlobal('YT', { Player: class { destroy() {} playVideo() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [{ id: 'abc123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true }] }) }));
  vi.useFakeTimers();
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByRole('region', { name: 'Official NFL highlight player' })).toHaveTextContent('CONNECTING TO OFFICIAL VIDEO');
    await act(async () => { vi.advanceTimersByTime(15_000); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('PLAYER UNAVAILABLE');
    expect(within(player).getByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123XYZ09');
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});

it('switches from a blocked FOX embed to the next matching official source', async () => {
  const withStarter: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 15 }] },
    ...snapshot.teams.slice(1),
  ] };
  const kickoff = '2026-11-08T18:00:00Z';
  const data = { fetchedAt: now, warnings: [], games: [{ id: 'g1', name: 'LAR @ SF', kickoff, teams: ['LAR', 'SF'], state: 'in' as const, detail: 'Q2', quarter: 2, clock: '7:30' }],
    events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: new Date(now - 60_000).toISOString(), quarter: 2, clock: '7:30', kind: 'Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' }] };
  let playerError: ((event: { data: number }) => void) | undefined;
  vi.stubGlobal('YT', { Player: class { constructor(_frame: HTMLIFrameElement, options: { events: { onError: (event: { data: number }) => void } }) { playerError = options.events.onError; } destroy() {} playVideo() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [
    { id: 'fox123XYZ09', title: 'Puka Nacua 65 Yards for a Touchdown vs 49ers | NFL Highlights', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, source: 'NFL on FOX' },
    { id: 'nfl123XYZ09', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:02:00Z', embeddable: true, source: 'NFL' },
  ] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={withStarter} data={data} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByTitle('Puka Nacua 65 Yards for a Touchdown vs 49ers | NFL Highlights')).toBeInTheDocument();
    await act(async () => { playerError?.({ data: 101 }); });
    const player = screen.getByRole('region', { name: 'Official NFL highlight player' });
    expect(player).toHaveTextContent('AUTO DIRECTOR // NFL PLAY MATCH');
    expect(within(player).getByTitle('Puka Nacua 65 Yard Rushing TD')).toBeInTheDocument();
    expect(within(player).queryByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).not.toBeInTheDocument();
  } finally { vi.unstubAllGlobals(); }
});

it('keeps a possible match manual, previews official metadata, and remembers a wrong-play report', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [
    { id: 'possible123', title: 'Puka Nacua Touchdown', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, source: 'NFL', thumbnailUrl: 'https://i.ytimg.com/vi/possible123/mqdefault.jpg', durationSeconds: 35 },
  ] }) }));
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={videoSnapshot} data={playTimeline()} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.queryByRole('region', { name: 'Official NFL highlight player' })).not.toBeInTheDocument();
    const story = screen.getByRole('region', { name: 'On air story' });
    expect(story).toHaveTextContent('POSSIBLE CLIP');
    expect(within(story).getByAltText('Official NFL video thumbnail')).toHaveAttribute('src', expect.stringContaining('i.ytimg.com'));
    fireEvent.click(within(story).getByRole('button', { name: 'WATCH POSSIBLE CLIP ▶' }));
    fireEvent.click(screen.getByRole('button', { name: 'WRONG PLAY' }));
    expect(screen.queryByRole('button', { name: 'WATCH POSSIBLE CLIP ▶' })).not.toBeInTheDocument();
    expect(localStorage.getItem('witching-hour:video-preferences:v1')).toContain('possible123');
  } finally { vi.unstubAllGlobals(); }
});

it('queues a second fresh clip, shows it next, and respects the chosen clip pace', async () => {
  const videos = [
    { id: 'puka123XYZ0', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, durationSeconds: 25 },
    { id: 'kupp123XYZ0', title: 'Cooper Kupp 20 Yard Receiving TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true, durationSeconds: 25 },
  ];
  vi.stubGlobal('YT', { Player: class { destroy() {} playVideo() {} } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos }) }));
  vi.useFakeTimers();
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={videoSnapshot} data={playTimeline(0.5, true)} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByRole('region', { name: 'Official NFL highlight player' })).toBeInTheDocument();
    expect(screen.getByText(/UP NEXT \/\/ 1 CLIP QUEUED/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CLIPS: BALANCED' }));
    expect(screen.getByRole('button', { name: 'CLIPS: MORE' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← RETURN TO LIVE' }));
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole('region', { name: 'Official NFL highlight player' })).toBeInTheDocument();
    expect(localStorage.getItem('witching-hour:video-preferences:v1')).toContain('more');
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});

it('marks a newly published clip for an older play without auto-interrupting the wire', async () => {
  const clip = { id: 'late123XYZ0', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt: '2026-11-08T18:01:00Z', embeddable: true };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ configured: true, videos: [] }) })
    .mockResolvedValue({ ok: true, json: async () => ({ configured: true, videos: [clip] }) });
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
  try {
    await act(async () => { render(<LeagueWatchMode saved={saved} snapshot={videoSnapshot} data={playTimeline(10)} changes={[]} hazards={0} now={now} onClose={vi.fn()} />); });
    expect(screen.getByRole('region', { name: 'On air story' })).not.toHaveTextContent('CLIP NOW AVAILABLE');
    await act(async () => { vi.advanceTimersByTime(5 * 60_000); });
    expect(screen.getByRole('region', { name: 'On air story' })).toHaveTextContent('CLIP NOW AVAILABLE');
    expect(screen.queryByRole('region', { name: 'Official NFL highlight player' })).not.toBeInTheDocument();
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});

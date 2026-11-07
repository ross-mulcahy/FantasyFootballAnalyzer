import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { LineupWarning } from '@/utils/gameDayInsights';
import { groupStudioHazards } from '@/utils/studioAnchor';
import { StudioAnchorDesk } from './StudioAnchorDesk';
afterEach(cleanup);
const leagues = ['Sunday Syndicate', 'Salsa Pear', 'Parse.ly'];
const warnings: LineupWarning[] = leagues.flatMap((name, i) => ['Derrick Henry: Out', 'Jayden Reed: Questionable'].map((message, j) => ({ key: `${i}:${j}`, league: { platform: 'sleeper', leagueId: `123456789${i}`, season: 2026, name }, teamId: '1', message, locked: false, saved: false })));
const closest = { league: 'Salsa Pear', own: "Sam's Spudz", opponent: 'My Kittle Tony', margin: 6 };
it('turns six warning occurrences into two player rows with all six league actions', () => {
  render(<MemoryRouter><StudioAnchorDesk warnings={warnings} closest={closest} conflict={null} /></MemoryRouter>);
  expect(screen.getByRole('img', { name: /hazard alert, leaning forward/ })).toBeInTheDocument();
  const list = within(screen.getByRole('list', { name: 'Lineup hazards grouped by player' }));
  expect(list.getAllByRole('listitem')).toHaveLength(2);
  expect(list.getAllByRole('link')).toHaveLength(6);
  expect(screen.getByRole('status')).toHaveTextContent('6 lineup hazards');
  expect(screen.getByRole('status')).toHaveTextContent('Derrick Henry is flagged OUT across 3 leagues');
  expect(list.getAllByRole('link', { name: 'Salsa Pear ↗' })[0]).toHaveAttribute('href', 'https://sleeper.com/leagues/1234567891/team');
});
it('deduplicates repeated targets but retains conflicting statuses and lock context', () => {
  const grouped = groupStudioHazards([warnings[0], { ...warnings[0], key: 'duplicate', message: 'derrick henry: Questionable', saved: true, locked: true }]);
  expect(grouped).toHaveLength(1);
  expect(grouped[0].statuses).toEqual(['OUT', 'QUESTIONABLE']);
  expect(grouped[0].leagues).toHaveLength(1);
  expect(grouped[0].leagues[0]).toMatchObject({ saved: true, locked: true });
});
it('cycles forecast and rivalry facts, and withholds the presser until a loss is in sight', () => {
  const props = { closest, conflict: { name: 'Puka Nacua', owned: 2, opposing: 1 }, record: { wins: 2, losses: 1, ties: 0, pending: 0 },
    rivalries: [{ key: 'rivalry-1', league: 'Salsa Pear', own: "Sam's Spudz", opponent: 'My Kittle Tony', wins: 3, losses: 2, ties: 0, recent: { season: 2025, week: 8, ownPoints: 121.4, opponentPoints: 118.2 } }] };
  const { rerender } = render(<MemoryRouter><StudioAnchorDesk {...props} warnings={warnings} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent('2-1 (wins-losses)');
  expect(screen.getByText('WEEKLY FORECAST')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent("Sam's Spudz versus My Kittle Tony");
  expect(screen.getByRole('img', { name: /sweat, holding a microphone/ })).toBeInTheDocument();
  expect(screen.getByText('MATCHUP UPDATE')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Lineup hazards grouped by player' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent('3-2 against My Kittle Tony');
  expect(screen.getByRole('status')).toHaveTextContent('Week 8 of 2025');
  expect(screen.getByText('RIVALRY FILE')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent('Puka Nacua');
  expect(screen.getByRole('img', { name: /sweat, holding a microphone/ })).toBeInTheDocument();
  expect(screen.getByText('ROOTING CONFLICTS')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.queryByText('PRESSER')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: /hazard alert, leaning forward/ })).toBeInTheDocument();
  rerender(<MemoryRouter><StudioAnchorDesk {...props} warnings={warnings} excuse={{ league: 'Salsa Pear', own: "Sam's Spudz", opponent: 'My Kittle Tony', status: 'out of sight', deficit: 34 }} /></MemoryRouter>);
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent('coaching staff');
  expect(screen.getByText('PRESSER')).toBeInTheDocument();
  rerender(<MemoryRouter><StudioAnchorDesk {...props} warnings={[]} /></MemoryRouter>);
  expect(screen.getByRole('img', { name: /sweat, holding a microphone/ })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent("We've entered the Witching Hour");
  rerender(<MemoryRouter><StudioAnchorDesk warnings={[]} closest={null} conflict={null} /></MemoryRouter>);
  expect(screen.getByRole('img', { name: /all clear, smiling with a studio mug/ })).toBeInTheDocument();
  rerender(<MemoryRouter><StudioAnchorDesk warnings={[]} closest={null} conflict={null} missing={2} /></MemoryRouter>);
  expect(screen.getByText('AWAITING SIGNAL')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent("I can't give you the all-clear");
});

it('rotates takes automatically and lets the viewer pause and resume', () => {
  vi.useFakeTimers();
  try {
    render(<MemoryRouter><StudioAnchorDesk warnings={warnings} closest={closest} conflict={null} record={{ wins: 2, losses: 1, ties: 0, pending: 0 }} /></MemoryRouter>);
    expect(screen.getByText('REDZONE UPDATE')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(screen.getByText('WEEKLY FORECAST')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE TAKES' }));
    act(() => { vi.advanceTimersByTime(45_000); });
    expect(screen.getByText('WEEKLY FORECAST')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RESUME TAKES' }));
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(screen.getByText('MATCHUP UPDATE')).toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});

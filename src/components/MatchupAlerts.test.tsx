import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MatchupAlerts } from './MatchupAlerts';
import type { NFLTimeline } from '@/api/nflTimeline';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const now = Date.parse('2026-10-30T12:00Z');
const data: NFLTimeline = {
  fetchedAt: now, warnings: [], games: [{ id: '1', name: 'CAR @ GB', kickoff: '2026-10-30T10:00Z', teams: ['CAR', 'GB'], state: 'in', quarter: 2, clock: '8:22', detail: '8:22 - 2nd' }],
  events: [1, 4, 2, 3].map(n => ({ id: String(n), gameId: '1', game: 'CAR @ GB', kickoff: '2026-10-30T10:00Z', occurredAt: `2026-10-30T11:0${n}:00Z`, quarter: 2, clock: '8:22', kind: 'Touchdown', description: `Event ${n}` })),
};
it('shows only the three latest alerts in newest-first order', () => {
  render(<MatchupAlerts data={data} loading={false} error={null} now={now} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows.map(row => within(row).getByText(/Event/).textContent)).toEqual(['Event 4', 'Event 3', 'Event 2']);
  expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
  expect(screen.getByText(/LIVE · CAR @ GB/)).toBeInTheDocument();
});
it('hides alerts when status is stale or cannot refresh', () => {
  render(<MatchupAlerts data={data} loading={false} error="Feed offline" now={now + 180000} />);
  expect(screen.queryByRole('region', { name: 'Latest Alerts' })).not.toBeInTheDocument();
});
it('hides alerts with unknown game status', () => {
  render(<MatchupAlerts data={{ ...data, events: [], games: [{ ...data.games![0], state: 'unknown' }] }} loading={false} error={null} now={now} />);
  expect(screen.queryByRole('region', { name: 'Latest Alerts' })).not.toBeInTheDocument();
});
it('does not render the alert box when games end', () => {
  render(<MatchupAlerts data={{ ...data, games: [{ ...data.games![0], state: 'post' }] }} loading={false} error={null} now={now} />);
  expect(screen.queryByRole('region', { name: 'Latest Alerts' })).not.toBeInTheDocument();
});

it('applies the chosen alert priority before taking the three visible alerts', () => {
  render(<MatchupAlerts data={data} loading={false} error={null} now={now} rankEvents={events => events.filter(event => event.id === '1')} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(1); expect(screen.getByText('Event 1')).toBeInTheDocument();
  expect(screen.queryByText('Event 4')).not.toBeInTheDocument();
});

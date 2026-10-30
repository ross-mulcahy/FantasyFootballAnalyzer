import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { League } from '@/types';
import { Header } from './Header';

// Minimal league: Header only reads name/status/season off it, plus its
// existence, which is what decides the nav.
const LEAGUE = {
  id: 'l1',
  platform: 'sleeper',
  name: 'Test League',
  season: 2025,
  draftType: 'snake',
  teams: [],
  scoringType: 'half_ppr',
  totalTeams: 12,
  isLoaded: true,
} as unknown as League;

function renderAt(path: string, props: Partial<React.ComponentProps<typeof Header>> = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header {...props} />
    </MemoryRouter>,
  );
}

// The league nav's links all redirect anyone without a real league, and its
// PDF button is a no-op with nothing to export. It used to render on the
// public tool landings, which visitors reach from search with no league.
describe('Header nav', () => {
  it('shows only the public routes on a tool landing with no league', () => {
    renderAt('/trade-analyzer');

    expect(screen.getByRole('link', { name: 'Rankings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Values' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trades' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Awards' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export PDF/ })).not.toBeInTheDocument();
  });

  it('keeps guests off the league nav too', () => {
    renderAt('/trade-analyzer', { league: LEAGUE, isGuest: true });

    expect(screen.getByRole('link', { name: 'Rankings' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Waivers' })).not.toBeInTheDocument();
  });

  it('shows the league nav once a real league is connected', () => {
    renderAt('/trades', { league: LEAGUE, leagueName: 'Test League' });

    expect(screen.getByRole('link', { name: 'Trades' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Awards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export PDF/ })).toBeInTheDocument();
  });

  it('offers History for Yahoo leagues (renew chain), same as Sleeper and ESPN', () => {
    renderAt('/trades', { league: { ...LEAGUE, platform: 'yahoo' } as League, leagueName: 'Test League' });

    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
  });

  it('keeps the focused nav on draft-prep routes even with a league', () => {
    renderAt('/rankings', { league: LEAGUE, leagueName: 'Test League' });

    expect(screen.getByRole('link', { name: 'Values' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Teams' })).not.toBeInTheDocument();
  });

  it('drops the header CTA where GuestBanner carries its own', () => {
    renderAt('/rankings', { league: LEAGUE, isGuest: true });
    expect(screen.queryByRole('button', { name: 'Connect your league' })).not.toBeInTheDocument();

    renderAt('/', { league: LEAGUE, isGuest: true });
    expect(screen.getByRole('button', { name: 'Connect your league' })).toBeInTheDocument();
  });
});

it('offers Game Day from a connected draft-prep page', () => {
  renderAt('/draft-room', { league: LEAGUE });
  expect(screen.getByRole('link', { name: 'Game Day' })).toHaveAttribute('href', '/game-day?league=sleeper%3Al1&year=2025');
});

it.each(['/game-day', '/rosters', '/teams', '/rankings'])('puts Game Day first and Rosters second on %s', path => {
  renderAt(path, { league: LEAGUE });
  const links = within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('link');
  expect(links.slice(0, 2).map(link => link.textContent)).toEqual(['Game Day', 'Rosters']);
  if (path === '/rosters') expect(links[1]).toHaveAttribute('aria-current', 'page');
  if (path === '/game-day') expect(links[0]).toHaveAttribute('aria-current', 'page');
});

it('keeps Rosters active on a canonical full team view', () => {
  renderAt('/teams?league=sleeper:L1&team=2', { league: LEAGUE });
  expect(screen.getByRole('link', { name: 'Rosters' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Teams' })).not.toHaveAttribute('aria-current');
});


it.each([{}, { league: LEAGUE, leagueName: 'Test League' }])('shows Game Day and Settings in the homepage navigation regardless of the last connected league', props => {
  renderAt('/', props);
  const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  expect(nav.getAllByRole('link').map(link => link.textContent)).toEqual(['Game Day', 'Recap', 'Settings']);
  expect(nav.queryByRole('button', { name: /Export PDF/ })).not.toBeInTheDocument();
});
it('links the header league name to its Game Day overview', () => {
  renderAt('/rosters', { league: LEAGUE, leagueName: 'Test League' });
  expect(screen.getByRole('link', { name: 'Test League' })).toHaveAttribute('href', '/game-day?league=sleeper%3Al1&year=2025');
});

it('treats Recap as a global page and marks its navigation link active', () => {
  renderAt('/recap', { league: LEAGUE });
  const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  expect(nav.getByRole('link', { name: 'Recap' })).toHaveAttribute('aria-current', 'page');
  expect(nav.getByRole('link', { name: 'Game Day' })).toHaveAttribute('href', '/');
  expect(nav.queryByRole('link', { name: 'Rosters' })).not.toBeInTheDocument();
});

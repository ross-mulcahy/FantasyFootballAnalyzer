import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SavedLeagues } from './SavedLeagues';
import { rememberSavedLeague } from '@/utils/savedLeagues';
import type { League } from '@/types';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const league = {
  id: '123', platform: 'sleeper', name: 'Sunday League', season: 2026,
  draftType: 'snake', teams: [], scoringType: 'ppr', totalTeams: 12, isLoaded: true,
} as League;

it('shows newly saved leagues, reconnects with metadata only, and removes them', () => {
  const onConnect = vi.fn();
  render(<SavedLeagues onConnect={onConnect} isLoading={false} />);
  expect(screen.getByText(/No saved leagues/)).toBeInTheDocument();
  // Act through a rerender to model a connection followed by a fresh visit.
  cleanup();
  rememberSavedLeague(league);
  render(<SavedLeagues onConnect={onConnect} isLoading={false} />);
  fireEvent.click(screen.getByRole('button', { name: /Connect Sunday League/ }));
  expect(onConnect).toHaveBeenCalledWith({ platform: 'sleeper', leagueId: '123', season: 2026, name: 'Sunday League' });
  fireEvent.click(screen.getByRole('button', { name: /Remove Sunday League/ }));
  expect(screen.getByText(/No saved leagues/)).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/removed/);
});

it('disables connect and remove while a league is loading', () => {
  rememberSavedLeague(league);
  render(<SavedLeagues onConnect={vi.fn()} isLoading />);
  expect(screen.getByRole('button', { name: /Connect Sunday League/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Remove Sunday League/ })).toBeDisabled();
});

function render(ui: ReactElement) { return renderComponent(<MemoryRouter>{ui}</MemoryRouter>); }

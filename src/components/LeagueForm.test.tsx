import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeagueForm } from './LeagueForm';
import { rememberSavedLeague } from '@/utils/savedLeagues';
import type { League } from '@/types';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
const base = {
  id: '123', platform: 'sleeper', name: 'Sunday', season: 2026,
  draftType: 'snake', teams: [], scoringType: 'ppr', totalTeams: 12, isLoaded: true,
} as League;

it('reconnects a saved league with its exact season', () => {
  rememberSavedLeague(base);
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.click(screen.getByRole('button', { name: /Connect Sunday 2026 on sleeper/ }));
  expect(onSubmit).toHaveBeenCalledWith({ platform: 'sleeper', leagueId: '123', season: 2026 });
});

it('keeps a saved ESPN league visible but pauses reconnection', () => {
  rememberSavedLeague({ ...base, platform: 'espn' });
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  expect(screen.getByText('Sunday')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /espn connector unavailable/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /ESPN Coming soon/ })).toBeDisabled();
  expect(screen.getByLabelText('League ID', { exact: true })).toHaveValue('');
  expect(onSubmit).not.toHaveBeenCalled();
});

it('keeps a saved Yahoo league visible but does not offer login', () => {
  rememberSavedLeague({ ...base, platform: 'yahoo' });
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  expect(screen.getByRole('button', { name: /yahoo connector unavailable/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Yahoo Coming soon/ })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /Log in with Yahoo/ })).not.toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

function render(ui: ReactElement) { return renderComponent(<MemoryRouter>{ui}</MemoryRouter>); }

it('does not prefill an unavailable reconnect target into the Sleeper form', () => {
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} initialLeague={{ platform: 'espn', leagueId: '123456', season: 2024, name: 'Reconnect League', teamId: '7' }} />);
  expect(screen.getByLabelText(/LEAGUE ID/i)).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('ESPN connections are paused');
  expect(onSubmit).not.toHaveBeenCalled();
});

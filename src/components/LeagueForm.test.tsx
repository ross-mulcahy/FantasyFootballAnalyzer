import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeagueForm } from './LeagueForm';
import { findLeaguesByUsername } from '@/api/sleeper';
import { rememberSavedLeague } from '@/utils/savedLeagues';
import type { League } from '@/types';

vi.mock('@/api/sleeper', () => ({ findLeaguesByUsername: vi.fn() }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.mocked(findLeaguesByUsername).mockReset(); });
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
  fireEvent.click(screen.getByRole('button', { name: 'Paste league link or ID' }));
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
  fireEvent.click(screen.getByRole('button', { name: 'Paste league link or ID' }));
  expect(screen.getByLabelText(/LEAGUE ID/i)).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('ESPN connections are paused');
  expect(onSubmit).not.toHaveBeenCalled();
});

it('finds leagues by username and requires a choice when several are found', async () => {
  vi.mocked(findLeaguesByUsername).mockResolvedValue({ userId: 'user-1', leagues: [
    { id: '1111111111', name: 'Sunday League', season: '2026' },
    { id: '2222222222', name: 'Dynasty League', season: '2025' },
  ] });
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.change(screen.getByLabelText(/Step 1 · Your Sleeper username/), { target: { value: 'coach' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find my leagues' }));
  const selector = await screen.findByLabelText(/Step 2 · Choose a league/);
  expect(selector).toHaveValue('');
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Connect selected league' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a league');
  fireEvent.change(selector, { target: { value: '2222222222' } });
  fireEvent.click(screen.getByRole('button', { name: 'Connect selected league' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ platform: 'sleeper', leagueId: '2222222222' }));
});

it('accepts a Sleeper league URL through the alternate setup path', () => {
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Paste league link or ID' }));
  fireEvent.change(screen.getByLabelText('League ID'), { target: { value: 'https://sleeper.com/leagues/1234567890' } });
  expect(screen.getByLabelText('League ID')).toHaveValue('1234567890');
  fireEvent.click(screen.getByRole('button', { name: 'Connect league' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ platform: 'sleeper', leagueId: '1234567890' }));
});

import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeagueForm } from './LeagueForm';
import { rememberSavedLeague } from '@/utils/savedLeagues';
import { persistESPNCredentials } from '@/utils/espnCredentials';
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

it('rehydrates an opted-in ESPN login without carrying it to another league', () => {
  rememberSavedLeague({ ...base, platform: 'espn' });
  persistESPNCredentials({ platform: 'espn', leagueId: '123', espnS2: 'test-cookie', swid: '{test}', rememberEspn: true });
  sessionStorage.clear();
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.click(screen.getByRole('button', { name: /Connect Sunday 2026 on espn/ }));
  expect(onSubmit).toHaveBeenCalledWith({ platform: 'espn', leagueId: '123', season: 2026, espnS2: 'test-cookie', swid: '{test}' });
  expect(screen.getByLabelText('Remember ESPN login on this device')).toBeChecked();
  fireEvent.change(screen.getByLabelText('League ID', { exact: true }), { target: { value: '456' } });
  expect(screen.getByLabelText('espn_s2 Cookie')).toHaveValue('');
  expect(screen.getByLabelText('Remember ESPN login on this device')).not.toBeChecked();
});

it('asks for Yahoo login instead of requesting league data without authentication', () => {
  rememberSavedLeague({ ...base, platform: 'yahoo' });
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} />);
  fireEvent.click(screen.getByRole('button', { name: /Connect Sunday 2026 on yahoo/ }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('Log in with Yahoo below');
});

function render(ui: ReactElement) { return renderComponent(<MemoryRouter>{ui}</MemoryRouter>); }

it('prefills a reconnect target with its original platform and season without changing team selection', () => {
  const onSubmit = vi.fn();
  render(<LeagueForm onSubmit={onSubmit} isLoading={false} initialLeague={{ platform: 'espn', leagueId: '123456', season: 2024, name: 'Reconnect League', teamId: '7' }} />);
  expect(screen.getByLabelText(/LEAGUE ID/i)).toHaveValue('123456');
  expect(screen.getByLabelText(/SEASON/i)).toHaveValue('2024');
  expect(screen.getByText(/Reconnect Reconnect League below/)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

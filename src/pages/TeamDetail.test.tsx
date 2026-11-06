import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { League } from '@/types';
import { TeamDetail } from './TeamDetail';

afterEach(cleanup);
it('can minimise, close and restore the tape room without hiding the roster console', () => {
  const team = { id: '1', name: 'Studio Test', wins: 0, losses: 0 };
  const league: League = { id: 'test', platform: 'sleeper', season: 2026, name: 'Studio League', draftType: 'snake', teams: [team], scoringType: 'ppr', totalTeams: 1, isLoaded: true };
  render(<MemoryRouter><TeamDetail league={league} team={team} onBack={() => {}} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Studio Test' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: "Minimise Scott's tape room" }));
  expect(screen.queryByRole('heading', { name: 'Studio Test' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'STARTING LINEUP & TAXI SQUAD' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: "Expand Scott's tape room" }));
  expect(screen.getByRole('heading', { name: 'Studio Test' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: "Close Scott's tape room" }));
  expect(screen.queryByRole('heading', { name: "SCOTT'S TAPE ROOM" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: "RESTORE SCOTT'S TAPE ROOM" }));
  expect(screen.getByRole('heading', { name: 'Studio Test' })).toBeVisible();
});

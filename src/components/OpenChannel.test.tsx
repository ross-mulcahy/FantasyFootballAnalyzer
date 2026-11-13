import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpenChannel } from './OpenChannel';
import { nflMoments } from './nflMoments';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('keeps the spare channel off until requested, cycles 20 NFL moments, and powers down cleanly', () => {
  expect(nflMoments).toHaveLength(20);
  expect(new Set(nflMoments.map(moment => moment.src)).size).toBe(20);
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  expect(screen.queryByRole('img', { name: /GIF$/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Your next live matchup is one league away.')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'PATCH IN A LEAGUE ↗' })).toHaveAttribute('href', '/settings');

  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  expect(screen.getByRole('button', { name: 'POWER OFF' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Mark Sanchez · Butt Fumble GIF' })).toHaveAttribute('src', nflMoments[0].src);
  expect(screen.queryByRole('link', { name: 'PATCH IN A LEAGUE ↗' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(11350));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Mark Sanchez · Butt Fumble GIF' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Antonio Brown · Punter Kick GIF' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT GIF →' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.getByRole('img', { name: 'Jags Fan · What Just Happened? GIF' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  expect(screen.queryByRole('img', { name: /GIF$/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' })).toHaveAttribute('aria-pressed', 'false');
});

it('cancels a channel change immediately when powered off', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  act(() => vi.advanceTimersByTime(25000));
  expect(screen.queryByRole('img', { name: /GIF$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
});

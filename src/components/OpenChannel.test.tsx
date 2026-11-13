import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpenChannel } from './OpenChannel';
import { nflMoments } from './nflMoments';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('plays each of the 20 moments once and advances only when the clip ends', () => {
  expect(nflMoments).toHaveLength(20);
  expect(new Set(nflMoments.map(moment => moment.src)).size).toBe(20);
  expect(new Set(nflMoments.map(moment => moment.video)).size).toBe(20);
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.queryByText('Your next live matchup is one league away.')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'PATCH IN A LEAGUE ↗' })).toHaveAttribute('href', '/settings');

  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  expect(screen.getByRole('button', { name: 'POWER OFF' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'PATCH IN A LEAGUE ↗' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  const firstClip = screen.getByLabelText('Mark Sanchez · Butt Fumble clip');
  expect(firstClip).toHaveAttribute('src', nflMoments[0].video);
  expect(firstClip).toHaveAttribute('autoplay');
  expect(firstClip).not.toHaveAttribute('loop');
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  fireEvent.ended(firstClip);
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Antonio Brown · Punter Kick clip')).toHaveAttribute('src', nflMoments[1].video);
  fireEvent.click(screen.getByRole('button', { name: 'NEXT GIF →' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  const thirdClip = screen.getByLabelText('Jags Fan · What Just Happened? clip');
  expect(thirdClip).toHaveAttribute('src', nflMoments[2].video);
  act(() => vi.advanceTimersByTime(12000));
  expect(thirdClip).toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' })).toHaveAttribute('aria-pressed', 'false');
});

it('cancels a channel change immediately when powered off', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  act(() => vi.advanceTimersByTime(25000));
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
});

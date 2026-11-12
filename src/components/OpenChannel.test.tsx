import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpenChannel } from './OpenChannel';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('keeps the spare channel off until requested, cycles official GIFs, and powers down cleanly', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  expect(screen.queryByTitle(/GIF$/)).not.toBeInTheDocument();
  expect(screen.queryByText('Your next live matchup is one league away.')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'PATCH IN A LEAGUE ↗' })).toHaveAttribute('href', '/settings');

  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MEMES' }));
  expect(screen.getByRole('button', { name: 'POWER OFF' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.getByTitle('Tom Brady · Let’s go GIF')).toHaveAttribute('src', 'https://giphy.com/embed/2E6OYt2yphlWTGZeYK');
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(11350));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.getByTitle('Tom Brady · Let’s go GIF')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  expect(screen.getByTitle('Tom Brady · Absolutely not GIF')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NEXT GIF →' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.getByTitle('Justin Jefferson · The Griddy GIF')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  expect(screen.queryByTitle(/GIF$/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'POWER ON // NFL MEMES' })).toHaveAttribute('aria-pressed', 'false');
});

it('cancels a channel change immediately when powered off', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel className="standby" patchHref="/settings" patchLabel="PATCH IN A LEAGUE ↗" /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MEMES' }));
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  act(() => vi.advanceTimersByTime(25000));
  expect(screen.queryByTitle(/GIF$/)).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
});

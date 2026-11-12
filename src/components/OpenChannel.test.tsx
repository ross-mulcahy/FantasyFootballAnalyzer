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

  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL GIFS' }));
  expect(screen.getByRole('button', { name: 'POWER OFF' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTitle('Tom Brady · Let’s go GIF')).toHaveAttribute('src', 'https://giphy.com/embed/2E6OYt2yphlWTGZeYK');
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByTitle('Justin Jefferson · The Griddy GIF')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  expect(screen.queryByTitle(/GIF$/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'POWER ON // NFL GIFS' })).toHaveAttribute('aria-pressed', 'false');
});

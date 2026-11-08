import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RefreshCountdownButton } from './RefreshCountdownButton';

afterEach(() => vi.useRealTimers());

it('tracks the scheduled refresh and resets when a new interval begins', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));
  const start = Date.now();
  const { rerender } = render(<RefreshCountdownButton nextRefreshAt={start + 60_000} refreshStartedAt={start}>Refresh events</RefreshCountdownButton>);
  const button = screen.getByRole('button', { name: 'Refresh events' });
  const bar = button.querySelector('[aria-hidden="true"]') as HTMLElement;
  expect(button).toHaveAttribute('title', 'Next automatic refresh in 1m 00s');
  expect(bar).toHaveStyle({ width: '0%' });

  act(() => vi.advanceTimersByTime(30_000));
  expect(button).toHaveAttribute('title', 'Next automatic refresh in 0m 30s');
  expect(bar).toHaveStyle({ width: '50%' });

  rerender(<RefreshCountdownButton nextRefreshAt={Date.now() + 15_000} refreshStartedAt={Date.now()}>Refresh events</RefreshCountdownButton>);
  expect(button).toHaveAttribute('title', 'Next automatic refresh in 0m 15s');
  expect(bar).toHaveStyle({ width: '0%' });
});

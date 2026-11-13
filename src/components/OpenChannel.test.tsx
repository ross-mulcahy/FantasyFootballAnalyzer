import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpenChannel } from './OpenChannel';
import { nflMoments } from './nflMoments';
import { shuffledMomentIndexes } from '@/utils/openChannelReel';
import type { ChannelOutlook } from '@/utils/openChannelMood';

const neutral: ChannelOutlook = { mood: 'neutral', wins: 0, losses: 0, ties: 0, pending: 1 };
const props = { className: 'standby', patchHref: '/settings', patchLabel: 'PATCH IN A LEAGUE ↗', contextKey: 'all:2026', contextLabel: 'ALL LEAGUES', outlook: neutral };

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('plays each of the 80 moments once and advances only when the clip ends', () => {
  expect(nflMoments).toHaveLength(80);
  expect(new Set(nflMoments.map(moment => moment.src)).size).toBe(80);
  expect(new Set(nflMoments.map(moment => moment.video)).size).toBe(80);
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
  render(<MemoryRouter><OpenChannel {...props} /></MemoryRouter>);
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
  const firstClip = screen.getByLabelText(/clip$/);
  expect(nflMoments.map(moment => moment.video)).toContain(firstClip.getAttribute('src'));
  expect(firstClip).toHaveAttribute('autoplay');
  expect(firstClip).not.toHaveAttribute('loop');
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  fireEvent.ended(firstClip);
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
  const secondClip = screen.getByLabelText(/clip$/);
  expect(secondClip.getAttribute('src')).not.toBe(firstClip.getAttribute('src'));
  fireEvent.click(screen.getByRole('button', { name: 'NEXT GIF →' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  const thirdClip = screen.getByLabelText(/clip$/);
  expect(thirdClip.getAttribute('src')).not.toBe(secondClip.getAttribute('src'));
  act(() => vi.advanceTimersByTime(12000));
  expect(thirdClip).toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' })).toHaveAttribute('aria-pressed', 'false');
});

it('shuffles the full reel without repeating a clip until every moment has played', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
  render(<MemoryRouter><OpenChannel {...props} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  act(() => vi.advanceTimersByTime(650));

  const played: string[] = [];
  for (let index = 0; index < nflMoments.length; index += 1) {
    const clip = screen.getByLabelText(/clip$/);
    played.push(clip.getAttribute('src') ?? '');
    fireEvent.ended(clip);
    act(() => vi.advanceTimersByTime(650));
  }

  expect(new Set(played).size).toBe(nflMoments.length);
  expect(played).not.toEqual(nflMoments.map(moment => moment.video));
  expect(screen.getByLabelText(/clip$/).getAttribute('src')).not.toBe(played.at(-1));
});

it('cancels a channel change immediately when powered off', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><OpenChannel {...props} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'POWER OFF' }));
  act(() => vi.advanceTimersByTime(25000));
  expect(screen.queryByLabelText(/clip$/)).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Changing NFL GIF channel' })).not.toBeInTheDocument();
});

it('uses a complete shuffled mood pool, without opposite reactions or immediate repeats', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
  for (const mood of ['win', 'lose'] as const) {
    const deck = shuffledMomentIndexes(mood);
    expect(new Set(deck).size).toBe(deck.length);
    expect(deck.length).toBeGreaterThan(20);
    expect(deck.every(index => nflMoments[index].mood === mood || nflMoments[index].mood === 'neutral')).toBe(true);
    expect(shuffledMomentIndexes(mood, deck.at(-1))[0]).not.toBe(deck.at(-1));
  }
});

it('retunes immediately for a league switch but waits until clip end for a score mood change', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
  const { rerender } = render(<MemoryRouter><OpenChannel {...props} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'POWER ON // NFL MOMENTS' }));
  act(() => vi.advanceTimersByTime(650));
  const first = screen.getByLabelText(/clip$/).getAttribute('src');
  rerender(<MemoryRouter><OpenChannel {...props} outlook={{ ...neutral, mood: 'lose', losses: 1, pending: 0 }} /></MemoryRouter>);
  expect(screen.getByLabelText(/clip$/).getAttribute('src')).toBe(first);
  fireEvent.ended(screen.getByLabelText(/clip$/));
  act(() => vi.advanceTimersByTime(650));
  expect(nflMoments.find(moment => moment.video === screen.getByLabelText(/clip$/).getAttribute('src'))?.mood).toMatch(/lose|neutral/);

  rerender(<MemoryRouter><OpenChannel {...props} contextKey="league:two" contextLabel="AGS DYNASTY" outlook={{ ...neutral, mood: 'win', wins: 1, pending: 0 }} /></MemoryRouter>);
  expect(screen.getByRole('status', { name: 'Changing NFL GIF channel' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(650));
  expect(nflMoments.find(moment => moment.video === screen.getByLabelText(/clip$/).getAttribute('src'))?.mood).toMatch(/win|neutral/);
  expect(screen.getByText(/AGS DYNASTY/)).toBeInTheDocument();
});

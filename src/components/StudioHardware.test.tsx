import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CortisolMeter } from './CortisolMeter';
import { MatchupPresser } from './MatchupPresser';
import { StudioChyronTicker } from './StudioChyronTicker';
import { studioStories } from '@/utils/studioStories';
afterEach(cleanup);
it('calculates sweat from hazards and actual rooting conflicts, including the composed baseline', () => {
  const { rerender } = render(<CortisolMeter lineupHazards={6} rootingConflicts={3} />);
  expect(screen.getByLabelText(/189 sweat BPM, CRITICAL/)).toBeInTheDocument();
  expect(screen.getByText('Recommend immediate beverage')).toBeInTheDocument();
  rerender(<CortisolMeter lineupHazards={0} rootingConflicts={0} />);
  expect(screen.getByLabelText(/72 sweat BPM, COMPOSED/)).toBeInTheDocument();
});
it('writes a local matchup-specific excuse and allows dismissal', () => {
  render(<MatchupPresser own="Sam's Spudz" opponent="Hunt For Reed Brocktober" />);
  fireEvent.click(screen.getByRole('button', { name: /Draft excuse for Sam's Spudz/ }));
  expect(screen.getByRole('status').textContent).toMatch(/Sam's Spudz|Hunt For Reed Brocktober/);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss coaching excuse' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('produces exactly ten explicitly fictional headlines with real context and graceful missing-data fallbacks', () => {
  const stories = studioStories(['My Kittle Tony', "Sam's Spudz", 'Hunt For Reed Brocktober'], ['Puka Nacua', "D'Andre Swift"]);
  expect(stories).toHaveLength(10);
  for (const value of ['My Kittle Tony', "Sam's Spudz", 'Hunt For Reed Brocktober', 'Puka Nacua', "D'Andre Swift", 'ETSY', 'UN HUMAN', 'CERN', 'VATICAN']) expect(stories.join(' ')).toContain(value);
  expect(studioStories([], []).join(' ')).not.toMatch(/undefined|NaN/);
});
it('lets the user pause and collapse the satire wire', () => {
  render(<StudioChyronTicker />);
  fireEvent.click(screen.getByRole('button', { name: 'Pause satire ticker' }));
  expect(screen.getByRole('button', { name: 'Resume satire ticker' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Collapse satire ticker' }));
  expect(screen.queryByLabelText(/Fictional studio headlines/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Expand satire ticker' }));
  expect(screen.getByLabelText(/Fictional studio headlines/)).toBeInTheDocument();
});

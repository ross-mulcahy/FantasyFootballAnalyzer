import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioLandingPage } from './StudioLandingPage';

it('gives a first-time visitor a setup path and a useful studio guide', () => {
  render(<StudioLandingPage />);

  expect(screen.getByRole('heading', { level: 1, name: /the witching hour/i })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /connect your league/i })[0]).toHaveAttribute('href', '/settings');
  expect(screen.getByText(/find a Sleeper league by username/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /RedZone Wire & Scott/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /The Blue Tent/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Prepare without a league/i })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Pixel Scott/i })).toBeInTheDocument();
});

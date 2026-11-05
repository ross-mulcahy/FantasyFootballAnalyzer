import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NflTeamChip } from './NflTeamChip';

describe('NflTeamChip', () => {
  it('shows canonical team abbreviations with their broadcast accent, without logo art', () => {
    const { container } = render(<NflTeamChip team="JAX" />);
    expect(screen.getByText('JAX')).toHaveAttribute('title', 'Jacksonville Jaguars');
    expect(screen.getByText('JAX')).toHaveStyle({ '--team-color': '#006778' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a readable free-agent fallback', () => {
    render(<NflTeamChip team={null} />);
    expect(screen.getByText('FA')).toHaveAttribute('title', 'Free agent');
  });
});

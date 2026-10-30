import { expect, it } from 'vitest';
import { lineupProjection, statLines } from './playerWeek';
it('keeps zeroes, ignores bench projections, and refuses partial lineup sums', () => {
  const team = { id: '1', name: 'Team', roster: [
    { id: '1', name: 'One', position: 'QB', nflTeam: 'BUF', slot: 'QB', projection: 0 },
    { id: '2', name: 'Two', position: 'WR', nflTeam: 'KC', slot: 'WR', projection: 12.5 },
    { id: '3', name: 'Bench', position: 'RB', nflTeam: 'DET', slot: 'Bench', projection: 99 },
  ] };
  expect(lineupProjection(team)).toBe(12.5);
  team.roster[1].projection = NaN;
  expect(lineupProjection(team)).toBeNull();
  expect(statLines({ rec_yd: 0, rec_td: null }, { rec_yd: 'Rec yards', rec_td: 'Rec TD' })).toEqual([{ label: 'Rec yards', value: 0 }]);
});

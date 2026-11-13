import { expect, it } from 'vitest';
import type { NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from './sharedPlayers';
import { channelOutlook } from './openChannelMood';

const context = (name: string, current: number, projected: number): SharedLeagueContext => ({
  saved: { platform: 'sleeper', leagueId: name, name, season: 2026 }, myTeamId: 'a',
  snapshot: { platform: 'sleeper', leagueId: name, season: 2026, week: 9, fetchedAt: Date.now(),
    teams: [
      { id: 'a', name: 'Mine', roster: [{ id: '1', name: 'Player', position: 'RB', nflTeam: 'BAL', slot: 'RB' }] },
      { id: 'b', name: 'Theirs', roster: [{ id: '2', name: 'Other', position: 'RB', nflTeam: 'PIT', slot: 'RB' }] },
    ],
    matchups: [{ id: 'm', team1Id: 'a', team2Id: 'b', team1Points: current, team2Points: 10,
      team1Projection: projected, team2Projection: 100, period: 'Week 9' }],
  },
});
const timeline = (state: 'pre' | 'in'): NFLTimeline => ({ fetchedAt: Date.now(), warnings: [], events: [], games: [
  { id: 'g', name: 'BAL @ PIT', teams: ['BAL', 'PIT'], kickoff: '', state, quarter: 1, clock: '', detail: '' },
] });

it('uses projections before kickoff and current scores after a starter enters a live game', () => {
  const league = context('One', 0, 120);
  expect(channelOutlook([league], { '2026:9': { data: timeline('pre') } }).mood).toBe('win');
  expect(channelOutlook([league], { '2026:9': { data: timeline('in') } }).mood).toBe('lose');
});

it('uses only supplied league contexts and aggregates all-league results without inventing a mood', () => {
  const winning = context('One', 20, 120), losing = context('Two', 0, 80);
  const feed = { '2026:9': { data: timeline('in') } };
  expect(channelOutlook([winning], feed)).toMatchObject({ mood: 'win', wins: 1, losses: 0 });
  expect(channelOutlook([losing], feed)).toMatchObject({ mood: 'lose', wins: 0, losses: 1 });
  expect(channelOutlook([winning, losing], feed)).toMatchObject({ mood: 'mixed', wins: 1, losses: 1 });
});

it('stays neutral when projection and live evidence are missing', () => {
  const league = context('One', 0, 120);
  league.snapshot!.matchups[0].team1Projection = null;
  league.snapshot!.teams[0].roster = null;
  expect(channelOutlook([league], { '2026:9': { data: timeline('pre') } })).toMatchObject({ mood: 'neutral', pending: 1 });
});

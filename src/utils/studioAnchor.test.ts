import { expect, it } from 'vitest';
import type { HeadToHeadRecord } from '@/types';
import type { NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from './sharedPlayers';
import { studioExcuseCandidate, studioProjectedRecord, studioRivalryFromRecords } from './studioAnchor';

const context: SharedLeagueContext = {
  saved: { platform: 'sleeper', leagueId: '123', season: 2026, name: 'Sunday Syndicate' }, myTeamId: '1',
  snapshot: { platform: 'sleeper', leagueId: '123', season: 2026, week: 9, fetchedAt: Date.now(),
    teams: [
      { id: '1', name: "Sam's Spudz", roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', projection: 12 }] },
      { id: '2', name: 'Football Sweets', roster: [{ id: 'p2', name: 'George Kittle', position: 'TE', nflTeam: 'SF', slot: 'TE', projection: 14 }] },
    ],
    matchups: [{ id: 'm1', team1Id: '1', team2Id: '2', team1Points: 10, team2Points: 45, team1Projection: 80, team2Projection: 120, period: 'Week 9' }] },
};
const game = { id: 'g1', name: 'LAR @ SF', kickoff: '2026-11-08T18:00:00Z', teams: ['LAR', 'SF'], state: 'pre' as const, detail: 'Pregame', quarter: 0, clock: '' };
const feed: NFLTimeline = { fetchedAt: Date.now(), events: [], warnings: [], games: [game] };

it('forecasts only matchups with comparable weekly projections', () => {
  const pending: SharedLeagueContext = { ...context, saved: { ...context.saved, leagueId: '456' }, snapshot: { ...context.snapshot!, leagueId: '456', matchups: [{ ...context.snapshot!.matchups[0], team1Projection: null }], teams: context.snapshot!.teams.map(team => ({ ...team, roster: null })) } };
  expect(studioProjectedRecord([context, pending])).toEqual({ wins: 0, losses: 1, ties: 0, pending: 1 });
});

it('withholds excuses before kickoff and for recoverable games, then allows a live blowout or final loss', () => {
  const match = context.snapshot!.matchups[0];
  expect(studioExcuseCandidate(context, match, feed)).toBeNull();
  const live = { ...feed, games: [{ ...game, state: 'in' as const }] };
  expect(studioExcuseCandidate(context, { ...match, team1Projection: 108 }, live)).toBeNull();
  expect(studioExcuseCandidate(context, { ...match, team2Points: 35 }, live)).toBeNull();
  expect(studioExcuseCandidate(context, match, live)).toMatchObject({ status: 'out of sight', deficit: 40 });
  const final = { ...feed, games: [{ ...game, state: 'post' as const }] };
  expect(studioExcuseCandidate(context, match, final)).toMatchObject({ status: 'lost', deficit: 35 });
});

it('reports prior head-to-head results and excludes the current week', () => {
  const record: HeadToHeadRecord = { opponentId: 'owner-2', opponentName: 'Football Sweets', wins: 9, losses: 0, ties: 0, pointsFor: 300, pointsAgainst: 200,
    matchups: [{ season: 2025, week: 8, teamScore: 120, opponentScore: 110, won: true }, { season: 2026, week: 2, teamScore: 95, opponentScore: 100, won: false }, { season: 2026, week: 9, teamScore: 130, opponentScore: 100, won: true }] };
  expect(studioRivalryFromRecords('r', 'Sunday Syndicate', "Sam's Spudz", 'Football Sweets', 'owner-2', new Map([['owner-2', record]]), 2026, 9)).toMatchObject({ wins: 1, losses: 1, ties: 0, recent: { season: 2026, week: 2, ownPoints: 95, opponentPoints: 100 } });
});

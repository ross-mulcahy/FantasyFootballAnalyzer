import { expect, it } from 'vitest';
import type { GameDaySnapshot } from '@/types/gameDay';
import type { NFLTimeline } from '@/api/nflTimeline';
import type { ScoreChange } from './broadcastControl';
import { sweatBpm } from './cortisol';
import { matchupKey } from './gameDayLinks';
import { curatedWatchAlerts, leagueWatchChannels } from './leagueWatch';
import { savedLeagueKey, type SavedLeague } from './savedLeagues';

const now = Date.parse('2026-11-08T18:00:00Z');
const saved: SavedLeague = { platform: 'sleeper', leagueId: 'test', season: 2026, name: 'Sunday Syndicate' };
const snapshot: GameDaySnapshot = { platform: 'sleeper', leagueId: 'test', season: 2026, week: 9, fetchedAt: now,
  teams: [
    { id: '1', name: 'The Close Game', roster: [{ id: 'p1', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 12, projection: 20 }] },
    { id: '2', name: 'The Challenger', roster: [{ id: 'p2', name: 'Brock Purdy', position: 'QB', nflTeam: 'SF', slot: 'QB', points: 10, projection: 21 }] },
    { id: '3', name: 'The Other Game', roster: [{ id: 'p3', name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', slot: 'QB', points: 3, projection: 20 }, { id: 'p4', name: 'No Projection', position: 'RB', nflTeam: 'DAL', slot: 'RB', points: 0, projection: null }] },
    { id: '4', name: 'The Rival', roster: [{ id: 'p5', name: 'Runner', position: 'RB', nflTeam: 'NYG', slot: 'RB', points: 0, projection: 22 }] },
  ],
  matchups: [
    { id: 'close', team1Id: '1', team2Id: '2', team1Points: 12, team2Points: 10, team1Projection: 100, team2Projection: 101, period: 'Week 9' },
    { id: 'other', team1Id: '3', team2Id: '4', team1Points: 3, team2Points: 0, period: 'Week 9' },
  ] };
const data: NFLTimeline = { fetchedAt: now, warnings: [], games: [
  { id: 'g1', name: 'LAR @ SF', kickoff: '', teams: ['LAR', 'SF'], state: 'in', detail: '', quarter: 2, clock: '8:00' },
  { id: 'g2', name: 'DAL @ NYG', kickoff: '', teams: ['DAL', 'NYG'], state: 'in', detail: '', quarter: 2, clock: '7:00' },
], events: [{ id: 'play-1', gameId: 'g1', game: 'LAR @ SF', kickoff: '', occurredAt: new Date(now - 60000).toISOString(), quarter: 2, clock: '8:00', kind: 'Touchdown', description: 'An NFL touchdown' }] };

it('prioritises a fresh confirmed score change over a close game and labels NFL impact cautiously', () => {
  const match = snapshot.matchups[1];
  const change: ScoreChange = { id: `${savedLeagueKey(saved)}:9:${matchupKey(match)}:${now}`, at: now, leagueKey: savedLeagueKey(saved), leagueName: saved.name, season: 2026, week: 9,
    ownName: 'The Other Game', opponentName: 'The Rival', beforeOwn: 0, beforeOpponent: 0, own: 3, opponent: 0, ownDelta: 3, opponentDelta: 0 };
  const channels = leagueWatchChannels(saved, snapshot, data, [change], now);
  expect(channels[0].first.name).toBe('The Other Game');
  expect(channels[0].alerts[0]).toMatchObject({ kind: 'score', headline: 'SCORE SWING // 3.00 PTS' });
  expect(channels[0].alerts[0].score).toMatchObject({ beforeOwn: 0, own: 3, ownDelta: 3 });
  expect(channels[0].first.projection).toBe('20.00 partial');
  expect(channels[0].projectedGap).toBeNull();
  const close = channels.find(channel => channel.first.name === 'The Close Game')!;
  expect(close.alerts[0].detail).toContain('fantasy impact unconfirmed');
  expect(close.currentGap).toBe(2);
  expect(close.first.featured).toMatchObject([{ name: 'Puka Nacua', points: 12, game: 'LAR @ SF · Q2 8:00' }]);
  expect(close.second.featuredMode).toBe('scorers');
  expect(curatedWatchAlerts([close, { ...close, key: 'other-channel' }]).filter(alert => alert.id === 'play-1')).toMatchObject([{ relatedChannels: 2 }]);
  const play = close.alerts[0];
  expect(curatedWatchAlerts([{ ...close, alerts: [play, { ...play, id: 'play-2' }, { ...play, id: 'play-3' }, { ...play, id: 'play-4' }, { ...play, id: 'play-5' }] }]).filter(alert => alert.kind === 'play')).toHaveLength(4);
});

it('uses projected starters before anyone scores and excludes bench players from the spotlight', () => {
  const pending: GameDaySnapshot = { ...snapshot, teams: [
    { id: '1', name: 'First', roster: [
      { id: 'starter', name: 'Projected Starter', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: 0, projection: 18 },
      { id: 'bench', name: 'Bench Hero', position: 'RB', nflTeam: 'LAR', slot: 'BN', points: 30, projection: 30 },
    ] },
    snapshot.teams[1], snapshot.teams[2], snapshot.teams[3],
  ] };
  const channel = leagueWatchChannels(saved, pending, data, [], now).find(row => row.first.name === 'First')!;
  expect(channel.first.featuredMode).toBe('up next');
  expect(channel.first.featured).toMatchObject([{ name: 'Projected Starter', projection: 18 }]);
});

it('takes a shared NFL play to the player rostered in the matchup, even if another game is first', () => {
  const withRavens: GameDaySnapshot = { ...snapshot, teams: [
    { ...snapshot.teams[0], roster: [{ id: 'lamar', name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', slot: 'QB' }] },
    snapshot.teams[1],
    { ...snapshot.teams[2], name: 'Move The Chains', roster: [{ id: 'hill', name: 'Justice Hill', position: 'RB', nflTeam: 'BAL', slot: 'RB' }] },
    snapshot.teams[3],
  ] };
  const timeline: NFLTimeline = { fetchedAt: now, warnings: [], games: [
    { id: 'ravens', name: 'JAX @ BAL', kickoff: '', teams: ['JAC', 'BAL'], state: 'in', detail: '', quarter: 2, clock: '7:15' },
  ], events: [{ id: 'hill-td', gameId: 'ravens', game: 'JAX @ BAL', kickoff: '', occurredAt: new Date(now - 60000).toISOString(), quarter: 2, clock: '7:15', kind: 'Rushing Touchdown', description: 'Justice Hill 65 Yd Rush (Jake Moody Kick)' }] };
  const channels = leagueWatchChannels(saved, withRavens, timeline, [], now);
  expect(channels[0].first.name).toBe('The Close Game');
  expect(curatedWatchAlerts(channels)[0]).toMatchObject({ id: 'hill-td', channelKey: channels[1].key, playerRelevance: 2, relatedChannels: 2 });

  withRavens.teams[2].roster![0].slot = 'BN';
  const benchChannels = leagueWatchChannels(saved, withRavens, timeline, [], now);
  expect(curatedWatchAlerts(benchChannels)[0]).toMatchObject({ id: 'hill-td', channelKey: benchChannels.find(channel => channel.first.name === 'Move The Chains')?.key, playerRelevance: 1, relatedChannels: 2 });
  expect(benchChannels.find(channel => channel.first.name === 'Move The Chains')?.games).toMatchObject([{ id: 'ravens' }]);
});

it('calibrates the playful stress scale for several cross-league conflicts', () => {
  expect(sweatBpm(0, 0)).toBe(72);
  expect(sweatBpm(1, 0)).toBe(82);
  expect(sweatBpm(2, 5)).toBe(118);
});

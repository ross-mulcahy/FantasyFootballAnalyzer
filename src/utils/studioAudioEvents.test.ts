import { expect, it } from 'vitest';
import type { SharedLeagueContext } from './sharedPlayers';
import type { LineupWarning } from './gameDayInsights';
import { StudioAudioEvents } from './studioAudioEvents';

const saved = { platform: 'sleeper' as const, leagueId: '123', season: 2026, name: 'Sunday Syndicate' };
const context = (week: number, margin: number): SharedLeagueContext => ({
  saved, myTeamId: '1', error: null,
  snapshot: { platform: 'sleeper', leagueId: saved.leagueId, season: 2026, week, fetchedAt: 1,
    teams: [{ id: '1', name: 'Mine', roster: [] }, { id: '2', name: 'Theirs', roster: [] }],
    matchups: [{ id: 'match', team1Id: '1', team2Id: '2', team1Points: 0, team2Points: 0,
      team1Projection: 100, team2Projection: 100 + margin, period: `Week ${week}` }],
  },
});
const warning = (message: string): LineupWarning => ({ key: 'roster:0', league: saved, teamId: '1', message, locked: false, saved: false });

it('seeds the first snapshot silently, then plays one cue only for a newly reported hazard', () => {
  const audio = new StudioAudioEvents();
  const game = context(9, 20);
  expect(audio.observe([game], {}, [warning('Jayden Reed: Questionable')], 100_000)).toBeNull();
  expect(audio.observe([game], {}, [warning('Jayden Reed: Questionable')], 100_001)).toBeNull();
  expect(audio.observe([game], {}, [warning('Jayden Reed: Out')], 100_002)).toBe('hazard');
  expect(audio.observe([game], {}, [warning('Jayden Reed: Out')], 140_000)).toBeNull();
  expect(audio.observe([game], {}, [warning('Jayden Reed: Out'), warning('Derrick Henry: Out')], 140_001)).toBe('hazard');
});

it('plays a close-game pulse only on threshold entry, with a cooldown and a silent new-week baseline', () => {
  const audio = new StudioAudioEvents();
  expect(audio.observe([context(9, 20)], {}, [], 100_000)).toBeNull();
  expect(audio.observe([context(9, 8)], {}, [], 100_001)).toBe('close');
  expect(audio.observe([context(9, 6)], {}, [], 100_002)).toBeNull();
  expect(audio.observe([context(9, 20)], {}, [], 100_003)).toBeNull();
  expect(audio.observe([context(9, 5)], {}, [], 110_000)).toBeNull();
  expect(audio.observe([context(10, 20)], {}, [], 170_000)).toBeNull();
  expect(audio.observe([context(10, 7)], {}, [], 170_001)).toBe('close');
});

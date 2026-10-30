import { expect, it } from 'vitest';
import { playerIdentityIndex, sharedPlayers, type SharedLeagueContext } from './sharedPlayers';
import type { RosterPlayer } from '@/types/gameDay';
import type { Platform } from '@/types';
const ids = playerIdentityIndex([['7564', '4362628', '33393', "Ja'Marr Chase", 'WR']]);
const chase = (id: string): RosterPlayer => ({ id, name: "Ja'Marr Chase", position: 'WR', nflTeam: 'CIN', slot: 'WR', points: 10, projection: 20 });
const defense = (id: string): RosterPlayer => ({ id, name: 'Ravens', position: 'DEF', nflTeam: 'BAL', slot: 'D/ST', points: 5, projection: 7 });
export function context(platform: Platform, id: string, own: RosterPlayer[], opponent: RosterPlayer[], week = 8): SharedLeagueContext {
  return { saved: { platform, leagueId: id, name: `League ${id}`, season: 2026 }, myTeamId: '1', snapshot: {
    platform, leagueId: id, season: 2026, week, fetchedAt: 1000,
    teams: [{ id: '1', name: 'Mine', roster: own }, { id: '2', name: 'Theirs', roster: opponent }, { id: '3', name: 'Unrelated', roster: [chase('7564')] }],
    matchups: [{ id: 'm1', team1Id: '1', team2Id: '2', team1Points: 0, team2Points: 0, period: `Week ${week}` }, { id: 'm2', team1Id: '3', team2Id: null, team1Points: 0, team2Points: null, period: 'Unrelated' }],
  } };
}
it('matches ID aliases across all three platforms, counts own and opposing players separately, and groups defenses by NFL team', () => {
  const groups = sharedPlayers([
    context('espn', 'e', [{ ...chase('4362628'), name: 'J. Chase' }], [defense('33')]),
    context('sleeper', 's', [chase('7564')], [defense('BAL')]),
    context('yahoo', 'y', [chase('461.p.33393')], [defense('461.p.100033')]),
    context('sleeper', 's2', [], [chase('7564')]),
  ], ids);
  expect(groups).toHaveLength(2);
  expect(groups.find(p => p.name === "Ja'Marr Chase")).toMatchObject({ owned: 3, opposing: 1, matchupCount: 4, espnId: '4362628' });
  expect(groups.find(p => p.defense)).toMatchObject({ name: 'Baltimore Ravens D/ST', owned: 0, opposing: 3, matchupCount: 3 });
});
it('excludes bench, IR, empty slots and unrelated matchups and deduplicates a starter repeated in one lineup', () => {
  const first = context('sleeper', 's', [chase('7564'), chase('7564'), { ...chase('0') }, { ...defense('BAL'), slot: 'BN' }], []);
  const second = context('espn', 'e', [{ ...chase('4362628'), slot: 'IR' }], []);
  expect(sharedPlayers([first, second], ids)).toEqual([]);
});
it('keeps distinct game weeks separate and requires a selected team', () => {
  const contexts = [context('sleeper', 's', [chase('7564')], []), context('espn', 'e', [chase('4362628')], [], 9)];
  expect(sharedPlayers(contexts, ids)).toEqual([]);
  expect(sharedPlayers([contexts[0], { ...contexts[0], myTeamId: undefined }], ids)).toEqual([]);
});
it('uses normalized names with matching position/team as a fallback and refuses ambiguous same-platform identities', () => {
  const first = context('sleeper', 's', [chase('unmapped')], []);
  const second = context('espn', 'e', [{ ...chase('unmapped2'), name: 'Jamarr Chase' }], []);
  expect(sharedPlayers([first, second], playerIdentityIndex([]))).toHaveLength(1);
  const ambiguous = context('espn', 'e2', [{ ...chase('different') }], []);
  expect(sharedPlayers([first, second, ambiguous], playerIdentityIndex([]))).toEqual([]);
});
it('retains each league score and projection without summing across scoring rules', () => {
  const groups = sharedPlayers([context('sleeper', 's', [chase('7564')], []), context('espn', 'e', [{ ...chase('4362628'), points: 15, projection: 30 }], [])], ids);
  expect(groups[0].occurrences.map(o => [o.player.points, o.player.projection])).toEqual([[10, 20], [15, 30]]);
});

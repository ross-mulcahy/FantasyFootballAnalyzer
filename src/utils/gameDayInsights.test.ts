import { beforeEach, expect, it } from 'vitest';
import type { MajorEvent, NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from './sharedPlayers';
import { buildRecap, eventImpact, lineupWarnings, loadRecaps, matchupMargin, mergeRecaps, playerAvailability, saveRecaps } from './gameDayInsights';
const now = Date.parse('2026-11-02T23:00Z');
const context = (name = 'One', reverse = false): SharedLeagueContext => ({ saved: { platform: 'espn', leagueId: name, name, season: 2026 }, myTeamId: reverse ? '2' : '1', snapshot: { platform: 'espn', leagueId: name, season: 2026, week: 8, fetchedAt: now, teams: [
  { id: '1', name: 'Home', roster: [{ id: 'a', name: "Ja'Marr Chase", nflTeam: 'CIN', position: 'WR', slot: 'WR', points: 20, projection: 19 }, { id: 'b', name: 'Joe Burrow', nflTeam: 'CIN', position: 'QB', slot: 'QB', points: 22, projection: 21 }] },
  { id: '2', name: 'Away', roster: [{ id: 'c', name: 'Steelers D/ST', nflTeam: 'PIT', position: 'DEF', slot: 'D/ST', points: 0, projection: 5 }] },
], matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: 42, team2Points: 0, team1Projection: 40, team2Projection: 45, period: 'Week 8 matchup total' }] } });
const timeline = (state: 'in' | 'post' | 'pre' = 'in'): NFLTimeline => ({ fetchedAt: now, warnings: [], events: [], games: [{ id: 'g', name: 'CIN @ PIT', teams: ['CIN', 'PIT'], kickoff: '', state, quarter: 2, clock: '8:00', detail: '' }] });
const event = (description = "Ja'Marr Chase 24 Yd pass from Joe Burrow (Evan McPherson Kick)", kind = 'Passing Touchdown'): MajorEvent => ({ id: 'e', gameId: 'g', game: 'CIN @ PIT', kickoff: '', occurredAt: null, quarter: 2, clock: '8:00', description, kind });
beforeEach(() => localStorage.clear());
it('attributes touchdown passer, receiver and opposing defense across own and opposing teams', () => {
  const impact = eventImpact(event(), [context(), context('Two', true)], timeline());
  expect(impact[0].good).toEqual(expect.arrayContaining(["Ja'Marr Chase", 'Joe Burrow', 'Steelers D/ST']));
  expect(impact[1].bad).toEqual(expect.arrayContaining(["Ja'Marr Chase", 'Joe Burrow', 'Steelers D/ST']));
});
it('preserves mixed impact in one league rather than claiming a net points change', () => {
  const c = context(); c.snapshot!.teams[1].roster!.push(c.snapshot!.teams[0].roster!.pop()!);
  const [impact] = eventImpact(event(), [c], timeline());
  expect(impact.good).toContain("Ja'Marr Chase"); expect(impact.bad).toContain('Joe Burrow');
});
it('omits bench players, unrelated games, reversed plays and uncertain return plays', () => {
  const c = context(); c.snapshot!.teams[0].roster!.forEach(p => { p.slot = 'Bench'; }); c.snapshot!.teams[1].roster = [];
  expect(eventImpact(event(), [c], timeline())).toEqual([]);
  expect(eventImpact({ ...event(), gameId: 'other' }, [context()], timeline())).toEqual([]);
  expect(eventImpact(event('Ja\'Marr Chase touchdown REVERSED'), [context()], timeline())).toEqual([]);
  expect(eventImpact(event('Ja\'Marr Chase punt return touchdown'), [context()], timeline())).toEqual([]);
});
it('recognizes unique initial-and-surname interceptions and reverses the impact direction', () => {
  const impact = eventImpact(event('(Shotgun) J.Burrow pass INTERCEPTED by T.Watt.', 'Turnover'), [context()], timeline());
  expect(impact[0].bad).toEqual(['Joe Burrow', 'Steelers D/ST']);
});
it('does not penalize a fumble recovered by the same team', () => {
  expect(eventImpact(event('Joe Burrow FUMBLES RECOVERED by CIN-Chase.', 'Turnover'), [context()], timeline())).toEqual([]);
});
it('does not count a pregame 0-0 score as close and keeps projections separate from multiweek totals', () => {
  const c = context(), match = c.snapshot!.matchups[0];
  expect(matchupMargin(c, match, 'current', timeline('pre'))).toBeNull();
  expect(matchupMargin(c, match, 'projected', timeline())).toBe(-5);
  expect(matchupMargin(c, match, 'current', timeline())).toBe(42);
  match.period = 'Matchup total · Weeks 8–9';
  expect(matchupMargin(c, match, 'projected', timeline())).toBeNull();
});
it('maps supported injury flags without treating active status as an issue', () => {
  expect(playerAvailability('OUT')).toBe('Out'); expect(playerAvailability('Q')).toBe('Questionable'); expect(playerAvailability('ACT')).toBeUndefined();
});
it('warns for own empty, unavailable and bye starters, while excluding bench and opposing lineups', () => {
  const c = context();
  c.snapshot!.teams[0].roster!.push({ id: '0', name: 'Empty', nflTeam: '', position: '', slot: 'Flex' }, { id: 'out', name: 'Out player', nflTeam: 'CIN', position: 'RB', slot: 'RB', availability: 'Out' }, { id: 'bye', name: 'Bye player', nflTeam: 'BAL', position: 'WR', slot: 'WR' }, { id: 'bn', name: 'Bench', nflTeam: 'BAL', position: 'WR', slot: 'IR', availability: 'Out' });
  const warnings = lineupWarnings([c], { '2026:8': { data: timeline(), error: null } }, now);
  expect(warnings.map(w => w.message)).toEqual(['Flex: Empty starting slot', 'Out player: Out', 'Bye player: Bye / no game scheduled']);
  expect(warnings[1].locked).toBe(true);
  expect(lineupWarnings([c], {}, now).some(w => w.message.includes('Bye player'))).toBe(false);
});
it('leaves live, stale, missing-roster and unfinished multiweek recap rows pending', () => {
  const c = context(), feeds = { '2026:8': { data: timeline('post'), error: null } };
  expect(buildRecap([c], { '2026:8': { data: timeline(), error: null } }, now)[0].finished).toBe(false);
  c.snapshot!.matchups[0].period = 'Matchup total · Weeks 8–9'; expect(buildRecap([c], feeds, now)[0].finished).toBe(false);
  c.snapshot!.matchups[0].period = 'Week 8'; c.snapshot!.teams[0].roster = null; expect(buildRecap([c], feeds, now)[0].finished).toBe(false);
  expect(buildRecap([context()], feeds, now + 16 * 60000)[0].finished).toBe(false);
});
it('saves per-league top contributors and zero opponent totals, and retains past weeks through rollover', () => {
  const c = context(), feeds = { '2026:8': { data: timeline('post'), error: null } };
  const old = buildRecap([c], feeds, now); expect(old[0]).toMatchObject({ finished: true, opponentPoints: 0, topOwn: { name: 'Joe Burrow', points: 22 }, topOpponent: { points: 0 } });
  c.snapshot!.week = 9; c.snapshot!.fetchedAt++;
  const merged = mergeRecaps(old, buildRecap([c], {}, now));
  expect(merged.map(row => row.week)).toEqual([9, 8]); expect(saveRecaps(merged)).toBe(true); expect(loadRecaps()).toEqual(merged);
});
it('rejects corrupt history and keeps a completed recap when its feed is temporarily unavailable', () => {
  localStorage.setItem('ffa:game-day-recaps:v1', '[{"key":"bad"}]'); expect(loadRecaps()).toEqual([]);
  const c = context(), completed = buildRecap([c], { '2026:8': { data: timeline('post'), error: null } }, now);
  expect(mergeRecaps(completed, buildRecap([c], {}, now))[0].finished).toBe(true);
});

it('still attributes the touchdown when the separate two-point conversion fails', () => {
  const impacts = eventImpact(event("Ja'Marr Chase 24 Yd pass from Joe Burrow (Two-Point Pass Conversion Failed)"), [context()], timeline());
  expect(impacts[0].good).toContain("Ja'Marr Chase"); expect(impacts[0].good).toContain('Joe Burrow');
});

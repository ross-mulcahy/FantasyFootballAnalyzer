import { beforeEach, expect, it } from 'vitest';
import type { SharedLeagueContext } from './sharedPlayers';
import { captureScoreTape, comebackWatch, currentScoreChanges, directorCue, emptyScoreTape, loadScoreTape, saveScoreTape, scoreCueKind, studioShow } from './broadcastControl';

const start = Date.parse('2026-11-08T18:00:00Z');
const game = (ownPoints: number | null, opponentPoints: number | null, fetchedAt = start): SharedLeagueContext => ({
  saved: { platform: 'sleeper', leagueId: '123', season: 2026, name: 'Sunday Syndicate' }, myTeamId: '1',
  snapshot: { platform: 'sleeper', leagueId: '123', season: 2026, week: 9, fetchedAt,
    teams: [{ id: '1', name: 'My Kittle Tony', roster: [{ id: 'p', name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', slot: 'WR', points: ownPoints }] },
      { id: '2', name: 'Football Sweets', roster: [{ id: 'q', name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', slot: 'QB', points: opponentPoints }] }],
    matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: ownPoints, team2Points: opponentPoints, period: 'Week 9' }] },
});
const feed = { '2026:9': { data: { fetchedAt: start, warnings: [], events: [], games: [
  { id: 'g1', name: 'LAR @ SF', kickoff: '', teams: ['LAR', 'SF'], state: 'in' as const, detail: '', quarter: 3, clock: '8:00' },
  { id: 'g2', name: 'DAL @ NYG', kickoff: '', teams: ['DAL', 'NYG'], state: 'pre' as const, detail: '', quarter: 0, clock: '' },
] }, error: null } };

beforeEach(() => localStorage.clear());
it('records only real changes after a baseline and preserves a score correction without replay duplicates', () => {
  const baseline = captureScoreTape(emptyScoreTape(), [game(10, 12)]);
  expect(baseline.changes).toEqual([]);
  const scored = captureScoreTape(baseline, [game(20, 12, start + 1000)]);
  expect(scored.changes[0]).toMatchObject({ ownDelta: 10, opponentDelta: 0, beforeOwn: 10, own: 20 });
  expect(captureScoreTape(scored, [game(20, 12, start + 1000)])).toBe(scored);
  const corrected = captureScoreTape(scored, [game(18, 12, start + 2000)]);
  expect(corrected.changes.map(row => row.ownDelta)).toEqual([-2, 10]);
  saveScoreTape(corrected);
  expect(currentScoreChanges(loadScoreTape(), [game(18, 12, start + 2000)])).toHaveLength(2);
});
it('does not invent a replay delta when provider scores are missing', () => {
  const baseline = captureScoreTape(emptyScoreTape(), [game(null, 12)]);
  expect(captureScoreTape(baseline, [game(8, 12, start + 1000)]).changes).toEqual([]);
});
it('reports comeback needs and remaining starters without presenting a win probability', () => {
  const row = comebackWatch([game(10, 12)], feed)[0];
  expect(row).toMatchObject({ margin: -2, ownLeft: 1, opponentLeft: 1, unknown: false });
  expect(comebackWatch([game(10, 12)], {})[0].ownLeft).toBeNull();
});
it('explains unequal remaining-starter counts with played and empty slots', () => {
  const context = game(10, 12);
  context.snapshot!.teams[0].roster!.push({ id: 'extra', name: 'Extra', position: 'RB', nflTeam: 'LAR', slot: 'RB' });
  context.snapshot!.teams[1].roster!.push({ id: 'finished', name: 'Finished', position: 'WR', nflTeam: 'SEA', slot: 'WR' });
  context.snapshot!.teams[1].roster!.push({ id: '0', name: 'Empty slot', position: '', nflTeam: '', slot: 'FLEX' });
  const finishedFeed = { '2026:9': { data: { ...feed['2026:9'].data, games: [
    ...feed['2026:9'].data.games,
    { id: 'g3', name: 'SF @ SEA', kickoff: '', teams: ['SF', 'SEA'], state: 'post' as const, detail: '', quarter: 4, clock: '0:00' },
  ] }, error: null } };
  const row = comebackWatch([context], finishedFeed)[0];
  expect(row).toMatchObject({ ownLeft: 2, opponentLeft: 1, opponentPlayed: 1, opponentEmpty: 1 });
});
it('directs to a recent real score change and keeps the recap pending while games run', () => {
  const scored = captureScoreTape(captureScoreTape(emptyScoreTape(), [game(10, 12)]), [game(20, 12, start + 1000)]);
  const cue = directorCue(scored.changes, [], [game(20, 12, start + 1000)], start + 2000);
  expect(cue?.headline).toContain('+10.00 point swing');
  expect(cue?.detail).toContain('since the previous score refresh');
  expect(directorCue(scored.changes, [], [game(20, 12)], start + 16 * 60000)).toBeNull();
  const show = studioShow([game(20, 12, start + 1000)], feed, scored.changes, null, start + 2000);
  expect(show.phase).toBe('HALFTIME');
  expect(show.swing).toContain('10.00-point');
  expect(show.record).toContain('1 pending');
});
it('uses only confirmed score differences for opt-in lead and swing cues', () => {
  const first = captureScoreTape(emptyScoreTape(), [game(10, 12)]);
  const lead = captureScoreTape(first, [game(14, 12, start + 1000)]).changes[0];
  expect(scoreCueKind(lead)).toBe('lead');
  const swing = captureScoreTape(first, [game(21, 12, start + 1000)]).changes[0];
  expect(scoreCueKind(swing)).toBe('lead');
  expect(scoreCueKind({ ...swing, beforeOwn: 20, beforeOpponent: 12 })).toBe('swing');
  expect(scoreCueKind({ ...swing, beforeOwn: 20, beforeOpponent: 12, ownDelta: 1, own: 21 })).toBeNull();
});
it('keeps league-wide score tape on the selected league while the all-leagues wall stays personal', () => {
  const wholeLeague = (first: number, second: number, at: number) => {
    const context = game(first, 12, at);
    context.snapshot!.teams.push({ id: '3', name: 'Other A', roster: [] }, { id: '4', name: 'Other B', roster: [] });
    context.snapshot!.matchups.push({ id: 'other', team1Id: '3', team2Id: '4', team1Points: second, team2Points: 3, period: 'Week 9' });
    return context;
  };
  const before = wholeLeague(10, 5, start);
  const after = wholeLeague(20, 15, start + 1000);
  const baseline = captureScoreTape(emptyScoreTape(), [before, { ...before, myTeamId: '3' }]);
  const scored = captureScoreTape(baseline, [after, { ...after, myTeamId: '3' }]);
  expect(scored.changes).toHaveLength(2);
  expect(currentScoreChanges(scored, [after])).toHaveLength(1);
  expect(currentScoreChanges(scored, [after], true)).toHaveLength(2);
});

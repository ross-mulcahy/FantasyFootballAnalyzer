import type { MajorEvent } from '@/api/nflTimeline';
import type { SharedLeagueContext } from './sharedPlayers';
import type { StudioConflict } from './studioAnchor';
import { buildRecap, eventImpact, finiteScore, matchupSides, myMatchups, type TimelineFeeds } from './gameDayInsights';
import { matchupKey } from './gameDayLinks';
import { lineupProgress } from './matchupGameStatus';
import { basePosition } from './playerNames';
import { isStartingSlot } from './playerWeek';
import { savedLeagueKey } from './savedLeagues';
import { safeLocalStorage } from './safeStorage';

const TAPE_KEY = 'ffa:studio-score-tape:v1';
export interface ScoreChange {
  id: string; at: number; leagueKey: string; leagueName: string; season: number; week: number;
  ownName: string; opponentName: string; beforeOwn: number; beforeOpponent: number;
  own: number; opponent: number; ownDelta: number; opponentDelta: number;
}
interface Baseline { at: number; own: number | null; opponent: number | null }
export interface ScoreTape { baselines: Record<string, Baseline>; changes: ScoreChange[] }
export const emptyScoreTape = (): ScoreTape => ({ baselines: {}, changes: [] });
export function loadScoreTape(): ScoreTape {
  try {
    const value = JSON.parse(safeLocalStorage.getItem(TAPE_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || !Array.isArray(value.changes) || !value.baselines || typeof value.baselines !== 'object') return emptyScoreTape();
    const baselines = Object.fromEntries(Object.entries(value.baselines).filter((entry): entry is [string, Baseline] => {
      const row = entry[1] as Baseline;
      return !!row && finiteScore(row.at) && (row.own === null || finiteScore(row.own)) && (row.opponent === null || finiteScore(row.opponent));
    }).slice(0, 250));
    const changes = value.changes.filter((row: ScoreChange) => row && ['id', 'leagueKey', 'leagueName', 'ownName', 'opponentName'].every(key => typeof row[key as keyof ScoreChange] === 'string') &&
      [row.at, row.season, row.week, row.beforeOwn, row.beforeOpponent, row.own, row.opponent, row.ownDelta, row.opponentDelta].every(finiteScore)).slice(0, 150);
    return { baselines, changes };
  } catch { return emptyScoreTape(); }
}
/** Capture provider score changes between observed snapshots. Never attribute a delta to an NFL play. */
export function captureScoreTape(previous: ScoreTape, contexts: SharedLeagueContext[]): ScoreTape {
  const baselines = { ...previous.baselines };
  const changes = [...previous.changes];
  let touched = false;
  for (const context of contexts) {
    const snapshot = context.snapshot;
    if (!snapshot || !context.myTeamId) continue;
    for (const match of myMatchups(context)) {
      const sides = matchupSides(context, match);
      const leagueKey = savedLeagueKey(context.saved);
      const key = `${leagueKey}:${snapshot.week}:${matchupKey(match)}`;
      const old = baselines[key];
      if (old && old.at >= snapshot.fetchedAt) continue;
      const own = finiteScore(sides.ownPoints) ? sides.ownPoints : null;
      const opponent = finiteScore(sides.opponentPoints) ? sides.opponentPoints : null;
      baselines[key] = { at: snapshot.fetchedAt, own, opponent };
      touched = true;
      if (!old || !finiteScore(old.own) || !finiteScore(old.opponent) || own === null || opponent === null) continue;
      if (old.own === own && old.opponent === opponent) continue;
      changes.unshift({ id: `${key}:${snapshot.fetchedAt}`, at: snapshot.fetchedAt, leagueKey, leagueName: context.saved.name, season: snapshot.season, week: snapshot.week,
        ownName: sides.own?.name ?? 'Your team', opponentName: sides.opponent?.name ?? 'Opponent', beforeOwn: old.own, beforeOpponent: old.opponent,
        own, opponent, ownDelta: own - old.own, opponentDelta: opponent - old.opponent });
    }
  }
  return touched ? { baselines: Object.fromEntries(Object.entries(baselines).sort((a, b) => b[1].at - a[1].at).slice(0, 250)), changes: changes.sort((a, b) => b.at - a.at).slice(0, 150) } : previous;
}
export function saveScoreTape(tape: ScoreTape): void { safeLocalStorage.setItem(TAPE_KEY, JSON.stringify(tape)); }
export function currentScoreChanges(tape: ScoreTape, contexts: SharedLeagueContext[]): ScoreChange[] {
  const weeks = new Set(contexts.flatMap(context => context.snapshot ? [`${context.snapshot.season}:${context.snapshot.week}`] : []));
  const keys = new Set(contexts.map(context => savedLeagueKey(context.saved)));
  return tape.changes.filter(row => keys.has(row.leagueKey) && weeks.has(`${row.season}:${row.week}`));
}
export interface ComebackRow { key: string; league: string; own: string; opponent: string; margin: number | null; ownLeft: number | null; opponentLeft: number | null; unknown: boolean }
export function comebackWatch(contexts: SharedLeagueContext[], feeds: TimelineFeeds): ComebackRow[] {
  return contexts.flatMap(context => myMatchups(context).map(match => {
    const sides = matchupSides(context, match);
    const data = feeds[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null;
    const own = lineupProgress(sides.own, data), opponent = lineupProgress(sides.opponent, data);
    return { key: `${savedLeagueKey(context.saved)}:${matchupKey(match)}`, league: context.saved.name, own: sides.own?.name ?? 'Your team', opponent: sides.opponent?.name ?? 'Opponent',
      margin: finiteScore(sides.ownPoints) && finiteScore(sides.opponentPoints) ? sides.ownPoints - sides.opponentPoints : null,
      ownLeft: own && !own.unknown ? own.inPlay + own.toPlay : null, opponentLeft: opponent && !opponent.unknown ? opponent.inPlay + opponent.toPlay : null,
      unknown: !data || !!feeds[`${context.snapshot?.season}:${context.snapshot?.week}`]?.error };
  })).sort((a, b) => Math.abs(a.margin ?? Infinity) - Math.abs(b.margin ?? Infinity));
}
export interface DirectorCue { id: string; leagueKey: string; headline: string; detail: string; kind: 'score' | 'play' }
export function scoreCueKind(change: ScoreChange): 'lead' | 'swing' | null {
  const before = change.beforeOwn - change.beforeOpponent;
  const after = change.own - change.opponent;
  if (before < 0 && after > 0 || before > 0 && after < 0) return 'lead';
  return Math.abs(change.ownDelta - change.opponentDelta) >= 10 ? 'swing' : null;
}
export function directorCue(changes: ScoreChange[], events: { event: MajorEvent; data: TimelineFeeds[string]['data'] }[], contexts: SharedLeagueContext[], now: number): DirectorCue | null {
  const recent = changes.find(row => now - row.at >= 0 && now - row.at <= 15 * 60000);
  if (recent) {
    const swing = recent.ownDelta - recent.opponentDelta;
    return { id: recent.id, leagueKey: recent.leagueKey, kind: 'score', headline: `${recent.leagueName} // ${swing >= 0 ? '+' : ''}${swing.toFixed(2)} point swing`,
      detail: `${recent.ownName} ${recent.ownDelta >= 0 ? '+' : ''}${recent.ownDelta.toFixed(2)} · ${recent.opponentName} ${recent.opponentDelta >= 0 ? '+' : ''}${recent.opponentDelta.toFixed(2)} since the previous score refresh.` };
  }
  for (const { event, data } of events) {
    if (!event.occurredAt || now - Date.parse(event.occurredAt) < 0 || now - Date.parse(event.occurredAt) > 15 * 60000) continue;
    const impact = eventImpact(event, contexts, data);
    if (!impact.length) continue;
    const first = impact[0];
    return { id: event.id, leagueKey: savedLeagueKey(first.league), kind: 'play', headline: `${event.game} // ${event.kind}`, detail: `${first.league.name}: likely ${first.good.length ? `helps via ${first.good.join(', ')}` : `hurts via ${first.bad.join(', ')}`}. Fantasy points await provider confirmation.` };
  }
  return null;
}
export interface ShowSummary { phase: 'PREGAME' | 'HALFTIME' | 'FINAL'; title: string; record: string; swing: string; pine: string; paradox: string }
export function studioShow(contexts: SharedLeagueContext[], feeds: TimelineFeeds, changes: ScoreChange[], conflict: StudioConflict | null, now: number): ShowSummary {
  const rows = buildRecap(contexts, feeds, now);
  const done = rows.filter(row => row.finished && finiteScore(row.ownPoints) && finiteScore(row.opponentPoints));
  const games = Object.values(feeds).flatMap(feed => feed.data?.games ?? []);
  const phase = rows.length && done.length === rows.length ? 'FINAL' : games.some(game => game.state === 'in' || game.state === 'post') ? 'HALFTIME' : 'PREGAME';
  const won = done.filter(row => row.ownPoints! > row.opponentPoints!).length;
  const lost = done.filter(row => row.ownPoints! < row.opponentPoints!).length;
  const swing = [...changes].sort((a, b) => Math.abs(b.ownDelta - b.opponentDelta) - Math.abs(a.ownDelta - a.opponentDelta))[0];
  const bench = contexts.flatMap(context => myMatchups(context).flatMap(match => {
    const own = matchupSides(context, match).own;
    const roster = own?.roster ?? [];
    return roster.filter(player => player.id !== '0' && !isStartingSlot(player.slot) && finiteScore(player.points)).flatMap(player => {
      const starter = roster.filter(other => other.id !== '0' && isStartingSlot(other.slot) && basePosition(other.position) === basePosition(player.position) && finiteScore(other.points)).sort((a, b) => a.points! - b.points!)[0];
      return starter && player.points! > starter.points! ? [{ league: context.saved.name, bench: player.name, starter: starter.name, gap: player.points! - starter.points! }] : [];
    });
  })).sort((a, b) => b.gap - a.gap)[0];
  return { phase, title: `${phase} // SCOTT'S STUDIO SHOW`, record: `${won} final wins · ${lost} final losses · ${rows.length - done.length} pending`,
    swing: swing ? `${swing.leagueName}: ${Math.abs(swing.ownDelta - swing.opponentDelta).toFixed(2)}-point net swing between score refreshes.` : 'No score swing in this browser’s saved tape yet.',
    pine: bench ? `${bench.bench} has ${bench.gap.toFixed(2)} more points than ${bench.starter} in ${bench.league} at the same listed position. Lineup eligibility may differ.` : 'No comparable bench-versus-starter outlier with known points yet.',
    paradox: conflict ? `${conflict.name}: yours in ${conflict.owned}, against you in ${conflict.opposing}.` : 'No cross-league rooting paradox detected.' };
}

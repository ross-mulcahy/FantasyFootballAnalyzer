import type { MajorEvent, NFLTimeline } from '@/api/nflTimeline';
import type { RosterPlayer, RosterTeam, ScoreMatchup } from '@/types/gameDay';
import type { SharedLeagueContext } from './sharedPlayers';
import { savedLeagueKey } from './savedLeagues';
import { lineupProgress, playerGameStatus } from './matchupGameStatus';
import { isStartingSlot, lineupProjection } from './playerWeek';
import { basePosition, canonicalTeam, normalizeName } from './playerNames';

export type TimelineFeeds = Record<string, { data: NFLTimeline | null; error: string | null; loading?: boolean }>;
export const finiteScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function myMatchups(context: SharedLeagueContext) {
  return context.snapshot?.matchups.filter(match => context.myTeamId && [match.team1Id, match.team2Id].includes(context.myTeamId)) ?? [];
}
export function matchupSides(context: SharedLeagueContext, match: ScoreMatchup) {
  const first = match.team1Id === context.myTeamId;
  const own = context.snapshot?.teams.find(team => team.id === context.myTeamId);
  const opponentId = first ? match.team2Id : match.team1Id;
  const opponent = context.snapshot?.teams.find(team => team.id === opponentId);
  return { own, opponent, opponentId, ownPoints: first ? match.team1Points : match.team2Points, opponentPoints: first ? match.team2Points : match.team1Points,
    ownProjection: (first ? match.team1Projection : match.team2Projection) ?? lineupProjection(own), opponentProjection: (first ? match.team2Projection : match.team1Projection) ?? lineupProjection(opponent) };
}
export function matchupMargin(context: SharedLeagueContext, match: ScoreMatchup, basis: 'projected' | 'current', data: NFLTimeline | null): number | null {
  const sides = matchupSides(context, match);
  if (!sides.opponentId) return null;
  if (basis === 'projected') {
    // Weekly lineup estimates cannot be compared with multiweek matchup totals.
    if (/Weeks /i.test(match.period)) return null;
    return finiteScore(sides.ownProjection) && finiteScore(sides.opponentProjection) ? sides.ownProjection - sides.opponentProjection : null;
  }
  const started = [sides.own, sides.opponent].some(team => team?.roster?.some(player => isStartingSlot(player.slot) && ['in', 'post'].includes(playerGameStatus(player.nflTeam, data)?.state ?? '')));
  return started && finiteScore(sides.ownPoints) && finiteScore(sides.opponentPoints) ? sides.ownPoints - sides.opponentPoints : null;
}
export function playerAvailability(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const status = value.trim().replace(/[_-]/g, ' ').toUpperCase();
  const names: Record<string, string> = { O: 'Out', OUT: 'Out', D: 'Doubtful', DOUBTFUL: 'Doubtful', Q: 'Questionable', QUESTIONABLE: 'Questionable', IR: 'Injured reserve', 'INJURED RESERVE': 'Injured reserve', INACTIVE: 'Inactive', SUSP: 'Suspended', SUSPENDED: 'Suspended', PUP: 'Physically unable to perform' };
  return names[status];
}
export interface LineupWarning { key: string; league: SharedLeagueContext['saved']; teamId: string; message: string; locked: boolean; saved: boolean }
export function lineupWarnings(contexts: SharedLeagueContext[], feeds: TimelineFeeds, now: number): LineupWarning[] {
  return contexts.flatMap(context => {
    const team = context.snapshot?.teams.find(team => team.id === context.myTeamId);
    const feed = feeds[`${context.snapshot?.season}:${context.snapshot?.week}`];
    const data = feed?.data;
    // Pregame schedule data can stay valid between the normal three-hour checks.
    const scheduleKnown = !!data?.games && !feed?.error && !data.warnings.length;
    const stale = !!context.error || !!context.snapshot && now - context.snapshot.fetchedAt > 15 * 60000;
    return team?.roster?.flatMap((player, index) => {
      if (!isStartingSlot(player.slot)) return [];
      const game = playerGameStatus(player.nflTeam, data ?? null);
      const locked = game?.state === 'in' || game?.state === 'post';
      const issue = player.id === '0' ? `${player.slot}: Empty starting slot` : player.availability && game?.state !== 'post' ? `${player.name}: ${player.availability}`
        : scheduleKnown && player.nflTeam && !game ? `${player.name}: Bye / no game scheduled` : null;
      return issue ? [{ key: `${savedLeagueKey(context.saved)}:${index}`, league: context.saved, teamId: team.id, message: issue, locked, saved: stale }] : [];
    }) ?? [];
  });
}

export interface EventImpact { league: SharedLeagueContext['saved']; good: string[]; bad: string[] }
// Attribute only recognisable football plays. A name elsewhere in the text
// (e.g. a tackler or the PAT kicker) is not evidence of fantasy impact.
export function eventImpact(event: MajorEvent, contexts: SharedLeagueContext[], data: NFLTimeline | null): EventImpact[] {
  const description = event.description;
  if (/NO PLAY|NULLIFIED|REVERSED/i.test(description) || /TWO.POINT|2.PT|SAFETY|RETURN|BLOCKED/i.test(event.kind) || /SAFETY|RETURN|BLOCKED/i.test(description.split('(')[0])) return [];
  const candidates = contexts.flatMap(context => myMatchups(context).flatMap(match => {
    const { own, opponent } = matchupSides(context, match);
    return [own, opponent].flatMap(team => team?.roster?.filter(player => player.id !== '0' && isStartingSlot(player.slot) && playerGameStatus(player.nflTeam, data)?.id === event.gameId) ?? []);
  }));
  const names = [...candidates.map(p => p.name), ...Object.values(data?.playerStats ?? {}).filter(p => p.gameId === event.gameId).map(p => p.name)];
  const alias = (name: string) => { const bits = normalizeName(name).split(' '); return `${bits[0]?.[0]} ${bits.slice(1).join(' ')}`; };
  const matchesName = (text: string, player: RosterPlayer) => {
    const normalized = ` ${normalizeName(text.replace(/\b([A-Z])\.(?=[A-Z])/g, '$1 '))} `;
    const full = normalizeName(player.name);
    if (normalized.includes(` ${full} `)) return true;
    const short = alias(player.name);
    const possible = new Set(names.filter(name => alias(name) === short).map(normalizeName));
    return possible.size === 1 && normalized.includes(` ${short} `);
  };
  const positive = new Set<string>(), negative = new Set<string>(), scoringTeams = new Set<string>(), losingTeams = new Set<string>();
  const key = (p: RosterPlayer) => `${normalizeName(p.name)}:${canonicalTeam(p.nflTeam)}`;
  const passingTD = /TOUCHDOWN/i.test(event.kind + description) && /pass from/i.test(description);
  const rushingTD = /TOUCHDOWN/i.test(event.kind + description) && /\brush\b/i.test(description);
  const fieldGoal = /FIELD GOAL/i.test(event.kind + description) && !/NO GOOD|MISSED/i.test(event.kind + description);
  const intercepted = /INTERCEPTED/i.test(description);
  const lostFumble = /FUMBLE/i.test(description) && /RECOVERED by/i.test(description);
  for (const player of candidates) {
    if (basePosition(player.position) === 'DST') continue;
    const lead = description.split(/\b(?:\d+\s+Yd|pass|rush|FUMBLES)\b/i)[0];
    const passer = description.split(/pass from/i)[1]?.split(/[([]/)[0];
    if ((passingTD && ((matchesName(lead, player) && /WR|RB|TE/.test(player.position)) || (passer && matchesName(passer, player) && /QB/.test(player.position)))) || (rushingTD && matchesName(lead, player)) || (fieldGoal && player.position === 'K' && matchesName(lead, player))) {
      positive.add(key(player)); scoringTeams.add(canonicalTeam(player.nflTeam));
    }
    if (intercepted && /QB/.test(player.position) && matchesName(description.split(/\bpass\b/i)[0], player)) { negative.add(key(player)); losingTeams.add(canonicalTeam(player.nflTeam)); }
    // Fumbles on passing plays can name both passer and receiver; omit rather than misattribute.
    if (lostFumble && !/\bpass\b/i.test(description) && /RECOVERED by ([A-Z]{2,3})-/i.test(description) && canonicalTeam(/RECOVERED by ([A-Z]{2,3})-/i.exec(description)![1]) !== canonicalTeam(player.nflTeam) && matchesName(description.split(/FUMBLES/i)[0], player)) { negative.add(key(player)); losingTeams.add(canonicalTeam(player.nflTeam)); }
  }
  const gameTeams = data?.games?.find(game => game.id === event.gameId)?.teams ?? [];
  return contexts.flatMap(context => {
    const good = new Set<string>(), bad = new Set<string>();
    for (const match of myMatchups(context)) {
      const sides = matchupSides(context, match);
      for (const [team, own] of [[sides.own, true], [sides.opponent, false]] as const) for (const player of team?.roster ?? []) {
        if (!isStartingSlot(player.slot) || playerGameStatus(player.nflTeam, data)?.id !== event.gameId) continue;
        const defense = basePosition(player.position) === 'DST', nflTeam = canonicalTeam(player.nflTeam);
        const plus = positive.has(key(player)) || defense && gameTeams.includes(nflTeam) && [...losingTeams].some(t => t !== nflTeam);
        const minus = negative.has(key(player)) || defense && gameTeams.includes(nflTeam) && [...scoringTeams].some(t => t !== nflTeam);
        if (plus) (own ? good : bad).add(player.name);
        if (minus) (own ? bad : good).add(player.name);
      }
    }
    return good.size || bad.size ? [{ league: context.saved, good: [...good], bad: [...bad] }] : [];
  });
}

export interface RecapRow {
  key: string; league: SharedLeagueContext['saved']; teamId: string; season: number; week: number; fetchedAt: number;
  ownName: string; opponentName: string; ownPoints: number | null; opponentPoints: number | null; period: string;
  finished: boolean; saved: boolean; topOwn: { name: string; points: number } | null; topOpponent: { name: string; points: number } | null;
}
function topPlayer(team: RosterTeam | undefined) {
  const players = team?.roster?.filter(p => p.id !== '0' && isStartingSlot(p.slot) && finiteScore(p.points)).sort((a, b) => b.points! - a.points!) ?? [];
  return players.length ? { name: players[0].name, points: players[0].points! } : null;
}
export function buildRecap(contexts: SharedLeagueContext[], feeds: TimelineFeeds, now: number): RecapRow[] {
  return contexts.flatMap(context => myMatchups(context).map(match => {
    const snapshot = context.snapshot!, sides = matchupSides(context, match), feed = feeds[`${snapshot.season}:${snapshot.week}`];
    const lastWeek = /Weeks \d+[–-](\d+)/i.exec(match.period)?.[1];
    const finishedLineup = (team: RosterTeam | undefined) => {
      const progress = lineupProgress(team, feed?.data ?? null);
      return !!progress && progress.played > 0 && !progress.inPlay && !progress.toPlay && !progress.unknown;
    };
    const saved = !!context.error || now - snapshot.fetchedAt > 15 * 60000;
    return { key: `${savedLeagueKey(context.saved)}:${context.myTeamId}:${snapshot.week}:${match.id}`, league: context.saved, teamId: context.myTeamId!, season: snapshot.season, week: snapshot.week, fetchedAt: snapshot.fetchedAt,
      ownName: sides.own?.name ?? 'Your team', opponentName: sides.opponent?.name ?? 'No opponent', ownPoints: sides.ownPoints, opponentPoints: sides.opponentPoints, period: match.period,
      finished: !saved && !feed?.error && !!feed?.data?.games && !feed.data.warnings.length && (!lastWeek || snapshot.week >= Number(lastWeek)) && !!sides.opponentId && finishedLineup(sides.own) && finishedLineup(sides.opponent),
      saved, topOwn: topPlayer(sides.own), topOpponent: topPlayer(sides.opponent) };
  }));
}
const recapKey = 'ffa:game-day-recaps:v1';
export function loadRecaps(): RecapRow[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(recapKey) ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter((r): r is RecapRow => !!r && typeof r === 'object' && ['key', 'teamId', 'ownName', 'opponentName', 'period'].every(k => typeof (r as Record<string, unknown>)[k] === 'string') && Number.isInteger(r.season) && Number.isInteger(r.week) && r.week >= 1 && r.week <= 18 && finiteScore(r.fetchedAt) && (r.ownPoints === null || finiteScore(r.ownPoints)) && (r.opponentPoints === null || finiteScore(r.opponentPoints)) && typeof r.finished === 'boolean' && typeof r.saved === 'boolean' && r.league && typeof r.league.name === 'string' && typeof r.league.leagueId === 'string' && ['espn', 'sleeper', 'yahoo'].includes(r.league.platform) && [r.topOwn, r.topOpponent].every(p => p === null || typeof p?.name === 'string' && finiteScore(p.points)));
  } catch { return []; }
}
export function mergeRecaps(old: RecapRow[], fresh: RecapRow[]): RecapRow[] {
  const rows = new Map(old.map(row => [row.key, row]));
  for (const row of fresh) {
    const previous = rows.get(row.key);
    if (previous && (previous.fetchedAt > row.fetchedAt || previous.finished && !row.finished && previous.fetchedAt === row.fetchedAt)) continue;
    rows.set(row.key, row);
  }
  return [...rows.values()].sort((a, b) => b.season - a.season || b.week - a.week || b.fetchedAt - a.fetchedAt).slice(0, 500);
}
export function saveRecaps(rows: RecapRow[]): boolean {
  try { localStorage.setItem(recapKey, JSON.stringify(rows)); return true; } catch { return false; }
}

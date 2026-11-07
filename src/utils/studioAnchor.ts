import type { LineupWarning } from './gameDayInsights';
import { finiteScore, matchupSides, myMatchups } from './gameDayInsights';
import { savedLeagueKey } from './savedLeagues';
import { normalizeName } from './playerNames';
import { lineupProgress } from './matchupGameStatus';
import type { SharedLeagueContext } from './sharedPlayers';
import type { NFLTimeline } from '@/api/nflTimeline';
import type { ScoreMatchup } from '@/types/gameDay';
import type { HeadToHeadRecord } from '@/types';

export interface StudioHazard {
  name: string;
  statuses: string[];
  leagues: { league: LineupWarning['league']; teamId: string; saved: boolean; locked: boolean }[];
}
/** Display-only grouping; the original warning count and per-league targets stay intact. */
export function groupStudioHazards(warnings: LineupWarning[]): StudioHazard[] {
  const groups = new Map<string, StudioHazard>();
  for (const warning of warnings) {
    const separator = warning.message.indexOf(': ');
    const name = separator < 0 ? warning.message : warning.message.slice(0, separator);
    const issue = separator < 0 ? 'CHECK LINEUP' : warning.message.slice(separator + 2);
    const status = /empty/i.test(issue) ? 'EMPTY SLOT' : /bye/i.test(issue) ? 'ON BYE' : issue.toUpperCase();
    const key = normalizeName(name);
    const group = groups.get(key) ?? { name, statuses: [], leagues: [] };
    if (!group.statuses.includes(status)) group.statuses.push(status);
    const old = group.leagues.find(row => savedLeagueKey(row.league) === savedLeagueKey(warning.league) && row.teamId === warning.teamId);
    if (!old) group.leagues.push({ league: warning.league, teamId: warning.teamId, saved: warning.saved, locked: warning.locked });
    else { old.saved ||= warning.saved; old.locked ||= warning.locked; }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.leagues.length - a.leagues.length || a.name.localeCompare(b.name));
}
export interface StudioMatchup { league: string; own: string; opponent: string; margin: number }
export interface StudioConflict { name: string; owned: number; opposing: number }
export interface StudioProjectedRecord { wins: number; losses: number; ties: number; pending: number }
export interface StudioExcuse { league: string; own: string; opponent: string; status: 'lost' | 'out of sight'; deficit: number }
export interface StudioRivalry { key: string; league: string; own: string; opponent: string; wins: number; losses: number; ties: number; recent: { season: number; week: number; ownPoints: number; opponentPoints: number } | null }
export interface StudioTake { key: string; label: string; text: string; mood: 'hazard' | 'sweat' | 'clear'; triage?: boolean }

export function studioProjectedRecord(contexts: SharedLeagueContext[]): StudioProjectedRecord {
  const record = { wins: 0, losses: 0, ties: 0, pending: 0 };
  for (const context of contexts) for (const match of myMatchups(context)) {
    const sides = matchupSides(context, match);
    if (!sides.opponentId || /Weeks /i.test(match.period) || !finiteScore(sides.ownProjection) || !finiteScore(sides.opponentProjection)) { record.pending++; continue; }
    if (Math.abs(sides.ownProjection - sides.opponentProjection) < 0.005) record.ties++;
    else if (sides.ownProjection > sides.opponentProjection) record.wins++;
    else record.losses++;
  }
  return record;
}

/** A presser is earned by a confirmed loss or a live, clearly lopsided outlook. */
export function studioExcuseCandidate(context: SharedLeagueContext, match: ScoreMatchup, data: NFLTimeline | null): StudioExcuse | null {
  const sides = matchupSides(context, match);
  const ownProgress = lineupProgress(sides.own, data), opponentProgress = lineupProgress(sides.opponent, data);
  if (!sides.own || !sides.opponent || !data?.games?.length || data.warnings.length || !ownProgress || !opponentProgress || !finiteScore(sides.ownPoints) || !finiteScore(sides.opponentPoints)) return null;
  const complete = ownProgress.played > 0 && opponentProgress.played > 0 &&
    [ownProgress, opponentProgress].every(progress => !progress.inPlay && !progress.toPlay && !progress.unknown);
  const lost = complete && sides.ownPoints < sides.opponentPoints;
  const underway = ownProgress.played + ownProgress.inPlay + opponentProgress.played + opponentProgress.inPlay > 0;
  const projectedDeficit = finiteScore(sides.ownProjection) && finiteScore(sides.opponentProjection) ? sides.opponentProjection - sides.ownProjection : 0;
  const outOfSight = !complete && underway && sides.opponentPoints - sides.ownPoints >= 30 && projectedDeficit >= 30;
  if (!lost && !outOfSight) return null;
  return { league: context.saved.name, own: sides.own.name, opponent: sides.opponent.name, status: lost ? 'lost' : 'out of sight', deficit: lost ? sides.opponentPoints - sides.ownPoints : projectedDeficit };
}

export function studioRivalryFromRecords(key: string, league: string, own: string, opponent: string, opponentOwnerId: string | undefined, records: Map<string, HeadToHeadRecord>, season: number, week: number): StudioRivalry {
  const exact = [...records.values()].filter(row => opponentOwnerId && row.opponentId === opponentOwnerId);
  const byName = [...records.values()].filter(row => normalizeName(row.opponentName) === normalizeName(opponent));
  const record = exact[0] ?? (byName.length === 1 ? byName[0] : undefined);
  const played = record?.matchups.filter(row => row.season < season || row.season === season && row.week < week) ?? [];
  const recent = [...played].sort((a, b) => b.season - a.season || b.week - a.week)[0];
  return { key, league, own, opponent,
    wins: played.filter(row => row.teamScore > row.opponentScore).length,
    losses: played.filter(row => row.teamScore < row.opponentScore).length,
    ties: played.filter(row => row.teamScore === row.opponentScore).length,
    recent: recent ? { season: recent.season, week: recent.week, ownPoints: recent.teamScore, opponentPoints: recent.opponentScore } : null };
}

export function studioAnchorTakes(warnings: LineupWarning[], groups: StudioHazard[], closest: StudioMatchup | null, conflict: StudioConflict | null, missing: number, record?: StudioProjectedRecord, rivalries: StudioRivalry[] = [], excuse: StudioExcuse | null = null): StudioTake[] {
  const top = groups[0];
  const opener = top
    ? `HOLD EVERYTHING! We've got ${warnings.length} lineup ${warnings.length === 1 ? 'hazard' : 'hazards'} on the board! ${top.name} is flagged ${top.statuses.join(' / ')} across ${top.leagues.length} ${top.leagues.length === 1 ? 'league' : 'leagues'}. ${top.leagues.some(row => row.locked) ? 'The games have started—check your league lock rules!' : 'Get eyes on those starters before lock!'}`
    : missing ? `We're waiting on roster data or a team selection in ${missing} ${missing === 1 ? 'league' : 'leagues'}. I can't give you the all-clear until those signals come in. Stay with us!`
    : closest && Math.abs(closest.margin) <= 10 ? `We've entered the Witching Hour! ${closest.own} and ${closest.opponent} are separated by just ${Math.abs(closest.margin).toFixed(2)} projected points in ${closest.league}. Nobody touch that remote!`
    : "I've checked the available starting lineups. No reported hazards! Keep the mug full and the remote close. All rosters legal; the fantasy gods take it from here.";
  const takes: StudioTake[] = [{ key: 'opening', label: top ? 'REDZONE UPDATE' : missing ? 'AWAITING SIGNAL' : closest && Math.abs(closest.margin) <= 10 ? 'WITCHING HOUR SWEAT' : 'ALL CLEAR', text: opener, mood: top ? 'hazard' : closest && Math.abs(closest.margin) <= 10 ? 'sweat' : 'clear', triage: !!top }];
  const covered = record ? record.wins + record.losses + record.ties : 0;
  if (record && (covered || record.pending)) takes.push({ key: 'projected-record', label: 'WEEKLY FORECAST', mood: record.losses > record.wins ? 'sweat' : 'clear',
    text: `Across your teams this week, the projection board has you at ${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}${record.ties ? ' (wins-losses-ties)' : ' (wins-losses)'}. ${record.pending ? `${record.pending} ${record.pending === 1 ? 'matchup is' : 'matchups are'} still missing comparable projections, so the forecast is incomplete.` : 'That is a forecast, not a final score. Keep the remote close.'}` });
  if (closest) takes.push({ key: 'matchup', label: 'MATCHUP UPDATE', mood: Math.abs(closest.margin) <= 10 ? 'sweat' : 'clear', text: `I'm taking you to ${closest.league}! ${closest.own} versus ${closest.opponent}: a ${Math.abs(closest.margin).toFixed(2)}-point projected margin. ${Math.abs(closest.margin) <= 10 ? 'Every garbage-time reception is now a major household event.' : 'A weekly estimate, folks. The football still has to happen.'}` });
  for (const rivalry of rivalries) {
    const meetings = rivalry.wins + rivalry.losses + rivalry.ties;
    takes.push({ key: `rivalry:${rivalry.key}`, label: 'RIVALRY FILE', mood: meetings && rivalry.losses > rivalry.wins ? 'sweat' : 'clear',
      text: meetings ? `From the archive in ${rivalry.league}: ${rivalry.own} are ${rivalry.wins}-${rivalry.losses}${rivalry.ties ? `-${rivalry.ties}` : ''} against ${rivalry.opponent} in ${meetings} previous ${meetings === 1 ? 'meeting' : 'meetings'}. ${rivalry.recent ? `Last time, Week ${rivalry.recent.week} of ${rivalry.recent.season}: ${rivalry.recent.ownPoints.toFixed(2)} to ${rivalry.recent.opponentPoints.toFixed(2)}.` : ''} History has the microphone; this week still has to be played.` : `Rivalry file for ${rivalry.own} and ${rivalry.opponent} in ${rivalry.league}: no previous scored meeting found in the available archive. We start a new chapter today.` });
  }
  if (conflict) takes.push({ key: 'conflict', label: 'ROOTING CONFLICTS', mood: 'sweat', text: `Rooting paradox! I have ${conflict.name} on your side in ${conflict.owned} ${conflict.owned === 1 ? 'league' : 'leagues'} and facing you in ${conflict.opposing}. Cheer responsibly. The control room cannot referee your feelings.` });
  if (excuse) takes.push({ key: 'presser', label: 'PRESSER', mood: 'sweat', text: `${excuse.status === 'lost' ? `That one is final, a ${excuse.deficit.toFixed(2)}-point loss.` : `This one is getting out of sight: ${excuse.deficit.toFixed(2)} projected points behind.`} ${excuse.own} trail ${excuse.opponent} in ${excuse.league}. The coaching staff says, “Our game plan was immaculate until the players started scoring points.” Back to the studio.` });
  return takes;
}

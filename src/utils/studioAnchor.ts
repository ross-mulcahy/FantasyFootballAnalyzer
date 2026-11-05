import type { LineupWarning } from './gameDayInsights';
import { savedLeagueKey } from './savedLeagues';
import { normalizeName } from './playerNames';

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
export function studioAnchorTakes(warnings: LineupWarning[], groups: StudioHazard[], closest: StudioMatchup | null, conflict: StudioConflict | null, missing: number): string[] {
  const top = groups[0];
  const opener = top
    ? `HOLD EVERYTHING! We've got ${warnings.length} lineup ${warnings.length === 1 ? 'hazard' : 'hazards'} on the board! ${top.name} is flagged ${top.statuses.join(' / ')} across ${top.leagues.length} ${top.leagues.length === 1 ? 'league' : 'leagues'}. ${top.leagues.some(row => row.locked) ? 'The games have started—check your league lock rules!' : 'Get eyes on those starters before lock!'}`
    : missing ? `We're waiting on roster data or a team selection in ${missing} ${missing === 1 ? 'league' : 'leagues'}. I can't give you the all-clear until those signals come in. Stay with us!`
    : closest && Math.abs(closest.margin) <= 10 ? `We've entered the Witching Hour! ${closest.own} and ${closest.opponent} are separated by just ${Math.abs(closest.margin).toFixed(2)} projected points in ${closest.league}. Nobody touch that remote!`
    : "I've checked the available starting lineups. No reported hazards! Keep the mug full and the remote close. All rosters legal; the fantasy gods take it from here.";
  return [
    opener,
    closest ? `I'm taking you to ${closest.league}! ${closest.own} versus ${closest.opponent}: a ${Math.abs(closest.margin).toFixed(2)}-point projected margin. ${Math.abs(closest.margin) <= 10 ? 'Every garbage-time reception is now a major household event.' : 'A weekly estimate, folks. The football still has to happen.'}` : "We're standing by for matchup projections. In the meantime, the studio mug has a higher floor than my bench.",
    conflict ? `Rooting paradox! I have ${conflict.name} on your side in ${conflict.owned} ${conflict.owned === 1 ? 'league' : 'leagues'} and facing you in ${conflict.opposing}. Cheer responsibly. The control room cannot referee your feelings.` : "No rooting paradox on my board yet. Enjoy this brief period in which cheering for a touchdown is a straightforward activity.",
    closest ? `I'm hearing from the ${closest.own} coaching staff: “Hats off to ${closest.opponent}. Our game plan was immaculate until the players started scoring points.” Back to the studio.` : "The coaching staff assures me this was a scheduled character-building week. The league office has requested they stop scheduling those.",
  ];
}

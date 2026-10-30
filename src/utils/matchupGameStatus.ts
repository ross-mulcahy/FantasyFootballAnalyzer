import type { NFLGameStatus, NFLTimeline } from '@/api/nflTimeline';
import type { RosterTeam } from '@/types/gameDay';
import { isStartingSlot } from './playerWeek';
import { canonicalTeam } from './playerNames';

// A player's NFL game being live is not evidence that the player is on-field.
export function playerGameStatus(nflTeam: string, data: NFLTimeline | null): NFLGameStatus | undefined {
  const team = canonicalTeam(nflTeam);
  return team ? data?.games?.find(game => game.teams.includes(team)) : undefined;
}

export function liveStatusIsStale(data: NFLTimeline | null, error: string | null, now: number): boolean {
  return !data || !!error || now - data.fetchedAt > 2 * 60000;
}

export function lineupProgress(team: RosterTeam | undefined, data: NFLTimeline | null) {
  const counts = { played: 0, inPlay: 0, toPlay: 0, unscheduled: 0, unknown: 0 };
  if (!team?.roster) return null;
  for (const player of team.roster.filter(p => p.id !== '0' && isStartingSlot(p.slot))) {
    const game = playerGameStatus(player.nflTeam, data);
    if (game?.state === 'post') counts.played++;
    else if (game?.state === 'in') counts.inPlay++;
    else if (game?.state === 'pre') counts.toPlay++;
    else if (player.nflTeam && data?.games && !game) counts.unscheduled++;
    else counts.unknown++;
  }
  return counts;
}

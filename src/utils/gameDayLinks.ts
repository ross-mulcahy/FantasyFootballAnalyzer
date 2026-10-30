import type { ScoreMatchup } from '@/types/gameDay';
import type { League } from '@/types';

// Provider array order and home/away order can change after refresh.
export function matchupKey(matchup: ScoreMatchup): string {
  return JSON.stringify([matchup.team1Id, matchup.team2Id].filter((id): id is string => id !== null).sort());
}

export function matchupHref(matchup: ScoreMatchup): string {
  return `/game-day?${new URLSearchParams({ matchup: matchupKey(matchup) })}`;
}

export function rosterHref(teamId: string, league?: Pick<League, 'platform' | 'id' | 'season'>): string {
  const params = new URLSearchParams({ team: teamId });
  if (league) {
    params.set('league', `${league.platform}:${league.id}`);
    params.set('year', String(league.season));
  }
  return `/teams?${params}`;
}

export function leagueGameDayHref(league: Pick<League, 'platform' | 'id' | 'season'>): string {
  return `/game-day?${new URLSearchParams({ league: `${league.platform}:${league.id}`, year: String(league.season) })}`;
}

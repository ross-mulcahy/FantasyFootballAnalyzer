import type { PlayerStat, RosterTeam } from '@/types/gameDay';

export function isStartingSlot(slot: string): boolean {
  return !['BN', 'BENCH', 'IR', 'IR+', 'TAXI', 'NA', 'UNSPECIFIED'].includes(slot.toUpperCase());
}

export function lineupProjection(team: RosterTeam | undefined): number | null {
  const starters = team?.roster?.filter(p => p.id !== '0' && isStartingSlot(p.slot)) ?? [];
  if (!starters.length || starters.some(p => typeof p.projection !== 'number' || !Number.isFinite(p.projection))) return null;
  return starters.reduce((total, player) => total + player.projection!, 0);
}

export function statLines(stats: unknown, labels: Record<string, string>): PlayerStat[] {
  if (!stats || typeof stats !== 'object') return [];
  const source = stats as Record<string, unknown>;
  return Object.entries(labels).flatMap(([key, label]) => {
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return [];
    return [{ label, value }];
  });
}

export const SLEEPER_STAT_LABELS: Record<string, string> = {
  pass_cmp: 'Pass completions', pass_att: 'Pass attempts', pass_yd: 'Pass yards', pass_td: 'Pass TD', pass_int: 'Pass INT',
  rush_att: 'Rush attempts', rush_yd: 'Rush yards', rush_td: 'Rush TD', rec: 'Receptions', rec_tgt: 'Targets', rec_yd: 'Rec yards', rec_td: 'Rec TD',
  fum_lost: 'Fumbles lost', fgm: 'FG made', fga: 'FG attempts', xpm: 'XP made', sack: 'Sacks', int: 'Interceptions', fum_rec: 'Fumble recoveries',
  def_td: 'Defense TD', pts_allow: 'Points allowed', yds_allow: 'Yards allowed', idp_tkl: 'Tackles', idp_sack: 'IDP sacks', idp_int: 'IDP interceptions',
};

// ESPN's raw weekly stat IDs, also used by espn-api's PLAYER_STATS_MAP.
export const ESPN_STAT_LABELS: Record<string, string> = {
  0: 'Pass attempts', 1: 'Pass completions', 3: 'Pass yards', 4: 'Pass TD', 20: 'Pass INT',
  23: 'Rush attempts', 24: 'Rush yards', 25: 'Rush TD', 41: 'Receptions', 42: 'Rec yards', 43: 'Rec TD', 58: 'Targets', 72: 'Fumbles lost',
  83: 'FG made', 84: 'FG attempts', 86: 'XP made', 94: 'Defense TD', 95: 'Interceptions', 96: 'Fumble recoveries', 99: 'Sacks', 120: 'Points allowed',
};

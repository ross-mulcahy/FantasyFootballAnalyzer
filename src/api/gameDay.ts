import type { ESPNAPI, League, LeagueCredentials, SleeperAPI } from '@/types';
import type { GameDaySnapshot, RosterPlayer, RosterTeam, ScoreMatchup } from '@/types/gameDay';
import * as sleeper from './sleeper';
import { convertPlayer, espnTeamName, fetchESPN } from './espn';
import { yahooFetch } from './yahoo';
import { loadESPNCredentials } from '@/utils/espnCredentials';
import { playerAvailability } from '@/utils/gameDayInsights';
import { isStartingSlot, statLines, SLEEPER_STAT_LABELS, ESPN_STAT_LABELS } from '@/utils/playerWeek';

type Node = Record<string, unknown>;
const object = (value: unknown): Node => value !== null && typeof value === 'object' ? value as Node : {};
const array = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown, fallback = ''): string => typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
function at(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((node, key) => object(node)[key], value);
}
function number(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
const weekNumber = (value: unknown, fallback = 1): number => Math.max(1, Math.min(18, Math.trunc(number(value) ?? fallback)));

function base(league: League, week: number, teams: RosterTeam[], matchups: ScoreMatchup[]): GameDaySnapshot {
  if (!teams.length || teams.some(t => !t.id)) throw new Error('The platform did not return valid teams. The saved snapshot was kept.');
  return { platform: league.platform, leagueId: league.id, season: league.season, week, teams, matchups, fetchedAt: Date.now(), detailVersion: 1 };
}

export function mapSleeperSnapshot(
  league: League, raw: SleeperAPI.League, users: SleeperAPI.User[], rosters: SleeperAPI.Roster[],
  players: Record<string, SleeperAPI.Player>, matches: SleeperAPI.Matchup[], week: number,
  weeklyStats: Record<string, unknown> = {}, projections: Record<string, unknown> = {},
): GameDaySnapshot {
  const teams: RosterTeam[] = rosters.map(roster => {
    const owner = users.find(user => user.user_id === roster.owner_id);
    const scores = matches.find(match => match.roster_id === roster.roster_id)?.players_points;
    const player = (id: string, slot: string): RosterPlayer => ({
      id, slot, name: id === '0' ? 'Empty slot' : players[id]?.full_name || id,
      position: players[id]?.position || '', nflTeam: players[id]?.team || '',
      points: number(scores?.[id]), availability: playerAvailability(players[id]?.injury_status || players[id]?.status),
      projection: id === '0' ? null : sleeper.scoreStatsWithSettings(object(projections[id]) as Record<string, number>, raw.scoring_settings) ?? null,
      stats: statLines(weeklyStats[id], SLEEPER_STAT_LABELS),
    });
    const starters = roster.starters ?? [];
    const slots = raw.roster_positions.filter(slot => !['BN', 'IR', 'TAXI'].includes(slot));
    const reserve = new Set(roster.reserve ?? []);
    const taxi = new Set((roster as SleeperAPI.Roster & { taxi?: string[] }).taxi ?? []);
    const benchIds = [...new Set([...(roster.players ?? []), ...reserve, ...taxi])].filter(id => !starters.includes(id));
    return {
      id: String(roster.roster_id),
      name: owner?.metadata?.team_name?.trim() || owner?.display_name || owner?.username || `Team ${roster.roster_id}`,
      roster: [
        ...slots.map((slot, index) => player(starters[index] || '0', slot)),
        ...benchIds.map(id => player(id, reserve.has(id) ? 'IR' : taxi.has(id) ? 'Taxi' : 'Bench')),
      ],
    };
  });
  const groups = new Map<number, SleeperAPI.Matchup[]>();
  const matchups: ScoreMatchup[] = [];
  const points = (m: SleeperAPI.Matchup) => number(m.custom_points ?? m.points);
  // Sleeper returns single-week scores even for multiweek playoff rounds.
  const period = `Week ${week} scores (single week)`;
  for (const match of matches) {
    if (match.matchup_id == null) {
      matchups.push({ id: `unpaired-${match.roster_id}`, team1Id: String(match.roster_id), team2Id: null, team1Points: points(match), team2Points: null, period });
    } else {
      const group = groups.get(match.matchup_id) ?? [];
      group.push(match);
      groups.set(match.matchup_id, group);
    }
  }
  for (const [id, pair] of groups) {
    if (pair.length > 2) throw new Error('Sleeper returned an unexpected matchup pairing. Try refreshing again.');
    matchups.push({ id: String(id), team1Id: String(pair[0].roster_id), team2Id: pair[1] ? String(pair[1].roster_id) : null, team1Points: points(pair[0]), team2Points: pair[1] ? points(pair[1]) : null, period });
  }
  return { ...base(league, week, teams, matchups), projectionNote: 'Sleeper weekly projections are estimates calculated from projected stats using this league’s scoring settings. They are not live finish predictions.' };
}

const ESPN_SLOTS: Record<number, string> = {
  0: 'QB', 1: 'Team QB', 2: 'RB', 3: 'RB/WR', 4: 'WR', 5: 'WR/TE', 6: 'TE', 7: 'Superflex',
  8: 'DT', 9: 'DE', 10: 'LB', 11: 'DL', 12: 'CB', 13: 'S', 14: 'DB', 15: 'IDP',
  16: 'D/ST', 17: 'K', 18: 'P', 19: 'Coach', 20: 'Bench', 21: 'IR', 23: 'Flex',
};

export function mapEspnSnapshot(league: League, data: unknown, week: number): GameDaySnapshot {
  if (!Array.isArray(at(data, 'schedule'))) throw new Error('ESPN did not return the matchup schedule. Try again.');
  const starterSlots = Object.entries(object(at(data, 'settings', 'rosterSettings', 'lineupSlotCounts')))
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([id, count]) => {
      const slot = ESPN_SLOTS[Number(id)] || `Slot ${id}`;
      const n = number(count);
      return isStartingSlot(slot) && n !== null && n > 0 && n <= 30 ? Array.from({ length: Math.trunc(n) }, () => slot) : [];
    });
  const teams: RosterTeam[] = array(at(data, 'teams')).map(raw => {
    const team = raw as ESPNAPI.Team;
    const roster = object(raw).roster;
    const entries = at(roster, 'entries');
    const mapped: RosterPlayer[] | null = Array.isArray(entries) ? entries.map(value => {
        const entry = value as ESPNAPI.RosterEntry;
        const source = entry.playerPoolEntry?.player;
        const p = source ? convertPlayer(source) : null;
        const actual = source?.stats?.find(s => s.seasonId === league.season && s.scoringPeriodId === week && s.statSourceId === 0);
        const projected = source?.stats?.find(s => s.seasonId === league.season && s.scoringPeriodId === week && s.statSourceId === 1);
        return {
          id: String(entry.playerId), name: p?.name || `Player ${entry.playerId}`,
          position: p?.position || '', nflTeam: p?.team || '',
          slot: ESPN_SLOTS[entry.lineupSlotId] || `Slot ${entry.lineupSlotId}`,
          points: number(actual?.appliedTotal), projection: number(projected?.appliedTotal),
          stats: statLines(actual?.stats, ESPN_STAT_LABELS), availability: playerAvailability(object(source).injuryStatus),
        };
      }) : null;
    const remaining = [...(mapped ?? [])];
    const ordered = starterSlots.map(slot => {
      const index = remaining.findIndex(player => player.slot === slot);
      return index >= 0 ? remaining.splice(index, 1)[0] : { id: '0', name: 'Empty slot', position: '', nflTeam: '', slot, points: 0, projection: 0 };
    });
    return { id: text(team.id), name: espnTeamName(team), roster: mapped === null ? null : [...ordered, ...remaining] };
  });
  const periods = object(at(data, 'settings', 'scheduleSettings', 'matchupPeriods'));
  const currentPeriod = Object.entries(periods).find(([, weeks]) => array(weeks).some(w => number(w) === week))?.[0]
    ?? text(at(data, 'status', 'currentMatchupPeriod'), String(week));
  const matchups: ScoreMatchup[] = array(at(data, 'schedule')).filter(raw => text(object(raw).matchupPeriodId) === currentPeriod).flatMap((raw, index) => {
    const m = object(raw);
    const home = object(m.home), away = object(m.away);
    const first = home.teamId != null ? home : away;
    const second = home.teamId != null ? away : {};
    if (first.teamId == null) return [];
    const weeks = array(periods[currentPeriod]).map(number).filter((n): n is number => n !== null);
    const period = weeks.length > 1 ? `Matchup total · Weeks ${Math.min(...weeks)}–${Math.max(...weeks)}` : `Week ${week} matchup total`;
    return [{ id: text(m.id, String(index)), team1Id: text(first.teamId), team2Id: second.teamId == null ? null : text(second.teamId), team1Points: number(first.totalPointsLive) ?? number(first.totalPoints), team2Points: number(second.totalPointsLive) ?? number(second.totalPoints), period, team1Projection: number(first.totalProjectedPointsLive) ?? number(first.totalProjectedPoints), team2Projection: number(second.totalProjectedPointsLive) ?? number(second.totalProjectedPoints) }];
  });
  return base(league, week, teams, matchups);
}

export function mapYahooSnapshot(league: League, scoreboard: unknown, rosterData: unknown, week: number): GameDaySnapshot {
  if (!at(scoreboard, 'fantasy_content', 'league', 'scoreboard')) throw new Error('Yahoo did not return the scoreboard. Try again.');
  const info = at(rosterData, 'fantasy_content', 'league');
  const teams: RosterTeam[] = array(at(info, 'teams', 'team')).map(raw => {
    const team = object(raw);
    const roster = object(team.roster);
    const rows = at(roster, 'players', 'player');
    return {
      id: text(team.team_key), name: text(team.name, text(team.team_key)),
      roster: team.roster == null || roster.players == null ? null : array(rows).map(value => {
        const p = object(value);
        return { id: text(p.player_key), name: text(at(p, 'name', 'full'), text(p.player_key)), position: text(p.display_position ?? p.primary_position), nflTeam: text(p.editorial_team_abbr), availability: playerAvailability(p.status), slot: text(at(p, 'selected_position', 'position'), 'Unspecified') };
      }),
    };
  });
  const matchups = array(at(scoreboard, 'fantasy_content', 'league', 'scoreboard', 'matchups', 'matchup')).flatMap((value, index) => {
    const pair = array(at(value, 'teams', 'team'));
    const first = object(pair[0]), second = object(pair[1]);
    if (first.team_key == null) return [];
    const start = number(object(value).week_start), end = number(object(value).week_end);
    const period = start && end && start !== end ? `Matchup total · Weeks ${start}–${end}` : `Week ${week} matchup total`;
    return [{ id: String(index), team1Id: text(first.team_key), team2Id: second.team_key == null ? null : text(second.team_key), team1Points: number(at(first, 'team_points', 'total')), team2Points: number(at(second, 'team_points', 'total')), period, team1Projection: number(at(first, 'team_projected_points', 'total')), team2Projection: number(at(second, 'team_projected_points', 'total')) }];
  });
  return base(league, week, teams, matchups);
}

async function enrichYahooWeek(snapshot: GameDaySnapshot): Promise<GameDaySnapshot> {
  const warnings: string[] = [];
  const labels: Record<string, string> = {};
  try {
    const settings = await yahooFetch<unknown>(`/league/${snapshot.leagueId}/settings`);
    for (const stat of array(at(settings, 'fantasy_content', 'league', 'settings', 'stat_categories', 'stats', 'stat'))) {
      const item = object(stat);
      const label = text(item.display_name ?? item.name);
      if (label) labels[text(item.stat_id)] = label;
    }
  } catch { warnings.push('Yahoo stat labels are unavailable.'); }
  const keys = [...new Set(snapshot.teams.flatMap(t => t.roster?.map(p => p.id) ?? []))];
  const byPlayer = new Map<string, Node>();
  // Small batches, at most three concurrent calls, using existing Yahoo pacing.
  for (let i = 0; i < keys.length; i += 75) {
    const requests = [];
    for (let start = i; start < Math.min(i + 75, keys.length); start += 25) {
      const batch = keys.slice(start, start + 25);
      requests.push(yahooFetch<unknown>(`/league/${snapshot.leagueId}/players;player_keys=${batch.join(',')}/stats;type=week;week=${snapshot.week}`));
    }
    for (const result of await Promise.allSettled(requests)) {
      if (result.status === 'rejected') { warnings.push('Some Yahoo weekly player stats could not be refreshed.'); continue; }
      for (const p of array(at(result.value, 'fantasy_content', 'league', 'players', 'player'))) byPlayer.set(text(object(p).player_key), object(p));
    }
  }
  snapshot.teams.forEach(team => team.roster?.forEach(player => {
    const data = byPlayer.get(player.id);
    const coverage = at(data, 'player_points', 'coverage_type');
    const dataWeek = number(at(data, 'player_points', 'week'));
    if ((coverage != null && coverage !== 'week') || (dataWeek !== null && dataWeek !== snapshot.week)) {
      warnings.push('Yahoo returned player scores outside the requested week; those scores were omitted.');
      return;
    }
    player.points = number(at(data, 'player_points', 'total'));
    player.projection = number(at(data, 'player_projected_points', 'total'));
    player.stats = array(at(data, 'player_stats', 'stats', 'stat')).flatMap(raw => {
      const stat = object(raw), label = labels[text(stat.stat_id)];
      const value = number(stat.value);
      return label && value !== null ? [{ label, value }] : [];
    });
  }));
  return { ...snapshot, fetchedAt: Date.now(), detailWarnings: [...new Set(warnings)], projectionNote: 'Yahoo player projections are shown only when returned by Yahoo. Platform matchup projections are separate from current-week player totals.' };
}

// Narrow current-roster/current-matchup loads. Never reload season analysis.
export async function loadGameDay(league: League, credentials: LeagueCredentials | null): Promise<GameDaySnapshot> {
  switch (league.platform) {
    case 'sleeper': {
      const [raw, users, rosters, players, state] = await Promise.all([
        sleeper.getLeague(league.id), sleeper.getLeagueUsers(league.id), sleeper.getLeagueRosters(league.id),
        sleeper.getAllPlayers(), sleeper.getNFLState(),
      ]);
      const week = weekNumber(String(league.season) === state.season ? state.week : raw.settings?.last_scored_leg, 17);
      const matches = await sleeper.getMatchups(league.id, week);
      if (!Array.isArray(rosters) || !Array.isArray(matches)) throw new Error('Sleeper did not return rosters and matchups.');
      const [stats, projections] = await Promise.allSettled([
        sleeper.getSeasonStats(String(league.season), week),
        fetch(`https://api.sleeper.app/v1/projections/nfl/regular/${league.season}/${week}`).then(response => {
          if (!response.ok) throw new Error(`Sleeper projections: ${response.status}`);
          return response.json() as Promise<Record<string, unknown>>;
        }),
      ]);
      return {
        ...mapSleeperSnapshot(league, raw, users, rosters, players, matches, week, stats.status === 'fulfilled' ? stats.value : {}, projections.status === 'fulfilled' ? object(projections.value) : {}),
        detailWarnings: [stats.status === 'rejected' ? 'Sleeper weekly player stats are unavailable.' : '', projections.status === 'rejected' ? 'Sleeper weekly projections are unavailable.' : ''].filter(Boolean),
      };
    }
    case 'espn': {
      const stored = loadESPNCredentials(league.id);
      const options = {
        espnS2: credentials?.espnS2 ?? stored?.espnS2,
        swid: credentials?.swid ?? stored?.swid,
      };
      const info = await fetchESPN<unknown>(league.season, league.id, ['mSettings', 'mTeam'], options);
      const final = weekNumber(at(info, 'status', 'finalScoringPeriod'), 17);
      const latest = Math.max(number(at(info, 'status', 'latestScoringPeriod')) ?? 0, number(at(info, 'scoringPeriodId')) ?? 0);
      const week = league.status === 'final' ? final : Math.min(final, weekNumber(latest || at(info, 'status', 'currentMatchupPeriod')));
      const scores = await fetchESPN<unknown>(league.season, league.id, ['mTeam', 'mRoster', 'mMatchupScore', 'mBoxscore'], { ...options, scoringPeriodId: week });
      return mapEspnSnapshot(league, { ...object(info), ...object(scores), settings: object(info).settings }, week);
    }
    case 'yahoo': {
      const scoreboard = await yahooFetch<unknown>(`/league/${league.id}/scoreboard`);
      const info = at(scoreboard, 'fantasy_content', 'league');
      const week = weekNumber(at(info, 'scoreboard', 'week') ?? at(info, 'current_week'), league.currentWeek || 1);
      const rosters = await yahooFetch<unknown>(`/league/${league.id}/teams/roster;week=${week}`);
      return enrichYahooWeek(mapYahooSnapshot(league, scoreboard, rosters, week));
    }
  }
}

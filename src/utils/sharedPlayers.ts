import type { GameDaySnapshot, RosterPlayer } from '@/types/gameDay';
import type { SavedLeague } from './savedLeagues';
import { savedLeagueKey } from './savedLeagues';
import { basePosition, canonicalTeam, normalizeName } from './playerNames';
import { NFL_TEAMS } from '@/data/nflTeams';
import { isStartingSlot } from './playerWeek';
import { matchupKey } from './gameDayLinks';

export interface SharedLeagueContext { saved: SavedLeague; snapshot: GameDaySnapshot | null; myTeamId?: string; error?: string | null }
export interface PlayerIdentity { key: string; name: string; position: string; espnId?: string }
export type PlayerIdentityIndex = Map<string, PlayerIdentity | null>;
export function playerIdentityIndex(rows: string[][]): PlayerIdentityIndex {
  const index: PlayerIdentityIndex = new Map();
  for (const [sleeper, espn, yahoo, name, position] of rows) {
    const identity = { key: sleeper ? `sleeper:${sleeper}` : `espn:${espn}`, name, position, espnId: espn || undefined };
    for (const [platform, id] of [['sleeper', sleeper], ['espn', espn], ['yahoo', yahoo]]) {
      if (!id) continue;
      const key = `${platform}:${id}`;
      const old = index.get(key);
      index.set(key, old === null || (old && old.key !== identity.key) ? null : identity);
    }
  }
  return index;
}
export interface SharedOccurrence {
  league: SavedLeague; matchup: string; fantasyTeam: string; role: 'own' | 'opponent';
  player: RosterPlayer; fetchedAt: number; stale: boolean;
}
export interface SharedPlayer {
  key: string; name: string; position: string; nflTeam: string; espnId?: string; defense: boolean;
  season: number; week: number; owned: number; opposing: number; matchupCount: number;
  occurrences: SharedOccurrence[];
}
const plainId = (platform: string, id: string) => platform === 'yahoo' ? id.split('.p.').pop()! : id;
function identity(player: RosterPlayer, platform: string, index: PlayerIdentityIndex) {
  const defense = basePosition(player.position) === 'DST';
  const team = canonicalTeam(player.nflTeam);
  const pos = defense ? 'D/ST' : basePosition(player.position.split(',')[0]);
  const known = index.get(`${platform}:${plainId(platform, player.id)}`);
  const meta = `${normalizeName(player.name)}|${pos}|${team}`;
  const fallback = !player.name || /^Player \d+$/i.test(player.name) ? `${platform}:${player.id}` : `name:${meta}`;
  return { key: defense ? `defense:${team || `${platform}:${player.id}`}` : known?.key ?? fallback,
    meta, known: !!known, defense, position: pos, nflTeam: team,
    name: defense ? `${NFL_TEAMS[team]?.name ?? team ?? player.name} D/ST` : known?.name ?? player.name,
    espnId: known?.espnId ?? (platform === 'espn' && !defense ? player.id : undefined) };
}

export function sharedPlayers(contexts: SharedLeagueContext[], index: PlayerIdentityIndex): SharedPlayer[] {
  const entries: { source: ReturnType<typeof identity>; occurrence: SharedOccurrence; season: number; week: number; platform: string }[] = [];
  for (const { saved, snapshot, myTeamId, error } of contexts) {
    if (!snapshot || !myTeamId) continue;
    const myMatches = snapshot.matchups.filter(match => [match.team1Id, match.team2Id].includes(myTeamId));
    for (const match of myMatches) {
      const matchKey = `${savedLeagueKey(saved)}:${snapshot.week}:${matchupKey(match)}`;
      for (const id of new Set([match.team1Id, match.team2Id])) {
        const team = snapshot.teams.find(team => team.id === id);
        for (const player of team?.roster ?? []) {
          if (player.id === '0' || !isStartingSlot(player.slot)) continue;
          entries.push({ source: identity(player, saved.platform, index), season: snapshot.season, week: snapshot.week, platform: saved.platform,
            occurrence: { league: saved, matchup: matchKey, fantasyTeam: team!.name, role: id === myTeamId ? 'own' : 'opponent', player, fetchedAt: snapshot.fetchedAt, stale: !!error } });
        }
      }
    }
  }
  // A missing ID may join an observed, unambiguous name/position/team match.
  // Conflicting IDs on the same platform block that fallback.
  const aliases = new Map<string, { known: Set<string>; ids: Map<string, Set<string>> }>();
  for (const entry of entries) {
    const key = `${entry.season}:${entry.week}:${entry.source.meta}`;
    const alias = aliases.get(key) ?? { known: new Set<string>(), ids: new Map<string, Set<string>>() };
    if (entry.source.known) alias.known.add(entry.source.key);
    const ids = alias.ids.get(entry.platform) ?? new Set(); ids.add(entry.occurrence.player.id); alias.ids.set(entry.platform, ids);
    aliases.set(key, alias);
  }
  const groups = new Map<string, SharedPlayer>();
  const seen = new Set<string>();
  for (const entry of entries) {
    const { source, occurrence, season, week } = entry;
    const alias = aliases.get(`${season}:${week}:${source.meta}`)!;
    const ambiguous = [...alias.ids.values()].some(ids => ids.size > 1);
    const family = !source.defense && !source.known && !ambiguous && alias.known.size === 1 ? [...alias.known][0]
      : !source.defense && !source.known && ambiguous ? `${entry.platform}:${occurrence.player.id}` : source.key;
    const key = `${season}:${week}:${family}`;
    const occurrenceKey = `${key}:${occurrence.matchup}:${occurrence.role}:${occurrence.fantasyTeam}`;
    if (seen.has(occurrenceKey)) continue; seen.add(occurrenceKey);
    const group = groups.get(key) ?? { key, name: source.name, position: source.position, nflTeam: source.nflTeam,
      espnId: source.espnId, defense: source.defense, season, week, owned: 0, opposing: 0, matchupCount: 0, occurrences: [] };
    if (!group.espnId && source.espnId) group.espnId = source.espnId;
    group.occurrences.push(occurrence); groups.set(key, group);
  }
  return [...groups.values()].map(group => ({ ...group,
    owned: new Set(group.occurrences.filter(o => o.role === 'own').map(o => savedLeagueKey(o.league))).size,
    opposing: new Set(group.occurrences.filter(o => o.role === 'opponent').map(o => savedLeagueKey(o.league))).size,
    matchupCount: new Set(group.occurrences.map(o => o.matchup)).size,
  })).filter(group => group.matchupCount >= 2);
}

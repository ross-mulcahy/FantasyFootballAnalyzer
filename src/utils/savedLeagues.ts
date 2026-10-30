import type { League, Platform } from '@/types';
import { loadCachedLeague, clearCachedLeague } from './leagueCache';
import { loadGameDayCache, clearGameDayCache } from './gameDayCache';
import { forgetESPNCredentials } from './espnCredentials';

const KEY = 'ffa:my-leagues:v1';
export const SAVED_LEAGUES_CHANGED = 'ffa:my-leagues-changed';

export interface SavedLeague {
  platform: Platform;
  leagueId: string;
  season: number;
  name: string;
  teamName?: string;
  teamId?: string;
}

export function savedLeagueKey(league: SavedLeague): string {
  return JSON.stringify([league.platform, league.leagueId, league.season]);
}

// Rebuild each entry so tokens/cookies can never hitch a ride in this list.
export function loadSavedLeagues(): SavedLeague[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    const entries = new Map<string, SavedLeague>();
    for (const item of data) {
      if (!item || !['sleeper', 'espn', 'yahoo'].includes(item.platform) ||
          typeof item.leagueId !== 'string' || !item.leagueId.trim() ||
          !Number.isInteger(item.season) || typeof item.name !== 'string') continue;
      const entry: SavedLeague = {
        platform: item.platform, leagueId: item.leagueId,
        season: item.season, name: item.name,
        ...(typeof item.teamName === 'string' ? { teamName: item.teamName } : {}),
        ...(typeof item.teamId === 'string' && item.teamId ? { teamId: item.teamId } : {}),
      };
      entries.set(savedLeagueKey(entry), entry);
    }
    return [...entries.values()];
  } catch {
    return [];
  }
}

function save(entries: SavedLeague[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(SAVED_LEAGUES_CHANGED));
    return true;
  } catch {
    return false;
  }
}

export function rememberSavedLeague(league: League): boolean {
  if (league.isGuest) return true;
  const existing = loadSavedLeagues().find(saved => saved.platform === league.platform && saved.leagueId === league.id && saved.season === league.season);
  const teamId = existing?.teamId ?? league.teams.find(team => team.isMyTeam)?.id;
  const entry: SavedLeague = {
    platform: league.platform, leagueId: league.id, season: league.season,
    name: league.name,
    teamId, teamName: league.teams.find(team => team.id === teamId)?.name ?? existing?.teamName,
  };
  const rest = loadSavedLeagues().filter(saved => savedLeagueKey(saved) !== savedLeagueKey(entry));
  return save([entry, ...rest]);
}

export function removeSavedLeague(entry: SavedLeague): boolean {
  const rest = loadSavedLeagues().filter(saved => savedLeagueKey(saved) !== savedLeagueKey(entry));
  if (!save(rest)) return false;
  clearCachedLeague(entry.platform, entry.leagueId, entry.season);
  clearGameDayCache({ platform: entry.platform, id: entry.leagueId, season: entry.season });
  // ESPN credentials span seasons. Keep them if another saved season needs them.
  if (entry.platform === 'espn' && !rest.some(saved => saved.platform === 'espn' && saved.leagueId === entry.leagueId)) {
    forgetESPNCredentials(entry.leagueId);
  }
  return true;
}

export function savedLeagueTeams(entry: SavedLeague): { id: string; name: string }[] {
  const cached = loadCachedLeague(entry.platform, entry.leagueId, entry.season);
  const snapshot = loadGameDayCache({ platform: entry.platform, id: entry.leagueId, season: entry.season });
  return (snapshot?.teams ?? cached?.teams ?? []).map(({ id, name }) => ({ id, name }));
}

export function selectSavedLeagueTeam(entry: SavedLeague, teamId: string): boolean {
  const team = savedLeagueTeams(entry).find(team => team.id === teamId);
  if (teamId && !team) return false;
  return save(loadSavedLeagues().map(saved => savedLeagueKey(saved) === savedLeagueKey(entry)
    ? { ...saved, teamId: team?.id, teamName: team?.name } : saved));
}

export function savedLeagueTeamId(entry: SavedLeague): string | undefined {
  if (entry.teamId) return entry.teamId;
  const league = loadCachedLeague(entry.platform, entry.leagueId, entry.season);
  return league?.teams.find(team => team.isMyTeam)?.id ?? savedLeagueTeams(entry).find(team => entry.teamName && team.name === entry.teamName)?.id;
}

import type { GameDaySnapshot } from '@/types/gameDay';
import type { League } from '@/types';

type Identity = Pick<League, 'platform' | 'id' | 'season'>;
const key = (league: Identity) => `ffa:game-day:v1:${league.platform}:${league.id}:${league.season}`;
const isScore = (n: unknown) => n === null || (typeof n === 'number' && Number.isFinite(n));

export function loadGameDayCache(league: Identity): GameDaySnapshot | null {
  try {
    const data = JSON.parse(localStorage.getItem(key(league)) ?? 'null') as GameDaySnapshot | null;
    if (!data || data.platform !== league.platform || data.leagueId !== league.id || data.season !== league.season ||
        !Number.isInteger(data.week) || data.week < 1 || data.week > 18 || !Number.isFinite(data.fetchedAt) ||
        !Array.isArray(data.teams) || !data.teams.length || !Array.isArray(data.matchups)) return null;
    if (!data.teams.every(t => t && typeof t.id === 'string' && typeof t.name === 'string' &&
      (t.roster === null || (Array.isArray(t.roster) && t.roster.every(p => p &&
        [p.id, p.name, p.position, p.nflTeam, p.slot].every(v => typeof v === 'string') &&
        (p.availability === undefined || typeof p.availability === 'string') && (p.points === undefined || isScore(p.points)) && (p.projection === undefined || isScore(p.projection)) &&
        (p.stats === undefined || (Array.isArray(p.stats) && p.stats.every(s => s && typeof s.label === 'string' && typeof s.value === 'number' && Number.isFinite(s.value))))))))) return null;
    if (!data.matchups.every(m => m && typeof m.id === 'string' && typeof m.team1Id === 'string' &&
      (m.team2Id === null || typeof m.team2Id === 'string') && isScore(m.team1Points) && isScore(m.team2Points) && typeof m.period === 'string')) return null;
    if (data.detailWarnings !== undefined && (!Array.isArray(data.detailWarnings) || !data.detailWarnings.every(s => typeof s === 'string'))) return null;
    if (data.projectionNote !== undefined && typeof data.projectionNote !== 'string') return null;
    if (data.matchups.some(m => (m.team1Projection !== undefined && !isScore(m.team1Projection)) || (m.team2Projection !== undefined && !isScore(m.team2Projection)))) return null;
    return data;
  } catch { return null; }
}

export function saveGameDayCache(data: GameDaySnapshot): boolean {
  // Persist display fields only. Credentials are never part of the snapshot.
  const { platform, leagueId, season, week, fetchedAt } = data;
  const safe = {
    platform, leagueId, season, week, fetchedAt,
    ...(data.detailVersion === 1 ? { detailVersion: 1 } : {}),
    ...(data.detailWarnings ? { detailWarnings: data.detailWarnings } : {}),
    ...(data.projectionNote ? { projectionNote: data.projectionNote } : {}),
    teams: data.teams.map(({ id, name, roster }) => ({ id, name,
      roster: roster?.map(({ id, name, position, nflTeam, slot, points, projection, stats, availability }) => ({ id, name, position, nflTeam, slot,
        ...(availability ? { availability } : {}),
        ...(points !== undefined ? { points } : {}), ...(projection !== undefined ? { projection } : {}),
        ...(stats ? { stats: stats.map(({ label, value }) => ({ label, value })) } : {}) })) ?? null })),
    matchups: data.matchups.map(({ id, team1Id, team2Id, team1Points, team2Points, period, team1Projection, team2Projection }) => ({ id, team1Id, team2Id, team1Points, team2Points, period,
      ...(team1Projection !== undefined ? { team1Projection } : {}), ...(team2Projection !== undefined ? { team2Projection } : {}) })),
  };
  try { localStorage.setItem(key({ platform, id: leagueId, season }), JSON.stringify(safe)); return true; }
  catch { return false; }
}

export function clearGameDayCache(league: Identity): void {
  try { localStorage.removeItem(key(league)); } catch { /* Storage unavailable. */ }
}

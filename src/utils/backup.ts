import { loadSavedLeagues, savedLeagueKey, SAVED_LEAGUES_CHANGED, type SavedLeague } from './savedLeagues';
import { loadRecaps, mergeRecaps, type RecapRow } from './gameDayInsights';
import { EXPERIENCE_KEY, EXPERIENCE_CHANGED, readExperience, type ExperiencePreferences } from './experience';
export interface PersonalBackup { format: 'ffa-personal-backup'; version: 1; createdAt: string; leagues: SavedLeague[]; recaps: RecapRow[]; preferences: ExperiencePreferences }
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, limit = 300): string => { if (typeof value !== 'string' || value.length > limit) throw new Error('Invalid text in backup.'); return value; };
const score = (value: unknown): number | null => { if (value === null || typeof value === 'number' && Number.isFinite(value)) return value; throw new Error('Invalid score in backup.'); };
function league(value: unknown): SavedLeague {
  const data = object(value);
  if (!['espn', 'sleeper', 'yahoo'].includes(String(data.platform)) || !Number.isInteger(data.season) || Number(data.season) < 2000 || Number(data.season) > 2200) throw new Error('Invalid league in backup.');
  const id = text(data.leagueId);
  if (!/^[\w.-]+$/.test(id)) throw new Error('Invalid league ID in backup.');
  return { platform: data.platform as SavedLeague['platform'], leagueId: id, season: Number(data.season), name: text(data.name), ...(data.teamId !== undefined ? { teamId: text(data.teamId) } : {}), ...(data.teamName !== undefined ? { teamName: text(data.teamName) } : {}) };
}
function recap(value: unknown): RecapRow {
  const data = object(value), saved = league(data.league), teamId = text(data.teamId), key = text(data.key, 1000), week = Number(data.week);
  if (!Number.isInteger(week) || week < 1 || week > 18 || data.season !== saved.season || !key.startsWith(`${savedLeagueKey(saved)}:${teamId}:${week}:`) || typeof data.fetchedAt !== 'number' || !Number.isFinite(data.fetchedAt) || typeof data.finished !== 'boolean' || typeof data.saved !== 'boolean') throw new Error('Invalid recap in backup.');
  const player = (value: unknown) => { if (value === null) return null; const data = object(value), points = score(data.points); if (points === null) throw new Error('Invalid player score.'); return { name: text(data.name), points }; };
  return { key, league: saved, teamId, week, season: saved.season, fetchedAt: data.fetchedAt, finished: data.finished, saved: data.saved, ownName: text(data.ownName), opponentName: text(data.opponentName), ownPoints: score(data.ownPoints), opponentPoints: score(data.opponentPoints), period: text(data.period), topOwn: player(data.topOwn), topOpponent: player(data.topOpponent) };
}
export function parseBackup(source: string): PersonalBackup {
  if (source.length > 2_000_000) throw new Error('Backup exceeds the 2 MB limit.');
  let data: Record<string, unknown>; try { data = object(JSON.parse(source)); } catch { throw new Error('This is not a valid JSON backup.'); }
  if (data.format !== 'ffa-personal-backup' || data.version !== 1 || !Array.isArray(data.leagues) || data.leagues.length > 100 || !Array.isArray(data.recaps) || data.recaps.length > 500) throw new Error('This file is not a supported Game Day backup.');
  if (!Number.isFinite(Date.parse(String(data.createdAt)))) throw new Error('Invalid backup date.');
  const preferences = object(data.preferences);
  if (typeof preferences.kickoffAlerts !== 'boolean' || !['all', 'impact', 'close'].includes(String(preferences.alertPriority))) throw new Error('Invalid preferences in backup.');
  return { format: 'ffa-personal-backup', version: 1, createdAt: text(data.createdAt), leagues: data.leagues.map(league), recaps: data.recaps.map(recap), preferences: { kickoffAlerts: preferences.kickoffAlerts, alertPriority: preferences.alertPriority as ExperiencePreferences['alertPriority'] } };
}
export function createBackup(): PersonalBackup {
  // Rebuild every display field. Never enumerate localStorage or export logins,
  // cookies, OAuth tokens, notification permissions, cached API data or env files.
  return parseBackup(JSON.stringify({ format: 'ffa-personal-backup', version: 1, createdAt: new Date().toISOString(), leagues: loadSavedLeagues(), recaps: loadRecaps(), preferences: readExperience() }));
}
export function restoreBackup(backup: PersonalBackup) {
  const safe = parseBackup(JSON.stringify(backup));
  const existing = loadSavedLeagues();
  const leagues = new Map(safe.leagues.map(saved => [savedLeagueKey(saved), saved]));
  for (const saved of existing) leagues.set(savedLeagueKey(saved), saved); // Keep existing team choices on a collision.
  const changes = new Map([
    ['ffa:my-leagues:v1', JSON.stringify([...leagues.values()])],
    ['ffa:game-day-recaps:v1', JSON.stringify(mergeRecaps(loadRecaps(), safe.recaps))],
    [EXPERIENCE_KEY, JSON.stringify(safe.preferences)],
  ]);
  const before = new Map([...changes.keys()].map(key => [key, localStorage.getItem(key)]));
  try { for (const [key, value] of changes) localStorage.setItem(key, value); }
  catch {
    for (const [key, value] of before) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Report failure even if storage also refuses rollback. */ } }
    throw new Error('Could not restore the backup. Browser storage may be full or blocked.');
  }
  window.dispatchEvent(new Event(SAVED_LEAGUES_CHANGED)); window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
}

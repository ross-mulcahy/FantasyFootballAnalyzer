import type { LeagueCredentials } from '@/types';
import { logger } from './logger';

// Keys are scoped per leagueId so loading a different ESPN league (or a
// different user's account) doesn't reuse the wrong cookies.
export function espnCredsKey(leagueId: string): string {
  return `espn_credentials:${leagueId}`;
}

interface StoredESPNCreds {
  espnS2?: string;
  swid?: string;
}

const rememberKey = (leagueId: string) => `ffa:espn:remember:${leagueId}`;

export function remembersESPNCredentials(leagueId: string): boolean {
  try { return localStorage.getItem(rememberKey(leagueId)) === '1'; }
  catch { return false; }
}

export function forgetESPNCredentials(leagueId: string): void {
  try { localStorage.removeItem(espnCredsKey(leagueId)); } catch { /* Storage unavailable. */ }
  try { sessionStorage.removeItem(espnCredsKey(leagueId)); } catch { /* Storage unavailable. */ }
  try { localStorage.removeItem(rememberKey(leagueId)); } catch { /* Storage unavailable. */ }
}

export function persistESPNCredentials(credentials: LeagueCredentials): void {
  if (credentials.platform !== 'espn') return;
  if (credentials.rememberEspn !== undefined) {
    try {
      if (credentials.rememberEspn) localStorage.setItem(rememberKey(credentials.leagueId), '1');
      else {
        localStorage.removeItem(rememberKey(credentials.leagueId));
        localStorage.removeItem(espnCredsKey(credentials.leagueId));
      }
    } catch { /* The session copy below still works. */ }
  }
  if (!credentials.espnS2 && !credentials.swid) return;
  try {
    const storage = remembersESPNCredentials(credentials.leagueId) ? localStorage : sessionStorage;
    storage.setItem(
      espnCredsKey(credentials.leagueId),
      JSON.stringify({
        espnS2: credentials.espnS2,
        swid: credentials.swid,
      } satisfies StoredESPNCreds),
    );
  } catch (err) {
    logger.warn('[espnCredentials] Failed to persist creds:', err);
  }
}

export function loadESPNCredentials(leagueId: string): StoredESPNCreds | undefined {
  try {
    const raw = remembersESPNCredentials(leagueId)
      ? localStorage.getItem(espnCredsKey(leagueId))
      : sessionStorage.getItem(espnCredsKey(leagueId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredESPNCreds;
    if (!parsed.espnS2 && !parsed.swid) return undefined;
    return parsed;
  } catch (err) {
    logger.warn('[espnCredentials] Failed to read creds:', err);
    return undefined;
  }
}

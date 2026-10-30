import { useSyncExternalStore } from 'react';
import type { SavedLeague } from './savedLeagues';
import { savedLeagueKey } from './savedLeagues';
export const HEALTH_KEY = 'ffa:connection-health:v1';
const changed = 'ffa-connection-health-changed';
export interface ConnectionHealth { checkedAt: number; lastSuccessAt: number | null; state: 'ok' | 'login' | 'unavailable' | 'setup' }
export function readConnectionHealth(): Record<string, ConnectionHealth> {
  try {
    const value = JSON.parse(localStorage.getItem(HEALTH_KEY) ?? '{}');
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, ConnectionHealth] => {
      const data = entry[1] as ConnectionHealth;
      return !!data && Number.isFinite(data.checkedAt) && (data.lastSuccessAt === null || Number.isFinite(data.lastSuccessAt)) && ['ok', 'login', 'unavailable', 'setup'].includes(data.state);
    }));
  } catch { return {}; }
}
export function recordConnectionHealth(saved: SavedLeague, error: string | null, now = Date.now()) {
  const states = readConnectionHealth(), key = savedLeagueKey(saved);
  const state = !error ? 'ok' : /not configured|another installation|login service|return address/i.test(error) ? 'setup' : /401|403|cookie|log.?in|authenticate|unauthoriz|reconnect/i.test(error) ? 'login' : 'unavailable';
  states[key] = { checkedAt: now, lastSuccessAt: error ? states[key]?.lastSuccessAt ?? null : now, state };
  try { localStorage.setItem(HEALTH_KEY, JSON.stringify(states)); window.dispatchEvent(new Event(changed)); } catch { /* In-page request errors remain visible. */ }
}
export function useConnectionHealth() {
  const raw = useSyncExternalStore(callback => {
    for (const event of [changed, 'storage', 'online', 'offline']) window.addEventListener(event, callback);
    return () => { for (const event of [changed, 'storage', 'online', 'offline']) window.removeEventListener(event, callback); };
  }, () => JSON.stringify({ online: navigator.onLine !== false, states: readConnectionHealth() }), () => '{"online":true,"states":{}}');
  return JSON.parse(raw) as { online: boolean; states: Record<string, ConnectionHealth> };
}
export function healthLabel(health: ConnectionHealth | undefined, online: boolean): string {
  if (!online) return 'Offline · Saved data';
  if (!health) return 'Not checked yet';
  return health.state === 'ok' ? `Last refreshed ${new Date(health.lastSuccessAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : health.state === 'login' ? 'Reconnect needed' : health.state === 'setup' ? 'Connection setup needed' : 'Refresh failed · Saved data';
}

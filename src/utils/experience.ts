import { useSyncExternalStore } from 'react';
import type { SavedLeague } from './savedLeagues';
import { savedLeagueKey } from './savedLeagues';
import type { SharedLeagueContext } from './sharedPlayers';
import type { MajorEvent, NFLTimeline } from '@/api/nflTimeline';
import { eventImpact, matchupMargin, myMatchups } from './gameDayInsights';

export const EXPERIENCE_KEY = 'ffa:experience:v1';
export const EXPERIENCE_CHANGED = 'ffa-experience-changed';
export type AlertPriority = 'all' | 'impact' | 'close';
export interface ExperiencePreferences { kickoffAlerts: boolean; alertPriority: AlertPriority }
export function readExperience(): ExperiencePreferences {
  try {
    const data = JSON.parse(localStorage.getItem(EXPERIENCE_KEY) ?? '{}');
    return { kickoffAlerts: typeof data?.kickoffAlerts === 'boolean' ? data.kickoffAlerts : true, alertPriority: ['all', 'impact', 'close'].includes(data?.alertPriority) ? data.alertPriority : 'all' };
  } catch { return { kickoffAlerts: true, alertPriority: 'all' }; }
}
function subscribe(callback: () => void) {
  for (const event of ['storage', EXPERIENCE_CHANGED]) window.addEventListener(event, callback);
  return () => { for (const event of ['storage', EXPERIENCE_CHANGED]) window.removeEventListener(event, callback); };
}
export function useExperiencePreferences() {
  const raw = useSyncExternalStore(subscribe, () => JSON.stringify(readExperience()), () => '{"kickoffAlerts":true,"alertPriority":"all"}');
  return JSON.parse(raw) as ExperiencePreferences;
}
export function saveExperience(value: ExperiencePreferences) {
  localStorage.setItem(EXPERIENCE_KEY, JSON.stringify({ kickoffAlerts: value.kickoffAlerts, alertPriority: value.alertPriority }));
  window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
}
export function reconnectHref(saved: SavedLeague) {
  return `/settings?${new URLSearchParams({ reconnect: savedLeagueKey(saved) })}`;
}
export function providerTeamUrl(saved: Pick<SavedLeague, 'platform' | 'leagueId' | 'season'>, teamId?: string): string | null {
  if (saved.platform === 'espn' && /^\d+$/.test(saved.leagueId)) {
    const query = new URLSearchParams({ leagueId: saved.leagueId, seasonId: String(saved.season) });
    if (teamId && /^\d+$/.test(teamId)) query.set('teamId', teamId);
    return `https://fantasy.espn.com/football/${query.has('teamId') ? 'team' : 'league'}?${query}`;
  }
  if (saved.platform === 'sleeper' && /^\d+$/.test(saved.leagueId)) return `https://sleeper.com/leagues/${saved.leagueId}/team`;
  if (saved.platform === 'yahoo') {
    const league = /(?:^|\.)l\.(\d+)$/.exec(saved.leagueId)?.[1] ?? (/^\d+$/.test(saved.leagueId) ? saved.leagueId : undefined);
    const team = /(?:^|\.)t\.(\d+)$/.exec(teamId ?? '')?.[1] ?? (/^\d+$/.test(teamId ?? '') ? teamId : undefined);
    if (league) return `https://football.fantasysports.yahoo.com/f1/${league}${team ? `/${team}` : ''}`;
  }
  return null;
}
export function prioritizeEvents(events: MajorEvent[], mode: AlertPriority, contexts: SharedLeagueContext[], data: NFLTimeline | null, now: number) {
  if (mode === 'all') return events;
  const ranked = events.filter(event => !event.occurredAt || now - Date.parse(event.occurredAt) <= 10 * 60000).map(event => {
    const impacts = eventImpact(event, contexts, data);
    const close = contexts.some(context => impacts.some(impact => savedLeagueKey(impact.league) === savedLeagueKey(context.saved)) && myMatchups(context).some(match => {
      const margin = matchupMargin(context, match, 'current', data) ?? matchupMargin(context, match, 'projected', data);
      return margin !== null && Math.abs(margin) <= 10;
    }));
    return { event, score: close ? 3 : impacts.length ? 2 : 1 };
  });
  const chosen = ranked.filter(item => mode !== 'impact' || item.score >= 2);
  if (mode === 'close') chosen.sort((a, b) => b.score - a.score);
  return chosen.map(item => item.event);
}

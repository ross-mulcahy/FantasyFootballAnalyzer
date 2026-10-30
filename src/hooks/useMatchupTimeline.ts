import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNFLTimeline, readTimelineCache, sortMajorEvents, timelineCacheKey, type NFLTimeline } from '@/api/nflTimeline';
import { useBrowserAlertsEnabled } from '@/utils/browserAlerts';

export const LIVE_EVENTS_MS = 15000;
export const IDLE_EVENTS_MS = 3 * 60 * 60 * 1000;

export function useMatchupTimeline(season: number, week: number, teams: string[], refreshedAt: number, needPlayerStats = false) {
  const key = timelineCacheKey(season, week, teams);
  const background = useBrowserAlertsEnabled();
  const [result, setResult] = useState<{ key: string; data: NFLTimeline | null }>({ key, data: readTimelineCache(key) });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useRef<(force?: boolean) => void>(() => {});
  const refresh = useCallback(() => run.current(true), []);
  useEffect(() => {
    let active = true, busy = false, forceQueued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = readTimelineCache(key);
    let lastAttempt = 0;
    const available = () => navigator.onLine !== false && (background || document.visibilityState !== 'hidden');
    const live = () => current?.games?.some(game => game.state === 'in') ?? false;
    const interval = () => live() ? LIVE_EVENTS_MS : !current?.games || current.games.some(game => game.state === 'unknown') ? 60000 : IDLE_EVENTS_MS;
    const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      clear();
      if (!active || !available() || !teams.length) return;
      const now = Date.now();
      let delay = Math.max(current?.fetchedAt ?? 0, lastAttempt) + interval() - now;
      // Wake at the next relevant kickoff. Delayed starts get a status check each minute.
      for (const game of current?.games ?? []) {
        const kickoff = Date.parse(game.kickoff);
        if (game.state === 'pre' && Number.isFinite(kickoff) && !/CANCEL|POSTPON|SUSPEND/i.test(game.detail)) {
          delay = Math.min(delay, kickoff > now ? kickoff - now : 60000);
        }
      }
      timer = setTimeout(() => void tick(true), Math.max(1000, delay));
    };
    const tick = async (force = false) => {
      if (!active) return;
      if (busy) { forceQueued ||= force; return; }
      clear();
      if (!available() || !teams.length) return;
      const age = Date.now() - Math.max(current?.fetchedAt ?? 0, lastAttempt);
      const validCache = current?.games && (!needPlayerStats || current.playerStats !== undefined) && age < interval();
      if (!force && validCache) { schedule(); return; }
      busy = true;
      lastAttempt = Date.now();
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNFLTimeline(season, week, teams, current ?? undefined);
        if (!active) return;
        const retained = current?.events.filter(event => data.failedGameIds?.includes(event.gameId)) ?? [];
        current = { ...data, events: sortMajorEvents([...data.events, ...retained]), ...(data.playerStats ? { playerStats: { ...Object.fromEntries(Object.entries(current?.playerStats ?? {}).filter(([, line]) => data.failedGameIds?.includes(line.gameId))), ...data.playerStats } } : {}) };
        setResult({ key, data: current });
        try { localStorage.setItem(key, JSON.stringify(current)); } catch { /* Still show fresh events. */ }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'NFL events are unavailable.');
      } finally {
        busy = false;
        if (active) {
          setLoading(false);
          if (forceQueued) { forceQueued = false; void tick(true); }
          else schedule();
        }
      }
    };
    setResult({ key, data: current });
    setError(null);
    setLoading(false);
    run.current = force => void tick(force);
    const wake = () => { clear(); if (available()) void tick(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('offline', wake);
    window.addEventListener('focus', wake);
    void tick();
    return () => {
      active = false; clear(); run.current = () => {};
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', wake);
      window.removeEventListener('focus', wake);
    };
    // Canonical key fully describes season, week and teams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, background, needPlayerStats]);
  useEffect(() => { run.current(); }, [refreshedAt]);
  return { data: result.key === key ? result.data : null, error, loading, refresh };
}

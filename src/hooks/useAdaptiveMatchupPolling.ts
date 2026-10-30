import { useEffect, useRef, useState } from 'react';
import { fetchNFLActivity, type NFLActivity } from '@/api/nflActivity';

export const LIVE_POLL_MS = 60000;
export const IDLE_POLL_MS = 3 * 60 * 60 * 1000;

export interface MatchupPollingStatus {
  mode: 'checking' | 'live' | 'idle';
  paused: boolean;
  statusUnavailable: boolean;
  nextRefreshAt: number | null;
}



export function useAdaptiveMatchupPolling({ enabled, identity, season, refresh, lastUpdated, background = false }: {
  enabled: boolean;
  background?: boolean;
  identity: string;
  season: number;
  refresh: () => Promise<void>;
  lastUpdated: () => number;
}): MatchupPollingStatus | null {
  const [status, setStatus] = useState<MatchupPollingStatus | null>(null);
  const refreshRef = useRef(refresh);
  const updatedRef = useRef(lastUpdated);
  useEffect(() => { refreshRef.current = refresh; updatedRef.current = lastUpdated; }, [refresh, lastUpdated]);

  useEffect(() => {
    if (!enabled) { setStatus(null); return; }
    const available = () => (background || document.visibilityState !== 'hidden') && navigator.onLine !== false;
    let stopped = false, running = false, queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activity: NFLActivity | null = null;
    let lastAttempt = 0;
    let statusUnavailable = false;
    const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const publish = (nextRefreshAt: number | null) => {
      if (!stopped) setStatus({ mode: activity ? activity.live ? 'live' : 'idle' : 'checking', paused: !available(), statusUnavailable, nextRefreshAt });
    };
    const tick = async () => {
      clearTimer();
      if (stopped) return;
      if (!available()) { publish(null); return; }
      if (running) { queued = true; return; }
      running = true;
      try {
        const previous = activity;
        try { activity = await fetchNFLActivity(season); statusUnavailable = false; }
        catch { statusUnavailable = true; /* Keep the last known cadence. */ }
        if (stopped || !available()) { publish(null); return; }
        const interval = activity && !activity.live ? IDLE_POLL_MS : LIVE_POLL_MS;
        const transitioned = previous !== null && activity !== null && previous.live !== activity.live;
        const updated = Math.max(updatedRef.current(), lastAttempt);
        if (!updated || Date.now() - updated >= interval || transitioned) {
          lastAttempt = Date.now();
          await refreshRef.current();
        }
        if (stopped || !available()) { publish(null); return; }
        const now = Date.now();
        const due = Math.max(updatedRef.current(), lastAttempt) + interval;
        // Probe at kickoff even when the next matchup refresh is hours away.
        // A status-only probe does not refresh matchups unless they are due
        // or the game state changes (including one final refresh at full-time).
        const statusDelay = statusUnavailable || !activity || activity.live ? LIVE_POLL_MS
          : activity.nextKickoff === null ? IDLE_POLL_MS : Math.min(IDLE_POLL_MS, Math.max(1000, activity.nextKickoff - now));
        publish(due);
        timer = setTimeout(() => void tick(), Math.max(1000, Math.min(due - now, statusDelay)));
      } finally {
        running = false;
        if (queued && !stopped && available()) { queued = false; clearTimer(); timer = setTimeout(() => void tick(), 0); }
      }
    };
    const wake = () => { clearTimer(); if (available()) void tick(); else publish(null); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('offline', wake);
    window.addEventListener('focus', wake);
    publish(null);
    void tick();
    return () => {
      stopped = true;
      clearTimer();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', wake);
      window.removeEventListener('focus', wake);
    };
  }, [enabled, identity, season, background]);

  return enabled ? status : null;
}

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { League, LeagueCredentials } from '@/types';
import type { GameDaySnapshot } from '@/types/gameDay';
import { loadGameDay } from '@/api/gameDay';
import { loadGameDayCache, saveGameDayCache } from '@/utils/gameDayCache';
import { useBrowserAlertsEnabled } from '@/utils/browserAlerts';
import { useAdaptiveMatchupPolling } from './useAdaptiveMatchupPolling';

export const GameDayContext = createContext<ReturnType<typeof useGameDayState> | null>(null);

// App owns the shared state and its one polling loop. Standalone consumers
// (including component tests) retain the existing local/manual behavior.
export function useGameDay(league: League, credentials: LeagueCredentials | null) {
  const shared = useContext(GameDayContext);
  const local = useGameDayState(league, credentials, { enabled: shared === null });
  return shared ?? local;
}

export function useGameDayState(league: League | null, credentials: LeagueCredentials | null, options: { enabled?: boolean; poll?: boolean } = {}) {
  const backgroundAlerts = useBrowserAlertsEnabled();
  const enabled = options.enabled !== false && !!league && !league.isGuest;
  const [snapshot, setSnapshot] = useState<GameDaySnapshot | null>(() => enabled && league ? loadGameDayCache(league) : null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheWarning, setCacheWarning] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);
  const updatedAt = useRef(snapshot?.fetchedAt ?? 0);
  const lastUpdated = useCallback(() => updatedAt.current, []);
  const refresh = useCallback(async () => {
    if (!enabled || !league || busy.current) return;
    busy.current = true;
    const id = ++request.current;
    setIsRefreshing(true);
    setError(null);
    try {
      const fresh = await loadGameDay(league, credentials);
      if (id !== request.current) return;
      updatedAt.current = fresh.fetchedAt;
      setSnapshot(fresh);
      setCacheWarning(!saveGameDayCache(fresh));
    } catch (err) {
      if (id === request.current) setError(err instanceof Error ? err.message : 'Could not refresh rosters and scores.');
    } finally {
      if (id === request.current) { busy.current = false; setIsRefreshing(false); }
    }
  }, [league, credentials, enabled]);

  // This is a request-generation counter, not a DOM ref. Always invalidate
  // the latest request when leaving the view or changing its league.
  const cancel = useCallback(() => { ++request.current; busy.current = false; }, []);

  useEffect(() => {
    const cached = enabled && league ? loadGameDayCache(league) : null;
    updatedAt.current = cached?.fetchedAt ?? 0;
    setSnapshot(cached);
    setIsRefreshing(false);
    setError(null);
    setCacheWarning(false);
    const canStart = !options.poll || ((backgroundAlerts || document.visibilityState !== 'hidden') && navigator.onLine !== false);
    if (enabled && canStart && (!cached || cached.detailVersion !== 1)) void refresh();
    return cancel;
  }, [league, refresh, cancel, enabled, options.poll, backgroundAlerts]);

  const polling = useAdaptiveMatchupPolling({
    enabled: enabled && options.poll === true,
    identity: league ? `${league.platform}:${league.id}:${league.season}` : '',
    season: league?.season ?? 0, refresh, lastUpdated, background: backgroundAlerts,
  });

  const currentSnapshot = enabled && league && snapshot?.platform === league.platform && snapshot.leagueId === league.id && snapshot.season === league.season ? snapshot : null;
  return { snapshot: currentSnapshot, isRefreshing, error, cacheWarning, refresh, polling };
}

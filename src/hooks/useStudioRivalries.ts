import { useEffect, useState } from 'react';
import type { HeadToHeadRecord } from '@/types';
import { loadHeadToHeadRecords as loadSleeperH2H } from '@/api/sleeper';
import { loadHeadToHeadRecords as loadESPNH2H } from '@/api/espn';
import { loadHeadToHeadRecords as loadYahooH2H } from '@/api/yahoo';
import type { SavedLeague } from '@/utils/savedLeagues';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { loadESPNCredentials } from '@/utils/espnCredentials';
import { studioRivalryFromRecords, type StudioRivalry } from '@/utils/studioAnchor';

export interface StudioRivalryTarget {
  key: string;
  league: SavedLeague;
  teamId: string;
  own: string;
  opponent: string;
  opponentOwnerId?: string;
  season: number;
  week: number;
}

const CACHE_AGE = 30 * 60_000;
const cacheKey = (target: StudioRivalryTarget) => `ffa:studio-h2h:v1:${savedLeagueKey(target.league)}:${target.teamId}`;

async function loadRecords(target: StudioRivalryTarget): Promise<Map<string, HeadToHeadRecord>> {
  if (target.league.platform === 'sleeper') return loadSleeperH2H(target.league.leagueId, target.teamId, 3).then(result => result.records);
  if (target.league.platform === 'espn') return loadESPNH2H(target.league.leagueId, target.teamId, 3, loadESPNCredentials(target.league.leagueId), target.league.season).then(result => result.records);
  return loadYahooH2H(target.league.leagueId, target.teamId, 3).then(result => result.records);
}

function readCache(key: string): Map<string, HeadToHeadRecord> | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (!cached || Date.now() - cached.at > CACHE_AGE || !Array.isArray(cached.records)) return null;
    return new Map(cached.records as [string, HeadToHeadRecord][]);
  } catch { return null; }
}
function writeCache(key: string, records: Map<string, HeadToHeadRecord>) {
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), records: [...records] })); } catch { /* A full or disabled session cache should not prevent the take. */ }
}

/** Loads rivalry files once per selected team, then shares them across current matchups. */
export function useStudioRivalries(targets: StudioRivalryTarget[]): StudioRivalry[] {
  const [loaded, setLoaded] = useState<Record<string, StudioRivalry>>({});
  const signature = targets.map(target => `${target.key}:${target.own}:${target.opponent}:${target.opponentOwnerId ?? ''}`).join('|');
  useEffect(() => {
    let cancelled = false;
    const groups = new Map<string, StudioRivalryTarget[]>();
    for (const target of targets) {
      const key = cacheKey(target);
      groups.set(key, [...(groups.get(key) ?? []), target]);
    }
    void (async () => {
      for (const [key, group] of groups) {
        if (cancelled) return;
        try {
          const records = readCache(key) ?? await loadRecords(group[0]);
          if (cancelled) return;
          writeCache(key, records);
          const next = Object.fromEntries(group.map(target => [target.key, studioRivalryFromRecords(target.key, target.league.name, target.own, target.opponent, target.opponentOwnerId, records, target.season, target.week)]));
          setLoaded(previous => ({ ...previous, ...next }));
        } catch { /* No archive signal is better than a fabricated record. */ }
      }
    })();
    return () => { cancelled = true; };
  // The signature changes only when the selected teams or matchups change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return targets.flatMap(target => loaded[target.key] ? [loaded[target.key]] : []);
}

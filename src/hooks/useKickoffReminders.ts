import { useEffect, useRef, useState } from 'react';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import { lineupWarnings, type TimelineFeeds } from '@/utils/gameDayInsights';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { playerGameStatus } from '@/utils/matchupGameStatus';
import { isStartingSlot } from '@/utils/playerWeek';
import { useExperiencePreferences } from '@/utils/experience';
import { browserAlertsEnabled, useBrowserAlertsEnabled } from '@/utils/browserAlerts';
const sentKey = 'ffa:kickoff-reminders:v1';
export function kickoffChecks(contexts: SharedLeagueContext[], feeds: TimelineFeeds, now: number) {
  return contexts.flatMap(context => {
    const snapshot = context.snapshot, team = snapshot?.teams.find(team => team.id === context.myTeamId), feed = feeds[`${snapshot?.season}:${snapshot?.week}`];
    if (!snapshot || !team?.roster || !feed?.data?.games || feed.error) return [];
    const games = team.roster.filter(player => isStartingSlot(player.slot) && player.id !== '0').map(player => playerGameStatus(player.nflTeam, feed.data));
    const kickoff = Math.min(Infinity, ...games.filter(game => game?.state === 'pre' && !/CANCEL|POSTPON|SUSPEND/i.test(game.detail) && Date.parse(game.kickoff) > now).map(game => Date.parse(game!.kickoff)));
    if (!Number.isFinite(kickoff) || kickoff - now > 15 * 60000) return [];
    return [{ key: `${savedLeagueKey(context.saved)}:${snapshot.week}:${kickoff}`, leagueKey: savedLeagueKey(context.saved), name: context.saved.name, warnings: lineupWarnings([context], feeds, now) }];
  });
}
export function useKickoffReminders(contexts: SharedLeagueContext[], feeds: TimelineFeeds, now: number, refreshLeague: (key: string) => Promise<void>) {
  const preferences = useExperiencePreferences(), enabled = useBrowserAlertsEnabled();
  const [revision, setRevision] = useState(0), [problem, setProblem] = useState<string | null>(null);
  const attempted = useRef(new Set<string>()), pending = useRef(new Set<string>()), delivered = useRef(new Set<string>());
  const checks = kickoffChecks(contexts, feeds, now);
  useEffect(() => {
    if (!preferences.kickoffAlerts || navigator.onLine === false) return;
    for (const check of checks) {
      if (!attempted.current.has(check.key)) {
        attempted.current.add(check.key); pending.current.add(check.key);
        void refreshLeague(check.leagueKey).catch(() => {}).finally(() => { pending.current.delete(check.key); setRevision(value => value + 1); });
        continue;
      }
      if (pending.current.has(check.key) || !check.warnings.length || !enabled || !browserAlertsEnabled()) continue;
      let saved: string[] = []; try { const data = JSON.parse(localStorage.getItem(sentKey) ?? '[]'); if (Array.isArray(data)) saved = data.filter((key): key is string => typeof key === 'string'); } catch { /* In-memory dedup remains. */ }
      if (saved.includes(check.key) || delivered.current.has(check.key)) continue;
      try {
        const notice = new Notification(`Lineup check · ${check.name}`, { body: `${check.warnings.length} starting-lineup ${check.warnings.length === 1 ? 'issue' : 'issues'} before kickoff: ${check.warnings.map(warning => warning.message).join('; ')}${check.warnings.some(warning => warning.saved) ? ' · Saved data; refresh before making changes.' : ''}`, tag: `ffa-kickoff:${check.key}` });
        notice.onclick = () => { window.focus(); notice.close(); };
        delivered.current.add(check.key);
        try { localStorage.setItem(sentKey, JSON.stringify([...new Set([...saved, check.key])].slice(-500))); } catch { /* Keep in-memory deduplication. */ }
        setProblem(null);
      } catch { setProblem('The browser could not show the kickoff reminder. Check notification permissions.'); }
    }
  }, [checks, preferences.kickoffAlerts, enabled, refreshLeague, revision]);
  return { problem, checks };
}

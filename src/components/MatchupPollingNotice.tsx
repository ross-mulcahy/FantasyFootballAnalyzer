import type { MatchupPollingStatus } from '@/hooks/useAdaptiveMatchupPolling';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupPollingNotice({ polling }: { polling?: MatchupPollingStatus | null }) {
  if (!polling) return null;
  return <p className={styles.hint} role="status">
    {polling.paused ? 'Automatic updates paused. This browser is offline, or the tab is hidden with browser alerts off.'
      : polling.mode === 'live' ? 'Games in progress · Matchups update every 60 seconds.'
      : polling.mode === 'idle' ? 'No games in progress for this season · Matchups update every 3 hours.'
      : polling.statusUnavailable ? 'Game status unavailable · Using 60-second updates until it recovers.' : 'Checking NFL game status…'}
    {!polling.paused && polling.nextRefreshAt !== null && <> Next update <time dateTime={new Date(polling.nextRefreshAt).toISOString()}>{new Date(polling.nextRefreshAt).toLocaleTimeString()}</time>.</>}
    {polling.statusUnavailable && polling.mode !== 'checking' && ' Game status could not be checked; keeping the last update interval.'}
  </p>;
}

import { StudioTeleprompterBar } from '@/components/StudioTeleprompterBar';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { ExperienceSettings } from '@/components/ExperienceSettings';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { useSearchParams } from 'react-router-dom';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { leagueConnectorEnabled } from '@/utils/leagueConnectors';
import { LeagueForm } from '@/components/LeagueForm';
import type { LeagueCredentials } from '@/types';
import type { LoadingProgress } from '@/hooks/useLeague';
import styles from './GameDayPage.module.css';

export function SettingsPage({ onLoadLeague, isLoading, error, progress }: {
  onLoadLeague: (credentials: LeagueCredentials) => void; isLoading: boolean; error: string | null; progress: LoadingProgress | null;
}) {
  const saved = useSavedLeagues();
  const [params] = useSearchParams();
  const reconnectLeague = saved.find(league => savedLeagueKey(league) === params.get('reconnect'));
  const initialLeague = reconnectLeague && leagueConnectorEnabled(reconnectLeague.platform) ? reconnectLeague : undefined;
  return <div className={`${styles.page} ${styles.settingsPage}`}><div className="container"><StudioTeleprompterBar takes={["Connection desk open. Patch in a league, choose your team, check the studio signal.", "Credentials and backups follow the existing local-storage controls."]} />
    <div className={styles.header}><h1 className={styles.title}>Settings</h1><p className={styles.subtitle}>Leagues, alerts & backups · Saved on this device</p></div>
    <nav className={styles.settingsSections} aria-label="Settings sections"><a href="#connections-heading">League connections ↓</a><a href="#experience-heading">Alerts & backup ↓</a></nav>
    <StudioMonitorFrame as="section" padded className={styles.card} aria-labelledby="connections-heading">
      <h2 id="connections-heading" className={styles.sectionTitle}>League connections</h2>
      <p className={styles.hint}>Find a Sleeper league by username, or paste its league link. After connecting, choose your team for personal Game Day alerts.</p>
      {reconnectLeague && !initialLeague && <p role="status" className={styles.hint}>{reconnectLeague.platform.toUpperCase()} connections are paused. Your saved league remains on this device.</p>}
      <LeagueForm key={initialLeague ? savedLeagueKey(initialLeague) : 'new'} initialLeague={initialLeague} onSubmit={onLoadLeague} isLoading={isLoading} />
      {isLoading && progress && <p role="status">{progress.stage} · {progress.current}/{progress.total}{progress.detail ? ` · ${progress.detail}` : ''}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </StudioMonitorFrame>
    <ExperienceSettings />
  </div></div>;
}

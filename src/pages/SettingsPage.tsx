import { useEffect, useRef, useState } from 'react';
import { StudioTeleprompterBar } from '@/components/StudioTeleprompterBar';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { ExperienceSettings } from '@/components/ExperienceSettings';
import { LeagueSetupFinish } from '@/components/LeagueSetupFinish';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { leagueConnectorEnabled } from '@/utils/leagueConnectors';
import { leagueGameDayHref } from '@/utils/gameDayLinks';
import { LeagueForm } from '@/components/LeagueForm';
import type { League, LeagueCredentials } from '@/types';
import type { LoadingProgress } from '@/hooks/useLeague';
import styles from './GameDayPage.module.css';

export function SettingsPage({ onLoadLeague, isLoading, error, progress }: {
  onLoadLeague: (credentials: LeagueCredentials, options?: { stayOnSettings?: boolean }) => Promise<League | null>;
  isLoading: boolean; error: string | null; progress: LoadingProgress | null;
}) {
  const saved = useSavedLeagues();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [completedLeague, setCompletedLeague] = useState<League | null>(null);
  const finishPanel = useRef<HTMLDivElement>(null);
  const reconnectLeague = saved.find(league => savedLeagueKey(league) === params.get('reconnect'));
  const initialLeague = reconnectLeague && leagueConnectorEnabled(reconnectLeague.platform) ? reconnectLeague : undefined;
  useEffect(() => { if (completedLeague) finishPanel.current?.focus(); }, [completedLeague]);
  const connect = async (credentials: LeagueCredentials) => {
    const loaded = await onLoadLeague(credentials, { stayOnSettings: true });
    if (loaded) setCompletedLeague(loaded);
  };
  return <div className={`${styles.page} ${styles.settingsPage}`}><div className="container"><StudioTeleprompterBar takes={completedLeague ? [`${completedLeague.name} is on air. Confirm your team, add another league or head to Game Day.`] : ["Connection desk open. Patch in a league, choose your team, check the studio signal.", "Credentials and backups follow the existing local-storage controls."]} />
    <div className={styles.header}><h1 className={styles.title}>Settings</h1><p className={styles.subtitle}>Leagues, alerts & backups · Saved on this device</p></div>
    <nav className={styles.settingsSections} aria-label="Settings sections"><a href="#connections-heading">League connections ↓</a><a href="#experience-heading">Alerts & backup ↓</a></nav>
    <StudioMonitorFrame as="section" padded className={styles.card} aria-labelledby="connections-heading">
      <h2 id="connections-heading" className={styles.sectionTitle}>League connections</h2>
      <div hidden={!!completedLeague}>
        <p className={styles.hint}>Find a Sleeper league by username, or paste its league link. After connecting, choose your team for personal Game Day alerts.</p>
        {reconnectLeague && !initialLeague && <p role="status" className={styles.hint}>{reconnectLeague.platform.toUpperCase()} connections are paused. Your saved league remains on this device.</p>}
        <LeagueForm key={initialLeague ? savedLeagueKey(initialLeague) : 'new'} initialLeague={initialLeague} onSubmit={connect} isLoading={isLoading} />
        {isLoading && progress && <p role="status">{progress.stage} · {progress.current}/{progress.total}{progress.detail ? ` · ${progress.detail}` : ''}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      {completedLeague && <div ref={finishPanel} tabIndex={-1}>
        <LeagueSetupFinish key={`${completedLeague.platform}:${completedLeague.id}:${completedLeague.season}`} league={completedLeague} onAddAnother={() => setCompletedLeague(null)} onGoGameDay={hasTeam => navigate(hasTeam ? '/' : leagueGameDayHref(completedLeague))} />
      </div>}
    </StudioMonitorFrame>
    <ExperienceSettings />
    <a className={styles.spacefastCredit} href="https://spacefast.com/" target="_blank" rel="noopener noreferrer" aria-label="Built on Spacefast (opens in a new tab)">
      <span>Built on</span>
      <img src={`${import.meta.env.BASE_URL}spacefast-logo.jpg`} alt="" width="120" height="63" />
    </a>
  </div></div>;
}

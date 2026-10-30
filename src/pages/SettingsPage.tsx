import { ExperienceSettings } from '@/components/ExperienceSettings';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { useSearchParams } from 'react-router-dom';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { LeagueForm } from '@/components/LeagueForm';
import type { LeagueCredentials } from '@/types';
import type { LoadingProgress } from '@/hooks/useLeague';
import styles from './GameDayPage.module.css';

export function SettingsPage({ onLoadLeague, isLoading, error, progress }: {
  onLoadLeague: (credentials: LeagueCredentials) => void; isLoading: boolean; error: string | null; progress: LoadingProgress | null;
}) {
  const saved = useSavedLeagues();
  const [params] = useSearchParams();
  const initialLeague = saved.find(league => savedLeagueKey(league) === params.get('reconnect'));
  return <div className={styles.page}><div className="container">
    <div className={styles.header}><h1 className={styles.title}>Settings</h1><p className={styles.subtitle}>Leagues, alerts & backups · Saved on this device</p></div>
    <nav className={styles.settingsSections} aria-label="Settings sections"><a href="#connections-heading">League connections ↓</a><a href="#experience-heading">Alerts & backup ↓</a></nav>
    <section className={styles.card} aria-labelledby="connections-heading">
      <h2 id="connections-heading" className={styles.sectionTitle}>League connections</h2>
      <p className={styles.hint}>Choose your team in each saved league to include its matchups on Game Day.</p>
      <LeagueForm key={initialLeague ? savedLeagueKey(initialLeague) : 'new'} initialLeague={initialLeague} onSubmit={onLoadLeague} isLoading={isLoading} />
      {isLoading && progress && <p role="status">{progress.stage} · {progress.current}/{progress.total}{progress.detail ? ` · ${progress.detail}` : ''}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
    <ExperienceSettings />
  </div></div>;
}

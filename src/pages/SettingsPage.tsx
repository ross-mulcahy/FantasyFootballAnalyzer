import { LeagueForm } from '@/components/LeagueForm';
import type { LeagueCredentials } from '@/types';
import type { LoadingProgress } from '@/hooks/useLeague';
import styles from './GameDayPage.module.css';

export function SettingsPage({ onLoadLeague, isLoading, error, progress }: {
  onLoadLeague: (credentials: LeagueCredentials) => void; isLoading: boolean; error: string | null; progress: LoadingProgress | null;
}) {
  return <div className={styles.page}><div className="container">
    <div className={styles.header}><h1 className={styles.title}>Settings</h1><p className={styles.subtitle}>Leagues & teams · Saved on this device</p></div>
    <section className={styles.card} aria-labelledby="connections-heading">
      <h2 id="connections-heading" className={styles.sectionTitle}>League connections</h2>
      <p className={styles.hint}>Choose your team in each saved league to include its matchups on Game Day.</p>
      <LeagueForm onSubmit={onLoadLeague} isLoading={isLoading} />
      {isLoading && progress && <p role="status">{progress.stage} · {progress.current}/{progress.total}{progress.detail ? ` · ${progress.detail}` : ''}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  </div></div>;
}

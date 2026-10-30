import { Link } from 'react-router-dom';
import { healthLabel, useConnectionHealth } from '@/utils/connectionHealth';
import { reconnectHref, providerTeamUrl } from '@/utils/experience';
import { savedLeagueKey, type SavedLeague } from '@/utils/savedLeagues';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import styles from '@/pages/GameDayPage.module.css';
export function ProviderLink({ league, teamId }: { league: Pick<SavedLeague, 'platform' | 'leagueId' | 'season'>; teamId?: string }) {
  const url = providerTeamUrl(league, teamId);
  return url ? <a className={styles.providerLink} href={url} target="_blank" rel="noopener noreferrer">Open {league.platform === 'espn' ? 'ESPN' : league.platform === 'yahoo' ? 'Yahoo' : 'Sleeper league'} ↗</a> : null;
}
export function LeagueConnectionHealth({ league }: { league: SavedLeague }) {
  const { states, online } = useConnectionHealth(), health = states[savedLeagueKey(league)];
  return <span className={styles.connectionLabel}>{healthLabel(health, online)}{health && health.state !== 'ok' && <Link to={reconnectHref(league)}> Reconnect {league.name} →</Link>}</span>;
}
export function ConnectionHealthBar({ contexts }: { contexts: SharedLeagueContext[] }) {
  const { states, online } = useConnectionHealth();
  const attention = contexts.filter(context => !!context.error || states[savedLeagueKey(context.saved)]?.state && states[savedLeagueKey(context.saved)].state !== 'ok');
  const unchecked = contexts.filter(context => !context.error && !states[savedLeagueKey(context.saved)]).length;
  return <section className={styles.connectionBar} aria-label="Connection health">
    <p>{online ? `${contexts.length} leagues · ${attention.length} need attention${unchecked ? ` · ${unchecked} not checked yet` : ''}` : 'Offline · Showing saved scores'}</p>
    {!!attention.length && <ul>{attention.map(context => <li key={savedLeagueKey(context.saved)}>{context.saved.name} · {healthLabel(states[savedLeagueKey(context.saved)], online)} <Link to={reconnectHref(context.saved)}>Reconnect →</Link></li>)}</ul>}
    {!attention.length && <Link to="/settings">Manage connections & alerts →</Link>}
  </section>;
}

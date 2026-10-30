import { ProviderLink } from '@/components/ConnectionHealth';
import type { League, LeagueCredentials, Team } from '@/types';
import { useGameDay } from '@/hooks/useGameDay';
import { MatchupPollingNotice } from '@/components/MatchupPollingNotice';
import { TeamDetail } from './TeamDetail';
import styles from './GameDayPage.module.css';

// All full-roster entry points use the existing team-detail layout.
export function TeamRosterView({ league, team, credentials = null, onBack }: {
  league: League;
  team: Team;
  credentials?: LeagueCredentials | null;
  onBack: () => void;
}) {
  const { snapshot, isRefreshing, error, cacheWarning, refresh, polling } = useGameDay(league, credentials);
  return <>
    <div className={styles.toolbar}>
      <div role="status" aria-live="polite">
        {snapshot ? <p>Roster week {snapshot.week} · <time dateTime={new Date(snapshot.fetchedAt).toISOString()}>Updated {new Date(snapshot.fetchedAt).toLocaleString()}</time></p> : <p>{isRefreshing ? 'Loading current roster…' : 'No current roster snapshot yet.'}</p>}
      </div>
      <button className="btn btn-primary" onClick={() => void refresh()} disabled={isRefreshing} aria-busy={isRefreshing}>{isRefreshing ? 'Refreshing…' : 'Refresh rosters & scores'}</button>
    </div>
    <ProviderLink league={{ platform: league.platform, leagueId: league.id, season: league.season }} teamId={team.id} />
    <MatchupPollingNotice polling={polling} />
    {error && <p role="alert" className={styles.error}>{error} {snapshot ? 'Showing the last saved roster snapshot.' : 'Current roster data is unavailable. Season analysis is shown below.'}</p>}
    {cacheWarning && <p role="alert" className={styles.error}>The refreshed roster could not be saved in this browser.</p>}
    {league.platform === 'yahoo' && <p className={styles.hint}>Fantasy data provided by Yahoo Fantasy.</p>}
    <TeamDetail league={league} team={team} onBack={onBack} currentRoster={snapshot ? snapshot.teams.find(t => t.id === team.id) ?? null : undefined} />
  </>;
}

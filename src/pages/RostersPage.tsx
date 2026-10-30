import { LeagueLink } from '@/components/LeagueLink';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { League, LeagueCredentials } from '@/types';
import { TeamRosterView } from './TeamRosterView';
import styles from './GameDayPage.module.css';

export function RostersPage({ league, credentials }: { league: League; credentials: LeagueCredentials | null }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = params.get('team') ?? league.teams.find(t => t.isMyTeam)?.id;
  const team = league.teams.find(t => t.id === teamId) ?? league.teams[0];
  return <div className={styles.page}><div className="container">
    <div className={styles.header}>
      <h1 className={styles.title}>Rosters</h1>
      <p className={styles.subtitle}><LeagueLink league={league}>{league.name}</LeagueLink> · {league.season} · {league.platform}</p>
    </div>
    <label className={styles.selector}>Team<select className="input" value={team?.id ?? ''} onChange={event => setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('team', event.target.value);
      return next;
    })}>{league.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    {team ? <TeamRosterView league={league} team={team} credentials={credentials} onBack={() => navigate('/teams')} /> : <p className={styles.empty}>No teams were returned for this league.</p>}
  </div></div>;
}

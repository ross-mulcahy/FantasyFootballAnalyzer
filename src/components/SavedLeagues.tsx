import { useEffect, useState } from 'react';
import { loadSavedLeagues, removeSavedLeague, savedLeagueTeams, savedLeagueTeamId, selectSavedLeagueTeam, savedLeagueKey, SAVED_LEAGUES_CHANGED, type SavedLeague } from '@/utils/savedLeagues';
import { LeagueLink } from './LeagueLink';
import styles from './SavedLeagues.module.css';

interface Props {
  onConnect: (league: SavedLeague) => void;
  isLoading: boolean;
}

export function SavedLeagues({ onConnect, isLoading }: Props) {
  const [leagues, setLeagues] = useState(loadSavedLeagues);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const update = () => setLeagues(loadSavedLeagues());
    window.addEventListener('storage', update);
    window.addEventListener(SAVED_LEAGUES_CHANGED, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(SAVED_LEAGUES_CHANGED, update);
    };
  }, []);

  return (
    <section className={styles.section} aria-labelledby="my-leagues-title">
      <h3 id="my-leagues-title" className={styles.title}>My Leagues</h3>
      <p className={styles.hint}>Leagues save here after a successful connection. Stored only in this browser. Use the same local address each time.</p>
      {leagues.length === 0 ? <p className={styles.empty}>No saved leagues yet. Connect one below.</p> : (
        <ul className={styles.list}>
          {leagues.map(league => (
            <li key={savedLeagueKey(league)} className={styles.row}>
              <div className={styles.details}>
                <strong className={styles.name}><LeagueLink league={{ platform: league.platform, id: league.leagueId, season: league.season }}>{league.name}</LeagueLink></strong>
                <span className={styles.meta}>{league.platform} · {league.season}{league.teamName ? ` · ${league.teamName}` : ''}</span>
                <label className={styles.meta}>My team
                  <select aria-label={`My team in ${league.name} ${league.season}`} value={savedLeagueTeamId(league) ?? ''} disabled={isLoading || !savedLeagueTeams(league).length} onChange={event => {
                    if (!selectSavedLeagueTeam(league, event.target.value)) setNotice('Could not save your team. Check browser storage permissions.');
                  }}>
                    <option value="">Choose my team</option>
                    {savedLeagueTeams(league).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </label>
                {!savedLeagueTeams(league).length && <span className={styles.meta}>Connect to load team choices.</span>}
              </div>
              <div className={styles.actions}>
                <button type="button" className="btn" disabled={isLoading} aria-label={`Connect ${league.name} ${league.season} on ${league.platform}`} onClick={() => onConnect(league)}>Connect</button>
                <button type="button" className={styles.remove} disabled={isLoading} aria-label={`Remove ${league.name} ${league.season} on ${league.platform}`} onClick={() => {
                  setNotice(removeSavedLeague(league) ? `${league.name} removed from this browser. You can connect it again below.` : 'Could not remove this league. Check browser storage permissions.');
                }}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="status" className={styles.hint}>{notice}</p>}
    </section>
  );
}

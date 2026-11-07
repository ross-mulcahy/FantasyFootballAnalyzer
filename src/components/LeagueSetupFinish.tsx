import { useState } from 'react';
import type { League } from '@/types';
import { loadSavedLeagues, savedLeagueKey, selectSavedLeagueTeam } from '@/utils/savedLeagues';
import styles from './LeagueSetupFinish.module.css';

export function LeagueSetupFinish({ league, onAddAnother, onGoGameDay }: {
  league: League;
  onAddAnother: () => void;
  onGoGameDay: (hasTeam: boolean) => void;
}) {
  const entry = { platform: league.platform, leagueId: league.id, season: league.season, name: league.name };
  const saved = loadSavedLeagues().find(item => savedLeagueKey(item) === savedLeagueKey(entry));
  const detectedTeam = league.teams.find(team => team.isMyTeam)?.id;
  const initialTeam = league.teams.some(team => team.id === saved?.teamId) ? saved!.teamId : detectedTeam;
  const [teamId, setTeamId] = useState(initialTeam ?? '');
  const [saveError, setSaveError] = useState('');
  const teams = [...league.teams].sort((a, b) => a.name.localeCompare(b.name));
  const teamName = teams.find(team => team.id === teamId)?.name;

  return <div className={styles.finish} role="region" aria-labelledby="setup-finish-title">
    <span className={styles.channel}>SIGNAL LOCKED // {league.season}</span>
    <h3 id="setup-finish-title" className={styles.title}>{league.name} is connected</h3>
    <p className={styles.intro}>One last check before the broadcast: which team is yours? This powers your matchup, lineup alerts and rooting conflicts.</p>
    <label className={styles.teamField} htmlFor="setup-my-team">My team
      <select id="setup-my-team" className="input" value={teamId} onChange={event => {
        const next = event.target.value;
        if (selectSavedLeagueTeam(entry, next)) {
          setTeamId(next);
          setSaveError('');
        } else {
          setSaveError('Could not save your team. Check browser storage permissions and try again.');
        }
      }}>
        <option value="">Choose my team</option>
        {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </label>
    {saveError ? <p className={styles.error} role="alert">{saveError}</p> :
      <p className={styles.status} role="status">{teamName
        ? `${teamName} is set as your team. You can change this later in Settings.`
        : 'You can still watch league-wide matchups without choosing a team; personal alerts will wait.'}</p>}
    <div className={styles.actions}>
      <button type="button" className="btn" onClick={onAddAnother}>Add another league</button>
      <button type="button" className="btn btn-primary" onClick={() => onGoGameDay(!!teamId)}>{teamId ? 'Go to Game Day →' : 'Watch this league →'}</button>
    </div>
  </div>;
}

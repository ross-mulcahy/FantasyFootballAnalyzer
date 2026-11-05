import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LineupWarning } from '@/utils/gameDayInsights';
import { providerTeamUrl } from '@/utils/experience';
import { groupStudioHazards, studioAnchorTakes, type StudioMatchup, type StudioConflict } from '@/utils/studioAnchor';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { PixelScott, type AnchorState } from './PixelScott';
import styles from './StudioAnchorDesk.module.css';

export function StudioAnchorDesk({ warnings, closest, conflict, missing = 0 }: { warnings: LineupWarning[]; closest: StudioMatchup | null; conflict: StudioConflict | null; missing?: number }) {
  const mode: AnchorState = warnings.length ? 'hazard' : closest && Math.abs(closest.margin) <= 10 ? 'sweat' : 'clear';
  const [take, setTake] = useState({ mode, index: 0 });
  const index = take.mode === mode ? take.index : 0;
  const groups = groupStudioHazards(warnings);
  const takes = studioAnchorTakes(warnings, groups, closest, conflict, missing);
  const label = mode === 'hazard' ? 'HAZARD ALERT' : mode === 'sweat' ? 'WITCHING HOUR SWEAT' : missing ? 'AWAITING SIGNAL' : 'ALL CLEAR';
  return <section className={`${styles.desk} ${styles[mode]}`} aria-label="Pixel Scott studio desk">
    <div className={styles.stage}><div className={styles.stageHeader}><span>STUDIO 01</span><span className={styles.live}>LIVE</span></div><PixelScott state={mode} /><div className={styles.anchorName}>PIXEL SCOTT // REDZONE DESK</div><button className="studio-key" type="button" onClick={() => setTake({ mode, index: (index + 1) % takes.length })}>MIC CHECK // NEXT TAKE</button></div>
    <div className={styles.dialogue}><div className={styles.dialogueHeader}><span>{label}</span><small>{warnings.length ? `${warnings.length} HAZARDS // ${groups.length} ${groups.length === 1 ? 'PLAYER' : 'PLAYERS'}` : 'COMMERCIAL-FREE CHAOS'}</small></div><p className={styles.quote} role="status" aria-live="polite">{takes[index]}</p>
      {groups.length > 0 && <ul className={styles.triage} aria-label="Lineup hazards grouped by player">{groups.map(group => <li key={group.name} aria-label={`${group.name} lineup hazards`}><div className={styles.player}><strong>{group.name}</strong>{group.statuses.map(status => <span key={status} className={styles.status}>{status}</span>)}</div><span className={styles.arrow} aria-hidden="true">→</span><div className={styles.fixLinks}>{group.leagues.map(row => {
        const url = providerTeamUrl(row.league, row.teamId);
        const title = `Review ${group.name} in ${row.league.name}${row.saved ? ' · Cached roster' : ''}${row.locked ? ' · Game started; league lock rules apply' : ''}`;
        const className = styles.fixLink;
        return url ? <a key={savedLeagueKey(row.league)} href={url} target="_blank" rel="noopener noreferrer" className={className} title={title}>{row.league.name} ↗</a> : <Link key={savedLeagueKey(row.league)} to={`/teams?${new URLSearchParams({ league: `${row.league.platform}:${row.league.leagueId}`, year: String(row.league.season), team: row.teamId })}`} className={className} title={title}>{row.league.name} ↗</Link>;
      })}</div>{group.leagues.some(row => row.saved) && <span className={styles.context}>CACHED</span>}{group.leagues.some(row => row.locked) && <span className={styles.context}>LOCKED</span>}</li>)}</ul>}
      {missing > 0 && groups.length > 0 && <p className={styles.pending}>{missing} {missing === 1 ? 'league is' : 'leagues are'} still waiting for a roster or team selection.</p>}
    </div>
  </section>;
}

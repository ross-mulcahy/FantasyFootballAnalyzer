import { CrtMonitorFrame } from './CrtMonitorFrame';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LineupWarning } from '@/utils/gameDayInsights';
import { providerTeamUrl } from '@/utils/experience';
import { groupStudioHazards, studioAnchorTakes, type StudioMatchup, type StudioConflict, type StudioProjectedRecord, type StudioRivalry, type StudioExcuse } from '@/utils/studioAnchor';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { PixelScott, type AnchorState } from './PixelScott';
import { useSounds } from '@/hooks/useSounds';
import styles from './StudioAnchorDesk.module.css';

export function StudioAnchorDesk({ warnings, closest, conflict, missing = 0, record, rivalries = [], excuse = null }: { warnings: LineupWarning[]; closest: StudioMatchup | null; conflict: StudioConflict | null; missing?: number; record?: StudioProjectedRecord; rivalries?: StudioRivalry[]; excuse?: StudioExcuse | null }) {
  const { playNextTake } = useSounds();
  const mode: AnchorState = warnings.length ? 'hazard' : closest && Math.abs(closest.margin) <= 10 ? 'sweat' : 'clear';
  const groups = groupStudioHazards(warnings);
  const takes = studioAnchorTakes(warnings, groups, closest, conflict, missing, record, rivalries, excuse);
  const signature = `${mode}:${warnings.map(warning => `${warning.key}:${warning.message}`).join('|')}:${takes.map(take => take.key).join('|')}`;
  const [selection, setSelection] = useState({ signature, index: 0 });
  const [paused, setPaused] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const index = selection.signature === signature ? selection.index % takes.length : 0;
  const current = takes[index];
  const pose: AnchorState = current.mood;
  useEffect(() => {
    if (paused || takes.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setSelection({ signature, index: (index + 1) % takes.length });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [paused, signature, index, takes.length]);
  return <section className={`${styles.desk} ${styles[pose]}`} aria-label="Pixel Scott studio desk">
    <div className={styles.stage}><CrtMonitorFrame><div className={styles.stageHeader}><span>STUDIO 01</span><span className={styles.live}>LIVE</span></div><PixelScott state={pose} /></CrtMonitorFrame><div className={styles.anchorName}>PIXEL SCOTT // REDZONE DESK</div></div>
    <div className={styles.dialogue}><div className={styles.dialogueHeader}><span>{current.label}</span><small>{current.triage ? `${warnings.length} ${warnings.length === 1 ? 'HAZARD' : 'HAZARDS'} // ${groups.length} ${groups.length === 1 ? 'PLAYER' : 'PLAYERS'}` : 'COMMERCIAL-FREE CHAOS'}</small><div className={styles.dialogueActions}><button className="studio-key" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'RESUME TAKES' : 'PAUSE TAKES'}</button><button className="studio-key" type="button" onClick={() => { playNextTake(); setSelection({ signature, index: (index + 1) % takes.length }); }}>NEXT TAKE</button></div></div><p className={styles.quote} role="status" aria-live="polite">{current.text}</p>
      {current.triage && groups.length > 0 && <ul className={styles.triage} aria-label="Lineup hazards grouped by player">{groups.map(group => <li key={group.name} aria-label={`${group.name} lineup hazards`}><div className={styles.player}><strong>{group.name}</strong>{group.statuses.map(status => <span key={status} className={styles.status}>{status}</span>)}</div><span className={styles.arrow} aria-hidden="true">→</span><div className={styles.fixLinks}>{group.leagues.map(row => {
        const url = providerTeamUrl(row.league, row.teamId);
        const title = `Review ${group.name} in ${row.league.name}${row.saved ? ' · Cached roster' : ''}${row.locked ? ' · Game started; league lock rules apply' : ''}`;
        const className = styles.fixLink;
        return url ? <a key={savedLeagueKey(row.league)} href={url} target="_blank" rel="noopener noreferrer" className={className} title={title}>{row.league.name} ↗</a> : <Link key={savedLeagueKey(row.league)} to={`/teams?${new URLSearchParams({ league: `${row.league.platform}:${row.league.leagueId}`, year: String(row.league.season), team: row.teamId })}`} className={className} title={title}>{row.league.name} ↗</Link>;
      })}</div>{group.leagues.some(row => row.saved) && <span className={styles.context}>CACHED</span>}{group.leagues.some(row => row.locked) && <span className={styles.context}>LOCKED</span>}</li>)}</ul>}
      {current.triage && missing > 0 && groups.length > 0 && <p className={styles.pending}>{missing} {missing === 1 ? 'league is' : 'leagues are'} still waiting for a roster or team selection.</p>}
    </div>
  </section>;
}

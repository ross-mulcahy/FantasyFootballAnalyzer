import { useEffect, useState } from 'react';
import type { MajorEvent, NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import { buildRecap, eventImpact, finiteScore, lineupWarnings, loadRecaps, mergeRecaps, saveRecaps, type TimelineFeeds } from '@/utils/gameDayInsights';
import { savedLeagueKey } from '@/utils/savedLeagues';
import { LeagueLink } from './LeagueLink';
import { MatchupPanel } from './MatchupPanel';
import { Link } from 'react-router-dom';
import styles from '@/pages/GameDayPage.module.css';

export function EventImpactDetails({ event, contexts, data }: { event: MajorEvent; contexts: SharedLeagueContext[]; data: NFLTimeline | null }) {
  const impacts = eventImpact(event, contexts, data);
  if (!impacts.length) return <p className={styles.impactUnknown}>Game event · Individual fantasy impact unconfirmed</p>;
  const good = impacts.filter(i => i.good.length).length, bad = impacts.filter(i => i.bad.length).length;
  return <div className={styles.eventImpacts}>
    <p className={styles.impactSummary}>Likely impact{good > 0 && <span className={styles.goodImpact}> · Good for me in {good} {good === 1 ? 'league' : 'leagues'}</span>}{bad > 0 && <span className={styles.badImpact}> · Bad for me in {bad} {bad === 1 ? 'league' : 'leagues'}</span>}</p>
    <ul>{impacts.map(impact => <li key={savedLeagueKey(impact.league)}><LeagueLink league={{ platform: impact.league.platform, id: impact.league.leagueId, season: impact.league.season }}>{impact.league.name}</LeagueLink>{!!impact.good.length && <span className={styles.goodImpact}> · Helps via: {impact.good.join(', ')}</span>}{!!impact.bad.length && <span className={styles.badImpact}> · Hurts via: {impact.bad.join(', ')}</span>}</li>)}</ul>
    <p className={styles.impactUnknown}>Direction is estimated; your league’s scoring determines the points.</p>
  </div>;
}
export function LineupWarnings({ contexts, feeds, now }: { contexts: SharedLeagueContext[]; feeds: TimelineFeeds; now: number }) {
  const warnings = lineupWarnings(contexts, feeds, now);
  const missing = contexts.filter(c => !c.snapshot?.teams.find(t => t.id === c.myTeamId)?.roster).length;
  return <MatchupPanel title={`Lineup Warnings${warnings.length ? ` · ${warnings.length}` : ''}`} panelKey="home-lineup-warnings" className={`${styles.card} ${styles.insightPanel}`}>
    {!warnings.length && <p className={styles.hint}>{missing ? 'Waiting for roster data to check your starting lineups.' : 'No issues found in the available starting lineups.'}</p>}
    {!!missing && !!warnings.length && <p className={styles.hint}>{missing} leagues still need roster data or a team selection.</p>}
    <ul className={styles.warningList}>{warnings.map(warning => <li key={warning.key}><span className={styles.warningText}>{warning.message}</span><span className={styles.rowMeta}>{warning.league.name}{warning.locked ? ' · Game started; check league lock rules' : ''}{warning.saved ? ' · Saved roster; refresh before making changes' : ''}</span><Link className={styles.rosterLink} to={`/teams?${new URLSearchParams({ league: `${warning.league.platform}:${warning.league.leagueId}`, year: String(warning.league.season), team: warning.teamId })}`}>View roster →</Link></li>)}</ul>
    <p className={styles.insightNote}>Your starters only. Injury flags depend on the provider; an empty warning list does not confirm everyone is healthy.</p>
  </MatchupPanel>;
}
function useRecapHistory(contexts: SharedLeagueContext[], feeds: TimelineFeeds, now: number, record: boolean) {
  const [archive, setArchive] = useState(loadRecaps);
  const [storageFailed, setStorageFailed] = useState(false);
  const digest = JSON.stringify(buildRecap(contexts, feeds, now));
  useEffect(() => {
    if (!record) return;
    const merged = mergeRecaps(archive, JSON.parse(digest));
    if (JSON.stringify(merged) === JSON.stringify(archive)) return;
    setStorageFailed(!saveRecaps(merged)); setArchive(merged);
  }, [digest, archive, record]);
  return { archive, storageFailed };
}
export function GameDayRecapRecorder({ contexts, feeds, now }: { contexts: SharedLeagueContext[]; feeds: TimelineFeeds; now: number }) {
  const { storageFailed } = useRecapHistory(contexts, feeds, now, true);
  return storageFailed ? <p role="status" className={styles.warningText}>This browser could not save recap history.</p> : null;
}
export function GameDayRecap({ contexts, feeds, now, readOnly = false }: { contexts: SharedLeagueContext[]; feeds: TimelineFeeds; now: number; readOnly?: boolean }) {
  const { archive, storageFailed } = useRecapHistory(contexts, feeds, now, !readOnly);
  const eligible = archive.filter(row => contexts.some(context => savedLeagueKey(context.saved) === savedLeagueKey(row.league) && context.myTeamId === row.teamId));
  const weeks = [...new Set(eligible.map(row => `${row.season}:${row.week}`))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const [selection, setSelection] = useState('');
  const selected = weeks.includes(selection) ? selection : weeks[0];
  const rows = eligible.filter(row => `${row.season}:${row.week}` === selected);
  const completed = rows.filter(row => row.finished && finiteScore(row.ownPoints) && finiteScore(row.opponentPoints));
  const won = completed.filter(row => row.ownPoints! > row.opponentPoints!).length;
  const lost = completed.filter(row => row.ownPoints! < row.opponentPoints!).length;
  const tied = completed.length - won - lost;
  const closest = [...completed].sort((a, b) => Math.abs(a.ownPoints! - a.opponentPoints!) - Math.abs(b.ownPoints! - b.opponentPoints!))[0];
  return <MatchupPanel title={readOnly ? "Weekly summary" : "Game Day Recap"} panelKey="home-recap" className={`${styles.card} ${styles.insightPanel}`}>
    {weeks.length > 0 && <label className={styles.recapSelector}>Recap week<select value={selected} onChange={event => setSelection(event.target.value)}>{weeks.map(week => <option key={week} value={week}>{week.split(':')[0]} · Week {week.split(':')[1]}</option>)}</select></label>}
    {!rows.length ? <p className={styles.hint}>{readOnly ? 'Open Game Day to start saving your weekly recaps.' : 'Your recap will appear once your matchups load.'}</p> : <>
      <dl className={styles.recapStats} aria-label="Weekly results">
        {([['Wins', won], ['Losses', lost], ['Ties', tied], ['Pending', rows.length - completed.length]] as const).map(([label, value]) => <div key={label} aria-label={`${label}: ${value}`}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {closest && <p className={styles.insightNote}>Closest finish: {closest.league.name} · {Math.abs(closest.ownPoints! - closest.opponentPoints!).toFixed(2)} pts</p>}
      <ul className={styles.recapCards}>{rows.map(row => {
        const settled = row.finished && finiteScore(row.ownPoints) && finiteScore(row.opponentPoints);
        const outcome = settled ? row.ownPoints! > row.opponentPoints! ? 'Won' : row.ownPoints! < row.opponentPoints! ? 'Lost' : 'Tied' : 'Pending';
        const points = (value: number | null) => finiteScore(value) ? value.toFixed(2) : '—';
        return <li key={row.key} className={styles.recapCard} aria-label={`${row.league.name} recap`}>
          <div className={styles.recapCardHeader}><h3><LeagueLink league={{ platform: row.league.platform, id: row.league.leagueId, season: row.season }}>{row.league.name}</LeagueLink></h3><span className={outcome === 'Won' ? styles.recapWon : outcome === 'Lost' ? styles.recapLost : styles.recapPending}>{outcome}</span></div>
          <div className={styles.recapScoreboard}>
            <div><span className={styles.recapTeamLabel}>Your team</span><p className={styles.recapTeamName}>{row.ownName}</p><strong className={styles.recapOwnScore}>{points(row.ownPoints)}</strong></div>
            <div><span className={styles.recapTeamLabel}>Opponent</span><p className={styles.recapTeamName}>{row.opponentName}</p><strong>{points(row.opponentPoints)}</strong></div>
          </div>
          <dl className={styles.recapHighlights}>
            <div><dt>Top contributor</dt><dd>{row.topOwn ? <><span>{row.topOwn.name}</span><strong>{row.topOwn.points.toFixed(2)} pts</strong></> : 'Unavailable'}</dd></div>
            <div><dt>Top opponent</dt><dd>{row.topOpponent ? <><span>{row.topOpponent.name}</span><strong>{row.topOpponent.points.toFixed(2)} pts</strong></> : 'Unavailable'}</dd></div>
          </dl>
          <div className={styles.recapCardFooter}><p>{row.period} · {settled ? 'Finished lineups' : 'In progress / awaiting data'}{row.saved ? ' · Saved scores' : ''}</p>{readOnly && <p>Saved snapshot: {new Date(row.fetchedAt).toLocaleString()}</p>}</div>
        </li>;
      })}</ul>
    </>}
    {storageFailed && <p role="status" className={styles.warningText}>This browser could not save recap history. The current recap is still available.</p>}
    <p className={styles.insightNote}>Saved locally as you visit Game Day; previous weeks become available from now on. Scores can change after corrections. Multiweek rounds remain pending until their final week.</p>
  </MatchupPanel>;
}

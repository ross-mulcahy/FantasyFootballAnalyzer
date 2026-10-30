import { ProviderLink } from '@/components/ConnectionHealth';
import { LeagueLink } from '@/components/LeagueLink';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { League, LeagueCredentials } from '@/types';
import type { GameDaySnapshot, RosterTeam, ScoreMatchup } from '@/types/gameDay';
import type { NFLTimeline } from '@/api/nflTimeline';
import { useMatchupTimeline } from '@/hooks/useMatchupTimeline';
import { MatchupPanel } from '@/components/MatchupPanel';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { timelineCacheKey } from '@/api/nflTimeline';
import { BrowserAlertsButton } from '@/components/BrowserAlertsButton';
import { MatchupAlerts } from '@/components/MatchupAlerts';
import { playerGameStatus, liveStatusIsStale, lineupProgress } from '@/utils/matchupGameStatus';
import { useGameDay } from '@/hooks/useGameDay';
import { MatchupPollingNotice } from '@/components/MatchupPollingNotice';
import { MatchupTimeline } from '@/components/MatchupTimeline';
import { isStartingSlot, lineupProjection } from '@/utils/playerWeek';
import { matchupHref, matchupKey, rosterHref } from '@/utils/gameDayLinks';
import styles from './GameDayPage.module.css';

type Props = { league: League; credentials: LeagueCredentials | null };

function RosterTable({ team, week, timeline, statusStale, startersOnly = false }: { team: RosterTeam | undefined; week: number; timeline: NFLTimeline | null; statusStale: boolean; startersOnly?: boolean }) {
  if (!team || team.roster === null) return <p className={styles.empty}>This team's roster was not returned by the platform.</p>;
  const players = startersOnly
    ? team.roster.filter(p => isStartingSlot(p.slot))
    : team.roster;
  if (!players.length) return <p className={styles.empty}>{startersOnly ? 'No starting lineup was returned.' : 'This roster is empty.'}</p>;
  return <div className={styles.tableWrapper}><table className={styles.table}>
    <caption className="visually-hidden">{team.name} {startersOnly ? 'starting lineup' : 'roster'}</caption>
    <thead><tr><th scope="col">Slot</th><th scope="col">Player / Stats</th><th scope="col">W{week} pts</th><th scope="col">Proj.</th></tr></thead>
    <tbody>{players.map((p, i) => {
      const game = playerGameStatus(p.nflTeam, timeline);
      const empty = p.id === '0';
      const noGame = !empty && !!p.nflTeam && !!timeline?.games && !game;
      return <tr key={`${p.id}-${i}`} className={game?.state === 'in' && !statusStale ? styles.livePlayer : undefined}><td>{p.slot}</td><td><span>{p.name}</span>{!empty && <span className={styles.playerMeta}>{p.position || '—'} · {p.nflTeam || '—'}</span>}
      {game?.state === 'in' && <span className={statusStale ? styles.cachedBadge : styles.liveBadge} title="This player's NFL game is in progress. This does not indicate the player is on the field.">{statusStale ? 'Last seen live' : 'Game live'}{game.detail ? ` · ${game.detail}` : ''}</span>}
      {game?.state === 'post' && <span className={styles.playerMeta}>Final · {game.name}</span>}
      {game?.state === 'pre' && <span className={styles.playerMeta}>{game.detail || 'Scheduled'} · {game.name}</span>}
      {noGame && <span className={styles.byeBadge}>Bye / no game scheduled</span>}
      {!empty && !game && !noGame && <span className={styles.playerMeta}>Game status unavailable</span>}
      {empty ? <span className={styles.playerMeta}>No player selected</span> : p.stats?.length ? <details className={styles.playerStats}><summary>Week {week} stats</summary><dl>{p.stats.map((stat, statIndex) => <div key={`${stat.label}-${statIndex}`}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl></details> : noGame ? null : <span className={styles.playerMeta}>Stats not returned</span>}
    </td><td className={styles.numeric}>{typeof p.points === 'number' ? p.points.toFixed(2) : '—'}</td><td className={styles.numeric}>{typeof p.projection === 'number' ? p.projection.toFixed(2) : '—'}</td></tr>;
    })}</tbody>
  </table></div>;
}

export function GameDayPage(props: Props) {
  return <GameDayView {...props} />;
}

function GameDayView({ league, credentials }: Props) {
  const { snapshot, isRefreshing, error, cacheWarning, refresh, polling } = useGameDay(league, credentials);
  const [searchParams] = useSearchParams();
  const selectedMatchup = searchParams.get('matchup');
  const matchup = snapshot?.matchups.find(m => matchupKey(m) === selectedMatchup);
  const nflTeams = [...new Set(snapshot?.teams.filter(t => matchup && [matchup.team1Id, matchup.team2Id].includes(t.id))
    .flatMap(t => t.roster?.filter(p => isStartingSlot(p.slot)).map(p => p.nflTeam).filter(Boolean) ?? []) ?? [])];
  const events = useMatchupTimeline(snapshot?.season ?? league.season, snapshot?.week ?? 0, nflTeams, snapshot?.fetchedAt ?? 0);
  const notifications = useEventNotifications(timelineCacheKey(snapshot?.season ?? league.season, snapshot?.week ?? 0, nflTeams), matchup ? events.data : null, events.loading);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const stale = snapshot ? now - snapshot.fetchedAt > 15 * 60000 : false;
  const score = (points: number | null) => points === null ? '—' : points.toFixed(2);
  const teamName = (id: string | null) => id === null ? 'No opponent listed' : snapshot?.teams.find(t => t.id === id)?.name || `Team ${id}`;

  return (
    <div className={styles.page}><div className="container">
      <div className={styles.header}>
        {selectedMatchup && <Link to="/game-day" className={styles.backLink}>← All matchups</Link>}
        <h1 className={styles.title}>{selectedMatchup ? 'Matchup' : 'Game Day'}</h1>
        <p className={styles.subtitle}><LeagueLink league={league}>{league.name}</LeagueLink> · {league.season} · {league.platform}</p>
      </div>
      <div className={styles.toolbar}>
        <div role="status" aria-live="polite">
          {snapshot ? <><p>Week {snapshot.week} · <time dateTime={new Date(snapshot.fetchedAt).toISOString()}>Updated {new Date(snapshot.fetchedAt).toLocaleString()}</time></p>
            <p className={styles.hint}>{stale ? 'This snapshot is over 15 minutes old. ' : ''}Refresh for the latest rosters and scores.</p></> : <p>{isRefreshing ? 'Loading rosters and matchups…' : 'No saved roster or matchup data yet.'}</p>}
        </div>
        <div className={styles.toolbarActions}>
        <button className="btn btn-primary" onClick={() => { void refresh(); events.refresh(); }} disabled={isRefreshing} aria-busy={isRefreshing}>{isRefreshing ? 'Refreshing…' : 'Refresh rosters & scores'}</button>
        {matchup && <BrowserAlertsButton notifications={notifications} />}
        </div>
      </div>
      {matchup && notifications.problem && <p className={styles.hint} role="alert">{notifications.problem}</p>}
      <MatchupPollingNotice polling={polling} />
      {error && <p className={styles.error} role="alert">{error} {snapshot ? 'Showing the last saved snapshot.' : 'Check your connection or reconnect your league, then try again.'}</p>}
      {cacheWarning && <p role="alert" className={styles.error}>Updated on screen, but browser storage is full or unavailable. This snapshot could not be saved for your next visit.</p>}
      {league.platform === 'yahoo' && <p className={styles.hint}>Fantasy data provided by Yahoo Fantasy.</p>}
      {snapshot && !selectedMatchup && <MatchupPanel title="Matchups" panelKey="matchups" headingId="matchups-heading" className={`${styles.card} ${styles.section}`}>
        <div className={styles.grid}>
          {snapshot.matchups.map((m, index) => <Link className={`${styles.card} ${styles.matchupLink}`} to={matchupHref(m)} key={`${m.id}-${index}`} aria-label={`View matchup: ${teamName(m.team1Id)} vs ${teamName(m.team2Id)}`}>
            <p className={styles.period}>{m.period}</p>
            <div className={styles.scoreRow}><span className={styles.teamName}>{teamName(m.team1Id)}</span><strong>{score(m.team1Points)}</strong></div>
            <div className={styles.scoreRow}><span className={styles.teamName}>{teamName(m.team2Id)}</span><strong>{score(m.team2Points)}</strong></div>
            <span className={styles.openMatchup}>View matchup →</span>
          </Link>)}
        </div>
        {!snapshot.matchups.length && <p className={styles.empty}>No matchups were returned for this period. <Link to="/rosters">View rosters</Link>.</p>}
      </MatchupPanel>}
      {snapshot?.detailWarnings?.map(warning => <p key={warning} role="status" className={styles.hint}>{warning}</p>)}
      {snapshot && selectedMatchup && (matchup ? <MatchupDetail snapshot={snapshot} matchup={matchup} league={league} now={now} events={events} /> : <p className={styles.empty}>This matchup is not in the current snapshot. <Link to="/game-day">Back to all matchups</Link>.</p>)}
    </div></div>
  );
}


function MatchupDetail({ snapshot, matchup, league, now, events }: { snapshot: GameDaySnapshot; matchup: ScoreMatchup; league: League; now: number; events: ReturnType<typeof useMatchupTimeline> }) {
  const nflTeams = [...new Set(snapshot.teams.filter(t => [matchup.team1Id, matchup.team2Id].includes(t.id))
    .flatMap(t => t.roster?.filter(p => isStartingSlot(p.slot)).map(p => p.nflTeam).filter(Boolean) ?? []))];
  const statusStale = liveStatusIsStale(events.data, events.error, now);
  const score = (points: number | null) => points === null ? '—' : points.toFixed(2);
  const teamName = (id: string | null) => id === null ? 'No opponent listed' : snapshot.teams.find(t => t.id === id)?.name || `Team ${id}`;
  const sides = [{ id: matchup.team1Id, points: matchup.team1Points, projection: matchup.team1Projection }, { id: matchup.team2Id, points: matchup.team2Points, projection: matchup.team2Projection }];
  return <section className={styles.section} aria-label="Matchup details">
    <MatchupPanel title="Matchup score" panelKey="score" className={`${styles.card} ${styles.scorePanel}`}>
      <p className={styles.period}>{matchup.period}</p>
      <div className={styles.scoreboard}>{sides.map((side, index) => {
        const team = snapshot.teams.find(t => t.id === side.id);
        const projection = typeof side.projection === 'number' && Number.isFinite(side.projection) ? side.projection : lineupProjection(team);
        const progress = lineupProgress(team, events.data);
        return <div key={index} className={styles.scoreSide}>
        <span className={styles.teamName}>{teamName(side.id)}</span>
        <strong>{score(side.points)}</strong>
        <p className={styles.period}>Projection <span className={styles.projectionValue}>{score(projection)}</span></p>
        {progress ? <>
          <dl className={styles.playerCounts} aria-label={`${teamName(side.id)} player progress`}>
            <div><dt>Played</dt><dd>{progress.played}</dd></div>
            <div className={progress.inPlay && !statusStale ? styles.inPlayCount : undefined}><dt>In play</dt><dd>{progress.inPlay}</dd></div>
            <div><dt>Still to play</dt><dd>{progress.toPlay}</dd></div>
          </dl>
          {!!progress.unscheduled && <p className={styles.hint}>{progress.unscheduled} on bye / no game scheduled</p>}
          {!!progress.unknown && <p className={styles.hint}>{progress.unknown} with game status unavailable</p>}
        </> : <p className={styles.hint}>Player progress unavailable</p>}
      </div>; })}</div>
    </MatchupPanel>
    <MatchupAlerts data={events.data} loading={events.loading} error={events.error} now={now} />
    <div className={styles.detailGrid}>
      {sides.map((side, index) => <MatchupPanel title={side.id === null ? 'Opponent lineup' : `${teamName(side.id)} lineup`} panelKey={`lineup-${index + 1}`} key={side.id ?? `unpaired-${index}`}>
        {side.id !== null ? <>
          <p className={styles.hint}>Starting lineup · Current-week player stats</p>
          <p className={styles.period}>Week {snapshot.week} lineup projection: {score(lineupProjection(snapshot.teams.find(t => t.id === side.id)))}</p>
          <RosterTable team={snapshot.teams.find(t => t.id === side.id)} week={snapshot.week} timeline={events.data} statusStale={statusStale} startersOnly />
          <Link className={styles.rosterLink} to={rosterHref(side.id, league)}>View full roster →</Link><ProviderLink league={{ platform: league.platform, leagueId: league.id, season: league.season }} teamId={side.id} />
        </> : <p className={styles.hint}>No opposing team was listed by the platform.</p>}
      </MatchupPanel>)}
    </div>
    <p className={styles.hint}>Player scores and stats cover week {snapshot.week} only. Team matchup totals above can cover multiple weeks or include commissioner adjustments. A dash means data was not returned.</p>
    <p className={styles.hint}>{snapshot.projectionNote ?? 'Player projections are weekly estimates, not live finish predictions. Lineup projections sum available starter projections only when every starter has one.'}</p>
    {snapshot.detailVersion === 1 ? <MatchupTimeline week={snapshot.week} {...events} canRefresh={nflTeams.length > 0} /> : <p className={styles.hint}>Refresh rosters & scores to load current-week player details and the event timeline.</p>}
  </section>;
}

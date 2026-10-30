import { ConnectionHealthBar, ProviderLink } from '@/components/ConnectionHealth';
import { useExperiencePreferences, prioritizeEvents, reconnectHref } from '@/utils/experience';
import { useKickoffReminders } from '@/hooks/useKickoffReminders';
import { EventImpactDetails, GameDayRecapRecorder, LineupWarnings } from '@/components/GameDayInsights';
import { matchupMargin, myMatchups } from '@/utils/gameDayInsights';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NFLTimeline } from '@/api/nflTimeline';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { lineupProjection } from '@/utils/playerWeek';
import { lineupProgress, liveStatusIsStale } from '@/utils/matchupGameStatus';
import type { GameDaySnapshot } from '@/types/gameDay';
import { MatchupAlerts } from '@/components/MatchupAlerts';
import { MatchupTimeline } from '@/components/MatchupTimeline';
import { SharedPlayersSidebar } from '@/components/SharedPlayersSidebar';
import type { League } from '@/types';
import { GameDayContext, useGameDayState } from '@/hooks/useGameDay';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { loadCachedLeague } from '@/utils/leagueCache';
import { savedLeagueKey, type SavedLeague } from '@/utils/savedLeagues';
import { LeagueLink } from '@/components/LeagueLink';
import { leagueGameDayHref, matchupKey } from '@/utils/gameDayLinks';
import styles from './GameDayPage.module.css';

type LeagueUpdate = { snapshot: GameDaySnapshot | null; myTeamId?: string; error: string | null; updatedAt: number | null; refreshing: boolean; refresh: () => Promise<void> };
type ReportUpdate = (key: string, update: LeagueUpdate | null) => void;

function LeagueMatchups({ saved, currentLeague, onUpdate, timelines, focus, closeOnly }: { saved: SavedLeague; currentLeague: League | null; focus: 'league' | 'projected' | 'current'; closeOnly: boolean; onUpdate: ReportUpdate; timelines: Record<string, { data: NFLTimeline | null; error: string | null }> }) {
  const shared = useContext(GameDayContext);
  const current = currentLeague?.platform === saved.platform && currentLeague.id === saved.leagueId && currentLeague.season === saved.season;
  const metadata = useMemo(() => loadCachedLeague(saved.platform, saved.leagueId, saved.season) ?? {
    id: saved.leagueId, platform: saved.platform, season: saved.season, name: saved.name,
    teams: [], draftType: 'snake', scoringType: 'ppr', totalTeams: 0, isLoaded: true,
  } as League, [saved.platform, saved.leagueId, saved.season, saved.name]);
  const local = useGameDayState(metadata, null, { enabled: !(current && shared), poll: true });
  const { snapshot, error, isRefreshing, refresh } = current && shared ? shared : local;
  const key = savedLeagueKey(saved);
  const updatedAt = snapshot?.fetchedAt ?? null;
  const identified = (current ? currentLeague : metadata)?.teams.find(team => team.isMyTeam)?.id;
  const myTeam = saved.teamId ?? identified ?? snapshot?.teams.find(team => saved.teamName && team.name === saved.teamName)?.id;
  useEffect(() => { onUpdate(key, { snapshot, myTeamId: myTeam, error, updatedAt, refreshing: isRefreshing, refresh }); }, [key, snapshot, myTeam, error, updatedAt, isRefreshing, refresh, onUpdate]);
  useEffect(() => () => onUpdate(key, null), [key, onUpdate]);
  const matches = myTeam ? snapshot?.matchups.filter(match => [match.team1Id, match.team2Id].includes(myTeam)) ?? [] : [];
  const name = (id: string | null) => snapshot?.teams.find(team => team.id === id)?.name ?? (id === null ? 'No opponent listed' : `Team ${id}`);
  const score = (points: number | null) => points === null ? '—' : points.toFixed(2);
  const context = { saved, snapshot, myTeamId: myTeam, error };
  const data = timelines[`${snapshot?.season}:${snapshot?.week}`]?.data ?? null;
  const margin = (match: typeof matches[number]) => matchupMargin(context, match, focus === 'current' ? 'current' : 'projected', data);
  const shown = matches.filter(match => !closeOnly || (margin(match) !== null && Math.abs(margin(match)!) <= 10)).sort((a, b) => focus === 'league' ? 0 : (Math.abs(margin(a) ?? Infinity) - Math.abs(margin(b) ?? Infinity)));
  if (closeOnly && snapshot && myTeam && !shown.length) return null;
  return <section className={styles.matchRow} aria-label={`${saved.name} matchups`}>
    <div className={styles.matchRowHeader}><h3><LeagueLink league={{ platform: saved.platform, id: saved.leagueId, season: saved.season }}>{saved.name}</LeagueLink></h3><span>{saved.platform}{snapshot ? ` · Week ${snapshot.week}` : ''}</span></div>
    {error && <p className={styles.hint} role="status">{snapshot ? 'Showing saved scores. ' : ''}Could not refresh this league. <Link to={reconnectHref(saved)}>Reconnect in Settings</Link>.</p>}
    {!snapshot && !error && <p className={styles.hint}>Loading matchups…</p>}
    {snapshot && !myTeam && <p className={styles.hint}><Link to="/settings">Choose your team in Settings</Link> to show its matchup.</p>}
    {shown.map(match => {
      const mineFirst = match.team1Id === myTeam;
      const own = { id: myTeam!, points: mineFirst ? match.team1Points : match.team2Points, projection: mineFirst ? match.team1Projection : match.team2Projection };
      const opponent = { id: mineFirst ? match.team2Id : match.team1Id, points: mineFirst ? match.team2Points : match.team1Points, projection: mineFirst ? match.team2Projection : match.team1Projection };
      const timeline = timelines[`${snapshot!.season}:${snapshot!.week}`];
      const stale = liveStatusIsStale(timeline?.data ?? null, timeline?.error ?? null, Date.now());
      const teamInfo = (side: typeof opponent, yours: boolean) => {
        const team = snapshot?.teams.find(team => team.id === side.id);
        const projection = typeof side.projection === 'number' ? side.projection : lineupProjection(team);
        const progress = lineupProgress(team, timeline?.data ?? null);
        return <div className={yours ? styles.ownTeam : styles.opponentTeam}>
          <span className={styles.teamRole}>{yours ? 'Your team' : 'Opponent'}</span>
          <span className={styles.rowTeamName}>{name(side.id)}</span>
          {side.id !== null && <span className={styles.rowMeta}>Proj. {score(projection)}</span>}
          {side.id !== null && <span className={styles.rowMeta}>{progress && !progress.unknown ? <>{progress.toPlay} to play{!stale && progress.inPlay > 0 && <span className={styles.rowLive}> · {progress.inPlay} live</span>}{progress.unscheduled > 0 && ` · ${progress.unscheduled} bye`}</> : 'Game status pending'}</span>}
        </div>;
      };
      const difference = margin(match);
      return <div key={matchupKey(match)}><Link to={leagueGameDayHref({ platform: saved.platform, id: saved.leagueId, season: saved.season })} className={styles.compactMatchup} aria-label={`View matchup: ${name(own.id)} vs ${name(opponent.id)}`}>
        {teamInfo(own, true)}
        <div className={styles.rowScores}><strong>{score(own.points)}</strong><span aria-hidden="true">:</span><strong>{score(opponent.points)}</strong></div>
        {teamInfo(opponent, false)}
      </Link>{difference !== null && Math.abs(difference) <= 10 && <p className={styles.closeBadge}>Close matchup · {Math.abs(difference).toFixed(2)} pts {focus === 'current' ? 'current' : 'projected'} margin{focus !== 'current' ? ' · Weekly estimate' : ''}</p>}<ProviderLink league={saved} teamId={myTeam} /></div>;
    })}
    {snapshot && myTeam && !matches.length && <p className={styles.hint}>No matchup scheduled for your team this week.</p>}
    {saved.platform === 'yahoo' && <p className={styles.hint}>Fantasy data provided by Yahoo Fantasy.</p>}
  </section>;
}

export function MyGameDayPage({ currentLeague = null }: { currentLeague?: League | null }) {
  const saved = useSavedLeagues();
  const mobile = useMediaQuery('(max-width: 1100px)');
  const [view, setView] = useState<'matchups' | 'players'>('matchups');
  const [focus, setFocus] = useState<'league' | 'projected' | 'current'>('league');
  const [closeOnly, setCloseOnly] = useState(false);
  const [sharedCount, setSharedCount] = useState(0);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [timelines, setTimelines] = useState<Record<string, { data: NFLTimeline | null; error: string | null; loading: boolean }>>({});
  const onTimeline = useCallback((key: string, data: NFLTimeline | null, error: string | null, loading: boolean) => {
    setTimelines(previous => previous[key]?.data === data && previous[key]?.error === error && previous[key]?.loading === loading ? previous : { ...previous, [key]: { data, error, loading } });
  }, []);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const seasons = [...new Set(saved.map(league => league.season))].sort((a, b) => b - a);
  const [chosenSeason, setChosenSeason] = useState<number | null>(null);
  const season = chosenSeason !== null && seasons.includes(chosenSeason) ? chosenSeason : seasons[0];
  const leagues = saved.filter(league => league.season === season);
  const [updates, setUpdates] = useState<Record<string, LeagueUpdate>>({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const busy = useRef(false);
  const [eventRefreshSignal, setEventRefreshSignal] = useState(0);
  const onUpdate = useCallback<ReportUpdate>((key, update) => {
    setUpdates(previous => {
      const old = previous[key];
      if (update && old?.updatedAt === update.updatedAt && old.refreshing === update.refreshing && old.refresh === update.refresh && old.myTeamId === update.myTeamId && old.error === update.error) return previous;
      if (!update && !old) return previous;
      const next = { ...previous };
      if (update) next[key] = update; else delete next[key];
      return next;
    });
  }, []);
  const visible = leagues.map(league => updates[savedLeagueKey(league)]);
  const ready = visible.length > 0 && visible.every(Boolean);
  const refreshing = refreshingAll || visible.some(update => update?.refreshing);
  // The oldest visible snapshot is the time through which every league is current.
  // A failed league therefore cannot make the combined timestamp look newer.
  const updatedAt = ready && visible.every(update => update.updatedAt !== null)
    ? Math.min(...visible.map(update => update.updatedAt!)) : null;
  const refreshAll = async () => {
    if (busy.current || !ready || refreshing) return;
    busy.current = true; setRefreshingAll(true); setEventRefreshSignal(value => value + 1);
    try { await Promise.allSettled(visible.map(update => Promise.resolve().then(() => update.refresh()))); }
    finally { busy.current = false; setRefreshingAll(false); }
  };

  const weeks = [...new Set(visible.flatMap(update => update?.snapshot ? [update.snapshot.week] : []))];
  const contexts: SharedLeagueContext[] = leagues.map(saved => ({ saved, snapshot: updates[savedLeagueKey(saved)]?.snapshot ?? null, myTeamId: updates[savedLeagueKey(saved)]?.myTeamId, error: updates[savedLeagueKey(saved)]?.error }));
  const bestMargin = (saved: SavedLeague) => {
    const context = contexts.find(context => savedLeagueKey(context.saved) === savedLeagueKey(saved))!;
    return Math.min(Infinity, ...myMatchups(context).map(match => Math.abs(matchupMargin(context, match, focus === 'current' ? 'current' : 'projected', timelines[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null) ?? Infinity)));
  };
  const sortedLeagues = [...leagues].sort((a, b) => focus === 'league' ? 0 : bestMargin(a) - bestMargin(b));
  const qualifying = contexts.reduce((count, context) => count + myMatchups(context).filter(match => {
    const value = matchupMargin(context, match, focus === 'current' ? 'current' : 'projected', timelines[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null);
    return value !== null && Math.abs(value) <= 10;
  }).length, 0);

  const experience = useExperiencePreferences();
  const refreshLeague = useCallback(async (key: string) => { setEventRefreshSignal(value => value + 1); await updates[key]?.refresh(); }, [updates]);
  const kickoff = useKickoffReminders(contexts, timelines, now, refreshLeague);
  return <div className={`${styles.page} ${styles.dashboardPage}`}><div className="container">
    <div className={styles.dashboardHeader}>
      <div className={styles.dashboardHeading}><h1>Game Day</h1><p>{weeks.length ? `${weeks.length === 1 ? 'Week' : 'Weeks'} ${weeks.join(' / ')} · ` : ''}{leagues.length} {leagues.length === 1 ? 'league' : 'leagues'}</p></div>
      <div className={styles.dashboardTools}>
        {!!leagues.length && <p role="status">{updatedAt !== null ? <>Last updated <time title={`Oldest league update: ${new Date(updatedAt).toLocaleString()}`} dateTime={new Date(updatedAt).toISOString()}>{new Date(updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></> : 'Waiting for league updates'}</p>}
        {!!leagues.length && <button className="btn btn-primary" onClick={() => void refreshAll()} disabled={!ready || refreshing} aria-busy={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh all'}</button>}
      </div>
    </div>
    {!!leagues.length && <ConnectionHealthBar contexts={contexts} />}
    {!!kickoff.checks.length && <p className={styles.period}>Kickoff within 15 minutes · Review your lineup warnings before games start.</p>}
    {kickoff.problem && <p role="status" className={styles.warningText}>{kickoff.problem}</p>}
    {seasons.length > 1 && <label className={styles.selector}>Season<select value={season} onChange={event => setChosenSeason(Number(event.target.value))}>{seasons.map(year => <option key={year} value={year}>{year}</option>)}</select></label>}
    {mobile && !!leagues.length && <div className={styles.mobileTabs} role="tablist" aria-label="Game Day views">
      {(['matchups', 'players'] as const).map((tab, index) => <button key={tab} id={`${tab}-tab`} type="button" role="tab" aria-selected={view === tab} aria-controls={`${tab}-panel`} tabIndex={view === tab ? 0 : -1} ref={element => { tabRefs.current[tab] = element; }} onClick={() => setView(tab)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'matchups' : event.key === 'End' ? 'players' : index === 0 ? 'players' : 'matchups';
        setView(next); tabRefs.current[next]?.focus();
      }}>{tab === 'matchups' ? 'Matchups' : `Shared Players (${sharedCount})`}</button>)}
    </div>}
    {!leagues.length ? <div className={styles.empty}><p>No leagues connected yet.</p><Link className="btn btn-primary" to="/settings">Connect leagues in Settings</Link></div>
      : <div className={styles.homeLayout}>
        <aside id="players-panel" role={mobile ? 'tabpanel' : undefined} hidden={mobile && view !== 'players'} className={styles.sharedSidebar} aria-labelledby={mobile ? 'players-tab' : 'shared-players-heading'}><SharedPlayersSidebar onCountChange={setSharedCount} onTimeline={onTimeline} refreshSignal={eventRefreshSignal} contexts={contexts} /></aside>
        <div id="matchups-panel" role={mobile ? 'tabpanel' : undefined} hidden={mobile && view !== 'matchups'} aria-labelledby={mobile ? 'matchups-tab' : 'your-matchups-heading'} className={styles.matchupsColumn}><section className={styles.matchupsPanel}><h2 id="your-matchups-heading">Your Matchups</h2><div className={styles.focusToolbar}><label>Sort matchups<select value={focus} onChange={event => setFocus(event.target.value as typeof focus)}><option value="league">League order</option><option value="projected">Closest projected margin</option><option value="current">Closest current margin</option></select></label><label className={styles.closeFilter}><input type="checkbox" checked={closeOnly} onChange={event => setCloseOnly(event.target.checked)} />Only close (≤10 pts)</label></div>{closeOnly && !qualifying && <p className={styles.empty}>No close matchups with available {focus === 'current' ? 'current' : 'weekly projected'} margins.</p>}<div className={styles.homeGrid}>{sortedLeagues.map(league => <LeagueMatchups focus={focus} closeOnly={closeOnly} key={savedLeagueKey(league)} saved={league} currentLeague={currentLeague} onUpdate={onUpdate} timelines={timelines} />)}</div></section>
          {Object.entries(timelines).filter(([key]) => key.startsWith(`${season}:`) && weeks.includes(Number(key.split(':')[1]))).map(([key, feed]) => <div key={key} className={styles.combinedEvents}><MatchupAlerts data={feed.data} error={feed.error} loading={feed.loading} now={now} rankEvents={events => prioritizeEvents(events, experience.alertPriority, contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key), feed.data, now)} renderImpact={event => <EventImpactDetails event={event} contexts={contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key)} data={feed.data} />} idPrefix={`home-${key}-`} /></div>)}
          <LineupWarnings contexts={contexts} feeds={timelines} now={now} />
          {Object.entries(timelines).filter(([key]) => key.startsWith(`${season}:`) && weeks.includes(Number(key.split(':')[1]))).map(([key, feed]) => <div key={key} className={styles.combinedEvents}>
            <MatchupTimeline week={Number(key.split(':')[1])} data={feed.data} error={feed.error} loading={feed.loading} refresh={() => setEventRefreshSignal(value => value + 1)} canRefresh={true} renderImpact={event => <EventImpactDetails event={event} contexts={contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key)} data={feed.data} />} idPrefix={`home-${key}-`} />
          </div>)}
          <GameDayRecapRecorder contexts={contexts} feeds={timelines} now={now} />
        </div></div>}
  </div></div>;
}

import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { StudioAnchorDesk } from '@/components/StudioAnchorDesk';
import type { StudioConflict, StudioMatchup } from '@/utils/studioAnchor';
import { CortisolMeter } from '@/components/CortisolMeter';
import { MatchupPresser } from '@/components/MatchupPresser';
import { WorkspaceControls } from '@/components/WorkspaceControls';
import { ProjectionBar } from '@/components/ProjectionBar';
import { ProviderLink } from '@/components/ConnectionHealth';
import { TacticalLoading } from '@/components/TacticalLoading';
import { useExperiencePreferences, prioritizeEvents, reconnectHref } from '@/utils/experience';
import { useKickoffReminders } from '@/hooks/useKickoffReminders';
import { EventImpactDetails, GameDayRecapRecorder } from '@/components/GameDayInsights';
import { lineupWarnings, matchupSides, matchupMargin, myMatchups } from '@/utils/gameDayInsights';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { NFLTimeline } from '@/api/nflTimeline';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { lineupProjection, lineupProjectionCoverage } from '@/utils/playerWeek';
import { lineupProgress, liveStatusIsStale } from '@/utils/matchupGameStatus';
import type { GameDaySnapshot, ScoreMatchup } from '@/types/gameDay';
import { MatchupAlerts } from '@/components/MatchupAlerts';
import { MatchupTimeline } from '@/components/MatchupTimeline';
import { SharedPlayersSidebar } from '@/components/SharedPlayersSidebar';
import type { League } from '@/types';
import { GameDayContext, useGameDayState } from '@/hooks/useGameDay';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { loadCachedLeague } from '@/utils/leagueCache';
import { savedLeagueKey, type SavedLeague } from '@/utils/savedLeagues';
import { LeagueLink } from '@/components/LeagueLink';
import { leagueGameDayHref, matchupKey, studioWallName } from '@/utils/gameDayLinks';
import { StudioAudioEvents } from '@/utils/studioAudioEvents';
import { captureScoreTape, comebackWatch, currentScoreChanges, directorCue, loadScoreTape, saveScoreTape, scoreCueKind, studioShow } from '@/utils/broadcastControl';
import { DirectorCueBar, StudioBroadcastDesk, type CuePreferences } from '@/components/StudioBroadcastDesk';
import { safeLocalStorage } from '@/utils/safeStorage';
import { useSounds } from '@/hooks/useSounds';
import styles from './GameDayPage.module.css';

type LeagueUpdate = { snapshot: GameDaySnapshot | null; myTeamId?: string; error: string | null; updatedAt: number | null; refreshing: boolean; refresh: () => Promise<void> };
type ReportUpdate = (key: string, update: LeagueUpdate | null) => void;
const wallMatchups = (context: SharedLeagueContext, allMatchups: boolean) => allMatchups ? context.snapshot?.matchups ?? [] : myMatchups(context);
const wallContext = (context: SharedLeagueContext, match: ScoreMatchup): SharedLeagueContext => ({ ...context, myTeamId: context.myTeamId && [match.team1Id, match.team2Id].includes(context.myTeamId) ? context.myTeamId : match.team1Id });

function LeagueMatchups({ saved, currentLeague, onUpdate, timelines, focus, closeOnly, channel, allMatchups, cueLeagueKey }: { channel: number; saved: SavedLeague; currentLeague: League | null; focus: 'league' | 'projected' | 'current'; closeOnly: boolean; allMatchups: boolean; cueLeagueKey: string | null; onUpdate: ReportUpdate; timelines: Record<string, { data: NFLTimeline | null; error: string | null }> }) {
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
  const context = { saved, snapshot, myTeamId: myTeam, error };
  const matches = wallMatchups(context, allMatchups);
  const name = (id: string | null) => snapshot?.teams.find(team => team.id === id)?.name ?? (id === null ? 'No opponent listed' : `Team ${id}`);
  const score = (points: number | null) => points === null ? '—' : points.toFixed(2);
  const data = timelines[`${snapshot?.season}:${snapshot?.week}`]?.data ?? null;
  const margin = (match: typeof matches[number]) => matchupMargin(wallContext(context, match), match, focus === 'current' ? 'current' : 'projected', data);
  const shown = matches.filter(match => !closeOnly || (margin(match) !== null && Math.abs(margin(match)!) <= 10)).sort((a, b) => focus === 'league' ? 0 : (Math.abs(margin(a) ?? Infinity) - Math.abs(margin(b) ?? Infinity)));
  if (closeOnly && snapshot && !shown.length) return null;
  return <section id={`studio-channel-${key}`} className={`${styles.matchRow} ${cueLeagueKey === key ? styles.directorFocus : ''}`} aria-label={`${saved.name} matchups`}>
    {!shown.length && <div className={styles.channelBezel}><h3>CH {String(channel).padStart(2, '0')} // {saved.name}</h3><span className={styles.studioLine}>NO SIGNAL</span></div>}

    {error && <p className={styles.hint} role="status">{snapshot ? 'Showing saved scores. ' : ''}Could not refresh this league. <Link to={reconnectHref(saved)}>Reconnect in Settings</Link>.</p>}
    {!snapshot && !error && <p className={styles.hint}><TacticalLoading /></p>}
    {snapshot && !myTeam && <p className={styles.hint}><Link to="/settings">Choose your team in Settings</Link> to {allMatchups ? 'enable your lineup alerts and rooting conflicts.' : 'show its matchup.'}</p>}
    {shown.map((match, index) => {
      const featured = !!myTeam && [match.team1Id, match.team2Id].includes(myTeam);
      const displayContext = wallContext(context, match);
      const mineFirst = match.team1Id === displayContext.myTeamId;
      const own = { id: displayContext.myTeamId ?? null, points: mineFirst ? match.team1Points : match.team2Points, projection: mineFirst ? match.team1Projection : match.team2Projection };
      const opponent = { id: mineFirst ? match.team2Id : match.team1Id, points: mineFirst ? match.team2Points : match.team1Points, projection: mineFirst ? match.team2Projection : match.team1Projection };
      const timeline = timelines[`${snapshot!.season}:${snapshot!.week}`];
      const stale = liveStatusIsStale(timeline?.data ?? null, timeline?.error ?? null, Date.now());
      const telemetry = (side: typeof opponent) => {
        const team = snapshot?.teams.find(team => team.id === side.id);
        const projection = typeof side.projection === 'number' ? side.projection : lineupProjection(team);
        const coverage = projection === null ? lineupProjectionCoverage(team) : null;
        const progress = lineupProgress(team, timeline?.data ?? null);
        return <span title={coverage?.missing ? `${coverage.missing} starters have no provider projection; displayed sum is partial` : undefined}>Proj. {projection !== null ? score(projection) : coverage?.known ? `${score(coverage.total)} partial` : 'pending'}{progress && !progress.unknown && <> · {progress.toPlay} left{!stale && progress.inPlay > 0 && <span className={styles.rowLive}> · {progress.inPlay} live</span>}{progress.unscheduled > 0 && ` · ${progress.unscheduled} bye`}</>}</span>;
      };
      const teamInfo = (side: typeof opponent, first: boolean) => <div className={first ? styles.ownTeam : styles.opponentTeam}><div className={styles.zoneIdentity}><span className={styles.teamRole}>{featured ? first ? 'Your team' : 'Opponent' : first ? 'Team 1' : 'Team 2'}</span><span className={styles.rowTeamName} title={name(side.id)}>{name(side.id)}</span><div className={styles.zoneProjection}>{telemetry(side)}</div></div><strong className={styles.zoneScore}>{score(side.points)}</strong>{first && <span className={styles.splitVs}>VS</span>}</div>;
      const difference = matchupMargin(displayContext, match, 'projected', data);
      const sweat = difference !== null && Math.abs(difference) <= 10;
      const sides = matchupSides(displayContext, match);
      const hazards = featured ? lineupWarnings([context], { [`${snapshot?.season}:${snapshot?.week}`]: timeline ?? { data: null, error: null } }, Date.now()) : [];
      const byes = hazards.filter(w => /Bye/i.test(w.message)).length;
      const outs = hazards.filter(w => /Out|IR|Injured reserve|Inactive/i.test(w.message)).length;
      return <article className={`${styles.monitorBay} ${sweat ? styles.sweat : ''}`} key={matchupKey(match)}><StudioMonitorFrame>
        <div className={styles.channelBezel}><i className={`${styles.channelLed} ${hazards.length ? styles.hazardLed : sweat ? styles.sweatLed : ''}`} aria-hidden="true" /><h3><LeagueLink league={{ platform: saved.platform, id: saved.leagueId, season: saved.season }}><span className={styles.channelBadge}>CH {String(channel + index).padStart(2, '0')}</span> {saved.name}</LeagueLink></h3><span className={styles.studioLine} title="Projection-derived studio line. Entertainment, not sportsbook odds.">{difference === null ? 'LINE: OFF' : Math.abs(difference) < 1 ? 'TOSS-UP' : `LINE: ${-difference > 0 ? '+' : ''}${(-difference).toFixed(1)}`}</span></div>
        <div className={styles.monitorStatus}><span>{saved.platform.toUpperCase()} // WEEK {snapshot?.week ?? '—'}</span>{sweat && <b>WITCHING HOUR SWEAT</b>}</div>
        <Link to={leagueGameDayHref({ platform: saved.platform, id: saved.leagueId, season: saved.season })} className={styles.monitorCanvas} aria-label={`View matchup: ${name(own.id)} vs ${name(opponent.id)}`}>
          {teamInfo(own, true)}{teamInfo(opponent, false)}
        </Link><div className={styles.splitTelemetry}><div className={styles.hazardTags}>{byes > 0 && <span>{byes} ON BYE</span>}{outs > 0 && <span>{outs} OUT / IR</span>}{hazards.length > byes + outs && <span>{hazards.length - byes - outs} HAZARD{hazards.length - byes - outs === 1 ? '' : 'S'}</span>}</div><div className={styles.monitorActions}><ProviderLink compact league={saved} teamId={featured ? myTeam : undefined} /><MatchupPresser own={name(own.id)} opponent={name(opponent.id)} /></div></div><ProjectionBar own={sides.ownProjection} opponent={sides.opponentProjection} />
      </StudioMonitorFrame>
      </article>;
    })}
    {snapshot && (allMatchups || myTeam) && !matches.length && <p className={styles.hint}>{allMatchups ? 'No matchups scheduled in this league this week.' : 'No matchup scheduled for your team this week.'}</p>}
    {saved.platform === 'yahoo' && <p className={styles.hint}>Fantasy data provided by Yahoo Fantasy.</p>}
  </section>;
}

export function MyGameDayPage({ currentLeague = null }: { currentLeague?: League | null }) {
  const { playHazardStinger, playCloseGamePulse, playLeadChange, playMajorSwing } = useSounds();
  const studioAudio = useRef(new StudioAudioEvents());
  const saved = useSavedLeagues();
  const [shellParams, setShellParams] = useSearchParams();
  const syncRequested = useRef(false);
  const mobile = useMediaQuery('(max-width: 1100px)');
  const [view, setView] = useState<'matchups' | 'players'>('matchups');
  const [focus, setFocus] = useState<'league' | 'projected' | 'current'>('league');
  const [closeOnly, setCloseOnly] = useState(false);
  const [sharedCount, setSharedCount] = useState(0);
  const [rootingConflicts, setRootingConflicts] = useState(0);
  const [biggestConflict, setBiggestConflict] = useState<StudioConflict | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [timelines, setTimelines] = useState<Record<string, { data: NFLTimeline | null; error: string | null; loading: boolean }>>({});
  const onTimeline = useCallback((key: string, data: NFLTimeline | null, error: string | null, loading: boolean) => {
    setTimelines(previous => previous[key]?.data === data && previous[key]?.error === error && previous[key]?.loading === loading ? previous : { ...previous, [key]: { data, error, loading } });
  }, []);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const seasons = [...new Set(saved.map(league => league.season))].sort((a, b) => b - a);
  const [chosenSeason, setChosenSeason] = useState<number | null>(null);
  const requestedLeague = shellParams.get('league');
  const requestedYear = Number(shellParams.get('year'));
  const selectedLeague = saved.find(row => `${row.platform}:${row.leagueId}` === requestedLeague && (!Number.isFinite(requestedYear) || !requestedYear || row.season === requestedYear));
  const season = selectedLeague?.season ?? (chosenSeason !== null && seasons.includes(chosenSeason) ? chosenSeason : seasons[0]);
  const leagues = saved.filter(league => league.season === season && (!selectedLeague || savedLeagueKey(league) === savedLeagueKey(selectedLeague)));
  const [updates, setUpdates] = useState<Record<string, LeagueUpdate>>({});
  const [scoreTape, setScoreTape] = useState(loadScoreTape);
  const [cuePrefs, setCuePrefs] = useState<CuePreferences>(() => { try { const value = JSON.parse(safeLocalStorage.getItem('ffa:studio-cues:v1') ?? '{}'); return { lead: value.lead === true, swing: value.swing === true }; } catch { return { lead: false, swing: false }; } });
  const lastSoundedChange = useRef(scoreTape.changes[0]?.id ?? '');
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
  const refreshAll = useCallback(async () => {
    if (busy.current || !ready || refreshing) return;
    busy.current = true; setRefreshingAll(true); setEventRefreshSignal(value => value + 1);
    try { await Promise.allSettled(visible.map(update => Promise.resolve().then(() => update.refresh()))); }
    finally { busy.current = false; setRefreshingAll(false); }
  }, [ready, refreshing, visible]);
  useEffect(() => {
    const sync = () => { void refreshAll(); };
    window.addEventListener('witching-hour:sync-all', sync);
    if (ready && shellParams.get('sync') === 'all' && !syncRequested.current) {
      syncRequested.current = true; void refreshAll();
      setShellParams(previous => { const next = new URLSearchParams(previous); next.delete('sync'); return next; }, { replace: true });
    }
    return () => window.removeEventListener('witching-hour:sync-all', sync);
  }, [refreshAll, ready, shellParams, setShellParams]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('witching-hour:sync-status', { detail: { at: updatedAt, busy: !ready || refreshing } })); }, [updatedAt, ready, refreshing]);

  const weeks = [...new Set(visible.flatMap(update => update?.snapshot ? [update.snapshot.week] : []))];
  const contexts: SharedLeagueContext[] = leagues.map(saved => ({ saved, snapshot: updates[savedLeagueKey(saved)]?.snapshot ?? null, myTeamId: updates[savedLeagueKey(saved)]?.myTeamId, error: updates[savedLeagueKey(saved)]?.error }));
  useEffect(() => { setScoreTape(previous => captureScoreTape(previous, contexts)); }, [contexts]);
  useEffect(() => { saveScoreTape(scoreTape); }, [scoreTape]);
  const scoreChanges = currentScoreChanges(scoreTape, contexts);
  const playEvents = Object.entries(timelines).filter(([key]) => key.startsWith(`${season}:`) && weeks.includes(Number(key.split(':')[1]))).flatMap(([, feed]) => (feed.data?.events ?? []).map(event => ({ event, data: feed.data }))).sort((a, b) => (Date.parse(b.event.occurredAt ?? '') || 0) - (Date.parse(a.event.occurredAt ?? '') || 0));
  const cue = directorCue(scoreChanges, playEvents, contexts, now);
  const comebackRows = comebackWatch(contexts, timelines);
  const show = studioShow(contexts, timelines, scoreChanges, biggestConflict, now);
  useEffect(() => {
    const latest = scoreChanges[0];
    if (!latest || latest.id === lastSoundedChange.current) return;
    lastSoundedChange.current = latest.id;
    if (document.visibilityState === 'hidden' || Date.now() - latest.at > 60000) return;
    const kind = scoreCueKind(latest);
    if (kind === 'lead' && cuePrefs.lead) playLeadChange();
    else if (cuePrefs.swing && Math.abs(latest.ownDelta - latest.opponentDelta) >= 10) playMajorSwing();
  }, [scoreChanges, cuePrefs, playLeadChange, playMajorSwing]);
  const updateCuePrefs = (next: CuePreferences) => { setCuePrefs(next); safeLocalStorage.setItem('ffa:studio-cues:v1', JSON.stringify(next)); };
  const focusChannel = (key: string) => { if (mobile) setView('matchups'); window.requestAnimationFrame(() => document.getElementById(`studio-channel-${key}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })); };
  const bestMargin = (saved: SavedLeague) => {
    const context = contexts.find(context => savedLeagueKey(context.saved) === savedLeagueKey(saved))!;
    return Math.min(Infinity, ...myMatchups(context).map(match => Math.abs(matchupMargin(context, match, focus === 'current' ? 'current' : 'projected', timelines[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null) ?? Infinity)));
  };
  const sortedLeagues = [...leagues].sort((a, b) => focus === 'league' ? 0 : bestMargin(a) - bestMargin(b));
  const qualifying = contexts.reduce((count, context) => count + wallMatchups(context, !!selectedLeague).filter(match => {
    const value = matchupMargin(wallContext(context, match), match, focus === 'current' ? 'current' : 'projected', timelines[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null);
    return value !== null && Math.abs(value) <= 10;
  }).length, 0);
  const activeScreens = contexts.reduce((count, context) => count + (wallMatchups(context, !!selectedLeague).length || 1), 0);
  const wallName = studioWallName(activeScreens);

  const closest: StudioMatchup | null = contexts.flatMap(context => myMatchups(context).flatMap(match => {
    const margin = matchupMargin(context, match, 'projected', timelines[`${context.snapshot?.season}:${context.snapshot?.week}`]?.data ?? null);
    const sides = matchupSides(context, match);
    return margin !== null && sides.own && sides.opponent ? [{ league: context.saved.name, own: sides.own.name, opponent: sides.opponent.name, margin }] : [];
  })).sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin))[0] ?? null;
  const warnings = lineupWarnings(contexts, timelines, now);
  useEffect(() => {
    const cue = studioAudio.current.observe(contexts, timelines, warnings, Date.now());
    if (document.visibilityState === 'hidden') return;
    if (cue === 'hazard') playHazardStinger();
    else if (cue === 'close') playCloseGamePulse();
  }, [contexts, timelines, warnings, playHazardStinger, playCloseGamePulse]);
  const missingRosters = contexts.filter(context => !context.snapshot?.teams.find(team => team.id === context.myTeamId)?.roster).length;
  const experience = useExperiencePreferences();
  const refreshLeague = useCallback(async (key: string) => { setEventRefreshSignal(value => value + 1); await updates[key]?.refresh(); }, [updates]);
  const kickoff = useKickoffReminders(contexts, timelines, now, refreshLeague);
  return <div className={`${styles.page} ${styles.dashboardPage}`}><div className="container">
    <div className={styles.dashboardHeader}>
      <div className={styles.dashboardHeading}><h1 id="quadbox-heading">{wallName}</h1><p>{weeks.length ? `${weeks.length === 1 ? 'Week' : 'Weeks'} ${weeks.join(' / ')} · ` : ''}{leagues.length} {leagues.length === 1 ? 'league' : 'leagues'}</p></div>
      <CortisolMeter compact lineupHazards={warnings.length} rootingConflicts={rootingConflicts} />
      <div className={styles.dashboardTools}>
        {!!leagues.length && <p role="status">{updatedAt !== null ? <>Last updated <time title={`Oldest league update: ${new Date(updatedAt).toLocaleString()}`} dateTime={new Date(updatedAt).toISOString()}>{new Date(updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></> : 'Waiting for league updates'}</p>}
        {!!leagues.length && <button className="btn studio-key" onClick={() => void refreshAll()} disabled={!ready || refreshing} aria-busy={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh all'}</button>}
      </div>
    </div>
    {!!leagues.length && <StudioAnchorDesk warnings={warnings} closest={closest} conflict={biggestConflict} missing={missingRosters} />}
    <DirectorCueBar cue={cue} onFocus={focusChannel} />
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
        <aside id="players-panel" role={mobile ? 'tabpanel' : undefined} hidden={mobile && view !== 'players'} className={styles.sharedSidebar} aria-labelledby={mobile ? 'players-tab' : 'shared-players-heading'}><SharedPlayersSidebar onBiggestConflictChange={setBiggestConflict} onConflictCountChange={setRootingConflicts} onCountChange={setSharedCount} onTimeline={onTimeline} refreshSignal={eventRefreshSignal} contexts={contexts} />
          {Object.entries(timelines).filter(([key]) => key.startsWith(`${season}:`) && weeks.includes(Number(key.split(':')[1]))).map(([key, feed]) => <div key={key} className={styles.combinedEvents}><MatchupAlerts data={feed.data} error={feed.error} loading={feed.loading} now={now} rankEvents={events => prioritizeEvents(events, experience.alertPriority, contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key), feed.data, now)} renderImpact={event => <EventImpactDetails event={event} contexts={contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key)} data={feed.data} />} idPrefix={`home-${key}-`} /></div>)}
          {Object.entries(timelines).filter(([key]) => key.startsWith(`${season}:`) && weeks.includes(Number(key.split(':')[1]))).map(([key, feed]) => <div key={key} className={styles.combinedEvents}>
            <MatchupTimeline popout week={Number(key.split(':')[1])} data={feed.data} error={feed.error} loading={feed.loading} refresh={() => setEventRefreshSignal(value => value + 1)} canRefresh={true} renderImpact={event => <EventImpactDetails event={event} contexts={contexts.filter(context => `${context.snapshot?.season}:${context.snapshot?.week}` === key)} data={feed.data} />} idPrefix={`home-${key}-`} />
          </div>)}
        </aside>
        <div id="matchups-panel" role={mobile ? 'tabpanel' : undefined} hidden={mobile && view !== 'matchups'} aria-labelledby={mobile ? 'matchups-tab' : 'quadbox-heading'} className={styles.matchupsColumn}><section className={styles.matchupsPanel}><WorkspaceControls><div className={styles.focusToolbar}><label>Sort matchups<select value={focus} onChange={event => setFocus(event.target.value as typeof focus)}><option value="league">League order</option><option value="projected">Closest projected margin</option><option value="current">Closest current margin</option></select></label><label className={styles.closeFilter}><input type="checkbox" checked={closeOnly} onChange={event => setCloseOnly(event.target.checked)} />Witching Hour margins only (≤10 pts)</label></div></WorkspaceControls>{closeOnly && !qualifying && <p className={styles.empty}>No close matchups with available {focus === 'current' ? 'current' : 'weekly projected'} margins.</p>}<div className={styles.homeGrid}>{sortedLeagues.map(league => <LeagueMatchups channel={leagues.findIndex(row => savedLeagueKey(row) === savedLeagueKey(league)) + 1} allMatchups={!!selectedLeague} focus={focus} closeOnly={closeOnly} cueLeagueKey={cue?.leagueKey ?? null} key={savedLeagueKey(league)} saved={league} currentLeague={currentLeague} onUpdate={onUpdate} timelines={timelines} />)}{activeScreens % 2 === 1 && !closeOnly && <div className={styles.standbyMonitor}><span>REDZONE // OPEN CHANNEL</span><strong>PUT ANOTHER GAME ON THE WALL</strong><p>Your next live matchup is one league away.</p><Link to={selectedLeague && saved.length > 1 ? '/' : '/settings'}>{selectedLeague && saved.length > 1 ? 'SHOW ALL LEAGUES ↗' : 'PATCH IN A LEAGUE ↗'}</Link></div>}</div></section>
          <GameDayRecapRecorder contexts={contexts} feeds={timelines} now={now} />
        </div></div>}
    {!!leagues.length && <StudioBroadcastDesk changes={scoreChanges} comebacks={comebackRows} events={playEvents} contexts={contexts} show={show} cues={cuePrefs} onCuesChange={updateCuePrefs} />}
  </div></div>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { sortMajorEvents, timelineCacheKey, type MajorEvent, type NFLTimeline } from '@/api/nflTimeline';
import { useMatchupTimeline } from '@/hooks/useMatchupTimeline';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { liveStatusIsStale, playerGameStatus } from '@/utils/matchupGameStatus';
import { eventImpact } from '@/utils/gameDayInsights';
import { isStartingSlot } from '@/utils/playerWeek';
import { canonicalTeam, normalizeName } from '@/utils/playerNames';
import { playerIdentityIndex, sharedPlayers, type SharedLeagueContext, type SharedPlayer } from '@/utils/sharedPlayers';
import { MatchupPanel } from './MatchupPanel';
import { LeagueLink } from './LeagueLink';
import styles from './SharedPlayersSidebar.module.css';
import pageStyles from '@/pages/GameDayPage.module.css';

type Stat = { label: string; value: string };
function sharedPlayerEvents(player: SharedPlayer, data: NFLTimeline | null): { event: MajorEvent; personal: boolean }[] {
  const game = playerGameStatus(player.nflTeam, data);
  if (!game) return [];
  const fullName = ` ${normalizeName(player.name)} `;
  return sortMajorEvents(data?.events.filter(event => event.gameId === game.id) ?? []).map(event => ({ event,
    personal: !player.defense && ` ${normalizeName(event.description).replace(/\s+/g, ' ')} `.includes(fullName) }));
}
function projectionFor(player: SharedPlayer): number | null {
  const values = player.occurrences.map(occurrence => occurrence.player.projection).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}
function pointsFor(player: SharedPlayer): string {
  const values = player.occurrences.map(o => o.player.points).filter((points): points is number => typeof points === 'number' && Number.isFinite(points));
  if (!values.length) return '— pts';
  const low = Math.min(...values), high = Math.max(...values);
  return `${low === high ? low.toFixed(2) : `${low.toFixed(2)}–${high.toFixed(2)}`} pts`;
}
function statsFor(player: SharedPlayer, data: NFLTimeline | null): { stats: Stat[]; updatedAt: number; gameStats: boolean; cached: boolean } {
  const byId = player.espnId ? data?.playerStats?.[player.espnId] : undefined;
  const named = Object.values(data?.playerStats ?? {}).filter(line => normalizeName(line.name) === normalizeName(player.name) && canonicalTeam(line.nflTeam) === player.nflTeam);
  const line = byId ?? (named.length === 1 ? named[0] : undefined);
  if (line) return { stats: line.stats.filter(stat => / (YDS|TD|INT|REC|CAR|FG|XP|TOT|SACKS)$/i.test(stat.label)).slice(0, 6), updatedAt: line.updatedAt, gameStats: true, cached: !!data?.failedGameIds?.includes(line.gameId) };
  const occurrence = [...player.occurrences].filter(o => o.player.stats?.length).sort((a, b) => Number(a.stale) - Number(b.stale) || b.fetchedAt - a.fetchedAt)[0];
  return { stats: occurrence?.player.stats?.slice(0, 5).map(stat => ({ label: stat.label, value: String(stat.value) })) ?? [], updatedAt: occurrence?.fetchedAt ?? 0, gameStats: false, cached: occurrence?.stale ?? false };
}

type TimelineReport = (key: string, data: NFLTimeline | null, error: string | null, loading: boolean) => void;
function SharedWeek({ players, contexts, season, week, refreshSignal, onTimeline }: { players: SharedPlayer[]; contexts: SharedLeagueContext[]; season: number; week: number; refreshSignal: number; onTimeline?: TimelineReport }) {
  const teams = [...new Set(contexts.flatMap(context => {
    const relevant = context.snapshot?.matchups.filter(match => context.myTeamId && [match.team1Id, match.team2Id].includes(context.myTeamId)).flatMap(match => [match.team1Id, match.team2Id]) ?? [];
    return context.snapshot?.teams.filter(team => relevant.includes(team.id)).flatMap(team => team.roster?.filter(player => player.id !== '0' && isStartingSlot(player.slot)).map(player => player.nflTeam).filter(Boolean) ?? []) ?? [];
  }))];
  const refreshedAt = Math.max(0, ...contexts.map(context => context.snapshot?.fetchedAt ?? 0));
  const events = useMatchupTimeline(season, week, teams, refreshedAt, true);
  const eventData = events.data, eventError = events.error, eventLoading = events.loading;
  useEffect(() => { onTimeline?.(`${season}:${week}`, eventData, eventError, eventLoading); }, [season, week, eventData, eventError, eventLoading, onTimeline]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const lastSignal = useRef(refreshSignal);
  const refreshEvents = events.refresh;
  useEffect(() => { if (lastSignal.current !== refreshSignal) { lastSignal.current = refreshSignal; refreshEvents(); } }, [refreshSignal, refreshEvents]);
  const stale = liveStatusIsStale(events.data, events.error, now);
  const notifications = useEventNotifications(`${timelineCacheKey(season, week, teams)}:combined-impact-v1`, events.data, events.loading, event => {
    const impacts = eventImpact(event, contexts, events.data);
    const summary = impacts.map(impact => `${impact.league.name}: ${impact.good.length ? `likely helps (${impact.good.join(', ')})` : ''}${impact.good.length && impact.bad.length ? '; ' : ''}${impact.bad.length ? `likely hurts (${impact.bad.join(', ')})` : ''}`).join(' · ');
    return `${event.description}${summary ? ` — ${summary}` : ''}`;
  });
  const entries = players.map(player => {
    const game = playerGameStatus(player.nflTeam, events.data);
    const allEvents = sharedPlayerEvents(player, events.data);
    const latest = allEvents.find(item => item.personal) ?? allEvents[0];
    const stats = statsFor(player, events.data);
    return { player, game, latest, stats };
  }).sort((a, b) => (projectionFor(b.player) ?? -Infinity) - (projectionFor(a.player) ?? -Infinity) || b.player.matchupCount - a.player.matchupCount || a.player.name.localeCompare(b.player.name));
  const previous = useRef(new Map<string, string>());
  const [changed, setChanged] = useState<Set<string>>(() => new Set());
  const fingerprint = entries.map(({ player, latest, stats, game }) => `${player.key}:${latest?.event.id ?? ''}:${JSON.stringify(stats.stats)}:${game?.state ?? ''}`).join('|');
  useEffect(() => {
    if (!events.data) return;
    const next = new Map<string, string>(); const updates = new Set<string>();
    for (const { player, latest, stats, game } of entries) {
      const signature = `${latest?.event.id ?? ''}:${JSON.stringify(stats.stats)}:${game?.state ?? ''}`;
      if (previous.current.has(player.key) && previous.current.get(player.key) !== signature && !stale) updates.add(player.key);
      next.set(player.key, signature);
    }
    previous.current = next;
    if (!updates.size) { setChanged(previous => previous.size ? new Set() : previous); return; }
    setChanged(updates);
    const timer = setTimeout(() => setChanged(new Set()), 20000);
    return () => { clearTimeout(timer); };
    // Fingerprint covers the rendered event/stat values; unrelated league renders do not reset the highlight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, stale]);
  return <>
    <p className={pageStyles.hint}>Week {week}{entries.some(entry => entry.game?.state === 'in') && !stale ? ' · Live updates every 15 seconds' : ''}</p>
    {events.error && <p className={pageStyles.hint} role="status">Live updates unavailable. Showing saved details.</p>}
    {!!events.data?.warnings.length && <p className={pageStyles.hint}>Some NFL updates are unavailable.</p>}
    {notifications.problem && <p className={pageStyles.hint} role="status">{notifications.problem}</p>}
    <ul className={styles.list}>{entries.map(({ player, game, latest, stats }) => <li key={player.key} className={`${styles.player} ${changed.has(player.key) ? styles.changed : ''}`}>
      <details className={styles.playerDetails}>
        <summary className={styles.playerSummary} aria-label={`${player.name}: ${pointsFor(player)}; ${player.owned} leagues on your team, ${player.opposing} against you. Show details.`}>
          <span className={styles.playerHeading}><span role="heading" aria-level={3} className={styles.playerTitle}>{player.name}</span><span className={styles.playerTotals}><span className={styles.points} aria-label={`${player.name} current fantasy points`}>{pointsFor(player)}</span><span className={styles.projection} aria-label={`${player.name} highest league projection`} title="Highest available league projection">Proj. {projectionFor(player)?.toFixed(2) ?? '—'}</span></span><span className={styles.expandMark} aria-hidden="true" /></span>
          <span className={styles.exposure}>
            <span className={styles.meta}>{player.position} · {player.nflTeam || 'NFL team unavailable'}</span>
            {!!player.owned && <span className={styles.owned} aria-label={`On your team in ${player.owned} ${player.owned === 1 ? 'league' : 'leagues'}`}>Yours ×{player.owned}</span>}
            {!!player.opposing && <span className={styles.opponent} aria-label={`Facing you in ${player.opposing} ${player.opposing === 1 ? 'league' : 'leagues'}`}>Against ×{player.opposing}</span>}
            {changed.has(player.key) && <span className={styles.updated}>Updated</span>}
          </span>
          <span className={styles.pointsNote}>{[new Set(player.occurrences.filter(o => typeof o.player.points === 'number').map(o => o.player.points)).size > 1 && 'Varies by league', player.occurrences.some(o => typeof o.player.points !== 'number') && 'Some points unavailable', player.occurrences.some(o => o.stale) && 'Saved scores'].filter(Boolean).join(' · ')}</span>
          {game?.state === 'in' ? <span className={stale ? pageStyles.cachedBadge : pageStyles.liveBadge}>{stale ? 'Last seen live' : 'LIVE'} · {game.name} · {game.detail || game.clock}</span>
            : game?.state === 'post' ? <span className={styles.statusLine}>Final · {game.name}{stats.stats.length ? ` · ${stats.stats.slice(0, 2).map(stat => `${stat.value} ${stat.label.replace(/^(passing|rushing|receiving|defensive) /i, '')}`).join(' · ')}` : ''}</span>
            : game?.state === 'pre' ? <span className={styles.statusLine}>{game.name} · {game.detail || 'Scheduled'}</span>
            : !game && events.data?.games && player.nflTeam ? <span className={styles.statusLine}>Bye / no game scheduled</span>
            : <span className={styles.statusLine}>{events.loading ? 'Checking game status…' : 'Game status unavailable'}</span>}
          {latest && (latest.personal || player.defense) && game?.state === 'in' && !stale && <span className={styles.previewEvent}>{latest.event.description}</span>}
        </summary>
        <div className={styles.playerExpanded}>
          {!!stats.stats.length && <div className={styles.stats} aria-label={`${player.name} stats`}><p className={styles.meta}>{stats.gameStats ? 'NFL game stats' : `Week ${week} stats`}{stats.cached ? ' · Saved' : ''}</p><dl>{stats.stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl><p className={styles.meta}>As of {new Date(stats.updatedAt).toLocaleTimeString()}</p></div>}
          {latest && <div className={styles.event} aria-live={game?.state === 'in' && !stale ? 'polite' : 'off'}><p className={styles.meta}>{latest.personal ? 'Player event' : 'Game event'} · Q{latest.event.quarter} {latest.event.clock}</p><p>{latest.event.description}</p></div>}
          <p className={styles.breakdownTitle}>League breakdown · {player.matchupCount} matchups</p>
          <ul className={styles.leagues}>{player.occurrences.map((occurrence, i) => <li key={`${occurrence.matchup}:${occurrence.role}:${i}`}>
            <LeagueLink league={{ platform: occurrence.league.platform, id: occurrence.league.leagueId, season: occurrence.league.season }}>{occurrence.league.name}</LeagueLink>
            <p className={styles.meta}>{occurrence.role === 'own' ? 'Your team' : 'Opponent'} · {occurrence.fantasyTeam} · {occurrence.league.platform}{occurrence.stale ? ' · Saved' : ''}</p>
            <p className={styles.leaguePoints}>{typeof occurrence.player.points === 'number' ? occurrence.player.points.toFixed(2) : '—'} pts · Proj. {typeof occurrence.player.projection === 'number' ? occurrence.player.projection.toFixed(2) : '—'}</p>
          </li>)}</ul>
        </div>
      </details>
    </li>)}</ul>

  </>;
}

export function SharedPlayersSidebar({ contexts, refreshSignal = 0, onCountChange, onTimeline }: { contexts: SharedLeagueContext[]; refreshSignal?: number; onCountChange?: (count: number) => void; onTimeline?: TimelineReport }) {
  const [index, setIndex] = useState<ReturnType<typeof playerIdentityIndex> | null>(null);
  const [mappingFailed, setMappingFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import('@/data/playerIdentityMap.json').then(module => { if (active) setIndex(playerIdentityIndex(module.default.players)); })
      .catch(() => { if (active) { setMappingFailed(true); setIndex(playerIdentityIndex([])); } });
    return () => { active = false; };
  }, []);
  const groups = useMemo(() => index ? sharedPlayers(contexts, index) : [], [contexts, index]);
  const weeks = [...new Set(contexts.flatMap(context => context.snapshot ? [`${context.snapshot.season}:${context.snapshot.week}`] : []))];
  useEffect(() => { onCountChange?.(groups.length); }, [groups.length, onCountChange]);
  const missing = contexts.filter(context => !context.snapshot || !context.myTeamId).length;
  return <MatchupPanel title="Shared Players" panelKey="shared-players" headingId="shared-players-heading" className={styles.panel}>
    <p className={pageStyles.hint}>Starters shared across 2+ matchups. Highest league projection first.</p>
    {mappingFailed && <p className={pageStyles.hint}>Player IDs unavailable. Using unambiguous name, position and team matches.</p>}
    {!!missing && <p className={pageStyles.hint}>{missing} {missing === 1 ? 'league needs' : 'leagues need'} data or a My team selection in Settings.</p>}
    {index === null ? <p className={pageStyles.hint}>Matching players across leagues…</p> : <>
      {!groups.length && <p className={pageStyles.hint}>No shared starters in the loaded matchups.</p>}
      {weeks.map(key => { const [season, week] = key.split(':').map(Number); return <SharedWeek key={key} season={season} week={week} contexts={contexts.filter(context => context.snapshot?.season === season && context.snapshot.week === week)} players={groups.filter(player => `${player.season}:${player.week}` === key)} refreshSignal={refreshSignal} onTimeline={onTimeline} />; })}
    </>}
    {contexts.some(context => context.saved.platform === 'yahoo') && <p className={pageStyles.hint}>Fantasy data provided by Yahoo Fantasy.</p>}
  </MatchupPanel>;
}

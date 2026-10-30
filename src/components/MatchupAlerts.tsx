import type { ReactNode } from 'react';
import type { MajorEvent } from '@/api/nflTimeline';
import { sortMajorEvents, type NFLTimeline } from '@/api/nflTimeline';
import { liveStatusIsStale } from '@/utils/matchupGameStatus';
import { MatchupPanel } from './MatchupPanel';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupAlerts({ data, loading, error, now, idPrefix = '', renderImpact, rankEvents }: { data: NFLTimeline | null; loading: boolean; error: string | null; now: number; rankEvents?: (events: MajorEvent[]) => MajorEvent[]; renderImpact?: (event: MajorEvent) => ReactNode; idPrefix?: string }) {
  const live = data?.games?.filter(game => game.state === 'in') ?? [];
  const stale = liveStatusIsStale(data, error, now);
  const active = live.length > 0 && !stale;
  const liveIds = new Set(live.map(game => game.id));
  const candidates = active ? sortMajorEvents(data?.events.filter(event => liveIds.has(event.gameId)) ?? []) : [];
  const latest = (rankEvents ? rankEvents(candidates) : candidates).slice(0, 3);
  if (!active) return null;
  return <MatchupPanel title="Latest Alerts" panelKey={`${idPrefix}alerts`} headingId={`${idPrefix}latest-alerts-heading`} className={styles.alertPanel}>
    <div className={styles.toolbar}><a className={styles.rosterLink} href={`#${idPrefix}timeline-heading`}>Full timeline ↓</a></div>
    <div className={styles.liveGames} aria-label="NFL game statuses">
      {live.map(game => <span key={game.id} className={stale ? styles.cachedBadge : styles.liveBadge} title="NFL game status, not an on-field player indicator">{stale ? 'Last seen live' : 'LIVE'} · {game.name}{game.detail ? ` · ${game.detail}` : ''}</span>)}
    </div>
    {error && <p className={styles.hint}>Events could not refresh. Showing saved alerts where available.</p>}
    {!!data?.warnings.length && <p className={styles.hint}>Some game events could not refresh. Latest alerts may be incomplete.</p>}
    {active && <p className={styles.period}>Live events · Checking every 15 seconds</p>}
    <div aria-live={active ? "polite" : "off"} aria-atomic="false">
      {latest.length ? <ol className={styles.alertList}>{latest.map(event => <li key={event.id} className={styles.alertItem}>
        <p className={styles.period}>{event.kind} · {event.game} · {event.quarter ? `Q${event.quarter}` : ''} {event.clock}</p>
        <p>{event.description}</p>{renderImpact?.(event)}
        {event.occurredAt && <time className={styles.eventTime} dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>}
      </li>)}</ol> : <p className={styles.hint}>{loading ? 'Checking live events…' : rankEvents ? 'No events match your alert preference yet.' : 'No major events have been reported for the live games yet.'}</p>}
    </div>
  </MatchupPanel>;
}

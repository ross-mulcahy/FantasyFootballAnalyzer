import type { ReactNode } from 'react';
import type { MajorEvent } from '@/api/nflTimeline';
import { sortMajorEvents, type NFLTimeline } from '@/api/nflTimeline';
import { MatchupPanel } from './MatchupPanel';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupTimeline({ week, data, error, loading, refresh, canRefresh, idPrefix = '', renderImpact }: {
  week: number; data: NFLTimeline | null; error: string | null; loading: boolean; refresh: () => void; canRefresh: boolean; renderImpact?: (event: MajorEvent) => ReactNode; idPrefix?: string;
}) {
  const events = sortMajorEvents(data?.events ?? []);
  return <MatchupPanel title={`Major Events · Week ${week}`} panelKey={`${idPrefix}timeline`} headingId={`${idPrefix}timeline-heading`} className={`${styles.card} ${styles.section}`}>
    <div className={styles.toolbar}>
      <button className="btn" onClick={refresh} disabled={loading || !canRefresh}>{loading ? 'Loading events…' : 'Refresh events'}</button></div>
    <p className={styles.hint}>Latest event first. ESPN NFL scoring plays and turnovers in games involving either starting lineup. Events describe the NFL game, not fantasy-point changes.</p>
    {data && <p className={styles.hint}>Events updated <time dateTime={new Date(data.fetchedAt).toISOString()}>{new Date(data.fetchedAt).toLocaleString()}</time>. Quarter and game clock are shown; event times are used when supplied.</p>}
    {error && <p role="status" className={styles.hint}>{error} {data ? 'Showing the last saved event timeline.' : ''}</p>}
    {data?.warnings.map(warning => <p key={warning} className={styles.hint}>{warning}</p>)}
    {events.length ? <ol className={styles.timeline}>{events.map(event => <li className={styles.timelineEvent} key={event.id}>
      <div className={styles.period}>{event.game} · {event.quarter ? `Q${event.quarter}` : 'Period unavailable'} {event.clock} · {event.kind}</div>
      {event.occurredAt && <time className={styles.eventTime} dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>}
      <p>{event.description}</p>{renderImpact?.(event)}
    </li>)}</ol> : !loading && !error && <p className={styles.empty}>No major events have been returned for these games yet.</p>}
  </MatchupPanel>;
}

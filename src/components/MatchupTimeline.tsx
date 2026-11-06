import type { ReactNode } from 'react';
import type { MajorEvent } from '@/api/nflTimeline';
import { sortMajorEvents, type NFLTimeline } from '@/api/nflTimeline';
import { MatchupPanel } from './MatchupPanel';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupTimeline({ week, data, error, loading, refresh, canRefresh, idPrefix = '', renderImpact, popout = false }: {
  week: number; data: NFLTimeline | null; error: string | null; loading: boolean; refresh: () => void; canRefresh: boolean; renderImpact?: (event: MajorEvent) => ReactNode; idPrefix?: string; popout?: boolean;
}) {
  const events = sortMajorEvents(data?.events ?? []);
  return <MatchupPanel studio popout={popout} title="REDZONE WIRE" panelKey={`${idPrefix}timeline`} headingId={`${idPrefix}timeline-heading`} className={`${styles.card} ${styles.section}`}>
    <div className={styles.wireControls}><button className="studio-key" onClick={refresh} disabled={loading || !canRefresh}>{loading ? 'Tuning signal…' : 'Refresh events'}</button>{data && <time className={styles.wireTimestamp} dateTime={new Date(data.fetchedAt).toISOString()} title="Last NFL event-feed sync">WEEK {week} // {new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}</div>
    {error && <p role="status" className={styles.hint}>{error} {data ? 'Showing the last saved event timeline.' : ''}</p>}
    {data?.warnings.map(warning => <p key={warning} className={styles.hint}>{warning}</p>)}
    {events.length ? <ol className={styles.timeline}>{events.map(event => <li className={styles.timelineEvent} key={event.id}>
      <div className={styles.period}>{event.game} · {event.quarter ? `Q${event.quarter}` : 'Period unavailable'} {event.clock} · {event.kind}</div>
      {event.occurredAt && <time className={styles.eventTime} dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>}
      <p>{event.description}</p>{renderImpact?.(event)}
    </li>)}</ol> : !loading && !error && <p className={styles.wireEmpty}>Seven hours of commercial-free football haven't started yet. No goal-line heartbreaks to report.</p>}
  </MatchupPanel>;
}

type TimeValue = string | number | Date;

// The viewer's browser chooses its locale and time zone. Keep source timestamps
// as absolute instants; only convert when displaying them.
export function formatLocalTime(value: TimeValue, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short', ...options,
  }).format(new Date(value));
}

export function formatLocalDateTime(value: TimeValue, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short', ...options,
  }).format(new Date(value));
}

export function localKickoff(kickoff: string, fallback: string): string {
  const time = Date.parse(kickoff);
  return Number.isFinite(time) ? `Kickoff ${formatLocalDateTime(time, { weekday: 'short' })}` : fallback || 'Scheduled';
}

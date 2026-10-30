import type { useEventNotifications } from '@/hooks/useEventNotifications';
import styles from '@/pages/GameDayPage.module.css';

export function BrowserAlertsButton({ notifications }: { notifications: ReturnType<typeof useEventNotifications> }) {
  const { enabled, permission, requesting, toggle } = notifications;
  const label = requesting ? 'Requesting notification permission' : permission === 'unsupported' ? 'Browser alerts unavailable in this browser' : permission === 'denied' ? 'Browser alerts blocked. Allow notifications in site settings' : enabled ? 'Disable browser alerts' : 'Enable browser alerts';
  const tooltip = enabled ? `${label}. Alerts are on for this open matchup.` : label;
  return <button type="button" className={`btn ${styles.alertIconButton} ${enabled ? styles.alertIconEnabled : ''}`} onClick={() => void toggle()} disabled={requesting || permission === 'unsupported' || permission === 'denied'} aria-label={label} title={tooltip} aria-pressed={enabled} aria-busy={requesting}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
      {!enabled && <path d="m3 3 18 18" />}
    </svg>
  </button>;
}

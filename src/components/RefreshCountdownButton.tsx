import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './RefreshCountdownButton.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  nextRefreshAt?: number | null;
  refreshStartedAt?: number | null;
  children: ReactNode;
};

export function RefreshCountdownButton({ nextRefreshAt, refreshStartedAt, children, className = '', title, ...props }: Props) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!nextRefreshAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [nextRefreshAt]);
  const start = refreshStartedAt ?? nextRefreshAt ?? now;
  const duration = Math.max(1, (nextRefreshAt ?? now) - start);
  const progress = nextRefreshAt ? Math.max(0, Math.min(100, (now - start) / duration * 100)) : 0;
  const remaining = nextRefreshAt ? Math.max(0, Math.ceil((nextRefreshAt - now) / 1000)) : null;
  const countdown = remaining === null ? 'Automatic refresh schedule unavailable' : `Next automatic refresh in ${Math.floor(remaining / 60)}m ${String(remaining % 60).padStart(2, '0')}s`;
  return <button {...props} className={`${className} ${styles.button}`} title={title ? `${title} · ${countdown}` : countdown}>
    <span className={styles.progress} style={{ width: `${progress}%` }} aria-hidden="true" />{children}
  </button>;
}

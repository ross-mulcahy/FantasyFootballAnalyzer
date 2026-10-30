import { useId, useState, type ReactNode } from 'react';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupPanel({ title, panelKey, headingId, className = styles.card, children }: {
  title: string; panelKey: string; headingId?: string; className?: string; children: ReactNode;
}) {
  const id = useId();
  const storageKey = `ffa:matchup-panel:${panelKey}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'collapsed'; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed(value => !value);
    try { localStorage.setItem(storageKey, collapsed ? 'expanded' : 'collapsed'); } catch { /* Still works for this visit. */ }
  };
  return <section className={className} data-collapsed={collapsed} aria-labelledby={headingId ?? `${id}-heading`}>
    <div className={styles.panelHeader}>
      <h2 id={headingId ?? `${id}-heading`} className={styles.sectionTitle}>{title}</h2>
      <button className={styles.panelToggle} aria-label={`${collapsed ? 'Expand' : 'Minimise'} ${title}`} aria-expanded={!collapsed} aria-controls={`${id}-body`} onClick={toggle}>{collapsed ? '+ Expand' : '− Minimise'}</button>
    </div>
    <div id={`${id}-body`} hidden={collapsed}>{children}</div>
  </section>;
}

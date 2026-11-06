import { CrtMonitorFrame } from './CrtMonitorFrame';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from '@/pages/GameDayPage.module.css';

export function MatchupPanel({ title, panelKey, headingId, className = styles.card, children, studio = true, popout = false }: {
  title: string; panelKey: string; headingId?: string; className?: string; children: ReactNode; studio?: boolean; popout?: boolean;
}) {
  const id = useId();
  const [popped, setPopped] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const popButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasPopped = useRef(false);
  const storageKey = `ffa:matchup-panel:${panelKey}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'collapsed'; } catch { return false; }
  });
  const toggle = () => {
    if (popped) setPopped(false);
    setCollapsed(value => !value);
    try { localStorage.setItem(storageKey, collapsed ? 'expanded' : 'collapsed'); } catch { /* Still works for this visit. */ }
  };
  useEffect(() => {
    if (!popped) {
      if (wasPopped.current) popButtonRef.current?.focus();
      wasPopped.current = false;
      return;
    }
    wasPopped.current = true;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setPopped(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])') ?? [])].filter(element => !element.closest('[hidden]'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [popped]);
  const openPopout = () => {
    if (collapsed) {
      setCollapsed(false);
      try { localStorage.setItem(storageKey, 'expanded'); } catch { /* Still works for this visit. */ }
    }
    setPopped(true);
  };
  const content = <>
    <div className={styles.panelHeader}>
      <h2 id={headingId ?? `${id}-heading`} className={styles.sectionTitle}>{title}</h2>
      {popout && (popped ? <button ref={closeButtonRef} type="button" className={styles.panelToggle} aria-label={`Close ${title} pop-up`} onClick={() => setPopped(false)}>[ × ]</button> : <button ref={popButtonRef} type="button" className={styles.panelToggle} aria-label={`Open ${title} in pop-up`} onClick={openPopout}>[ ⛶ ]</button>)}
      <button className={styles.panelToggle} aria-label={`${collapsed ? 'Expand' : 'Minimise'} ${title}`} aria-expanded={!collapsed} aria-controls={`${id}-body`} onClick={toggle}>{studio ? collapsed ? '[ + ]' : '[ − ]' : collapsed ? '+ Expand' : '− Minimise'}</button>
    </div>
    <div id={`${id}-body`} hidden={collapsed}>{children}</div>
  </>;
  return <><section ref={panelRef} className={`${className} ${studio ? styles.studioPanel : ''} ${popped ? styles.popoutPanel : ''}`} data-collapsed={collapsed} role={popped ? 'dialog' : undefined} aria-modal={popped ? true : undefined} aria-labelledby={headingId ?? `${id}-heading`}>
    {studio ? <CrtMonitorFrame>{content}</CrtMonitorFrame> : content}
  </section>{popped && createPortal(<div className={styles.popoutBackdrop} aria-hidden="true" onClick={() => setPopped(false)} />, document.body)}</>;
}

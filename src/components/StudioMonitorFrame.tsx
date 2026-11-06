import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import styles from './CrtMonitorFrame.module.css';
export interface StudioMonitorFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  children: ReactNode;
  href?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'li' | 'a';
  title?: ReactNode;
  channelCode?: string;
  channel?: string;
  badge?: ReactNode;
  controls?: ReactNode;
  screenClassName?: string;
  padded?: boolean;
  onMinimise?: (minimised: boolean) => void;
}
/** Shared physical hardware; data, table semantics and provider state stay with callers. */
export function StudioMonitorFrame({ children, as: Tag = 'div', title, channelCode, channel, badge, controls, screenClassName = '', className = '', padded = false, onMinimise, ...attributes }: StudioMonitorFrameProps) {
  const [minimised, setMinimised] = useState(false);
  const id = useId();
  return <Tag {...attributes} className={`${styles.frame} studio-monitor crt-frame ${padded ? styles.legacy : ''} ${className}`}>
    <i className={`${styles.rivet} ${styles.topLeft}`} aria-hidden="true" /><i className={`${styles.rivet} ${styles.topRight}`} aria-hidden="true" />
    <div className={`${styles.screen} crt-screen ${screenClassName}`}>
      {(title || channelCode || channel || controls || badge || onMinimise) && <div className={styles.titleBar}>{(channelCode || channel) && <span className={styles.channel}>{channelCode ?? channel}</span>}{title && <h2>{title}</h2>}{badge && <span className={styles.badge}>{badge}</span>}{controls}{onMinimise && <button type="button" aria-label={`${minimised ? 'Expand' : 'Minimise'} ${typeof title === 'string' ? title : 'studio monitor'}`} aria-expanded={!minimised} aria-controls={id} onClick={() => { const next = !minimised; setMinimised(next); onMinimise(next); }}>{minimised ? '[ + ]' : '[ − ]'}</button>}</div>}
      {onMinimise ? <div id={id} hidden={minimised} className={padded ? styles.content : undefined}>{children}</div> : padded ? <div className={styles.content}>{children}</div> : children}
    </div>
    <div className={styles.hardwareFooter} aria-hidden="true"><i className={styles.greenLed} /><span>STUDIO SYSTEMS</span><i className={styles.redLed} /></div>
  </Tag>;
}

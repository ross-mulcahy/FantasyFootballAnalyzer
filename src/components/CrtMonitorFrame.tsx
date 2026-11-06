import type { ReactNode } from 'react';
import styles from './CrtMonitorFrame.module.css';
/** Physical casing is independent of screen content, data and collapse state. */
export function CrtMonitorFrame({ children, className = '', screenClassName = '', title, controls }: { children: ReactNode; className?: string; screenClassName?: string; title?: string; controls?: ReactNode }) {
  return <div className={`${styles.frame} crt-frame ${className}`}>
    <i className={`${styles.rivet} ${styles.topLeft}`} aria-hidden="true" /><i className={`${styles.rivet} ${styles.topRight}`} aria-hidden="true" />
    <div className={`${styles.screen} crt-screen ${screenClassName}`}>{title && <div className={styles.titleBar}><h2>{title}</h2>{controls}</div>}{children}</div>
    <div className={styles.hardwareFooter} aria-hidden="true"><i className={styles.greenLed} /><span>STUDIO SYSTEMS</span><i className={styles.redLed} /></div>
  </div>;
}

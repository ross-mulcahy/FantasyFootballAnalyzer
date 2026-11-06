import { CrtMonitorFrame } from './CrtMonitorFrame';
import { PixelScott } from './PixelScott';
import styles from './PageTeleprompter.module.css';
export function PageTeleprompter({ message }: { message: string }) {
  return <aside className={styles.strip} aria-label="Scott's page briefing"><CrtMonitorFrame className={styles.portrait}><PixelScott state="clear" /></CrtMonitorFrame><div className={styles.bubble}><span>PIXEL SCOTT // FRONT OFFICE FEED</span><p>{message}</p></div></aside>;
}

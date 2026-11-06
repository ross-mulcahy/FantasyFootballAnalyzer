import { useMemo, useState } from 'react';
import type { League, Team } from '@/types';
import { studioPageTakes, type StudioView } from '@/utils/studioPageTakes';
import { StudioMonitorFrame } from './StudioMonitorFrame';
import { PixelScott } from './PixelScott';
import styles from './PageTeleprompter.module.css';
export function StudioTeleprompterBar({ league, view = 'overview', team, takes, message }: { league?: League; view?: StudioView; team?: Team; takes?: readonly string[]; message?: string }) {
  const lines = useMemo(() => takes?.length ? takes : message ? [message, 'The tape is still rolling. Every number on this desk comes from the loaded board.'] : studioPageTakes(league, view, team), [takes, message, league, view, team]);
  const key = lines.join('|');
  const [selection, setSelection] = useState({ key, index: 0 });
  const index = selection.key === key ? selection.index % lines.length : 0;
  return <aside className={styles.strip} aria-label="Scott's page briefing"><StudioMonitorFrame className={styles.portrait}><PixelScott state="clear" compact /></StudioMonitorFrame><div className={styles.bubble}><div className={styles.bubbleHeader}><span>PIXEL SCOTT // STUDIO 01</span><button type="button" onClick={() => setSelection({ key, index: (index + 1) % lines.length })}>NEXT TAKE</button></div><p role="status" aria-live="polite">{lines[index]}</p></div></aside>;
}

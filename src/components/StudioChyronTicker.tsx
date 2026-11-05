import { studioStories } from '@/utils/studioStories';
import { useContext, useEffect, useState } from 'react';
import type { League } from '@/types';
import { GameDayContext } from '@/hooks/useGameDay';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { loadGameDayCache } from '@/utils/gameDayCache';
import { loadCachedLeague } from '@/utils/leagueCache';
import { isStartingSlot } from '@/utils/playerWeek';
import styles from './StudioHardware.module.css';

export function StudioChyronTicker({ league }: { league?: League | null }) {
  const saved = useSavedLeagues();
  const shared = useContext(GameDayContext);
  const [, update] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => { const refresh = () => update(n => n + 1); window.addEventListener('witching-hour:sync-status', refresh); return () => window.removeEventListener('witching-hour:sync-status', refresh); }, []);
  const snapshots = saved.map(row => {
    const current = league?.id === row.leagueId && league.platform === row.platform && league.season === row.season;
    const snapshot = current ? shared?.snapshot ?? loadGameDayCache({ platform: row.platform, id: row.leagueId, season: row.season }) : loadGameDayCache({ platform: row.platform, id: row.leagueId, season: row.season });
    const metadata = loadCachedLeague(row.platform, row.leagueId, row.season);
    const team = snapshot?.teams.find(t => t.id === (row.teamId ?? metadata?.teams.find(t => t.isMyTeam)?.id));
    return { team, name: team?.name ?? row.teamName };
  });
  const names = [...new Set(snapshots.flatMap(s => s.name ? [s.name] : []))];
  const players = [...new Set(snapshots.flatMap(s => s.team?.roster?.filter(p => p.id !== '0' && isStartingSlot(p.slot)).map(p => p.name) ?? []))];
  const stories = studioStories(names, players);
  return <aside className={`${styles.chyron} ${collapsed ? styles.chyronCollapsed : ''}`} aria-label="Satire wire. Fictional fantasy football headlines.">
    <span className={styles.chyronBadge}>SATIRE WIRE // OCTOBOX</span>
    {!collapsed && <><div id="studio-chyron-stories" className={`${styles.marqueeWindow} ${paused ? styles.paused : ''}`} tabIndex={0} aria-label="Fictional studio headlines; scrolling pauses on focus"><div className={styles.marquee}>{[0, 1].map(copy => <div className={styles.storyStrip} key={copy} aria-hidden={copy === 1 ? true : undefined}>{stories.map((story, index) => <span key={index}><b>{String(index + 1).padStart(2, '0')} // </b>{story}</span>)}</div>)}</div></div><button className={styles.tickerButton} onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume satire ticker' : 'Pause satire ticker'}>{paused ? 'PLAY' : 'PAUSE'}</button></>}
    <button className={styles.tickerButton} onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand satire ticker' : 'Collapse satire ticker'}>{collapsed ? '+' : '−'}</button>
  </aside>;
}

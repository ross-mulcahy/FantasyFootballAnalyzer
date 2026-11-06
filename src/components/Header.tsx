import { useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { League } from '@/types';
import { useSounds } from '@/hooks/useSounds';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { GameDayContext } from '@/hooks/useGameDay';
import { loadGameDayCache } from '@/utils/gameDayCache';
import { loadCachedLeague } from '@/utils/leagueCache';
import { lineupWarnings, matchupMargin, myMatchups } from '@/utils/gameDayInsights';
import { leagueContextHref, leagueGameDayHref, studioWallName } from '@/utils/gameDayLinks';
import { BroadcastIcon } from './BroadcastIcon';
import styles from './Header.module.css';

interface HeaderProps {
  leagueName?: string; platform?: string; league?: League | null; isGuest?: boolean;
  onChangeLeague?: () => void; onRefresh?: () => void; isRefreshing?: boolean; yearSelector?: ReactNode;
}
export function Header({ league, isGuest, onRefresh, isRefreshing, yearSelector }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const saved = useSavedLeagues();
  const dockLeagues = [...saved].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
    a.name.localeCompare(b.name) ||
    a.platform.localeCompare(b.platform) ||
    a.leagueId.localeCompare(b.leagueId) ||
    a.season - b.season);
  const gameDay = useContext(GameDayContext);
  const { isMuted, toggleMute, playPageTransition } = useSounds();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const [sync, setSync] = useState<{ at: number | null; busy: boolean }>({ at: null, busy: false });
  useEffect(() => {
    const update = (event: Event) => setSync((event as CustomEvent).detail);
    window.addEventListener('witching-hour:sync-status', update);
    return () => window.removeEventListener('witching-hour:sync-status', update);
  }, []);
  const connected = !!league && !isGuest && !league.isGuest;
  const navClick = () => { setOpen(false); playPageTransition(); };
  const navLeague = connected ? { platform: league.platform, id: league.id, season: league.season } : dockLeagues[0] ? { platform: dockLeagues[0].platform, id: dockLeagues[0].leagueId, season: dockLeagues[0].season } : null;
  const analysisHref = (path: string) => !connected && navLeague ? `${path}?${new URLSearchParams({ league: `${navLeague.platform}:${navLeague.id}`, year: String(navLeague.season) })}` : path;
  useEffect(() => {
    if (!open) return;
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a, button:not(:disabled)') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menu.current?.focus(); }
      if (event.key === 'Tab') {
        const items = controls(); const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);
  const groups = [
    { title: 'CONTROL ROOM', items: [['Game Day Hub', '/', 'grid'], ['League Matchups', navLeague ? leagueGameDayHref(navLeague) : '/settings', 'activity']] },
    { title: 'FRONT OFFICE', items: navLeague ? [['Rosters', '/rosters', 'users'], ['Waivers', '/waivers', 'activity'], ['Trades', '/trades', 'swap'], ['Players', '/players', 'users']] : [['Rankings', '/rankings', 'users'], ['Values', '/values', 'activity'], ['Trends', '/trends', 'activity']] },
    { title: 'TELEMETRY', items: navLeague ? [['Teams Dossier', '/teams', 'shield'], ['Draft Grades', '/draft', 'file'], ['Luck & PAR', '/luck', 'activity'], ['Draft Room', '/draft-room', 'grid']] : [['Draft Room', '/draft-room', 'grid']] },
    { title: 'THE VAULT', items: [...(navLeague ? [['History', '/history', 'file'], ['Awards', '/awards', 'award'], ['PDF Export', '/export', 'file']] : []), ['Recap', '/recap', 'file'], ['Settings', '/settings', 'settings']] },
  ];
  const active = (href: string) => href === '/' ? location.pathname === '/' : href.startsWith('/game-day') ? location.pathname === '/game-day' : href === '/rosters' ? location.pathname === '/rosters' || (location.pathname === '/teams' && new URLSearchParams(location.search).has('team')) : location.pathname === href && !(href === '/teams' && new URLSearchParams(location.search).has('team'));
  const times = saved.map(row => loadGameDayCache({ platform: row.platform, id: row.leagueId, season: row.season })?.fetchedAt ?? null);
  const screenCount = saved.reduce((count, row) => {
    const snapshot = loadGameDayCache({ platform: row.platform, id: row.leagueId, season: row.season });
    const teamId = row.teamId ?? loadCachedLeague(row.platform, row.leagueId, row.season)?.teams.find(team => team.isMyTeam)?.id;
    return count + Math.max(1, snapshot?.matchups.filter(match => teamId && [match.team1Id, match.team2Id].includes(teamId)).length ?? 0);
  }, 0);
  const lastSync = location.pathname === '/' ? sync.at : times.length && times.every(time => time !== null) ? Math.min(...times as number[]) : null;
  return <header className="app-header">
    <div className={styles.mobileBar}><Link className={styles.wordmark} to="/">WITCHING <span>HOUR</span></Link><button ref={menu} className={styles.menuButton} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="command-sidebar" onClick={() => setOpen(!open)}><BroadcastIcon kind="menu" size={20} /></button></div>
    {open && <button className={styles.scrim} aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside ref={sidebar} id="command-sidebar" className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <Link to="/" className={styles.wordmark} onClick={navClick} aria-label="Witching Hour">WITCHING <span>HOUR</span></Link>
      <p className={styles.tagline}>Where Losses Become Wins</p>
      <div className={styles.broadcast}><span className={styles.pulse} /> <b>ON AIR</b><span>{studioWallName(screenCount).replace('The ', '').toUpperCase()} // LIVE</span></div>
      <nav aria-label="Main navigation" className={styles.nav}>{groups.map(group => <div className={styles.group} key={group.title}><h2>{group.title}</h2>{group.items.map(([label, href, icon]) => <Link key={label} to={group.title !== 'CONTROL ROOM' && group.title !== 'THE VAULT' || ['/history', '/awards', '/export'].includes(href) ? analysisHref(href) : href} className={`${styles.navLink} ${active(href) && !(label === 'League Matchups' && !connected) ? styles.active : ''}`} onClick={navClick} aria-current={active(href) && !(label === 'League Matchups' && !connected) ? 'page' : undefined}><BroadcastIcon kind={icon} size={15} />{label}</Link>)}</div>)}</nav>
      <div className={styles.footer}><button onClick={toggleMute} aria-label={isMuted ? 'Enable sounds' : 'Mute sounds'} aria-pressed={!isMuted} className={styles.audio}><BroadcastIcon kind="audio" />Audio alerts <span>{isMuted ? 'OFF' : 'ON'}</span></button><p>LAST SYNC <time>{lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting data'}</time></p><button className={`${styles.sync} studio-key`} disabled={!saved.length || (location.pathname === '/' && sync.busy)} onClick={() => { setOpen(false); if (location.pathname === '/') window.dispatchEvent(new Event('witching-hour:sync-all')); else navigate('/?sync=all'); }}><BroadcastIcon kind="sync" />{location.pathname === '/' && sync.busy ? 'Syncing leagues…' : 'Sync All Leagues'}</button></div>
    </aside>
    <div className={styles.dock}><nav aria-label="League dock" className={styles.leagues}><Link className={`${styles.leaguePill} ${location.pathname === '/' && !new URLSearchParams(location.search).has('league') ? styles.selected : ''}`} to="/">All Leagues</Link>{dockLeagues.map(row => {
      const identity = { platform: row.platform, id: row.leagueId, season: row.season };
      const snapshot = connected && league.id === row.leagueId && league.platform === row.platform && league.season === row.season ? gameDay?.snapshot ?? loadGameDayCache(identity) : loadGameDayCache(identity);
      const cached = loadCachedLeague(row.platform, row.leagueId, row.season);
      const context = { saved: row, snapshot, myTeamId: row.teamId ?? cached?.teams.find(team => team.isMyTeam)?.id, error: null };
      const hazards = lineupWarnings([context], {}, Date.now());
      const close = myMatchups(context).some(match => { const margin = matchupMargin(context, match, 'projected', null); return margin !== null && Math.abs(margin) <= 10; });
      const known = !!snapshot?.teams.find(team => team.id === context.myTeamId)?.roster?.length;
      const status = hazards.length ? 'Lineup hazard' : close ? 'Witching Hour sweat' : known ? 'No reported lineup hazards' : 'Awaiting roster data';
      const params = new URLSearchParams(location.search);
      const selected = params.get('league') === `${row.platform}:${row.leagueId}` && params.get('year') === String(row.season);
      return <Link key={`${row.platform}:${row.leagueId}:${row.season}`} to={leagueContextHref(location.pathname, location.search, identity)} style={{ '--key-led': hazards.length ? 'var(--blood)' : close ? 'var(--gold)' : known ? 'var(--lime)' : 'var(--bone-dim)' } as import('react').CSSProperties} className={`${styles.leaguePill} ${selected ? styles.selected : ''}`}><i className={styles.statusDot} style={{ background: hazards.length ? 'var(--blood)' : close ? 'var(--gold)' : known ? 'var(--lime)' : 'var(--bone-dim)' }} aria-label={status} />{row.name}<span>· {row.platform === 'sleeper' ? 'SLP' : row.platform.toUpperCase()}</span></Link>;
    })}</nav><div className={styles.contextControls}><div id="workspace-controls" className={styles.workspaceControls} />{yearSelector}{connected && onRefresh && <button className={styles.dockButton} onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh league data"><BroadcastIcon kind="sync" /></button>}{!navLeague && <button className={styles.dockButton} onClick={() => navigate('/settings')}>Connect your league</button>}</div></div>
  </header>;
}

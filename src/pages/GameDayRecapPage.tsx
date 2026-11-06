import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { StudioTeleprompterBar } from '@/components/StudioTeleprompterBar';
import { Link } from 'react-router-dom';
import { GameDayRecap } from '@/components/GameDayInsights';
import { useSavedLeagues } from '@/hooks/useSavedLeagues';
import { loadGameDayCache } from '@/utils/gameDayCache';
import { loadCachedLeague } from '@/utils/leagueCache';
import styles from './GameDayPage.module.css';

export function GameDayRecapPage() {
  const leagues = useSavedLeagues();
  const contexts = leagues.map(saved => {
    const snapshot = loadGameDayCache({ platform: saved.platform, id: saved.leagueId, season: saved.season });
    const metadata = loadCachedLeague(saved.platform, saved.leagueId, saved.season);
    const myTeamId = saved.teamId ?? metadata?.teams.find(team => team.isMyTeam)?.id ?? snapshot?.teams.find(team => saved.teamName && team.name === saved.teamName)?.id;
    return { saved, snapshot, myTeamId };
  });
  return <div className={`${styles.page} ${styles.dashboardPage} ${styles.recapPage}`}><div className="container"><StudioTeleprompterBar takes={["Recap desk open. Reviewing the saved weekly results.", "The tape comes from your saved Game Day snapshots."]} />
    <div className={styles.dashboardHeader}>
      <div className={styles.dashboardHeading}><h1>Game Day Recap</h1><p>Your saved weekly results</p></div>
      <Link to="/" className="btn">Back to Game Day</Link>
    </div>
    <p className={styles.hint}>Recaps update while you use Game Day. Open Game Day and refresh for the latest scores.</p>
    {!leagues.length ? <StudioMonitorFrame as="div" padded className={styles.empty}><p>No leagues connected yet.</p><Link to="/settings">Connect leagues in Settings</Link></StudioMonitorFrame>
      : <GameDayRecap contexts={contexts} feeds={{}} now={Date.now()} readOnly />}
  </div></div>;
}

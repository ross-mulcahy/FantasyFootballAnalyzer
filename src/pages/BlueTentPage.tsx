import { useMemo } from 'react';
import type { League } from '@/types';
import { LeagueLink } from '@/components/LeagueLink';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { StudioTeleprompterBar } from '@/components/StudioTeleprompterBar';
import { TeamLink } from '@/components';
import { completedMatchups } from '@/utils/completedMatchups';
import { leagueInjuryLuck } from '@/utils/leagueInjuryLuck';
import styles from './BlueTentPage.module.css';

const points = (value: number) => value.toFixed(1);

export function BlueTentPage({ league }: { league: League }) {
  const finished = useMemo(() => completedMatchups(league), [league]);
  const weeks = useMemo(() => [...new Set(finished.map(game => game.week))].sort((a, b) => a - b), [finished]);
  const injuries = useMemo(() => leagueInjuryLuck(league, weeks), [league, weeks]);
  const ranked = useMemo(() => [...injuries].sort((a, b) => b.valueLost - a.valueLost || b.gamesMissed - a.gamesMissed), [injuries]);
  const nameOf = useMemo(() => new Map(league.teams.map(team => [team.id, team.name])), [league.teams]);
  const allPlayers = ranked.flatMap(team => team.players.map(player => ({ ...player, teamId: team.teamId })));
  const topPlayer = [...allPlayers].sort((a, b) => b.valueLost - a.valueLost)[0];
  const total = ranked.reduce((sum, team) => sum + team.valueLost, 0);
  const top = ranked[0];
  const weekCosts = new Map<number, number>();
  for (const player of allPlayers) {
    const perWeek = player.weeksMissed ? player.valueLost / player.weeksMissed : 0;
    for (const week of player.missedWeeks) weekCosts.set(week, (weekCosts.get(week) ?? 0) + perWeek);
  }
  const maxWeekCost = Math.max(1, ...weekCosts.values());
  const takes = top && top.valueLost > 0
    ? [
      `${nameOf.get(top.teamId) ?? 'One team'} has taken the biggest estimated hit: ${points(top.valueLost)} points over replacement across ${top.gamesMissed} missed player games.`,
      topPlayer ? `${topPlayer.name} leads the medical board at ${points(topPlayer.valueLost)} estimated points lost over ${topPlayer.weeksMissed} missed games.` : 'The medical board is quiet.',
      `We have ${ranked.length} teams on this board. These are availability estimates, not proof that an injury changed a result.`,
    ]
    : ['The Blue Tent is monitoring the league. No above-replacement missed games are identified in the available season data.'];

  return <div className={styles.page}><div className="container">
    <header className={styles.heading}>
      <div><span className={styles.kicker}>STUDIO MEDICAL REPORT // SEASON {league.season}</span><h1>THE BLUE TENT</h1><p><LeagueLink league={league}>{league.name}</LeagueLink> · {weeks.length} completed {weeks.length === 1 ? 'week' : 'weeks'}</p></div>
      <span className={styles.signal}>AVAILABILITY WATCH</span>
    </header>
    <StudioTeleprompterBar league={league} takes={takes} />
    {ranked.length === 0 ? <StudioMonitorFrame as="section" channelCode="MED 00" title="NO SEASON SIGNAL" padded className={styles.empty}>
      <p>This league does not have enough completed-week, player-game, and acquisition history for a fair comparison. Try refreshing its data; the report stays empty if coverage is unavailable.</p>
    </StudioMonitorFrame> : <>
      <div className={styles.stats}>
        <StudioMonitorFrame channelCode="MED 01" title="HEAVIEST HIT" padded><strong>{top && top.valueLost > 0 ? nameOf.get(top.teamId) : 'No losses recorded'}</strong><span>{top && top.valueLost > 0 ? `${points(top.valueLost)} estimated pts` : '0.0 estimated pts'}</span></StudioMonitorFrame>
        <StudioMonitorFrame channelCode="MED 02" title="BIGGEST ABSENCE" padded><strong>{topPlayer?.name ?? 'No player yet'}</strong><span>{topPlayer ? `${topPlayer.weeksMissed} missed · ${points(topPlayer.valueLost)} pts` : 'No above-replacement miss'}</span></StudioMonitorFrame>
        <StudioMonitorFrame channelCode="MED 03" title="LEAGUE-WIDE COST" padded><strong>{points(total)} POINTS</strong><span>Estimated above replacement · {allPlayers.reduce((sum, player) => sum + player.weeksMissed, 0)} player games</span></StudioMonitorFrame>
      </div>
      <StudioMonitorFrame as="section" aria-label="Injury cost rankings" channelCode="TAPE 01" title="WHO TOOK THE BIGGEST HIT?" badge="SEASON RANKINGS" className={styles.board}>
        <div className={styles.list}>
          {ranked.map((team, index) => {
            const starts = new Map<string, number>();
            for (const lineup of league.weeklyLineups ?? []) {
              if (lineup.teamId !== team.teamId || !weeks.includes(lineup.week)) continue;
              for (const player of lineup.starters) if (player) starts.set(player.id, (starts.get(player.id) ?? 0) + 1);
            }
            return <details className={styles.team} key={team.teamId}>
              <summary><span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span><span className={styles.teamName}><TeamLink teamId={team.teamId} name={nameOf.get(team.teamId) ?? 'Unknown team'} /></span><span className={styles.bar} aria-hidden="true"><i style={{ width: `${top?.valueLost ? team.valueLost / top.valueLost * 100 : 0}%` }} /></span><span className={styles.cost}>{points(team.valueLost)} <small>PTS</small></span><span className={styles.games}>{team.gamesMissed} MISSED</span><span className={styles.expand} aria-hidden="true">⌄</span></summary>
              <div className={styles.details}>{team.players.length ? team.players.map(player => <div className={styles.player} key={player.playerId}>
                <div><b>{player.name}</b><span>{player.position} · {player.acquisition === 'both' ? 'drafted + reclaimed' : player.acquisition === 'waiver' ? 'waiver / free agent' : 'drafted'} · {starts.get(player.playerId) ?? 0} recorded starts · {player.weeksMissed} missed {player.weeksMissed === 1 ? 'game' : 'games'}{player.outThisWeek ? ' · OUT THIS WEEK' : ''}</span></div>
                <div className={styles.weeks}>{player.missedWeeks.map(week => <span key={week}>WK {week}</span>)}</div>
                <strong>−{points(player.valueLost)} PTS</strong>
              </div>) : <p>No above-replacement missed games recorded for this team.</p>}</div>
            </details>;
          })}
        </div>
      </StudioMonitorFrame>
      {!!weekCosts.size && <StudioMonitorFrame as="section" channelCode="TAPE 02" title="WHEN THE TENT FILLED UP" className={styles.timeline} padded>
        <div className={styles.weekGrid}>{[...weekCosts].sort(([a], [b]) => a - b).map(([week, cost]) => <div className={styles.week} key={week}><span>WK {week}</span><div aria-label={`Week ${week}: ${points(cost)} estimated points lost`}><i style={{ height: `${Math.max(6, cost / maxWeekCost * 100)}%` }} /></div><b>{points(cost)}</b></div>)}</div>
      </StudioMonitorFrame>}
    </>}
    <p className={styles.method}>The estimate covers drafted players and waiver or free-agent pickups during the weeks each team owned them. Only absences after their first game in that ownership spell count; byes and weeks after a drop are excluded. Cost = missed games × points per played game above a league-specific replacement. Historical absences can include non-injury reasons; only a current OUT report is confirmed as an injury flag. It does not claim those points or wins would have occurred. Zero-point games count as played when the games-played feed is available. Players who never appeared and trade acquisitions are outside this estimate.</p>
  </div></div>;
}

import { useState } from 'react';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { isStartingSlot } from '@/utils/playerWeek';
import { PixelStudioIcon } from '@/components/PixelStudioIcon';
import { useMemo } from 'react';
import type { League, Team } from '@/types';
import type { RosterTeam } from '@/types/gameDay';
import { NflTeamChip, PosBadge } from '@/components';
import { getGradeDisplayText } from '@/utils/grading';
import { gradeLeaguePicks } from '@/utils/consensusGrade';
import { POOL } from '@/data/draftPool';
import { calculateAllAwards } from '@/utils/awards';
import { calculateLuckMetrics, type MatchupData } from '@/utils/luck';
import { completedMatchups } from '@/utils/completedMatchups';
import { isPlaceholderPlayer } from '@/utils/placeholders';
import styles from './TeamDetail.module.css';

interface TeamDetailProps {
  league: League;
  team: Team;
  onBack: () => void;
  currentRoster?: RosterTeam | null;
}

// One team's whole season on a single screen: weekly scores, draft, trades,
// waivers, head-to-head vs everyone, and the hardware they collected.
// Reached by clicking any team name across the app.
export function TeamDetail({ league, team, onBack, currentRoster }: TeamDetailProps) {
  const weekly = useMemo(() => {
    const rows: Array<{ week: number; points: number; oppPoints: number; oppName: string; won: boolean }> = [];
    for (const m of completedMatchups(league)) {
      const isTeam1 = m.team1Id === team.id;
      const isTeam2 = m.team2Id === team.id;
      if (!isTeam1 && !isTeam2) continue;
      const points = isTeam1 ? m.team1Points : m.team2Points;
      const oppPoints = isTeam1 ? m.team2Points : m.team1Points;
      if (points === 0 && oppPoints === 0) continue;
      const oppId = isTeam1 ? m.team2Id : m.team1Id;
      rows.push({
        week: m.week,
        points,
        oppPoints,
        oppName: league.teams.find(t => t.id === oppId)?.name ?? `Team ${oppId}`,
        won: points > oppPoints,
      });
    }
    return rows.sort((a, b) => a.week - b.week);
  }, [league, team.id]);

  const gradedPicks = useMemo(
    () =>
      gradeLeaguePicks(league, POOL).filter(
        p => p.teamId === team.id && !isPlaceholderPlayer(p.player.name),
      ),
    [league, team.id],
  );

  const trades = useMemo(
    () => (league.trades ?? []).filter(t => t.teams.some(side => side.teamId === team.id)),
    [league.trades, team.id],
  );

  const pickups = useMemo(
    () =>
      (team.transactions ?? [])
        .filter(tx => tx.type === 'waiver' || tx.type === 'free_agent')
        .flatMap(tx => tx.adds.map(player => ({ tx, player })))
        .filter(({ player }) => !isPlaceholderPlayer(player.name))
        .sort((a, b) => (b.player.pointsAboveReplacement ?? 0) - (a.player.pointsAboveReplacement ?? 0))
        .slice(0, 12),
    [team.transactions],
  );

  const h2h = useMemo(() => {
    const records = new Map<string, { w: number; l: number; t: number; pf: number; pa: number }>();
    for (const m of completedMatchups(league)) {
      const isTeam1 = m.team1Id === team.id;
      const isTeam2 = m.team2Id === team.id;
      if (!isTeam1 && !isTeam2) continue;
      const my = isTeam1 ? m.team1Points : m.team2Points;
      const opp = isTeam1 ? m.team2Points : m.team1Points;
      if (my === 0 && opp === 0) continue;
      const oppId = isTeam1 ? m.team2Id : m.team1Id;
      const rec = records.get(oppId) ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
      if (my > opp) rec.w++;
      else if (my < opp) rec.l++;
      else rec.t++;
      rec.pf += my;
      rec.pa += opp;
      records.set(oppId, rec);
    }
    return [...records.entries()]
      .map(([oppId, rec]) => ({
        oppId,
        oppName: league.teams.find(t => t.id === oppId)?.name ?? `Team ${oppId}`,
        ...rec,
      }))
      .sort((a, b) => b.w + b.l + b.t - (a.w + a.l + a.t));
  }, [league, team.id]);

  const awards = useMemo(() => {
    const matchupData: MatchupData[] = completedMatchups(league).map(m => ({
      week: m.week,
      team1Id: m.team1Id,
      team1Points: m.team1Points,
      team2Id: m.team2Id,
      team2Points: m.team2Points,
    }));
    const luck =
      matchupData.length > 0
        ? calculateLuckMetrics(
            matchupData,
            league.teams.map(t => ({
              id: t.id,
              name: t.name,
              wins: t.wins || 0,
              losses: t.losses || 0,
              ties: t.ties || 0,
              pointsFor: t.pointsFor || 0,
            })),
            10,
            { medianMatchup: league.hasMedianMatchup },
          )
        : undefined;
    return calculateAllAwards({ league, luckMetrics: luck }).filter(
      a => a.winner.teamId === team.id,
    );
  }, [league, team.id]);

  // A compact, honest five-week scoring trend; snap and target history is not
  // supplied by the league providers, so we never imply that this measures usage.
  const sparkline = useMemo(() => {
    if (weekly.length < 2) return null;
    const recent = weekly.slice(-5);
    const w = 120;
    const h = 28;
    const max = Math.max(...recent.map(r => r.points));
    const min = Math.min(...recent.map(r => r.points));
    const span = Math.max(1, max - min);
    const step = w / (recent.length - 1);
    const points = recent
      .map((r, i) => `${(i * step).toFixed(1)},${(h - ((r.points - min) / span) * (h - 8) - 4).toFixed(1)}`)
      .join(' ');
    return { w, h, points, max, min, recent };
  }, [weekly]);

  const [tapeMinimized, setTapeMinimized] = useState(false);
  const [tapeClosed, setTapeClosed] = useState(false);
  const rank = typeof team.wins === 'number' ? [...league.teams].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.pointsFor ?? 0) - (a.pointsFor ?? 0)).findIndex(t => t.id === team.id) + 1 : null;
  const roster = currentRoster?.roster;
  const rosterRow = (player: NonNullable<RosterTeam['roster']>[number], index: number) => <li key={`${player.id}-${index}`} className={styles.rosterRow}><span className={styles.slot}>{player.slot}</span>{player.position && <PosBadge pos={player.position} />}<span className={styles.playerIdentity}><span className={styles.playerName} title={player.name}>{player.name}</span>{player.nflTeam && <NflTeamChip team={player.nflTeam} />}</span><span className={styles.rosterNumbers}><strong>{typeof player.points === 'number' ? player.points.toFixed(2) : '—'}</strong><small>PROJ {typeof player.projection === 'number' ? player.projection.toFixed(2) : '—'}</small></span></li>;
  return <div className={styles.detail}>
    <button type="button" className={styles.backBtn} onClick={onBack}>← All Teams</button>
    <div className={styles.consoles}>
      <StudioMonitorFrame className={styles.lineupConsole} channelCode="LINEUP 01" title="STARTING LINEUP & TAXI SQUAD"><section className={styles.lineup} aria-labelledby="current-roster-heading"><h3 id="current-roster-heading" className="visually-hidden">Current Roster</h3>{roster == null ? <p className={styles.note}>{currentRoster === undefined ? 'Waiting for a current roster snapshot. Season analysis remains available in the tape room.' : "This team's current roster was not returned by the platform."}</p> : !roster.length ? <p className={styles.note}>This roster is empty.</p> : <><ul className={styles.rosterList}>{roster.filter(player => isStartingSlot(player.slot)).map(rosterRow)}</ul>{roster.some(player => !isStartingSlot(player.slot)) && <><div className={styles.benchDivider}>BENCH // THE PINE</div><ul className={styles.rosterList}>{roster.filter(player => !isStartingSlot(player.slot)).map(rosterRow)}</ul></>}</>}</section></StudioMonitorFrame>
      {tapeClosed ? <div className={styles.restore}><p>Tape room closed.</p><button className="studio-key" onClick={() => setTapeClosed(false)}>RESTORE SCOTT'S TAPE ROOM</button></div> : <StudioMonitorFrame className={styles.tapeConsole} channelCode="TAPE 02" title="SCOTT'S TAPE ROOM" controls={<div className={styles.windowControls}><button onClick={() => setTapeMinimized(!tapeMinimized)} aria-label={tapeMinimized ? "Expand Scott's tape room" : "Minimise Scott's tape room"} aria-expanded={!tapeMinimized}>{tapeMinimized ? '[ + ]' : '[ − ]'}</button><button onClick={() => setTapeClosed(true)} aria-label="Close Scott's tape room">[ X ]</button></div>}><div hidden={tapeMinimized}>
        <header className={styles.teamHeader}><PixelStudioIcon kind="award" size={28} /><div><h2>{team.name}</h2><p>{team.wins ?? '—'}-{team.losses ?? '—'}{team.ties ? `-${team.ties}` : ''}{rank !== null ? ` (#${rank})` : ''} · {team.pointsFor?.toFixed(1) ?? '—'} PF</p>{team.ownerName && <small>{team.ownerName}</small>}</div></header>
        {awards.length > 0 && <div className={styles.awardStrip}>{awards.slice(0, 3).map(a => <span key={a.id} title={a.description}><PixelStudioIcon kind="award" />{a.name}</span>)}{awards.length > 3 && <details><summary>+{awards.length - 3} commendations</summary>{awards.slice(3).map(a => <span key={a.id} title={a.description}>{a.name}</span>)}</details>}</div>}
        <section className={styles.weeklyPanel}><h3>WEEKLY SCORES // LAST 5 WEEKS</h3>{sparkline ? <><div className={styles.oscilloscope}><svg viewBox={`0 0 ${sparkline.w} ${sparkline.h}`} className={styles.sparkline} preserveAspectRatio="none" role="img" aria-label={`Weekly points from ${sparkline.min.toFixed(0)} to ${sparkline.max.toFixed(0)}`}><polyline points={sparkline.points} fill="none" stroke="#4ade80" strokeWidth="2" /></svg></div><div className={styles.weekRow}>{sparkline.recent.map(r => <span key={r.week} className={r.won ? styles.weekWin : styles.weekLoss} title={`Week ${r.week}: ${r.points.toFixed(1)}-${r.oppPoints.toFixed(1)} vs ${r.oppName}`}>[{r.won ? 'W' : r.points === r.oppPoints ? 'T' : 'L'}]</span>)}</div></> : <p className={styles.note}>The scope needs at least two completed weekly scores.</p>}</section>
        <section className={styles.draftAudit}><h3>DRAFT AUDIT</h3>{gradedPicks.length ? <ul>{gradedPicks.map(pick => <li key={`${pick.pickNumber}-${pick.player.id}`}><div><strong>{pick.player.name}</strong><span><PosBadge pos={pick.player.position} /><NflTeamChip team={pick.player.team} /><small>{pick.auctionValue ? `$${pick.auctionValue}` : `${pick.round}.${String(((pick.pickNumber - 1) % (league.totalTeams || 12)) + 1).padStart(2, '0')}`}</small></span></div><span className={`${styles.stamp} ${styles[pick.grade]} ${pick.pending || pick.isKeeper ? styles.pendingStamp : ''}`} title={pick.isKeeper ? 'Keeper: no reach or steal verdict' : pick.pending ? 'Awaiting results' : getGradeDisplayText(pick.grade)}>{pick.isKeeper ? 'KEEPER' : pick.pending ? 'PENDING' : { great: 'DRAFT STEAL', good: 'SOLID PICK', bad: 'REACH', terrible: 'TOTAL BUST' }[pick.grade]}</span></li>)}</ul> : <p className={styles.note}>No draft picks were returned for this team.</p>}</section>
      {pickups.length > 0 && <section className={styles.draftAudit}><h3>BEST PICKUPS</h3><ul>{pickups.map(({ tx, player }) => <li key={`${tx.id}-${player.id}`}><div><strong>{player.name}</strong><span><PosBadge pos={player.position} /><NflTeamChip team={player.team} /><small>W{tx.week}</small></span></div><span className={`${styles.stamp} ${typeof player.pointsAboveReplacement !== 'number' ? styles.pendingStamp : player.pointsAboveReplacement >= 0 ? styles.great : styles.terrible}`}>{typeof player.pointsAboveReplacement === 'number' ? `${player.pointsAboveReplacement >= 0 ? '+' : ''}${player.pointsAboveReplacement.toFixed(1)} PAR` : 'PAR PENDING'}</span></li>)}</ul></section>}

      </div></StudioMonitorFrame>}
    </div>
    <div className={styles.telemetryExtras}>
      {h2h.length > 0 && <StudioMonitorFrame padded title="VS THE LEAGUE"><ul>{h2h.map(rec => <li key={rec.oppId}><span>{rec.oppName}</span><strong className={rec.w > rec.l ? styles.recGood : rec.l > rec.w ? styles.recBad : ''}>{rec.w}-{rec.l}{rec.t > 0 ? `-${rec.t}` : ''}</strong><small>{rec.pf.toFixed(0)}-{rec.pa.toFixed(0)}</small></li>)}</ul></StudioMonitorFrame>}

      {trades.length > 0 && <StudioMonitorFrame padded title="TRADES"><ul>{trades.map(trade => { const side = trade.teams.find(s => s.teamId === team.id)!; const net = side.netPAR ?? side.netValue ?? 0; return <li key={trade.id}><small>W{trade.week}</small><span>got {side.playersReceived.map(p => p.name).join(', ') || 'picks'}</span><strong className={net >= 0 ? styles.recGood : styles.recBad}>{net >= 0 ? '+' : ''}{net.toFixed(1)} PAR</strong></li>; })}</ul></StudioMonitorFrame>}
    </div>
  </div>;
}

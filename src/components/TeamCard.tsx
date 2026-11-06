import { StudioMonitorFrame } from './StudioMonitorFrame';
import { outlierHeatmap } from '@/utils/outlierHeatmap';
import type { League, Team } from '@/types';
import type { LuckMetrics } from '@/utils/luck';
import { useMemo } from 'react';
import { calculateDraftSummary } from '@/utils/grading';
import { gradeLeaguePicks, hasSeasonResults } from '@/utils/consensusGrade';
import { POOL } from '@/data/draftPool';
import { isPlaceholderPlayer } from '@/utils/placeholders';
import { LuckIcon } from './LuckIcon';
import styles from './TeamCard.module.css';

interface TeamCardProps {
  league: League;
  team: Team;
  onClick?: () => void;
  luckMetrics?: LuckMetrics;
}

export function TeamCard({ league, team, onClick, luckMetrics }: TeamCardProps) {
  // Grade this team's picks against the real league (a hand-built stand-in
  // here once forced snake/PPR onto auction leagues and graded every pick
  // wrong). gradeLeaguePicks also swaps in consensus ranks pre-season.
  const { gradedPicks, valuesInDollars } = useMemo(() => {
    const allGraded = gradeLeaguePicks(league, POOL);
    // Whether the values are dollar deltas is a LEAGUE-wide fact: grading
    // switched on all picks, so deciding from this team's subset would
    // disagree with it. hasSeasonResults now needs most of the board to have
    // played, but the subsets still diverge - a team whose starters all played
    // early can clear the bar while the league has not.
    const dollars =
      !hasSeasonResults(allGraded, league) &&
      (league.draftType === 'auction' || allGraded.some(p => (p.auctionValue ?? 0) > 0));
    return {
      // Filter to this team's picks and exclude unknown players (e.g., "Player 12345")
      gradedPicks: allGraded.filter(
        pick => pick.teamId === team.id && !isPlaceholderPlayer(pick.player.name),
      ),
      valuesInDollars: dollars,
    };
  }, [league, team.id]);

  const summary = useMemo(() => calculateDraftSummary(gradedPicks), [gradedPicks]);

  // Calculate waiver stats. PAR, not raw points: every other waiver surface
  // standardized on points above replacement.
  const waiverStats = useMemo(() => {
    const transactions = team.transactions || [];
    const waiverPickups = transactions.filter(tx => tx.type === 'waiver' || tx.type === 'free_agent');
    const totalPAR = waiverPickups.reduce(
      (sum, tx) =>
        sum + tx.adds.reduce((s, player) => s + (player.pointsAboveReplacement ?? 0), 0),
      0,
    );
    return {
      count: waiverPickups.reduce((sum, tx) => sum + tx.adds.length, 0),
      totalPAR,
    };
  }, [team]);

  // Top three scorers FOR THIS TEAM. With weekly lineups (every platform),
  // that's points scored while on this roster: a waiver add's season total
  // includes weeks he spent elsewhere (Kalif Raymond read 51.4 for a team
  // he'd scored 2.6 for). Without them, the current roster's season totals.
  const topScorers = useMemo(() => {
    const lineups = (league.weeklyLineups ?? []).filter(l => l.teamId === team.id);
    if (lineups.length > 0) {
      const byId = new Map<string, { id: string; name: string; points: number }>();
      for (const l of lineups) {
        for (const p of [...l.starters, ...l.bench]) {
          if (!p || isPlaceholderPlayer(p.name)) continue;
          const row = byId.get(p.id) ?? { id: p.id, name: p.name, points: 0 };
          row.points += p.points;
          byId.set(p.id, row);
        }
      }
      return [...byId.values()].sort((a, b) => b.points - a.points).slice(0, 3);
    }
    return [...(team.roster ?? [])]
      .filter(p => !isPlaceholderPlayer(p.name))
      .map(p => ({ id: p.id, name: p.name, points: p.seasonPoints ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
  }, [league.weeklyLineups, team.id, team.roster]);

  const rank = [...league.teams].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.pointsFor ?? 0) - (a.pointsFor ?? 0)).findIndex(t => t.id === team.id) + 1;
  const positions = ['QB', 'RB', 'WR', 'TE'].map(pos => { const scored = (team.roster ?? []).filter(player => player.position === pos && typeof player.seasonPoints === 'number'); return { pos, points: scored.length ? scored.reduce((sum, player) => sum + player.seasonPoints!, 0) : null }; });
  const maxPosition = Math.max(1, ...positions.map(p => p.points ?? 0));
  const pfHeat = outlierHeatmap(league.teams.map(t => t.pointsFor));
  return <StudioMonitorFrame as="article" className={styles.card} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } } : undefined}>
    <header className={styles.header}>
      <svg className={styles.shield} viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2 3 8v16c0 9 17 18 17 18s17-9 17-18V8z" fill="var(--ink-3)" stroke="var(--rule)" /><text x="20" y="26" textAnchor="middle" fill="var(--lime)" fontSize="13" fontWeight="800">{team.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</text></svg>
      <div className={styles.headerInfo}><h3 className={styles.teamName}>{team.name}</h3><span className={styles.ownerName}>{team.ownerName || 'Manager unlisted'}</span></div>
      <div className={styles.record}><strong>{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}</strong><span>RANK {rank}</span></div>
    </header>
    <dl className={styles.stats}>
      <div className={pfHeat(team.pointsFor)}><dt>PF</dt><dd>{team.pointsFor?.toFixed(1) ?? '—'}</dd></div><div><dt>PA</dt><dd>{team.pointsAgainst?.toFixed(1) ?? '—'}</dd></div>
      <div><dt>ALL-PLAY</dt><dd>{luckMetrics ? `${luckMetrics.allPlayWins}-${luckMetrics.allPlayLosses}` : '—'}</dd></div>
      <div><dt>MOVES</dt><dd>{team.transactions?.length ?? '—'}</dd></div>
    </dl>
    <section className={styles.section}><h4>POSITIONAL STRENGTH // ROSTER POINTS</h4>{positions.map(({ pos, points }) => <div className={styles.position} key={pos}><span>{pos}</span><div role="meter" aria-label={`${pos} roster points relative to strongest position`} aria-valuemin={0} aria-valuemax={maxPosition} aria-valuenow={points ?? 0} aria-valuetext={points === null ? 'Unavailable' : `${points.toFixed(1)} points`} className={styles.segments}>{Array.from({ length: 10 }, (_, index) => <i key={index} data-lit={points !== null && index < Math.round(Math.max(0, points) / maxPosition * 10)} />)}</div><strong>{points?.toFixed(1) ?? '—'}</strong></div>)}</section>
    <p className={styles.returns}>WAIVER PAR {waiverStats.totalPAR >= 0 ? '+' : ''}{waiverStats.totalPAR.toFixed(1)} · {waiverStats.count} ADDS · AVG DRAFT {summary.totalPicks ? `${valuesInDollars ? '$' : ''}${summary.averageValue.toFixed(1)}` : '—'}</p>
    <section className={styles.section}><h4>DRAFT // VALUE DISTRIBUTION</h4><div className={styles.grades}>{([['League winner', summary.great], ['Solid value', summary.good], ['Reach', summary.bad], ['Roster clogger', summary.terrible]] as const).map(([label, count]) => <span key={label}>{label}<b>{count}</b></span>)}</div></section>
    <section className={styles.section}><h4>TOP THREE // SCORERS</h4><ul className={styles.topScorers}>{topScorers.map(player => <li key={player.id}><span>{player.name}</span><strong>{player.points.toFixed(1)}</strong></li>)}</ul>{!topScorers.length && <p>No player scoring data returned.</p>}</section>
    {luckMetrics && <footer className={styles.luck}><span><LuckIcon rating={luckMetrics.luckRating} /> {luckMetrics.luckScore >= 0 ? '+' : ''}{luckMetrics.luckScore.toFixed(1)} luck</span><span>{luckMetrics.expectedWins.toFixed(1)} expected W</span><span>{luckMetrics.allPlayWins}-{luckMetrics.allPlayLosses} all-play</span></footer>}
  </StudioMonitorFrame>;
}

import type { League, Team } from '@/types';
import { completedMatchups } from './completedMatchups';
import { calculateLuckMetrics } from './luck';
import { gradeLeaguePicks } from './consensusGrade';
import { POOL } from '@/data/draftPool';
export type StudioView = 'overview' | 'rosters' | 'teams' | 'draft' | 'trades' | 'waivers' | 'luck' | 'awards' | 'history' | 'players';
export function studioPageTakes(league: League | undefined, view: StudioView, team?: Team): string[] {
  if (!league) return ['Studio feed open. Pick a league to put your front office on the record.', 'No league signal yet. The studio coffee remains aggressively available.'];
  const fallback = `${league.name} · ${league.season}. ${league.teams.length} franchises on the studio wall. The tape does not negotiate.`;
  const done = completedMatchups(league);
  if (view === 'rosters' && team) {
    const picks = gradeLeaguePicks(league, POOL).filter(p => p.teamId === team.id && !p.pending && !p.isKeeper);
    const worst = [...picks].sort((a, b) => a.valueOverExpected - b.valueOverExpected)[0];
    return [`Checking ${team.name}: ${team.wins ?? '—'}-${team.losses ?? '—'}${team.ties ? `-${team.ties}` : ''}. Let's see who is riding the pine.`, worst && worst.valueOverExpected < 0 ? `${worst.player.name} has this team's lowest draft value at ${worst.valueOverExpected.toFixed(1)} versus expectation. The scouting department has requested a closed-door meeting.` : picks.length ? `${team.name}'s graded draft has no negative value picks. The scouting staff will be insufferable.` : `${team.name}'s draft verdict is awaiting data. We do not grade a blank scouting sheet.`, fallback];
  }
  if (view === 'luck' && done.length) {
    const metrics = calculateLuckMetrics(done.map(m => ({ week: m.week, team1Id: m.team1Id, team2Id: m.team2Id, team1Points: m.team1Points, team2Points: m.team2Points })), league.teams.map(t => ({ id: t.id, name: t.name, wins: t.wins ?? 0, losses: t.losses ?? 0, ties: t.ties ?? 0, pointsFor: t.pointsFor ?? 0 })), 10, { medianMatchup: league.hasMedianMatchup });
    const sorted = [...metrics].sort((a,b) => a.luckScore - b.luckScore), low = sorted[0];
    if (low) { const names = sorted.filter(m => Math.abs(m.luckScore - low.luckScore) < 1e-9).map(m => m.teamName).join(' / '); return [`Luck audit: ${names} at ${low.luckScore.toFixed(1)} wins versus expectation, the lowest mark on this board. The schedule has been called into the studio.`, 'Expected wins use the loaded weekly results. All-play is the control experiment; the group chat is not peer review.', fallback]; }
  }
  if (view === 'trades') {
    const decided = [...(league.trades ?? [])].filter(t => t.winner && typeof t.winnerMargin === 'number' && Number.isFinite(t.winnerMargin)).sort((a,b) => Math.abs(b.winnerMargin!) - Math.abs(a.winnerMargin!));
    const trade = decided[0], winner = trade?.teams.find(t => t.teamId === trade.winner);
    return [trade && winner ? `Week ${trade.week}: ${winner.teamName} leads the largest decided trade margin at ${Math.abs(trade.winnerMargin!).toFixed(1)} PAR (${trade.verdictBasis ?? 'loaded verdict'}). Somebody is reviewing that handshake.` : `${league.trades?.length ?? 0} trades loaded for ${league.name}. No decided margin available to crown a robbery.`, 'Picks, FAAB and incomplete results can qualify a verdict. The trade desk keeps the original scoring basis on screen.', fallback];
  }
  if (view === 'waivers') {
    const adds = league.teams.flatMap(t => (t.transactions ?? []).filter(tx => tx.type === 'waiver' || tx.type === 'free_agent').flatMap(tx => tx.adds.map(p => ({ team: t.name, player: p }))));
    const best = adds.filter(a => Number.isFinite(a.player.pointsAboveReplacement)).sort((a,b) => b.player.pointsAboveReplacement! - a.player.pointsAboveReplacement!)[0];
    return [best ? `${best.team} picked up ${best.player.name}: ${best.player.pointsAboveReplacement!.toFixed(1)} PAR on the loaded waiver board. The wire has receipts.` : `${adds.length} additions loaded. Waiver returns need provider scoring before we can name a bargain.`, fallback];
  }
  if (view === 'draft') {
    const picks = gradeLeaguePicks(league, POOL).filter(p => !p.pending && !p.isKeeper), worst = [...picks].sort((a,b) => a.valueOverExpected - b.valueOverExpected)[0];
    return [worst && worst.valueOverExpected < 0 ? `${worst.teamName}'s ${worst.player.name}: ${worst.valueOverExpected.toFixed(1)} draft value versus expectation. The lowest mark on this loaded board deserves a presser.` : `${league.teams.reduce((n,t) => n + (t.draftPicks?.length ?? 0),0)} platform draft picks loaded. Pending picks stay pending; keepers get their own paperwork.`, fallback];
  }
  const leader = [...league.teams].filter(t => typeof t.wins === 'number').sort((a,b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.pointsFor ?? 0) - (a.pointsFor ?? 0))[0];
  const context: Record<StudioView,string> = { overview: 'Control room online', rosters: 'Depth chart open', teams: 'Franchise dossiers open', draft: 'Draft audit open', trades: 'Trade desk open', waivers: 'Waiver desk open', luck: 'Luck audit awaiting completed games', awards: 'Trophy cabinet open', history: 'League archive open', players: 'Player tape open' };
  return [`${context[view]} for ${league.name}. ${done.length} completed matchups on the record.`, leader ? `${leader.name}: ${leader.wins}-${leader.losses ?? 0}${leader.ties ? `-${leader.ties}` : ''}, ${leader.pointsFor?.toFixed(1) ?? '—'} points for. The standings desk is taking calls.` : 'No team record returned yet. The studio declines to invent a dynasty.', fallback];
}

import type { NFLGameStatus, NFLTimeline } from '@/api/nflTimeline';
import type { GameDaySnapshot, RosterTeam, ScoreMatchup } from '@/types/gameDay';
import type { ScoreChange } from './broadcastControl';
import { finiteScore } from './gameDayInsights';
import { matchupKey } from './gameDayLinks';
import { lineupProgress, playerGameStatus } from './matchupGameStatus';
import { normalizeName } from './playerNames';
import { isStartingSlot, lineupProjectionEstimate } from './playerWeek';
import { savedLeagueKey, type SavedLeague } from './savedLeagues';

export interface WatchScoreSwing { ownName: string; opponentName: string; beforeOwn: number; beforeOpponent: number; own: number; opponent: number; ownDelta: number; opponentDelta: number }
export interface WatchAlert { id: string; channelKey: string; at: number; kind: 'score' | 'play'; headline: string; detail: string; gameId?: string; relatedChannels?: number; playerRelevance?: 0 | 1 | 2; score?: WatchScoreSwing }
export interface WatchPlayer { id: string; name: string; position: string; nflTeam: string; points: number | null; projection: number | null; game: string }
export interface WatchSide { name: string; points: number | null; projection: string; projectedValue: number | null; assumedZero?: number; left: number | null; live: number; featured: WatchPlayer[]; featuredMode: 'scorers' | 'up next' | 'unavailable' }
export interface WatchChannel { key: string; match: ScoreMatchup; first: WatchSide; second: WatchSide; projectedGap: number | null; currentGap: number | null; priority: number; alerts: WatchAlert[]; games: NFLGameStatus[] }

/** One NFL play can reach several matchups; take it to the rostered player first. */
export function curatedWatchAlerts(channels: WatchChannel[]): WatchAlert[] {
  const unique = new Map<string, WatchAlert>();
  for (const channel of channels) for (const alert of channel.alerts) {
    const key = `${alert.kind}:${alert.gameId ?? ''}:${alert.id}`;
    const old = unique.get(key);
    if (old) {
      const relatedChannels = (old.relatedChannels ?? 1) + 1;
      if ((alert.playerRelevance ?? 0) > (old.playerRelevance ?? 0)) unique.set(key, { ...alert, relatedChannels });
      else old.relatedChannels = relatedChannels;
    }
    else unique.set(key, { ...alert, relatedChannels: 1 });
  }
  const gamesShown = new Map<string, number>();
  return [...unique.values()].sort((a, b) => b.at - a.at).filter(alert => {
    if (alert.kind === 'score' || !alert.gameId) return true;
    const count = gamesShown.get(alert.gameId) ?? 0;
    if (count >= 4) return false;
    gamesShown.set(alert.gameId, count + 1);
    return true;
  });
}

function eventPlayerRelevance(event: NFLTimeline['events'][number], teams: (RosterTeam | undefined)[], data: NFLTimeline | null): 0 | 1 | 2 {
  const opening = normalizeName(event.description.replace(/^(?:\([^)]*\)\s*)+/, ''));
  let relevance: 0 | 1 | 2 = 0;
  for (const team of teams) for (const player of team?.roster ?? []) {
    if (player.id === '0' || playerGameStatus(player.nflTeam, data)?.id !== event.gameId) continue;
    const name = normalizeName(player.name);
    if (name && opening.startsWith(`${name} `)) relevance = isStartingSlot(player.slot) ? 2 : Math.max(relevance, 1) as 1 | 2;
  }
  return relevance;
}

function projection(team: RosterTeam | undefined, provider: number | null | undefined): { value: number | null; label: string; assumedZero: number } {
  if (finiteScore(provider)) return { value: provider, label: provider.toFixed(2), assumedZero: 0 };
  const estimate = lineupProjectionEstimate(team);
  return { value: estimate.value, label: estimate.value === null ? 'pending' : `${estimate.value.toFixed(2)}${estimate.assumedZero ? ` est. (${estimate.assumedZero} × 0)` : ''}`, assumedZero: estimate.assumedZero };
}

export function leagueWatchChannels(saved: SavedLeague, snapshot: GameDaySnapshot | null, data: NFLTimeline | null, changes: ScoreChange[], now: number): WatchChannel[] {
  if (!snapshot) return [];
  const leaguePrefix = `${savedLeagueKey(saved)}:${snapshot.week}:`;
  return snapshot.matchups.map((match, index) => {
    const key = matchupKey(match);
    const firstTeam = snapshot.teams.find(team => team.id === match.team1Id);
    const secondTeam = snapshot.teams.find(team => team.id === match.team2Id);
    const firstProjection = projection(firstTeam, match.team1Projection);
    const secondProjection = projection(secondTeam, match.team2Projection);
    const side = (team: RosterTeam | undefined, points: number | null, projected: { value: number | null; label: string; assumedZero: number }): WatchSide => {
      const progress = lineupProgress(team, data);
      const starters = team?.roster?.filter(player => player.id !== '0' && isStartingSlot(player.slot)) ?? [];
      const scorers = starters.filter(player => finiteScore(player.points) && player.points !== 0);
      const featuredMode = scorers.length ? 'scorers' : starters.length ? 'up next' : 'unavailable';
      const featured = (scorers.length ? scorers : starters).sort((a, b) => {
        const value = (player: typeof a) => featuredMode === 'scorers' ? player.points ?? 0 : player.projection ?? -1;
        return value(b) - value(a);
      }).slice(0, 2).map(player => {
        const game = playerGameStatus(player.nflTeam, data);
        const liveClock = game?.quarter ? `Q${game.quarter}${game.clock ? ` ${game.clock}` : ''}` : game?.detail || 'LIVE';
        const gameLabel = game?.state === 'in' ? `${game.name} · ${liveClock}` : game?.state === 'post' ? `${game.name} · FINAL` : game?.state === 'pre' ? `${game.name} · UPCOMING` : 'NFL STATUS PENDING';
        return { id: player.id, name: player.name, position: player.position, nflTeam: player.nflTeam,
          points: finiteScore(player.points) ? player.points : null, projection: finiteScore(player.projection) ? player.projection : null, game: gameLabel };
      });
      return { name: team?.name ?? 'Awaiting opponent', points, projection: projected.label, projectedValue: projected.value, assumedZero: projected.assumedZero,
        left: progress && !progress.unknown ? progress.inPlay + progress.toPlay : null, live: progress?.inPlay ?? 0, featured, featuredMode };
    };
    const involvedGames = new Set([firstTeam, secondTeam].flatMap(team => team?.roster?.filter(player => player.id !== '0' && isStartingSlot(player.slot)).map(player => playerGameStatus(player.nflTeam, data)?.id).filter((id): id is string => !!id) ?? []));
    const scoreAlerts: WatchAlert[] = changes.filter(change => change.id.startsWith(`${leaguePrefix}${key}:`)).map(change => ({
      id: change.id, channelKey: key, at: change.at, kind: 'score', headline: `SCORE SWING // ${Math.abs(change.ownDelta - change.opponentDelta).toFixed(2)} PTS`,
      detail: `${change.ownName} ${change.ownDelta >= 0 ? '+' : ''}${change.ownDelta.toFixed(2)} · ${change.opponentName} ${change.opponentDelta >= 0 ? '+' : ''}${change.opponentDelta.toFixed(2)} between provider refreshes.`,
      score: { ownName: change.ownName, opponentName: change.opponentName, beforeOwn: change.beforeOwn, beforeOpponent: change.beforeOpponent,
        own: change.own, opponent: change.opponent, ownDelta: change.ownDelta, opponentDelta: change.opponentDelta },
    }));
    const playAlerts: WatchAlert[] = (data?.events ?? []).flatMap(event => {
      const playerRelevance = eventPlayerRelevance(event, [firstTeam, secondTeam], data);
      if (!involvedGames.has(event.gameId) && !playerRelevance) return [];
      return [{ id: event.id, channelKey: key, at: Date.parse(event.occurredAt ?? '') || 0, kind: 'play' as const, gameId: event.gameId,
        playerRelevance, headline: `${event.game} // ${event.kind}`,
        detail: `${event.description} · ${playerRelevance ? 'Player rostered in this matchup' : 'NFL game involving starters in this matchup'}; fantasy impact unconfirmed.`,
      }];
    });
    const games = (data?.games ?? []).filter(game => involvedGames.has(game.id) || playAlerts.some(alert => alert.gameId === game.id));
    const alerts = [...scoreAlerts, ...playAlerts].sort((a, b) => b.at - a.at);
    const projectedGap = firstProjection.value !== null && secondProjection.value !== null && match.team2Id ? Math.abs(firstProjection.value - secondProjection.value) : null;
    const currentGap = finiteScore(match.team1Points) && finiteScore(match.team2Points) && (match.team1Points > 0 || match.team2Points > 0) ? Math.abs(match.team1Points - match.team2Points) : null;
    const freshScore = scoreAlerts.some(alert => alert.at > 0 && now - alert.at >= 0 && now - alert.at < 2 * 60000);
    const freshPlay = playAlerts.some(alert => alert.at > 0 && now - alert.at >= 0 && now - alert.at < 2 * 60000);
    const first = side(firstTeam, match.team1Points, firstProjection);
    const second = side(secondTeam, match.team2Points, secondProjection);
    const finished = first.left === 0 && second.left === 0;
    const priority = (freshScore ? 1000 : freshPlay ? 700 : 0) + (currentGap !== null && currentGap <= 10 ? 300 - currentGap : projectedGap !== null && projectedGap <= 10 ? 150 - projectedGap : 0) + (first.live + second.live) * 3 - (finished ? 500 : 0) - index / 100;
    return { key, match, first, second, projectedGap, currentGap, priority, alerts, games };
  }).sort((a, b) => b.priority - a.priority);
}

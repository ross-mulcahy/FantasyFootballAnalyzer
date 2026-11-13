import type { NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from './sharedPlayers';
import { matchupMargin, myMatchups } from './gameDayInsights';

export type ChannelMood = 'win' | 'lose' | 'mixed' | 'neutral';
export interface ChannelOutlook { mood: ChannelMood; wins: number; losses: number; ties: number; pending: number }

/** Only the selected league contexts are passed in by the Game Day page. */
export function channelOutlook(contexts: SharedLeagueContext[], timelines: Record<string, { data: NFLTimeline | null } | undefined>): ChannelOutlook {
  const result: ChannelOutlook = { mood: 'neutral', wins: 0, losses: 0, ties: 0, pending: 0 };
  for (const context of contexts) {
    const snapshot = context.snapshot;
    const timeline = timelines[`${snapshot?.season}:${snapshot?.week}`]?.data ?? null;
    for (const matchup of myMatchups(context)) {
      // A 0–0 score before kickoff is not a loss or a tie. A live score takes
      // priority over projections as soon as a starting player's game begins.
      const margin = matchupMargin(context, matchup, 'current', timeline)
        ?? matchupMargin(context, matchup, 'projected', timeline);
      if (margin === null) result.pending += 1;
      else if (margin > 0) result.wins += 1;
      else if (margin < 0) result.losses += 1;
      else result.ties += 1;
    }
  }
  result.mood = result.wins > result.losses ? 'win'
    : result.losses > result.wins ? 'lose'
      : result.wins && result.losses ? 'mixed' : 'neutral';
  return result;
}

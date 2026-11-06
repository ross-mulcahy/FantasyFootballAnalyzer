import type { SharedLeagueContext } from './sharedPlayers';
import { matchupMargin, myMatchups, type LineupWarning, type TimelineFeeds } from './gameDayInsights';
import { matchupKey } from './gameDayLinks';
import { savedLeagueKey } from './savedLeagues';

export type StudioLiveCue = 'hazard' | 'close' | null;

type LeagueAudioState = { week: number; hazards: Set<string>; close: Set<string> };

/** Compare the last visible snapshot, never the number of poll/render passes. */
export class StudioAudioEvents {
  private readonly leagues = new Map<string, LeagueAudioState>();
  private lastHazardAt = -Infinity;
  private lastCloseAt = -Infinity;

  observe(contexts: SharedLeagueContext[], feeds: TimelineFeeds, warnings: LineupWarning[], now: number): StudioLiveCue {
    let newHazard = false;
    let newCloseGame = false;
    for (const context of contexts) {
      const snapshot = context.snapshot;
      if (!snapshot) continue;
      const key = savedLeagueKey(context.saved);
      const hazards = new Set(warnings.filter(warning => savedLeagueKey(warning.league) === key)
        .map(warning => `${warning.teamId}:${warning.message}`));
      const feed = feeds[`${snapshot.season}:${snapshot.week}`];
      const close = new Set(myMatchups(context).filter(match => {
        const margin = matchupMargin(context, match, 'projected', feed?.data ?? null);
        return margin !== null && Math.abs(margin) <= 10;
      }).map(matchupKey));
      const prior = this.leagues.get(key);
      if (prior?.week === snapshot.week) {
        if ([...hazards].some(hazard => !prior.hazards.has(hazard))) newHazard = true;
        if ([...close].some(match => !prior.close.has(match))) newCloseGame = true;
      }
      this.leagues.set(key, { week: snapshot.week, hazards, close });
    }
    if (newHazard && now - this.lastHazardAt >= 30_000) {
      this.lastHazardAt = now;
      return 'hazard';
    }
    if (newCloseGame && now - this.lastCloseAt >= 60_000) {
      this.lastCloseAt = now;
      return 'close';
    }
    return null;
  }
}

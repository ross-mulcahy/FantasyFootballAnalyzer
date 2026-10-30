import type { Platform } from './index';

export interface PlayerStat {
  label: string;
  value: number;
}

export interface RosterPlayer {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  slot: string;
  points?: number | null;
  projection?: number | null;
  stats?: PlayerStat[];
  availability?: string;
}

export interface RosterTeam {
  id: string;
  name: string;
  // null means the provider did not return a roster, not an empty roster.
  roster: RosterPlayer[] | null;
}

export interface ScoreMatchup {
  id: string;
  team1Id: string;
  team2Id: string | null;
  team1Points: number | null;
  team2Points: number | null;
  period: string;
  team1Projection?: number | null;
  team2Projection?: number | null;
}

export interface GameDaySnapshot {
  platform: Platform;
  leagueId: string;
  season: number;
  week: number;
  fetchedAt: number;
  detailVersion?: 1;
  detailWarnings?: string[];
  projectionNote?: string;
  teams: RosterTeam[];
  matchups: ScoreMatchup[];
}

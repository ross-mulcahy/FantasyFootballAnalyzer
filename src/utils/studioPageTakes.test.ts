import { expect, it } from 'vitest';
import type { League } from '@/types';
import { studioPageTakes } from './studioPageTakes';
const league: League = { id: '1', name: 'Test League', season: 2026, platform: 'sleeper', totalTeams: 2, draftType: 'snake', scoringType: 'ppr', isLoaded: true, teams: [{ id: 'a', name: 'First', wins: 0, losses: 0 }, { id: 'b', name: 'Second' }] };
it('keeps missing trade margins and draft grades explicitly unavailable', () => {
  expect(studioPageTakes(league, 'trades')[0]).toContain('No decided margin');
  expect(studioPageTakes(league, 'rosters', league.teams[0])[1]).toContain('awaiting data');
});
it('reports the largest decided trade while respecting the stored verdict basis', () => {
  const side = { teamId: 'a', teamName: 'First', playersReceived: [], playersSent: [], parGained: 20, parLost: 0, netPAR: 20, pointsGained: 20, pointsLost: 0, netValue: 20 };
  const withTrade: League = { ...league, trades: [{ id: 't', timestamp: 0, week: 3, status: 'completed', teams: [side], winner: 'a', winnerMargin: 20, verdictBasis: 'post-trade' }] };
  expect(studioPageTakes(withTrade, 'trades')[0]).toContain('First');
  expect(studioPageTakes(withTrade, 'trades')[0]).toContain('20.0 PAR (post-trade)');
});

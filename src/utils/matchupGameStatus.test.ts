import { expect, it } from 'vitest';
import { playerGameStatus, liveStatusIsStale, lineupProgress } from './matchupGameStatus';
import type { NFLTimeline } from '@/api/nflTimeline';
it('matches canonical NFL team aliases and treats old or failed status as stale', () => {
  const data: NFLTimeline = { fetchedAt: 1000, events: [], warnings: [], games: [{ id: '1', name: 'JAX @ WSH', kickoff: '', teams: ['JAC', 'WAS'], state: 'in', quarter: 2, clock: '0:00', detail: 'Halftime' }] };
  expect(playerGameStatus('JAX', data)?.state).toBe('in');
  expect(playerGameStatus('WSH', data)?.detail).toBe('Halftime');
  expect(playerGameStatus('BUF', data)).toBeUndefined();
  expect(liveStatusIsStale(data, null, 1001)).toBe(false);
  expect(liveStatusIsStale(data, null, 122000)).toBe(true);
  expect(liveStatusIsStale(data, 'Offline', 1001)).toBe(true);
});

it('counts starting players by game state without counting bench, IR, placeholders or byes as still to play', () => {
  const statuses = { fetchedAt: Date.now(), events: [], warnings: [], games: ['post', 'in', 'pre'].map((state, index) => ({ id: String(index), teams: ['BUF', 'KC', 'DET'].slice(index, index + 1), name: 'Game', kickoff: '', detail: '', quarter: 0, clock: '', state: state as 'post' | 'in' | 'pre' })) };
  const roster = ['BUF', 'KC', 'DET', 'NYJ', ''].map((nflTeam, i) => ({ id: String(i + 1), name: 'Player', position: 'WR', slot: 'WR', nflTeam }));
  expect(lineupProgress({ id: '1', name: 'Team', roster: [...roster, { ...roster[0], id: 'bench', slot: 'BN' }, { ...roster[1], id: 'ir', slot: 'IR' }, { ...roster[0], id: '0' }] }, statuses)).toEqual({ played: 1, inPlay: 1, toPlay: 1, unscheduled: 1, unknown: 1 });
  expect(lineupProgress({ id: '1', name: 'Team', roster: null }, statuses)).toBeNull();
});

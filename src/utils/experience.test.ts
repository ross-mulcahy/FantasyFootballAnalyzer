import { beforeEach, expect, it } from 'vitest';
import { prioritizeEvents, providerTeamUrl, readExperience, saveExperience } from './experience';
import { healthLabel, readConnectionHealth, recordConnectionHealth } from './connectionHealth';
import type { SharedLeagueContext } from './sharedPlayers';
import type { NFLTimeline, MajorEvent } from '@/api/nflTimeline';
const now = Date.parse('2026-11-01T18:00Z');
const contexts: SharedLeagueContext[] = ['CIN', 'DET'].map((team, index) => ({ saved: { platform: 'espn', leagueId: String(index + 1), season: 2026, name: `League ${index}` }, myTeamId: '1', snapshot: { platform: 'espn', leagueId: String(index + 1), season: 2026, week: 8, fetchedAt: now, teams: [{ id: '1', name: 'Mine', roster: [{ id: String(index + 1), name: index ? 'Amon-Ra St. Brown' : "Ja'Marr Chase", position: 'WR', nflTeam: team, slot: 'WR' }] }, { id: '2', name: 'Theirs', roster: [] }], matchups: [{ id: 'm', team1Id: '1', team2Id: '2', team1Points: 20, team2Points: index ? 80 : 18, period: 'Week 8' }] } }));
const data: NFLTimeline = { fetchedAt: now, warnings: [], events: [], games: ['CIN', 'DET'].map(team => ({ id: team, name: `${team} @ BUF`, teams: [team, 'BUF'], kickoff: '', state: 'in', quarter: 2, clock: '5:00', detail: '' })) };
const play = (id: string, gameId: string, description: string): MajorEvent => ({ id, gameId, description, game: `${gameId} @ BUF`, occurredAt: new Date(now).toISOString(), kickoff: '', quarter: 2, clock: '5:00', kind: 'Passing Touchdown' });
const events = [play('unrelated', 'CIN', 'Tee Higgins 20 Yd pass from Joe Burrow'), play('wide', 'DET', 'Amon-Ra St. Brown 10 Yd pass from Jared Goff'), play('close', 'CIN', "Ja'Marr Chase 5 Yd pass from Joe Burrow")];
beforeEach(() => localStorage.clear());
it('prioritizes close matchup impact while retaining other recent game events', () => {
  expect(prioritizeEvents(events, 'close', contexts, data, now).map(event => event.id)).toEqual(['close', 'wide', 'unrelated']);
  expect(prioritizeEvents(events, 'all', contexts, data, now)).toEqual(events);
});
it('filters to lineup impact without reversing the supplied newest-first order', () => {
  expect(prioritizeEvents(events, 'impact', contexts, data, now).map(event => event.id)).toEqual(['wide', 'close']);
  expect(prioritizeEvents([{ ...events[2], occurredAt: new Date(now - 11 * 60000).toISOString() }], 'close', contexts, data, now)).toEqual([]);
});
it('builds provider URLs using public identifiers without accepting injected URL text', () => {
  expect(providerTeamUrl({ platform: 'espn', leagueId: '761499', season: 2026 }, '12')).toBe('https://fantasy.espn.com/football/team?leagueId=761499&seasonId=2026&teamId=12');
  expect(providerTeamUrl({ platform: 'sleeper', leagueId: '1382333626993111040', season: 2026 }, '1')).toBe('https://sleeper.com/leagues/1382333626993111040/team');
  expect(providerTeamUrl({ platform: 'yahoo', leagueId: 'nfl.l.123', season: 2026 }, 'nfl.l.123.t.7')).toBe('https://football.fantasysports.yahoo.com/f1/123/7');
  expect(providerTeamUrl({ platform: 'espn', leagueId: 'javascript:alert(1)', season: 2026 })).toBeNull();
});
it('persists validated alert settings and recovers defaults from malformed storage', () => {
  saveExperience({ kickoffAlerts: false, alertPriority: 'close' }); expect(readExperience()).toEqual({ kickoffAlerts: false, alertPriority: 'close' });
  localStorage.setItem('ffa:experience:v1', 'broken'); expect(readExperience().alertPriority).toBe('all');
});
it('classifies connection failures without saving raw messages, tokens or cookies', () => {
  const league = contexts[0].saved;
  recordConnectionHealth(league, null, now); recordConnectionHealth(league, '401 cookie SECRET-CREDENTIAL', now + 1);
  const health = Object.values(readConnectionHealth())[0]; expect(health).toMatchObject({ state: 'login', lastSuccessAt: now });
  expect(localStorage.getItem('ffa:connection-health:v1')).not.toContain('SECRET-CREDENTIAL');
  expect(healthLabel(health, true)).toBe('Reconnect needed'); expect(healthLabel(health, false)).toContain('Offline');
  recordConnectionHealth(league, 'Yahoo client ID not configured'); expect(Object.values(readConnectionHealth())[0].state).toBe('setup');
  recordConnectionHealth(league, null); expect(Object.values(readConnectionHealth())[0].state).toBe('ok');
});

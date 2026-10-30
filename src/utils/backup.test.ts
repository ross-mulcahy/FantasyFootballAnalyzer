import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createBackup, parseBackup, restoreBackup, type PersonalBackup } from './backup';
import { loadSavedLeagues } from './savedLeagues';
const backup = (): PersonalBackup => ({ format: 'ffa-personal-backup', version: 1, createdAt: '2026-10-30T12:00:00Z', leagues: [{ platform: 'espn', leagueId: '123', season: 2026, name: 'League', teamId: '2' }], recaps: [], preferences: { kickoffAlerts: true, alertPriority: 'close' } });
beforeEach(() => localStorage.clear()); afterEach(() => vi.restoreAllMocks());
it('exports only approved display fields, excluding credentials even when injected into saved data', () => {
  localStorage.setItem('ffa:my-leagues:v1', JSON.stringify([{ ...backup().leagues[0], espnS2: 'SECRET' }]));
  localStorage.setItem('yahoo_access_token', 'SECRET'); localStorage.setItem('ffa:espn:remember:123', 'SECRET');
  const data = JSON.stringify(createBackup()); expect(data).not.toContain('SECRET'); expect(data).not.toContain('access_token'); expect(data).not.toContain('espnS2');
});
it('validates file type, size, dates and preferences before restoring anything', () => {
  expect(() => parseBackup('not-json')).toThrow(); expect(() => parseBackup('x'.repeat(2000001))).toThrow('2 MB');
  expect(() => parseBackup(JSON.stringify({ ...backup(), version: 99 }))).toThrow('supported');
  expect(() => parseBackup(JSON.stringify({ ...backup(), createdAt: 'bad' }))).toThrow('date');
  expect(() => parseBackup(JSON.stringify({ ...backup(), preferences: { alertPriority: 'hacked' } }))).toThrow('preferences');
  expect(loadSavedLeagues()).toEqual([]);
});
it('merges leagues without changing existing team choices or browser logins', () => {
  localStorage.setItem('ffa:my-leagues:v1', JSON.stringify([{ ...backup().leagues[0], teamId: '1' }]));
  localStorage.setItem('yahoo_access_token', 'keep-this-login');
  const data = backup(); data.leagues.push({ ...data.leagues[0], leagueId: '456', name: 'Second' });
  restoreBackup(data);
  expect(loadSavedLeagues()).toHaveLength(2); expect(loadSavedLeagues().find(league => league.leagueId === '123')?.teamId).toBe('1');
  expect(localStorage.getItem('yahoo_access_token')).toBe('keep-this-login'); expect(localStorage.getItem('ffa:browser-event-alerts:v1')).toBeNull();
});
it('sanitizes recap extras and retains per-league scores through a round trip', () => {
  const data = backup(); data.recaps = [{ key: '["espn","123",2026]:2:8:m', league: data.leagues[0], teamId: '2', season: 2026, week: 8, fetchedAt: 1000, ownName: 'Mine', opponentName: 'Theirs', ownPoints: 0, opponentPoints: 10, period: 'Week 8', saved: false, finished: true, topOwn: { name: 'Player', points: 0 }, topOpponent: null }];
  const injected = JSON.parse(JSON.stringify(data)); injected.recaps[0].token = 'SECRET'; injected.recaps[0].topOwn.cookie = 'SECRET';
  restoreBackup(parseBackup(JSON.stringify(injected)));
  expect(createBackup().recaps[0].ownPoints).toBe(0); expect(JSON.stringify(createBackup())).not.toContain('SECRET');
});
it('rolls back earlier writes when storage rejects part of the restore', () => {
  const previous = JSON.stringify([{ ...backup().leagues[0], teamId: '1' }]); localStorage.setItem('ffa:my-leagues:v1', previous);
  const original = Storage.prototype.setItem; let failed = false;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) { if (key === 'ffa:game-day-recaps:v1' && !failed) { failed = true; throw new Error('quota'); } original.call(this, key, value); });
  expect(() => restoreBackup(backup())).toThrow('Could not restore'); expect(localStorage.getItem('ffa:my-leagues:v1')).toBe(previous); expect(localStorage.getItem('ffa:experience:v1')).toBeNull();
});

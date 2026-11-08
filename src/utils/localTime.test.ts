import { expect, it } from 'vitest';
import { formatLocalDateTime, formatLocalTime, localKickoff } from './localTime';

it('displays the same NFL kickoff in the viewer time zone, including DST offsets', () => {
  const kickoff = '2026-11-08T18:00:00Z';
  expect(formatLocalTime(kickoff, { timeZone: 'Europe/Dublin', hourCycle: 'h23' })).toContain('18:00');
  expect(formatLocalTime(kickoff, { timeZone: 'America/New_York', hourCycle: 'h23' })).toContain('13:00');
  expect(formatLocalDateTime(kickoff, { timeZone: 'America/New_York', hourCycle: 'h23' })).toContain('13:00');
});

it('uses a timestamp for kickoff and preserves a fallback when none exists', () => {
  expect(localKickoff('2026-11-08T18:00:00Z', '1:00 PM ET')).toMatch(/^Kickoff /);
  expect(localKickoff('', 'Scheduled')).toBe('Scheduled');
});

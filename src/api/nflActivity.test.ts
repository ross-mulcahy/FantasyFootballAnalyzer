import { afterEach, expect, it, vi } from 'vitest';
import { fetchNFLActivity, parseNFLActivity } from './nflActivity';
const now = Date.parse('2026-10-30T12:00:00Z');
const board = (events: unknown[]) => ({ season: { year: 2026 }, events });
const game = (state: string, date = '2026-10-30T13:00:00Z', name = 'STATUS_SCHEDULED', completed = false) => ({ date, status: { type: { state, name, completed } } });
afterEach(() => vi.unstubAllGlobals());
it('recognizes live play and halftime but excludes completed games', () => {
  expect(parseNFLActivity(board([game('in', '', 'STATUS_HALFTIME')]), 2026, now).live).toBe(true);
  expect(parseNFLActivity(board([game('post', '', 'STATUS_FINAL', true)]), 2026, now)).toEqual({ live: false, nextKickoff: null });
});
it('finds the next kickoff and rechecks delayed pre-game status without a tight loop', () => {
  expect(parseNFLActivity(board([game('pre')]), 2026, now).nextKickoff).toBe(now + 3600000);
  expect(parseNFLActivity(board([game('pre', '2026-10-30T11:00:00Z')]), 2026, now).nextKickoff).toBe(now + 60000);
  expect(parseNFLActivity(board([game('pre', '2026-10-30T11:00:00Z', 'STATUS_POSTPONED')]), 2026, now).nextKickoff).toBeNull();
});
it('does not treat another season as live and refuses malformed status data', () => {
  expect(parseNFLActivity(board([game('in')]), 2025, now).live).toBe(false);
  expect(() => parseNFLActivity({}, 2026, now)).toThrow(/unavailable/);
  expect(() => parseNFLActivity(board([{}]), 2026, now)).toThrow(/incomplete/);
});
it('shares in-flight probes and never sends fantasy credentials', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(board([]))));
  vi.stubGlobal('fetch', fetcher);
  await Promise.all([fetchNFLActivity(2026), fetchNFLActivity(2026)]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toHaveLength(2);
  expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]).toMatchObject({ credentials: 'omit', cache: 'no-store' });
});

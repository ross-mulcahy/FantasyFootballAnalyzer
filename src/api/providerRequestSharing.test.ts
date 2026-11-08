import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLeague, getWeeklyProjections } from './sleeper';
import { fetchESPN } from './espn';
import { yahooFetch, saveTokens, clearTokens } from './yahoo';
import { resetYahooPacingForTests } from './yahooPacing';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
  clearTokens();
  resetYahooPacingForTests();
});

describe('provider request sharing', () => {
  it('shares an in-flight Sleeper read, then fetches again after it settles', async () => {
    const fetchMock = vi.fn(async () => json({ league_id: 'same' }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([getLeague('same'), getLeague('same')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await getLeague('same');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares weekly Sleeper projections across leagues but retries a failed read', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValue(json({ player: { pts_ppr: 12 } }));
    vi.stubGlobal('fetch', fetchMock);

    const failed = await Promise.allSettled([
      getWeeklyProjections(2026, 9), getWeeklyProjections(2026, 9),
    ]);
    expect(failed.every(result => result.status === 'rejected')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(getWeeklyProjections(2026, 9)).resolves.toHaveProperty('player');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps private ESPN sessions separate while sharing identical reads', async () => {
    const fetchMock = vi.fn(async () => json({ teams: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const a = { espnS2: 'cookie-a', swid: '{A}' };
    const b = { espnS2: 'cookie-b', swid: '{B}' };

    await Promise.all([
      fetchESPN(2026, 'league', ['mTeam'], a),
      fetchESPN(2026, 'league', ['mTeam'], a),
      fetchESPN(2026, 'league', ['mTeam'], b),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await fetchESPN(2026, 'league', ['mTeam'], a);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares identical Yahoo reads only within the current token', async () => {
    saveTokens({ access_token: 'token-a', refresh_token: 'refresh-a', expires_in: 3600, token_type: 'Bearer' });
    const fetchMock = vi.fn(async () => json({ fantasy_content: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([yahooFetch('/league/1'), yahooFetch('/league/1')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    saveTokens({ access_token: 'token-b', refresh_token: 'refresh-b', expires_in: 3600, token_type: 'Bearer' });
    await yahooFetch('/league/1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

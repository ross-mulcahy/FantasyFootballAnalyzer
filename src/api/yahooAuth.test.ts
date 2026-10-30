import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getAuthUrl, validateOAuthState } from './yahoo';
const base = window.location.origin;
const state = (destination: string) => `nonce.${btoa(destination).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
function response(destination: string) {
  const nonce = state(destination);
  return { state: nonce, authUrl: `https://api.login.yahoo.com/oauth2/request_auth?state=${nonce}&client_id=test` };
}
beforeEach(() => { sessionStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());
it('uses this installation and preserves state for a successful same-app return', async () => {
  const data = response(base);
  const fetcher = vi.fn(async () => new Response(JSON.stringify(data)));
  vi.stubGlobal('fetch', fetcher);
  expect(await getAuthUrl()).toBe(data.authUrl);
  expect(fetcher.mock.calls[0][0]).toContain(`/api/yahoo-auth?return_base=${encodeURIComponent(base)}`);
  expect(validateOAuthState(data.state)).toBe(true);
});
it('stops before leaving the app if an old service substitutes its original site', async () => {
  const data = response('https://original.example.com');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(data))));
  await expect(getAuthUrl()).rejects.toThrow('another installation');
  expect(validateOAuthState(data.state)).toBe(false);
});
it('rejects a non-Yahoo authorization destination', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...response(base), authUrl: 'https://evil.example.com/' }))));
  await expect(getAuthUrl()).rejects.toThrow('another installation');
});
it('explains missing backend setup when static hosting returns HTML', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>SPA</html>')));
  await expect(getAuthUrl()).rejects.toThrow('login service for this installation');
});
it('shows the setup error from the server without navigating', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Yahoo client ID not configured' }), { status: 503 })));
  await expect(getAuthUrl()).rejects.toThrow('Yahoo client ID not configured');
});

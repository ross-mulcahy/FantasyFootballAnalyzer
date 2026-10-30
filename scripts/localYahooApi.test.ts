import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localYahooApi } from './localYahooApi';
vi.mock('vite', () => ({ loadEnv: () => ({}) }));
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>;
let middleware: Middleware;
const load = vi.fn();
beforeEach(() => {
  vi.stubEnv('FRONTEND_URL', 'http://127.0.0.1:5173'); vi.stubEnv('ALLOW_DEV_OAUTH', '0'); load.mockReset();
  const server = { config: { mode: 'development', root: '.', server: {} }, middlewares: { use: (handler: Middleware) => { middleware = handler; } }, ssrLoadModule: load } as unknown as ViteDevServer;
  (localYahooApi().configureServer as (server: ViteDevServer) => void)(server);
});
afterEach(() => vi.unstubAllEnvs());
function request(url: string, method = 'GET', body = '', origin = 'http://127.0.0.1:5173', peer = '127.0.0.1') {
  return Object.assign(Readable.from(body ? [body] : []), { url, method, headers: { host: '127.0.0.1:5173', origin }, socket: { remoteAddress: peer } }) as unknown as IncomingMessage;
}
function response() {
  const headers: Record<string, string> = {};
  return { headers, statusCode: 200, body: '', headersSent: false, setHeader(key: string, value: string) { headers[key] = value; }, end(body = '') { this.body = body; } };
}
it('adapts local GET query strings and never caches Yahoo responses', async () => {
  load.mockResolvedValue({ default: (req: IncomingMessage & { query: Record<string, string> }, res: ServerResponse & { json: (value: unknown) => void }) => res.json(req.query) });
  const res = response(); await middleware(request('/api/yahoo-auth?return_base=http%3A%2F%2F127.0.0.1%3A5173'), res as unknown as ServerResponse, vi.fn());
  expect(load).toHaveBeenCalledWith('/api/yahoo-auth.js');
  expect(JSON.parse(res.body).return_base).toBe('http://127.0.0.1:5173');
  expect(res.headers['Cache-Control']).toBe('no-store');
});
it('parses refresh JSON and preserves handler status responses', async () => {
  load.mockResolvedValue({ default: (req: IncomingMessage & { body: unknown }, res: ServerResponse & { status: (code: number) => { json: (value: unknown) => void } }) => res.status(201).json(req.body) });
  const res = response(); await middleware(request('/api/yahoo-refresh', 'POST', '{"refresh_token":"example"}'), res as unknown as ServerResponse, vi.fn());
  expect(res.statusCode).toBe(201); expect(JSON.parse(res.body)).toEqual({ refresh_token: 'example' });
});
it.each([
  ['unrelated browser origin', 'https://evil.example.com', '127.0.0.1'],
  ['LAN client', 'http://127.0.0.1:5173', '192.168.1.2'],
])('rejects an %s before loading credential handlers', async (_label, origin, peer) => {
  const res = response(); await middleware(request('/api/yahoo-auth', 'GET', '', origin, peer), res as unknown as ServerResponse, vi.fn());
  expect(res.statusCode).toBe(403); expect(load).not.toHaveBeenCalled();
});
it('rejects malformed or oversized bodies', async () => {
  const malformed = response(); await middleware(request('/api/yahoo-refresh', 'POST', '{bad'), malformed as unknown as ServerResponse, vi.fn());
  expect(malformed.statusCode).toBe(400);
  const huge = response(); await middleware(request('/api/yahoo-refresh', 'POST', 'x'.repeat(17000)), huge as unknown as ServerResponse, vi.fn());
  expect(huge.statusCode).toBe(413); expect(load).not.toHaveBeenCalled();
});
it('leaves normal app paths to Vite and rejects unknown Yahoo routes', async () => {
  const next = vi.fn(); await middleware(request('/settings'), response() as unknown as ServerResponse, next); expect(next).toHaveBeenCalledOnce();
  const res = response(); await middleware(request('/api/yahoo-unknown'), res as unknown as ServerResponse, next); expect(res.statusCode).toBe(404);
});

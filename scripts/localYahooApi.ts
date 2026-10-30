import { loadEnv, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const routes = new Set(['yahoo-auth', 'yahoo-callback', 'yahoo-refresh', 'yahoo-api']);
type ApiRequest = IncomingMessage & { query: Record<string, string>; body?: unknown };
type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => ApiResponse;
  redirect: (url: string) => ApiResponse;
};
export function localYahooApi(): Plugin {
  return {
    name: 'local-yahoo-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // These are server-only settings; never expose a Yahoo secret via VITE_*.
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const name of ['YAHOO_CLIENT_ID', 'YAHOO_CLIENT_SECRET', 'YAHOO_REDIRECT_URI', 'FRONTEND_URL']) {
        if (env[name]) process.env[name] = env[name];
      }
      process.env.FRONTEND_URL ||= 'http://127.0.0.1:5173';
      process.env.ALLOW_DEV_OAUTH = '1';
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0] ?? '';
        if (!path.startsWith('/api/yahoo-')) return next();
        response.setHeader('Cache-Control', 'no-store');
        const reply = (code: number, error: string) => { response.statusCode = code; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ error })); };
        const host = request.headers.host ?? '';
        const peer = request.socket.remoteAddress ?? '';
        // Local credential handlers are never available to LAN clients or an
        // unrelated web origin, even if Vite is started with --host.
        if (!/^(localhost|127\.0\.0\.1):(5173|4173)$/.test(host) || !/^(127\.|::1$|::ffff:127\.)/.test(peer)) return reply(403, 'The local Yahoo service is available only on this computer.');
        if (request.headers.origin && !/^https?:\/\/(localhost|127\.0\.0\.1):(5173|4173)$/.test(request.headers.origin)) return reply(403, 'Yahoo request origin is not allowed.');
        const route = path.slice('/api/'.length);
        if (!routes.has(route)) return reply(404, 'Unknown Yahoo endpoint.');
        try {
          const req = request as ApiRequest;
          const res = response as ApiResponse;
          req.query = Object.fromEntries(new URL(req.url!, `http://${host}`).searchParams);
          req.headers['x-forwarded-proto'] = server.config.server.https ? 'https' : 'http';
          if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
              if (Buffer.byteLength(body) > 16_384) return reply(413, 'Yahoo request is too large.');
            }
            try { req.body = body ? JSON.parse(body) : {}; }
            catch { return reply(400, 'Invalid JSON request.'); }
          }
          res.status = code => { res.statusCode = code; return res; };
          res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
          res.redirect = url => { res.statusCode = 302; res.setHeader('Location', url); res.end(); return res; };
          const handler = await server.ssrLoadModule(`/api/${route}.js`);
          await handler.default(req, res);
        } catch {
          // Do not log request URLs, authorization codes, bodies or credentials.
          if (!response.headersSent) reply(500, 'The local Yahoo service could not complete this request.');
          else response.end();
        }
      });
    },
  };
}

// Adapt the existing, validated ESPN handler to the standard Worker Request API.
// No credentials are stored, cached, or logged by this adapter.
export async function serveEspn(request, handler) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) {
    return Response.json({ error: 'Use the app on this origin.' }, { status: 403 });
  }
  const query = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  let status = 200;
  let response;
  const res = {
    setHeader(name, value) { headers.set(name, value); },
    status(code) { status = code; return res; },
    json(body) {
      headers.set('Content-Type', 'application/json');
      response = new Response(JSON.stringify(body), { status, headers });
      return res;
    },
    end() { response = new Response(null, { status, headers }); return res; },
  };
  await handler({ method: request.method, query, headers: Object.fromEntries(request.headers) }, res);
  return response || Response.json({ error: 'Provider response unavailable.' }, { status: 502 });
}

// Spacefast file-router modules receive secrets on context.env, while the
// Vercel handler reads process.env. Keep the key server-side in both hosts.
export function serveHighlights(request, env, handler) {
  return serveEspn(request, (req, res) => handler(req, res, { apiKey: env?.YOUTUBE_API_KEY }));
}

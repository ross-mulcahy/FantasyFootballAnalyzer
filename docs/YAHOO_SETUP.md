# Yahoo sign-in for this installation

## Why sign-in used to open the original site

The inherited frontend defaulted to the original project's Yahoo service.
That service controls the OAuth return-address allowlist; a frontend change
cannot make it send credentials back to a different installation. This fork
now uses its own same-origin endpoints unless `VITE_YAHOO_API_URL` explicitly
names your service. It also checks the returned OAuth state before leaving
for Yahoo, so a mismatched service cannot silently take you to another app.

## Required Yahoo configuration

Create or use your own [Yahoo developer app](https://developer.yahoo.com/apps/)
with Fantasy Sports read access. Yahoo supplies a client ID and secret; these
must remain on your server, never in `VITE_*` variables, source control or chat.
A newly registered app may also need Yahoo approval for Fantasy Sports access.

Register the exact callback address your service can receive, ending in
`/api/yahoo-callback`. Yahoo must accept the registered URI. Use a registered
HTTPS callback on your own hosted service if Yahoo does not accept a local
HTTP callback; this fork does not bypass Yahoo's callback restrictions.

## New personal app checklist

1. Open [Yahoo Developer Apps](https://developer.yahoo.com/apps/) and create
   your app. A suggested name is **Personal Game Day** and a description is:
   “Personal read-only dashboard for my fantasy football leagues and matchups.”
2. Request Fantasy Sports read access if it is offered. If it is missing or
   access is not provisioned, use Yahoo's [Fantasy Sports access application](https://sports.yahoo.com/developer/access/).
   Follow Yahoo's current approval and application-confirmation instructions.
3. Register a callback that Yahoo accepts and that reaches your installation.
   For the local HTTP server, the candidate is
   `http://127.0.0.1:5173/api/yahoo-callback`. If Yahoo requires HTTPS, adjust the
   callback setup before attempting login; do not register an unreachable URL.
4. Enter your client ID and secret in the ignored `.env.local` file. Keep
   `VITE_YAHOO_API_URL` blank for the local handler. Never put the secret in
   a `VITE_*` setting or send it through chat.
5. Restart the local server and choose Settings → Yahoo → Log in with Yahoo.
   A successful login still needs API access approval to load fantasy leagues.

## Local development

Copy `.env.example` to `.env.local` (ignored by Git), and set:

```dotenv
YAHOO_CLIENT_ID=your-client-id
YAHOO_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://127.0.0.1:5173
VITE_YAHOO_API_URL=
```

Start or restart `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
Vite includes local auth, callback, refresh and read-only Yahoo API handlers.
They load the server-only variables without placing them in the frontend bundle.
The handlers accept only loopback requests on the supported local ports and
reject unrelated browser origins. Requests and responses containing credentials
are not cached. Local development explicitly enables local OAuth returns.

The default callback is `http://127.0.0.1:5173/api/yahoo-callback` when using
that address. It must be accepted and registered in your Yahoo app. Setting
`YAHOO_REDIRECT_URI` changes the URI sent to Yahoo; it does not create a tunnel
or make an unreachable callback reachable. The token exchange uses the same
registered URI as the authorization request.

If your registered callback belongs to a hosted service, use the hosted setup
below and point `VITE_YAHOO_API_URL` at that service instead.

## Your own hosted Yahoo service

Deploy this repository's `api/yahoo-*` functions to your own serverless project.
Configure its server environment:

- `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET`: your Yahoo app credentials.
- `FRONTEND_URL`: the exact frontend base URL, including any application path.
- `YAHOO_REDIRECT_URI`: the registered HTTPS callback on this API service,
  normally `https://your-service.example/api/yahoo-callback`.
- `ALLOW_DEV_OAUTH=1`: only when you intend this service to return to local
  `localhost` or `127.0.0.1` on ports 5173/4173.

Set the frontend's `VITE_YAHOO_API_URL` to your API service origin and rebuild
or restart. For a separately hosted API, add that exact origin to the HTML
Content-Security-Policy `connect-src` list. Production static hosting still
requires an API deployment; `npm run build` does not create server endpoints.

Without configured credentials, real Yahoo sign-in cannot complete. Missing
configuration is now shown as an error here rather than redirecting to the
original site. Authentication tests cover matching returns, rejected foreign
returns, configured callbacks, state validation and token fragments. A complete
account login additionally requires the Yahoo app and your browser approval.

Yahoo's [authorization-code documentation](https://developer.yahoo.com/oauth2/guide/flows_authcode/)
explains client credentials and registered redirect URIs.

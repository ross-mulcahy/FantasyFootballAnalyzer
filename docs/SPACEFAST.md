# Spacefast install

The private **Fantasy Game Day** Space for this fork is at [fantasy-game-day.space.fast](https://fantasy-game-day.space.fast/). It belongs to Ross' Team. Spacefast may ask you to open a private Space through your dashboard; the bare URL is not a public sharing link. The local app remains available at `http://127.0.0.1:5173/`.

## What works

- Sleeper connects directly from the browser. The hosted Game Day matchup, scores, projections, lineups and event timeline have been checked with a real Sleeper league.
- ESPN and Yahoo connection controls are paused. Previously saved leagues remain in browser storage, but cannot be reconnected from Settings while the connectors are paused.
- The same-origin `/api/espn-proxy` and `/api/nfl-highlights` Functions are packaged. The highlights Function reads `YOUTUBE_API_KEY` from the Space's runtime Variables; it never sends the key to browsers. Yahoo's hosted API routes return a setup error until a developer app and hosted login service are configured. See [Yahoo setup](YAHOO_SETUP.md).

## NFL highlight metadata

For automatic official-video title matching, open the **Fantasy Game Day** Space in the Spacefast dashboard, go to **Variables**, and add `YOUTUBE_API_KEY` as a **Secret**. The key must have YouTube Data API v3 enabled and be restricted to that API. Spacefast's Functions runtime supplies the secret to `/api/nfl-highlights`; the Vite build points the hosted Watch Mode at that same-origin route. The feed checks recent NFL on FOX and NFL on CBS clips before @NFL uploads, including each source's embed-permission metadata. Without a working key, Watch Mode still offers searches on the official NFL channel. Never add the secret to `VITE_*`, Git, or the build command.

Watch Mode checks actual YouTube player errors as well as metadata because a rights holder can block a clip from this site even when the API reports it as embeddable. It then tries another matched official source and, if none plays, leaves a **Watch on YouTube** link. Autoplay blocks get a manual **Play Clip** action. If the hosting edge supplies `cf-ipcountry` or `x-vercel-ip-country`, known regional restrictions are applied to that viewer; such responses use private browser caching. Without a country header, the app does not guess the viewer's location. Do not proxy or copy video media to bypass an embed restriction. On 7 November 2026, the connected build for commit `0eca5460` succeeded and the live endpoint returned all three configured source feeds; that check does not certify every clip's playback rights.

## Bring your leagues across

The local and hosted addresses have separate browser storage. In local **Settings**, choose **Download backup**. In hosted **Settings**, choose the file, inspect its preview and select **Restore this backup**. The backup carries leagues, team choices, recap history and Game Day preferences. It excludes ESPN cookies, Yahoo tokens, app secrets, notification permissions and API snapshots. Reconnect private ESPN leagues and enable browser alerts on the hosted address after restoring. There is no automatic sync between browsers.

## Publish an update

The connected GitHub `master` branch deploys automatically. Spacefast's repository build settings must use `npm run build:spacefast` as the build command and `dist` as the output directory. This overrides the repo's `vercel.json`, which is for the separate Vercel API-only deployment. From the repository root, use Node.js 24 and push the tested commit:

```sh
npm ci
npm run test:run
npm run lint
npm run typecheck
npm run build:spacefast
git push origin master
```

Check the Spacefast build result and live version after pushing. The build removes inherited Pages `CNAME`, `404.html` and sitemap files and packages the same-origin ESPN and NFL highlights Functions. Yahoo still needs its separate hosted setup. Keep the existing Space and GitHub connection; do not create a new Space.

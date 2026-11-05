# Spacefast install

The private **Fantasy Game Day** Space for this fork is at [fantasy-game-day.space.fast](https://fantasy-game-day.space.fast/). It belongs to Ross' Team. Spacefast may ask you to open a private Space through your dashboard; the bare URL is not a public sharing link. The local app remains available at `http://127.0.0.1:5173/`.

## What works

- Sleeper connects directly from the browser. The hosted Game Day matchup, scores, projections, lineups and event timeline have been checked with a real Sleeper league.
- Private ESPN leagues use a same-origin `/api/espn-proxy` Function. It forwards the browser's ESPN session cookies for each request without storing them on Spacefast. A private ESPN league still needs a current login; the hosted proxy has been checked up to ESPN's expected missing-cookie response.
- Yahoo login is not configured on Spacefast. Its hosted API routes return a setup error until a Yahoo developer app and hosted login service are configured. Local Yahoo setup is covered in [Yahoo setup](YAHOO_SETUP.md).

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

Check the Spacefast build result and live version after pushing. The build removes inherited Pages `CNAME`, `404.html` and sitemap files and packages the same-origin ESPN Function. Yahoo still needs its separate hosted setup. Keep the existing Space and GitHub connection; do not create a new Space.

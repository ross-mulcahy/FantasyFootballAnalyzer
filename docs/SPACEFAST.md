# Spacefast install

The private **Fantasy Game Day** Space for this fork is at [fantasy-game-day.space.fast](https://fantasy-game-day.space.fast/). It belongs to Ross' Team. Spacefast may ask you to open a private Space through your dashboard; the bare URL is not a public sharing link. The local app remains available at `http://127.0.0.1:5173/`.

## What works

- Sleeper connects directly from the browser. The hosted Game Day matchup, scores, projections, lineups and event timeline have been checked with a real Sleeper league.
- Private ESPN leagues use a same-origin `/api/espn-proxy` Function. It forwards the browser's ESPN session cookies for each request without storing them on Spacefast. A private ESPN league still needs a current login; the hosted proxy has been checked up to ESPN's expected missing-cookie response.
- Yahoo login is not configured on Spacefast. Its hosted API routes return a setup error until a Yahoo developer app and hosted login service are configured. Local Yahoo setup is covered in [Yahoo setup](YAHOO_SETUP.md).

## Bring your leagues across

The local and hosted addresses have separate browser storage. In local **Settings**, choose **Download backup**. In hosted **Settings**, choose the file, inspect its preview and select **Restore this backup**. The backup carries leagues, team choices, recap history and Game Day preferences. It excludes ESPN cookies, Yahoo tokens, app secrets, notification permissions and API snapshots. Reconnect private ESPN leagues and enable browser alerts on the hosted address after restoring. There is no automatic sync between browsers.

## Publish an update

Use Node.js 24 and the authenticated Spacefast CLI. From the repository root, after the desired source changes are committed:

```sh
npm ci
npm run test:run
npm run lint
npm run typecheck
npm run build:spacefast
mkdir -p dist/source
git archive --format=zip --output=dist/source/fantasy-game-day-source.zip HEAD
npx -y spacefast@latest publish dist --prebuilt \
  --space spc_d26a7ccfeb8840ffb0c01f3c61b89408 \
  --team 43PDUi8b5DlKP6nYJiLZwLPFn5W7K1S0 \
  --spa true --api-url https://api.spacefast.com --wait
```

Review tracked files before making the source archive, especially if new configuration files have been added. `git archive HEAD` contains committed files only. The app build also excludes local dotenv files, `.spacefast/` state, dependencies and caches from `dist`. The source archive is a downloadable snapshot of editable code inside the private Space; it is not a live source editor. Rebuild and recreate the archive on every update, because `npm run build:spacefast` replaces `dist`.

The Spacefast build removes the inherited Pages `CNAME`, `404.html` and sitemap, and packages a Functions route for ESPN. It keeps the existing GitHub Pages and Vercel deployment paths separate. Publishing does not push a commit to GitHub: commit and push source changes there as a separate step. Do not publish this project as a new Space; use the Space ID above.

The first Spacefast source-editor import reported `repository_not_ready`, so the initial deployment retained a source archive instead. GitHub is the primary source repository. Automatic builds are not configured for this Space; use the explicit publish command above.

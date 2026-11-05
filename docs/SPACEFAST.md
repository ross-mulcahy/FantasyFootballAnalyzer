# Spacefast install

This fork can be published privately to Spacefast while keeping league selections and logins in each browser.

## Build and publish

Run `npm run build:spacefast`, then publish the `dist` directory with the Spacefast CLI in prebuilt mode and SPA fallback enabled. Use the existing linked Space; do not create another one for updates. `npm run build` continues producing the original static frontend for the inherited Pages pipeline.

The Spacefast build packages the static frontend and a Functions file router. `/api/espn-proxy` adapts the existing validated ESPN handler to standard Request/Response APIs. It preserves repeated view parameters and credential headers, rejects cross-origin browser requests, and returns private/no-store responses. ESPN credentials travel only with the individual provider request and are not stored on Spacefast. Browser cookies may still expire and need reconnecting. The original endpoint validation tests plus the Worker adapter tests cover this path.

Sleeper remains a direct browser connection. Yahoo is deliberately unavailable in this hosted build until a hosted Yahoo login service and developer app are configured. Its API routes return a clear setup error. Local `.env.local` Yahoo credentials are never uploaded.

The build removes the inherited CNAME, Pages 404 redirect shim, and sitemap from the Spacefast output. Spacefast serves SPA deep links itself. Original source and other deployment files remain in the repository.

## Move your leagues

The localhost and Spacefast addresses have separate browser storage. Download a backup from local Settings, then restore it in Settings at the hosted address. The backup includes saved leagues, team selections, recap history and preferences, but excludes ESPN cookies, Yahoo tokens and notification permission. Reconnect private leagues and enable browser alerts separately on the hosted address. There is no server-side league or login synchronization.

## Source and updates

The published install retains an editable source archive at `/source/fantasy-game-day-source.zip`, including the original artwork. It excludes dotenv files, Git metadata, dependencies, local state and build caches. The initial Spacefast source-editor import could not be completed because its repository storage was not ready. Automatic builds are disabled for the hosted connection; publishing is explicit. GitHub remains the primary repository. Do not connect or change upstream. Keep `.spacefast/`, dotenv files, dependencies and build caches out of source uploads and commits. The repository link and live Space identity are not authentication credentials.

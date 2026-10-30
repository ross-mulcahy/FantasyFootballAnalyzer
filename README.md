# Fantasy Football Analyzer

Free, open-source league analysis and a live draft assistant for Sleeper,
ESPN, and Yahoo fantasy football leagues. No accounts, no ads, no server-side
storage: credentials stay in the browser and pass straight through to the
platform APIs.

This fork adds a local Game Day dashboard across your connected leagues.

## License for this fork

Ross Mulcahy's original contributions are licensed under the MIT License.
This applies only to those contributions, not to inherited upstream code or
third-party materials. See [LICENSE](LICENSE) for the full terms and scope.
No explicit upstream license was found when this notice was added; this fork
does not grant a license to the combined project as a whole.

## What it does

**Draft tools (upcoming season)**

- Draft Room: log a live snake or auction draft (or run a mock against AI
  opponents) with rankings, tiers, auction values scaled to your league,
  live inflation, stack/handcuff detection, nomination advice, comfort-bid
  math, positional-run and tier-break alerts, and an end-of-draft recap with
  instant grades
- Live Sync pulls picks straight from a running Sleeper draft
- Rankings: FantasyPros, ESPN, and Sleeper side by side, refreshed twice
  daily by a GitHub Action, with a target/avoid list that follows you into the draft,
  plus per-position views (`/rankings/qb` .. `/rankings/flex`)
- Site Values: where each site's draft market disagrees with the consensus
  of all of them, values and reaches in both directions (`/values`)
- ADP Trends: day-over-day and week-over-week risers and fallers on the
  consensus board, by scoring format including superflex (`/trends`)

The draft-prep pages (Draft Room, Rankings, Values, Trends) work with no
login at all (guest mode).
A loaded league is only needed for the league-analysis tools below.

**League analysis (any loaded season)**

- Draft grades from actual season production, with a per-team leaderboard
  and points-left-on-board
- Trade verdicts and waiver receipts in points-above-replacement
- Luck analysis: expected wins, all-play records, PF-rank vs W-rank
- Team hub pages, head-to-head grids, manager skill scores
- League history with a champions wall, season records, a week-by-week
  season story, and auto-generated awards (PNG-exportable for the chat)

## Game Day in this fork

The homepage combines your selected teams' matchups across Yahoo, ESPN and
Sleeper. League connections, team choices, cached data and recap history stay
in this browser; they are not saved into the repository.

| Page | What you can do |
| --- | --- |
| **Game Day** (`/`) | See your matchups together, refresh all leagues, focus on close contests, follow shared players, and view lineup warnings and NFL events. |
| **Recap** (`/recap`) | Choose a saved week and review results, aligned scores, top contributors and top opponents for each league. |
| **Settings** (`/settings`) | Connect or remove leagues, reconnect expired sessions and select **My team** for each league. |
| **League Game Day** (`/game-day?league=…&year=…`) | See that league's matchups and open a matchup's player breakdown. |
| **Rosters** (`/rosters`) | Select a team and open the common full-roster view, including bench and reserve players. |

The global navigation contains **Game Day**, **Recap** and **Settings**.
Following a league name or a homepage matchup opens that league's Game Day
page and restores the league navigation, starting with **Game Day** and
**Rosters**. Full roster links preserve the league, season and team.

### Scoreboard and shared players

- Your team always appears on the left. Matchup rows show scores, available
  projections and players still to play or currently in a live NFL game.
- One **Refresh all** button updates every visible league. The combined
  timestamp uses the oldest league snapshot, so one failed connection cannot
  make the whole board appear fresh.
- Sort by league order, closest projected margin or closest current margin.
  **Only close (≤10 pts)** filters rows without stopping other leagues' updates.
  Pregame 0–0 games do not count as close by current margin. Weekly projection
  sums are not compared with multiweek matchup totals.
- **Shared Players** groups starters and defenses appearing in at least two
  of your matchups, with separate **Yours** and **Against** counts. Bench,
  reserve and empty slots are excluded.
- Players rank by their **highest available league projection**, descending;
  that estimate appears below current fantasy points. Missing projections go
  last, while zero remains a valid estimate. Different league point totals show
  a range rather than a sum. Expand a player for stats and league-by-league
  scoring details.
- Smaller screens use **Matchups / Shared Players** tabs, opening on Matchups.
  Panels can be minimised, with that preference remembered locally.

### Events, warnings and recaps

**Latest Alerts** appears below matchup scores only while relevant NFL games
are live. It shows the three newest published major events. **Major Events**
keeps the full timeline available, newest first, including completed games.
Both use ESPN NFL scoring plays and turnovers involving starting-lineup games.
These are game events, not an exact fantasy-point ledger.

Recognisable plays show estimated **Good for me / Bad for me** impact for each
league, including mixed exposure in the same league. Scoring rules determine
actual points; ambiguous plays stay unconfirmed. Browser notifications include
impact when alerts are already enabled. Enable alerts with the bell icon beside
**Refresh rosters & scores** on a matchup page; the app must stay open, and
background delivery is subject to browser restrictions. Old events are not
replayed as new alerts.

**Lineup Warnings** checks your starters for empty slots, provider injury flags
and byes/no-game entries when schedule data is available. Each warning links
to the full roster. Finished games no longer show injury warnings, and saved
rosters or started games are identified. Injury availability depends on the
provider; no warning does not guarantee a healthy player.

**Recap** has separate league cards with large aligned scores, result badges,
player highlights and saved snapshot times. Game Day records compact summaries
in the background, so visiting Recap does not interrupt recording or overwrite
completed history with missing live data. History starts as you use Game Day;
earlier weeks are not backfilled. Finished-lineup results are provisional and
subject to corrections. Missing data and unfinished multiweek rounds remain
pending. Scores and contributors retain their own league's scoring rules.

### Connection health and everyday shortcuts

Game Day shows connection health and links back to the exact league's reconnect
form. Provider shortcuts open ESPN/Yahoo teams or Sleeper's league team tab.
Settings contains 15-minute pre-kickoff lineup checks, browser notification
controls and event priorities (all events, lineup impact only, close matchups first).
The full timeline remains chronological. Reminders require Game Day to stay open.

Settings also exports and restores a previewed local backup of league selections,
team choices, recap history and preferences. Logins, cookies, app credentials,
notification permissions and API snapshots are excluded. Restore keeps existing
team choices and merges history; reconnect private leagues on another browser.

### Local setup and refresh

Use Node.js 20 or later; Node.js 24 LTS is the verified local runtime.

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/` in your usual browser, connect leagues in
**Settings**, and choose **My team** for each league. Keep using the same
browser profile and address: `localhost` and `127.0.0.1` have separate storage.
Clearing site data removes local preferences, snapshots and recap history.

Private ESPN connections offer **Remember ESPN login on this device**, off by
default. Clearing that option forgets the persistent login; cookies may expire
and require reconnecting. Yahoo uses your own app credentials and login service; see
[Yahoo setup](docs/YAHOO_SETUP.md). Credentials are never included in saved matchup/recap snapshots or links.

Matchup snapshots poll every **60 seconds** while NFL games are live for the
season and every **3 hours** otherwise, with kickoff-aware status checks.
Relevant NFL events check every **15 seconds** during live games and slow down
when idle. Manual refresh remains available. Offline requests pause; hidden-tab
polling normally pauses unless browser alerts are enabled. Failed refreshes
retain cached data and identify errors. Snapshots over 15 minutes old are marked.

Provider scores preserve league rules and commissioner adjustments. ESPN/Yahoo
multiweek matchup totals are labelled separately from current-week player scores;
Sleeper shows single-week totals explicitly. Projections are estimates, not live
finish predictions. Missing values appear as a dash, never an invented zero.

See the [Game Day guide](docs/GAME_DAY_GUIDE.md) for daily use and
[technical data reference](docs/GAME_DAY_DATA.md) for sources and cache behavior.

## Development

```
npm install
npm run dev          # local dev server
npm run test:run     # vitest suite
npm run lint         # code quality
npm run typecheck    # TypeScript check
npm run build        # typecheck + production build
npm run deploy       # publish dist/ to gh-pages
```

Draft data lives in `src/data/draftPool.<season>.json`, built by
`npm run update:rankings` (see CLAUDE.md for pipeline details). The Yahoo
OAuth and ESPN proxy serverless functions in `api/` deploy to Vercel;
the frontend can run locally or on static hosting. Vite also supplies Yahoo
handlers during local development; public hosting needs your own API service. The
Vercel functions read `FRONTEND_URL` and the Yahoo client id/secret from env
(`VITE_SENTRY_DSN` is frontend-only, consumed at build time); see CLAUDE.md for
the full list.

## Docs

- [Yahoo setup](docs/YAHOO_SETUP.md) — configure login for this installation
- [Game Day guide](docs/GAME_DAY_GUIDE.md) — setup, navigation and daily use
- [Game Day data reference](docs/GAME_DAY_DATA.md) — adapters, polling, caching,
  alerts and recap storage
- [Player identity map](docs/PLAYER_ID_MAP.md) — ID mapping, attribution and refresh
- [CLAUDE.md](CLAUDE.md) — architecture, deployment and contributor instructions
- [Fantasy football reference](docs/FANTASY_FOOTBALL.md) — domain and platform rules
- [Design system](docs/DESIGN_SYSTEM.md) — GRIDIRON styles and component patterns
- [API reference](docs/API_REFERENCE.md) — platform endpoint notes
- `docs/archive/` — superseded and historical documents

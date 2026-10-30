# Game Day guide

## Connect your leagues once

1. Start the app and open the same browser profile and address each time.
2. Go to **Settings** and connect your Yahoo, ESPN or Sleeper leagues.
3. Select **My team** for each league. This identifies which matchups belong
   on the combined scoreboard and which players are yours or your opponents'.
4. Return to **Game Day**. Connections and team selections are saved locally.

Private leagues may need reconnecting when their sessions expire. ESPN's
optional **Remember ESPN login on this device** keeps the connection across
browser sessions; otherwise its login remains session-only. Yahoo uses OAuth.
Local browser data is not committed or synced to GitHub.

## Read the combined scoreboard

Your team is always on the left. Each row shows the league, current matchup
score, available projection and player progress. A live indicator refers to the
NFL game's status, not whether the player is currently on the field.

**Refresh all** refreshes every visible league and the shared NFL feed.
**Last updated** represents the oldest league snapshot. If a league cannot
refresh, its saved scores remain visible with a reconnect link.

Select **Closest projected margin** or **Closest current margin** to put tight
contests first. **Only close (≤10 pts)** limits the displayed rows. With league
order selected, the filter uses projected margins. Unknown margins are excluded;
unstarted 0–0 contests are excluded from current-margin focus. Filtering leaves
all leagues connected and updating.

Click a league name or matchup row to enter the league's Game Day page. There,
open a specific matchup for its score, starting lineups, stats and projections.
**Rosters** opens the full roster view with a team selector, including bench and
reserve slots. Browser Back returns through these views.

## Follow shared players

The sidebar includes starters and defenses appearing across two or more of your
matchups. **Yours** and **Against** count leagues separately, so a player can
appear on both sides of your week.

Players rank by the highest available projection from their league appearances.
That projection is displayed beneath current fantasy points. Missing estimates
sort last; zero estimates remain valid. When current points differ by league,
a range is shown. Points are never added across leagues with different scoring.
Expand a player for the exact per-league figures, NFL stats and reported events.

On phones and smaller screens, switch between **Matchups** and **Shared Players**.
The page opens on Matchups and keeps both feeds mounted while you switch.

## Act on lineup warnings

Warnings identify your empty starting slots, provider injury flags and byes or
missing scheduled games. **View roster** opens that league's selected team.
Warnings mark saved data and started games. Refresh before making lineup decisions;
actual changes still happen in the league provider's app, under its lock rules.
Finished-game injury flags are suppressed. Bench/reserve slots do not trigger
starter warnings, and provider coverage limits the injury information available.

## Follow alerts and the timeline

**Latest Alerts** appears only when relevant games are live and the feed is fresh.
The timeline remains available when idle, with the newest major event first.
It includes published scoring plays and turnovers from games involving starters.

**Good for me / Bad for me** estimates which leagues a recognisable event helps
or hurts. A touchdown can help through your quarterback and hurt through an
opponent's receiver in the same league. This preserves both effects without
claiming an exact net point change. Ambiguous events stay unconfirmed.

To enable browser notifications, open a matchup and click the bell beside
**Refresh rosters & scores**. Allow the browser prompt. Keep the app open;
background notifications depend on browser support and throttling. Enabling
alerts does not replay older events. Use the same control to turn them off.

## Review your weekly recap

Choose **Recap** in the header. Select a saved week to see the record totals and
individual league cards, including aligned scores, result badges, top
contributors, top opponents and snapshot times.

Game Day records summaries in the background as you use it. Recap reads those
saved summaries; return to Game Day and refresh to update the archive. History
starts from visits to Game Day and does not fetch earlier weeks automatically.
Only currently connected league/team selections are shown. Finished-lineup results
can change after corrections, while incomplete and unfinished multiweek matchups
remain pending. Removing site data removes this local history.

## Data freshness

Matchup scores update every minute while NFL games are live for that season,
and every three hours otherwise. Relevant major events check every 15 seconds
while live. Kickoff checks wake the faster cadence. Manual refresh is available.
Offline polling pauses; hidden-tab polling normally pauses unless alerts are on.
Failures keep saved data visible instead of replacing it with empty values.

Sources and implementation details are in [GAME_DAY_DATA.md](GAME_DAY_DATA.md).
Player identity attribution and regeneration are in [PLAYER_ID_MAP.md](PLAYER_ID_MAP.md).

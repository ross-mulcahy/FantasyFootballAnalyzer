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

## Connection health and quick provider links

Game Day shows a connection summary. Settings shows each league's last successful
refresh, reconnect requirement or setup problem. A cached snapshot alone is not
labelled as a verified live connection. Offline status uses saved data. Select
Reconnect to open the matching platform, league and season in Settings; your
saved My team selection is kept, and a failed connection bypasses metadata cache
when submitted again. Reconnecting Yahoo does not fall back to a different season.

Open ESPN/Yahoo links include available league and team identifiers. Sleeper
opens the league's team tab, which uses the team associated with your provider
session. Provider pages may require their own login. These links do not submit
lineup changes or include authentication credentials.

## Pre-kickoff checks and personalised alerts

In Settings → Game Day preferences, enable pre-kickoff checks and, if desired,
browser alerts. During the 15 minutes before an upcoming starter's game, Game Day
refreshes that league's roster and the NFL feed, then checks for starter warnings.
It sends at most one browser reminder per league/week/kickoff on this device.
Clean lineups stay quiet. Past, cancelled and postponed starts do not produce
reminders. Saved-data warnings are marked. Keep Game Day open; the browser may
throttle background activity, and no operating-system scheduler runs while closed.

Choose All events, My lineup impact only, or Close matchups first. This affects
Latest Alerts and browser event notifications; the full Major Events timeline
always stays newest first. Close means a current margin within 10 points, falling
back to a valid projected margin when current progress is unavailable. Personalised
priority considers recent events and does not replay older events when changed.

## Move your local setup to another browser

Settings → Backup & restore downloads a JSON file containing saved leagues,
My team selections, recap history and Game Day preferences. Cookies, OAuth tokens,
app secrets, notification permissions and cached API snapshots are excluded.
The file stays local and includes league/team names, so keep it private.

Choose a backup file to preview its league list and recap count, then explicitly
click Restore this backup. Import validates the format, version and size before
writing. Leagues and recap history merge; existing My team choices take precedence,
and preferences come from the backup. Existing logins remain unchanged. On another
browser, reconnect private leagues and enable notifications there if desired.
Restoring does not automatically connect accounts or grant browser permissions.

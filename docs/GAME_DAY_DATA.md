# Current-week matchup data

## Sources

- Sleeper matchups: https://docs.sleeper.com/#getting-matchups-in-a-league
  `players_points` is the authoritative fantasy-score source. Team commissioner
  overrides are preserved separately; player sums need not equal team totals.
- Sleeper raw stats: `https://api.sleeper.app/v1/stats/nfl/regular/{season}/{week}`.
- Sleeper projections: `https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}`.
  These supplementary feeds are not covered by the documented league API.
  The alternate api.sleeper.com weekly feeds returned 403 during verification;
  the existing api.sleeper.app/v1 feeds returned usable Week 8 data.
- ESPN fantasy: existing direct/cookie-proxy transport, adding `mBoxscore`.
  Actual (`statSourceId: 0`) and projected (`1`) player records must match both
  season and scoringPeriodId. Season totals are never fallback weekly scores.
  Raw stat labels follow espn-api's maintained PLAYER_STATS_MAP:
  https://github.com/cwendt94/espn-api/blob/master/espn_api/football/constant.py
- Yahoo: league-scoped `/players;player_keys=.../stats;type=week;week=N`, in
  25-player batches using existing pacing, with league stat-category labels.
  Scores marked for a different week or season coverage are omitted. Only
  provider-returned player projections are displayed. Scoreboard projections
  are labelled as platform matchup projections, separately from weekly rows.
- NFL timeline: ESPN site scoreboard and summary feeds at
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/`.
  Only started games involving selected starters' NFL teams are queried.
  Published scoringPlays and plays flagged isTurnover are deduplicated by ID.
  No events are inferred from stat deltas. These public feeds have no stability
  guarantee; failures are handled as optional data availability.

## Refresh and cache

Player data is saved with the league/week snapshot and display-field-only
serialization. Old snapshots without player details are upgraded once without
blanking the previous roster. Optional stat/projection failures do not discard
valid roster or matchup scores. The NFL timeline has a separate local cache
scoped to season, week, and canonical NFL-team set; stale async responses cannot
cross between matchups or weeks. No NFL-feed request carries fantasy credentials.

A shared active-league poller lives in App's GameDayContext, so navigating among
Game Day, roster, and analysis tabs does not duplicate or restart polling.
Matchup/player snapshots refresh every 60 seconds while the current NFL status
feed reports an in-progress game for the loaded league's season, otherwise every
3 hours. A successful snapshot update refreshes an open event timeline; its
separate manual refresh remains available.

Status is read from ESPN's public NFL scoreboard without fantasy credentials.
Scheduled kickoff prompts an earlier status-only check. Delayed pre-game status
is checked again after 60 seconds; halftime counts as in progress. A live-to-idle
transition refreshes final scores once. An unavailable status feed retains the
last cadence and retries status in 60 seconds; initial unknown status uses the
60-second cadence. In-flight requests never overlap, and failed refreshes keep
the previous snapshot. Hidden/offline tabs pause until visibility/connectivity
returns. Old-season snapshots do not treat another season's games as live.
Yahoo and private ESPN account verification still requires authenticated leagues.


## Matchup alerts and game status

One matchup-level event hook supplies the latest-three alert panel above the
lineups, the full newest-first timeline below, and per-player NFL game status.
Cached events are re-sorted newest first when read. Source event timestamps are
preferred; without them, games and their quarter/clock positions provide the
ordering. A player's NFL team is matched through canonical aliases (JAX/JAC,
WSH/WAS, etc.). Live badges describe the game status only, not participation.
Live status older than two minutes or retained after a failed request is labelled
Last seen live. Unknown game status is not presented as proof that no game is live.

The scoreboard supplies statuses for all relevant games, including upcoming and
finished games. Summaries are fetched only for started games. If a game summary
fails, its saved events are retained while fresh scoreboard status still updates;
alerts disclose incomplete event data. Old event caches without game statuses
are upgraded once without blanking their saved event history.


### Matchup layout and browser alerts

The matchup score sits above Latest Alerts, followed by the two starting lineups
and newest-first event timeline. Score, alerts, each lineup, timeline, and the
all-matchups list have independent Minimise/Expand controls. Their state is saved
only in this browser (`ffa:matchup-panel:*`). Minimising keeps the event watcher
mounted, so it does not stop alerts.

Use the **bell icon** beside **Refresh rosters & scores** and allow the browser's
notification prompt. Enabling sends one confirmation notification. The local
preference is `ffa:browser-event-alerts:v1`. Desktop Notifications API support and
a secure origin (including localhost) are required. Unsupported, denied, and
failed notification states are displayed in the panel. Disable browser alerts
turns off app delivery without changing the browser's site permission.

Alerts watch the currently open matchup only. The first loaded event set, a week
change, or a newly enabled watcher establishes a baseline without replaying old
events. New IDs are deduplicated in memory and browser storage; each polling
batch produces at most one notification with the latest event and a count of
others. Events with timestamps older than ten minutes are not notified when a
partial feed recovers. Event descriptions and preferences stay in this browser;
there is no push service or notification backend.

With alerts enabled, the shared 60-second live / three-hour idle polling loop
continues in a hidden tab but still pauses offline. Browser suspension or timer
throttling can delay delivery. Keep the matchup page and browser open; this is
not closed-tab push delivery. Other pages do not mount the matchup event watcher.


### Live event cadence and scoreboard progress

The open matchup now has an independent event loop. It bypasses the browser
HTTP cache, checks relevant live games every 15 seconds, and does not overlap
requests. This does not change the 60-second fantasy roster/score cadence.
Once relevant games finish it takes the final summary, retains completed game
history, and switches to three-hour idle status checks. It wakes at the next
relevant scheduled kickoff and rechecks delayed starts each minute. Unknown
status retries each minute. Hidden tabs pause unless browser alerts are enabled;
offline tabs always pause. Source publication and browser throttling can add delay.

Latest Alerts shows only events from relevant games currently in progress and
only while the status is fresh. With no relevant game live it pauses, leaving
previous events in the full timeline. Desktop event notifications likewise only
cover currently live games. The notification preference can stay on between games.

The score panel shows the provider matchup projection when supplied, otherwise
the sum of all available starting-lineup weekly projections (unavailable if any
starter lacks one). Played, In play, and Still to play count actual roster entries
in starting slots according to final, live, and scheduled NFL game status.
Bench, IR, taxi and empty placeholder slots are excluded. Byes/no scheduled game
and unavailable statuses are separate; a zero fantasy score does not infer that
a player has or has not played. These are NFL game counts, not snap participation.


### ESPN live totals and complete lineup rows

ESPN uses `totalPointsLive` and `totalProjectedPointsLive` for current totals;
settled `totalPoints` can remain zero while starters have scored. Prefer the
finite live value (including zero) and fall back to settled values if absent.
These are provider matchup totals, preserving adjustments and multiweek scoring;
they are not reconstructed from the currently displayed player rows.

ESPN starting rows follow `settings.rosterSettings.lineupSlotCounts`, including
empty placeholders for unfilled slots. Both expanded lineup panels stretch to
the same height with equal row space. A missing fixture for a player with an
NFL team is labeled “Bye / no game scheduled”; unavailable game status stays
explicit. Empty slots do not count as players.

Latest Alerts is now completely hidden unless a relevant game is live and its
status is fresh. The event watcher remains mounted to resume at kickoff, and
historical events remain accessible in Major Events. The score-box explanatory
paragraph has been removed.


### Unified homepage and Settings

`/` shows the saved-league scoreboard. `/game-day` is a league-scoped page.
Each league card loads only its current Game Day snapshot through the existing
platform adapter, with independent errors, cached fallback, and adaptive polling.
The currently connected league reuses App's shared snapshot and polling loop.
Other saved leagues use their saved ESPN credentials or current Yahoo session as
needed; reconnect errors link to Settings. Opening a homepage card or league-name link includes platform, league ID and
season, and enters that league’s Game Day overview. From there a matchup opens
its detailed player breakdown.

The homepage displays only matchups involving the selected team in each league.
`isMyTeam` identifies the default when available. Settings offers a persistent
My team choice (`teamId` in `ffa:my-leagues:v1`), and refreshes do not overwrite an
explicit choice. Unidentified teams link to Settings rather than showing all
league matchups. The newest saved season is shown by default, with a season
selector when older connections are saved. League connections, saved-league
management and team selection now live at `/settings`. A successful connection
returns to the scoreboard. These preferences and snapshots remain local.


### Navigation hierarchy

The combined homepage, Recap and Settings use global navigation:
Game Day (`/`), Recap (`/recap`) and Settings (`/settings`). The logo always returns to the combined homepage.
Clicking a homepage matchup or any displayed league-name link enters the
corresponding league's `/game-day?league=...&year=...` overview. Its full league
nav is restored, and the Game Day nav link stays in that league. The header's
All leagues control returns to the combined homepage. Saved-league names in
Settings and league labels in the header and analysis page subtitles use the
same link. A new league's deep link waits for its connection before rendering
content, avoiding a flash of the previously selected league's page.


### Combined homepage refresh

Homepage cards no longer show individual refresh buttons, update timestamps,
or polling notices. A single Refresh all control refreshes every league visible
in the selected season, waits for all refresh attempts, and stays disabled while
refreshing. The combined Last updated time uses the oldest visible snapshot so
a failed refresh cannot make stale league data appear newly updated. Individual
connection errors remain on their cards; automatic polling continues unchanged.


### Shared Players sidebar

The combined homepage compares the selected teams' starting lineups and their
opponents, grouping starters appearing in at least two distinct matchups.
Bench, IR, empty slots, unrelated matchups and different NFL weeks are excluded.
Own and opposing exposure counts remain separate, including mixed exposure.
ESPN/Sleeper/Yahoo IDs join through the compact identity map documented in
`docs/PLAYER_ID_MAP.md`; ambiguous name matches are not combined. Defenses join
by canonical NFL team. Expand a player to see the contributing leagues and each
league's points and projection. Points from different scoring rules are never
summed into a shared fantasy total.

One NFL event/stat loop per relevant season/week reuses the existing timeline
API, with 15-second checks while games are live and kickoff-aware idle cadence.
The summary response's per-athlete boxscore provides NFL stats, and snapshots
provide fallback weekly stats and defense stats. Personal events require a full
player-name match; other events are explicitly labeled Game event. New stats or
events are highlighted briefly after the initial baseline. Browser alerts,
when already enabled, include relevant shared-player events and defense game
events; the first load never replays history as notifications.

Refresh all also refreshes sidebar NFL data. Failed feeds retain saved data
with timestamps; incomplete leagues remain identified. The sidebar is sticky
and scrollable on desktop, with a sticky heading and compact expandable player
rows. Below 1100px, Matchups / Shared Players tabs default to Matchups and keep
both panels mounted so polling continues. Tabs support arrow, Home and End keys.

The compact homepage uses one matchup per row, always placing the selected own
team on the left with its correctly mapped score and projection. Remaining/live
player counts reuse the same weekly NFL feed, covering all relevant starters
even when none are shared. Minimising the sidebar preserves its event watchers.

Shared-player rows show current fantasy points without expansion, preserving
zero scores. Different league scoring produces a min–max range, never a sum;
missing and saved scores are identified. The combined dashboard also reuses
the weekly NFL feed for collapsible Latest Alerts and Major Events panels below
the matchup scores. Alerts only appear for fresh live games; the full timeline
remains available while idle, newest first. Each week's panel IDs are unique.

### Game Day focus, impact and recaps

The combined scoreboard offers league order, closest projected margin and
closest current margin, plus a 10-point close-only filter. Unknown margins sort
last and are excluded from that filter; unstarted 0–0 games do not qualify by
current score. Weekly projection sums are not compared with multiweek totals.
Filtering only affects matchup rows: every connected league keeps polling and
still contributes to alerts, warnings, shared players and recaps.

Alerts and timeline entries estimate per-league direction for recognisable
passing/rushing touchdowns, made field goals, interceptions and clear lost
fumbles. Starter-only attribution uses full names or unique initials in the
relevant NFL game. Passing TDs can affect both passer and receiver; defensive
exposure reverses when an opposing offense scores or turns the ball over.
Both helpful and harmful exposure remains visible within the same league;
points are never inferred or summed across scoring rules. Nullified plays,
returns and ambiguous turnovers stay unconfirmed. Already-enabled browser
notifications include the same impact summary, with a fresh baseline to avoid
replaying historical events when the feature is first loaded.

Lineup Warnings checks the selected own teams for empty starter slots, provider
injury flags (including questionable/out/IR) and bye/no-game starters when the
NFL schedule is available. It excludes bench/IR slots and marks started games
and saved rosters. ESPN, Sleeper and Yahoo availability flags are normalized
and preserved in the local roster cache; older snapshots acquire flags on
refresh. Each warning opens the common full-roster view with league/team context.

Game Day Recap stores compact display summaries in `ffa:game-day-recaps:v1`
for at most 500 league/team/week/matchup rows in this browser. Only currently
connected league/team selections appear. History starts when Game Day is
visited; prior seasons/weeks are not backfilled. Recaps include per-league scores,
top starter and opponent, finished-lineup records and the closest finished margin.
Missing/stale/error data, unpaired teams, unknown game status and unfinished
multiweek rounds remain pending. Finished-lineup results are snapshot estimates
subject to corrections, not provider-certified results. A missing feed cannot
downgrade a completed entry at the same snapshot time. Corrupt history is ignored,
and storage failures leave the current recap visible with a message. No new
external services or automatic roster changes are involved.

The weekly recap is available at `/recap` through the global Recap navigation
link. Game Day continues recording summaries without rendering the recap panel.
The recap page reads saved history and shows snapshot times; viewing it does not
overwrite completed entries with incomplete current feeds. Refresh scores on
Game Day to update the archive. The page uses the global navigation and can be
opened directly without selecting a current league.

Recap results use four record totals and separate league cards, each with aligned
own/opponent scores, a result badge, and distinct player highlights and snapshot
metadata. Shared players sort by the highest finite projection across their
league occurrences, descending, with missing estimates last. That highest
projection appears beneath the current points/range even while collapsed. Zero
projections remain valid, and live status does not override this ranking.

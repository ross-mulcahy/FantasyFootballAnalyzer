# Game Day guide

## Connect your leagues once

1. Start the app and open the same browser profile and address each time.
2. Go to **Settings**, enter your Sleeper username and select **Find my
   leagues**. Choose the league you want, then select **Connect selected
   league**. If you already have a Sleeper league URL or ID, use **Paste league
   link or ID** instead. ESPN and Yahoo connection controls are currently
   paused; previously saved leagues remain available on this device.
3. On the finish screen, confirm **My team** or choose it from the list. This
   identifies your matchups, lineup alerts and rooting conflicts. You can
   change the choice later in Settings; league-wide viewing works without it.
4. Select **Add another league** to keep building your wall, or **Go to Game
   Day**. If you skipped the team choice, **Watch this league** opens its
   league-wide matchup wall. Search results mark leagues already connected.
   Connections and team selections are saved locally.

Private leagues may need reconnecting when their sessions expire. For saved
ESPN connections, the optional **Remember ESPN login on this device** keeps the
connection across browser sessions; otherwise its login remains session-only.
Yahoo uses OAuth when connection setup is available.
Local browser data is not committed or synced to GitHub.

## Read the combined scoreboard

The Game Day Hub is a wall of broadcast monitors. Each channel shows your team
in the green upper scorebug, your opponent in the indigo lower scorebug, live
scores, weekly projections and players left. A live indicator refers to the
NFL game's status, not whether a player is currently on the field. The wall
title scales from Quad-Box to Octo-Box and beyond as active matchup screens
increase. A spare channel offers a link to add a league, or to return to all
leagues when the wall is filtered to one.

The header league buttons are alphabetised by league name. Selecting one keeps
you on the current route: on the Hub it shows every matchup in that league,
including games without your team; on a roster, trade or other analysis page
it changes the loaded league there. The
**All Leagues** button returns to the combined Hub. Opening a league from a
matchup monitor still enters its detailed Game Day page.

In a selected league, the monitors fill two columns. **League Pulse** replaces
the cross-league Rooting Conflicts panel with the number of games reporting
points and the closest available projected line. RedZone Wire follows NFL
games involving starters across that league's matchups. The production desk's
Comeback Watch and show card cover every matchup; its lead labels are neutral
team names. All Leagues returns those tools to your own matchups and
cross-league conflicts.

Pixel Scott changes takes every 15 seconds while the page is visible. **Pause
Takes** holds the current line; **Next Take** still advances manually. The
weekly forecast counts projected wins, losses and ties across your selected
teams, and calls out matchups with missing comparable projections. The
**Rivalry File** uses scored head-to-head meetings from the available league
archive (up to three seasons), excluding the current week; it never presents
an unplayed game as a result. If the archive cannot load, Scott skips that
take. The coaching presser appears only after a confirmed loss or once a game
is underway with at least a 30-point deficit in both the live score and
projection.
The monitor's **Draft Excuse** action follows the same rule.

Use **Watch Mode** on a selected league to put one game on a full-screen studio
monitor. **Auto Director** starts with the most consequential available channel,
then rotates every 18 seconds while the tab is visible. Fresh fantasy score
changes or NFL plays in a game involving starters can take priority and hold
the channel for 30 seconds before the next automatic cut. Select a
channel or an alert to hold that game manually; **Go Live** resumes automatic
cuts, **Next Game** moves one channel forward, and Escape closes the view.
The on-air story takes most of the screen, with a score change shown as a
before-and-after score tape or an NFL play shown with its source time. Older
events are labeled as the last verified update; they are never presented as
breaking. Select an item in **The Wire** to take that exact story and channel.
The smaller scorebug stays visible underneath. **Matchup Intel** expands to
show projected point share and leading starters when you want detail.
The wire separates confirmed fantasy score changes from NFL play reports;
the latter do not establish the exact fantasy points earned. Scores and
projections remain tied to the league provider's latest loaded snapshot.
NFL game status describes the game, not whether that player is on the field;
unavailable roster details are marked as such. Fantasy and NFL feed sync times
are shown under Matchup Intel.

Play reports offer an **@NFL** search link when no clip matches. When the
optional official video metadata feed is configured, Watch Mode may also show
**Watch likely clip** for a likely match. The feed checks recent uploads from
NFL on FOX, NFL on CBS and NFL, in that order. NFL play uploads use several title orders: player
first ("JUSTICE HILL MAKES 65 YARD RUSHING TD"), play first ("INT. BY JOURDAN
LEWIS"), and action first with the player last ("TD PASS DOWN THE MIDDLE TO
PARKER WASHINGTON"). The matcher recognizes these forms and allows omitted
yardage. It requires the named player, compatible play type and a plausible
publish time; explicit yardage must agree. Recaps, previews, compilations,
wrong-season titles and ambiguous same-player clips from the same source do
not auto-match. This
is a suggested clip, not a verified play-to-video association; check the video
itself. While Auto Director
is on, a fresh play with a likely embeddable match automatically cuts to the official
video once. It starts muted, returns to the live wire after 40 seconds, and
offers **Return to Live** at any time. Turning Auto Director off keeps the
current clip open for manual viewing. Select **NFL
Highlights** for game recaps related to the current matchup, or to search the
official channel when no reliable title match is found. Inline playback uses
YouTube's privacy-enhanced embed. The metadata service checks each upload's
embed permission, and the player catches playback errors that can still occur
because of rights claims. If an embed is blocked, Watch Mode tries the next
matching official source and excludes the blocked clip for that session.
If no alternative works, it keeps a direct **Watch on YouTube** link and Auto
Director returns to the live wire after 12 seconds.

For automatic title matching on Spacefast, add `YOUTUBE_API_KEY` as a Secret in
the **Fantasy Game Day** Space's Variables. For local Vite development use
`.env.local`; for the separate Vercel API use its server environment. Enable
YouTube Data API v3 on that key. The server reads recent uploads from the
official `@NFLonFOX`, `@NFLonCBS` and `@NFL` channels and returns titles, IDs,
source names, publish times and embed permissions; the key
never enters the browser bundle. If the key is absent or the metadata service
is unavailable, channel searches still work. The Spacefast build uses its
same-origin `/api/nfl-highlights` Function. A separately hosted metadata
service can be selected with `VITE_NFL_HIGHLIGHTS_URL` at build time.

**Refresh all** refreshes every visible league and the shared NFL feed.
**Last updated** represents the oldest league snapshot. If a league cannot
refresh, its saved scores remain visible with a reconnect link.

Select **Closest projected margin** or **Closest current margin** to put tight
contests first. **Only close (≤10 pts)** limits the displayed rows. With league
order selected, the filter uses projected margins. Unknown margins are excluded;
unstarted 0–0 contests are excluded from current-margin focus. Filtering leaves
all leagues connected and updating.

The scorebug uses the provider's complete matchup projection when available.
If one or more starters lack a provider estimate, it shows the sum of known
starters marked **partial** and the number unprojected; hover the monitor or
open the matchup to see their names and injury statuses. Sleeper sometimes
returns only draft ADP for an Out, IR or Doubtful starter, with no weekly
scoring stats. That is a missing estimate, not a zero. If none have estimates
the scorebug says **pending**. The
studio line and segmented projection-share bar require complete comparable
totals. Neither the line nor the bar represents a betting line or win probability.

The playful Sweat BPM meter is a fantasy stress index, not a heart-rate reading.
It starts at 72, adds 10 per lineup hazard, then 10 for the first rooting
conflict and 4 for each additional conflict. This keeps a busy multi-league
board energetic without treating every repeated conflict as a full new crisis.

Click a league name or matchup row to enter the league's Game Day page. There,
open a specific matchup for its score, starting lineups, stats and projections.
**Rosters** opens the full roster view with a team selector, including bench and
reserve slots. Browser Back returns through these views.

## Use the production desk

A **Director's Cue** appears after a recent, consequential score refresh or a
recognisable NFL play involving your starters. **Take channel** scrolls to that
league's monitor. A score cue reports the actual difference between two
provider snapshots; a play cue reports only likely direction until your fantasy
provider confirms the points. The highlighted channel remains in its normal
place on the wall.

The **Sunday Production Desk** sits below the monitor wall:

- **Comeback Watch** shows the current lead or the points needed to take it,
  plus the count of starters still live or yet to play on both sides. Unknown
  roster or NFL status is labelled unconfirmed. It is not a win probability.
- **Instant Replay** has a scrub-able score tape and a separate play tape.
  Score tape records changes only between snapshots observed by this browser;
  it cannot reconstruct earlier plays or attribute a particular score delta
  to an NFL event. The play tape retains the existing cautious impact analysis.
- **Halftime / Final** assembles the available record, biggest recorded swing,
  a same-position bench comparison, and the largest rooting paradox. **Save
  show card** downloads an SVG graphic. The bench comparison is a talking
  point, not a claim that the players were interchangeable under league rules.
- **Studio Audio** has separate opt-in switches for lead changes and net swings
  of at least ten points. The sidebar audio switch is still the master mute.

The score tape and cue preferences are local to this browser. Clearing site
data removes them. Final results can change after provider corrections.

## Follow shared players

**Rooting Conflicts** includes starters and defenses appearing across two or more of your
matchups. **Yours** and **Against** count leagues separately, so a player can
appear on both sides of your week.

Players rank by the highest available projection from their league appearances.
That projection is displayed beneath current fantasy points. Missing estimates
sort last; zero estimates remain valid. When current points differ by league,
a range is shown. Points are never added across leagues with different scoring.
Expand a player for the exact per-league figures, NFL stats and reported events.
Use the panel's pop-up control to read the full list in a larger monitor. The
**RedZone Wire** panel has the same pop-up control for its event timeline;
closing either pop-up returns to the Hub without changing its data.

On phones and smaller screens, switch between **Matchups** and **Shared Players**.
The page opens on Matchups and keeps both feeds mounted while you switch.

## Act on lineup warnings

Pixel Scott's **RedZone Update** identifies empty starting slots, provider
injury flags and byes or missing scheduled games. Repeated warnings for one
player appear in one triage row with a fix link for each affected league. The
triage links and hazard count appear on the lineup-hazard take only. **Next Take**
cycles through the closest matchup, a rooting conflict and a coaching
excuse; it does not change lineups. The fix links open the provider's league
team page when available.

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

### Studio sounds

The sidebar **Audio alerts** control mutes all app sounds. The Game Day studio
uses four original, low-volume cues: a relay click when you change leagues, a
fader click on **Next Take**, a short stinger for a newly reported lineup
hazard and a pulse when a matchup crosses into a projected margin of 10 points
or less. The initial snapshot is silent. Repeated polls and renders do not
replay the same alert; hazard and close-game cues have 30- and 60-second
cooldowns respectively. Hidden tabs update their baseline without sounding.
Browser audio may wait for your first click or key press. These cues are
generated in the app and contain no NFL broadcast recordings.
The two additional live-score cues under **Studio Audio** are off by default;
they play only for new confirmed score changes in a visible Game Day tab.

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

Settings shows each league's last successful
refresh, reconnect requirement or setup problem. A cached snapshot alone is not
labelled as a verified live connection. Offline status uses saved data. Select
Reconnect to open the matching platform, league and season in Settings; your
saved My team selection is kept. ESPN and Yahoo reconnection controls are
currently paused, so Settings identifies these saved connections without
submitting a new login. When connection setup is available, a failed connection
bypasses metadata cache on resubmission, and Yahoo does not fall back to a
different season.

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

## Hosted Spacefast install

The private hosted install has its own browser storage. Export a backup from local Settings and restore it in hosted Settings, then reconnect private ESPN leagues. Yahoo requires a separate hosted setup. See [Spacefast install](SPACEFAST.md) for the address and update procedure.

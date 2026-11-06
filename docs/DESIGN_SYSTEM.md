# WITCHING HOUR // RedZone Control Room

Where Losses Become Wins. A dense production switcher desk for multi-league fantasy football.

## Identity and tokens

Inter supplies body UI and player names. Self-hosted Google Font Chakra Petch (600/700) supplies uppercase display headers, franchise names and tabular digital scoreboards. The extra-bold wordmark tracks at -0.03em: WITCHING in #F8FAFC, HOUR in #10B981. Pair with the ON AIR wall label, which scales from QUAD-BOX to OCTO-BOX and beyond with the active screen count. JetBrains Mono supplies projections, records, PAR, percentages and timestamps. Enforce tabular figures globally.

| Token | Hex | Purpose |
| --- | --- | --- |
| --ink | #0B0F17 | Obsidian Pitch canvas |
| --ink-2 | #131B2E | Broadcast Slate elevated panels / sidebar |
| --ink-3 | #1E293B | Interactive surfaces / table heads |
| --rule | #233047 | Structural 1px borders |
| --lime | #10B981 | Turf Emerald brand / healthy / winning |
| --gold | #F59E0B | Octobox Gold: projected margins ≤10 points |
| --broadcast | #E11D48 | Hanson Crimson: live badges / scoring plays / clearly marked satire wire |
| --blood | #EF4444 | Penalty Red: injury, OUT, IR, bye, bust, negative outliers |
| --bone | #F8FAFC | Floodlight White text |
| --bone-dim | #94A3B8 | Sideline Silver muted text |

No white borders, decorative offset block shadows, glass blur, glowing blobs, purple/blue/pink/cyan gradients, emoji, or NFL bitmap logos. Use 4–6px corners and 10–16px panel padding. Preserve visible focus, 36px controls, keyboard navigation, reduced motion and honest missing-data states.

## Shared primitives

NflTeamChip renders an 11px bold mono ticker pill with #1E293B fill, #E2E8F0 text and a 3px official team-colour left border. Aliases JAC/JAX and WAS/WSH resolve without changing provider IDs. No logo requests.

PosBadge uses 15% fill, 30% border and solid text: QB #F43F5E, RB #10B981, WR #38BDF8, TE #F59E0B, FLEX #A855F7, K and D/ST #94A3B8. SVG line icons are 14px (navigation 15px), monochrome, stroke-width 1.75.

## Shell

Desktop: 220px command sidebar, horizontal fast-switch league dock and a workspace that scrolls within a locked 100dvh shell. Mobile: collapsible accessible drawer. Group navigation into CONTROL ROOM, FRONT OFFICE, TELEMETRY, THE VAULT. Sidebar footer owns audio, last sync and Sync All Leagues. League dock buttons stay alphabetical and switch league context on the current route; All Leagues returns to the combined Hub. League dots reflect available lineup hazards, close projected margins, or healthy known rosters; unknown is neutral. Never infer healthy from missing data.

## Layout archetypes

1. Split-screen command center: a two-column matchup wall beside Rooting Conflicts and RedZone Wire. Pixel Scott's RedZone Update sits above the wall; its triage groups warnings by player. Each CRT channel places the green user scorebug over the indigo opponent scorebug, with a projection-share bar (not a statistical win probability). Gold bezel for ≤10-point projected margins. Shared starters show YOURS ×n, VS ×n, ROOTING PARADOX when both. The two right-side monitors offer larger pop-up views. Rosters use 6/6 current roster and telemetry with weekly chart; waivers use a feed and summary stack.
2. Franchise dossiers and asset feeds: one bordered team surface, hairlines rather than nested boxes, shield monogram, horizontal identity/record, 2×2 key stats, positional bars, top three players. Trades are two-column asset swap tickets with net PAR. Awards use SVG plaques and gold or penalty-red accents. H2H win/loss cells have 12% green/red heatmaps.
3. Dense analytical tables: Players, Draft, History, Luck. Freeze name columns on horizontal scroll. Only measured top/bottom 15% PAR, Luck or Draft Value outliers receive 12% emerald/red tint. Missing values remain missing.
4. Utilities: Settings uses grouped slate controls and emerald active toggles. There is no standalone PDF Export route.

## Broadcast copy

Close filter: “Witching Hour margins only (≤10 pts)”. Value grades: LEAGUE WINNER, SOLID VALUE, REACH, ROSTER CLOGGER. Empty wire: “Seven hours of commercial-free football haven't started yet. No goal-line heartbreaks to report.” Empty checked hazards: “All rosters legal. Your fate is in the hands of the fantasy gods now.” Loading rotates Checking hamstring reports..., Calculating garbage time upside..., Scanning the Octobox.... Keep stale, missing and incomplete provider disclaimers accurate.

## Preservation contract

Presentation changes should preserve fetching, caches, storage keys, calculations, provider IDs, attribution and generated data unless a requested feature explicitly changes them. See CLAUDE.md for architecture and validation commands.

## Studio hardware personality

The Hub wall is two columns at viewport widths ≥1280px. Its name follows active matchup-screen capacity: Quad-Box for up to four, Octo-Box for five to eight, Duodecuple-Box for nine to twelve. An odd screen count gets a spare channel with a RedZone-style link to add a league or show all leagues. Studio LINE pills derive from complete projected margins (sign reversed for the user's spread), read TOSS-UP within one point, and LINE: OFF when projection data is unavailable; they are entertainment, not sportsbook odds. A scorebug with missing starter estimates shows the known sum as partial, or pending when none are available; partial totals never drive the line or projection-share bar.

League dock controls and refresh actions use physical switcher keys: slate faces, 1px #334155 rim, 3px #020617 bottom bevel, 2px active travel and a small semantic LED edge. This is the explicit exception to the earlier flat-control direction; panel shadows remain restrained inset rims.

Lineup hazards use a 6px diagonal penalty-red caution strip and emergency triage tickets: player, uppercase status, league pill, compact CACHED/LOCKED context where needed, and per-league provider actions. In the Game Day Hub these now live in the consolidated StudioAnchorDesk, grouped by player. Avoid repeated boilerplate. Preserve real errors and unavailable-data notices.

CortisolMeter is a playful fantasy index, never a medical measurement: 72 + 12 × reported lineup hazards + 15 × players rostered both for and against the user. COMPOSED <110, ELEVATED 110–149, CRITICAL ≥150. ECG motion respects reduced motion.

A 28px StudioChyronTicker occupies its own non-shrinking footer row and labels all ten fictional headlines SATIRE WIRE, interpolating cached user team/player names and using neutral fallbacks. It can pause or collapse; hover/focus pauses motion, reduced motion removes it. DRAFT EXCUSE generates a local, matchup-specific coaching quote; no external service or posting.

## Current visual personality: 16-bit SNES TV Sports Studio

This records the first studio pass, superseded by the layered SNES scene and silver CRT treatment below. Hazard warnings take priority over ≤10-point projected matchup sweat, then calm/all-clear. Missing roster data is explicitly awaiting signal. The three poses point urgently under a red beacon, hold a microphone with pixel sweat, or relax with a studio mug. Motion honours reduced motion.

The anchor consumes existing warnings, projected margins and the largest mapped rooting conflict. Warning counts remain per league, but the triage display groups by normalized player name, retains distinct statuses, and offers every affected league/team fix link once. CACHED and LOCKED stay available as compact context. The RedZone Update shows the warning details; NEXT TAKE cycles closest matchup, biggest rooting paradox and a local coaching excuse without repeating the hazard strip. No domain calculations, API calls or storage contracts change.

The initial monitors used #0D1836 royal-blue surfaces, 2px #2A3F7A bezels and CRT scanlines. The later CRT pass below replaces their side-by-side layout. The segmented emerald/crimson tug-of-war meter remains a share of known weekly projections, not an invented win probability.

Silkscreen (Google Fonts, self-hosted, OFL-1.1) is restricted to small arcade badges: CH, LIVE, VS, status, ROOTING PARADOX and SATIRE WIRE. Chakra Petch handles readable uppercase franchise/player names and headers; JetBrains Mono handles scores and data. Interactive keys use 2px #3B5284 rims, 2px black pixel shadows and 2px active travel. These explicit arcade shadows supersede the prior prohibition on decorative offset shadows. No connection-summary boilerplate bar or Game status pending filler in the Hub.

## Studio polish

Matchup monitor interiors have three independent bands: compact metadata/hazards, an uncluttered score row, then provider/presser actions with the segmented bar flush below. Franchise names use 18px Chakra Petch, a 22-character display limit and full-name tooltips; CSS ellipsis handles smaller available widths. VS overlaps the LED frame rather than floating above it. Container queries give the LED score its own centered row on bays ≤460px, keeping both team labels readable without collisions.

Pixel Scott uses one-unit pixel details on a 64×48 SVG grid: swept hair in #FDE047/#EAB308/#A16207, face and jaw shading, wrap-around headset, double-breasted #1E3A8A/#172554 suit, tablet and mug. The stage and dialogue are compact; cortisol telemetry sits inline with THE QUAD-BOX title. No duplicate Your Matchups heading.

Rooting Conflicts and RedZone Wire share royal-blue 2px monitor chrome, a #162752 bezel, square gold LED and accessible [−]/[+] collapse controls. Player cards are recessed #081024 with #1E3264 rules. Sidebar canvas is #080E20 with a 2px #1E3264 edge; the latched active key uses #162752, a 4px gold left indicator and a restrained inset highlight.

## Physical CRT broadcast studio

This current treatment supersedes earlier flat blue monitor and side-by-side score layouts. CrtMonitorFrame supplies thick #334155 hardware, light #64748B top/left bevels, dark #0F172A bottom/right bevels, 6px black shadow, corner rivets and lower green/red LEDs. The recessed #050B14 screen has a pointer-transparent scanline overlay. Shared-player and RedZone panels use this same frame.

Matchup cards split full-width screens vertically: turf-green user team above studio-indigo opponent. Team names use Chakra Petch and scores use 32px JetBrains Mono. VS sits on the divider. Provider links, hazards and the presser remain in a compact footer; projections sit beneath each team name. The segmented meter shows projection share, never an invented win probability.

Pixel Scott's layered SNES studio scene has three reactive poses, shaded blond hair, headset, suit, red tie, a curved desk and stadium turf behind his shoulders. StudioAnchorDesk places the scene in a silver frame beside a cream #F8FAFC comic dialogue panel with black border, stepped tail and dark deduplicated triage strip. Hazard priority, unknown-data handling and reduced-motion support remain unchanged.

PageTeleprompter introduces Rosters, Teams Dossier, Draft Grades, Trades and Waivers with a square silver portrait and white context strip. TeamDetail uses equal-width roster/tape-room consoles, recessed player slots, a diagonal gold bench divider and a green-grid weekly-score oscilloscope. Tape-room minimise/expand and close/restore controls affect presentation only. Draft audit stamps map existing grades to DRAFT STEAL, SOLID PICK, REACH and TOTAL BUST; underlying grading is unchanged.

## Compact studio layout

The App shell is a locked 100dvh flex column. Its upper command area contains the sidebar and dock; workspace-scroll owns vertical scrolling with 32px bottom padding. The 28px satire wire occupies its own non-shrinking footer track, outside the scrollport. Source attribution stays inside the workspace, and print restores normal document flow. Page navigation resets workspace scroll.

Each split monitor now uses two horizontal scorebug rows: truncated 20px franchise name and projection at left, 32px tabular score at right. Full names remain in title tooltips and link labels. VS is anchored to the green row's bottom seam; hazards, provider link and presser share one compact footer. The desktop title, week/leagues, cortisol and refresh occupy a 40px row; narrow layouts wrap.

The desk uses a 176px silver portrait with a naturally sized cream dialogue and NEXT TAKE in the dialogue header. Scott's face has warm-peach skin, orange jaw shading, exactly two navy eyes with white catchlights, golden-brown eyebrows and a clean white grin. The headset runs around the outside of his cheek, clear of his nose and smile.

## Shared studio primitives and route migration

StudioMonitorFrame is the canonical hardware surface for route cards, tables and consoles. It owns the 6px silver casing, inset CRT, scanline overlay, rivets and status LEDs; title, channelCode (or channel), badge, controls and optional onMinimise configure its top bezel. Semantic as tags, HTML attributes and keyboard handlers pass through. The padded option migrates old cards while retaining their layout classes; CrtMonitorFrame is a compatibility re-export, not a second implementation.

StudioTeleprompterBar uses a 64×64 SVG portrait and cream 3px-black dialogue. NEXT TAKE cycles commentary; changing the loaded data resets the take. studioPageTakes uses the existing draft grades, post-trade/full-season verdict metadata, completed weekly results and waiver PAR. Missing data, pending picks and keepers stay explicit. Front-office, player, history and award routes use contextual briefings, while public tool and setup pages use page-specific orientation. PageTeleprompter remains a compatibility export.

Rosters use a 12-column layout with six columns per console, LINEUP 01 / TAPE 02 labels, adjacent NFL chips and a yellow/black bench divider. Best pickups join the weekly scope and draft stamps in the tape room; unknown pickup PAR remains pending. Team cartridges use a split turf/indigo header, recessed PF/PA/All-Play/Moves grid and ten-segment position bars. Position strength compares known roster season points against that team's strongest position; missing points stay unavailable.

Draft, trade, waiver, luck, award, history, player and ancillary route surfaces use the shared frame. Statistical tail highlights use existing strict outlierHeatmap measurements with 15% emerald/crimson fills. Standard draft labels are DRAFT STEAL / SOLID PICK / REACH / TOTAL BUST; auction Fair semantics, keeper and pending states remain unchanged. PixelStudioIcon supplies integer-grid SVG studio symbols; NflTeamChip remains the NFL identity surface.

Final hub adjustments: content-sized dialogue aligns at the top beside the broad-shouldered anchor, NEXT TAKE sits in the dialogue header, shared-player viewport caps at 210px, and Scott has a four-pixel light broadcast smile outlined in navy. The reserved satire footer track remains outside workspace scrolling.

## Studio audio

The existing Web Audio engine synthesizes four original, short cues through one low-volume, low-pass master chain. Channel changes use a relay click; NEXT TAKE uses a fader click; a newly reported lineup hazard uses a stinger; and first entry into a ≤10-point projected matchup margin uses a double pulse. `StudioAudioEvents` compares each league/week with its previous visible snapshot: first load and week changes are silent, identical polling results cannot replay, and hazard/close cues have 30-/60-second cooldowns. Hidden tabs update the baseline silently. The sidebar mute preference applies to every cue. Do not ship sampled NFL broadcast audio or announcer recordings without the necessary rights.

# WITCHING HOUR // RedZone Control Room

Where Losses Become Wins. A dense production switcher desk for multi-league fantasy football.

## Identity and tokens

Inter supplies UI, league, team and player names. The extra-bold wordmark tracks at -0.03em: WITCHING in #F8FAFC, HOUR in #10B981. Pair with the ON AIR / QUAD-BOX // LIVE broadcast pill. JetBrains Mono supplies scores, projections, records, PAR, percentages and timestamps. Enforce tabular figures globally.

| Token | Hex | Purpose |
| --- | --- | --- |
| --ink | #0B0F17 | Obsidian Pitch canvas |
| --ink-2 | #131B2E | Broadcast Slate elevated panels / sidebar |
| --ink-3 | #1E293B | Interactive surfaces / table heads |
| --rule | #233047 | Structural 1px borders |
| --lime | #10B981 | Turf Emerald brand / healthy / winning |
| --gold | #F59E0B | Octobox Gold: projected margins ≤10 points |
| --broadcast | #E11D48 | Hanson Crimson: live badges / scoring plays only |
| --blood | #EF4444 | Penalty Red: injury, OUT, IR, bye, bust, negative outliers |
| --bone | #F8FAFC | Floodlight White text |
| --bone-dim | #94A3B8 | Sideline Silver muted text |

No white borders, offset block shadows, glass blur, glowing blobs, purple/blue/pink/cyan gradients, emoji, or NFL bitmap logos. Use 4–6px corners and 10–16px panel padding. Preserve visible focus, 36px controls, keyboard navigation, reduced motion and honest missing-data states.

## Shared primitives

NflTeamChip renders an 11px bold mono ticker pill with #1E293B fill, #E2E8F0 text and a 3px official team-colour left border. Aliases JAC/JAX and WAS/WSH resolve without changing provider IDs. No logo requests.

PosBadge uses 15% fill, 30% border and solid text: QB #F43F5E, RB #10B981, WR #38BDF8, TE #F59E0B, FLEX #A855F7, K and D/ST #94A3B8. SVG line icons are 14px (navigation 15px), monochrome, stroke-width 1.75.

## Shell

Desktop: fixed 220px command sidebar, horizontal fast-switch league dock, scrollable workspace capped at 1600px with 24px padding. Mobile: collapsible accessible drawer. Group navigation into CONTROL ROOM, FRONT OFFICE, TELEMETRY, THE VAULT. Sidebar footer owns audio, last sync and Sync All Leagues. League dots reflect available lineup hazards, close projected margins, or healthy known rosters; unknown is neutral. Never infer healthy from missing data.

## Layout archetypes

1. Split-screen command center: Quad-Box matchups left 7/12; rooting conflicts and RedZone Wire stacked right 5/12. Lineup hazards before the grid. TV scorebugs have a bezel strip, recessed 20px mono scores and flush 4px projection share bar (not a statistical win probability). Gold bezel for ≤10-point projected margins. Shared starters show YOURS ×n, VS ×n, ROOTING PARADOX when both. Rosters use 6/6 current roster and telemetry with weekly chart; waivers use a feed and summary stack.
2. Franchise dossiers and asset feeds: one bordered team surface, hairlines rather than nested boxes, shield monogram, horizontal identity/record, 2×2 key stats, positional bars, top three players. Trades are two-column asset swap tickets with net PAR. Awards use SVG plaques and gold or penalty-red accents. H2H win/loss cells have 12% green/red heatmaps.
3. Dense analytical tables: Players, Draft, History, Luck. Freeze name columns on horizontal scroll. Only measured top/bottom 15% PAR, Luck or Draft Value outliers receive 12% emerald/red tint. Missing values remain missing.
4. Utilities: Settings and PDF export use max-width 56rem grouped slate controls, emerald active toggles.

## Broadcast copy

Close filter: “Witching Hour margins only (≤10 pts)”. Value grades: LEAGUE WINNER, SOLID VALUE, REACH, ROSTER CLOGGER. Empty wire: “Seven hours of commercial-free football haven't started yet. No goal-line heartbreaks to report.” Empty checked hazards: “All rosters legal. Your fate is in the hands of the fantasy gods now.” Loading rotates Checking hamstring reports..., Calculating garbage time upside..., Scanning the Octobox.... Keep stale, missing and incomplete provider disclaimers accurate.

## Preservation contract

Presentation changes must not alter fetching, caches, storage keys, routing contracts, calculations, provider IDs, attribution or generated data. See CLAUDE.md for architecture and validation commands.

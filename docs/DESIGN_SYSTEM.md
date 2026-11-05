# Tactical Slate design system

Fantasy Football Analyzer is a dense, dark workspace for game day and draft decisions. Keep the data in view, use colour only when it conveys a position or a real status, and write like a commissioner who has seen a Monday night stat correction.

## Tokens

Shared tokens live in `src/index.css`. Existing component styles use the older variable names below; their values now implement Tactical Slate. New components should use the shared tokens rather than hardcoded copies.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#0B0F17` | App canvas |
| `--ink-2` | `#161F30` | Cards, tables, panels, modals |
| `--ink-3` | `#1E293B` | Inputs, secondary controls, hover, table headers |
| `--rule` | `#232F46` | One-pixel dividers and borders |
| `--bone` | `#F8FAFC` | Primary text |
| `--bone-dim` | `#94A3B8` | Secondary text and headings |
| `--lime` | `#10B981` | Primary action and live/positive signals |
| `--gold` | `#F59E0B` | Value and high-priority targets |
| `--blood` | `#EF4444` | Negative and out states |

Never use pure black, pastel shadows, glass blur, glowing shapes, or purple/blue/pink/cyan gradients. Panels use a `1px solid var(--rule)` border and a 4–6px radius. Keep padding around 10–16px. Focus rings stay visible.

### Positions and statuses

`PosBadge` uses a 15% fill and 30% border tint with solid text. Position colours are `--pos-qb` `#F43F5E`, `--pos-rb` `#10B981`, `--pos-wr` `#38BDF8`, `--pos-te` `#F59E0B`, and `--pos-flex` `#A855F7`. Use `#22C55E` for healthy/boom, `#EAB308` for questionable/coin flip, `#EF4444` for out/trap, and `#38BDF8` for waiver or trade notes. Do not tint every number in a table.

## Type and data layout

Inter is the UI and player-name face; JetBrains Mono is for numbers, prices, percentages and data labels. All numbers use tabular figures. Keep player names and primary values bold at 15–16px, metadata at 12–13px, and deep stats at 12px mono. Avoid ornamental italic prose and giant display headings.

Tables scroll horizontally when needed. Freeze the player/name column, keep column headers legible, and use a 15% green/red cell tint only for measured top/bottom 15% outliers. Never imply a missing stat is zero. Where a five-week trend is available, use a small inline SVG sparkline with an accurate label rather than a large chart. The Team Detail sparkline shows fantasy points because historical snap/target data is not available in the current provider model.

Position and availability filters should be buttons with `aria-pressed`, at least 36px tall, and update immediately. Keep transitions at 100ms or less; honour reduced-motion preferences. On narrow screens, let dense controls scroll or stack without shrinking tap targets.

## Voice

Labels should be short and specific: “Smash Spot”, “Floor Play”, “TD Dependent”, “Trap Game” where the underlying data supports that judgment. Empty states can be dry, but must still explain what is missing or how to proceed. Loading states use the rotating ticker in `TacticalLoading`. Avoid generic SaaS copy or decorative icons beside routine headings.

## Implementation map

- Global tokens, buttons, controls, tables and focus: `src/index.css`
- Self-hosted Inter and JetBrains Mono: `src/fonts.css`, `public/fonts/`
- Position pills: `src/components/PosBadge.tsx` and its CSS module
- NFL identity without logo art: `src/components/NflTeamChip.tsx` and its CSS module
- Loading ticker: `src/components/TacticalLoading.tsx`
- Page and component details: their colocated `*.module.css` files

## Page layouts

- **Game Day:** 12-column command board, matchups on the left 7 columns and shared players, alerts, warnings, and events on the right 5. Keep player name, position, and NFL team together.
- **Recap:** feed cards with a single outer border, internal hairlines, and a 2×2 result summary. No card inside a card.
- **Settings:** a narrow utility column with grouped configuration panels. Use internal dividers rather than nested boxes; show enabled switches in green.

Use compact two-tier navigation, Inter for names and prose, and JetBrains Mono for numbers and dates. Keep emoji and clip-art NFL logos out of these views.

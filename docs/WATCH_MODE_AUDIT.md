# Watch Mode playback audit

## 8 November 2026 hosted check

Tested the connected `fantasy-game-day.space.fast` build in Chrome with AGS
Dynasty Watch Mode open. The same-origin `/api/nfl-highlights` feed was configured
and returned NFL on FOX, NFL on CBS and NFL uploads, with thumbnail, duration and
embed metadata. The viewer-country response was `GB` for this browser session.

The available Jaguars–Ravens game recap (`TRUoUtxPZIU`) was a valid title/date
match and reported `embeddable: true`. An actual in-page play attempt returned
YouTube's embed restriction: the NFL rights holder blocked it on this site. The
player displayed **Embed Restricted**, offered **Watch on YouTube**, and excluded
that video from later choices in the same browser session. This confirms that
the metadata flag alone cannot certify playback.

At a 390 × 844 viewport, the blocked-player fallback title overlapped the
scoreline and controls in the previous build. The Watch Mode video stage now
keeps those blocks at their content height and uses a smaller, wrapping title
on narrow screens. The new **Director Diagnostics** view exposes the catalog,
queue, selected title matches, skip reasons, and the last player result.

No new live scoring play arrived during the audit. Automatic cuts, late-upload
notices and cooldown timing remain covered by the automated Watch Mode tests;
they still need observation during a live game window.

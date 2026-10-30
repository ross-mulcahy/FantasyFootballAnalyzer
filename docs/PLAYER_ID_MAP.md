# Player identity map

`src/data/playerIdentityMap.json` contains a compact factual subset of the
[official nflverse roster data](https://github.com/nflverse/nflverse-data/releases/tag/rosters):
Sleeper, ESPN, and Yahoo player IDs, full name, and position. It contains no
rankings, fantasy projections, or demographic data. The JSON records its source
URL and retrieval date. It is loaded separately when Shared Players mounts,
keeping the lookup out of the main app bundle.

Regenerate explicitly for an NFL season:

```sh
python3 scripts/updatePlayerIdentityMap.py --season 2026
```

The generator validates expected columns and a minimum row count before
replacing the map. This file is independent of the bot-owned draft pool and
weekly-shape files. An unmapped player can still join an unambiguous observed
name, position and NFL-team match; conflicting IDs prevent that fallback.
Defenses use canonical NFL team identity rather than player IDs.

## Attribution

Roster processing source: [nflverse/nflverse-rosters](https://github.com/nflverse/nflverse-rosters).
Its DESCRIPTION specifies MIT + file LICENSE; its LICENSE identifies
Copyright (c) 2021 nflfastR.roster authors.

MIT License

Copyright (c) 2021 nflfastR.roster authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to
do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

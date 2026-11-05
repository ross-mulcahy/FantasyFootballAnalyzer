# Fantasy Football Analyzer

Fantasy football analysis and draft tools for Sleeper, ESPN and Yahoo. This fork adds **Game Day**, a single view of your teams' matchups across leagues. Run it locally or use the private [Spacefast install](docs/SPACEFAST.md).

## Get started

Use Node.js 20 or later (Node.js 24 is the verified local runtime):

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/`, connect a Sleeper league in **Settings**, and select **My team**. Use the same browser profile and address on later visits: `localhost` and `127.0.0.1` have separate storage.

ESPN and Yahoo connection controls are paused while their setup is completed. Previously saved leagues remain on this device. Private ESPN leagues need a valid ESPN login; Yahoo requires your own developer app, described in the [Yahoo setup guide](docs/YAHOO_SETUP.md).

## What you get

- **Game Day:** combined matchups, projections, close-game focus, shared players, lineup warnings, live events and browser alerts.
- **Matchups and rosters:** player scores and stats, event timelines, full team rosters and manual refresh.
- **Recap:** saved weekly results and player highlights. History begins when you use Game Day; earlier weeks are not backfilled.
- **League analysis:** draft grades, trade and waiver reviews, luck analysis, team pages and league history.
- **Draft tools:** a draft room, rankings, values and trends. These pages work without connecting a league.

Matchup data refreshes every 60 seconds during live NFL games and every three hours otherwise. Live events are checked more often. Scores follow each league's scoring rules; projections are estimates. See the [Game Day guide](docs/GAME_DAY_GUIDE.md) for the full workflow.

## Your data

League selections, team choices, cached snapshots and recap history stay in your browser. Clearing site data removes them. Settings can export and restore a local backup; it excludes logins, cookies, app credentials and API snapshots. Reconnect private leagues after restoring on another browser.

ESPN cookies and Yahoo tokens are used for provider requests and are not included in saved snapshots or links. The [data reference](docs/GAME_DAY_DATA.md) explains caching, polling and alerts.

## Development

```sh
npm run test:run        # tests
npm run lint            # lint
npm run typecheck       # TypeScript check
npm run build           # production build
npm run build:spacefast # Spacefast build with ESPN proxy
```

The frontend is a Vite/React app. Provider functions live in `api/`; local development uses Vite handlers. See [CLAUDE.md](CLAUDE.md) for architecture and deployment details.

## License

Ross Mulcahy's original contributions are MIT licensed. The [LICENSE](LICENSE) applies only to those contributions, not inherited upstream code or third-party materials. No explicit upstream license was found when this notice was added, so this fork does not grant a license to the combined project as a whole.

## More documentation

- [Spacefast install](docs/SPACEFAST.md)
- [Game Day guide](docs/GAME_DAY_GUIDE.md)
- [Yahoo setup](docs/YAHOO_SETUP.md)
- [Game Day data reference](docs/GAME_DAY_DATA.md)
- [Player identity map](docs/PLAYER_ID_MAP.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [API reference](docs/API_REFERENCE.md)

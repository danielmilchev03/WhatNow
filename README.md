# WhatNow? 🎬🍝🌳

Decide **what to do together** by swiping cards, Tinder-style. Everyone in a room swipes the same
cards, and when **everyone** likes the same card, it's a match.

Decks: 🎬 what to watch, 🌆 what to do. Coming later: 📍 where to go (real places nearby) and 🍕 what
to eat.

It runs with **no accounts and no API keys**. External data sources are optional and switch on only
when their key is set in `.env`.

## Run it

Requires Node.js 24 or newer (`.nvmrc` pins the current LTS).

```bash
npm install
npm run dev
```

Open http://localhost:5173 in two browser tabs, create a room in one, join with the code in the
other, start and swipe. Phones on the same Wi-Fi can use the "Network" URL that Vite prints.

| Command          | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `npm run dev`    | Client (Vite, port 5173) and server (port 3001) with hot reload |
| `npm test`       | All unit and integration tests (Vitest)                         |
| `npm run lint`   | ESLint, Prettier check and TypeScript typecheck                 |
| `npm run build`  | Production build of client and server                           |
| `npm start`      | Runs the built server, which also serves the built client       |
| `npm run format` | Formats everything with Prettier                                |

Optional settings: copy `.env.example` to `.env`. Every value is documented there.

## Architecture

npm workspaces monorepo, TypeScript everywhere:

- **`shared/`**: types used by both sides: `Card`, `Room`, `PublicRoom`, error codes and the typed
  Socket.IO event maps, so client and server can't drift apart.
- **`server/`**: Node.js + Express + Socket.IO.
  - `rooms.ts`: all room logic as pure functions (create, join, start, vote, match detection,
    `toPublicRoom`, which hides other players' votes). No sockets, fully unit-tested.
  - `socket.ts`: thin glue that validates payloads with zod, calls `rooms.ts` and broadcasts.
  - `providers/`: a `CardProvider` registry. Each deck has providers in priority order; the first
    available one wins, so API-backed providers can sit in front of the local JSON fallback.
  - Room state lives in memory (no database), so the server runs as a single instance.
- **`client/`**: React + Vite + Tailwind CSS. The screen is picked from the room state the server
  pushes. All UI text is in `client/src/locales/en.json` via `react-i18next`.
- **`data/decks/`**: local card data (`movies.json`, `activities.json`).

In dev, Vite proxies `/api` and `/socket.io` to the server; in production the server serves the
built client. Either way the browser talks to one origin, so there is no CORS setup.

## Data sources and attribution

| Source                                                                | Used for                            | Status  | Attribution                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Local JSON (`data/decks/`)                                            | Movies and activities               | Active  | Hand-written for this project                                                                              |
| [TMDB](https://www.themoviedb.org/)                                   | Movies, TV, posters, where to watch | Planned | "This product uses the TMDB API but is not endorsed or certified by TMDB.", with the TMDB logo, in the app |
| [JustWatch](https://www.justwatch.com/) (via TMDB)                    | Streaming availability              | Planned | Credited next to watch-provider data, as TMDB requires                                                     |
| [OpenStreetMap](https://www.openstreetmap.org/) (Overpass, Nominatim) | Nearby places                       | Planned | "© OpenStreetMap contributors" (ODbL), shown on the places deck                                            |

Movie titles and descriptions in the local deck are short summaries written for this project.

## Contributing

See [`CLAUDE.md`](CLAUDE.md) for the project conventions. Work is tracked as GitHub issues, one task
per PR.

## License

[MIT](LICENSE)

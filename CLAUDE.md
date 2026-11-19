# WhatNow? — project conventions

A web app where 2+ people swipe cards together; a card everyone likes is a match. See `README.md`
for the architecture and `PROJECT.md` for the full product spec and backlog.

## Commands

- `npm run dev`: client (http://localhost:5173) and server (port 3001)
- `npm test`, `npm run lint` (ESLint + Prettier + typecheck), `npm run build`
- `npm run format` before committing; CI runs lint, test and build on every push and PR

All three of lint, test and build must pass before a PR is ready.

## Rules

- TypeScript `strict`, no `any` (ESLint enforces it). Use `unknown` and narrow it.
- Business logic lives in pure functions with tests; UI components and socket handlers only call
  into it. Room logic belongs in `server/src/rooms.ts` and must stay free of Socket.IO.
- Types shared by client and server go in `shared/src/`. Socket events are typed through
  `ClientToServerEvents` / `ServerToClientEvents`; add new events there first.
- Validate every socket payload with zod in `server/src/schemas.ts` before using it.
- Errors sent to the client are `ErrorCode`s from `shared/src/types.ts`, never free text; the client
  translates them (`errors.<CODE>` in `en.json`).
- All UI text goes through i18n (`t('...')`), with keys in `client/src/locales/en.json`. English is
  the source language. No hard-coded strings in components; a test checks that keys exist.
- Players are identified by `Player.id` (a server-generated UUID), never by socket id, so reconnect
  can work.
- Never send the full `Room` to a client: use `toPublicRoom`, which hides other players' votes.
- External APIs are called only on the server, behind a `CardProvider`, and always cached. The app
  must keep working with no API keys: fall back to the local JSON provider. Send a proper
  `User-Agent` (`APP_USER_AGENT`) to OpenStreetMap services.
- Show the required attribution for every data source in the app (TMDB notice and logo, JustWatch
  for watch providers, "© OpenStreetMap contributors"). Never commit API keys; they live in `.env`.
- Mobile-first: the main use case is a phone in hand on the couch. Check layouts at phone width.
- The server keeps rooms in memory, so it runs as a single instance. Don't add a database without
  an issue that asks for one.

## Workflow

- Small, focused PRs: one issue per PR, referencing it (`Closes #N`).
- Add or update tests whenever logic changes.
- Keep `README.md` and `.env.example` in sync when adding commands or environment variables.

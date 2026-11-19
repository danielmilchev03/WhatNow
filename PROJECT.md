# SwipeTogether 🎬🍝🌳

> Working title. Alternatives: **MatchNight**, **Pickr**, **WhatNow?**

A web app where two or more people decide **what to do together** by swiping cards Tinder-style. When **everyone** in a room likes the same card, it's a **match** 🎉.

Cards are grouped into **decks**:

- 🎬 **What to watch**: movies and TV shows
- 🌆 **What to do**: go to the cinema, dinner out, a walk, bowling, board games, a bike ride…
- 📍 **Where to go**: real places nearby (restaurants, cinemas, bars, parks) based on location
- 🍕 **What to eat** (later): pizza, sushi, burgers, cook at home…

The architecture is **generic from day one**. A deck is just a list of cards that comes from a **card provider**. Adding a new deck means adding data or a provider, and the room and voting logic stays the same.

The UI language is **English**. Everything goes through an i18n layer from the start, so Bulgarian (or any other language) can be added later just by adding a translation file.

---

## User flow

1. I open the site, pick a deck and tap **"Create room"**. I get a 4-letter code (e.g. `KTVZ`) and a share link.
2. Friends enter the code or open the link, then type their name.
3. The host taps **"Start"**. Everyone gets the cards in the **same order**.
4. Everyone swipes independently: ➡️ like, ⬅️ nope.
5. As soon as **every** player in the room likes a card, everyone sees "It's a match!".
6. The results screen shows the matches, plus "almost matches" (cards liked by the majority).

---

## Tech stack

The goal is that it **runs with zero external accounts or API keys**. External APIs are optional and only get switched on when a key is present in `.env`.

| Part | Choice |
|---|---|
| Language | TypeScript everywhere (`strict`) |
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| i18n | `react-i18next`, English as the default and fallback language |
| Backend | Node.js + Express + Socket.IO |
| Room state | In memory (`Map`), no database |
| Card data | Card providers (see below); default is local JSON in `data/decks/` |
| Tests | Vitest |
| Layout | npm workspaces monorepo: `client/`, `server/`, `shared/` |

`shared/` holds the shared types (`Card`, `Deck`, `Room`, `Player`, socket events), so the client and server can't drift apart.

---

## Data sources

All external calls happen **on the server**. API keys never reach the browser, and responses are cached in memory, because every player in a room needs the same cards anyway.

### Movies & TV

| Source | What it gives us | Cost / limits | Notes |
|---|---|---|---|
| **Local JSON** (default) | ~30 hand-picked movies, emoji instead of posters | Free | Works offline; used in tests and as the fallback |
| **[TMDB](https://developer.themoviedb.org/)** (recommended) | Search, discover by genre/year/rating, trending, posters, trailers, **watch providers per country** | Free API key for non-commercial use | Must credit TMDB as the source on an About/Credits page and use an approved TMDB logo. Watch-provider data comes from JustWatch, so we can show e.g. "On Netflix in BG". |
| [OMDb](https://www.omdbapi.com/) | IMDb/Rotten Tomatoes ratings by title or IMDb id | Free key with a daily limit | Optional extra on top of TMDB, not a replacement |
| [Watchmode](https://api.watchmode.com/) | More detailed streaming availability | Free plan: 2,500 requests/month, 3 countries, non-commercial, with attribution | Only if TMDB watch providers aren't enough |

**Plan:** local JSON → TMDB `discover/movie` + `watch/providers` for region `BG` (configurable via `REGION`).

### Places (restaurants, cinemas, bars, parks…)

| Source | What it gives us | Cost / limits | Notes |
|---|---|---|---|
| **[OpenStreetMap via Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)** (recommended default) | Any POI by tag around a point: `amenity=restaurant`, `amenity=cinema`, `amenity=bar`, `leisure=park`, plus `cuisine`, `opening_hours`, website | **Free, no key** | ODbL licence: show "© OpenStreetMap contributors". Follow the public instance's usage policy: don't use it as a hot backend; cache results and send a proper `User-Agent`. No photos or ratings. |
| [Nominatim](https://nominatim.org/) | Geocoding ("Sofia" → coordinates) when the user doesn't share their location | Free, no key | Strict usage policy (low request rate, `User-Agent` required). Cache everything. |
| [Foursquare Places API](https://docs.foursquare.com/developer/reference/place-search) | Richer POIs: categories, ratings, photos, tips | Free sandbox allowance, then pay-as-you-go | Check the current free limits before relying on it; photos/tips are "Premium" endpoints |
| [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service) | Best data quality: ratings, photos, opening hours | Per-SKU free monthly caps (Essentials 10k, Pro 5k, Enterprise 1k), then paid; needs a billing account | Ratings/photos/hours push calls into the pricier tiers, and storing the data is restricted. Optional, for later only. |

**Plan:** Overpass for the default (free, works anywhere, enough for "name + type + cuisine + distance"). Foursquare or Google can be added later as alternative providers behind the same interface.

**Cinema showtimes:** there is no good free public API (especially for Bulgaria). Out of scope: a cinema card just links to the cinema's website from OSM, so people can check the program there.

### Activities (generic ideas)

"Go for a walk", "board games", "bowling"… these are **static JSON** written by us. A card can carry a `placeQuery` (e.g. `amenity=bowling_alley`), so later we can turn "bowling" into a specific place nearby.

---

## Data model (`shared/types.ts`)

```ts
type DeckId = 'movies' | 'activities' | 'places' | 'food';

interface Card {
  id: string;
  title: string;
  subtitle?: string;      // e.g. "2010 · Sci-Fi" or "Italian · 650 m"
  description?: string;
  emoji?: string;         // shown when there is no image
  imageUrl?: string;
  tags: string[];         // genres / categories, used for filters
  link?: string;          // TMDB page, place website, OSM link…
  meta?: Record<string, string | number>; // rating, distance, price level, runtime…
  source: 'local' | 'tmdb' | 'osm' | 'foursquare' | 'google';
}

interface DeckOptions {
  tags?: string[];                 // filter by genre/category
  location?: { lat: number; lon: number; radiusMeters: number };
  region?: string;                 // e.g. "BG" for watch providers
  limit?: number;
}

interface CardProvider {
  deckId: DeckId;
  isAvailable(): boolean;          // e.g. false when the API key is missing
  getCards(options: DeckOptions): Promise<Card[]>;
}

interface Player { id: string; name: string; isHost: boolean; }

interface Room {
  code: string;
  deckId: DeckId;
  options: DeckOptions;
  players: Player[];
  status: 'lobby' | 'swiping' | 'done';
  cards: Card[];                   // fetched once at start, identical order for everyone
  votes: Record<string, Record<string, boolean>>; // cardId -> playerId -> like?
  matches: string[];
}
```

## Socket events

| Direction | Event | Payload |
|---|---|---|
| client → server | `room:create` | `{ deckId, name, options? }` |
| client → server | `room:join` | `{ code, name }` |
| client → server | `room:start` | – (host only) |
| client → server | `card:vote` | `{ cardId, like }` |
| server → client | `room:state` | the `Room` (other players' votes hidden until the end) |
| server → client | `match` | `{ cardId }` |
| server → client | `error` | `{ code, message }` (error codes, so the client can translate them) |

---

## Phase 0: tasks for Claude Code (repo + skeleton)

Build a **minimal, working skeleton** and publish it to GitHub. **Don't** implement everything: the rest will be fed to Worca as separate tasks.

### 0.1 Create the repository

1. `git init`, default branch `main`.
2. Add `.gitignore` (Node, Vite, `.env`), `.editorconfig`, MIT `LICENSE`, `.nvmrc` (current Node LTS).
3. Add `.env.example` with every optional variable, all empty, plus a comment explaining each one:
   ```
   PORT=3001
   REGION=BG
   TMDB_API_KEY=
   OVERPASS_URL=https://overpass-api.de/api/interpreter
   APP_USER_AGENT=SwipeTogether/0.1 (contact: you@example.com)
   ```
4. Create the GitHub repo with the GitHub CLI and push:
   ```bash
   gh repo create swipe-together --public --source=. --remote=origin --push \
     --description "Swipe together to decide what to watch, do or eat"
   ```
   (Ask me first if `gh` is not logged in, or if I want the repo to be private.)
5. Add a GitHub Actions workflow `.github/workflows/ci.yml`: install, `npm run lint`, `npm test`, `npm run build` on every push and PR.
6. Create GitHub labels `phase-1`, `core`, `content`, `data-source`, `polish`, `later`, and open **one GitHub issue per task** from the "Phase 1+" backlog below, with its acceptance criteria in the body. (This gives Worca a ready-made queue.)

### 0.2 Build the skeleton

1. Monorepo (`client/`, `server/`, `shared/`) with npm workspaces and scripts:
   - `npm run dev`: runs client and server together
   - `npm test`, `npm run lint`, `npm run build`
2. The types from `shared/types.ts` above.
3. i18n set up with `react-i18next`: `client/src/locales/en.json` holds **all** UI strings, and English is the fallback. No hard-coded strings in components.
4. A `CardProvider` registry on the server, with **only the local JSON provider** implemented for now:
   - `data/decks/movies.json`: ~30 well-known movies (title, year, genres, short description, emoji)
   - `data/decks/activities.json`: ~20 activities (title, description, emoji, tags such as `indoor`/`outdoor`/`cheap`)
5. Room logic as a **pure module** (`server/src/rooms.ts`) with no Socket.IO dependency: create, join, start, vote, match detection (liked by all current players). Fully covered by unit tests.
6. Client with 4 screens, ugly but working:
   - Home: pick a deck, "Create room" / "Join with code"
   - Lobby: room code, player list, "Start" button for the host
   - Swipe: one card with 👍 / 👎 buttons (**no** gestures yet)
   - Results: list of matches
7. `README.md`: what it is, how to run it, the architecture in a few lines, and the data sources and their attribution.
8. `CLAUDE.md`: the project conventions below, so Worca's agents follow them too.
9. Commit with clear messages and push to `main`.

**Done when:** the repo is on GitHub with green CI and the issues created. Locally, I open two browser tabs, create a room in one, join from the other, we both like the same movie and both see the match. `npm test` passes.

### Conventions (for `CLAUDE.md`)

- TypeScript `strict`, no `any`.
- Business logic lives in pure functions with tests; UI and socket handlers only call into it.
- All UI text goes through i18n (`t('...')`); English is the source language.
- External APIs only on the server, behind a `CardProvider`; always cached; the app must keep working with no API keys (fall back to local JSON).
- Show the required attribution for every data source we use.
- Mobile-first: the main use case is a phone in hand on the couch.
- Small, focused PRs, one task per PR, each with tests where logic changes.

---

## Phase 1+: backlog for Worca

Each task is self-contained and has a definition of done. Ordered roughly by priority.

### Core

1. **Swipe gestures** (`core`): drag the card with finger/mouse; it tilts and flies off left/right. The buttons stay.
   *Done:* works on phone and desktop; releasing below the threshold snaps the card back.
2. **"It's a match!" animation** (`core`): full-screen overlay with confetti and the card title; dismissed after 3 s or on tap.
3. **Invite link + QR code** (`core`): "Copy link" button and a QR code in the lobby; `/r/KTVZ` opens the join screen for that room.
4. **Others' progress** (`core`): the swipe screen shows how far everyone is (e.g. "Ivan 12/30").
5. **Almost matches** (`core`): the results include cards liked by ≥ 50% of players, sorted by likes.
   *Done:* logic lives in `rooms.ts` and is tested.
6. **Tag filters before start** (`core`): the host picks genres/categories in the lobby; only cards with at least one of them are dealt.

### Data sources

7. **TMDB movie provider** (`data-source`): when `TMDB_API_KEY` is set, the movies deck uses `discover/movie` (popular, with genre filters mapped to TMDB genre ids) and shows posters. Without a key it falls back to local JSON.
   *Done:* provider is tested with mocked HTTP; responses are cached; the About page shows the TMDB attribution and logo.
8. **"Where to watch"** (`data-source`): every movie card shows streaming providers for `REGION` using TMDB watch providers ("Netflix", "HBO Max"…), with JustWatch attribution as TMDB requires.
9. **TV shows deck** (`data-source`): the same as movies, but using `discover/tv`.
10. **Nearby places provider (OpenStreetMap / Overpass)** (`data-source`): a new `places` deck. The host shares their location (browser geolocation) or types a city (Nominatim geocoding), then picks categories (restaurants, cafés, bars, cinemas, parks) and a radius. Cards show name, type, cuisine, distance and a link to the website/OSM.
    *Done:* Overpass query builder is unit-tested; results are cached per area for at least 1 hour; a proper `User-Agent` is sent; "© OpenStreetMap contributors" is visible on the deck.
11. **Activity → place** (`data-source`): after a match on an activity with a `placeQuery` (e.g. bowling), offer "Find one nearby" which starts a follow-up `places` round with that category.
12. **Provider health in the UI** (`polish`): the home screen hides or greys out decks whose provider is unavailable (e.g. no key), with a short explanation.

### Content

13. **"What to eat" deck** (`content`): `data/decks/food.json` with ~20 cards. No code changes outside data (proves the architecture is generic).
14. **Richer activities** (`content`): add `duration`, `price` (`$`, `$$`, `$$$`) and `indoor/outdoor` fields to activities and show them on the card.
15. **"Combo night" mode** (`core`): a room plays several decks in sequence (e.g. activity → food → movie); the result is "the plan for tonight".

### Polish & robustness

16. **Reconnect** (`polish`): after a page reload the player rejoins the same room with the same name (player id in `localStorage`).
17. **Player leaves** (`core`): when someone leaves, matches are recomputed for the remaining players; host role passes to the next player.
18. **Room cleanup** (`core`): rooms idle for 2 hours are removed from memory.
19. **Dark mode** (`polish`): toggle plus a remembered choice.
20. **"One more round"** (`core`): a results-screen button that starts a new round with only the matches/almost matches, until a single winner is left.
21. **Share the result** (`polish`): a button that copies text like "Tonight: 🎬 Inception + 🍕 pizza 🎉".
22. **Bulgarian translation** (`later`): `bg.json` + language switcher; card data stays in its source language (TMDB can return localized titles via `language=bg-BG` where available).

### Later

23. Deployment (Render / Fly.io) with env vars for API keys.
24. Custom deck: the host types their own cards in the lobby.
25. PWA: installable on the phone, icon, splash screen.
26. Alternative places provider: Foursquare or Google Places behind the same `CardProvider` interface, chosen by env var.

---

## Out of scope (for now)

- Accounts/login and a database
- AI recommendations
- Cinema showtimes and reservations
- Commercial use (TMDB's free key is for non-commercial use only)

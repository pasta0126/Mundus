# Mundus

Deterministic generator of worlds, universes, maps, and regions for
tabletop, RPG, and video game use: the same seed always produces the same
content.

Live at [mundus.northernarchive.com](https://mundus.northernarchive.com).

## Pages

- `/` - the home hub: choose to generate a map, a planet or a system. It
  makes no request until you pick one.
- `/maps?seed=abc&x=0&y=0&zoom=3` - the 2D map: pan, zoom, layers, points of
  interest, regions. The URL carries the seed, the centre and the zoom step,
  so a link is the whole view; with no seed a random one is picked.
- `/planets?seed=Kepler` - one planet as a rotatable 3D model with its
  sheet. The seed is the planet's name; the same name always gives the
  same planet.
- `/systems?seed=Kepler` - a whole planetary system (single or binary
  center, up to eight planets, at most one asteroid belt), animated from
  deterministic starting positions. Click a planet for its sheet and model.
  `Customize` builds a custom system: the URL carries the central seed, the
  planet names (`planet=`) and the belt position (`belt=`), so a link is the
  whole system and nothing is stored.
- Both new pages have `Copy seed` and `Copy specs` (the description as JSON).
  The API behind them is `GET /api/Planets?seed=` and
  `GET /api/Systems?seed=[&planets=...&belt=]`.

## Layout

- `backend/` - .NET solution (`net10.0`, ASP.NET Core Controllers)
  - `src/Mundus.Api` - HTTP API, controllers, OpenAPI document
  - `src/Mundus.Core` - deterministic generation engine (seeded RNG,
    per-cell infinite terrain noise, `MapGenerator`); no ASP.NET/EF Core
    dependencies
  - `src/Mundus.Infrastructure` - EF Core `DbContext` (Npgsql/PostgreSQL)
  - `tests/Mundus.Core.Tests` - xUnit tests for the generation engine
- `frontend/` - React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Framer
  Motion. API client (`src/api/client.ts`, `src/api/schema.d.ts`) is
  generated from the backend's OpenAPI document, not hand-written.
- `openspec/` - spec-driven development artifacts (capability specs,
  change proposals). See `openspec/config.yaml`.
- `docker-compose.yml` - deployable shape: `mundus-web` (built static
  frontend behind nginx, the only container Traefik routes) and
  `mundus-api`, reached only via `mundus-web`'s internal `/api/` proxy.

## Running locally

Backend (from `backend/`):

```bash
dotnet build
dotnet test
dotnet run --project src/Mundus.Api --urls http://localhost:5253
```

Frontend (from `frontend/`), in another terminal:

```bash
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:5253` (see `vite.config.ts`), so
the app at `http://localhost:5173` can call `/api/...` exactly as it does
in production.

To regenerate the frontend's API client after changing the backend's
public contract (with the backend running locally):

```bash
npm run generate:api-types
```

## Data

The backend connects to a `mundus` database on a Postgres instance that is
infrastructure, not something this project provisions - see
`openspec/changes/establish-project-architecture/design.md` for how the
tenant was set up. Connection string is supplied via `DATABASE_URL` in a
git-ignored `.env` (see `.env.example`).

## Deployment

`docker compose build && docker compose up -d` from the repo root, given a
populated `.env`. See `docker-compose.yml` and
`openspec/changes/establish-project-architecture/design.md` for the
Traefik/reverse-proxy conventions this follows.

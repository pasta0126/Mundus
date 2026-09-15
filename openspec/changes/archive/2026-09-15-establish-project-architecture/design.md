## Context

See proposal.md - Why. This is a greenfield decision (the only prior code,
a TS prototype, has been removed) made after discussing trade-offs with the
project owner directly. Key constraints from that discussion:
- Owner prefers .NET over Node for the backend even though it means
  discarding the existing TS prototype.
- A PostgreSQL instance already exists at the infrastructure level on the
  owner's VPS and must be reused, not replaced by a new managed/hosted DB.
- Deployment target is that same VPS, via Docker Compose.
- Frontend must look polished (animations/transitions) and be easy to
  restyle; owner deferred the specific choice to the assistant.
- First visualization target is 2D top-down maps.

## Goals / Non-Goals

**Goals:**
- Lock a single, coherent stack per layer (backend, data access, frontend,
  deployment) so subsequent change proposals build features, not
  infrastructure.
- Keep the backend's OpenAPI spec as the single source of truth the
  frontend client is generated from (spec-driven, matches the OpenSpec
  workflow already adopted for behavior specs).
- Keep local dev and VPS deployment as close to identical as practical
  (same Docker Compose file, environment-driven config).

**Non-Goals:**
- Designing the actual World/Map/Region generation algorithms - that is
  future, capability-specific change proposals under `openspec/specs/`.
- Authentication/authorization design - deferred until a change that
  actually needs user accounts.
- CI/CD pipeline design - only the deployable artifact shape (Docker
  images) is decided here, not the pipeline that builds/ships them.

## Decisions

- **ASP.NET Core Controllers over Minimal APIs.** Owner's explicit
  preference. Trade-off accepted: slightly more boilerplate (controller
  classes, `[ApiController]`/`[Route]` attributes) than Minimal APIs, in
  exchange for a more familiar, more structured shape as the API surface
  grows (versioning, filters, model binding conventions are all
  well-trodden in the Controllers style).
- **Separate `Mundus.Core` class library for generation logic**, referenced
  by the `Mundus.Api` controllers project. Keeps the deterministic engine
  (pure functions: seed in, world/map data out) free of ASP.NET or EF Core
  dependencies, so it can be unit-tested in isolation and reused (e.g. by a
  future CLI or batch job) without spinning up a web host.
- **EF Core (Npgsql provider) against the existing external Postgres
  instance.** Alternative considered: Dapper for more control/less
  overhead. Rejected for now because the DB's role here is mostly
  straightforward CRUD (accounts, saved/shared worlds, metadata) where
  EF Core's productivity (LINQ queries, migrations from the C# model)
  outweighs Dapper's raw-SQL control; nothing so far needs Dapper's
  performance ceiling. Because the Postgres instance is infrastructure the
  project doesn't own, EF Core migrations are applied explicitly (a
  `dotnet ef database update` step / migration bundle), never
  auto-applied on container startup against a shared instance.
- **OpenAPI generation from the backend** (`Microsoft.AspNetCore.OpenApi`,
  the built-in .NET document generator) as the contract, with a generated
  TypeScript client (e.g. `openapi-typescript` / `orval`) consumed by the
  frontend. Chosen over hand-written DTOs on the frontend so the API
  contract and the client can never silently drift - this is the concrete
  mechanism behind the project's "open specs" direction for the HTTP
  boundary (behavior specs already live in `openspec/specs/`).
- **React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion**
  for the frontend. Alternative considered: Blazor, which would keep the
  whole stack in C# with no generated client at all. Rejected because the
  owner asked for something visually polished and easily restyled first,
  and React's ecosystem for 2D map/canvas rendering (PixiJS, plain
  `<canvas>`, deck.gl-style libraries) and animation (Framer Motion) is
  broader and more battle-tested for this specific kind of content than
  Blazor's current rendering ecosystem. shadcn/ui is chosen over a
  closed component library (e.g. MUI, Ant Design) because its components
  are copied into the repo as editable source, matching the "easily
  customizable" requirement.
- **2D top-down rendering first** (plain `<canvas>` or PixiJS, decided at
  implementation time of the first map-rendering change). 3D/isometric is
  explicitly deferred, not ruled out - the World/Map data model should not
  bake in assumptions that would block a future 3D renderer (e.g. keep
  elevation as data even if the first renderer ignores it).
- **Docker Compose on the existing VPS**, with containers for
  `Mundus.Api` and the frontend (built static assets served via a small
  Nginx or Caddy container), but **no Postgres container** - the API
  connects to the VPS's existing instance via a connection string supplied
  through environment variables / a `.env` file that is never committed.

## Infrastructure findings (void-server)

Inspected the target VPS (`ssh void-server`) before finalizing the deploy
shape. Relevant, load-bearing facts:

- **Traefik v3.7** is the single entrypoint for 80/443, on an external
  Docker network named `proxy`. A container is only routed if it (a) joins
  `proxy` and (b) carries explicit `traefik.enable=true` + router/service
  labels (`providers.docker.exposedByDefault: false`). No app container
  publishes host ports directly - all traffic enters through Traefik.
  TLS is HTTP-01 via Let's Encrypt (`certresolver=le`), one cert per
  subdomain.
- **`platform-postgres`** (`~/infra/platform`) is a single shared
  PostgreSQL 17 instance (PostGIS + pg_cron available), internal-only on
  the `proxy` network as hostname `postgres:5432` - not reachable from
  outside that network, and not one we manage. Multi-tenant by convention:
  each project gets its own login role `<name>_app` owning its own
  database `<name>`, provisioned with `~/infra/platform/new-tenant.sh
  <name>`. This project's tenant name is **`mundus`** (role `mundus_app`,
  database `mundus`), matching the existing `nurk`/`kaizen` tenants.
- A shared GoTrue instance provides optional identity
  (`auth.northernarchive.com`, HS256 JWT via `PLATFORM_JWT_SECRET`).
  **Not adopted yet** - this change has no auth requirement (see
  Non-Goals); revisit if/when a change introduces user accounts, since
  reusing this shared pool avoids a second identity system.
- Two deploy shapes coexist on this host: (a) one repo/compose stack with
  both a `web` and an `api` service on a **single domain**, where nginx
  reverse-proxies `/api/` to the `api` container over the `proxy` network
  (used by the root `northernarchive.com` site); and (b) **two separate
  subdomains**, one per service, each routed directly by Traefik (used by
  `nurk` and `kaizen`: e.g. `kaizen.northernarchive.com` /
  `kaizen-api.northernarchive.com`).
- Frontend build convention (`kaizen-web`): multi-stage Dockerfile -
  `node:22-slim` builds the Vite app, `VITE_*` vars passed as Docker
  **build args** (baked into the static JS bundle at build time, since a
  static SPA has no runtime env), final stage is `nginx:alpine` serving
  `dist/`.

**Decision**: since only one domain was given
(`mundus.northernarchive.com`), Mundus follows shape (a): a single
`mundus-web` (nginx) container is the only one Traefik routes, reverse
-proxying `/api/` internally to a `mundus-api` container that joins
`proxy` but carries no Traefik labels of its own. This avoids provisioning
a second subdomain/certificate for something that isn't needed yet; moving
to shape (b) later (a dedicated `mundus-api.northernarchive.com`) is a
small, additive change if a future capability needs it (e.g. a public API
consumed outside the frontend).

## Risks / Trade-offs

- [Risk] Reusing infrastructure-level Postgres means the app's schema
  lives in a database the app doesn't fully own (other things may use that
  instance). → Mitigation: the app gets its own database/schema within
  that instance (not decided here - a task in this change's tasks.md
  covers agreeing the DB/schema name and credentials with the owner before
  running the first migration), and EF Core migrations are run explicitly,
  never automatically on deploy.
- [Risk] Generated TS client (from OpenAPI) adds a build step the frontend
  depends on; if the backend and frontend are developed out of sync, the
  client can go stale. → Mitigation: regenerating the client is a required
  step whenever the backend's public contract changes, tracked in that
  change's own tasks.md, not automated away silently.
- [Risk] Choosing Controllers-style ASP.NET Core is more verbose than
  Minimal APIs for what is currently a small API surface. → Accepted
  trade-off per explicit owner preference; revisit only if it becomes a
  demonstrated pain point.

## Migration Plan

Greenfield - no production system exists yet.
1. Scaffold `backend/` (.NET solution: `Mundus.Api`, `Mundus.Core`,
   `Mundus.Infrastructure`, test projects) and `frontend/` (Vite React
   app) at the repo root.
2. Add `docker-compose.yml` wiring the API and frontend containers, with
   Postgres connection settings pointed at the existing VPS instance via
   environment variables.
3. Verify both containers build and start locally, and that the API can
   reach the existing Postgres instance (a trivial health-check query),
   before any real feature/capability change proposal is started.

Rollback: none needed - nothing is deployed yet. If the stack choice
proves wrong, the fix is a new change proposal, not a rollback.

## Why

Mundus needs a settled technology baseline before any real feature work
starts. So far only a throwaway TypeScript prototype existed
(`packages/core`, now removed); this change replaces "whatever gets typed
first" with a deliberate, agreed stack for backend, frontend, data, and
deployment, so every future change proposal builds on the same foundation
instead of re-litigating it.

## What Changes

- Adopt **.NET (ASP.NET Core, Controllers/MVC-style, targeting `net10.0`)**
  as the backend, replacing the removed TypeScript prototype. The
  deterministic generation engine is re-implemented in C# as a class
  library, not ported line-by-line from the old TS code.
- Adopt **Entity Framework Core (Npgsql provider)** for data access against
  an **existing PostgreSQL instance already running in the user's VPS
  infrastructure** (not a new managed/hosted DB, not a container we own).
- Adopt **React + Vite + TypeScript, Tailwind CSS, shadcn/ui, and Framer
  Motion** for the frontend, consuming a TypeScript client generated from
  the backend's OpenAPI spec.
- First map visualization target is **2D top-down** (canvas/PixiJS-class
  rendering), not 3D/isometric.
- Deploy via **Docker Compose on the existing VPS**: containers for the API
  and the frontend, configured to reach the VPS's existing Postgres
  instance over the network rather than spinning up our own DB container.
- **BREAKING**: removes `packages/core` and the Node/npm-workspaces
  monorepo layout entirely. The abandoned `document-world-generation-spec`
  change (never archived) is superseded by this one.

## Capabilities

### New Capabilities
(none — this change establishes tooling/infrastructure, not user-observable
generation behavior. `skip_specs: true` is set in `.openspec.yaml`.)

### Modified Capabilities
(none)

## Impact

- Affected code: removes `packages/`, root `package.json`,
  `tsconfig.base.json`. Adds a `backend/` .NET solution and a `frontend/`
  Vite app at the repo root.
- Affected infra: introduces `docker-compose.yml` for local dev and VPS
  deployment; depends on network access to the existing external Postgres
  instance (connection string supplied via environment/secrets, not
  hardcoded).
- No production system exists yet, so there is no live migration — this is
  the initial scaffold.

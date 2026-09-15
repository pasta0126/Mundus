## 1. Backend solution scaffold

- [x] 1.1 Create `backend/Mundus.sln` and add `backend/src/Mundus.Api` (ASP.NET Core Web API, Controllers, `net10.0`) and verify `dotnet build` succeeds
- [x] 1.2 Add `backend/src/Mundus.Core` class library (deterministic generation engine, no ASP.NET/EF Core dependencies) and reference it from `Mundus.Api`, verify `dotnet build` succeeds
- [x] 1.3 Add `backend/src/Mundus.Infrastructure` class library (EF Core `DbContext`, Npgsql provider) and reference it from `Mundus.Api`, verify `dotnet build` succeeds
- [x] 1.4 Add `backend/tests/Mundus.Core.Tests` (xUnit) referencing `Mundus.Core` and verify `dotnet test` runs (even with a placeholder passing test)
- [x] 1.5 Enable OpenAPI document generation (`Microsoft.AspNetCore.OpenApi`) on `Mundus.Api` and verify `/openapi/v1.json` (or equivalent) is served when running the API locally

## 2. Data access

- [x] 2.1 On void-server, provision the `mundus` tenant on the shared platform Postgres with `~/infra/platform/new-tenant.sh mundus`, verify it prints a `mundus_app` connection string, and add `mundus` to `~/infra/platform/postgres/init/01-init-roles-databases.sh` for reproducibility (confirm with the project owner before running - mutates shared infra)
- [x] 2.2 Add a minimal EF Core `DbContext` in `Mundus.Infrastructure` with connection string read from configuration/environment (`DATABASE_URL`-style, never hardcoded), verify `dotnet ef migrations add InitialCreate` generates a migration without errors
- [x] 2.3 Verify the API can open a connection and run a trivial query (e.g. `SELECT 1`) against the `mundus` database via a health-check endpoint, from a container on the `proxy` network

## 3. Frontend scaffold

- [x] 3.1 Scaffold `frontend/` with Vite + React + TypeScript template, verify `npm run dev` serves the default app
- [x] 3.2 Add and configure Tailwind CSS, verify a Tailwind utility class renders correctly in the browser
- [x] 3.3 Initialize shadcn/ui and add one sample component, verify it renders with Tailwind styling applied
- [x] 3.4 Add Framer Motion and verify one trivial animated transition works in the browser
- [x] 3.5 Generate a TypeScript API client from the backend's OpenAPI document and verify it compiles against the frontend project

## 4. Deployment scaffold

- [x] 4.1 Write `docker-compose.yml` at the repo root with `mundus-web` (nginx, multi-stage build of the Vite app) and `mundus-api` (`Mundus.Api`) services, both joining the external `proxy` network; only `mundus-web` carries Traefik labels (`Host(\`mundus.northernarchive.com\`)`, `entrypoints=websecure`, `certresolver=le`); no ports published to the host; DB connection via `.env` (gitignored). No `VITE_*` build args needed: the frontend calls same-origin `/api/...`, proxied by nginx, so there's no API URL to bake in at build time
- [x] 4.2 Add `nginx.conf` to `mundus-web` that serves the SPA and reverse-proxies `/api/` to `http://mundus-api:8080/api/` (matching the root `northernarchive.com` site's pattern), and Dockerfiles for both services; verify `docker compose build` succeeds for both
- [x] 4.3 Copy the repo to void-server, verify `docker compose up -d` starts both containers, `docker compose ps` shows them running, and `https://mundus.northernarchive.com` serves the frontend and proxies `/api/health` successfully to `mundus-api`

## 5. Close out

- [x] 5.1 Update root `README.md` with the repo layout (`backend/`, `frontend/`, `openspec/`) and the commands to run everything locally
- [x] 5.2 Run `openspec validate establish-project-architecture --strict` and verify it passes
- [x] 5.3 Archive the change with `openspec archive establish-project-architecture`

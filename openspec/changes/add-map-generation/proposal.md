## Why

`world-generation` produces a single high-level `World` record (size,
biome) but nothing spatial - there is no grid of cells a game or a
frontend renderer can actually draw. Map generation is the next
capability: turning a seed into a concrete, deterministic grid of cells,
each with a biome and an elevation, laid out on either a square or
hexagonal grid at a caller-chosen size. This is the content the frontend
needs to stop being a text card and start rendering an actual 2D top-down
map, per the project's original goal.

## What Changes

- Introduce the `map-generation` capability: deterministic generation of a
  `Map` - a grid of cells, each with a biome and an elevation - from a
  seed plus explicit request parameters (grid type, width, height).
- Support two grid types selectable per request: `Square` and `Hex`
  (rectangular offset layout). Not derived from `World.Size` - the caller
  states dimensions and grid type explicitly.
- Elevation and biome are spatially coherent (neighboring cells tend to
  be similar), not independently randomized per cell.
- Expose it over HTTP, following the `world-generation` capability's
  existing pattern (`GET /api/Worlds/{seed}`).

## Capabilities

### New Capabilities
- `map-generation`: deterministic, grid-type-and-size-parameterized
  generation of a cell grid with per-cell biome and elevation.

### Modified Capabilities
(none - `world-generation`'s `World` record and RNG contract are reused
as-is, not changed)

## Impact

- New code: `backend/src/Mundus.Core/Map.cs` (or similar) for the
  generation engine, a new controller/endpoint in `Mundus.Api`.
- Depends on `world-generation`'s `Rng` (seeded RNG, named child streams)
  - no new RNG primitives, this capability is built on top of the existing
  ones.
- No frontend rendering work in this change - that follows once the data
  shape exists (tracked as a separate future change).

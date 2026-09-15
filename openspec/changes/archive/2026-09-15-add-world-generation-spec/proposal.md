## Why

`Mundus.Core` (the deterministic seed-based RNG and `WorldGenerator`) and
the `GET /api/Worlds/{seed}` endpoint already exist and are exercised by
the frontend, but no capability spec backs them - the only place this
behavior is written down is the C# source and its tests. Before extending
world generation (maps, regions, universes are the next capabilities),
the contract needs to be a spec of record so later changes are proposed
as deltas against it instead of against tribal knowledge of the code.

## What Changes

- Introduce the `world-generation` capability: documents the deterministic
  RNG contract (seeded, reproducible, independent named sub-streams) and
  the minimal `World` record (`specVersion`, `seed`, `size`, `biome`) that
  `Mundus.Core` and the `Worlds` controller already implement.
- No code changes - this is a documentation-only change capturing existing,
  already-tested behavior as the spec of record.

## Capabilities

### New Capabilities
- `world-generation`: deterministic seed-based generation of a `World`
  record (size and biome), the underlying seeded RNG contract it's built
  on, and its exposure over HTTP at `GET /api/Worlds/{seed}`.

### Modified Capabilities
(none)

## Impact

- Affected code: `backend/src/Mundus.Core/Rng.cs`,
  `backend/src/Mundus.Core/World.cs`,
  `backend/src/Mundus.Api/Controllers/WorldsController.cs` - read-only for
  this change, used as the source of truth for the spec text.
- No APIs, dependencies, or running systems are affected.

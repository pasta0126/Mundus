## REMOVED Requirements

### Requirement: Deterministic seeded generation
**Reason**: The `world-generation` capability and its `World` record are
dead: the frontend has never called `GET /api/Worlds/{seed}`, and this
change establishes the real per-cell deterministic terrain model in
`map-generation` (see that capability's "Deterministic per-cell terrain"
and "Location-independent generation" requirements) as the one and only
generation contract going forward.
**Migration**: None - use `map-generation`'s windowed terrain query
instead.

### Requirement: Seeded random primitives
**Reason**: Dead capability being removed - see "Deterministic seeded
generation" above. The underlying seeded RNG implementation this
requirement described continues to back `map-generation`'s determinism,
just without a standalone spec of its own.
**Migration**: None.

### Requirement: Independent named sub-streams
**Reason**: Dead capability being removed - see "Deterministic seeded
generation" above.
**Migration**: None.

### Requirement: World generation
**Reason**: Dead capability being removed - see "Deterministic seeded
generation" above. The `World` record (a seed plus an unrelated size and
biome classification) is superseded by `map-generation`'s per-cell
biome model.
**Migration**: None - use `map-generation`'s windowed terrain query
instead.

### Requirement: World generation over HTTP
**Reason**: Dead capability being removed - see "Deterministic seeded
generation" above. `GET /api/Worlds/{seed}` and `WorldsController` are
deleted.
**Migration**: Use `GET /api/Maps` (see `map-generation`'s "Windowed
terrain query over HTTP" requirement) instead.

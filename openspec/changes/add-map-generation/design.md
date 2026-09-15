## Context

See proposal.md - Why. This builds directly on `world-generation`'s `Rng`
(`backend/src/Mundus.Core/Rng.cs`): named child streams, weighted picks,
the determinism contract. No changes to `Rng` or `World` are needed.

Two things make this harder than `world-generation`: it needs a
deterministic *spatially coherent* value (elevation/biome vary smoothly
across a grid, not independently per cell), and it needs to support two
different coordinate systems behind one API.

## Goals / Non-Goals

**Goals:**
- A deterministic, dependency-free noise function suitable for elevation
  and a second independent "moisture" channel that varies biome at a
  given elevation.
- One `Map` shape that works for both grid types without leaking
  grid-specific logic into the HTTP layer.

**Non-Goals:**
- Rivers, roads, settlements, or any feature beyond biome + elevation.
- Frontend rendering (separate future change, once this data shape
  exists and is stable).
- Arbitrary (non-rectangular) hex map shapes (radius-based hexagons,
  irregular borders) - only a rectangular offset layout, matching the
  "width x height requested explicitly" requirement.

## Decisions

- **Value noise, hand-implemented, seeded from `Rng` - no external noise
  library.** Generate a lattice of random gradient values at integer
  coordinates (spaced every `N` cells, `N` a small constant like 8) using
  a child `Rng` stream, then bilinearly interpolate (with a smoothstep
  easing curve, not linear, to avoid visible grid creases) between the 4
  surrounding lattice points for every cell's continuous elevation value.
  Alternative considered: pull in a Perlin/Simplex NuGet package. Rejected
  to keep the generation engine dependency-free and fully self-owned -
  this is a core product capability (the "how" of world generation *is*
  the product), not incidental plumbing where an off-the-shelf dependency
  is a reasonable shortcut.
- **Two independent noise channels**: `elevation` and `moisture`, each
  from its own named child `Rng` stream (`rng.Child("elevation-lattice")`,
  `rng.Child("moisture-lattice")`), so changing one doesn't perturb the
  other syncronization-wise. Biome is then a deterministic function of
  `(elevation, moisture)` via a fixed lookup table (a simplified
  Whittaker-diagram style mapping), not its own independent random draw -
  this is what makes biome spatially coherent "for free", since it
  inherits the coherence of the two noise fields it's derived from.
- **Biome-from-(elevation, moisture) table** (documented here, not
  normative in the spec - the spec only requires the *coherence property*
  and *closed biome set*, not this exact table, so the table can be tuned
  later without a spec change):
  - `elevation < 0.3` -> `Ocean`
  - `elevation >= 0.85` -> `Mountains`
  - otherwise, by `moisture` band: low -> `Desert`, low-mid -> `Grassland`,
    mid-high -> `Forest`, high -> `Swamp`; `Tundra` reserved for a future
    latitude/temperature axis (not reachable in this change - acceptable
    since the spec only requires biomes come from the fixed set, not that
    every value is reachable by every algorithm version).
- **Grid abstraction**: a `GridType` enum (`Square`, `Hex`). `Map` holds
  `GridType`, `Width`, `Height`, and a flat `IReadOnlyList<Cell>` in
  row-major order (`y * Width + x`), where `Cell` has `X`, `Y` (the
  offset/array coordinates for both grid types - simplest thing that
  works for a rectangular layout of either kind), `Biome`, `Elevation`.
  Hex neighbor lookup (for the coherence property and for a future
  renderer) uses the standard "even-r"/"odd-r" offset-coordinate neighbor
  tables, kept as a small internal helper - not part of the wire format,
  since the frontend only needs the flat cell list plus `GridType` to know
  how to lay cells out visually.
  Alternative considered: axial/cube coordinates for hex (the more common
  choice for pure hex-grid work). Rejected here because the requirement
  is a *rectangular width x height request* matching the square case
  one-for-one in the API shape; offset coordinates map onto that directly,
  axial coordinates would need a conversion layer at the API boundary for
  no benefit given no diagonal/ring queries are in scope yet.
- **Dimension limit**: reject width/height above 512 (so up to ~262k
  cells) with a `400 Bad Request`. Chosen as a round number comfortably
  above any near-term frontend rendering need, while bounding worst-case
  generation cost and response payload size. Revisit if a real use case
  needs larger.

## Risks / Trade-offs

- [Risk] Hand-rolled noise is unlikely to be as visually pleasing as a
  battle-tested Perlin/Simplex implementation. → Mitigation: the spec only
  requires the coherence *property*, not a specific visual quality bar;
  the lattice+smoothstep approach is simple enough to replace later
  (bump `specVersion` on `Map` if the replacement changes existing seeds'
  output) without touching the API shape.
- [Risk] Offset hex coordinates make some algorithms (ring/spiral
  traversal, hex distance) more awkward than axial/cube. → Accepted:
  none of those are needed yet; revisit if a future change needs them.
- [Risk] A 512x512 map is ~262k cells serialized as JSON, which is a
  non-trivial payload. → Accepted for now (no pagination/tiling in this
  change); revisit if real usage shows this is a problem.

## Migration Plan

Greenfield - purely additive, no existing data or API surface changes.
1. Add `GridType`, `Cell`, `Map` types and the noise-based generator to
   `Mundus.Core`.
2. Add a `MapsController` (or extend an existing one) exposing it over
   HTTP per the spec.
3. Unit-test the coherence property statistically (average neighbor delta
   < average random-pair delta) rather than pinning exact per-cell
   values, since the *property* is what the spec requires.

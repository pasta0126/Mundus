## Context

See proposal.md - Why. This builds directly on `world-generation`'s `Rng`
(`backend/src/Mundus.Core/Rng.cs`): named child streams, weighted picks,
the determinism contract. No changes to `Rng` or `World` are needed.

Revised from this change's first draft: biome is now per-*region*
(a small number of contiguous patches), not an independent value per
cell, and a "shape archetype" parameter controls the overall land/ocean
silhouette (continent, island, archipelago). This is closer to what a
real map (Middle-earth, Great Britain) looks like - a handful of
recognizable regions on a recognizable landmass - than a texture of noise.

## Goals / Non-Goals

**Goals:**
- A deterministic elevation noise field, optionally biased by a shape
  archetype's "landmass mask", that produces the land/ocean layout
  guarantees in the spec (one landmass for Continent/Island, several for
  Archipelago, ocean-edged for Island).
- A deterministic region partition (Voronoi from a small number of seed
  points) so biome is uniform per region and the region count matches the
  size preset's documented range.
- One `Map` shape that works for both grid types.

**Non-Goals:**
- Rivers, roads, settlements, or any feature beyond elevation + biome
  regions.
- The wizard UI (frontend, separate future change - see proposal.md).
- Precise real-world silhouette matching ("looks exactly like Great
  Britain") - shape archetypes produce a recognizable *category* of
  landmass (island, continent, archipelago), not a traced coastline.

## Decisions

- **Elevation: value noise, hand-implemented, seeded from `Rng` - no
  external noise library.** Same approach as this change's first draft:
  a lattice of random values at spaced integer coordinates from a named
  child `Rng` stream (`rng.Child("elevation-lattice")`), bilinearly
  interpolated with a smoothstep easing curve per cell. Kept
  dependency-free for the same reason as before - this generation logic
  is a core product capability, not incidental plumbing.
- **Shape archetype as a post-process mask on the elevation field**,
  applied before biome-region assignment (so `Ocean` regions correctly
  land on genuinely low terrain):
  - `Unconstrained`: raw noise field, no mask.
  - `Continent`: raw noise field with a single broad, low-frequency
    "landmass bump" added (centered near the map's middle, gently
    decaying outward) so noise variation still exists but overall trends
    toward one dominant elevated mass. Ocean threshold is a fixed
    elevation cutoff (e.g. `< 0.3`) as in the previous draft.
  - `Island`: like `Continent`, but the decay is steep enough that the
    outer ring of cells is guaranteed below the ocean threshold (mask
    value at the edge forced to 0 exactly) - satisfies the spec's
    "every edge cell is Ocean" requirement structurally, not
    probabilistically.
  - `Archipelago`: `K` broad landmass bumps (`K` derived from the size
    preset, e.g. 3-6), each at a random center from a named child `Rng`
    stream, each with a smaller radius than `Continent`'s single bump and
    spaced apart (rejection-sampled minimum center distance) so they
    don't merge into one connected landmass - satisfies "two or more
    disjoint landmasses, not adjacent to each other."
  - After masking, connectivity (one landmass vs. several, edge-ocean) is
    verified by flood-fill in a unit test, not assumed from the mask
    parameters alone - the mask makes the property overwhelmingly likely,
    the test is what actually enforces the spec's SHALL.
- **Biome regions via Voronoi partition**: pick `N` seed points inside
  the grid from a named child `Rng` stream (`rng.Child("regions")`), `N`
  chosen uniformly within the size preset's documented region-count range;
  assign every cell to its nearest seed point (Euclidean distance for
  `Square`, hex distance for `Hex`), giving contiguous regions by
  construction. Each region's biome is then a deterministic function of
  the *elevation at its seed point* (post-shape-mask) and a second,
  independent "moisture" value sampled the same way
  (`rng.Child("moisture-lattice")`), via the same elevation/moisture
  lookup table from this change's first draft (low elevation -> `Ocean`,
  very high -> `Mountains`, otherwise by moisture band). This both makes
  biome regions coherent (they're Voronoi cells, contiguous by
  construction) and keeps `Ocean` regions aligned with genuinely low
  terrain.
- **Grid abstraction**: unchanged from this change's first draft -
  `GridType` enum (`Square`, `Hex`), `Map` holds `GridType`, `SizePreset`,
  `Width`, `Height`, and a flat row-major `Cell` list (`X`, `Y`, `Biome`,
  `Elevation`). Hex neighbor lookup uses offset-coordinate neighbor
  tables (even-r/odd-r).
- **Size presets are a closed enum with hardcoded dimensions**
  (`Small`=32x32, `Medium`=64x64, `Large`=128x128, `Huge`=256x256) rather
  than free integers - simpler API, and removes the need for a
  dimension-limit validation rule entirely (every accepted value already
  has a bounded, known cost).

## Risks / Trade-offs

- [Risk] Structurally guaranteeing archetype properties via the mask
  shape (rather than only checking it after the fact) still needs a
  verification step, because noise variation on top of the mask could
  theoretically break through the forced-zero edge ring or merge two
  archipelago bumps. → Mitigation: generation includes a post-generation
  connectivity check (flood-fill); if it fails the property for some
  seed, that seed's map for that archetype needs a retry with a
  derived/incremented seed (an implementation detail, not spec-visible -
  the *output* the caller receives always satisfies the spec, the caller
  never sees a failed attempt).
- [Risk] Voronoi regions can produce slivers (very small regions) near
  seed-point clusters. → Accepted for v1: the spec only requires
  contiguity and a region count within range, not minimum region size;
  revisit with minimum-distance seed placement if slivers look bad once
  rendered.
- [Risk] Hand-rolled noise is unlikely to be as visually pleasing as a
  battle-tested Perlin/Simplex implementation. → Same mitigation as the
  first draft: the spec requires the coherence *property*, not a specific
  visual quality bar, so the algorithm can be swapped later without an
  API change.

## Migration Plan

Greenfield - purely additive, no existing data or API surface changes.
1. Add `GridType`, `ShapeArchetype`, `SizePreset`, `Cell`, `Map` types and
   the elevation-noise + shape-mask + Voronoi-region generator to
   `Mundus.Core`.
2. Add a controller endpoint exposing it over HTTP per the spec.
3. Unit-test each spec requirement as its own property-based check
   (determinism, region count range, contiguity, elevation coherence,
   per-archetype connectivity) rather than pinning exact per-cell output
   values.

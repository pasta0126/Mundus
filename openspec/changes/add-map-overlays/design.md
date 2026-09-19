## Context

The backend (`Mundus.Core.MapGenerator`) has no stored heightmap: a cell's
elevation, moisture, and mountain-belt status are pure functions of
`(seed, x, y)`, sampled on demand (`ElevationAt`, `MoistureAt`,
`PlateEdgeAt` are already public for this reason). Mountain ranges are
already a deterministic Worley/plate-boundary field
(`WorleyBoundaryField`, `PlateField` in `Map.cs`) warped by noise for an
organic look - the same pattern this change reuses for regions. Every
seed-derived sub-system already forks its own independent stream off the
parent seed, either via string suffixing (`$"{seed}:moisture"`) or
`Rng.Child(name)`; the frozen-order-of-derivation contract on `Rng.Child`
(design.md comment: "always append new child streams, never insert them")
is the mechanism this change's north bearing, POIs, and regions all reuse
for their own independent determinism.

The frontend (`MapCanvas.tsx`) draws the biome grid onto one full-viewport
`<canvas>`; `App.tsx.downloadMap()` calls `canvasEl.toBlob(...)` directly on
that element. See proposal.md for why this needs to grow into a layered,
toggleable, composited-on-download picture.

## Goals / Non-Goals

**Goals:**
- Establish the seeding/determinism pattern each new overlay generator
  follows, consistent with the existing invariants in `map-generation`
  (same seed+coordinate always agrees; overlapping/unbounded windows agree).
- Decide how overlay data reaches the frontend without coupling it to the
  existing biome-grid response or forcing computation of hidden layers.
- Decide how the canvas/download pipeline composites independently
  toggleable layers.
- Produce the concrete icon inventory (category x type) engineering and
  art can build against.

**Non-Goals:**
- Actual icon artwork - the user supplies it later; this change only fixes
  the enumerated set it must cover.
- Naming of regions or settlements - out of scope until a later change.
- Rivers and trade routes - dropped from this change's scope (rivers was
  implemented then removed at the user's request; trade routes was never
  built). See `tasks.md` for the historical note.

## Decisions

### One seed-derived sub-stream per overlay generator
Each new generator (north bearing, POI scatter, region partition) derives
its own child stream via
`seed.Child("<name>")` (or an equivalent seed-suffix), following the
existing `Rng.Child` contract: appended once, in a fixed order, never
inserted between existing streams. This is what keeps regenerating "the
same" seed's north and POIs stable even as more overlay types are added
later - exactly the property `map-generation`'s biome field already
guarantees for terrain.

**Alternative considered**: deriving every overlay from the same single
`Rng` sequence in call order. Rejected - the frozen-order contract makes
adding a *new* overlay type shift every subsequent draw, silently
reshuffling already-shipped overlays for existing seeds.

### North bearing: one hashed value per seed, no coordinate dependence
The compass bearing is a single `Rng.Child("north-bearing")` draw per seed
(`Float() * 360`), computed once and independent of `(x, y)` - unlike every
other field in this system, it is not a spatial function. This matches the
spec's requirement that panning/zooming never changes it.

### Rivers: deterministic lattice sources + downhill trace + domain-warped meander
Candidate river sources are enumerated the same way `WorleyBoundaryField`
enumerates cell seeds: a coarse deterministic lattice (one candidate per
block of a documented size) hashed from `seed.Child("river-sources")` plus
the block coordinate, kept only if that point's `ElevationAt` falls in the
`Peak` band. From a kept source, the path is traced step-by-step following
the local downhill gradient of `ElevationAt`, with the sampled coordinate
domain-warped each step (reusing the existing `PlateWarpNoise` technique)
so the path meanders instead of taking the single steepest direction.
Tracing stops at an `Ocean` cell, a lake cell (see below), or the
documented maximum path length (in which case the candidate is discarded).
Tributary confluence is detected when two traced paths pass within one
cell of each other - the shorter (or later-sourced, to keep the rule
order-independent) path is truncated and rewritten to continue along the
other's remaining path.

**Lakes**: the current biome model has only `Ocean` for water; there is no
enclosed-basin detection over an unbounded, unstored heightmap (a true
flood fill isn't feasible at world scale). This change adds lakes as their
own small, deterministic feature - not derived from existing elevation
noise - using the same lattice-hash scatter as river sources
(`seed.Child("lakes")`), placing circular lake basins at low-elevation
lattice points far enough from the coast, which both rivers and the biome
renderer treat as a terminal/large water body. Region and biome rendering
of lakes themselves (beyond being a valid river terminus) is out of scope
for this change.

**Note (2026-09-18)**: a working implementation of this section shipped
briefly as "Rivers (Experimental)" and was then removed entirely at the
user's request - see `tasks.md`'s Section 3 note for what to read before
re-implementing.

**Alternative considered**: computing a windowed heightmap and running a
real flood-fill/watershed algorithm. Rejected for this change - it would
require materializing and caching a heightmap per region (a significant
data-model change) purely to support lakes, versus the existing
"everything is a pure function of coordinates" model. Revisit if future
features need real hydrology.

**Windowing**: because a river can be sourced far outside a small requested
window, a window's river query traces every candidate source within the
documented maximum river length of that window's bounds (not just sources
inside it), then returns only the path segments that fall within the
window. This mirrors `map-generation`'s "a distant window generates as if
it were the only request" invariant, at the cost of retracing some path
prefix on every request touching it - acceptable since tracing is O(path
length) and cached per chunk request, not per cell.

### Points of interest: one catalog, lattice scatter per category, clusters for settlements
`PointOfInterestCatalog` (Mundus.Core) is the single source of truth: every
icon's category (a user-toggleable layer), class (terrain / anchor / service
/ singular), rarity (a numeric weight), biomes, and terrain geometry rule
(coast, cape, islet, lake, near-coast, open-sea, waterside), plus what each
settlement size contains. The generator gives each category its own lattice
(`"{seed}:poi-{category}:{bx}:{by}"`), one jittered candidate per block, kept
with a per-category density. A candidate's icon is drawn, weighted by
rarity, among the catalog entries valid on its biome and geometry. Geometry
is checked with cached biome ray probes, so POI stay a pure function of
`(seed, category, block)` and windowing agrees exactly like biomes do. A
settlements block grows a whole cluster - an anchor of some size
(point / small / medium / large / huge, each with its own rarity and
radius) and the services around it - all decided inside that block.
The API also serves the catalog (`GET /api/PointsOfInterest/catalog`), and
the frontend derives its layers panel and legend from it.

### Regions: a second, coarser Worley/plate-style partition
Region boundaries reuse the exact `WorleyBoundaryField` + domain-warp
pattern already proven for mountain ranges (`PlateField`/`PlateWarpNoise`),
seeded independently (`$"{seed}:regions"`, the same string-suffix
convention every other spatial field in `Map.cs` uses - `Rng.Child` stays
reserved for one-off, non-spatial draws like the compass bearing) and at
a coarser scale, so the "region" partition is a distinct, non-mountain-
aligned Voronoi-like tessellation. A cell's region ID is whichever Worley
cell it falls in; boundaries render wherever `EdgeProximity` is nonzero,
exactly as plate seams already do, but as a thin solid stroke instead of
uplifted terrain - and only where the underlying cell isn't `Ocean`
(`MapGenerator.IsOceanAt`, applying the same isolated-single-cell-pond
suppression `Generate` itself uses, so tiny noise-artifact ponds don't
fragment the line): a visualization-only omission, not a change to the
partition or boundary calculation itself.

### API shape: one endpoint per overlay capability, mirroring `MapsController`
Each overlay is served by its own endpoint (e.g.
`GET /api/points-of-interest`, `/api/regions`, `/api/compass`), taking the
same `seed` + window/`step` query contract as `MapsController`, rather
than folding overlay data into the `Map` response.

**Alternative considered**: extending `Map`/`MapsController` to always
include overlay data. Rejected - it would force the backend to compute
every overlay on every request even when its layer is hidden (defeating
the point of per-layer toggles), bloat the response the biome grid alone
needs, and couple independently-evolving capabilities into one contract.

### Frontend: one overlay `<canvas>` per layer, composited only on download
Each layer (compass rose, each POI category, region borders) draws into
its own `<canvas>`, stacked above `MapCanvas`'s biome canvas and below the
UI panels, shown/hidden via the layer toggles.
`downloadMap()` is rewritten to draw the biome canvas plus every currently
visible overlay canvas onto one offscreen canvas, in a fixed stacking
order, before calling `toBlob` on that composite - so hidden layers are
simply never drawn to it.

## Icon Inventory

86 icons, in three interchangeable styles (color - the default, fantasy,
line), cut from the artwork sheets in
`frontend/src/assets/poi-suite/{color,fantasy,line}/<id>.png`
(`source/` keeps the original sheets). Ids are the catalog's; every id has
art in every style, enforced by tests. Categories (layers): relief &
geology, nature & wildlife, sea & islands, settlements, monuments & ruins,
legends & mysteries.

Plus one non-POI icon: the **compass rose** itself.

## Risks / Trade-offs

- [New endpoints instead of one enriched response adds frontend
  request-orchestration complexity, layered on top of the existing tiled
  biome-loading logic] → each overlay endpoint is only called for
  currently-visible layers, and follows the exact same chunking pattern
  `tiling.ts` already implements for the biome grid.
- [The catalog and the artwork must stay in step] → tests fail when an
  icon has no art in any style or art has no catalog entry; adding or
  removing a type is a catalog change, not a rework of the placement or
  rendering mechanism.

## Open Questions

- Exact per-category POI density - a tunable implementation detail, not
  spec-level behavior; pick a reasonable default during implementation and
  document it next to the code, the way `PlateRegionScale` etc. are
  documented today.

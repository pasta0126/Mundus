## Context

See `proposal.md` - Why / What Changes for motivation and scope.

Current shape, for reference:
- `Mundus.Core/Map.cs`: `MapGenerator.Generate(seed, gridType, sizePreset)`
  builds a full `width * height` cell array in one pass by scattering
  "grain" circles and computing a metaball elevation field over the
  whole bounded grid (two tiers: big base grains, small rim-detail
  grains - see the `simplify-map-generation-to-silhouette` and
  `redesign` history in `openspec/changes/archive/`). Nothing about it
  is per-cell-addressable outside that one full-grid pass.
- `Mundus.Core/Rng.cs`: deterministic seeded RNG (`Xmur3` string hash +
  `mulberry32`), with a `Child(name)` derivation that draws from the
  *parent's own sequential stream* - fine for a handful of named
  sub-streams drawn once (`"grains"`, `"base-grain-count"`, ...), not
  usable to jump directly to an arbitrary, unbounded `(x, y)` without
  iterating every draw before it. This capability is unaffected by this
  change (still backs seed and lattice-point hashing) but a per-cell
  design cannot lean on `Child` the way per-request generation did.
- No persistence: `Mundus.Infrastructure`'s `DbContext` has zero
  entities. Map/World generation has always been pure computation on
  request; this change doesn't introduce or need any storage.
- Frontend: `MapCanvas.tsx` draws a flat pastel fill already (biome ->
  color, `contour.ts`'s marching-squares tracer draws the `Ocean`/land
  boundary as a smoothed vector line on top - see the
  `add-decent-circle-density`-era work). This change removes the
  contour tracer entirely (no single land/ocean boundary once there are
  six ordered biome bands and no fixed grid bounds) and fills cells
  directly.

## Goals / Non-Goals

**Goals:**
- A cell's biome at `(seed, x, y)` computable in O(1) - not O(distance
  from origin) or O(cells generated so far) - so a window request's cost
  depends only on that window's size, never on where it sits in the
  coordinate space.
- Six-biome ordered-band model implemented as a straightforward
  extension of the smoothstep-interpolated value-noise idea already
  proven in the (currently unused) `ValueNoise2D.cs`, made lazy/infinite
  instead of precomputed over a bounded array.
- Minimal, working UI: fixed-size window, pastel flat fill, four-way
  pan. Enough to explore the determinism and region-coherence
  properties end to end.

**Non-Goals:**
- Multi-octave/fractal noise (layering several frequencies for more
  natural-looking regions). Single-octave value noise is enough to
  satisfy the spec's smoothness requirement; revisit only if the result
  looks too uniformly blob-shaped in practice.
- A second noise axis (e.g. temperature/moisture) for biome assignment.
  One ordered scalar band model is enough for six biomes and keeps
  determinism trivial to reason about; a "snow band" that can appear
  anywhere the field is high (not just at world "poles") is an accepted
  v1 simplification.
- Zoom, variable window size, or a minimap. Pan-only, fixed window and
  cell size (see Decisions).
- Pixel-art biome tiles (explicitly deferred in the proposal).
- Any change to how the seeded `Rng` itself works - it's reused as-is
  for lattice-point hashing.

## Decisions

### Lattice noise, sampled lazily instead of precomputed
Each biome's underlying terrain value comes from 2D value noise: a
coarse lattice of random values, smoothstep-interpolated so nearby
points vary smoothly (this is exactly `ValueNoise2D.cs`'s existing
technique). The only change is *how a lattice point's value is
obtained*: today it's `rng.Float()` drawn in a row-major loop over a
precomputed `double[,]` sized to the bounded grid. For an unbounded
grid, a lattice point `(lx, ly)` (`lx, ly` any integer) instead gets its
value from a **fresh `Rng` seeded by hashing the seed with that lattice
point's coordinates** - e.g. `new Rng($"{seed}:lattice:{lx}:{ly}").Float()`
- taking the first draw. This is O(1), needs no array, and is exactly as
deterministic as the string-seeded `Rng` already is (same `Xmur3` hash
it already uses for the top-level seed).

Sampling a cell `(x, y)`: divide by a fixed **region scale** (cells per
lattice unit) to find its surrounding 4 lattice points, smoothstep-
interpolate between them exactly as `ValueNoise2D.Sample` does today.
Region scale is a tunable constant (not part of the seed) - start at 32
cells, matching the rough size regions read as at the old "Small" preset
scale, and adjust visually during implementation.

**Alternatives considered:**
- *Precompute a lattice array per request, sized to the window plus
  margin* (closer to today's code): rejected - ties lattice-point values
  to request-relative array indices, which is exactly the
  location-dependence the spec rules out (two different windows
  covering the same lattice point must derive it identically, and doing
  that by construction is simpler than doing it by careful index-math
  bookkeeping).
- *A real gradient-noise library (Perlin/Simplex)*: rejected for the
  same reason `ValueNoise2D`'s own doc comment gives - this generation
  logic is a core product capability, not incidental plumbing worth an
  external dependency for.

### Biome bands: six fixed thresholds on one scalar
Fixed, ascending thresholds on the `[0, 1)` terrain value:

| Biome      | Range         |
|------------|---------------|
| `Ocean`    | `< 0.35`      |
| `Beach`    | `0.35 - 0.40` |
| `Grassland`| `0.40 - 0.62` |
| `Forest`   | `0.62 - 0.78` |
| `Tundra`   | `0.78 - 0.90` |
| `Snow`     | `>= 0.90`     |

Chosen so oceans and grassland/forest (the two most common outdoor
biomes for exploration) each get a wide band, while `Beach` stays a thin
transitional ring around ocean edges (mirroring the old `OceanThreshold`
cutoff's role) and `Snow` stays rare, at the extreme.

**Alternatives considered:** equal-width bands (`1/6` each) - rejected,
makes `Beach` far too thick (a wide ring of "beach" around every ocean
reads as unrealistic) and gives `Snow`/`Tundra` outsized real estate for
what should be a rare extreme.

### Window query API
`GET /api/Maps?seed=<string>&x=<int>&y=<int>&width=<int>&height=<int>`.
`x`/`y` name the window's origin (top-left cell, inclusive); `width`/
`height` are cell counts, each validated to `1..256` (256 chosen to
match the old `Huge` preset's proven-fast per-request cost - see the
`generation freeze` fix in this repo's history for why that number is
already known to render/fetch acceptably). Response: `{ specVersion,
seed, originX, originY, width, height, cells: [{ x, y, biome }] }`
- `x`/`y` on each cell are absolute world coordinates, not
window-relative, so the client never has to add an offset to reason
about a cell's identity.

### Frontend: full-viewport canvas, fixed cell size, pan by half a window
The map is the page background: canvas width/height are set to the
browser viewport's size (updated on resize), not a fixed card size.
Cell size is a fixed `24px`; the requested window's `width`/`height` (in
cells) are computed as `ceil(viewportPx / 24)` for each axis, clamped to
the API's documented `1..256` max per axis (only relevant on very large
viewports - e.g. an ultra-wide monitor - where the request is capped at
256 cells wide and the rightmost sliver of the viewport simply isn't
covered by a cell rather than over-requesting). Panning shifts the
origin by half the current window (in each axis) in the chosen
direction and re-fetches - large enough to feel like real movement,
small enough to keep on-screen continuity with the previous view (half
the grid is cells the user has already seen). Every other UI element
(wizard, params panel, pan controls) is positioned as an absolutely/
fixed-positioned overlay on top of the canvas, never in a layout flow
that shrinks or displaces it.

`MapCanvas.tsx` becomes a direct per-cell `fillRect` loop (biome ->
pastel color) with no contour tracer; `contour.ts` is deleted entirely
(the removed `map-creation-wizard` requirements - see that capability's
delta spec - retire the marching-squares coastline it existed for).

**Alternatives considered:** fixed `32x32` window at a fixed `640px`
canvas size, centered on the page with UI beside it (the shape this
change started with) - superseded once the map became the page
background: a fixed-size canvas would either leave visible empty page
background around it on larger screens or need to be stretched with CSS
(blurring/distorting cells) rather than requesting the right number of
cells for the actual viewport.

### `Map.SpecVersion` bump
Bump to the next integer, continuing the existing monotonic convention
(`Map.cs`'s doc comment: "treat as a breaking change to
`Map.SpecVersion`") rather than resetting to `1` - this is still the
same `Map` concept evolving, not a new one, even though the shape
changes substantially.

## Risks / Trade-offs

- **A single ordered scalar can rarely place non-adjacent bands next to
  each other** (e.g. `Snow` bordering `Grassland` if the lattice swings
  sharply between two neighboring cells) → Mitigation: the spec's
  "neighboring cells trend toward the same or adjacent biome band"
  requirement is explicitly statistical (average neighbor difference
  smaller than average random-pair difference), not an absolute
  guarantee - the same standard the old elevation field already met in
  production. A wide enough region scale keeps this rare in practice.
- **Negative-coordinate math (lattice index, cell-to-lattice division)
  must floor-divide, not truncate**, or values just west/north of `0`
  read from the wrong lattice cell → Mitigation: implement and test
  floor division explicitly (C#'s `/` truncates toward zero for
  negative integers); cover negative-origin windows in
  `MapGeneratorTests.cs`.
- **Frontend/backend contract changes together**: deploying the new
  backend against the old frontend (or vice versa) breaks map loading
  entirely (removed query params, removed `Elevation` field) →
  Mitigation: same single-release deploy practice already used in this
  repo (`docker compose build && up -d` for both containers together);
  regenerate `frontend/src/api/schema.d.ts` from the new OpenAPI
  document as part of this change, not left stale.
- **Deleting `WorldsController`/`World.cs` removes a working, tested
  endpoint** (`GET /api/Worlds/{seed}`) that nothing currently depends
  on, but a future caller could theoretically exist → Mitigation:
  accepted per proposal.md - the frontend has never called it, and
  keeping a second, unrelated "generate something from a seed"
  capability around only invites confusion with the real one this
  change establishes.

## Migration Plan

No data migration: generation is stateless (no DB entities involved).
Deploy is the existing practice already used in this repo: merge to
`main`, `git pull` + `docker compose build && docker compose up -d` on
the production host, both containers rebuilt together in the same step
so the API and frontend contracts never mismatch in production.
Rollback is `git checkout <previous commit>` + rebuild/redeploy the same
way; no schema/data to reverse.

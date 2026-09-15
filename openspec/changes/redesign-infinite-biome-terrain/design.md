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
- A third+ noise axis (e.g. temperature as distinct from moisture), or
  latitude-based biome placement (so `Snow` only appears near world
  "poles"). Two axes (elevation, moisture) is enough for ten biomes with
  believable variety; a `Snow` band that can appear anywhere the
  elevation field is high enough, not just at a modeled "pole", is an
  accepted simplification.
- A minimap, or continuous/scroll-wheel zoom. Zoom is pan-style
  (discrete steps, re-fetch), not a smooth continuous transform - see
  Decisions.
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

### Fractal (fBm) noise: two independent fields, continent-scale base
A single octave of value noise reads as same-sized smooth blobs
everywhere - every region is roughly `regionScale` cells across, with no
finer structure, which in practice looked too uniform. `InfiniteValueNoise2D`
sums several octaves instead: a base octave plus finer ones, each at
half the previous octave's region scale (double the frequency) and half
its amplitude (`persistence = 0.5`), normalized by the sum of
amplitudes so the result stays in `[0, 1)`. Each octave hashes lattice
points with its own octave index folded into the seed
(`{seed}:lattice:{octave}:{lx}:{ly}`) so octaves don't correlate.

Two such fields are sampled per cell, from two *independent* seeds (so
they don't correlate with each other either):
- **Elevation** - `InfiniteValueNoise2D(seed, regionScale: 512, octaves: 7,
  persistence: 0.5)`. Region scales `512 -> 256 -> 128 -> 64 -> 32 -> 16
  -> 8`; base octave carries `1 / 1.9921875 ≈ 50%` of the weight.
  `regionScale` went `32 -> 128 -> 512` across three rounds of feedback:
  `32` read as "lakes", `128` was truer to an ocean/continent shape at
  the default (most zoomed-in) view but still looked lake-sized once the
  lowest zoom step (1px/cell, showing thousands of cells at once) shipped
  - `512` is what a body of water needs to still read as ocean-scale
  rather than pond-scale at that widest view. Two extra octaves (down to
  the same finest `8` scale as before) keep the coastline/archipelago
  raggedness the smaller `regionScale: 128` gave, instead of losing it
  to the larger base's coarser detail.
- **Moisture** - `InfiniteValueNoise2D($"{seed}:moisture", regionScale: 96,
  octaves: 4, persistence: 0.5)`. Region scales `96 -> 48 -> 24 -> 12`;
  base octave carries `1 / 1.875 ≈ 53%` of the weight. Deriving its seed
  by suffixing the parent seed (not a fresh unrelated string) keeps it
  anchored to the same seed while guaranteeing independence from the
  elevation field (different seed string -> entirely different lattice
  hashes).

Both fields still satisfy the spec's neighbor-smoothness requirement
(each is itself a smooth fBm field); the finer octaves in each add the
local variation real terrain has - a small lake inside a landmass, a dry
patch inside a otherwise-wet region - without disturbing the large-scale
shape the base octave establishes.

**Alternatives considered:** higher persistence (more weight on fine
detail) - rejected, it broke the neighbor-smoothness requirement's
spirit (too much cell-to-cell jitter, verged back toward per-cell
noise); reusing one field for both elevation and moisture with a
coordinate offset (e.g. sample elevation at `(x, y)` and moisture at
`(x + 10000, y)`) - rejected, offsetting into the *same* lattice doesn't
guarantee independence the way a different hash seed does, and costs
nothing extra to do properly.

### Biome set: elevation bands, moisture splits the middle two
Fixed, ascending thresholds on the elevation value, four bands:

| Elevation band | Range         |
|-----------------|---------------|
| Ocean            | `< 0.42`      |
| Beach             | `0.42 - 0.46` |
| Lowland          | `0.46 - 0.68` |
| Highland          | `0.68 - 0.85` |
| Peak               | `>= 0.85`     |

`Ocean` and `Beach` map directly to those biomes regardless of
moisture. `Peak` maps to `Mountains` (moisture `< 0.65`) or `Snow`
(moisture `>= 0.65`) - a snow-capped peak reads as a wet peak, a bare
rocky one as a dry-to-medium peak. `Lowland` and `Highland` each split
three ways on the moisture value (`< 0.35` dry, `0.35 - 0.65` medium,
`>= 0.65` wet):

| Elevation band | Dry      | Medium      | Wet          |
|------------------|----------|-------------|--------------|
| Lowland           | Desert   | Grassland   | Swamp        |
| Highland          | Tundra   | Forest      | Rainforest   |

Ten biomes total: `Ocean`, `Beach`, `Desert`, `Grassland`, `Swamp`,
`Tundra`, `Forest`, `Rainforest`, `Mountains`, `Snow`. Elevation bands
keep unequal widths for the same reason the original six-band table did
(`Ocean`/`Lowland` wide since they're the most common ground the user
explores; `Beach`/`Peak` narrow since they're transitional/rare) - see
the archived single-axis version of this table in git history for the
prior rationale, which still applies to the elevation axis alone.
Moisture bands are simple equal thirds - there's no equivalent
"transitional ring" concern on that axis.

**Alternatives considered:** a `Mountains`-only peak band (no `Snow`
split) - rejected, `Snow` was one of the original six biomes and gating
it behind "high AND wet" (rather than "high" alone) is arguably more
realistic than the original single-axis model where any sufficiently
high value was always `Snow`.

### Window query API
`GET /api/Maps?seed=<string>&x=<int>&y=<int>&width=<int>&height=<int>`.
`x`/`y` name the window's origin (top-left cell, inclusive); `width`/
`height` are cell counts, each validated to `1..512`. Response:
`{ specVersion, seed, originX, originY, width, height,
cells: [{ x, y, biome }] }` - `x`/`y` on each cell are absolute world
coordinates, not window-relative, so the client never has to add an
offset to reason about a cell's identity.

`512` (up from an earlier `256`, itself carried over from the old
`Huge` preset) is set by measured cost, not a round number: a `512x512`
window (262,144 cells, each sampling 5 elevation + 4 moisture octaves)
takes ~300ms of in-process generation after the lattice-value cache
below, ~800ms end-to-end over HTTP once JSON-serializing and
transferring its ~9MB response is included - the largest size that
stays comfortably inside the existing "generating..." loading state's
expected latency. `1024x1024` measured ~1.2s of generation alone and
`2048x2048` ~5s - both rejected as too slow to request routinely just
from zooming out. See "Lattice value caching" below for why this number
moved at all once fBm/moisture made per-cell sampling far more
expensive than the original single-octave field.

#### Lattice value caching (perf)
Naively, every cell independently re-derives all 4 of its surrounding
lattice points *per octave* via a fresh `Rng` (string-formats a key,
then runs `Xmur3` over it) - but neighboring cells, and every cell
within the same lattice square, share those same lattice points. A
`512x512` window hit this hard enough to matter (measured ~800ms+
uncached for a smaller `256x256` window, once elevation/moisture's 9
combined octaves were added) purely from redundant hashing of points
that had already been computed for an earlier cell in the same window.
`InfiniteValueNoise2D` now caches each `(octave, latticeX, latticeY) ->
value` the first time it's derived, scoped to that instance (one field,
one `Map.Generate` call) - never shared across requests, so it can't
leak location-dependence between them, the same guarantee the
lazy-hashing design started with. This cut `256x256` from ~800ms to
~170ms and is what makes `512x512` viable at all.

### No wizard: generate automatically on load
The seed/start-position wizard (three steps: Seed, Start Position,
Review) is removed entirely. On mount, the app fires one window request
at `(0, 0)` with a freshly generated random seed - no user input is
collected first. This drops the entire concept of a coordinate the user
chooses: with pan and zoom both available immediately after that first
render, typing in a starting `(x, y)` bought little (nobody has explored
anywhere yet, so any coordinate looks the same) while adding a multi-
step flow before ever seeing a map. `App.tsx`'s `phase` type drops
`"wizard"`; `MapCreationWizard.tsx`, its step components, `wizard/
types.ts`, and `ChoiceGrid.tsx` are deleted outright rather than
adapted. The `map-creation-wizard` capability keeps its existing spec
path (renaming it was considered and rejected - the path is an
implementation identifier, not user-facing, and churning it costs more
in spec-history continuity than it buys in accuracy).

**Alternatives considered:** keep a minimal one-step wizard (seed only,
start position always `(0, 0)`) - rejected per the user's explicit ask
for "solo hay 1 página con un regenerar, la uni y pocomas" (just one
page with a regenerate, and little else): a single required step the
user must click through before seeing anything is exactly the
friction being removed, and Regenerate already covers "I want a
different seed" for anyone who wants one.

### Frontend: full-viewport canvas, stepped zoom down to 1px, pan by half a window
The map is the page background: canvas width/height are set to the
browser viewport's size (updated on resize), not a fixed card size.
Cell size comes from a fixed, small array of steps,
`ZOOM_LEVELS_PX = [24, 20, 16, 12, 8, 6, 4, 3, 2, 1]` (index `0`, `24px`,
is the largest/most-zoomed-in level; `1px`, the *last* index, is the
default and the maximum zoom-out - the initial load and Regenerate both
start there, showing the widest possible view of the world first, with
zoom-in as the primary action from that point). The desired window's
`width`/`height` (in cells) are computed as `ceil(viewportPx / cellPx)`
for each axis - see "Tiled, progressive window loading" for how that
window (which at low `cellPx` values is far larger than any single
request should cover) actually gets fetched. Zooming steps `cellPx` to
the next/previous array entry, re-fetching a window centered on the same
point (current origin + half the current window, in cells) at the new
`cellPx` - not a CSS/canvas-transform zoom, since the whole point is to
reveal more *generated* cells, not stretch pixels. Panning shifts the
origin by half the current window (in each axis, at the current zoom
level) in the chosen direction and re-fetches - large enough to feel
like real movement, small enough to keep on-screen continuity with the
previous view (half the grid is cells the user has already seen). A
"go to coordinates" form (two number inputs plus a submit control) lets
the user instead re-center the current zoom step's window directly on
an entered `(x, y)`, computed the same way as a zoom re-center
(`entered - floor(window / 2)`), reusing the same `fetchTiled` path -
distinct from panning's fixed half-window step, and independent of the
default-origin behavior on load/Regenerate. Every other UI element
(params panel, pan/zoom controls, go-to form) is positioned as an
absolutely/fixed-positioned overlay on top of the canvas, never in a
layout flow that shrinks or displaces it. Every actionable control
(pan, zoom, copy seed, go-to, regenerate, download) pairs an icon with
its label, and Regenerate/Download are laid out as equal-width
(`flex-1`) buttons rather than sized to their text, so the two primary
post-generation actions read as equally prominent.

**Alternatives considered:** continuous/scroll-wheel zoom with a CSS
transform on the canvas between re-fetches - rejected per proposal's
"not too much" zoom ask: a small, discrete step count keeps the
region-scale-32 noise field from ever being viewed at a scale where its
smoothing becomes visually obvious, which an open-ended continuous zoom
would risk.

Downloaded PNGs are named
`mundus-{seed}-x{originX}-y{originY}-{YYYYMMDD}_{HHmmss}.png` - the seed
and origin needed to reproduce the exact view (cell size and window
size are left out as noise, not needed to reproduce it - the seed plus
origin already fully determine the terrain), plus a timestamp in the
Japanese `YYYYMMDD_HHmmss` convention so repeated downloads of the same
view don't silently overwrite one another in the browser's downloads
folder.

### Tiled, progressive window loading
At low `cellPx`, the window needed to cover a real viewport (e.g.
`1920x1080` at `1px/cell` = 1080x1080+ cells) is well past what one
request should return (see the `512` cap's own cost measurements
above) - and simply capping the *logical* window at 512, as an earlier
version of this design did, meant a "square in the middle of the page"
at the lowest zoom steps instead of the whole point of zooming out
(seeing more of the map). Instead, the frontend splits the desired
window into a grid of `CHUNK_SIZE = 256`-cell-per-axis chunk requests
(safely under the `512` per-request cap, ~170ms/~400ms end-to-end each),
fires them with `CONCURRENCY = 6` in flight at a time (a plain
queue-of-workers `Promise` pool - matches a typical browser's
same-origin connection limit; no library needed for something this
small), and draws each chunk's cells onto the canvas the moment that
chunk's response arrives, rather than waiting for the whole grid.

The *logical* (pre-tiling) window is still capped, at
`MAX_TOTAL_DIMENSION = 4096` cells per axis - generous enough that no
real display binds it (a `4096px`-wide viewport at `1px/cell` would need
exactly `4096`; nothing on the market is wider) - purely as a sanity net
against a pathological viewport/zoom combination triggering an
unbounded number of chunk requests, not as a routine constraint. Only
past that net does `MapCanvas` fall back to centering a smaller-than-
viewport result, same idea as the single-request design's centering,
now just unreachable in practice.

`MapCanvas` takes an array of chunk responses plus the overall target
window's shape (for canvas sizing/centering) and a `generation` counter
instead of one `Map`. A `generation` change (a brand new fetch cycle
starting) resets a `drawnCount` ref and clears the canvas; each time the
chunk array grows, a second effect draws only the chunks from
`drawnCount` onward and advances it - so total draw work across a whole
progressive load is `O(cells)` once, not `O(cells)` repeated per chunk
arrival (which a naive "redraw everything every update" approach would
cost). The *previous* view's chunks/generation aren't touched until the
*new* generation's first chunk actually arrives - `App.tsx` only calls
`setChunks`/`setViewWindow` (which is what flips `MapCanvas.generation`)
at that point, not when the fetch starts - so panning/zooming/
regenerating never blanks the page while only the network is pending;
it stays on the last good view until real new data is ready to replace
it. If every chunk of a re-fetch fails, that last good view simply
stays (loading just stops); only a first-ever load with zero successful
chunks shows the error screen, tracked via a `hasViewRef` boolean rather
than component state to avoid a stale-closure check inside the
concurrent chunk loop.

The loading progress bar's value is `chunksLoaded / totalChunks`, not a
fixed placeholder - meaningful now that a view can be dozens of chunks
and several seconds end-to-end at the lowest zoom step.

**Alternatives considered:** raising `MaxWindowDimension` itself instead
of tiling - rejected, `1024x1024`/`2048x2048` measured ~1.2s/~5s of
*generation alone* (before network/serialization), both too slow for a
single request a user might trigger just by scrolling out; tiling keeps
every individual request in the fast, already-proven `~256-512` range
while still covering an arbitrarily large logical window.

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

- **The elevation/moisture fields can rarely place unlikely biome
  neighbors next to each other** (e.g. `Desert` bordering `Swamp` across
  a moisture-band boundary, with no `Grassland` cell between them, if
  the moisture lattice swings sharply right at an elevation-band
  boundary) → Mitigation: the spec's neighbor-smoothness requirement is
  explicitly statistical (average neighbor difference smaller than
  average random-pair difference), not an absolute guarantee - the same
  standard the original single-axis field already met in production. A
  wide enough region scale on both fields keeps this rare in practice.
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

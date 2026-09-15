## Context

See proposal.md - Why, and the archived
`openspec/changes/archive/2026-09-15-improve-map-rendering-style/design.md`
for the blur-based technique this supersedes (its own Risks section
already flagged "revisit with the marching-squares alternative if it
looks bad once rendered" - it did).

## Goals / Non-Goals

**Goals:** crisp, recognizable coastlines; terrain that reads as shaded
relief, not flat fills; icons dense/detailed enough to read as
"mountains" and "forest" at a glance.

**Non-Goals:** unchanged from the prior rendering change - no rivers,
borders, labels, cities, compass. Not attempting pixel-parity with the
reference illustrations, which are hand-drawn - this is a procedural
approximation of their visual language (crisp coast + shaded relief +
iconography), not a reproduction.

## Decisions

- **Marching squares + Chaikin smoothing for Square-grid coastlines.**
  Build a boolean land/ocean field from `cell.biome !== "Ocean"`. Sample
  a scalar at each grid *corner* as the fraction of its up-to-4
  surrounding cells that are land (0, 0.25, 0.5, 0.75, or 1). Run
  standard marching-squares (16-case lookup) at threshold 0.5 over the
  corner grid to get contour line segments, chain them into closed
  polylines, then apply 3-4 iterations of Chaikin corner-cutting to each
  polyline for a smooth curve. Fill polylines with the land base color
  using canvas `Path2D` + `fill("nonzero")` (marching squares naturally
  produces consistent winding, so outer boundaries and holes - e.g. an
  `InlandSea`'s enclosed water - fill correctly without extra
  bookkeeping), then `stroke()` each with a darker coastline color.
  Alternative considered (and rejected, again): the blur-upscale
  technique from the prior change - genuinely too soft per the owner's
  feedback.
- **Hex grid: crisp per-hex fill, no blur.** Marching squares assumes a
  4-neighbor square lattice and doesn't map cleanly onto true hex
  adjacency (6 neighbors) - forcing it would need either a hex-specific
  contour algorithm or a lossy approximation. Simpler and more
  *authentic* choice: draw each hex cell as an exact filled polygon (as
  before the blur trick existed), then walk every cell and stroke any
  hex edge shared with a neighbor of different land/ocean status. This
  gives a genuinely crisp coastline - a hex-stepped one, which is how
  real hex-grid wargames render coastlines (nobody smooths hex map
  coastlines into blobs); it is not a compromise relative to Square, it
  is the appropriate rendering for a hex grid.
- **Hillshading**: for each cell, estimate the elevation gradient from
  immediate neighbor differences (`dx`, `dy`), pick a fixed light
  direction (e.g. upper-left, `(-0.7, -0.7)` normalized), and compute
  `shade = clamp(0.5 + dot(gradient, lightDir) * k, 0.5, 1.5)` as a
  multiplier on the base biome color (in addition to, not instead of,
  the existing absolute-elevation lightness factor) - cells sloping
  toward the light read brighter, away from it darker, giving a relief-
  shaded look. Computed directly from the cell array (no offscreen
  buffer needed now that coastlines are vector, not raster-blurred).
- **Icons**: increase the deterministic-hash subsample density (see the
  prior change's hash function) and replace single-mark icons with
  small multi-part glyphs - Mountains: 2-3 overlapping jagged triangles
  of varying height ("range" silhouette) with a light stroke; Forest: a
  cluster of 4-5 overlapping two-tone circles (a darker outline shade
  plus a lighter highlight dab) rather than 3 flat dots.
  denser subsample.
- **Ocean texture**: short, slightly curved horizontal dash strokes at a
  regular-but-jittered (hash-based, not a perfect grid) offset across
  `Ocean` cells, in a lighter shade of the ocean color, suggesting wave
  crests without needing an animated or photographic texture.
  no library.
- **Border frame**: a simple double-rule rectangle (outer thin line,
  inset thin line, parchment-colored background between and around them)
  drawn last, on top of everything, sized so the terrain rendering itself
  shrinks slightly to leave room for it rather than being cropped by it.

## Risks / Trade-offs

- [Risk] Marching squares + Chaikin is a meaningfully larger algorithm
  than the prior blur trick, with more surface area for bugs (especially
  hole/winding correctness for `Archipelago`/`InlandSea`). → Mitigation:
  verify visually against all seven shape archetypes, specifically
  checking `Archipelago` (multiple separate filled contours) and
  `InlandSea` (a correctly-unfilled hole) before considering this done.
- [Risk] Hillshading adds a second per-cell computation depending on
  neighbor lookups already implemented once for other purposes (kept
  local to `MapCanvas`, not shared with the backend's own neighbor logic
  - these are frontend cosmetic neighbors on the raw cell array, not the
  backend's adjacency rules). → Accepted, it's cheap (single pass, no
  grid type branching needed since it only needs "the cell to the right"
  and "the cell below" which exist identically in the flat row-major
  cell array for both grid types).
- [Risk] None of this is performance-tuned; the owner explicitly said
  slower generation/rendering is acceptable. → Deliberately not
  optimizing further unless it becomes actually janky at Huge (256x256)
  in manual testing.

## Addendum (found during verification)

The first working version (corner scalar = fraction of surrounding cells
classified land, i.e. only 5 possible values: 0, 0.25, 0.5, 0.75, 1)
produced a long spurious straight line cutting across otherwise-correct
coastlines. Root cause: with only 5 discrete corner values, exact ties at
the 0.5 threshold - and the resulting ambiguous "saddle" squares - were
common instead of the rare, measure-zero coincidence marching squares
normally assumes; some contours failed to chain back to their own start,
and unconditionally `closePath()`-ing every polyline drew a straight
chord across the gap. Fixed two ways: (1) `extractContours` now takes a
continuous scalar (cell elevation) instead of a boolean land mask, making
exact ties genuinely rare; (2) as a defensive backstop regardless, an
open (non-looping) polyline is now dropped instead of force-closed. See
`contour.ts`'s updated doc comment.

## Migration Plan

Purely additive/visual, replaces the prior change's renderer internals.
Verify by generating one map per shape archetype and both grid types and
eyeballing the render (per tasks.md), not automated pixel tests.

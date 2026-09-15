## Context

See proposal.md - Why. `MapCanvas.tsx` currently draws each cell as a
hard-edged `fillRect`/hex polygon directly onto the visible viewport-sized
canvas - see the archived
`openspec/changes/archive/2026-09-15-add-map-creation-wizard/design.md`
for the original renderer decisions this supersedes.

## Goals / Non-Goals

**Goals:**
- Smoothed coastlines with no new dependency and minimal added
  complexity.
- A palette and light iconography that reads as "map," not "data grid,"
  within the explicit reduced scope from proposal.md.

**Non-Goals:**
- Rivers, borders, labels, cities, compass rose (see proposal.md).
- Photorealistic or hand-painted-quality rendering - this is a
  perceptible step toward the reference style, not parity with it.

## Decisions

- **Smoothing technique: render small, then scale up with canvas
  smoothing.** Draw the full cell grid (same per-cell fill logic as
  before) onto an offscreen canvas sized only a few pixels per cell
  (`PRE_SCALE = 3`px/cell), then `drawImage` that offscreen canvas onto
  the visible viewport-sized canvas with `imageSmoothingEnabled = true`
  and `imageSmoothingQuality = "high"`. The browser's bilinear/bicubic
  scaling blurs hard cell boundaries into soft gradients, which reads as
  a smoothed coastline. Alternative considered: marching-squares contour
  extraction with bezier-smoothed paths - genuinely smoother and
  crisper, but a meaningfully larger algorithm for a change whose stated
  scope is explicitly reduced; revisit if this approach reads as too
  blurry/muddy in practice once seen rendered.
- **Same technique for both grid types**: square cells are `fillRect`,
  hex cells are the existing hex polygon path, both drawn at
  `PRE_SCALE`-per-cell resolution onto the offscreen canvas before the
  same upscale-with-smoothing step - no grid-type-specific smoothing
  logic needed.
- **Palette**: replace the existing saturated per-biome RGB triples in
  `biomeColors.ts` with muted, warm tones (deep teal-blue ocean, olive
  forest, sandy tan desert, pale warm tundra, warm olive grassland, dark
  olive swamp, warm grey-brown mountains) - chosen by eye against the
  reference images, not a formula; adjust further after seeing it
  rendered if a specific biome reads poorly.
- **Iconography**: after the smoothed base terrain is drawn, make a
  second pass over the *original* (non-upscaled) cell list at full
  viewport coordinates. For a subsampled fraction of `Mountains` cells
  (e.g. one in every ~6, so icons don't visually merge into a solid mass
  at high cell density) draw a small filled triangle "peak" mark; for a
  similar subsample of `Forest` cells, draw a small cluster of 2-3
  filled circles ("tree" mark). Subsampling is deterministic (based on
  cell coordinates, e.g. `(x + y) % 6 === 0`), not random, so the same
  map always renders identically. Icon size scales with cell size so it
  stays proportional across size presets.
- **Generate-another button**: `App.tsx` already tracks `stepIndex` and
  `wizardState` outside the wizard component (see the archived wizard
  design.md's "View state" decision) specifically so a result view can
  send the user back to an arbitrary step without losing state - this
  change only needs to change the target step index from `review` to
  `seed` and adjust the button's label/wiring, no new state shape.

## Risks / Trade-offs

- [Risk] Bilinear upscaling smooths noise texture along with coastlines,
  which could make elevation shading look washed out at high magnification
  (small map, e.g. Small/32x32, viewed at full 640px viewport - each cell
  is already ~20px before smoothing). → Accepted: acceptable at the sizes
  in scope; revisit with the marching-squares alternative if it looks
  bad once rendered.
- [Risk] Deterministic subsampling for icons (`(x+y) % 6`) can create a
  faint visible diagonal-stripe pattern rather than an organic scatter.
  → Accepted for this reduced-scope pass; a noise-based/jittered
  subsample is a small follow-up if it looks too regular once rendered.

## Addendum (found during verification)

Testing task 2.1 against several seeds turned up zero `Mountains` cells
across ~8 tries - not an icon-rendering bug, but `MountainThreshold =
0.85` in `Mundus.Core/Map.cs` being practically unreachable: biome is
decided by sampling elevation at a single Voronoi seed point, and
bilinear-interpolated lattice noise rarely gets close to 1.0 (needs all
four surrounding lattice corners to independently roll high). Lowered to
`0.65` (empirically ~2-10% of cells exceed it, vs. well under 1% at
0.85), which produced Mountains in roughly 2 of 10 subsequent test seeds
- present but still a genuinely elevated, not universal, biome. This is a
tuning constant, not a spec-visible contract change (the spec only
requires Mountains come from the fixed biome set, not a specific
occurrence rate), so no spec update was needed - see
`backend/src/Mundus.Core/Map.cs`.

## Migration Plan

Purely additive/visual - no data or API shape changes. Verify by
generating one map per shape archetype and eyeballing the render (per
tasks.md), not by automated pixel-comparison tests.

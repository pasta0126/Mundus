## Context

See proposal.md - Why. This intentionally throws away most of
`map-generation`'s recent complexity (shape archetypes, elevation-mask
engine, Voronoi biome regions - see
`openspec/changes/archive/2026-09-15-add-map-generation/design.md`) in
favor of a much simpler, classic technique, and rebuilds richness
incrementally from there per the project owner's direction.

## Goals / Non-Goals

**Goals:** a small, easy-to-reason-about silhouette generator; keep the
frontend's contour/hillshade/wave-texture rendering pipeline working
unchanged against the simpler data; a materially clearer wizard and
post-generation UX (three explicit actions, real progress feedback).

**Non-Goals:** biome variety, mountain/forest iconography, elevation
noise texture - deferred (see proposal.md Non-Goals). Elliptical/rice-
shaped grains (true grain shapes, not circles) - a future refinement.

## Decisions

- **Grain-scatter algorithm**: for a given seed, derive a grain count
  from the size preset (roughly proportional to area, e.g. Small 4-7,
  Medium 6-10, Large 10-16, Huge 16-24 - tuned by eye, not a hard
  contract), each grain a random center within the grid plus a radius
  drawn from three bands evoking rice/lentil/chickpea (small/medium/
  large, e.g. ~6%/10%/16% of the grid's width). Per-cell elevation is the
  max, over all grains, of a radial falloff `clamp(1 - distance/radius,
  0, 1)` - i.e. a "metaball"-style union: overlapping grains merge into
  one landmass, non-overlapping ones stay separate islands, all for
  free from taking a `max`. Ocean threshold stays `0.3`, unchanged, so
  the frontend's hardcoded contour threshold (see
  `frontend/src/map/MapCanvas.tsx`) does not need to change.
  Alternative considered: true elongated grain shapes (ellipses at
  random rotation) for more rice/lentil-like silhouettes. Rejected for
  this first pass - circles are enough to validate the technique, and
  swapping the per-grain distance function later is a small, contained
  change (not a reason to delay this change).
- **No retry/verification loop.** The previous archetype system verified
  and retried generation until a topological guarantee held. Nothing
  here needs guaranteeing (there is no archetype to satisfy) - the
  silhouette is whatever the grains produce, by design.
- **Single land biome value.** Reuses the existing `Biome` enum (no
  schema/wire-format change) but only ever emits `Ocean` or one fixed
  land value - keeping `Cell`/`Map`'s JSON shape identical so the
  frontend needs no changes to its data model, only to what it does with
  Mountains/Forest-specific code (removed, since those biomes never
  occur now - see below).
- **Frontend rendering**: keep the contour extraction, Chaikin smoothing,
  hillshading, and wave-texture code entirely as-is (they operate on
  elevation and the Ocean/non-Ocean split, neither of which changed
  shape). Remove the Mountains/Forest icon-drawing code paths (dead now
  that those biomes never occur) rather than leaving them unreachable -
  per the project's no-dead-code convention.
- **Wizard**: drop the Shape Archetype step entirely (`WIZARD_STEPS`
  becomes `["seed", "gridType", "sizePreset", "review"]`); `WizardState`
  drops `shapeArchetype`.
- **Post-generation actions**: `App.tsx`'s view-state union gains
  distinct handlers for Regenerate (calls the API again in place, new
  random seed, same grid/size, no view-state change to `wizard`),
  Restart wizard (resets `wizardState` to `INITIAL_WIZARD_STATE` and
  `stepIndex` to 0, switches view to `wizard`), and Download (canvas
  `toBlob('image/png')` + a temporary `<a download>` link, no server
  round-trip).
- **Progress/status feedback**: add a `shadcn/ui` `Progress` component
  (`npx shadcn add progress`, consistent with how `button`/`card` were
  added) for the generating/rendering states; the render step (contour
  extraction can be non-trivial CPU work at Huge/256x256) is wrapped so
  a "Rendering…" message paints before the synchronous drawing work
  runs (`requestAnimationFrame` before the heavy `MapCanvas` draw, or an
  explicit `rendering` view-state entered before the draw and exited
  after via a microtask/rAF) rather than blocking with no feedback.

## Risks / Trade-offs

- [Risk] Circle-only grains will look more like "scattered coins" than
  authentic rice/lentil silhouettes. → Accepted for this first pass per
  proposal.md's explicit Non-Goals; the union/merge behavior (the actual
  point of the technique) doesn't depend on the grain shape.
- [Risk] Removing the retry/verification loop means a map can
  occasionally come out as pure ocean (e.g. all grains happen to cluster
  tightly with a lot of empty space) or one giant landmass touching every
  edge - both are acceptable, expected outcomes of "no guarantee," not
  bugs.

## Migration Plan

1. Backend: delete `ShapeArchetype.cs`, `ShapeMask.cs`; rewrite
   `Map.cs`'s generation logic (keep `Cell`/`Map`/`GridType`/`SizePreset`
   records); update `MapsController`; rewrite `MapGeneratorTests.cs`
   (drop archetype/region tests, add grain-scatter-appropriate ones:
   determinism, dimensions, elevation bounds/coherence, land+ocean both
   present).
2. Frontend: delete `ShapeArchetypeStep.tsx`; update `wizard/types.ts`,
   `MapCreationWizard.tsx`, `ReviewStep.tsx`; remove icon code from
   `MapCanvas.tsx`; rewrite `App.tsx` for three post-generation actions +
   progress feedback; regenerate the OpenAPI client.
3. Verify: backend tests pass; manual browser walkthrough (wizard ->
   generate -> Regenerate -> Restart wizard -> Download) with screenshots;
   deploy; archive.

## Context

`Map.cs` already solves this exact problem for one edge type: `plateField.EdgeProximity` is queried at a coordinate displaced by `warpXNoise`/`warpYNoise` (`PlateWarpRegionScale = 256`, `PlateWarpOctaves = 3`, amplitude `PlateRegionScale * step * PlateWarpAmplitudeFraction`) before the plate-seam width check, specifically to turn a raw Worley cell's straight-line edge into an organic, winding one (`Map.cs:105-116`, `259-268`).

Coastline (Ocean/Beach and other elevation-band thresholds) and moisture-band thresholds get no equivalent treatment - they're compared directly against `elevationNoise.Sample(x, y, step)` / `moistureNoise.Sample(x, y, step)`, an unwarped multi-octave fBm value (`InfiniteValueNoise2D.Sample`, `Map.cs:217`, `250`, `255`). fBm does add higher-frequency detail, but with `NoisePersistence = 0.5` the base octave (half the sample's normalized weight) dominates the macro shape; where finer octaves don't happen to cross the band threshold, the visible boundary reduces to that base octave's bilinear+smoothstep interpolation - a smooth, low-curvature surface - producing the reported long, round, artifact-looking edges. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Give coastlines and moisture-band boundaries the same category of organic raggedness that plate seams already have, at `step = 1`.
- Keep determinism (same seed + coordinate → same biome) and location-independence (a window's cells don't depend on what else was requested) exactly as `map-generation` already specifies - this only changes how a boundary value is computed, not the generation model's contract.
- Keep the fix scoped to `Mundus.Core`'s sampling; no API/response shape change.

**Non-Goals:**
- Redesigning the biome/band model itself (band list, thresholds, coast-style logic) - only how ragged their boundaries read.
- Rivers, lakes-as-a-distinct-biome, POIs, region borders, trade routes - tracked separately under `add-map-overlays`.
- Retuning mountain/plate-seam warping - it already meets the bar this change is bringing coastlines/moisture up to.

## Decisions

**Decision: reuse the plate-warp technique (coordinate domain-warp before sampling) rather than only retuning octaves/persistence.**
Increasing `ElevationOctaves`/`MoistureOctaves` or lowering `NoisePersistence` would add high-frequency detail everywhere, including deep in the interior of a region - risking exactly the "cell-to-cell noise" the existing "Neighboring cells trend toward the same or adjacent biome" requirement forbids, and would require re-validating the coherence scenario at every step. A domain warp, by contrast, only bends the shape of the threshold *crossing* - the region's interior value is unaffected far from a boundary, so coherence is structurally preserved. This mirrors why plate seams already use a warp instead of just more mountain-elevation octaves.
- Alternative considered: raise `NoisePersistence` for elevation/moisture only. Rejected as the primary fix (speckle risk above) but may still be a secondary tuning knob if warping alone leaves boundaries too gentle - left as an open question below, not baked into the requirement.

**Decision: one shared warp-noise field per axis, at elevation's/moisture's own base region scale, not reusing `PlateWarpNoise`.**
`PlateWarpRegionScale = 256` was tuned relative to `PlateRegionScale = 768` (a few times finer, so one plate edge wobbles more than once along its length - `Map.cs:112-115`). Coastline/moisture fields have different base scales (`ElevationRegionScale = 512`, `MoistureRegionScale = 320`), so reusing the plate warp's absolute scale would wobble a coastline disproportionately relative to its own feature size. New warp fields, each a fraction of their own field's base region scale (same ratio logic `PlateWarpRegionScale`/`PlateRegionScale` already uses), keep the "wobbles more than once per edge length" property for each field independently.
- Alternative considered: one single warp field shared across elevation, moisture, and plate. Rejected - elevation and moisture already use independent noise seeds (`seed.Child(...)`-style separation implied by existing `ElevationNoise`/`MoistureNoise` factories) so their boundaries vary independently; sharing a warp field would correlate coastline and biome-border wobble in a visually detectable way.

**Decision: warp is applied to the coordinate fed into the *threshold comparison* only, not to the value used for the `InlandFloor` regional-elevation check.**
The `InlandFloor` check (`Map.cs:230-238`) deliberately compares the detailed sample against a *coarse, unwarped* regional sample to decide whether a dip is a stray artifact. Warping the regional sample too would let the warp itself shift what counts as "clearly inland," undermining that suppression. The regional sample stays on the unwarped coordinate; only the banded (Ocean/Beach/etc. and moisture-band) comparison coordinate is warped.

## Risks / Trade-offs

- [Warp amplitude too large distorts band proportions - e.g. visibly grows/shrinks Ocean area vs. what elevation alone implies] → Bound amplitude the same way plate warp does (a fraction of the field's own base region scale), and add a scenario asserting overall band-area proportions across a large seeded sample stay within a documented tolerance of the unwarped baseline.
- [Adding a warp sample per elevation/moisture lookup roughly doubles noise-sampling cost for cells near a band threshold] → Same shape as the existing `InlandFloor` check, which already accepts a second sample only for cells near the boundary; keep the warp sample similarly gated (or confirm via benchmark that unconditional warping stays within existing per-request cost bounds, since `MaxWindowDimension` bounds worst case).
- [A "not well-approximated by a smooth curve" test scenario is inherently statistical and could be flaky for an unlucky seed] → Pick the test seed deterministically (a fixed seed known in advance to produce a long boundary stretch, established during test-writing) rather than a random one, and document the threshold's derivation so it isn't a magic number.

## Open Questions

- Should `NoisePersistence` also be nudged up as a secondary tuning pass if warping alone doesn't read as ragged enough at typical viewing zoom, or is the warp sufficient on its own? Left to be settled empirically during implementation/tasks without needing another spec change, since it doesn't alter the requirement's externally observable bar (organic, non-smooth edges) either way.

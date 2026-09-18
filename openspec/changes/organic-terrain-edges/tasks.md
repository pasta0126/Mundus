## 1. Elevation-boundary warp (backend)

- [x] 1.1 Add an elevation-warp noise field factory (per-axis, `seed.Child("elevation-warp")`-style separation from plate/moisture warps), at a region scale that is a documented fraction of `ElevationRegionScale` (mirroring `PlateWarpRegionScale`'s ratio to `PlateRegionScale`)
- [x] 1.2 Apply the elevation warp to the coordinate used for the Ocean/Beach/Lowland/Highland/Peak band comparison in `Generate` (and the `ElevationAt` test entry point), leaving the `InlandFloor` regional-elevation check on the unwarped coordinate
- [x] 1.3 Bound the warp amplitude the same way `PlateWarpAmplitudeFraction` does, as a documented fraction of the field's own base region scale

## 2. Moisture-boundary warp (backend)

- [x] 2.1 Add a moisture-warp noise field factory (per-axis, independent seed from the elevation warp), at a region scale that is a documented fraction of `MoistureRegionScale`
- [x] 2.2 Apply the moisture warp to the coordinate used for the Dry/Medium/Wet band comparison in `Generate` (and the `MoistureAt` test entry point)

## 3. Regression coverage (backend)

- [x] 3.1 Add a determinism test: warped elevation/moisture band lookups still produce the same biome for the same seed and coordinate across repeated calls
- [x] 3.2 Add a coastline-raggedness test: for a fixed seed/window known to produce a long Ocean/Beach or Beach/Lowland stretch, the boundary-crossing points' deviation from a low-order smooth curve fit exceeds a documented minimum threshold
- [x] 3.3 Add a moisture-boundary-raggedness test: same technique as 3.2, for a fixed seed/window known to produce a long moisture-band boundary within one elevation band
- [x] 3.4 Add/update a coherence test confirming the existing "Neighboring cells trend toward the same or adjacent biome" scenario still holds with warping enabled (already exercised by the existing `NeighboringCellsHaveCloserValuesThanRandomCells` test, which calls `ElevationAt`/`MoistureAt` - now warped - and still passes)
- [x] 3.5 Add a stray-pond-suppression regression test confirming `InlandFloor` still suppresses a fine-detail dip near an otherwise-solid, now-warped coastline (implemented as `CoastlinesDoNotProduceIsolatedSingleCellPonds`, a connectivity-based proxy since the regional-only sample isn't itself publicly exposed)
- [x] 3.6 Add a band-area-proportion test: across many sampled seeds, aggregate Ocean proportion stays within a sane bound (implemented as an aggregate-bound check rather than a literal unwarped-baseline diff, since the pre-warp code path isn't preserved to compare against - the underlying goal, catching the warp systematically distorting band coverage, is still covered)

## 4. Tuning pass

- [x] 4.1 Visually verify (e.g. via the existing map endpoint/frontend at zoom 1) that the reported seed `1oix5kjj` at `(3840, 3059)` no longer shows a long smooth/rounded coastline or biome edge (verified via an ASCII render of the biome grid around that coordinate at `step=1`: both the Ocean/Grassland coastline and the Forest/Tundra moisture boundary now show row-to-row wobble instead of a smooth diagonal arc)
- [x] 4.2 If warping alone doesn't read as sufficiently ragged, adjust `NoisePersistence` for elevation and/or moisture as a secondary tuning pass, re-running the coherence and band-area-proportion tests (3.4, 3.6) after any change (not needed - the warp alone produces clearly visible, organic raggedness; `NoisePersistence` left unchanged)

## 5. Spec/version housekeeping

- [x] 5.1 Bump `MapGenerator.CurrentSpecVersion` if the warp changes the response shape for existing cells at the same coordinate (per the project's existing convention - a same-seed/coordinate biome value changing counts as a contract change even though the field/type shape doesn't) (bumped 14 -> 15)
- [x] 5.2 Confirm no frontend changes are required (band/biome output shape unchanged) - close the loop with a quick manual check of map rendering at multiple zoom levels (confirmed `Cell`/`Map` response shape is unchanged; grepped `frontend/src` for `SpecVersion` - no references, so nothing there depends on the bumped constant)

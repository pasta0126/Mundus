## Why

Coastlines, lake shores, and moisture-driven biome borders (e.g. Forest/Desert/Grassland edges) currently derive their raggedness purely from summed fBm octaves, with no independent domain-warp step - unlike mountain/plate-boundary seams, which already get an explicit warp pass specifically to avoid reading as geometric artifacts (`WorleyBoundaryField`/`PlateWarpNoise` in `backend/src/Mundus.Core/Map.cs`). With `NoisePersistence = 0.5`, elevation's base octave (region scale `512 * step`) carries roughly half the normalized sample weight, so in stretches where the finer octaves don't cross a band threshold, the visible boundary is effectively just that base octave's bilinear+smoothstep-interpolated surface - a long, smooth, rounded arc rather than a naturally ragged edge. Reported at seed `1oix5kjj`, coordinates `(3840, 3059)`, zoom 1 (`step=1`, so every octave is already included - this is not an LOD/octave-skipping artifact).

## What Changes

- Add a domain-warp pass (or equivalent fine-detail boost) to coastline (Ocean/Beach threshold), other elevation-band thresholds, and moisture-band thresholds, mirroring the technique `PlateWarpNoise`/`PlateWarpRegionScale` already use for plate seams, so threshold-crossing edges no longer inherit the coarse octave's smooth bilinear shape over long stretches.
- Alternatively/additionally, retune `ElevationOctaves`, `MoistureOctaves`, and/or `NoisePersistence` so finer octaves contribute enough amplitude, relative to the base octave, to visibly perturb a boundary even where the base octave's value is far from a threshold.
- Preserve the existing coherent-region behavior (`map-generation`'s "Neighboring cells trend toward the same or adjacent biome" requirement): large water bodies and biome regions must still read as large, coherent masses, not speckled noise, at every supported `step`.
- Preserve the `InlandFloor` stray-pond suppression (`Map.cs:230-238`) - the fix must not reintroduce tiny fine-detail dips as false ponds near an otherwise-solid coastline.
- Add a regression test asserting that long stretches of a threshold-crossing boundary (coastline and at least one moisture-band boundary) are not well-approximated by a smooth low-order curve (i.e. they carry measurable high-frequency deviation), at `step=1`.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `map-generation`: elevation-band and moisture-band boundaries (coastlines, lake/water edges, and biome-to-biome borders) must exhibit organic, non-smooth raggedness comparable to the existing plate-seam warp treatment, in addition to the already-specified region coherence.

## Impact

- `backend/src/Mundus.Core/Map.cs`: `Generate`, `ElevationAt`, `MoistureAt`, and the private noise-field factories (`ElevationNoise`, `MoistureNoise`, possibly new warp-noise factories) and band constants (`ElevationOctaves`, `MoistureOctaves`, `NoisePersistence`, `InlandFloor`).
- `backend/src/Mundus.Core/InfiniteValueNoise2D.cs`: no interface change expected, but sampling call sites change (added warp step and/or different octave/persistence constants).
- Backend tests covering `MapGenerator` determinism, coherence, and coastline sampling (existing suite under `backend/tests` - exact path to confirm during design/tasks).
- No frontend or API contract changes expected (band/biome output shape is unchanged) unless `MapGenerator.CurrentSpecVersion` needs a bump per the housekeeping convention already used for generation-behavior changes.

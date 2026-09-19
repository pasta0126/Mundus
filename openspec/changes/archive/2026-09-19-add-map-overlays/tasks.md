## 1. Compass rose (backend)

- [x] 1.1 Add a `seed.Child("north-bearing")`-derived bearing calculation in `Mundus.Core`, returning a single `[0, 360)` degree value per seed
- [x] 1.2 Add a `CompassController` (or equivalent) endpoint returning the bearing for a given seed
- [x] 1.3 Add backend tests: same seed always yields the same bearing; different seeds are not guaranteed to match; bearing is independent of any window/coordinate parameter

## 2. Compass rose (frontend)

- [x] 2.1 Add a compass-rose overlay component, fixed screen position, rotated per the fetched bearing
- [x] 2.2 Wire the compass-rose layer into the layer-visibility system (see Section 6)

## 3. Rivers (backend) - OUT OF SCOPE

Implemented and then removed (2026-09-18) at the user's request: a working
version shipped as "Rivers (Experimental)" - source lattice scatter,
lake-basin scatter, downhill trace with meander, tributary confluence,
windowed endpoint, tests - and was then pulled entirely. See git history
around that date if picking this back up; the trace/meander/confluence
approach and the bugs found along the way (a trace-oscillation fix, and
an elevation-based rather than length-based confluence-merge direction)
are worth reading before re-implementing from scratch.

## 4. Points of interest (backend)

- [x] 4.1 Define the icon catalog (`PointOfInterestCatalog`): 86 icons with category, class, rarity weight, biomes, terrain-geometry rule; settlement sizes and what each contains
- [x] 4.2 Implement the per-category deterministic lattice-hash scatter (`"{seed}:poi-{category}:{bx}:{by}"`) at documented densities, and settlement clusters (anchor + services) generated whole inside their block
- [x] 4.3 Implement biome and geometry placement (coast, cape, islet, lake, near-coast, open-sea, waterside) with cached biome ray probes
- [x] 4.4 Add a `PointsOfInterestController` endpoint mirroring `MapsController`'s contract with a `category` filter, plus `GET /api/PointsOfInterest/catalog`
- [x] 4.5 Add backend tests: determinism; overlapping-window agreement; catalog/artwork agreement; biome and geometry rules; cluster radius; rarity and settlement-size ordering

## 5. Region borders (backend)

- [x] 5.1 Implement a second `WorleyBoundaryField`-style partition seeded via `$"{seed}:regions"`, independent scale/warp from the existing plate field (`RegionGenerator` in `Regions.cs`) - matches the string-suffix convention every other spatial field in `Map.cs` actually uses, not the `Rng.Child` placeholder design.md sketched (that stays reserved for one-off, non-spatial draws like the compass bearing)
- [x] 5.2 Expose region ID lookup (`RegionGenerator.RegionIdAt`) and boundary edge-proximity per cell/window (`WorleyBoundaryField.EdgeProximity`)
- [x] 5.3 Add a `RegionsController` (or equivalent) endpoint mirroring `MapsController`'s contract, returning boundary segments for a window - returns only the boundary points to render (on the threshold, excluding `Ocean`), not a full per-cell grid
- [x] 5.4 Add backend tests: determinism across repeated calls; overlapping-window agreement; no boundary point falls on ocean across many seeds

## 6. Layer system (frontend)

- [x] 6.1 Add a layers panel component listing every overlay layer (compass rose, each POI category, region borders) with a toggle and documented default visibility - registry (`map/layers.ts`) currently has the compass rose and region borders (grouped under a "stable" vs. "Experimental" heading); POI categories get appended once their backend lands
- [x] 6.2 Add per-layer visibility state that persists across pan/zoom/coordinate-jump but resets on full reload
- [x] 6.3 Add one overlay `<canvas>` per layer, stacked above the biome `MapCanvas` and below UI panels, shown/hidden per the layer state - done for region borders (`RegionBordersLayer.tsx`); compass stays a fixed-position `<img>`, not a world-space canvas
- [x] 6.4 Fetch and render POIs (per visible category only) into their respective canvases, following the existing chunked/tiled fetch pattern from `tiling.ts` - region borders already does this
- [x] 6.5 Render region borders as a thin solid stroke and POI/compass as icons (placeholder icons until real artwork is supplied) - compass icon already in place

## 7. Icon names and legend (frontend)

- [x] 7.1 Show each icon's name and description in a tooltip on hover (fed by the backend catalog); the legend lists biomes only
- [x] 7.2 (superseded) A live icon legend is no longer needed: hidden categories have no icons to hover

## 8. Download compositing (frontend)

- [x] 8.1 Rewrite `downloadMap()` to draw the biome canvas plus every currently visible overlay canvas onto one offscreen canvas, in a fixed stacking order, before `toBlob` - compass composited via its on-screen rect/rotation; region borders (and future canvas-based layers) via a plain `drawImage` per canvas
- [x] 8.2 Verify a hidden layer never appears in the downloaded PNG and a visible layer always does - verified manually for the compass and region-borders layers

## 9. Spec/version housekeeping

- [x] 9.1 Bump `MapGenerator.CurrentSpecVersion` if any new response shape changes existing contracts (bumped to 16 for the pond/swamp/lake changes)
- [x] 9.2 Update `openspec/specs/map-creation-wizard/spec.md` and add the new capability specs to `openspec/specs/` once this change is archived

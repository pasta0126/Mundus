## 1. Compass rose (backend)

- [x] 1.1 Add a `seed.Child("north-bearing")`-derived bearing calculation in `Mundus.Core`, returning a single `[0, 360)` degree value per seed
- [x] 1.2 Add a `CompassController` (or equivalent) endpoint returning the bearing for a given seed
- [x] 1.3 Add backend tests: same seed always yields the same bearing; different seeds are not guaranteed to match; bearing is independent of any window/coordinate parameter

## 2. Compass rose (frontend)

- [x] 2.1 Add a compass-rose overlay component, fixed screen position, rotated per the fetched bearing
- [ ] 2.2 Wire the compass-rose layer into the layer-visibility system (see Section 6) - deferred until the layer system (Section 7) exists; compass currently always renders

## 3. Rivers (backend)

- [ ] 3.1 Implement the deterministic river-source lattice scatter (`seed.Child("river-sources")`), filtered to `Peak`-band cells
- [ ] 3.2 Implement the deterministic lake-basin lattice scatter (`seed.Child("lakes")`) as a terminal water body distinct from `Ocean`
- [ ] 3.3 Implement downhill path tracing from a source using `ElevationAt`, with domain-warped meander, terminating at `Ocean`, a lake, or the documented max length (discard otherwise)
- [ ] 3.4 Implement tributary confluence detection/merging between traced paths
- [ ] 3.5 Implement the windowed query: trace every candidate source within max-river-length of the requested window, return only in-window path segments
- [ ] 3.6 Add a `RiversController` (or equivalent) endpoint mirroring `MapsController`'s seed/window/step contract
- [ ] 3.7 Add backend tests: determinism across repeated calls; overlapping-window agreement; source-band invariant; downhill-elevation invariant; sinuosity (not a straight line); confluence merges into one downstream path; unreachable sources are discarded

## 4. Points of interest (backend)

- [ ] 4.1 Define the fixed category/icon-type enum from design.md's inventory table
- [ ] 4.2 Implement the per-category deterministic lattice-hash scatter (`seed.Child("poi-<category>")`) at a documented density
- [ ] 4.3 Implement per-icon-type biome placement filters (mountain icons on `Mountains`/`Snow`, seaport adjacent to `Ocean`, sea icons on `Ocean`, forest icon on `Forest`/`Rainforest`, etc.)
- [ ] 4.4 Add a `PointsOfInterestController` (or equivalent) endpoint mirroring `MapsController`'s contract, with a `category` filter
- [ ] 4.5 Add backend tests: determinism across repeated calls; overlapping-window agreement; every generated point's icon type is in the documented set; biome-suitability filters hold per icon type

## 5. Region borders (backend)

- [ ] 5.1 Implement a second `WorleyBoundaryField`-style partition seeded via `seed.Child("regions")`, independent scale/warp from the existing plate field
- [ ] 5.2 Expose region ID lookup and boundary edge-proximity per cell/window
- [ ] 5.3 Add a `RegionsController` (or equivalent) endpoint mirroring `MapsController`'s contract, returning boundary segments for a window
- [ ] 5.4 Add backend tests: determinism across repeated calls; overlapping-window agreement

## 6. Trade routes (backend)

- [ ] 6.1 Implement nearest-neighbor route linking between settlement/seaport POIs (documented `k`, bounded radius)
- [ ] 6.2 Add a `RoutesController` (or equivalent) endpoint mirroring `MapsController`'s contract
- [ ] 6.3 Add backend tests: determinism across repeated calls; overlapping-window agreement; every route's endpoints are settlement/seaport POIs

## 7. Layer system (frontend)

- [ ] 7.1 Add a layers panel component listing every overlay layer (compass rose, rivers, each POI category, region borders, trade routes) with a toggle and documented default visibility
- [ ] 7.2 Add per-layer visibility state that persists across pan/zoom/coordinate-jump but resets on full reload
- [ ] 7.3 Add one overlay `<canvas>` per layer, stacked above the biome `MapCanvas` and below UI panels, shown/hidden per the layer state
- [ ] 7.4 Fetch and render rivers, POIs (per visible category only), region borders, and trade routes into their respective canvases, following the existing chunked/tiled fetch pattern from `tiling.ts`
- [ ] 7.5 Render rivers as solid strokes, region borders as dashed strokes, trade routes as dotted strokes, and POI/compass as icons (placeholder icons until real artwork is supplied)

## 8. Icon legend (frontend)

- [ ] 8.1 Add a legend component listing the icon types belonging to currently visible POI categories (plus the compass rose when visible), each with a short description
- [ ] 8.2 Update the legend live as layers are toggled

## 9. Download compositing (frontend)

- [ ] 9.1 Rewrite `downloadMap()` to draw the biome canvas plus every currently visible overlay canvas onto one offscreen canvas, in a fixed stacking order, before `toBlob`
- [ ] 9.2 Verify a hidden layer never appears in the downloaded PNG and a visible layer always does

## 10. Spec/version housekeeping

- [ ] 10.1 Bump `MapGenerator.CurrentSpecVersion` if any new response shape changes existing contracts (new endpoints alone do not require this)
- [ ] 10.2 Update `openspec/specs/map-creation-wizard/spec.md` and add the new capability specs to `openspec/specs/` once this change is archived

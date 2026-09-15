## 1. Noise engine

- [ ] 1.1 Implement a deterministic value-noise function in `Mundus.Core` (lattice of random values from a named child `Rng` stream + bilinear/smoothstep interpolation), verify with a unit test that the same seed produces identical noise field values on repeated calls
- [ ] 1.2 Verify with a unit test that the noise field is spatially smooth: average absolute difference between adjacent lattice-interpolated points is smaller than between random point pairs

## 2. Grid and map model

- [ ] 2.1 Add `GridType` (`Square`, `Hex`), `ShapeArchetype` (`Continent`, `Island`, `Archipelago`, `Peninsula`, `IsthmusLandBridge`, `InlandSea`, `Unconstrained`), `SizePreset` (`Small` 32x32, `Medium` 64x64, `Large` 128x128, `Huge` 256x256), `Cell` record (`X`, `Y`, `Biome`, `Elevation`), and `Map` record (`SpecVersion`, `Seed`, `GridType`, `SizePreset`, `Width`, `Height`, cell list) to `Mundus.Core`
- [ ] 2.2 Implement hex neighbor lookup (offset-coordinate, even-r or odd-r) and square neighbor lookup as internal helpers, verify with a unit test that an interior hex cell has exactly 6 neighbors and an interior square cell has exactly 4

## 3. Shape archetype masks

- [ ] 3.1 Implement the `Continent` mask (single broad landmass bump added to the elevation noise field), verify with a unit test that non-Ocean cells form exactly one connected region (flood-fill) across several seeds
- [ ] 3.2 Implement the `Island` mask (steeper falloff, edge ring forced below the ocean threshold), verify with a unit test that every outer-edge cell is `Ocean` and non-Ocean cells form exactly one connected region, across several seeds
- [ ] 3.3 Implement the `Archipelago` mask (K spaced landmass bumps, K derived from size preset), verify with a unit test that non-Ocean cells form 2+ disjoint connected regions with no two adjacent, across several seeds
- [ ] 3.4 Implement `Peninsula` (single edge-anchored bump, three other edges forced below the ocean threshold), verify with a unit test that non-Ocean cells form exactly one connected region touching exactly one side's edge cells, across several seeds
- [ ] 3.5 Implement `IsthmusLandBridge` (two opposite-edge bumps plus a connecting raised band), verify with a unit test that non-Ocean cells form exactly one connected region touching both edges of one opposite pair, across several seeds
- [ ] 3.6 Implement `InlandSea` (full-coverage landmass with one interior depression carved below the ocean threshold, kept a minimum distance from all edges), verify with a unit test that at least one Ocean region exists with no edge cell and no path to any edge cell, across several seeds
- [ ] 3.7 Implement `Unconstrained` (no mask, raw noise field) as the baseline case
- [ ] 3.8 Add a retry-with-derived-seed fallback for the rare case a mask's guarantee doesn't hold after generation, verify it never surfaces a map violating the archetype's property to the caller

## 4. Biome regions

- [ ] 4.1 Implement Voronoi region assignment (N seed points from a named child `Rng` stream, N within the size preset's documented range, nearest-seed-point cell assignment using the grid-appropriate distance metric), verify with a unit test that every region is contiguous (reachable via same-region neighbors) and the region count falls within the preset's documented range
- [ ] 4.2 Implement per-region biome assignment from (elevation, moisture) sampled at each region's seed point, using the elevation/moisture lookup table from design.md, verify with a unit test that every cell in a region shares that region's biome

## 5. Map generation entry point

- [ ] 5.1 Implement `MapGenerator.Generate(seed, gridType, sizePreset, shapeArchetype)` composing noise + mask + regions + biome assignment, verify determinism (same inputs -> identical map) and divergence (different seed -> different map) with unit tests
- [ ] 5.2 Verify with a unit test the elevation coherence property from the spec: average neighbor elevation delta < average random-pair elevation delta

## 6. HTTP endpoint

- [ ] 6.1 Add a controller endpoint exposing map generation (seed, grid type, size preset, shape archetype as parameters), returning the `Map` JSON shape with biome and enums as strings, verify manually against a running local API
- [ ] 6.2 Verify invalid-parameter requests (unrecognized grid type / size preset / shape archetype) return a `4xx` response
- [ ] 6.3 Regenerate the frontend's API client (`npm run generate:api-types` in `frontend/`) against the updated OpenAPI document and verify it compiles

## 7. Close out

- [ ] 7.1 Run `dotnet test` in `backend/` and verify all tests (existing + new) pass
- [ ] 7.2 Run `openspec validate add-map-generation --strict` and verify it passes
- [ ] 7.3 Deploy to void-server (`git push`, `git pull` + `docker compose build && up -d` there) and verify the new endpoint works against `https://mundus.northernarchive.com`
- [ ] 7.4 Archive the change with `openspec archive add-map-generation`

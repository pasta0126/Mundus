## 1. Noise engine

- [ ] 1.1 Implement a deterministic value-noise function in `Mundus.Core` (lattice of random values from a named child `Rng` stream + bilinear/smoothstep interpolation), verify with a unit test that the same seed produces identical noise field values on repeated calls
- [ ] 1.2 Verify with a unit test that the noise field is spatially smooth: average absolute difference between adjacent lattice-interpolated points is smaller than between random point pairs

## 2. Grid and map model

- [ ] 2.1 Add `GridType` enum (`Square`, `Hex`), `Cell` record (`X`, `Y`, `Biome`, `Elevation`), and `Map` record (`SpecVersion`, `Seed`, `GridType`, `Width`, `Height`, cell list) to `Mundus.Core`
- [ ] 2.2 Implement hex neighbor lookup (offset-coordinate, even-r or odd-r) as an internal helper, verify with a unit test that an interior hex cell has exactly 6 neighbors and an interior square cell has exactly 4 (or 8, per the chosen adjacency - decide and document in the test)

## 3. Map generation

- [ ] 3.1 Implement `MapGenerator.Generate(seed, gridType, width, height)` combining independent elevation and moisture noise channels (via named child `Rng` streams) into per-cell elevation and biome per the design's lookup table, verify determinism (same inputs -> identical map) and divergence (different seed -> different map) with unit tests
- [ ] 3.2 Verify with a unit test the coherence property from the spec: average neighbor elevation delta < average random-pair elevation delta, and same for biome-match rate
- [ ] 3.3 Add input validation rejecting non-positive or >512 width/height without generating a partial map, verify with unit tests

## 4. HTTP endpoint

- [ ] 4.1 Add a controller endpoint exposing map generation (seed, grid type, width, height as parameters), returning the `Map` JSON shape with biome as a string, verify manually against a running local API
- [ ] 4.2 Verify invalid-dimension requests return a `4xx` response, verify manually or with an integration test
- [ ] 4.3 Regenerate the frontend's API client (`npm run generate:api-types` in `frontend/`) against the updated OpenAPI document and verify it compiles

## 5. Close out

- [ ] 5.1 Run `dotnet test` in `backend/` and verify all tests (existing + new) pass
- [ ] 5.2 Run `openspec validate add-map-generation --strict` and verify it passes
- [ ] 5.3 Deploy to void-server (`git push`, `git pull` + `docker compose build && up -d` there) and verify the new endpoint works against `https://mundus.northernarchive.com`
- [ ] 5.4 Archive the change with `openspec archive add-map-generation`

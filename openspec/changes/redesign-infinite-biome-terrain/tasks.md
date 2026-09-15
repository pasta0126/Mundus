## 1. Backend core: infinite lattice noise

- [x] 1.1 Replace `ValueNoise2D.cs` with a lazy, unbounded lattice-noise
      sampler: a lattice point's value comes from
      `new Rng($"{seed}:lattice:{lx}:{ly}").Float()` (O(1), no
      precomputed array), smoothstep-interpolated between the 4
      surrounding lattice points for a given `(x, y)`, using floor
      division (not truncation) to find those points for negative
      coordinates.
- [x] 1.2 Add a unit test that samples the same `(seed, x, y)` twice and
      asserts identical values, including at least one negative `x`/`y`.
- [x] 1.3 Add a unit test asserting floor-division correctness around a
      lattice boundary (e.g. region scale 32: sample `x = -1` and
      `x = 0` and confirm they fall in the expected, different lattice
      cells rather than both truncating toward the `0` cell).

## 2. Backend core: biome model

- [x] 2.1 Replace the `Biome` enum (`World.cs`'s version) with the new
      six-value ordered set: `Ocean`, `Beach`, `Grassland`, `Forest`,
      `Tundra`, `Snow`.
- [x] 2.2 Implement the threshold table from `design.md` mapping a
      terrain value in `[0, 1)` to one of the six biomes.
- [x] 2.3 Rewrite `Map.cs`: `Cell` drops `Elevation`, keeps `X`, `Y`,
      `Biome`. `Map` drops `GridType`/`SizePreset`, adds `OriginX`,
      `OriginY`, keeps `Width`/`Height` (now window dimensions, not a
      preset lookup) and `Cells`. Bump `CurrentSpecVersion`.
- [x] 2.4 Rewrite `MapGenerator.Generate(seed, originX, originY, width,
      height)`: for each `(x, y)` in the window, sample the lattice
      noise at that absolute coordinate and assign the biome via the
      threshold table - no per-request grain scattering, no full-grid
      precomputation step.
- [x] 2.5 Delete `SizePreset.cs` and `GridType.cs` (no longer part of
      the model).

## 3. Backend core: remove dead `world-generation` capability

- [x] 3.1 Delete `World.cs` and its `WorldGenerator`.
- [x] 3.2 Delete `backend/src/Mundus.Api/Controllers/WorldsController.cs`.
- [x] 3.3 Delete `backend/tests/Mundus.Core.Tests/WorldGeneratorTests.cs`.

## 4. Backend API

- [x] 4.1 Rewrite `MapsController.Get` to accept `seed`, `x`, `y`,
      `width`, `height` query parameters; validate `width`/`height` are
      each within `1..256` (400 Bad Request otherwise, generating
      nothing); `x`/`y` accept any integer, including negative.
- [x] 4.2 Confirm the OpenAPI document (`/api/openapi/{documentName}.json`)
      reflects the new query shape and response shape (enum-as-string
      JSON conversion already configured in `Program.cs` still applies).

## 5. Backend tests

- [x] 5.1 Rewrite `MapGeneratorTests.cs` for the new contract:
      same-seed-same-window determinism; different seeds differ;
      requesting the same cell via two different windows (including one
      far from `(0, 0)` and one containing it) yields identical biomes;
      two overlapping windows agree on their overlap; every returned
      biome is one of the six documented values; neighbor terrain-value
      smoothness (average neighbor diff smaller than average
      random-pair diff, reusing the statistical approach the old
      elevation test used); negative-origin windows return correct
      absolute coordinates.
- [x] 5.2 Run `dotnet test` and confirm all tests pass.

## 6. Frontend: API types and data layer

- [x] 6.1 With the new backend running locally, run
      `npm run generate:api-types` to regenerate
      `frontend/src/api/schema.d.ts` from the new OpenAPI document.
- [x] 6.2 Update any TypeScript referencing the old `Map`/`Cell` shape
      (`gridType`, `sizePreset`, `elevation`) to the new one
      (`originX`, `originY`, no `elevation`).

## 7. Frontend: rendering

- [x] 7.1 Delete `frontend/src/map/contour.ts` (no contour tracing
      concept left - see `design.md`).
- [x] 7.2 Add a biome-color table (pastel, soft colors) for the six
      biomes, replacing the deleted two-biome `biomeColors.ts`.
- [x] 7.3 Rewrite `MapCanvas.tsx` to a direct per-cell `fillRect` loop:
      canvas sized to the full viewport (updates on window resize),
      fixed `24px`-per-cell, no contour path, no shading/texture/frame.

- [x] 7.4 Position the wizard, params panel, and pan controls as an
      overlay on top of the full-viewport canvas (fixed/absolute
      positioning), not in a layout flow that shrinks or displaces it.

## 8. Frontend: remove the wizard, generate automatically on load

- [x] 8.1 (superseded) `wizard/types.ts` deleted entirely - see 8.x below.
- [x] 8.2 (superseded) `SizePresetStep`/`StartPositionStep` deleted
      entirely along with the rest of `src/wizard/` - no step UI remains.
- [x] 8.3 (superseded) `MapCreationWizard.tsx`/`ReviewStep.tsx` deleted -
      there are no steps to order or review.
- [x] 8.4 Delete `src/wizard/` entirely (`MapCreationWizard.tsx`,
      `ChoiceGrid.tsx`, `types.ts`, `steps/`). Add a mount `useEffect` in
      `App.tsx` that calls the fetch with a fresh random seed at
      `(0, 0)`, at the default zoom level, with no user input collected
      first.
- [x] 8.5 Drop the "Restart wizard" action; the error screen's "Back to
      wizard" button becomes "Retry" (re-runs the same auto-generate
      fetch).

## 9. Frontend: panning

- [x] 9.1 Add four-directional pan controls to the result view (e.g. an
      on-screen d-pad) that shift the current window's origin by half
      the window size (16 cells) in the chosen direction and re-fetch,
      keeping the same seed.
- [x] 9.2 Reuse the existing "generating"/loading status UI for a pan
      request so panning shows the same progress feedback as initial
      generation (per `map-creation-wizard`'s "Progress and status
      feedback" requirement).

## 9a. Frontend: zoom

- [x] 9a.1 Add `ZOOM_LEVELS_PX = [24, 20, 16, 12, 8]` to `map/constants.ts`;
      make `MapCanvas`'s cell size a prop instead of the old fixed
      `CELL_PX` import.
- [x] 9a.2 Add zoom in/out controls to the result view; zooming
      recomputes the window size for the new cell size, re-centers on
      the current view's center point, and re-fetches with the same
      seed. Disable zoom-in at the default level and zoom-out at the
      smallest level.

## 9b. Backend: fractal noise for a more organic look

- [x] 9b.1 Extend `InfiniteValueNoise2D` to sum `octaves` layers
      (default 1, unused unless requested) at halving region scale and
      amplitude per octave (`persistence`), each octave's lattice hash
      salted with its own index so octaves don't correlate; normalize by
      the summed amplitudes.
- [x] 9b.2 Wire `MapGenerator` to sample with 4 octaves, 0.5 persistence,
      instead of a single octave; bump `CurrentSpecVersion`.
- [x] 9b.3 Spot-check via the API across several seeds: biome
      proportions vary seed-to-seed (not just Grassland/Forest every
      time) and a rendered ASCII sample shows ragged coastlines/small
      lakes rather than uniform blobs.

## 9c. Backend: continent-scale elevation + moisture-driven biomes

- [x] 9c.1 Bump elevation's `InfiniteValueNoise2D` to `regionScale: 128,
      octaves: 5` (up from `32, 4`) so water bodies read as
      oceans/continents rather than lakes.
- [x] 9c.2 Add an independent moisture field:
      `InfiniteValueNoise2D($"{seed}:moisture", regionScale: 96,
      octaves: 4, persistence: 0.5)`.
- [x] 9c.3 Replace the `Biome` enum with the ten-value set (`Ocean`,
      `Beach`, `Desert`, `Grassland`, `Swamp`, `Tundra`, `Forest`,
      `Rainforest`, `Mountains`, `Snow`) and implement the
      elevation-band / moisture-band / lookup-table biome assignment
      from design.md.
- [x] 9c.4 Bump `Map.CurrentSpecVersion`.
- [x] 9c.5 Update `MapGeneratorTests.cs`: the documented-biome-set test
      covers all ten values; the neighbor-smoothness test covers both
      elevation and moisture; add a test that a sufficiently large
      window can contain an `Ocean` region spanning a large fraction of
      it (continent-scale, not lake-scale).
- [x] 9c.6 Update `frontend/src/map/biomeColors.ts` with pastel colors
      for all ten biomes.
- [x] 9c.7 Spot-check via the API/ASCII render: oceans span a large
      fraction of a big window (not lake-sized), and multiple new
      biomes (Desert, Swamp, Rainforest, Mountains) actually appear
      across a sample of seeds.

## 9d. Zoom down to 1px + perf to support it

- [x] 9d.1 Cache lattice values per `InfiniteValueNoise2D` instance
      (`(octave, latticeX, latticeY) -> value`), scoped to one field's
      one generation call, so a window's cells stop re-deriving the same
      shared lattice points from scratch.
- [x] 9d.2 Bump `MapGenerator.MaxWindowDimension` to `512`, the largest
      size that stays fast after 9d.1 (~300ms measured; `1024` and
      `2048` measured too slow) and update `MapsController`'s error
      messages/validation to match.
- [x] 9d.3 Extend `ZOOM_LEVELS_PX` to
      `[24, 20, 16, 12, 8, 6, 4, 3, 2, 1]` and bump the frontend's
      `MAX_WINDOW_DIMENSION` constant to `512` to match.
- [x] 9d.4 `MapCanvas` centers the drawn window within the canvas
      instead of anchoring at `(0, 0)`, so a capped window at extreme
      zoom-out (covers less than the viewport) reads as centered, not
      stretched or stuck in a corner.
- [x] 9d.5 Confirm via `dotnet test` that existing tests (determinism,
      overlap, water-body size) still pass with the new cache and cap,
      and spot-check a `512x512` request's latency stays in the
      "loading" UI's comfortable range.

## 9e. Tiled, progressive window loading (fixes low-zoom "small square" bug)

- [x] 9e.1 Add `CHUNK_SIZE = 256` and `MAX_TOTAL_DIMENSION = 4096` to
      `map/constants.ts`; retire the frontend's `MAX_WINDOW_DIMENSION`
      clamp on the logical window (still relevant only as the backend's
      own per-request cap, referenced implicitly via `CHUNK_SIZE`
      staying under it).
- [x] 9e.2 Add a chunk-grid helper (origin/width/height/chunkSize ->
      list of sub-window specs, partial last row/column handled) and a
      small concurrency-limited task runner (worker-pool `Promise`
      pattern, `CONCURRENCY = 6`).
- [x] 9e.3 Rework `App.tsx`'s fetch into `fetchTiled`: compute the
      logical window (uncapped by the old 512 limit, capped only by
      `MAX_TOTAL_DIMENSION`), split into chunks, fetch concurrently,
      and on the *first* successful chunk swap over to the new
      generation (reset chunks, set new `viewWindow`); subsequent
      chunks append. Track progress as `{ loaded, total }`. On total
      failure, show the error screen only if no view has ever loaded
      (`hasViewRef`); otherwise just stop loading and keep the old view.
- [x] 9e.4 Rework `MapCanvas` to take `chunks: MapDto[]` plus the
      overall window shape and a `generation` number instead of one
      `Map`: a `generation` change clears the canvas and resets a
      `drawnCount` ref; chunk-array growth draws only the chunks from
      `drawnCount` onward (each chunk's cells drawn exactly once across
      a whole progressive load).
- [x] 9e.5 Update `MapParamsPanel` to take `{ seed, originX, originY }`
      directly instead of a full `MapDto`.
- [x] 9e.6 Wire the progress bar's `value` to `loaded / total * 100`
      instead of a fixed placeholder.
- [x] 9e.7 Spot-check in a browser: zoom out to the lowest step and
      confirm the map covers the full viewport (not a small centered
      square), fills in progressively rather than appearing all at
      once, and that panning/zooming while a load is in flight doesn't
      blank the page or crash.

## 10. Frontend: params panel

- [x] 10.1 Update `MapParamsPanel.tsx` to show the seed and the current
      window's origin (`x`, `y`) instead of seed and size preset, with
      copy support for reproducing the exact view.

## 10a. Frontend: default to fully zoomed out, go-to-coordinates, richer downloads, icons everywhere

- [x] 10a.1 Flip the default zoom step to the last `ZOOM_LEVELS_PX`
      entry (`1px`, most zoomed-out) instead of index `0`: initial load
      and Regenerate both start there; zoom-out is disabled and zoom-in
      enabled at that step (bounds simply swap direction).
- [x] 10a.2 Add a "go to coordinates" form to `MapParamsPanel` (X/Y
      number inputs + submit button) that re-centers the current zoom
      step's window on the entered point via the same `fetchTiled` path
      used by zoom, without touching the seed or `cellPx`.
- [x] 10a.3 Build the downloaded PNG's filename from the current view's
      seed, origin, `cellPx`, and window size, plus a timestamp, instead
      of a fixed `mundus-map.png`.
- [x] 10a.4 Add an icon to every actionable control that didn't already
      have one (Regenerate, Download, Copy seed, Retry, go-to submit),
      and lay out Regenerate/Download as equal-width buttons.
- [x] 10a.5 Verify in a browser: the page loads at the most-zoomed-out
      step covering the full viewport, entering a coordinate jumps and
      recenters correctly, and `npm run build`/`npm run lint` stay clean.

## 11. Verification

- [x] 11.1 Run `dotnet build`, `dotnet test`, `npm run build`,
      `npm run lint` and confirm all pass.
- [x] 11.2 Manually verify in a browser: loading the page generates a
      map with no user input, panning in each of the four directions,
      zooming out through all four extra steps and back in, Download and
      Regenerate still work.
- [x] 11.3 Manually verify determinism end to end: via the API, note a
      cell's biome at a specific `(x, y)` for a fixed seed, request a
      different window for the same seed that includes that `(x, y)`,
      and confirm the biome matches (already spot-checked once via curl
      - see conversation history; redo after this session's changes).

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

## 8. Frontend: wizard

- [x] 8.1 Update `wizard/types.ts`: drop `sizePreset`/`gridType` from
      `WizardState`, add a start position (`x`, `y`, both optional,
      defaulting to `0`).
- [x] 8.2 Replace the `SizePresetStep` with a `StartPositionStep` (two
      numeric inputs, X and Y, both optional).
- [x] 8.3 Update `MapCreationWizard.tsx`'s step order to Seed, Start
      Position, Review, and `ReviewStep.tsx` to display the chosen (or
      defaulted) start position instead of size.
- [x] 8.4 Update `App.tsx`'s `generate` call to request the default
      `32x32` window centered on the chosen start position (or
      `(0, 0)`), and to build the request query from `seed`, `x`, `y`,
      `width`, `height`.

## 9. Frontend: panning

- [x] 9.1 Add four-directional pan controls to the result view (e.g. an
      on-screen d-pad) that shift the current window's origin by half
      the window size (16 cells) in the chosen direction and re-fetch,
      keeping the same seed.
- [x] 9.2 Reuse the existing "generating"/loading status UI for a pan
      request so panning shows the same progress feedback as initial
      generation (per `map-creation-wizard`'s "Progress and status
      feedback" requirement).

## 10. Frontend: params panel

- [x] 10.1 Update `MapParamsPanel.tsx` to show the seed and the current
      window's origin (`x`, `y`) instead of seed and size preset, with
      copy support for reproducing the exact view.

## 11. Verification

- [x] 11.1 Run `dotnet build`, `dotnet test`, `npm run build`,
      `npm run lint` and confirm all pass.
- [ ] 11.2 Manually verify in a browser: generating a map, panning in
      each of the four directions, requesting the same seed with a
      start position far from `(0, 0)` and confirming it renders
      immediately (no dependency on visiting the origin first),
      Download and Regenerate still work.
- [ ] 11.3 Manually verify determinism end to end: generate with a
      fixed seed, note a cell's biome at a specific `(x, y)`, restart
      the wizard, regenerate with the same seed and a start position
      that includes that `(x, y)` in its window, and confirm the biome
      matches.

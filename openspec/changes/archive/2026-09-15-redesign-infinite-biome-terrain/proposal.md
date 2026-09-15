## Why

The current generator produces one fixed-size land/ocean silhouette per
request (`Small`/`Medium`/`Large`/`Huge`, capped at 256x256 cells) with
only two biomes (`Grassland` land, `Ocean` water). That caps how large or
detailed a world can ever be, and rules out the thing a "world" implies:
panning or scrolling into unexplored territory. We want an unbounded,
explorable world with real biome variety (sea, beach, forest, snow, ...)
that blends between regions instead of a hard coastline, while keeping
the property that has been true since the very first version: the same
seed always reproduces the same content, byte-for-byte, forever.

## What Changes

- **BREAKING**: Replace the bounded `Width x Height` grid and its four
  `SizePreset` values with an unbounded integer coordinate space. The API
  now takes a seed plus a requested rectangular *window* of `(x, y)`
  cells (an origin plus a width/height for that window, not a size
  preset) and returns just that window's cells.
- **BREAKING**: Replace per-request grain-scatter generation (`Ocean`
  elevation field via scattered circles) with a per-cell deterministic
  function: a cell's biome is computed from `(seed, x, y)` alone via a
  continuous, seed-derived noise field sampled at that coordinate - no
  step depends on anything generated "from an origin outward," so a
  window requested far from `(0, 0)` is identical whether or not any
  nearer window was ever requested first.
- **BREAKING**: Replace the two-biome set (`Grassland`, `Ocean`) with a
  ten-biome set (`Ocean`, `Beach`, `Desert`, `Grassland`, `Swamp`,
  `Tundra`, `Forest`, `Rainforest`, `Mountains`, `Snow`) assigned from
  two independent noise fields - elevation and moisture - combined
  through a fixed table, so terrain has real climate-like variety
  (a dry Lowland reads as Desert, a wet one as Swamp, an in-between one
  as Grassland) instead of a single value driving everything.
  `GridType` (`Square` vs. `Hex`) is dropped - only a square grid is
  supported going forward, matching the current renderer, which already
  ignores grid type. `Elevation` is dropped from the cell shape as an
  API field - it's still computed internally (now alongside moisture),
  but isn't itself exposed to callers.
- The elevation field's base noise scale grows so large water bodies
  read as oceans separating continents/islands rather than lake-sized
  ponds - see design.md.
- **BREAKING**: the wizard is removed entirely. There is exactly one
  screen: on load, the app generates a window at `(0, 0)` with a fresh
  random seed automatically - no seed, position, or size is ever
  collected from the user. Post-generation actions shrink to
  Regenerate and Download (no "Restart wizard", since there's no wizard
  to restart).
- Rendering keeps today's minimalist style: each cell is a flat, soft
  pastel fill by biome, no shading/texture/decorative border. Pixel-art
  tile images per biome are explicitly out of scope for this change -
  flat pastel fill is the target rendering, not an interim step.
- Remove the dead `world-generation` capability and its backing code
  (`World.cs`, `WorldGenerator`, `WorldsController`, the standalone
  `GET /api/Worlds/{seed}` endpoint): the frontend has never called it,
  it predates and is unrelated to the actual map/terrain model
  (`Map.cs`/`MapGenerator`, served at `GET /api/Maps`), and this change
  establishes the real per-cell deterministic model going forward, so
  keeping the unused placeholder around is more confusing than useful.

## Capabilities

### New Capabilities
(none - this reshapes existing capabilities rather than adding new ones)

### Modified Capabilities
- `map-generation`: replace bounded grain-scatter land/ocean generation
  with unbounded per-cell deterministic biome-noise generation, a richer
  biome set, and a windowed query API. See "What Changes" above.
- `map-creation-wizard`: remove the wizard entirely in favor of
  automatic generation on load, and update the canvas rendering
  requirements to match the flat pastel-fill style already shipped (the
  existing spec still described hillshading/wave-texture/decorative-
  border rendering that no longer exists in the app). The capability
  keeps its existing spec path/name despite no longer being a "wizard"
  - see design.md.
- `world-generation`: remove entirely (dead capability, superseded by
  `map-generation`'s per-cell deterministic model - see "What Changes").

## Impact

- **Backend** (`Mundus.Core`): `Map.cs`, `SizePreset.cs`, `GridType.cs`,
  `Biome` enum, and `MapGenerator` are rewritten; `World.cs` is deleted.
- **Backend** (`Mundus.Api`): `MapsController` query contract changes
  (window instead of size preset; no grid type); `WorldsController` and
  the `GET /api/Worlds/{seed}` endpoint are deleted.
- **Backend tests**: `MapGeneratorTests.cs` is rewritten for the new
  contract; determinism and neighbor-smoothness properties still apply
  but must be re-expressed per-cell/windowed rather than whole-grid.
  `WorldGeneratorTests.cs` is deleted with `World.cs`.
- **Frontend**: `src/api/schema.d.ts` regenerates from the new OpenAPI
  document; `MapCanvas.tsx` and `contour.ts` (marching-squares coastline
  extraction) are replaced by a simpler flat-cell-fill renderer since
  there is no longer a single binary land/ocean boundary to trace; the
  entire wizard (`MapCreationWizard.tsx`, its steps, `wizard/types.ts`,
  `ChoiceGrid.tsx`) is deleted, replaced by an effect that fires the
  first window request on mount; `MapParamsPanel.tsx` shows the seed and
  viewed window instead of seed and size preset.
- **OpenSpec**: `specs/map-generation/spec.md` and
  `specs/map-creation-wizard/spec.md` are rewritten via delta specs;
  `specs/world-generation/spec.md` is removed.

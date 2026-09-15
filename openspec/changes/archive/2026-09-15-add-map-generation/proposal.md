## Why

`world-generation` produces a single high-level `World` record (size,
biome) but nothing spatial - there is no grid of cells a game or a
frontend renderer can actually draw. Map generation is the next
capability: turning a seed and a small set of caller-chosen parameters
into a concrete, deterministic grid of cells with an elevation each,
grouped into a handful of contiguous biome **regions** (not one
independently-random biome per cell), optionally shaped into a
recognizable landmass archetype (a single continent, an island, an
archipelago). This is what makes "generate something like the shape of
Great Britain, mostly grassland with a mountainous north" a realistic
request instead of visual noise.

This proposal supersedes the per-cell-biome version of `add-map-generation`
drafted earlier in this same change (that draft was never applied or
archived - revised in place, not superseded by a new change).

## What Changes

- Introduce the `map-generation` capability: deterministic generation of a
  `Map` - a grid of cells, each with an elevation, grouped into a small
  number of contiguous biome regions - from a seed plus three caller
  parameters: grid type, size preset, and shape archetype.
- **Grid type**: `Square` or `Hex` (rectangular offset layout), per
  request.
- **Size preset**: one of four fixed presets (`Small` 32x32, `Medium`
  64x64, `Large` 128x128, `Huge` 256x256) - not a freeform width/height.
- **Shape archetype**: `Continent` (one large landmass), `Island` (one
  landmass surrounded by ocean, map edges are ocean), `Archipelago`
  (several separate landmasses), `Peninsula` (one landmass attached to
  exactly one map edge), `IsthmusLandBridge` (one landmass touching two
  opposite map edges, bridging across the map), `InlandSea` (land
  encloses a body of ocean that has no path to the map's outer edge), or
  `Unconstrained` (no shape guarantee, purely emergent from noise).
- **Biome regions**: the map is partitioned into a small number of
  contiguous regions (count determined by size preset, e.g. a `Small` map
  gets 1-3 regions, a `Huge` map gets 10-20), each with one biome - not one
  independently-random biome per cell.
- Expose it over HTTP, following the `world-generation` capability's
  existing pattern (`GET /api/Worlds/{seed}`).

## Non-Goals

- **The multi-step "wizard" UI** (advance/go-back through parameter
  selection) is a frontend-only concern, out of scope for this change.
  It collects grid type / size preset / shape archetype across steps and
  makes a single call to this capability's endpoint once confirmed - no
  backend support for partial/staged generation or preview-per-step is
  needed. Tracked as a separate future frontend change once this API
  exists.
- Rivers, roads, settlements, or any feature beyond elevation + biome
  regions.
- Arbitrary (non-rectangular) hex map shapes, or non-preset dimensions.

## Capabilities

### New Capabilities
- `map-generation`: deterministic, grid-type/size-preset/shape-archetype
  -parameterized generation of a cell grid with per-cell elevation grouped
  into contiguous biome regions.

### Modified Capabilities
(none - `world-generation`'s `World` record and RNG contract are reused
as-is, not changed)

## Impact

- New code: map generation engine in `Mundus.Core`, a new
  controller/endpoint in `Mundus.Api`.
- Depends on `world-generation`'s `Rng` (seeded RNG, named child streams)
  - no new RNG primitives, this capability is built on top of the existing
  ones.
- No frontend work in this change (neither rendering nor the wizard) -
  both follow once this data shape exists and is stable.

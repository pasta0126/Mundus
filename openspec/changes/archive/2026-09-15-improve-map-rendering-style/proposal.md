## Why

The current canvas renderer draws each cell as a flat, hard-edged square
or hexagon in a saturated color - visually a data grid, not a map. The
project owner shared several reference fantasy maps (hand-illustrated
style: smoothed coastlines, warm parchment-like palettes, mountain/forest
iconography). This change moves the renderer toward that aesthetic within
a deliberately reduced scope: smoothed coastlines, a warmer palette, and
simple mountain/forest icons - explicitly deferring rivers, political
borders, labels, cities, and a compass rose to future changes.

It also adds a quick "generate another" action after viewing a map, so
trying a new seed doesn't require re-selecting grid type, size, and shape
every time.

## What Changes

- **MODIFIED**: canvas rendering (`map-creation-wizard`'s "Canvas
  rendering of the generated map" requirement) - coastlines and biome
  boundaries SHALL appear smoothed rather than following the raw cell
  grid's hard edges, and the biome color palette SHALL use warm,
  parchment-map-like tones rather than saturated flat colors.
- **ADDED**: simple mountain and forest iconography drawn over the base
  terrain for cells of those biomes.
- **ADDED**: a "generate another" action on the result view that returns
  to the wizard's Seed step (not the Review step), keeping grid type,
  size preset, and shape archetype as they were, ready to try a new seed
  immediately.

## Non-Goals

- Rivers, political borders/regions, labels, city markers, a compass
  rose, or a decorative page border - explicitly deferred.
- Any change to the `map-generation` API or data shape - this is a
  rendering-only change on data already returned today.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `map-creation-wizard`: canvas rendering requirement gains smoothing +
  palette + iconography; a new requirement is added for the
  "generate another" action.

## Impact

- Affected code: `frontend/src/map/MapCanvas.tsx`,
  `frontend/src/map/biomeColors.ts`, `frontend/src/App.tsx`.
- No backend changes.

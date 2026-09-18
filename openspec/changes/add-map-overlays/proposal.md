## Why

Mundus currently renders only the raw biome grid: flat colored cells with no
sense of place. A map that a person can actually use for storytelling or
exploration needs orientation (a north), notable locations, and political
structure (regions) - all layered on top of the same deterministic seed so
regenerating the "same" map always reproduces the same north and the same
points of interest at the same spots. This change specifies that layer
system so implementation can start later; icon artwork itself is out of
scope until the user supplies it, but the concrete icon list this change
produces is what they'll design against.

Rivers and trade routes were both explored under this change (rivers was
fully implemented, shipped as "Rivers (Experimental)", and then removed
entirely at the user's request; trade routes was never built) and are no
longer part of its scope - see `tasks.md` for the historical note on
rivers if picking either back up later.

## What Changes

- Add a **layer visibility system**: every overlay (compass rose, each
  points-of-interest category, region borders) can be shown or hidden
  independently from a layers panel. Whatever is visible on screen is what
  gets baked into the downloaded PNG - hidden layers are excluded.
- Add a **compass rose** overlay: each map has a north bearing derived
  deterministically from its seed (not always pointing "up"), shown as a
  compass-rose icon on the canvas.
- Add **points of interest**: seed-deterministic icon placements across fixed
  categories (geology/relief, settlements, nature, history/culture, sea
  legends, mythological beings) with a legend explaining each icon; no text
  labels yet. Produces the concrete icon inventory the user will design and
  provide later. Each category is independently toggleable via the layer
  system.
- Add **region borders**: thin solid lines delimiting seed-deterministic regions, never drawn over open water.
- Modify `map-creation-wizard`: add a layers panel, an icon legend, and
  extend the Download behavior so the exported PNG matches exactly the
  layers currently visible on screen.

## Capabilities

### New Capabilities
- `map-layers`: layer registry and show/hide UI shared by every overlay
  below, plus the "download matches what's visible" contract.
- `compass-rose`: deterministic north bearing per seed and its icon overlay.
- `points-of-interest`: deterministic POI placement, icon categories, and
  legend.
- `region-borders`: deterministic region boundaries rendered as thin solid lines, omitted over open water.

### Modified Capabilities
- `map-creation-wizard`: the rendered view gains a layers panel and a legend,
  and "Download" is redefined to capture only the currently visible layers
  rather than the biome grid alone.

## Impact

- **Backend** (`Mundus.Core`, `Mundus.Api`): new deterministic generators
  (north bearing, POI placements, region boundaries), each seeded off the
  map seed, and new endpoints carrying this overlay data alongside the
  existing cell grid.
- **Frontend**: new layer-toggle panel, new icon legend component, new
  overlay-rendering code (compass rose, POI icons, thin solid region
  borders), and changes to the canvas/download pipeline so the exported
  image composites only the visible layers.
- **Assets**: a defined icon inventory (this change's spec/design output)
  that the user will produce and supply afterward; no icon artwork is
  shipped by this change itself.

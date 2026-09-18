## Why

Mundus currently renders only the raw biome grid: flat colored cells with no
sense of place. A map that a person can actually use for storytelling or
exploration needs orientation (a north), waterways, notable locations, and
political/logistic structure (regions, routes) - all layered on top of the
same deterministic seed so regenerating the "same" map always reproduces the
same north, the same rivers, and the same points of interest at the same
spots. This change specifies that layer system so implementation can start
later; icon artwork itself is out of scope until the user supplies it, but
the concrete icon list this change produces is what they'll design against.

## What Changes

- Add a **layer visibility system**: every overlay (compass rose, rivers, each
  points-of-interest category, region borders, trade routes) can be shown or
  hidden independently from a layers panel. Whatever is visible on screen is
  what gets baked into the downloaded PNG - hidden layers are excluded.
- Add a **compass rose** overlay: each map has a north bearing derived
  deterministically from its seed (not always pointing "up"), shown as a
  compass-rose icon on the canvas.
- Add **rivers**: seed-deterministic watercourses that originate at
  high-elevation sources, flow downhill along a sinuous path following the
  existing elevation field toward oceans/lakes, and can merge into a shared
  downstream river as tributaries.
- Add **points of interest**: seed-deterministic icon placements across fixed
  categories (geology/relief, settlements, nature, history/culture, sea
  legends, mythological beings) with a legend explaining each icon; no text
  labels yet. Produces the concrete icon inventory the user will design and
  provide later. Each category is independently toggleable via the layer
  system.
- Add **region borders**: thin solid lines delimiting seed-deterministic regions, never drawn over open water.
- Add **trade routes**: dotted lines connecting settlements/ports, seed-
  deterministic.
- Modify `map-creation-wizard`: add a layers panel, an icon legend, and
  extend the Download behavior so the exported PNG matches exactly the
  layers currently visible on screen.

## Capabilities

### New Capabilities
- `map-layers`: layer registry and show/hide UI shared by every overlay
  below, plus the "download matches what's visible" contract.
- `compass-rose`: deterministic north bearing per seed and its icon overlay.
- `rivers`: deterministic river/tributary generation and rendering.
- `points-of-interest`: deterministic POI placement, icon categories, and
  legend.
- `region-borders`: deterministic region boundaries rendered as thin solid lines, omitted over open water.
- `trade-routes`: deterministic route lines rendered as dotted lines.

### Modified Capabilities
- `map-creation-wizard`: the rendered view gains a layers panel and a legend,
  and "Download" is redefined to capture only the currently visible layers
  rather than the biome grid alone.

## Impact

- **Backend** (`Mundus.Core`, `Mundus.Api`): new deterministic generators
  (north bearing, river paths, POI placements, region boundaries, trade
  routes), each seeded via `Rng.Child(...)` off the map seed, and new
  response data (or new endpoints) carrying this overlay data alongside the
  existing cell grid.
- **Frontend**: new layer-toggle panel, new icon legend component, new
  overlay-rendering code (compass rose, rivers, POI icons, thin solid
  region borders, dotted routes), and changes to the canvas/download
  pipeline so the exported image composites only the visible layers.
- **Assets**: a defined icon inventory (this change's spec/design output)
  that the user will produce and supply afterward; no icon artwork is
  shipped by this change itself.

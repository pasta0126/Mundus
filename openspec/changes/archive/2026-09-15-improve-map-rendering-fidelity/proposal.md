## Why

`improve-map-rendering-style` moved away from a flat data-grid look, but
its "render small, blur when scaling up" technique for smoothing produces
a soft, muddy coastline - visually still far from the reference fantasy
maps the project owner is targeting (crisp hand-drawn-looking coastlines,
textured/shaded terrain, dense recognizable mountain/forest iconography,
textured ocean). The owner has explicitly said generation/rendering time
is not a constraint here - fidelity to the references is the priority.
This change replaces the blur-based smoothing with real contour
extraction and adds terrain shading, denser iconography, ocean texture,
and a decorative border.

## What Changes

- **MODIFIED**: canvas rendering, again -
  - Square grid: coastlines are now extracted as actual smoothed vector
    contours (marching squares on the land/ocean field + Chaikin corner-
    cutting smoothing), filled and stroked - not a blurred raster.
  - Hex grid: cells are drawn crisply (no blur at all) with a stroke
    along every land/ocean hex-edge boundary, giving a clean hex-stepped
    coastline appropriate to a hex grid (this is how real hex wargame
    maps render coastlines, not a smoothed blob).
  - Terrain now has slope-based hillshading (a simple directional-light
    shading from each cell's local elevation gradient), not just a flat
    elevation-to-lightness multiplier.
  - Mountain and Forest icons are denser and better-shaped (a small
    multi-peak "range" mark for Mountains, a two-tone tree mark for
    Forest) rather than a single triangle / three dots.
  - Ocean cells get a simple wave-line texture instead of flat/blurred
    shading.
  - A decorative parchment-colored border frame is drawn around the map.
- No change to the wizard flow, the "generate another" action, or the
  `map-generation` API - this is rendering-only, on data already
  returned today.

## Non-Goals

(Unchanged from `improve-map-rendering-style` - still explicitly out of
scope): rivers, political borders/regions, labels, city markers, a
compass rose. If the owner wants any of these next, that's a further
change.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `map-creation-wizard`: the canvas rendering requirement's smoothing/
  palette/icon language is superseded by contour-based coastlines,
  hillshading, denser iconography, ocean texture, and a border frame.

## Impact

- Affected code: `frontend/src/map/MapCanvas.tsx` (substantial rewrite),
  possibly a new `frontend/src/map/contour.ts` helper for marching
  squares + Chaikin smoothing.
- No backend changes.

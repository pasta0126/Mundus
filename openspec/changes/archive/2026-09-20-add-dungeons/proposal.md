## Why

The map is full of places that beg to be entered - caves, skull caves, a
dragon's lair, a dark castle - but they are only icons. Dungeons give those
places substance: a person clicks one and sees the inside, with its treasures
and its final boss, all reproducible from the map's seed like everything else
in Mundus. This builds on the map's URL state and the home hub introduced by
`add-home-hub`, which must land first.

## What Changes

- Mark certain existing points of interest as able to hold a dungeon (caves,
  cavern, mine, ruins, hidden temple, dragon, dark castle, wizard's tower, hedge
  maze). No icon is replaced, moved or retired, and no existing id changes.
- A deterministic per-point roll, independent of placement, decides whether a
  given point of interest actually holds a dungeon. Points that do carry a small
  "!" badge and their tooltip says a dungeon is there.
- Clicking such a point opens the dungeon at a new page, `/dungeons`, with a
  way back to the same map view.
- A new deterministic generator builds a single-floor dungeon from the map seed,
  the point's coordinates and its type: a layout in a style suited to the place
  (cave, rooms and corridors, or maze), an entrance, treasures and bosses.
- A new API returns a dungeon; the viewer draws it as a 2D map with the
  entrance, treasures and bosses marked and named on hover.
- No gameplay: dungeons are looked at, not played.

## Capabilities

### New Capabilities
- `dungeon-generation`: the deterministic dungeon generator, its layouts, bosses and treasures, and the HTTP API.
- `dungeon-viewer`: the `/dungeons` page: the 2D drawing, the legend, hover names and navigation back to the map.

### Modified Capabilities
- `points-of-interest`: which icons can hold a dungeon, the deterministic per-point roll, the badge, the tooltip, and opening the dungeon on click.

## Impact

- Backend: `Mundus.Core` (a dungeon catalog and generator, a dungeon flag on points of interest), `Mundus.Api` (a Dungeons controller), unit tests.
- Frontend: the POI layer (badge, hover text, click), a new lazy `/dungeons` page and canvas, regenerated API types.
- Determinism: point positions, types and roles are unchanged, so the map's `SpecVersion` is not bumped; the dungeons carry their own spec version.
- Depends on `add-home-hub` (the `/maps` route and URL state).

## Why

Mundus is built for a mouse: the map is panned with buttons, everything
informative appears on hover, and panels sit over the content. On a phone or
tablet that means no way to see what an icon is, controls that cover the map, and
a standing notice that the site "isn't optimized" for them. The site should work
on touch devices, and the notice should go once it does.

## What Changes

- Every page fits a phone-sized screen (about 360 px wide) without sideways scrolling, with its panels folded away or shown as a sheet so they never cover the whole view.
- The map can be panned by dragging and zoomed by pinching, on touch and with a mouse alike; the existing buttons stay.
- What appears on hover (icon names, dungeon marks, dungeon treasure and bosses) also appears on tap.
- A dungeon is entered by tapping its icon a second time (or through its tooltip) so that a stray tap on the map never opens one.
- Controls are large enough to touch.
- The 3D planet and system pages and the dungeon plan work with touch gestures.
- **BREAKING**: the "not optimized for phones or tablets" notice is removed everywhere.

## Capabilities

### New Capabilities
- `mobile-support`: layout, gestures, tap-for-details and touch-sized controls on every page.

### Modified Capabilities
- `map-creation-wizard`: the touch-first notice is removed.
- `planet-system-viewer`: the touch-first notice is removed.
- `dungeon-viewer`: the touch-first notice is removed; text stays English.

## Impact

- Frontend across every page: responsive layout, pointer/touch event handling on the map canvas and the dungeon canvas, sheet-style panels, touch-sized controls, removal of the notice component.
- Possibly performance work on the map: a phone must load and pan the view in reasonable time and memory.
- No backend or API change.

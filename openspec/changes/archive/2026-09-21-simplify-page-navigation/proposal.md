## Why

With the home hub in place, the row of white buttons under every page's panel
(Home, Map, Planets, Systems) no longer earns its space: going from a map to a
planet is a decision to make on the hub, not a shortcut to keep at hand. The
title "Mundus" already leads home on every page, which is the only way out a
person needs.

## What Changes

- Remove the navigation row of buttons from the map, planet, system and dungeon pages.
- Every page keeps the "Mundus" title as its link to the home page; the home page is where a person chooses what to generate.
- The dungeon page keeps its "Back to map" control: a dungeon belongs to one map view and returning to exactly that view is not a hub decision.
- **BREAKING**: the requirement that every page offers buttons to the other pages is removed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `home-hub`: the home page is the single place to move between what the site generates; other pages link only home.
- `planet-system-viewer`: the requirement that every page carries a navigation row is dropped; the routes and seed behavior stay.
- `dungeon-viewer`: the page no longer has a navigation row, only its return-to-map control.

## Impact

- Frontend: remove the shared navigation component and its use on the map, planet, system and dungeon pages; the dungeon page's return link is unaffected.
- No backend or API change.

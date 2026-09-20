## Context

Points of interest come from `PointOfInterestGenerator`, driven by a single
catalog whose ids are frozen. Generation uses named `Rng.Child` streams whose
call order is part of the determinism contract, so anything new must not draw
from an existing stream. The map's POI layer draws to a click-through canvas and
finds hovered icons by tracking the window's pointer over the bare map
(`PointsOfInterestLayer.tsx`); it has no click handling. The planet and system
pages show the pattern for a lazy page with its own API and copy controls. This
change assumes `add-home-hub` has landed (`/maps` with its view in the URL). See
proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Dungeons that are pure functions of (map seed, x, y, type).
- Zero change to where points are, what they are and how they are drawn, apart from the badge.
- One documented source of truth for what can hold a dungeon, and for bosses and treasures.

**Non-Goals:**
- Gameplay, multiple floors, monsters that move, persistence of what was found.
- New artwork beyond the set already cut into `frontend/src/assets/dungeon/`.
- Naming dungeons individually beyond "type at place".

## Decisions

**Flag existing entries instead of adding a `dungeon` icon.** A `Dungeon` field
on the catalog entry (style and probability) marks eligibility. No id is added,
replaced or retired, so no existing map changes. *Alternative:* a new POI type
that replaces dragons - rejected: it changes placement and forces a `SpecVersion`
bump.

**Roll on its own stream.** The "does this point hold a dungeon" roll seeds a
fresh `Rng` from `"{seed}:dungeon:{x}:{y}:{type}"` rather than calling `Child` on
an existing stream, so it cannot perturb placement, and it does not depend on
the window. The generator sets a `Dungeon` style (nullable) on each returned
point. Settlement services are excluded because a town's temple is part of the
town, not a place to enter.

**Dungeon seed is the same string.** The dungeon generator seeds from that string
too and derives sub-streams (`layout`, `bosses`, `treasure`) with `Child`.
Because it needs nothing but the URL's values, the API does not have to check
the point really exists; it only validates the type. *Alternative:* recompute the
point from the map and verify - rejected as costly and pointless, since a dungeon
that "should not exist" is harmless.

**Three layout algorithms.** Cave: cellular automaton on random fill, keep the
largest connected region. Halls: BSP room placement joined by corridors. Maze: a
perfect maze by recursive backtracker on a coarse grid. Each is bounded in size
and always followed by a connectivity check that keeps only what is reachable
from the entrance. *Alternative:* one generic algorithm - rejected, the three
places would look alike.

**Boss and treasure placement from a distance field.** A breadth-first search from
the entrance gives every floor cell its walking distance. The final boss takes the
farthest cell; lesser bosses take cells past the route's midpoint; treasures are
weighted toward dead ends (cells with one floor neighbour) and side rooms. This
keeps everything reachable by construction and is cheap.

**Grid as compact rows.** The API returns the grid as an array of strings (`#` wall,
`.` floor), not an array of cell objects, keeping a 96x96 dungeon to about 10 KB.

**Clicking in a click-through canvas.** The hit list the hover code already builds
is reused: a `click` listener on the window applies the same "over the bare map"
test and, when the hit holds a dungeon, navigates to `/dungeons`. Because the map's
own drag-to-pan must keep working, a click counts only if the pointer moved less
than a few pixels between press and release. The cursor is switched via a class on
the main wrapper while a dungeon icon is hovered.

**Viewer.** A lazy `/dungeons` page, one canvas scaled to fit, a marks legend and a
sheet, following the planet page's structure (copy controls, loading, errors,
touch notice, navigation row). Bosses, treasures, the entrance and the badge are
drawn with the icons in `frontend/src/assets/dungeon/`, whose file names are the
catalog ids (`giant-spider`, `chest`, `entrance`, `dungeon-badge`, and so on;
`boss` and `final-boss` are the marks for lesser and final bosses, and
`style-cave`, `style-halls` and `style-maze` illustrate the sheet).

**Artwork lives apart from the POI icons.** The POI catalog test requires every
image in `assets/poi/` to have a catalog entry; dungeon marks are not points of
interest, so they sit in their own folder and get their own catalog test that
every boss, treasure and style id has a matching image (and no image lacks one,
apart from the shared marks). The original sheet is kept in `source/`.

## Risks / Trade-offs

- [A hit-test click on a busy map may open a dungeon when the person meant to pan]
  → Movement threshold between press and release, and only the icon's own area is clickable.
- [The 45% per-category balance rule in the POI spec could shift if badges change
  visual weight] → The badge changes no placement or frequency, only drawing.
- [Dungeon rules will need tuning after seeing real ones] → They carry their own
  spec version, so changing them is a deliberate, visible break for dungeons only.
- [Two near-identical chest icons (`chest`, `hoard`) and three unused icons
  (`skull-banner`, `royal-crown`, `sealed-scroll`) may confuse] → Kept in the set
  on purpose; the unused ones can be removed if they stay unused.

## Migration Plan

Deploy backend and frontend together (the API type gains `dungeon` on points, and
the new endpoint is needed by the new page). No data migration. Rollback is
redeploying the previous images; old clients ignore the extra field. Bump the
minor version and tag, per the project's versioning workflow.

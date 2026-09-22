## Why

Cave dungeons (caves, caverns, mines, skull caves, ice and crystal caves) do not
look like caves. The generator produces one wide open cavern - more than half the
grid is floor - with ragged stair-stepped edges, and the viewer draws every cell as
a flat square, so the outline reads as coarse pixels. A cave should be a system of
winding tunnels and chambers with walls that look like rock.

## What Changes

- Change how caves are generated: a network of tunnels and chambers rather than one open field, with a bounded share of floor, passages of varied but limited width, and no tiny wall specks or floor pockets.
- Draw caves with smooth, organic contours instead of grid squares, with a shaded rock wall and a textured floor; halls and mazes stay rectilinear.
- Bump the dungeon spec version, since existing cave dungeons will change (halls and mazes do not).

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `dungeon-generation`: caves have a bounded floor share, limited open areas and no specks; halls and mazes are unaffected.
- `dungeon-viewer`: caves are drawn with smooth contours and a rock look.

## Impact

- Backend: the cave layout in the dungeon generator and its tests; `DungeonGenerator.SpecVersion` incremented.
- Frontend: the dungeon canvas gains a smooth-contour cave rendering path.
- Cave dungeons already seen at a given URL will look different after the change.

## Why

`improve-cave-dungeons` gave the cave style a rock look (organic contours,
shaded rim, textured floor); halls (ruins, wizard-tower, dark-castle, dragon)
and the maze (hedge-maze) were left drawn as a flat grid of squares. Now that
the cave treatment is live, the other two styles read as unfinished by
comparison and deserve their own, style-appropriate finish.

## What Changes

- Give the halls style a carved-stone finish: floor tiles with mortar/joint
  lines, and walls with an inner shadow and a lit rim at the floor boundary -
  the architectural analogue of the cave's rock shading. Rooms and corridors
  stay rectangular; no organic contours.
- Give the maze style a hedge finish: its walls (the hedge itself) get a
  leafy shrub texture instead of a flat fill; the path floor keeps a simple,
  readable fill so the one true route stays easy to trace. Cells stay
  square; no organic contours.
- Both finishes are purely visual, on the same per-cell floor/wall grid the
  generator already returns - no change to layout, size, or any placement
  rule.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `dungeon-viewer`: the "Caves are drawn as caves" requirement currently
  leaves halls and mazes as a plain square-grid fill ("Halls and mazes MAY
  remain drawn on the square grid"); this replaces that allowance with a
  requirement that halls and mazes each get their own textured, shaded
  finish while staying on the square grid.

## Impact

- Frontend only: `frontend/src/dungeons/DungeonCanvas.tsx` and new
  style-specific rendering helpers alongside `caveRender.ts` (which stays
  cave-only). No backend, API, or dungeon-generation change.
- No dungeon URL, size, or generated layout changes - existing links keep
  showing the same dungeon, just redrawn.

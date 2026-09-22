## 1. Shared texture helper

- [x] 1.1 Extract `caveRender.ts`'s memoized "solid base + random speckles" tile builder into a small exported helper parameterised by base/speckle colour, and update `caveRender.ts`'s floor texture to call it

## 2. Halls: carved stone

- [x] 2.1 Create `frontend/src/dungeons/gridDressing.ts` with `paintHallsTerrain(ctx, rows, cols, rowCount, cell)`, drawing directly in the canvas's existing CSS-pixel space
- [x] 2.2 Fill each floor cell with the flagstone colour plus a small deterministic per-cell shade offset (integer hash of `(x, y)`, not `Math.random`)
- [x] 2.3 Stroke a lit rim and a darker shadow line along every floor/wall boundary edge, on the wall side, both 1px
- [x] 2.4 Stroke a faint mortar joint line along every floor/floor boundary edge, drawn after every floor cell is filled
- [x] 2.5 Skip the bevel/joint strokes below a minimum cell size, falling back to the flat fill
- [x] 2.6 Wire the `Halls` branch in `DungeonCanvas.tsx` to call `paintHallsTerrain` instead of the plain per-cell loop

## 3. Maze: hedges

- [x] 3.1 Add `paintMazeTerrain(ctx, rows, cols, rowCount, cell)` to `gridDressing.ts`
- [x] 3.2 Build a memoized hedge tile (dark green base, lighter/darker leaf speckles) via the shared helper from task 1.1, turn it into a `CanvasPattern`, and fill the whole canvas with it as the wall layer
- [x] 3.3 Fill each floor (path) cell with a plain, flat colour on top of the hedge fill
- [x] 3.4 Wire the `Maze` branch in `DungeonCanvas.tsx` to call `paintMazeTerrain` instead of the plain per-cell loop

## 4. Verify and release

- [x] 4.1 Look at halls (ruins, wizard-tower, dark-castle, dragon) and the hedge-maze in the browser; confirm rooms/corridors and maze cells stay perfectly square and marks/tooltips still line up
- [x] 4.2 Confirm the cave style is visually unchanged (still calls `paintCaveTerrain`)
- [x] 4.3 Run frontend type check, lint and build
- [x] 4.4 Bump the semver (minor) and tag the commit

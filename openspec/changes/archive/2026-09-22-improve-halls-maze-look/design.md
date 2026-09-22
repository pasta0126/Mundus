## Context

`DungeonCanvas.tsx` already branches on `dungeon.style` to call
`paintCaveTerrain` (in `caveRender.ts`) for the `Cave` style, falling back to
a plain per-cell `fillRect` loop for `Halls` and `Maze`. That fallback is what
this change replaces, for those two styles only. See proposal.md - Why/What
Changes.

Unlike caves, halls and mazes must stay rectilinear (proposal.md - What
Changes), so the cave technique - blur the floor mask, then re-bucket it into
colour bands - does not apply here: blurring is exactly what would round the
corners we need to keep sharp. Halls and mazes instead get a technique suited
to a crisp grid: direct per-cell fills and thin edge strokes, computed straight
from cell adjacency, no blur pass.

## Goals / Non-Goals

**Goals:**
- Halls read as carved stone: tile joints and a lit-rim/shadow bevel at every
  floor/wall boundary, corners staying exactly square.
- Mazes read as hedges: a leafy texture on the walls, the path kept plain
  and easy to trace.
- Reuse the tileable-pattern trick from `caveRender.ts`'s floor texture
  rather than inventing a second way to build one.

**Non-Goals:**
- No organic contours for either style (that's the cave-only treatment).
- No change to dungeon generation, layout, or any placement rule.
- No per-boss/per-treasure visual changes; marks are drawn exactly as before.

## Decisions

**One module, two style-specific paint functions, called directly at the
main canvas's existing CSS-pixel transform.** `caveRender.ts` builds its own
offscreen device-pixel canvases because a `ctx.filter` blur's radius must be
worked out in device pixels. Halls and mazes need no blur, so
`paintHallsTerrain`/`paintMazeTerrain` (new file `gridDressing.ts`) can draw
straight onto the canvas passed in from `DungeonCanvas.tsx`, in the same CSS
cell units the old `fillRect` loop used - simpler, and consistent with how
every other per-cell drawing in that file already works.

**Halls: fill, then a two-line bevel per boundary edge, then joints.**
For each floor cell, `fillRect` the flagstone colour (with a small
deterministic per-cell shade offset - a cheap integer hash of `(x, y)`, not
`Math.random()`, so the same dungeon always paints identically rather than
just "identically within one page load" as the cave floor texture does).
Then, for each of the 4 cell edges that borders a wall cell, stroke a 1px
light line just inside the wall side of that edge (the rim) and a second,
darker 1px line one pixel further in (the shadow) - the same rim-then-shadow
read as the cave's bands, done as straight strokes instead of blurred rings.
Finally stroke every floor/floor cell boundary with a faint darker line (the
mortar joint). Order matters: joints and bevels are drawn after every floor
cell is filled, so a joint line is never overdrawn by a neighbouring cell's
fill.

**Maze: a tileable hedge pattern for the walls, a plain fill for the path.**
Build one small tile (via the same "solid base + random speckles" helper
`caveRender.ts` uses for its floor texture, parameterised by base/speckle
colour instead of duplicated) with a dark hedge-green base and lighter/darker
leaf speckles, turn it into a `CanvasPattern`, and `fillRect` the whole canvas
with it before drawing path cells over it with a plain, flat colour. No bevel
between hedge and path - the proposal calls for a simple floor specifically so
the one true route reads clearly at a glance.

*Alternative considered:* extend `caveRender.ts`'s blur-threshold pipeline to
also drive halls/mazes, using a very small blur radius to keep near-square
corners. Rejected: even a small blur softens 90-degree corners visibly at the
cell sizes this canvas actually renders at, and the two styles don't need
graduated bands the way rock does - a hard-edged bevel is both simpler and
more true to "carved stone" and "trimmed hedge."

**Shared helper extracted, not duplicated.** The tile-pattern builder in
`caveRender.ts` (base fill + randomized speckles, memoized) is generalised
into a small exported helper both that file and `gridDressing.ts` call with
their own colours, rather than copying the loop a second time.

## Risks / Trade-offs

- [Risk] A per-cell hash-based shade and a per-boundary bevel stroke add a
  render pass over the whole grid; halls can be up to 88x64 cells. →
  Mitigation: this is the same order of work the existing plain `fillRect`
  loop already does (one pass per cell, plus a small constant number of edge
  checks); no offscreen canvases or blur, so it stays cheap.
- [Risk] The mortar-joint lines could look busy at very small cell sizes
  (deep zoom-out equivalent, i.e. a very large dungeon on a small window). →
  Mitigation: skip drawing joints/bevels below a minimum cell size (tune in
  implementation) and fall back to the flat fill, matching how detail is
  already dropped elsewhere in the app at small render sizes.
- [Trade-off] Halls' per-cell shade hash and maze's hedge tile are both
  purely decorative and not derived from the dungeon's seed - two dungeons
  with the same floor plan (impossible in practice, but hypothetically) would
  render identical stone/hedge texture. Acceptable: the spec only requires
  the finish to look like stone/hedges, not that its texture itself be part
  of the deterministic contract (the cave floor texture already sets this
  precedent).

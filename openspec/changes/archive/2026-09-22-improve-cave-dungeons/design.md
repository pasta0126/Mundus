## Context

The cave is a random fill smoothed by a cellular automaton, then reduced to its
largest region (see `DungeonGenerator`): the smoothing rounds blobs but never
narrows them, so the result is a large cavern (about 60% floor in the samples
looked at). The viewer fills each grid cell as a flat square, so the outline is a
staircase. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- A cave that looks like tunnels and chambers, and is drawn like rock.
- Determinism kept, with a new spec version.

**Non-Goals:**
- Any change to halls or mazes, to marks, or to boss and treasure placement rules.
- Multiple floors, lighting or fog of war.

## Decisions

**Generate tunnels and chambers, not a smoothed field.** Two directions to weigh
when work starts: (a) place chamber centres, join them by winding tunnels made by
a drunkard's walk or a minimum spanning tree over the chambers, and widen with a
small brush; (b) keep the automaton but start from a lower fill and run a step that
erodes wide areas. (a) gives direct control over the floor share and passage width
and is the recommended start; (b) is simpler but tuning the two limits is harder.

**Enforce the limits, not just aim for them.** After generation a check measures the
floor share, the largest open square and the specks, and re-draws with the next
sub-seed (as the current attempt loop does) until the cave passes, falling back to
the best attempt. Deterministic because the attempts are.

**Draw contours from the grid, not from more cells.** The viewer turns the grid into
smooth outlines with marching squares (or a blurred threshold of the floor mask) and
fills them, then adds a darker inner shadow and a lighter rim on the wall and a
noise texture on the floor. This fixes the pixelated look without changing the API
or the cell coordinates. *Alternative:* generate at a finer grid - rejected for now:
it multiplies work and changes coordinates for marks.

## Risks / Trade-offs

- [Existing cave URLs change] → Intended; the spec version increases and old
  dungeons are not stored anywhere.
- [Smoothing might round a mark into a wall] → Marks are on floor cells; contours
  are drawn from the same cells so they always sit inside the smoothed floor.
- [The limits are hard to satisfy for every seed] → The attempt loop falls back to
  the best of a bounded number of attempts; tests use many seeds to find bad ones.

## Open Questions

- The 25% to 45% share and the 2 to 5 cell passage width are starting points to tune on real dungeons.

## Context

Live use of the deployed tray (see proposal.md) turned up concrete rendering
problems in `frontend/src/dice/dieTypes.ts` and `decals.ts`. This is a
rendering/content pass on top of the existing decal and geometry pipeline
from `add-dice-roller`/`refine-dice-roller` - no change to physics, settle
detection, or the throw/history/colour machinery.

## Goals / Non-Goals

**Goals:**
- Match the reference d4/d10 photos the user supplied closely enough that
  the shapes read as genuine dice, not approximations.
- Every numeral legible without a chip background, on any base colour.

**Non-Goals:**
- Re-deriving exact photographic dice proportions - "close enough to read
  right," not a CAD-accurate reproduction.
- Any change to how a die's value is computed (still the resting face's
  normal, unchanged).

## Decisions

**Remove the d2, the same way the d3 was removed.** No new mechanism -
`buildD2`, its `DIE_KINDS` entry, its `buildDecals` branch and its
`DicePage.tsx` summon button all go, mirroring the earlier d3 removal
exactly. `EDGE_FACE_THRESHOLD`/`edgeValue` in `dieTypes.ts` are left in
place as a general (now unused) mechanism rather than ripped out - cheap to
keep, and exactly what a future edge-landing die would need again.

**d4: three corner-numerals per face, not one base-numerals.** The
reference photo shows each triangular face carrying its number three times,
once near each corner, rotated to that corner - because on a real d4 each
of a face's three corners is shared with a different neighbouring face, and
whichever neighbour ends up "up" reads the shared corner's numeral the
right way up. Our model still reads a d4's value from the *resting* (down)
face, not a vertex, but three copies of that same value - one per corner,
each rotated to face outward from its corner - reproduces the reference's
look without changing the read rule. Each copy is a small decal offset
toward its corner and rotated by 0°/120°/240° around the face normal.

**d6: the Mundus icon on the "1" face.** A branding touch the user asked
for directly - the existing per-face pip decal builder gets a special case
for value 1 that draws `mundus-icon-header.png` instead of a single dot.

**No chip background - fix legibility a different way.** The white circle
was there because a thin ink fill alone was getting blended away by
mipmapping at a die's on-screen size (see `refine-dice-roller` design.md -
this is exactly the bug that motivated the chip in the first place). Rather
than reintroduce that bug, the fix moves to what actually controls
minification quality: a higher-resolution decal canvas (256px, up from
128px) and a larger on-die decal size, both of which let the ink's own
shape survive being scaled down without needing a solid backing shape.
Every numeral/pip decal drops its background chip and renders ink directly
on a transparent canvas again, same as the very first version.

**d10: re-tuned proportions.** The reference photo's d10 has a shorter,
blunter ring and a more prominent apex than the current build. Adjusted by
feel (ring height down, apex height up slightly) rather than re-solving for
exact planarity (already rejected in `refine-dice-roller` design.md, for
the same "too tall and spiky" reason) - the flat-shading fix from that
change is unaffected and still does the "reads as one flat face" job.

**d20: bigger die, not smaller numerals alone.** A d20 has 20 small
triangular faces on a die sized the same as, say, a d12's 12 larger ones -
increasing its radius gives every face more room without shrinking the
numerals to the point of illegibility; the numeral's own scale is also
nudged down slightly so both changes share the work.

## Risks / Trade-offs

- [A larger 256px decal canvas costs a bit more texture memory per decal,
  multiplied by up to MAX_DICE dice] → Still small in absolute terms (a few
  hundred KB at most even fully loaded); not worth a fallback given the
  existing MAX_DICE=16 cap already bounds the worst case.
- [d4's three-corner numerals triple that shape's decal count] → A d4 has
  only 4 faces to begin with, so even tripled it's fewer decals than a d12
  or d20 already render.

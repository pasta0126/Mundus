## Why

Live use of the dice tray (deployed in `refine-dice-roller`) turned up a
batch of concrete visual problems: the d2 coin isn't worth keeping (same
verdict the d3 got earlier), the d4's numeral placement doesn't read as a
real d4, every numeral's white background chip looks wrong, the d10's face
shading still looks odd, and the d20's numerals are cramped for the die's
size. This change removes the d2 and fixes the rest.

## What Changes

- **BREAKING**: the d2 die is removed entirely - dropped from the
  summonable kinds, the tray UI, and the spec (the same treatment the d3
  got in `add-dice-roller`).
- d4: each face gets its printed value repeated near all three of its
  corners (rotated to match each corner), the way a real d4 shows a
  number for each of the three upright faces, instead of one numeral
  nudged toward a single edge.
- d6: its "1" face shows the Mundus icon in place of the traditional
  single pip.
- Every numeral/pip decal's white circular background chip is removed;
  numerals sit directly on the die's surface (transparent background)
  again, with a rendering fix so dark/light ink stays legible without it.
- d10: its face proportions and shading are adjusted so it reads as a
  proper pentagonal trapezohedron rather than an odd shape.
- d20: made bigger (and/or its numerals smaller) so its printed values
  aren't cramped against its many small faces.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `dice-roller`: drops d2 from the summonable kinds (mirroring d3's
  earlier removal); every other change here (numeral placement/styling,
  d6's "1" face, d10/d20 proportions) is a rendering detail the existing
  "Numbers are marked on every die" requirement already covers without
  needing new requirement text.

## Impact

- Frontend only: `frontend/src/dice/dieTypes.ts` (d2 removed, d4/d10/d20
  proportions), `frontend/src/dice/decals.ts` (no chip background, d4's
  three-corner numerals, d6's "1"-face icon), `frontend/src/dice/DicePage.tsx`
  (d2 removed from summon buttons/labels).
- `openspec/specs/dice-roller/spec.md`: `Summoning dice` requirement's
  kind list loses d2; the `Reading each die's result` requirement's d2
  face/cross/edge text is removed along with it.

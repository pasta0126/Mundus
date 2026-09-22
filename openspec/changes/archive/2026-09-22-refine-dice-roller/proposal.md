## Why

The dice tray shipped in `add-dice-roller` works end to end (physics,
settling, results, total) but reads as a placeholder: the dice are flat
colours with no numbers printed on them at all, there's an extra d3 nobody
asked for, the coin (d2) has no way to land on its edge, every die of a kind
looks identical, a roll can only ever throw everything at once, and nothing
is remembered between rolls. This change makes the tray look and behave like
a real set of dice, gives each die an identity (colour, a name), lets a
single die be thrown on its own, adds shake-to-roll on a phone, and keeps a
downloadable log of what was rolled.

## What Changes

- **Numbers on the dice, not just in a side panel:**
  - d6 gets traditional pips (dots), not a printed digit.
  - d4, d8, d10, d12, d20 get their value printed on each face (d4's near
    the base of the triangle, matching a real d4's look); the two d10s of a
    d100 pair are shaded differently (dark tens, light units) so they're
    told apart at a glance.
  - Every printed 6 and 9 carries an underline so they can't be confused for
    one another from any angle.
  - Every die's material gets a subtle marbled texture blended with its
    base colour.
- **d2 becomes a proper coin**: a face (circle) worth 1, a cross worth 0,
  and - new - landing on its edge is a real, detectable third outcome worth
  2, not an excluded case.
- **BREAKING**: the d3 die is removed entirely - dropped from the
  summonable kinds, the tray UI, and the spec.
- **Per-die identity**: each new die of the same kind gets a different base
  colour, drawn from a curated palette that rotates as more are summoned;
  the tray panel gets a colour picker per entry, pre-filled with that
  colour and editable. Each tray entry also gets an editable label next to
  its fixed kind name (e.g. "D6 Attack", "D6 Healing").
- **Throwing one die at a time**: a die can now be thrown by itself, from a
  control in its tray row or by clicking/tapping it directly in the 3D
  tray - an addition alongside the existing "Roll" action, which still
  throws every die in the tray together.
- **Shake to roll on mobile**: on a device with motion sensors, physically
  shaking it throws every die in the tray, the same as the "Roll" button.
- **Roll history**: the last 100 rolls are kept (persisted in the browser,
  not a server) with what was rolled and when, downloadable as a JSON file.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `dice-roller`: drops d3 from the summonable kinds; adds printed
  numbers/pips and per-die visual identity (colour, texture); redefines the
  d2's outcomes to include landing on edge; adds throwing a single die,
  shake-to-roll, and a downloadable roll history.

## Impact

- Frontend only, still no backend/API change: `frontend/src/dice/dieTypes.ts`
  (numeral/pip decals, marbled texture, colour palette, d2 edge detection,
  d10 flat-face shading, d3 removed), `DiceScene.tsx` (per-die throw,
  click-to-throw raycasting, shake detection, history recording),
  `DicePage.tsx` (colour picker, editable label, per-die throw control,
  history panel and download).
- `openspec/specs/dice-roller/spec.md`: several requirements revised, a few
  new ones added; no change to `dungeon-generation`, `dungeon-viewer`,
  `home-hub`, or any other capability.
- Existing dice already summoned in a live session keep working the same
  way; nothing here is reproducible by seed before or after, so there's no
  stored/shared state to migrate.

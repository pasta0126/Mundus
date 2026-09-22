## Why

Mundus generates worlds, planets and systems, but running a tabletop session
on top of a generated world still needs physical dice off-screen. A built-in
dice tray - a 3D space with real physics where a person drops one or more
dice and reads off what they land on - keeps the whole session inside the
app.

## What Changes

- Add a new `/dice` page: a 3D tray with realistic rigid-body physics
  (gravity, collisions between dice and with the tray's walls/floor,
  friction/restitution) rendered with `three.js`.
- Support summoning any number of dice into the tray before a throw, in the
  standard RPG set: d2 (a two-sided "coin"), d3 (a triangular prism), d4, d6,
  d8, d10, d12, d20 and d100 (as a paired d10/d10 "percentile" pair rendered
  as its own die).
- A single "roll" action throws every die currently in the tray in one
  physics event; each die tumbles under simulated physics and comes to
  rest on its own (not on a fixed timer), with a bounded maximum wait so a
  die stuck rolling forever still resolves.
- Once every die has settled, the system reads each die's resting
  orientation, reports the face value it landed on, and shows the sum of
  all dice in the current throw (dice of different sizes may be summed
  together; the d100 pair contributes its own combined 00-99 value).
- Each throw is genuinely random (no seed, no reproducibility) - the result
  comes from the physics simulation's initial conditions and forces, in
  keeping with a real physical dice tray rather than the seeded generators
  elsewhere in Mundus.
- Add a fourth home-page card for the dice tray. **Modified capability**:
  the home hub's card requirement goes from three cards to four, still
  none of them for dungeons.
- **New capability**: `dice-roller`.
- **Modified capability**: `home-hub` (card count and content).

## Capabilities

### New Capabilities
- `dice-roller`: a 3D tray with realistic rigid-body physics where a person
  summons one or more dice (d2, d3, d4, d6, d8, d10, d12, d20, d100), throws
  them all in one roll, and gets back each die's value and the throw's
  total once every die has settled.

### Modified Capabilities
- `home-hub`: the home page gains a fourth card, for the dice tray. The
  existing "One large card per generator" requirement is replaced by "One
  large card per generator, including the dice tray" (four cards instead
  of three), while still showing no card for dungeons.

## Impact

- Frontend only, no backend/API changes: `frontend/src/dice/` (new page,
  3D scene, physics setup, die geometries/results panel), `frontend/src/main.tsx`
  (new lazy route for `/dice`), `frontend/src/home/HomePage.tsx` (fourth card).
- New frontend dependency: a physics engine for `three.js` (e.g. a
  WASM-based rigid-body library), evaluated and pinned in `design.md`.
- `openspec/specs/home-hub/spec.md`: requirement text/scenarios updated for
  four cards instead of three.

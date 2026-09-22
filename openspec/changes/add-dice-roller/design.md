## Context

`/dice` is a new frontend-only page (see proposal.md - Why/Impact). It joins
`/maps`, `/planets`, `/systems`, `/dungeons` as a lazy-loaded route in
`frontend/src/main.tsx`, and is the fourth home-page card (`home-hub` delta).
Unlike every other page, its output is intentionally not reproducible from a
seed (see proposal.md - What Changes), so it needs no API endpoint and no
change to `backend/`. The frontend already depends on `three.js` (used by
`PlanetScene.tsx`/`SystemScene.tsx`) but has no physics engine yet.

## Goals / Non-Goals

**Goals:**
- Drop-in rigid-body physics for convex polyhedral dice (tetrahedron through
  icosahedron, plus a "coin" and a triangular prism) that settles reliably
  onto a flat face, at interactive frame rates for a few dozen dice.
- A clean mapping from each die's geometry to its face values, so reading a
  result is a matter of finding which face is "up," not guessing from shape.
- A roll flow that can't hang the page: a hard cap on settle time.

**Non-Goals:**
- Deterministic/seeded rolls (explicitly ruled out by the proposal).
- Multiplayer/shared tray state, roll history, or persistence - single
  session, in-memory only.
- Modifier math (advantage, "roll d20+5", dice pools with success-counting).
  This change reports raw face values and a plain sum; anything more belongs
  to a later change.
- A backend endpoint - nothing here is served or validated by `Mundus.Api`.

## Decisions

### Physics engine: `@dimforge/rapier3d-compat`
Dice need real convex-hull colliders (not just boxes/spheres) for d4/d8/d10/
d12/d20 and the d3 prism to tumble and settle believably, plus stable
many-body collision resolution so a tray of a dozen dice doesn't jitter
forever.

- **Rapier** (WASM, Rust-based): built-in convex hull colliders, mature
  continuous collision detection, actively maintained, and used successfully
  alongside three.js elsewhere. Trade-off: pulls in a WASM asset, only loaded
  on `/dice` (already the project's pattern of not shipping 3D/physics code
  to the hub or other pages).
- **Alternative considered - `cannon-es`**: pure JS, no WASM load, and also
  supports convex polyhedra (`ConvexPolyhedron`). Lighter to load, but the
  project (a community-maintained fork of the unmaintained `cannon.js`) is
  less actively developed and its convex-convex solver is less robust for
  many simultaneous irregular shapes, which matters once several d4/d8/d12/
  d20 are thrown together. Rejected in favor of Rapier's more robust solver.
- **Alternative considered - hand-rolled physics**: rejected outright; a
  correct, stable rigid-body/collision solver is exactly what an off-the-
  shelf engine exists for, and dice physics has no project-specific twist
  that would justify writing one.

### Die geometries and face-value mapping
Each die type (d2, d3, d4, d6, d8, d10, d12, d20, and the d10 pair backing
d100) is built once as a `three.js` convex geometry with a fixed array
mapping face index (or vertex index, for the d2 coin's two flat faces) to its
printed value, matching standard RPG numbering (e.g. opposite faces of a d6
sum to 7). The same vertices, converted to a Rapier convex-hull collider,
drive the physics body - visual mesh and collider stay in lockstep by
construction, so there's one source of truth per die type, not one for
looks and one for physics.

- d2: a flattened hexagonal-prism "coin" with two large flat faces (1/2, or
  heads/tails) and a thin rim, so it can only rest on one of the two faces.
- d3: a triangular prism; only its three rectangular side faces are eligible
  resting faces (the two triangular ends are excluded from the "which face
  is up" check), giving three fair outcomes.
- d4/d6/d8/d10/d12/d20: standard convex polyhedra; the resting face is the
  physically-modeled face touching the floor.
- d100: two ordinary d10 rigid bodies - one printed 00/10/.../90, one printed
  0-9 - thrown as a pair and always presented, removed and read together as
  one entry in the tray's UI, per the `dice-roller` spec's requirement that
  it behaves as "its own single die."

### Settling detection and the result read
A die counts as settled once its linear and angular velocity stay below a
small threshold for a short number of consecutive physics steps (debounced,
so a momentary near-stop mid-tumble doesn't count). Once settled, its value
is read by taking, among that die's eligible faces (all faces for most dice;
the two ends excluded for the d3), the one whose current world-space normal
has the largest upward (+Y) component - i.e., the face most nearly facing
the sky is the resting face.

A tray-wide **settle timeout** starts when a roll is thrown. Any die still
not settled when it elapses is snapped to its current nearest-eligible-face
orientation and zeroed out kinematically, guaranteeing the roll always
finishes (see `dice-roller` spec - "A stuck die still resolves").

### Throw impulses
The roll action gives each die in the tray a randomized initial
velocity/angular velocity (magnitude and direction randomized per die, not
shared), so all dice launch together as one physics event but don't move in
lockstep. The random source is the ordinary JS `Math.random()` - no seeding,
consistent with the "genuinely random, not reproducible" requirement.

## Risks / Trade-offs

- [Risk] A convex-hull collider can rest exactly on an edge/vertex
  (indeterminate face) under contrived starting conditions. → Mitigation:
  slight randomized torque on every throw makes a landing that is
  perfectly edge-balanced practically impossible, and the settle timeout's
  snap-to-nearest-face guarantees a well-defined face even if it happens.
- [Risk] Loading Rapier's WASM module adds a network/parse cost the first
  time `/dice` is visited. → Mitigation: it's lazy-loaded only on that
  route, same as `three.js`'s existing 3D pages are already excluded from
  the hub bundle.
- [Risk] Many dice thrown together (say, a dozen+) could tank frame rate on
  low-end hardware. → Mitigation: fixed physics timestep independent of
  render rate, and a practical cap on simultaneous dice enforced by the UI
  (exact number decided in tasks/implementation, not spec-relevant).
- [Trade-off] No reproducibility means a roll can never be shared or replayed
  by URL, unlike every other Mundus page. This is intentional (proposal.md -
  Why) and matches how a physical dice tray behaves.

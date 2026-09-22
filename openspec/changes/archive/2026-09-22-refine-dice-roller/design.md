## Context

The current implementation (`frontend/src/dice/dieTypes.ts`, `DiceScene.tsx`,
`DicePage.tsx`) builds every die's mesh and its Rapier convex-hull collider
from the same raw vertex list, and reads a settled die's value by finding
which of its hand-picked "eligible face" normals points most nearly straight
up (see the archived `add-dice-roller` design.md). None of that changes here;
this change adds markings, colour, individual throws, shake, and history on
top of it. See proposal.md for the full list of changes.

## Goals / Non-Goals

**Goals:**
- Numbers/pips that are actually part of the die's geometry (rotate and
  settle with it), not a 2D overlay.
- A visual identity per die (colour, name) that survives that die's own
  throws, independent of every other die in the tray.
- A throw that can target one die without touching the rest of the physics
  world's state.

**Non-Goals:**
- A mathematically perfect planar pentagonal trapezohedron for the d10 (see
  Decisions - flat shading achieves the same *look* without re-deriving the
  shape's proportions).
- Cloud/account sync for the roll history - it lives in this browser only,
  like everything else on this page.
- Any change to the physics model, settle detection, or the timeout
  fallback from `add-dice-roller` - only what's thrown and when changes.

## Decisions

### Numerals and pips: small decal planes, not UV-mapped face textures
The die shapes here are too varied (triangles, quads, pentagons, a cube's
squares, a kite) to share one UV layout, and re-deriving a per-face UV
unwrap for each would be a lot of fragile geometry work for a purely
cosmetic feature. Instead, for every eligible face, a small flat plane
("decal") carrying a canvas-drawn texture (a digit, a pip pattern, or a
circle/cross for the d2) is positioned at that face's centre and offset
a hair outward along its normal, rotated to lie flush against it, and
parented under the die's own mesh so it moves and settles with it for
free. This is the same "canvas texture on a plane" technique already used
elsewhere in the app (planet surfaces, cave floor texture) applied per
face instead of once per object.

- Digits are drawn on an offscreen canvas with a bold sans-serif font; a 6
  or a 9 gets an extra short underline stroke beneath it before the texture
  is captured, baked into the same texture rather than a separate mesh.
- A d6's pips are drawn as filled circles in the traditional per-value
  layout, on the same kind of decal, one per face.
- A d2's two decals are the circle/face (value 1) and a cross (value 0);
  its rim carries no decal (nothing prints there - see the d2 section
  below for how "2" is read on the edge outcome instead).
- A d100's tens decals and units decals are drawn with two different fixed
  text colours (dark, light) baked into their textures.

*Alternative considered:* true UV-mapped textures baked into each die's
main material. Rejected: building a correct per-shape UV unwrap for a
dodecahedron, an icosahedron and a hand-built trapezohedron is real
geometry work for a cosmetic feature decals get for free from being
independent little planes.

### The d10's kite faces: flat shading, not solved-for planarity
A pentagonal trapezohedron's kite faces (see `add-dice-roller`'s d10) are
only exactly planar for a specific height/radius ratio; solving for it
turns the die visibly spikier than a real d10 (checked: forcing planarity
with this shape's fixed radius pushes the apex height to roughly 9x the
ring offset, far taller than a real d10 looks). Rather than chase that
proportion, each kite's 4 vertices are given one shared, uniform normal
(that face's centre-direction, already computed for the settle-read) instead
of the smoothed per-vertex normals `computeVertexNormals()` produces. Flat,
uniform-normal shading makes a face read as one flat plane to the eye
regardless of the small bend between its two triangles - the same trick
flat-shaded low-poly models use everywhere - so the "not two triangles"
goal is met visually without changing the die's proportions or its physics.

### The d2's third outcome: reading "on its edge"
Today's d2 only ever tests its two flat-face normals against world-up and
always picks the larger. To make "resting on the edge" a real, detectable
outcome: if *neither* flat face's normal is within a threshold angle of
straight up when the coin settles (both are closer to horizontal - i.e. the
coin is standing on its rim), the result is read as 2 instead of 0 or 1. The
coin's rim is given a bit more height (thickness) than before, purely so
balancing on it is physically plausible rather than nearly the
zero-probability event it would be on a razor-thin edge; it is still the
rarest of the three outcomes, as a real coin flip's edge-landing is.

### Marbled texture
A small tileable canvas texture (a soft, veined noise pattern - built the
same way as `caveRender.ts`'s speckle-tile helper, generalized further to
support smooth blotches instead of only hard speckles) is multiplied over
each die's base colour, the same "cheap procedural canvas texture" approach
already established in this codebase rather than a new dependency.

### Colour palette and per-die identity
A fixed, curated list of ~12 pleasant, distinguishable colours is defined
once; each new die is assigned the next colour in the list *not already
used by a die of the same kind currently in the tray* (falling back to
cycling through the list once every colour is in use for that kind). The
tray's colour control is a plain HTML `<input type="color">` per entry,
pre-filled with the assigned colour, changing the die's material colour
live (re-tinting its base colour; its numeral/pip decals keep their own
fixed dark/light ink so they stay legible against any base colour chosen).
The editable label is a plain text input alongside the (non-editable) kind
name already shown; both are kept in the tray's per-entry state.

### Throwing a single die
`DiceScene`'s imperative handle gains `throwOne(trayId)`, applying the same
randomized linear/angular velocity `roll()` gives every die, but to only
that trayId's physical body/bodies (both halves, for a d100). Clicking a
die in the 3D tray reuses the same pointer-based raycasting `SystemScene.tsx`
already uses to pick a planet - a `pointerdown`/`pointerup` pair with a
movement threshold (so a drag-to-orbit isn't mistaken for a click), then
`Raycaster.intersectObjects` against the tray's die meshes, mapping a hit
mesh back to its trayId via a small lookup already needed for `remove()`.
A die mid-throw is excluded from hit-testing (and its tray-row throw
control disabled) until it settles, reusing the existing per-die `settled`
flag from `add-dice-roller`.

Because a die can now settle **on its own**, independent of the tray-wide
"rolling" flag, per-die value tracking moves from "the last roll's results"
(a single batch, all dice reported together) to "each die's own last known
value," recomputed into a live total whenever any one die settles - see the
`dice-roller` spec's revised "Roll total" requirement.

### Shake to roll
`window.DeviceMotionEvent` is used where available: the combined magnitude
of `event.acceleration` (falling back to `accelerationIncludingGravity` on
devices that don't report gravity-free acceleration) is tracked over a
short rolling window, and a shake is detected when it crosses a threshold
significantly above normal handling jitter, debounced so one shake doesn't
fire the roll repeatedly. iOS requires an explicit, user-gesture-triggered
call to `DeviceMotionEvent.requestPermission()` before any motion events
are delivered; the page shows a small "Enable shake to roll" control the
first time it detects that permission is needed (i.e., the API exists and
is a function), and silently attaches the listener directly everywhere else
(desktop browsers with no motion sensor simply never fire the event, so no
platform check is needed there).

### Roll history storage
A capped array (newest first, sliced to 100) is kept in `localStorage`
under a single key, read once on mount and written after every settle.
Each entry: `{ at: <ISO 8601 string>, dice: [{ kind, label, value }], total
}`. "Download" serializes the whole array with `JSON.stringify(..., null,
2)` and triggers a save via a `Blob` + a temporary `<a download>`, the same
pattern `App.tsx`'s map "Download" control already uses for the map image.

## Risks / Trade-offs

- [Many small decal meshes per die (up to 20 for a d20) multiply the
  scene's object count once several dice are in the tray] → Decals are
  simple planes with a tiny shared geometry (only their texture and
  transform differ per face), cheap to render; the existing MAX_DICE cap
  bounds the worst case.
- [A curated 12-colour palette can still repeat once more than 12 dice of
  one kind are summoned] → Acceptable: the tray already caps total dice
  well below a count where this would matter for any one kind in practice,
  and the colour picker lets a person tell two same-coloured dice apart by
  hand regardless.
- [Shake-to-roll false positives from normal phone handling] → The
  detection threshold and debounce are tuned during implementation against
  real handling motion, not just deliberate shakes; this is inherently a
  "tune by feel" control, not one a spec can pin an exact number to.
- [`localStorage` has no cross-device or cross-browser sync] → Intentional,
  matching the rest of this page's "nothing here is reproducible or
  shared" design (see `add-dice-roller` proposal.md - Why).

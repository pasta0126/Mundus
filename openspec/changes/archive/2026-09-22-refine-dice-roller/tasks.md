## 1. Remove d3

- [x] 1.1 Remove `d3` from `DIE_KINDS`, `dieTypes.ts` (drop `buildD3`), and every UI reference (labels, summon buttons) in `DicePage.tsx`

## 2. Numeral and pip decals

- [x] 2.1 Build a generic decal helper: a canvas texture on a small plane, positioned at a face's centre and offset along its normal, oriented flush against the face, parented under the die's mesh
- [x] 2.2 Digit texture generator (bold numeral), with an underline baked in for 6 and 9
- [x] 2.3 Pip texture generator for a d6's traditional 1-6 dot layouts
- [x] 2.4 d2 decals: a circle (value 1) and a cross (value 0) on its two flat faces
- [x] 2.5 d100 pair: bake the tens die's numerals in a dark shade and the units die's in a light shade
- [x] 2.6 Wire a decal onto every eligible face of d4 (near the face's base), d6 (pips), d8, d10, d12, d20, and the d100 pair

## 3. d10 shading and the d2's edge outcome

- [x] 3.1 Assign each d10 kite face's own centre-direction as a uniform normal for all 4 of its vertices (flat shading), replacing `computeVertexNormals()` for this shape
- [x] 3.2 Thicken the d2's rim slightly; extend its settle-read to detect "resting on edge" (neither flat face's normal near vertical) and report 2

## 4. Marbled texture

- [x] 4.1 Build a marbled-noise tile generator (smooth blotches, not hard speckles), generalizing `caveRender.ts`'s speckle-tile helper
- [x] 4.2 Multiply the marble tile over every die's base colour material

## 5. Per-die colour and name

- [x] 5.1 Define the curated colour palette and the rotate-per-kind assignment used when a die is summoned
- [x] 5.2 Add a way to re-tint a live die's base colour without rebuilding its mesh/body
- [x] 5.3 Tray UI: an `<input type="color">` per entry, pre-filled with its assigned colour, wired to re-tint
- [x] 5.4 Tray UI: an editable text label per entry next to its fixed kind name (e.g. "D6" + "Attack" shown as "D6 Attack")

## 6. Throwing a single die

- [x] 6.1 `DiceScene`: add `throwOne(trayId)` to the imperative handle, applying a throw to just that trayId's body/bodies
- [x] 6.2 Click/tap-to-throw: raycast against die meshes on a non-dragging pointerdown/up (reusing `SystemScene.tsx`'s picking pattern); ignore a die that's already airborne
- [x] 6.3 Tray UI: a per-row throw control, disabled while that die is airborne
- [x] 6.4 Move value tracking from one roll's batch results to each die's own last-known value, recomputed into a live total whenever any die settles (whole-tray roll or a single throw)

## 7. Shake to roll

- [x] 7.1 Detect a shake via `DeviceMotionEvent` (acceleration magnitude over a rolling window, debounced) and trigger the same throw-everything path as "Roll"
- [x] 7.2 iOS: show an "Enable shake to roll" control when `DeviceMotionEvent.requestPermission` exists, calling it from that tap before attaching the listener

## 8. Roll history

- [x] 8.1 A capped (100), newest-first history store backed by `localStorage`
- [x] 8.2 Append an entry (dice, values, total, date/time) whenever a throw - whole-tray or single-die - settles
- [x] 8.3 History panel UI listing recent entries, and a "Download" control that saves the full history as a JSON file

## 9. Verify and release

- [x] 9.1 Manually verify every die kind's markings (pips, numerals, 6/9 underline, d100 dark/light) and that the d2 can land on 0, 1 and (with enough tries) 2
- [x] 9.2 Manually verify per-die colour and name editing, throwing a single die (both the tray control and clicking it in the 3D view) without disturbing the rest of the tray, and the roll history persisting across a reload and downloading correctly
- [x] 9.3 Run frontend type check, lint and build
- [x] 9.4 Bump the semver (minor) and tag the commit

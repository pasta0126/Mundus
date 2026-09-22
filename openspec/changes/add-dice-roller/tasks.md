## 1. Dependencies and scaffolding

- [ ] 1.1 Add `@dimforge/rapier3d-compat` to `frontend/package.json`
- [ ] 1.2 Create `frontend/src/dice/` and add `DicePage.tsx` as the route's entry component
- [ ] 1.3 Register `/dice` as a new lazy route in `frontend/src/main.tsx`, following the existing `PlanetsPage`/`SystemsPage` lazy-import pattern

## 2. Die geometries and face mapping

- [ ] 2.1 Build the d6, d4, d8, d12, d20 convex geometries with a face-index → printed-value map matching standard RPG numbering (opposite faces of a d6 sum to 7)
- [ ] 2.2 Build the d10 geometry and its two face-value variants (units 0-9, tens 00/10/.../90) for the d100 pair
- [ ] 2.3 Build the d2 "coin" geometry (two flat faces + rim) and its two-value map
- [ ] 2.4 Build the d3 triangular-prism geometry, marking its three rectangular side faces as the only eligible resting faces
- [ ] 2.5 Derive each die type's Rapier convex-hull collider from the same vertex data used for its `three.js` mesh

## 3. Physics scene

- [ ] 3.1 Set up the `three.js` scene and camera for the tray (floor + walls), reusing the project's existing 3D-scene setup conventions from `PlanetScene.tsx`/`SystemScene.tsx`
- [ ] 3.2 Initialize the Rapier physics world (gravity, fixed timestep) and static rigid bodies for the tray's floor and walls
- [ ] 3.3 Wire the render loop to step physics on a fixed timestep and sync each die's mesh transform from its rigid body every frame

## 4. Tray controls: summon, remove, clear

- [ ] 4.1 Add a control to summon a die of a chosen type (d2, d3, d4, d6, d8, d10, d12, d20, d100) into the tray at rest, without triggering a throw
- [ ] 4.2 Support multiple simultaneous dice, including repeats of the same type, each tracked as an independent rigid body + mesh pair (the d100 pair tracked as one tray entry backed by two rigid bodies)
- [ ] 4.3 Add per-die removal and a "clear tray" control, both disabled while a roll is in progress
- [ ] 4.4 Decide and enforce a practical maximum number of dice in the tray at once (per design.md - Risks/Trade-offs)

## 5. Rolling and settling

- [ ] 5.1 Implement the roll action: apply a randomized (unseeded) initial velocity/angular velocity to every die currently in the tray as one event
- [ ] 5.2 Implement per-die settle detection (linear/angular velocity below threshold for consecutive steps)
- [ ] 5.3 Implement the tray-wide settle timeout: any die not settled when it elapses is snapped to its nearest eligible-face orientation and zeroed out kinematically
- [ ] 5.4 Disable summon/remove/clear controls while a roll is in progress, per the `dice-roller` spec

## 6. Reading and displaying results

- [ ] 6.1 Implement the "resting face" read: among a die's eligible faces, pick the one with the largest upward-facing world-space normal component
- [ ] 6.2 Implement the d100 pair's combined value from its two settled d10 bodies (tens + units)
- [ ] 6.3 Show each die's value next to it once its roll has settled
- [ ] 6.4 Compute and display the roll's total (sum of all dice values in that roll) once every die in the roll has settled
- [ ] 6.5 Ensure a die removed/cleared before a roll is excluded from the next roll's results and total

## 7. Home hub integration

- [ ] 7.1 Add the fourth ("Dice") card to `frontend/src/home/HomePage.tsx`, with its own icon, one-line description and pastel tint, laid out in four columns (stacking on narrow windows)
- [ ] 7.2 Verify the hub still shows no card for dungeons and still makes no generation/network request on load

## 8. Polish and verification

- [ ] 8.1 Verify all user-facing text on `/dice` is in English
- [ ] 8.2 Manually verify: summon a mix of dice types (including d100 and d3), roll, confirm every die settles within the timeout and values/total are shown
- [ ] 8.3 Manually verify a die stuck mid-tumble still resolves once the settle timeout elapses
- [ ] 8.4 Run `npm run build`/existing frontend checks to confirm the new route and dependency don't break the build

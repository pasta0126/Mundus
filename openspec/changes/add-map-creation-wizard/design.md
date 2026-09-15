## Context

See proposal.md - Why. Builds on the existing frontend scaffold (React +
Vite + TS, Tailwind, shadcn/ui, Framer Motion, the generated
`api.GET('/api/Maps', ...)` client) and the `map-generation` API. No
backend changes.

## Goals / Non-Goals

**Goals:**
- A wizard state shape simple enough to reason about (no external state
  library), with clean back/forward semantics.
- A single, reusable canvas renderer that works for both grid types.

**Non-Goals:**
- Persistence, sharing, URL-encoded state (see proposal.md Non-Goals).
- Pan/zoom - the whole map is scaled to fit the canvas viewport, however
  large.

## Decisions

- **Wizard state**: one `WizardState` object
  (`{ seed, gridType, sizePreset, shapeArchetype }`, all optional except
  once selected) held in a single `useState` in a top-level
  `MapCreationWizard` component, plus a `step: number` (0-4) also in
  `useState`. Each step is its own component receiving the current value
  and a setter; "Next"/"Back" just move `step` by ±1 - trivial to
  implement and exactly matches the spec's "preserve selections" and
  "fixed order" requirements without a state machine library.
- **Random seed**: if the Seed step is left blank, a random seed is
  generated (e.g. from `crypto.randomUUID()` or a timestamp+random
  string) at confirmation time, not at Seed-step-render time - avoids the
  seed silently changing on every re-render while the user is still on
  that step.
- **View state**: a top-level union - `wizard` (show
  `MapCreationWizard`) | `loading` | `error` | `result` (show the
  rendered map + a "Back to wizard" action) - held alongside the wizard
  state in the same parent component (`App.tsx`), not inside the wizard
  itself, since "return to wizard, keeping selections" means the wizard
  state must outlive the result view.
- **Canvas renderer (`MapCanvas`)**: plain `<canvas>` + 2D context, no
  library (per the size/complexity of maps in scope - up to 256x256
  cells - a library's overhead isn't justified yet; revisit if a future
  change needs pan/zoom or many more cells).
  - Square cells: a plain grid, cell size = `min(canvasWidth/mapWidth,
    canvasHeight/mapHeight)`.
  - Hex cells: flat-top hexagons is a reasonable default for a top-down
    "table map" look; alternating rows offset horizontally by half a
    cell width to match `GridNeighbors`' even/odd row scheme on the
    backend (purely visual - the backend's offset convention has no
    wire-format significance to the frontend, which only needs its
    rendering to be internally consistent, so the exact backend row
    parity doesn't need to match pixel-for-pixel).
  - Biome color: one fixed color per `Biome` value (a small lookup
    table), not a generic categorical palette - players expect specific,
    recognizable colors (blue ocean, green forest, tan desert, etc.), not
    an arbitrary hue rotation.
  - Elevation shading: multiply the biome color's lightness by a factor
    derived from elevation (e.g. `0.6 + 0.4 * elevation`), so higher
    cells of the same biome read as visually "raised" without changing
    biome identification.
- **Error handling**: the generated `api.GET(...)` call's `error` result
  (see `frontend/src/api/client.ts`, already used this way in `App.tsx`
  for `world-generation`) sets `error` view state directly - no retry
  logic in this change.

## Risks / Trade-offs

- [Risk] Canvas redraw is a plain full-redraw on every render, not
  incremental. → Accepted: map generation happens once per Review
  confirmation, not on every keystroke, so this is cheap in practice even
  at 256x256 cells.
- [Risk] Flat-top hex rendering with a fixed even/odd offset direction
  might look subtly different from how someone visualizing the backend's
  actual adjacency graph would expect. → Accepted per the decision above
  - purely cosmetic, no correctness impact.

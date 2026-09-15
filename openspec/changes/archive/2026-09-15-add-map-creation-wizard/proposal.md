## Why

`map-generation` exists and is deployed, but the frontend still only shows
a `World` text card - there is no way for a person to actually choose a
grid type, size, and shape archetype and see the resulting map. This
change is the frontend capability that turns the API into something
usable: a step-by-step wizard to collect the generation parameters, and a
canvas renderer that draws the resulting grid as an actual 2D top-down
map.

## What Changes

- Introduce the `map-creation-wizard` capability: a five-step wizard
  (Seed -> Grid Type -> Size Preset -> Shape Archetype -> Review) with
  forward/back navigation that preserves every previously made selection,
  calling `GET /api/Maps` only once, on final confirmation.
- Introduce map rendering: an HTML canvas that draws the generated grid
  (square or hex cells) colored by biome and shaded by elevation.
- After viewing a generated map, the user can return to the wizard with
  all prior selections intact to try a different seed or parameters.
- Replace the current placeholder `World` card UI with this flow as the
  app's main screen.

## Non-Goals

- Saving, sharing, or persisting generated maps (no user accounts yet).
- Zoom/pan or any interaction beyond viewing the rendered map.
- Editing map parameters via URL/query string (state lives in the React
  component tree only for this change).

## Capabilities

### New Capabilities
- `map-creation-wizard`: a multi-step parameter wizard (with back/forward
  navigation preserving selections) plus canvas rendering of the
  resulting map, calling the existing `map-generation` HTTP API.

### Modified Capabilities
(none - `map-generation`'s API and `world-generation` are unchanged,
consumed as-is)

## Impact

- Affected code: `frontend/src/` - replaces `App.tsx`'s current World-card
  content with the wizard + map view; adds wizard step components and a
  canvas rendering component.
- No backend changes.

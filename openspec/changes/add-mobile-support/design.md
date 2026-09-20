## Context

The layout was designed for a desktop: fixed panels at the top left, controls that
do nothing until clicked, and information that appears on hover. Two canvases
carry the interaction (the map's terrain and icon layers, and the dungeon plan)
and the icon canvas is deliberately click-through, with hover tracked on the
window. The map itself has no drag or pinch: it moves by buttons. The 3D pages use
three.js, whose orbit controls already handle touch. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Every page usable one-handed on a phone, with no notice needed.
- One interaction model (pointer events) that serves mouse and touch.

**Non-Goals:**
- A native app, offline mode, or a separate mobile site.
- Redesigning the visuals beyond what fitting a small screen needs.

## Decisions

**Pointer events for everything on the canvases.** Drag, pinch and tap are built on
pointer events (with pointer capture), not separate mouse and touch handlers, so
one implementation covers a mouse, a finger and a stylus. *Alternative:* a gesture
library - to be weighed when work starts; the map needs only pan, pinch and tap.

**Panels become sheets under a width breakpoint.** Above it they stay as they are;
below it a single button opens the panel as a bottom or side sheet over a dimmed
map. Layers and legend become sections of that sheet. This keeps the desktop
layout untouched.

**A tap reveals, a second action commits.** A tap shows the same tooltip content as
hover, in a small card with an "Enter" control for dungeons. The card is dismissed
by tapping elsewhere. This protects against accidental navigation and reuses the
tooltip content.

**Pinch maps onto the existing zoom steps.** The map's zoom is a fixed list of
steps that re-fetch data; a pinch does not scale continuously but crosses a
threshold and moves one step, with the current view kept while the new one loads.

## Risks / Trade-offs

- [Loading a full-viewport map is heavy on a phone: hundreds of thousands of cells
  per view, decoded and drawn] → Measure early on a real device; if needed, lower
  the sampled window on small screens or the device pixel ratio used by the canvas.
- [Dragging and tapping compete on the same canvas] → A movement threshold decides;
  the same rule already protects dungeon clicks on the desktop.
- [Bottom sheets and the browser's own address bar changing height] → Use dynamic
  viewport units and test on iOS Safari and Android Chrome.

## Open Questions

- Which minimum device is supported (screen width, browser versions)?
- Is landscape on a phone a first-class layout or only tolerated?

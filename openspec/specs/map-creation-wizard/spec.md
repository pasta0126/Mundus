# map-creation-wizard Specification

## Purpose
Let a person choose map generation parameters through a guided,
correctable multi-step flow, and see the resulting map rendered as an
actual 2D grid, so generating "a map like Middle-earth" is a few clicks
instead of hand-crafting a URL.

## Requirements

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of the current window on an HTML
canvas as a square grid, each cell filled with a flat, soft pastel color
determined solely by its biome - no shading, texture, or decorative
border. Cells of the same biome SHALL use the same color; cells of
different biomes SHALL be visually distinguishable from one another.
The canvas SHALL fill the full browser viewport as the page's
background layer; every other UI element (params panel, pan/zoom
controls) SHALL render above it as an overlay, never pushing it into a
bounded card or leaving empty page background beside it.

#### Scenario: Every cell is rendered
- **WHEN** a window is generated
- **THEN** the canvas renders the full window, with no cell of the
  returned window omitted from rendering

#### Scenario: Different biomes are visually distinguishable
- **WHEN** a rendered window contains cells of more than one biome
- **THEN** each biome is drawn in its own distinct flat color

#### Scenario: The map fills the viewport
- **WHEN** a window is rendered on any screen size
- **THEN** the canvas spans the full browser viewport width and height,
  with no visible page background outside it

#### Scenario: UI overlays the map instead of displacing it
- **WHEN** the params panel or pan/zoom controls are shown
- **THEN** they render on top of the full-viewport canvas rather than
  in a separate layout region that shrinks or pushes it aside

#### Scenario: Grid type determines cell layout
- **WHEN** any window is rendered
- **THEN** cells are always laid out as a plain square grid; there is no
  alternate grid type to choose or render

#### Scenario: Coastlines are smoothed, not stair-stepped
- **WHEN** two adjacent cells in a rendered window have different biomes
- **THEN** the boundary between them is each cell's own raw edge, with
  no smoothing curve applied - a single traced "coastline" is no longer
  a distinct concept once a window can contain many biome boundaries

#### Scenario: Ocean has a wave texture
- **WHEN** a rendered window contains `Ocean` cells
- **THEN** they are filled with a flat pastel color; no wave-line texture
  is applied

#### Scenario: The map is framed
- **WHEN** a window is rendered
- **THEN** no decorative border or frame is drawn around the grid

### Requirement: Post-generation actions
After a window is rendered, the system SHALL offer exactly two actions:
Regenerate (generate a new window immediately, with a new random seed,
centered back on `(0, 0)` at the default zoom level) and Download (save
the currently rendered window, including every currently visible overlay
layer - see `map-layers` - as a PNG image file). Both actions SHALL be
shown as equally-prominent controls (e.g. filling the available width of
their row rather than sizing to their label) and SHALL each carry an icon
alongside their label, consistent with every other control in the UI (pan,
zoom, copy seed, go to coordinates).

#### Scenario: Regenerate produces a new map without leaving the result view
- **WHEN** a user, after viewing a generated window, chooses "Regenerate"
- **THEN** a new window is generated with a new random seed, centered on
  `(0, 0)` at the default zoom level, and the view updates to show it

#### Scenario: Restart wizard clears all selections
- **WHEN** a user looks for a "Restart wizard" action
- **THEN** none exists - there is no wizard to restart; "Regenerate" is
  the only way to get a different seed

#### Scenario: Download saves the rendered map as an image
- **WHEN** a user, after viewing a generated window, chooses "Download"
- **THEN** a PNG image file is saved to the user's device containing the
  biome grid plus every overlay layer currently visible on screen (and
  excluding every hidden overlay layer), named with the values needed to
  reproduce that exact view (seed, origin `x`/`y`) plus a
  year-month-day-ordered timestamp, rather than a fixed generic filename

### Requirement: Progress and status feedback
The system SHALL show visible progress and status feedback for every
asynchronous action (the automatic initial load, panning, zooming,
regenerating, downloading), so the user is never left without an
indication of what is currently happening. Feedback SHALL include both
a progress indicator and a descriptive status message. When a view is
loaded from more than one underlying request (see "Tiled, progressive
window loading"), the progress indicator SHALL reflect the fraction of
those requests completed so far, not just an indeterminate "in
progress" state.

#### Scenario: Generating shows progress and a status message
- **WHEN** a window request (initial load, a pan, a zoom, or a
  regenerate) is in flight
- **THEN** a progress indicator is visible along with a message
  describing that the map is loading

#### Scenario: Progress reflects completed chunks, not just in-flight/done
- **WHEN** a view's window is being loaded as several chunk requests and
  some, but not all, have completed
- **THEN** the progress indicator's value reflects the completed
  fraction (e.g. roughly half-full at the halfway point), rather than
  staying at a fixed placeholder value until everything finishes

#### Scenario: Rendering shows a status message
- **WHEN** a returned window is being drawn to the canvas
- **THEN** drawing completes synchronously as part of the same loading
  state (flat per-cell fills are cheap enough to draw immediately); no
  separate rendering-specific message is shown

#### Scenario: Failure feedback is descriptive
- **WHEN** any asynchronous action fails
- **THEN** the user is shown a message describing that it failed, not
  just a silent lack of progress

### Requirement: All user-facing text is in English
Every piece of user-facing text in the application (labels, buttons,
messages, page title) SHALL be in English.

#### Scenario: No non-English user-facing text
- **WHEN** inspecting any screen of the application
- **THEN** every piece of user-facing text on it is in English

### Requirement: Jumping to a specific coordinate
After a window is rendered, the system SHALL let the user enter a
specific `x`/`y` world coordinate and jump directly there: the current
zoom step's full viewport-covering window SHALL be recalculated,
centered on the entered coordinate, using the same seed. This is
independent of panning (which shifts by a fixed step) and of the
default starting position (which SHALL remain `(0, 0)` on Regenerate, and on
initial load when the URL names no centre).

#### Scenario: Going to a coordinate recenters the view there
- **WHEN** a user, after viewing a generated window, enters an `x` and a
  `y` value and confirms
- **THEN** a new window request is made for the same seed and the
  current zoom step's cell size, centered on the entered coordinate,
  and the canvas updates to show the response

#### Scenario: Going to a coordinate preserves the seed and zoom step
- **WHEN** a user jumps to a coordinate
- **THEN** the seed and the on-screen cell size used for the new window
  request are unchanged from the current view

#### Scenario: Initial load and Regenerate still default to the origin
- **WHEN** the map page loads with no centre in its URL, or a user chooses "Regenerate"
- **THEN** the resulting window is centered on `(0, 0)`, regardless of
  any coordinate previously jumped to

### Requirement: Automatic generation on load
On load of the map page (`/maps`), the system SHALL immediately request the
window for the view named by the URL from the `map-generation` API, without
requiring any user input. When the URL carries no seed, it SHALL use a
randomly generated seed, centre the view on `(0, 0)` at the default zoom, and
write that seed into the URL. No seed, position, or other parameter is
collected from the user beforehand. Opening any other page, including the
home page, SHALL NOT generate a map.

#### Scenario: Loading the page generates a map without user input
- **WHEN** the map page (`/maps`) loads with no seed in the URL
- **THEN** exactly one window request is made for a window centered on
  `(0, 0)` using a freshly generated random seed, that seed appears in the
  URL, and the rendered result reflects the response once it arrives

#### Scenario: Loading the map page with a seed reproduces that view
- **WHEN** `/maps` loads with a seed in the URL
- **THEN** the window requested is the one for that seed, centre and zoom, not a random one

#### Scenario: A failed initial generation is shown, not silently dropped
- **WHEN** the automatic initial map-generation request fails
- **THEN** the user is shown that generation failed, with a way to
  retry

### Requirement: Panning the viewport
After a window is rendered, the system SHALL let the user shift the
visible window in any of the four cardinal directions (e.g. via
on-screen controls or arrow keys), each shift requesting a new window
from the `map-generation` API at the updated origin using the same seed,
and updating the canvas to show the newly returned cells once loaded.

#### Scenario: Panning shifts the visible window
- **WHEN** a user pans in a given direction after viewing a generated
  window
- **THEN** a new window request is made for the same seed at an origin
  shifted in that direction, and the canvas updates to show the response

#### Scenario: Panning preserves the seed
- **WHEN** a user pans
- **THEN** the seed used for the new window request is unchanged from
  the one used to generate the current window

### Requirement: Zooming through a fixed set of steps
The system SHALL default to the most zoomed-out step (the documented
minimum of 1 pixel per cell) on initial load and on Regenerate, so the
widest possible view of the world is what the user sees first. After a
window is rendered, the system SHALL let the user zoom in through a
small, fixed, documented sequence of steps - growing the on-screen cell
size at each step, up to a documented maximum - by requesting a new,
smaller-in-cells window centered on the same point using the same seed,
sized to cover the full viewport at that step's cell size (see "Tiled,
progressive window loading" for how a window that size is actually
fetched). The system SHALL let the user zoom back out through the same
steps, down to the default (most zoomed-out) cell size, and SHALL NOT
allow zooming out past the default or in past the largest step. A
window's cell count SHALL still be bounded by a documented safety
maximum far larger than any real display's needs at the smallest cell
size; only beyond that safety maximum MAY the rendered window cover
less than the full viewport, centered rather than stretched.

#### Scenario: Zooming in shows less of the map in more detail
- **WHEN** a user zooms in after viewing a generated window
- **THEN** a new window request is made for the same seed, covering
  fewer cells than the current window, and the canvas updates to show
  the response at a larger on-screen cell size

#### Scenario: Zoomed-out views cover the full viewport
- **WHEN** a user is at any documented zoom step, including the default
  most-zoomed-out step, on a real display
- **THEN** the rendered window covers the full browser viewport at that
  step's on-screen cell size, not a smaller square in the middle of an
  otherwise-empty page

#### Scenario: Zooming preserves the seed and view center
- **WHEN** a user zooms in or out
- **THEN** the seed used for the new window request is unchanged, and
  the new window is centered on the same point the current window was
  centered on

#### Scenario: Zoom range is bounded
- **WHEN** a user is at the default (most zoomed-out) cell size
- **THEN** no further zoom-out action is available
- **WHEN** a user is at the largest (most zoomed-in) cell size the
  system offers
- **THEN** no further zoom-in action is available

### Requirement: Tiled, progressive window loading
When the window needed to cover the viewport (at the current zoom
step) exceeds what a single `map-generation` request can efficiently
return, the system SHALL split it into multiple smaller chunk requests
covering the same overall area, issue them concurrently, and render
each chunk onto the canvas as it individually completes, rather than
waiting for every chunk before showing anything. A previously-rendered
view SHALL remain visible while a new one's chunks are still arriving,
only being replaced once the new view's first chunk has arrived.

#### Scenario: Chunks render as they arrive, not all at once
- **WHEN** a window is being loaded as multiple chunk requests
- **THEN** cells from a chunk that has already completed are visible on
  the canvas before every other chunk has completed

#### Scenario: The previous view persists until new data arrives
- **WHEN** a pan, zoom, or regenerate is triggered while a previous
  view is displayed
- **THEN** the previous view remains visible, unchanged, until the new
  view's first chunk arrives

#### Scenario: A total loading failure falls back to the last good view
- **WHEN** every chunk request for a pan, zoom, or regenerate fails, and
  a previously-rendered view exists
- **THEN** loading stops and the previous view remains displayed, rather
  than replacing it with an error screen

### Requirement: Layers panel
The system SHALL show a layers panel, overlaying the canvas consistent with
every other UI element (params panel, pan/zoom controls), listing every
overlay layer (see `map-layers`) with its current visibility and a control
to toggle it.

#### Scenario: The layers panel lists every overlay
- **WHEN** the layers panel is opened
- **THEN** it lists the compass rose, each points-of-interest category, and
  region borders, each with its own toggle

### Requirement: Biome legend display
The system SHALL show a legend of the biomes as an overlay, consistent with
every other UI element. Points-of-interest icons are not listed there: each
names itself on hover (see `points-of-interest`).

#### Scenario: The legend is visible alongside the map
- **WHEN** the legend is toggled on
- **THEN** the biome legend overlay is shown alongside the canvas

### Requirement: Touch-first devices are told the page is not optimized for them
On a phone or tablet - a device whose primary input is a touch screen -
the system SHALL show a small, dismissible notice above the controls block
saying the page is not optimized for phones or tablets yet. A computer with
a mouse or trackpad, including a touch-screen laptop, SHALL NOT see it.

#### Scenario: A phone sees the notice above the controls
- **WHEN** the page is opened on a touch-first device
- **THEN** a small notice appears above the controls block and can be dismissed

#### Scenario: A desktop does not
- **WHEN** the page is opened on a computer whose primary pointer is a mouse or trackpad
- **THEN** no such notice is shown

### Requirement: The map is served at its own route
The system SHALL serve the map page at `/maps`. The root `/` SHALL NOT show
the map (see `home-hub`).

#### Scenario: The map opens at /maps
- **WHEN** a person opens `/maps`
- **THEN** the map page is shown

### Requirement: The map view is kept in the URL
The map page SHALL take its view from the URL - `/maps?seed=&x=&y=&zoom=`,
where `seed` is the map's seed, `x` and `y` are the world coordinate at the
centre of the view and `zoom` is the number of one of the
documented zoom steps, as shown on the zoom indicator - so that reloading or sharing the URL reproduces the
same view, as the planet and system pages do. Whenever the seed, centre or
zoom changes (Regenerate, going to a coordinate, panning, zooming), the URL
SHALL be updated to match without adding a history entry for each change. A
missing or malformed `x`, `y` or `zoom` SHALL fall back to `(0, 0)` and the
default zoom respectively. A seed the map generation rejects as invalid SHALL
show a clear error rather than a blank page.

#### Scenario: A URL reproduces the view
- **WHEN** a person opens `/maps` with a seed, a centre and a zoom
- **THEN** the same view is shown as for anyone else opening that URL

#### Scenario: Moving updates the URL
- **WHEN** a person pans, zooms, jumps to a coordinate or regenerates
- **THEN** the URL shows the new seed, centre and zoom, and the browser's back button does not step through each change

#### Scenario: Malformed view parameters fall back to defaults
- **WHEN** the URL has a seed but a non-numeric `x` or a `zoom` that is not one of the documented steps
- **THEN** the view is centred on `(0, 0)` or at the default zoom for the missing values, and the seed is honored

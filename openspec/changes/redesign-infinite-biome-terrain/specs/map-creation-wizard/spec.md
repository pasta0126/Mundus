## MODIFIED Requirements

### Requirement: Fixed wizard step order
The system SHALL present exactly three steps, in this order: Seed, Start
Position, Review. Each step SHALL let the user choose that step's value
(Seed MAY be left blank to mean "generate a random seed"; Start Position
MAY be left at its default of `(0, 0)`). The Review step SHALL display
every previously chosen value and SHALL be the only step that triggers
generation.

#### Scenario: Steps appear in order
- **WHEN** the wizard starts
- **THEN** the first step shown is Seed, and advancing moves through
  Start Position and Review in that order, with no other step reachable
  in between

#### Scenario: Only Review triggers generation
- **WHEN** the user is on any step before Review
- **THEN** no terrain generation request has been made yet

### Requirement: Map generation on confirmation
The system SHALL request an initial window from the `map-generation` HTTP
API centered on the chosen start position, using the seed collected
across the wizard's steps (generating a random seed first if the Seed
step was left blank), triggered only when the user confirms on the
Review step.

#### Scenario: Confirming generates a map with the collected parameters
- **WHEN** the user confirms on the Review step after optionally
  choosing a seed and a start position
- **THEN** exactly one request is made to the map-generation API for a
  window centered on that start position, using that seed, and the
  rendered result reflects the response

#### Scenario: A failed generation request is shown, not silently dropped
- **WHEN** the map-generation request fails
- **THEN** the user is shown that generation failed and can return to the
  wizard without losing their prior selections

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of the current window on an HTML
canvas as a square grid, each cell filled with a flat, soft pastel color
determined solely by its biome - no shading, texture, or decorative
border. Cells of the same biome SHALL use the same color; cells of
different biomes SHALL be visually distinguishable from one another.
The canvas SHALL fill the full browser viewport as the page's
background layer; every other UI element (wizard, params panel, pan
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
- **WHEN** the wizard, params panel, or pan controls are shown
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
After a window is rendered, the system SHALL offer exactly three
actions: Regenerate (generate a new window immediately, with a new
random seed, viewing the same window dimensions centered back on
`(0, 0)`, without returning to any wizard step), Restart wizard (clear
every prior selection and return to the Seed step), and Download (save
the currently rendered window as a PNG image file).

#### Scenario: Regenerate produces a new map without leaving the result view
- **WHEN** a user, after viewing a generated window, chooses "Regenerate"
- **THEN** a new window is generated with a new random seed, and the
  result view updates to show it without showing any wizard step

#### Scenario: Restart wizard clears all selections
- **WHEN** a user, after viewing a generated window, chooses "Restart
  wizard"
- **THEN** the Seed step is shown and every step's value (seed, start
  position) is back to its unselected default

#### Scenario: Download saves the rendered map as an image
- **WHEN** a user, after viewing a generated window, chooses "Download"
- **THEN** a PNG image file of the currently rendered window is saved to
  the user's device

### Requirement: Progress and status feedback
The system SHALL show visible progress and status feedback for every
asynchronous action (fetching a window, panning, downloading), so the
user is never left without an indication of what is currently happening.
Feedback SHALL include both a progress indicator and a descriptive
status message.

#### Scenario: Generating shows progress and a status message
- **WHEN** a window request (initial generation or a pan) is in flight
- **THEN** a progress indicator is visible along with a message
  describing that the map is loading

#### Scenario: Rendering shows a status message
- **WHEN** a returned window is being drawn to the canvas
- **THEN** drawing completes synchronously as part of the same loading
  state (flat per-cell fills are cheap enough to draw immediately); no
  separate rendering-specific message is shown

#### Scenario: Failure feedback is descriptive
- **WHEN** any asynchronous action fails
- **THEN** the user is shown a message describing that it failed, not
  just a silent lack of progress

## ADDED Requirements

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

### Requirement: Zooming out a limited amount
After a window is rendered, the system SHALL let the user zoom out
through a small, fixed number of steps (at most two steps beyond the
default) by shrinking the on-screen cell size, requesting a new,
larger-in-cells window centered on the same point using the same seed.
The system SHALL let the user zoom back in through the same steps, up
to the default cell size, and SHALL NOT allow zooming in past the
default or out past the last step.

#### Scenario: Zooming out shows more of the map
- **WHEN** a user zooms out after viewing a generated window
- **THEN** a new window request is made for the same seed, covering more
  cells than the current window, and the canvas updates to show the
  response at a smaller on-screen cell size

#### Scenario: Zooming preserves the seed and view center
- **WHEN** a user zooms in or out
- **THEN** the seed used for the new window request is unchanged, and
  the new window is centered on the same point the current window was
  centered on

#### Scenario: Zoom range is bounded
- **WHEN** a user is at the smallest on-screen cell size the system
  offers
- **THEN** no further zoom-out action is available
- **WHEN** a user is at the default (most zoomed-in) cell size
- **THEN** no further zoom-in action is available

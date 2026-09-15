# map-creation-wizard Specification

## Purpose
Let a person choose map generation parameters through a guided,
correctable multi-step flow, and see the resulting map rendered as an
actual 2D grid, so generating "a map like Middle-earth" is a few clicks
instead of hand-crafting a URL.

## Requirements

### Requirement: Fixed wizard step order
The system SHALL present exactly four steps, in this order: Seed, Grid
Type, Size Preset, Review. Each step SHALL let the user choose that
step's parameter (Seed MAY be left blank to mean "generate a random
seed"). The Review step SHALL display every previously chosen value and
SHALL be the only step that triggers map generation.

#### Scenario: Steps appear in order
- **WHEN** the wizard starts
- **THEN** the first step shown is Seed, and advancing moves through Grid
  Type, Size Preset, and Review in that order, with no other step
  reachable in between

#### Scenario: Only Review triggers generation
- **WHEN** the user is on any step before Review
- **THEN** no map generation request has been made yet

### Requirement: Back-and-forth navigation preserves selections
The system SHALL let the user move to the previous step or the next step
at any point after the first step, and any value chosen on a step SHALL
remain selected when the user navigates away and back to that step.

#### Scenario: Going back preserves a later re-visit
- **WHEN** a user selects a value on a step, advances to a later step,
  then navigates back to the earlier step
- **THEN** the earlier step still shows the previously selected value

#### Scenario: Changing an earlier selection is possible
- **WHEN** a user navigates back to an earlier step and selects a
  different value
- **THEN** the new value replaces the old one, and advancing forward
  again reflects the updated value on the Review step

### Requirement: Map generation on confirmation
The system SHALL request a map from the `map-generation` HTTP API using
exactly the parameters collected across the wizard's steps (generating a
random seed first if the Seed step was left blank), triggered only when
the user confirms on the Review step.

#### Scenario: Confirming generates a map with the collected parameters
- **WHEN** the user confirms on the Review step after selecting a grid
  type and size preset (and optionally a seed)
- **THEN** exactly one request is made to the map-generation API using
  those parameters, and the rendered result reflects the response

#### Scenario: A failed generation request is shown, not silently dropped
- **WHEN** the map-generation request fails
- **THEN** the user is shown that generation failed and can return to the
  wizard without losing their prior selections

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of a generated map on an HTML canvas,
positioned according to the map's grid type (square or hex). For a
`Square` grid, the boundary between `Ocean` and non-`Ocean` biome SHALL
be rendered as a smoothed vector contour (not a blurred raster and not a
stair-stepped raw cell edge). For a `Hex` grid, that boundary SHALL be
rendered as a crisp (non-blurred) line following the actual hex-edge
steps between land and ocean cells. Terrain SHALL be shaded using each
cell's local elevation gradient (a directional-light hillshade effect),
not a flat per-cell lightness multiplier alone. `Ocean` cells SHALL
carry a wave-line texture rather than a flat or blurred fill. The
rendered map SHALL be framed by a decorative border.

#### Scenario: Every cell is rendered
- **WHEN** a map is generated
- **THEN** the canvas renders the full grid, with no cell of the
  returned grid omitted from the base terrain rendering

#### Scenario: Different biomes are visually distinguishable
- **WHEN** a rendered map contains both `Ocean` and non-`Ocean` cells
- **THEN** those cells are drawn in visually distinct colors

#### Scenario: Grid type determines cell layout
- **WHEN** the generated map's grid type is `Hex`
- **THEN** cells are laid out as a hexagonal tessellation with alternating
  row offset, rather than a plain square grid

#### Scenario: Coastlines are smoothed, not stair-stepped
- **WHEN** a rendered map has a boundary between `Ocean` and a non-`Ocean`
  biome
- **THEN**, for a `Square` grid, that boundary is rendered as a
  continuous smoothed vector curve (not a blurred gradient and not a
  sequence of hard right-angle cell edges); for a `Hex` grid, that
  boundary is rendered as a crisp (non-blurred) line following hex cell
  edges

#### Scenario: Ocean has a wave texture
- **WHEN** a rendered map contains `Ocean` cells
- **THEN** those cells show a wave-line pattern rather than a flat or
  blurred fill

#### Scenario: The map is framed
- **WHEN** a map is rendered
- **THEN** a decorative border frame is visible around the rendered grid

### Requirement: Post-generation actions
After a map is rendered, the system SHALL offer exactly three actions:
Regenerate (generate a new map immediately, with a new random seed but
the same grid type and size preset, without returning to any wizard
step), Restart wizard (clear every prior selection and return to the
Seed step), and Download (save the currently rendered map as a PNG image
file).

#### Scenario: Regenerate produces a new map without leaving the result view
- **WHEN** a user, after viewing a generated map, chooses "Regenerate"
- **THEN** a new map is generated with a new random seed, the same grid
  type and size preset, and the result view updates to show it without
  showing any wizard step

#### Scenario: Restart wizard clears all selections
- **WHEN** a user, after viewing a generated map, chooses "Restart
  wizard"
- **THEN** the Seed step is shown and every step's value (seed, grid
  type, size preset) is back to its unselected default

#### Scenario: Download saves the rendered map as an image
- **WHEN** a user, after viewing a generated map, chooses "Download"
- **THEN** a PNG image file of the currently rendered map is saved to the
  user's device

### Requirement: Progress and status feedback
The system SHALL show visible progress and status feedback for every
asynchronous action (generating a map, rendering it, downloading it), so
the user is never left without an indication of what is currently
happening. Feedback SHALL include both a progress indicator and a
descriptive status message.

#### Scenario: Generating shows progress and a status message
- **WHEN** a map generation request is in flight
- **THEN** a progress indicator is visible along with a message
  describing that generation is in progress

#### Scenario: Rendering shows a status message
- **WHEN** a returned map is being drawn to the canvas
- **THEN** a message indicates rendering is in progress until drawing
  completes

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

## ADDED Requirements

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

## MODIFIED Requirements

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

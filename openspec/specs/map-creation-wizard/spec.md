# map-creation-wizard Specification

## Purpose
Let a person choose map generation parameters through a guided,
correctable multi-step flow, and see the resulting map rendered as an
actual 2D grid, so generating "a map like Middle-earth" is a few clicks
instead of hand-crafting a URL.

## Requirements

### Requirement: Fixed wizard step order
The system SHALL present exactly five steps, in this order: Seed, Grid
Type, Size Preset, Shape Archetype, Review. Each step SHALL let the user
choose that step's parameter (Seed MAY be left blank to mean "generate a
random seed"). The Review step SHALL display every previously chosen
value and SHALL be the only step that triggers map generation.

#### Scenario: Steps appear in order
- **WHEN** the wizard starts
- **THEN** the first step shown is Seed, and advancing moves through Grid
  Type, Size Preset, Shape Archetype, and Review in that order, with no
  other step reachable in between

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
  type, size preset, and shape archetype (and optionally a seed)
- **THEN** exactly one request is made to the map-generation API using
  those parameters, and the rendered result reflects the response

#### Scenario: A failed generation request is shown, not silently dropped
- **WHEN** the map-generation request fails
- **THEN** the user is shown that generation failed and can return to the
  wizard without losing their prior selections

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of a generated map on an HTML canvas,
positioned according to the map's grid type (square or hex), colored by
the cell's biome, and visually shaded according to the cell's elevation.
Biome boundaries and coastlines SHALL appear visually smoothed rather
than following the raw cell grid's hard, stair-stepped edges. The biome
color palette SHALL use warm, parchment-map-like tones (e.g. muted blues,
greens, and tans) rather than saturated flat colors. Cells whose biome is
`Mountains` or `Forest` SHALL be overlaid with a simple icon (a peak mark
for `Mountains`, a small tree-cluster mark for `Forest`) distinguishing
them from a flat color fill alone.

#### Scenario: Every cell is rendered
- **WHEN** a map is generated
- **THEN** the canvas renders the full grid, with no cell of the returned
  grid omitted from the base terrain rendering

#### Scenario: Different biomes are visually distinguishable
- **WHEN** a rendered map contains cells of at least two different biomes
- **THEN** those cells are drawn in visually distinct colors

#### Scenario: Grid type determines cell layout
- **WHEN** the generated map's grid type is `Hex`
- **THEN** cells are laid out as a hexagonal tessellation with alternating
  row offset, rather than a plain square grid

#### Scenario: Coastlines are smoothed, not stair-stepped
- **WHEN** a rendered map has a boundary between `Ocean` and a non-`Ocean`
  biome
- **THEN** that boundary is rendered as a smoothed curve rather than a
  sequence of hard right-angle cell edges

#### Scenario: Mountains and Forest cells carry an icon
- **WHEN** a rendered map contains cells of biome `Mountains` or `Forest`
- **THEN** at least some of those cells display an icon distinguishing
  that biome, in addition to its base terrain color

### Requirement: Returning to the wizard after viewing a map
After a map is rendered, the system SHALL let the user return to the
wizard with every previously chosen value still selected, so they can
change one parameter and generate again without re-entering the others.

#### Scenario: Returning to the wizard keeps prior selections
- **WHEN** a user, after viewing a generated map, chooses to return to
  the wizard
- **THEN** every step still shows the values used for that generation

### Requirement: Generate another map after viewing a result
After a map is rendered, the system SHALL offer a "generate another"
action that returns to the wizard's Seed step specifically (not the
Review step), with grid type, size preset, and shape archetype kept as
they were.

#### Scenario: Generate another returns to the Seed step
- **WHEN** a user, after viewing a generated map, chooses "generate
  another"
- **THEN** the wizard's Seed step is shown, and the grid type, size
  preset, and shape archetype selections used for that generation are
  still set
